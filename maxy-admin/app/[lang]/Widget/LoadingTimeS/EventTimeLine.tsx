"use client";

import type { CSSProperties, MutableRefObject } from "react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import type { EventTimeLineResponse } from "../../../api/EventTimeLine";
import type { ChartPoint } from "./Widget";

type EventTimeLineProps = {
  visible: boolean;
  point: ChartPoint | null;
  onClose(): void;
  data: EventTimeLineResponse | null;
  loading: boolean;
  error: string | null;
  isDarkMode?: boolean;
  offsets?: {
    top?: number;
    bottom?: number;
    left?: number;
    width?: number;
  };
  containerRef?: MutableRefObject<HTMLDivElement | null>;
};

const EXIT_DELAY = 320;

const EXCLUDED_LOG_TYPES = new Set<number>([
  65536,
  65537,
  65538,
  65539,
  131072,
  131073,
  131074,
  131079,
  131080,
  262144,
  262145,
  262146,
  262147,
  262148,
  524288,
  524289,
  524290,
  1048576,
  1048577,
  4194304,
  8388608,
  8388609,
  8388610,
  8388611,
]);

const TOOLTIP_RESMSG_LOG_TYPES = new Set<number>([
  131076, // WebNav Error
  131077, // WebNav Script Error
  524292, // Http Error
  1048579, // Native Error
  2097152, // Native Crash
  4194306, // Custom Error
]);

const LOG_TYPE_DICTIONARY: Record<number, { group: string; detail: string }> = {
  131073: { group: "WebNavigation", detail: "Start" },
  131074: { group: "WebNavigation", detail: "Response" },
  131075: { group: "WebNavigation", detail: "End" },
  131076: { group: "WebNavigation", detail: "Error" },
  131077: { group: "WebNavigation", detail: "Script Error" },
  131078: { group: "WebNavigation", detail: "Redirection" },
  131088: { group: "WebNavigation", detail: "Click" },
  131089: { group: "WebNavigation", detail: "Page Load" },
  131105: { group: "WebNavigation", detail: "Page DOMContentLoaded" },
  131108: { group: "WebNavigation", detail: "Loading Time" },
  524289: { group: "HttpRequest", detail: "Request" },
  524291: { group: "HttpRequest", detail: "Response" },
  524292: { group: "HttpRequest", detail: "Error" },
  524293: { group: "HttpRequest", detail: "Exception" },
  1048577: { group: "NativeAction", detail: "Start" },
  1048578: { group: "NativeAction", detail: "End" },
  1048579: { group: "NativeAction", detail: "Error" },
  1048580: { group: "NativeAction", detail: "App Start" },
  1048581: { group: "NativeAction", detail: "App Foreground" },
  1048582: { group: "NativeAction", detail: "App Background" },
  1048583: { group: "NativeAction", detail: "App Terminate" },
  1048592: { group: "NativeAction", detail: "App PageStart" },
  1048593: { group: "NativeAction", detail: "App PageEnd" },
  1048595: { group: "NativeClick", detail: "Click" },
  2097152: { group: "Native", detail: "Crash" },
  4194306: { group: "Custom Tag", detail: "Error" },
  8388610: { group: "Ajax", detail: "Request" },
  8388611: { group: "Ajax", detail: "Send" },
  8388612: { group: "Ajax", detail: "Response" },
  8388613: { group: "Ajax", detail: "Error" },
  8388614: { group: "Ajax", detail: "Exception" },
};

function getLogTypeGroup(logType: number): string {
  return LOG_TYPE_DICTIONARY[logType]?.group ?? String(logType);
}

function getLogTypeDetail(logType: number): string {
  return LOG_TYPE_DICTIONARY[logType]?.detail ?? String(logType);
}

const timeFormatter = new Intl.DateTimeFormat("ko-KR", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

function formatTime(value: number): string {
  if (!Number.isFinite(value)) return "-";
  return timeFormatter.format(new Date(value));
}

function formatTimeMs(value: number): string {
  if (!Number.isFinite(value)) return "-";
  const date = new Date(value);
  const base = timeFormatter.format(date);
  const ms = String(date.getMilliseconds()).padStart(3, "0");
  return `${base}.${ms}`;
}

type GraphItem = {
  logType: number;
  startTime: number;
  endTime: number;
  runtime: number;
  aliasValue: string;
  resMsg: string;
  group: string;
  detail: string;
  isInterval: boolean;
  markerType: "httpRequest" | "native" | "ajax" | "other" | "error" | "crash";
  labelText: string;
  style: CSSProperties;
  tooltip: string;
};

function extractCrashTitle(resMsg: string): string {
  const firstLine = resMsg.split("\n")[0] ?? "";
  const colonIndex = firstLine.indexOf(":");
  return colonIndex >= 0 ? firstLine.slice(0, colonIndex) : firstLine;
}

function buildTooltip(item: { logType: number; runtime: number; aliasValue: string; resMsg: string }): string {
  const runtimeText = Number.isFinite(item.runtime) ? `${Math.round(item.runtime)}ms` : "0ms";
  if (TOOLTIP_RESMSG_LOG_TYPES.has(item.logType)) {
    const msg = item.logType === 2097152 ? extractCrashTitle(item.resMsg) : item.resMsg;
    const cleaned = msg.trim() || "-";
    return `${cleaned}\n${runtimeText}`;
  }
  const alias = item.aliasValue.trim() || "-";
  return `${alias}\n${runtimeText}`;
}

export default function EventTimeLine({
  visible,
  onClose,
  data,
  loading,
  error,
  isDarkMode = false,
  offsets,
  containerRef,
}: EventTimeLineProps) {
  const [isMounted, setIsMounted] = useState(visible);
  const [isVisible, setIsVisible] = useState(false);
  const chartRef = useRef<HTMLDivElement | null>(null);
  const graphicRef = useRef<HTMLDivElement | null>(null);
  const firstLabelRef = useRef<HTMLDivElement | null>(null);
  const [labelOffset, setLabelOffset] = useState(0);
  const [cursorRegion, setCursorRegion] = useState<{ top: number; height: number } | null>(null);

  const [cursor, setCursor] = useState<{ left: number; text: string; align: "left" | "right" } | null>(
    null,
  );

  useEffect(() => {
    if (visible) {
      setIsMounted(true);
      return;
    }
    setIsVisible(false);
    const hide = window.setTimeout(() => setIsMounted(false), EXIT_DELAY);
    return () => window.clearTimeout(hide);
  }, [visible]);

  useEffect(() => {
    if (!isMounted || !visible) {
      return;
    }
    setIsVisible(true);
  }, [isMounted, visible]);

  const containerStyle = useMemo<CSSProperties>(
    () => ({
      top: offsets?.top != null ? `${offsets.top}px` : undefined,
      bottom: offsets?.bottom != null ? `${offsets.bottom}px` : undefined,
      left: offsets?.left != null ? `${offsets.left}px` : undefined,
      width: offsets?.width != null ? `${Math.max(0, offsets.width)}px` : undefined,
    }),
    [offsets],
  );

  const rawLogs = data?.logList ?? [];
  const sortedLogs = useMemo(() => {
    return [...rawLogs]
      .filter((log) => Number.isFinite(Number(log.logTm)) && Number.isFinite(Number(log.logType)))
      .map((log) => ({
        ...log,
        logType: Number(log.logType),
        logTm: Number(log.logTm),
        intervaltime: Number.isFinite(Number(log.intervaltime)) ? Number(log.intervaltime) : 0,
        aliasValue: log.aliasValue ?? "",
        resMsg: log.resMsg ?? "",
      }))
      .sort((a, b) => a.logTm - b.logTm);
  }, [rawLogs]);

  const graphInfo = useMemo(() => {
    if (sortedLogs.length === 0) {
      return { firstTime: 0, endTime: 0, timeDiff: 0 };
    }
    const endTime = sortedLogs[sortedLogs.length - 1]!.logTm;
    let firstTime = Number.POSITIVE_INFINITY;
    for (const log of sortedLogs) {
      const runtime = Number.isFinite(log.intervaltime) ? log.intervaltime : 0;
      const candidate = log.logTm - runtime;
      if (candidate < firstTime) {
        firstTime = candidate;
      }
    }
    if (!Number.isFinite(firstTime)) {
      firstTime = sortedLogs[0]!.logTm;
    }
    const timeDiff = Math.max(0, endTime - firstTime);
    return { firstTime, endTime, timeDiff };
  }, [sortedLogs]);

  const timeLabels = useMemo(() => {
    if (sortedLogs.length === 0 || graphInfo.timeDiff <= 0) {
      return ["-", "-", "-", "-", "-"];
    }
    const interval = graphInfo.timeDiff / 4;
    const times = [
      graphInfo.firstTime,
      graphInfo.firstTime + interval,
      graphInfo.firstTime + interval * 2,
      graphInfo.firstTime + interval * 3,
      graphInfo.endTime,
    ].map((value) => formatTime(Math.round(value)));
    return times;
  }, [graphInfo.endTime, graphInfo.firstTime, graphInfo.timeDiff, sortedLogs.length]);

  const graphItems = useMemo<GraphItem[]>(() => {
    if (sortedLogs.length === 0) {
      return [];
    }
    const endTime = graphInfo.endTime;
    const firstTime = graphInfo.firstTime;
    const timeDiff = graphInfo.timeDiff || 1;

    return sortedLogs
      .filter((log) => !EXCLUDED_LOG_TYPES.has(log.logType))
      .map((log) => {
        const group = getLogTypeGroup(log.logType);
        const detail = getLogTypeDetail(log.logType);
        const runtime = Math.max(0, Number.isFinite(log.intervaltime) ? log.intervaltime : 0);
        const isInterval = detail === "End" || detail === "Response";
        const startTime = isInterval ? log.logTm - runtime : 0;
        const endTimeForLog = log.logTm;

        let leftRatio = isInterval ? (startTime - firstTime) / timeDiff : (endTimeForLog - firstTime) / timeDiff;
        leftRatio = Number.isFinite(leftRatio) ? leftRatio : 0;
        const widthRatio = isInterval ? (endTimeForLog - startTime) / timeDiff : 0;

        let leftPct = leftRatio * 100;
        let widthPct = widthRatio * 100;
        if (!Number.isFinite(leftPct)) leftPct = 0;
        if (!Number.isFinite(widthPct)) widthPct = 0;
        leftPct = Math.max(-50, Math.min(leftPct, 200));
        widthPct = Math.max(0, Math.min(widthPct, 100));

        const detailLower = detail.toLowerCase();
        let markerType: GraphItem["markerType"] = "other";
        if (detailLower.includes("error")) {
          markerType = "error";
        } else if (detailLower.includes("crash")) {
          markerType = "crash";
        } else if (group === "HttpRequest") {
          markerType = "httpRequest";
        } else if (group === "Native" || group === "NativeAction") {
          markerType = "native";
        } else if (group === "Ajax") {
          markerType = "ajax";
        }

        const labelText = isInterval ? group : group === "WebNavigation" || group === "NativeAction" ? detail : `${group} / ${detail}`;

        const prefersRight = leftPct > 97;
        const clampedLeftPct = Math.max(0, Math.min(leftPct, 100));

        const style: CSSProperties = {
          width: markerType === "error" || markerType === "crash" ? "20px" : isInterval ? `${widthPct}%` : "0%",
          left: prefersRight ? undefined : `${clampedLeftPct}%`,
          right: prefersRight ? "0%" : undefined,
        };

        const tooltip = buildTooltip({
          logType: log.logType,
          runtime,
          aliasValue: log.aliasValue ?? "",
          resMsg: log.resMsg ?? "",
        });

        return {
          logType: log.logType,
          startTime: isInterval ? startTime : 0,
          endTime: endTimeForLog,
          runtime,
          aliasValue: log.aliasValue ?? "",
          resMsg: log.resMsg ?? "",
          group,
          detail,
          isInterval,
          markerType,
          labelText,
          style,
          tooltip,
        };
      })
      .filter((item) => item.endTime <= endTime && item.endTime >= firstTime - 60_000);
  }, [graphInfo.endTime, graphInfo.firstTime, graphInfo.timeDiff, sortedLogs]);

  useLayoutEffect(() => {
    if (!visible) {
      return;
    }

    const labelEl = firstLabelRef.current;
    const rowEl = labelEl?.closest<HTMLElement>(".lt-event-timeline__row") ?? null;
    if (!labelEl || !rowEl) {
      setLabelOffset(0);
      return;
    }
    const style = getComputedStyle(rowEl);
    const gapRaw = style.gap || style.columnGap || "0";
    const gap = Number.parseFloat(gapRaw);
    setLabelOffset(labelEl.offsetWidth + (Number.isFinite(gap) ? gap : 0));
  }, [graphItems.length, visible]);

  useLayoutEffect(() => {
    if (!visible) {
      return;
    }
    const chartEl = chartRef.current;
    const graphicEl = graphicRef.current;
    if (!chartEl || !graphicEl) {
      setCursorRegion(null);
      return;
    }

    const measure = () => {
      const chartRect = chartEl.getBoundingClientRect();
      const graphicRect = graphicEl.getBoundingClientRect();
      setCursorRegion({
        top: Math.max(0, graphicRect.top - chartRect.top),
        height: Math.max(0, graphicRect.height),
      });
    };

    let raf = requestAnimationFrame(measure);
    const handleResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };
    window.addEventListener("resize", handleResize);
    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(handleResize);
      observer.observe(chartEl);
      observer.observe(graphicEl);
      return () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", handleResize);
        observer.disconnect();
      };
    }
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", handleResize);
    };
  }, [graphItems.length, visible]);

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!visible || graphInfo.timeDiff <= 0) {
      return;
    }
    const graphicEl = graphicRef.current;
    const chartEl = chartRef.current;
    if (!graphicEl || !chartEl) {
      return;
    }
    const graphicRect = graphicEl.getBoundingClientRect();
    const chartRect = chartEl.getBoundingClientRect();
    const x = event.clientX - graphicRect.left;
    const clampedX = Math.max(0, Math.min(x, graphicRect.width));
    if (clampedX < labelOffset) {
      setCursor(null);
      return;
    }
    const timelineWidth = Math.max(1, graphicRect.width - labelOffset);
    const ratio = (clampedX - labelOffset) / timelineWidth;
    const timestamp = graphInfo.firstTime + ratio * graphInfo.timeDiff;
    const text = formatTimeMs(Math.round(timestamp));
    const leftInChart = graphicRect.left - chartRect.left + clampedX;
    const align = leftInChart + 120 > chartRect.width ? "right" : "left";
    setCursor({ left: leftInChart, text, align });
  };

  const hideCursor = () => setCursor(null);

  if (!isMounted) {
    return null;
  }

  return (
    <div
      ref={(node) => {
        if (containerRef) {
          containerRef.current = node;
        }
      }}
      className={`lt-waterfall lt-event-timeline${isVisible ? " is-visible" : ""}${isDarkMode ? " lt-waterfall--dark lt-event-timeline--dark" : ""}`}
      aria-hidden={!visible}
      style={containerStyle}
    >
      <button type="button" className="lt-waterfall__backdrop" aria-label="Event Time Line 닫기" onClick={onClose} />
      <aside
        className="lt-waterfall__panel"
        role="dialog"
        aria-modal="true"
        aria-label="Event Time Line"
      >
        <header className="lt-waterfall__header">
          <div>
            <h2 className="lt-waterfall__title">Performance</h2>
          </div>
        </header>

        {loading ? (
          <div className="lt-waterfall__spinner" role="status" aria-label="Event Time Line 데이터를 불러오는 중입니다">
            <span className="lt-waterfall__spinner-circle" />
            <span className="lt-waterfall__spinner-circle" />
            <span className="lt-waterfall__spinner-circle" />
          </div>
        ) : null}
        {error ? <div className="lt-waterfall__status lt-waterfall__status--error">{error}</div> : null}

        <section ref={chartRef} className="lt-event-timeline__chart" aria-label="Event Time Line">
          <div className="lt-event-timeline__title-row">
            <span className="lt-event-timeline__icon" aria-hidden="true" />
            <span className="lt-event-timeline__title">Event Time Line</span>
          </div>

          <div
            className="lt-event-timeline__time-axis"
            aria-hidden="true"
            onMouseEnter={hideCursor}
          >
            {timeLabels.map((label, index) => (
              <span key={`time-${index}`} className={`lt-event-timeline__time time${index + 1}`}>
                {label}
              </span>
            ))}
          </div>

          <div
            ref={graphicRef}
            className="lt-event-timeline__graphic"
            onMouseMove={handleMouseMove}
            onMouseEnter={() => {
              // cursor shown on first move
            }}
            onMouseLeave={hideCursor}
          >
            {graphItems.map((item, index) => {
              const markerClass = `lt-event-timeline__marker ${item.markerType}`;
              const rowKey = `${item.logType}:${item.endTime}:${item.runtime}:${index}`;
              return (
                <div key={rowKey} className="lt-event-timeline__row">
                  <div
                    ref={index === 0 ? firstLabelRef : undefined}
                    className="lt-event-timeline__label"
                    title={item.labelText}
                  >
                    {item.labelText}
                  </div>
                  <div className="lt-event-timeline__track">
                    <div
                      className={markerClass}
                      style={item.style}
                      title={item.tooltip}
                      aria-label={`${item.labelText} ${Math.round(item.runtime)}ms`}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {cursor && cursorRegion ? (
            <div
              className={`lt-event-timeline__cursor${cursor.align === "right" ? " is-right" : ""}`}
              style={{
                left: `${cursor.left}px`,
                top: `${cursorRegion.top}px`,
                height: `${cursorRegion.height}px`,
              }}
              aria-hidden="true"
            >
              <span className="lt-event-timeline__cursor-text">{cursor.text}</span>
            </div>
          ) : null}
        </section>
      </aside>
    </div>
  );
}
