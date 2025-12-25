"use client";

import type { CSSProperties, MutableRefObject } from "react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import type { WaterfallDetailResponse, WaterfallResourceEntry } from "../../../api/Waterfall";
import type { ChartPoint } from "./Widget";

type WaterfallProps = {
  visible: boolean;
  point: ChartPoint | null;
  onClose(): void;
  data: WaterfallDetailResponse | null;
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

const CATEGORY_LABELS = {
  all: "All",
  xhr: "Fetch/XHR",
  reformNavigation: "Doc",
  css: "CSS",
  script: "JS",
  link: "LINK",
  font: "Font",
  img: "IMG",
  media: "Media",
  manifest: "Manifest",
  ws: "WS",
  other: "Other",
  action: "Action",
  error: "Errors",
  resource: "Resource",
  longtask: "Long Tasks",
} as const;

type CategoryKey = keyof typeof CATEGORY_LABELS;
type LaneKey = "actions" | "errors" | "resources" | "longTasks";

const LANE_CONFIG: Array<{ key: LaneKey; label: string; color: string }> = [
  { key: "actions", label: "Actions", color: "#059669" },
  { key: "errors", label: "Errors", color: "#dc2626" },
  { key: "resources", label: "Resources", color: "#71B8E7" },
  { key: "longTasks", label: "Long Tasks", color: "#f97316" },
];

const WATERFALL_YAXIS_WIDTH = 450;
const MIN_RESOURCE_BAR_PCT = 0.6;
const ERROR_BAR_DURATION = 14;
const EVENT_TIMELINE_LABEL_WIDTH = 140;
const EVENT_TIMELINE_RIGHT_PADDING = 24;

const TIMING_COLORS: Record<string, string> = {
  waiting: "#0ea5e9",
  dns: "#c084fc",
  tcp: "#38bdf8",
  ssl: "#22d3ee",
  ttfb: "#f97316",
  fcp: "#a855f7",
  lcp: "#ff5733",
  loadTime: "#10b981",
  inp: "#ef4444",
  cls: "#64748b",
  tbt: "#f97316",
  content: "#22c55e",
  load: "#6366f1",
  fetchTime: "#22d3ee",
  dnsLookupTime: "#a855f7",
  connectionTime: "#38bdf8",
  redirectTime: "#f59e0b",
  dclTime: "#10b981",
  fid: "#ef4444",
  ttfbTime: "#f97316",
  domInteractive: "#eab308",
  domProcessingTime: "#0ea5e9",
};

type VitalState = "good" | "caution" | "bad" | "none";

type VitalMetric = {
  key: "lcp" | "cls" | "inp";
  label: string;
  value: string;
  state: VitalState;
};

type InlineMetric = {
  key: string;
  label: string;
  value: string;
  hasValue: boolean;
};

const PRIMARY_MARKER_KEYS = new Set([
  "dnsLookupTime",
  "connectionTime",
  "ttfb",
  "fcp",
  "lcp",
  "dclTime",
  "loadTime",
  "domInteractive",
]);

const INLINE_METRIC_CONFIG: Array<{ key: string; label: string }> = [
  { key: "domInteractive", label: "DOM Interactive" },
  { key: "fcp", label: "FCP" },
  { key: "loadTime", label: "Loading Time" },
  { key: "ttfb", label: "TTFB" },
];

const WATERFALL_TYPE_ICON: Record<string, string> = {
  img: "/images/maxy/waterfall-image.svg",
  image: "/images/maxy/waterfall-image.svg",
  css: "/images/maxy/waterfall-css.svg",
  style: "/images/maxy/waterfall-css.svg",
  script: "/images/maxy/waterfall-script.svg",
  js: "/images/maxy/waterfall-script.svg",
  xhr: "/images/maxy/waterfall-fetch.svg",
  fetch: "/images/maxy/waterfall-fetch.svg",
  xmlhttprequest: "/images/maxy/waterfall-fetch.svg",
  link: "/images/maxy/waterfall-link.svg",
  font: "/images/maxy/waterfall-font.svg",
  audio: "/images/maxy/waterfall-audio.svg",
  video: "/images/maxy/waterfall-audio.svg",
  media: "/images/maxy/waterfall-audio.svg",
  reformnavigation: "/images/maxy/waterfall-navigation.svg",
  navigation: "/images/maxy/waterfall-navigation.svg",
  event: "/images/maxy/waterfall-event.svg",
  action: "/images/maxy/waterfall-event.svg",
  longtask: "/images/maxy/waterfall-longtask.svg",
  error: "/images/maxy/waterfall-error.svg",
  other: "/images/maxy/waterfall-other.svg",
  resource: "/images/maxy/waterfall-other.svg",
  manifest: "/images/maxy/waterfall-other.svg",
  ws: "/images/maxy/waterfall-other.svg",
  websocket: "/images/maxy/waterfall-other.svg",
  beacon: "/images/maxy/waterfall-other.svg",
  iframe: "/images/maxy/waterfall-other.svg",
  unknown: "/images/maxy/waterfall-other.svg",
};

function resolveWaterfallTypeIcon(type: string): string {
  const normalized = type.trim().toLowerCase();
  return WATERFALL_TYPE_ICON[normalized] ?? WATERFALL_TYPE_ICON.other;
}

function getTimingValue(timingData: WaterfallDetailResponse["timingData"] | undefined, key: string): number | null {
  const match = timingData?.find((entry) => entry.key === key);
  if (!match) {
    return null;
  }
  const value = Number(match.value);
  return Number.isFinite(value) ? value : null;
}

function buildVitals(timingData: WaterfallDetailResponse["timingData"] | undefined): VitalMetric[] {
  const lcpMs = getTimingValue(timingData, "lcp");
  const cls = getTimingValue(timingData, "cls");
  const inpMs = getTimingValue(timingData, "inp");

  const lcpSec = lcpMs != null ? lcpMs / 1000 : null;
  const lcpState: VitalState =
    lcpSec == null ? "none" : lcpSec <= 2.5 ? "good" : lcpSec <= 4 ? "caution" : "bad";

  const clsState: VitalState =
    cls == null ? "none" : cls <= 0.1 ? "good" : cls <= 0.25 ? "caution" : "bad";

  const inpState: VitalState =
    inpMs == null ? "none" : inpMs <= 200 ? "good" : inpMs <= 500 ? "caution" : "bad";

  return [
    {
      key: "lcp",
      label: "Largest Contentful Paint",
      value: lcpSec == null ? "-" : `${Math.round(lcpSec * 1000) / 1000}s`,
      state: lcpState,
    },
    {
      key: "cls",
      label: "Cumulative Layout Shift",
      value: cls == null ? "-" : cls.toFixed(4),
      state: clsState,
    },
    {
      key: "inp",
      label: "Interaction To Next Paint",
      value: inpMs == null ? "-" : `${Math.round(inpMs)}ms`,
      state: inpState,
    },
  ];
}

function formatMs(value: number | null): string | null {
  if (value == null) {
    return null;
  }
  if (!Number.isFinite(value)) {
    return null;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(2)}s`;
  }
  return `${Math.round(value)}ms`;
}

function matchesCategory(row: WaterfallResourceEntry, category: CategoryKey) {
  if (category === "all") return true;

  const entryType = (row.entryType ?? "").toLowerCase();
  const initiatorType = (row.initiatorType ?? "").toLowerCase();

  if (category === "resource") return entryType === "resource";
  if (category === "reformNavigation") return entryType === "reformnavigation";
  if (category === "longtask") return entryType === "longtask";
  if (category === "error") return entryType === "error";
  if (category === "action") return entryType === "event" || initiatorType === "action";

  if (category === "xhr") return ["xmlhttprequest", "fetch"].includes(initiatorType);
  if (category === "img") return ["img", "image"].includes(initiatorType);
  if (category === "media") return ["video", "audio"].includes(initiatorType);
  if (category === "ws") return ["websocket", "ws"].includes(initiatorType);

  if (category === "other") {
    const definedEntryTypes = ["resource", "reformnavigation", "longtask", "event", "error"];
    const definedInitiatorTypes = [
      "xmlhttprequest",
      "fetch",
      "css",
      "script",
      "link",
      "font",
      "img",
      "image",
      "manifest",
      "video",
      "audio",
      "websocket",
      "ws",
      "action",
    ];

    const isUndefinedEntryType = !definedEntryTypes.includes(entryType);
    const isUndefinedInitiatorType = entryType === "resource" && initiatorType && !definedInitiatorTypes.includes(initiatorType);
    return isUndefinedEntryType || isUndefinedInitiatorType;
  }

  // remaining categories map to initiatorType directly
  return initiatorType === category;
}

export default function Waterfall({
  visible,
  onClose,
  data,
  loading,
  error,
  isDarkMode = false,
  offsets,
  containerRef,
}: WaterfallProps) {
  const [isMounted, setIsMounted] = useState(visible);
  const [isVisible, setIsVisible] = useState(false);
  const [activeCategory, setActiveCategory] = useState<CategoryKey>("all");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const listBodyRef = useRef<HTMLDivElement | null>(null);
  const trackAnchorRef = useRef<HTMLDivElement | null>(null);

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

  const vitals = useMemo(() => buildVitals(data?.timingData), [data?.timingData]);
  const rows = data?.resourceInfoData ?? [];
  const errorData = data?.errorData ?? [];
  const timingData = data?.timingData ?? [];

  const inlineMetrics = useMemo<InlineMetric[]>(() => {
    return INLINE_METRIC_CONFIG.map((item) => {
      const value = formatMs(getTimingValue(timingData, item.key));
      return {
        ...item,
        value: value ?? "-",
        hasValue: value != null,
      };
    });
  }, [timingData]);

  const totalDuration = useMemo(() => {
    if (!data) {
      return 200;
    }
    const resourceMax = rows.reduce((acc, resource) => Math.max(acc, resource.startTime + resource.duration), 0);
    const markerMax = timingData.reduce(
      (acc, entry) =>
        typeof entry.value === "number" && Number.isFinite(entry.value) ? Math.max(acc, entry.value) : acc,
      0,
    );
    const actionMax = (data.performanceData?.clickAction ?? []).reduce(
      (acc, span) => Math.max(acc, span.start + span.duration),
      0,
    );
    const resourceSpanMax = (data.performanceData?.resource ?? []).reduce(
      (acc, span) => Math.max(acc, span.start + span.duration),
      0,
    );
    const longTaskMax = (data.performanceData?.longTask ?? []).reduce(
      (acc, span) => Math.max(acc, span.start + span.duration),
      0,
    );
    const errorMax = errorData.reduce((acc, item) => Math.max(acc, item.waterfallTm + 14), 0);
    return Math.max(resourceMax, markerMax, actionMax, resourceSpanMax, longTaskMax, errorMax, 200);
  }, [data, errorData, rows, timingData]);

  const timelineMarkers = useMemo(
    () =>
      (timingData ?? [])
        .filter((entry) => {
          const value = Number(entry.value);
          const unit = (entry.unit ?? "ms").trim();
          return Number.isFinite(value) && unit.length > 0 && unit.toLowerCase() === "ms";
        })
        .map((entry) => ({
          ...entry,
          label: entry.label ?? entry.key,
          unit: entry.unit ?? "ms",
          color: TIMING_COLORS[entry.key] ?? "#38bdf8",
        }))
        .sort((a, b) => a.value - b.value),
    [timingData],
  );

  const primaryMarkers = useMemo(
    () => timelineMarkers.filter((marker) => PRIMARY_MARKER_KEYS.has(marker.key)),
    [timelineMarkers],
  );

  const [trackOffsets, setTrackOffsets] = useState(() => ({
    trackLeft: WATERFALL_YAXIS_WIDTH,
    trackWidth: 0,
    trackHeight: 0,
  }));

  const containerStyle = useMemo<CSSProperties>(
    () => ({
      top: offsets?.top != null ? `${offsets.top}px` : undefined,
      bottom: offsets?.bottom != null ? `${offsets.bottom}px` : undefined,
      left: offsets?.left != null ? `${offsets.left}px` : undefined,
      width: offsets?.width != null ? `${Math.max(0, offsets.width)}px` : undefined,
    }),
    [offsets],
  );

  const panelStyle = useMemo(
    () =>
      ({
        "--lt-waterfall-yaxis-width": `${WATERFALL_YAXIS_WIDTH}px`,
      }) as CSSProperties,
    [],
  );

  const filteredRows = useMemo(
    () => (activeCategory === "all" ? rows : rows.filter((row) => matchesCategory(row, activeCategory))),
    [activeCategory, rows],
  );

  useEffect(() => {
    const listBody = listBodyRef.current;
    if (!listBody) {
      return;
    }
    listBody.scrollTop = 0;
  }, [activeCategory]);

  const firstRowId = filteredRows[0]?.id ?? null;

  useEffect(() => {
    if (filteredRows.length === 0) {
      trackAnchorRef.current = null;
    }
  }, [filteredRows.length]);

  const categoryTabs = useMemo(() => {
    return Object.entries(CATEGORY_LABELS).map(([key, label]) => {
      const typedKey = key as CategoryKey;
      const count =
        typedKey === "all" ? rows.length : rows.reduce((acc, row) => acc + (matchesCategory(row, typedKey) ? 1 : 0), 0);
      return {
        key: typedKey,
        label,
        enabled: typedKey === "all" ? true : count > 0,
        count,
      };
    });
  }, [rows]);

  useEffect(() => {
    if (!categoryTabs.some((tab) => tab.key === activeCategory && tab.enabled)) {
      const reset = window.setTimeout(() => setActiveCategory("all"), 0);
      return () => window.clearTimeout(reset);
    }
    return () => {};
  }, [activeCategory, categoryTabs]);

  useLayoutEffect(() => {
    if (!visible) {
      return;
    }

    const measureOffsets = () => {
      const track = trackAnchorRef.current;
      const listBody = listBodyRef.current;
      if (!track || !listBody) {
        setTrackOffsets((prev) => {
          if (prev.trackWidth === 0 && prev.trackHeight === 0) {
            return prev;
          }
          return { trackLeft: WATERFALL_YAXIS_WIDTH, trackWidth: 0, trackHeight: 0 };
        });
        return;
      }
      const trackRect = track.getBoundingClientRect();
      const bodyRect = listBody.getBoundingClientRect();

      const trackLeft = Math.max(0, trackRect.left - bodyRect.left);
      const trackWidth = Math.max(0, trackRect.width);
      const rowsContainer =
        listBody.querySelector<HTMLElement>(".lt-waterfall__wf-rows") ??
        listBody.querySelector<HTMLElement>(".lt-waterfall__table");
      const trackHeight = rowsContainer?.getBoundingClientRect().height ?? listBody.scrollHeight ?? 0;

      setTrackOffsets((prev) => {
        if (
          Math.abs(prev.trackLeft - trackLeft) < 0.5 &&
          Math.abs(prev.trackWidth - trackWidth) < 0.5 &&
          Math.abs(prev.trackHeight - trackHeight) < 0.5
        ) {
          return prev;
        }
        return { trackLeft, trackWidth, trackHeight };
      });
    };

    measureOffsets();
    if (typeof window !== "undefined") {
      window.addEventListener("resize", measureOffsets);
      return () => {
        window.removeEventListener("resize", measureOffsets);
      };
    }
    return () => {};
  }, [
    visible,
    filteredRows.length,
    firstRowId,
    primaryMarkers.length,
    offsets?.left,
    offsets?.top,
    offsets?.width,
    offsets?.bottom,
  ]);

  useEffect(() => {
    if (!visible || !data) {
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    ctx.resetTransform();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);
    ctx.lineWidth = 1 / dpr;
    const toCrisp = (value: number) => Math.round(value * dpr) / dpr;

    const palette = isDarkMode
      ? {
          chartBg: "rgba(30, 41, 59, 0.88)",
          laneBg: "rgba(15, 23, 42, 0.6)",
          axisText: "rgba(148, 163, 184, 0.92)",
          laneLabel: "rgba(226, 232, 240, 0.92)",
          labelOnBar: "#f8fafc",
          labelOffBar: "rgba(148, 163, 184, 0.9)",
          boundary: "rgba(148, 163, 184, 0.26)",
          axisLine: "rgba(148, 163, 184, 0.32)",
          emptyText: "rgba(148, 163, 184, 0.92)",
        }
      : {
          chartBg: "rgba(255, 255, 255, 0.96)",
          laneBg: "rgba(226, 232, 240, 0.45)",
          axisText: "#94a3b8",
          laneLabel: "#64748b",
          labelOnBar: "#e2e8f0",
          labelOffBar: "#475569",
          boundary: "rgba(148, 163, 184, 0.35)",
          axisLine: "rgba(148, 163, 184, 0.45)",
          emptyText: "#94a3b8",
        };

    const lanes = LANE_CONFIG.map((lane) => {
      switch (lane.key) {
        case "actions":
          return { ...lane, spans: data.performanceData?.clickAction ?? [] };
        case "errors":
          return {
            ...lane,
            spans: errorData.map((item) => ({
              label: item.name,
              start: item.waterfallTm,
              duration: ERROR_BAR_DURATION,
            })),
          };
        case "resources":
          return { ...lane, spans: data.performanceData?.resource ?? [] };
        case "longTasks":
          return { ...lane, spans: data.performanceData?.longTask ?? [] };
        default:
          return { ...lane, spans: [] };
      }
	    });

	    const laneCount = lanes.length || 1;
	    const topMargin = 18;
	    const bottomMargin = 20;
	    const laneGap = 4;
	    const minLaneHeight = 14;
	    const maxLaneHeight = 24;
	    const availableHeight = height - topMargin - bottomMargin - laneGap * (laneCount - 1);
	    const laneHeight = Math.max(minLaneHeight, Math.min(Math.floor(availableHeight / laneCount), maxLaneHeight));
	    const laneSpacing = laneHeight + laneGap;
	    const lanesTotalHeight = laneHeight * laneCount + laneGap * (laneCount - 1);

    const chartOffset = EVENT_TIMELINE_LABEL_WIDTH;
    const chartWidth = Math.max(width - chartOffset - EVENT_TIMELINE_RIGHT_PADDING, 1);

    ctx.fillStyle = palette.chartBg;
    ctx.fillRect(chartOffset, topMargin - 6, chartWidth, lanesTotalHeight + 12);

    const boundaryColor = palette.boundary;

    ctx.font = "12px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    ctx.fillStyle = palette.axisText;
    ctx.fillText("0 ms", chartOffset, 14);
    ctx.fillText(`${Math.round(totalDuration)} ms`, chartOffset + chartWidth - 60, 14);

    const hasAnyData = lanes.some((lane) => lane.spans.length > 0);
    if (!hasAnyData) {
      ctx.fillStyle = palette.emptyText;
      ctx.fillText("워터폴 데이터가 없습니다.", chartOffset, topMargin + 12);
    }

	    lanes.forEach((lane, index) => {
	      const originY = topMargin + index * laneSpacing;
	      ctx.fillStyle = palette.laneLabel;
	      ctx.fillText(lane.label, 16, originY + laneHeight / 1.8);

      ctx.fillStyle = palette.laneBg;
      ctx.fillRect(chartOffset, originY - 2, chartWidth, laneHeight + 4);

      if (index < lanes.length - 1) {
        ctx.strokeStyle = boundaryColor;
        const separatorY = toCrisp(originY + laneHeight + laneGap / 2);
        ctx.beginPath();
        ctx.moveTo(toCrisp(chartOffset), separatorY);
        ctx.lineTo(toCrisp(chartOffset + chartWidth), separatorY);
        ctx.stroke();
      }

	      lane.spans.forEach((span) => {
	        const startRatio = span.start / totalDuration;
	        const durationRatio = span.duration / totalDuration;
	        const barX = chartOffset + startRatio * chartWidth;
	        const barWidth = Math.max(durationRatio * chartWidth, lane.key === "errors" ? 4 : 6);
	        const barHeight = Math.max(10, laneHeight - 8);
	        const barY = originY + (laneHeight - barHeight) / 2;

		        ctx.fillStyle = lane.color;
		        ctx.globalAlpha = 0.86;
		        ctx.fillRect(barX, barY, barWidth, barHeight);
		        ctx.globalAlpha = 1;
		        if (lane.key !== "resources") {
		          ctx.fillStyle = palette.labelOnBar;
		          const label = `${span.duration.toFixed(0)}ms`;
		          if (barWidth > ctx.measureText(label).width + 12) {
		            ctx.fillText(label, barX + 6, barY + barHeight / 1.5);
		          } else {
		            ctx.fillStyle = palette.labelOffBar;
		            ctx.fillText(label, barX + barWidth + 6, barY + barHeight / 1.5);
		          }
		        }
		      });

      if (lane.key === "longTasks") {
        const axisY = originY + laneHeight + Math.max(laneGap - 2, 4);
        ctx.setLineDash([]);
        ctx.strokeStyle = palette.axisLine;
        const crispAxisY = toCrisp(axisY);
        ctx.beginPath();
        ctx.moveTo(toCrisp(chartOffset), crispAxisY);
        ctx.lineTo(toCrisp(chartOffset + chartWidth), crispAxisY);
        ctx.stroke();
        const tickCount = Math.max(Math.round(chartWidth / 140), 4);
        ctx.fillStyle = palette.labelOffBar;
        ctx.font = "11px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
        for (let i = 0; i <= tickCount; i += 1) {
          const ratio = i / tickCount;
          const x = toCrisp(chartOffset + ratio * chartWidth);
          ctx.beginPath();
          ctx.moveTo(x, crispAxisY);
          ctx.lineTo(x, crispAxisY + 5);
          ctx.stroke();
          const label = `${Math.round(ratio * totalDuration)} ms`;
          ctx.fillText(label, x - ctx.measureText(label).width / 2, crispAxisY + 14);
        }
      }
    });

    ctx.setLineDash([]);
    ctx.strokeStyle = boundaryColor;
    ctx.beginPath();
    const crispLeft = toCrisp(chartOffset);
    const crispRight = toCrisp(chartOffset + chartWidth);
    ctx.moveTo(crispLeft, topMargin - 6);
    ctx.lineTo(crispLeft, topMargin + lanesTotalHeight + 6);
    ctx.moveTo(crispRight, topMargin - 6);
    ctx.lineTo(crispRight, topMargin + lanesTotalHeight + 6);
    ctx.stroke();

    if (primaryMarkers.length > 0) {
      const labelBaseY = Math.max(12, topMargin - 6);
      const labelStep = 12;
      const chartTop = topMargin;
      const chartBottom = Math.min(height - bottomMargin, topMargin + lanesTotalHeight + 4);

      ctx.setLineDash([4, 5]);
      primaryMarkers.forEach((marker, index) => {
        const rawX = chartOffset + (marker.value / totalDuration) * chartWidth;
        if (Number.isNaN(rawX)) {
          return;
        }
        const clampedX = Math.max(chartOffset, Math.min(chartOffset + chartWidth, rawX));
        const x = toCrisp(clampedX);
        ctx.strokeStyle = marker.color;
        ctx.beginPath();
        ctx.moveTo(x, chartTop);
        ctx.lineTo(x, chartBottom);
        ctx.stroke();

        const labelY = labelBaseY + index * labelStep;
        const label = marker.label;
        const textWidth = ctx.measureText(label).width;
        let labelX = x + 10;
        if (labelX + textWidth + 8 > chartOffset + chartWidth) {
          labelX = x - textWidth - 16;
        }
        ctx.fillStyle = marker.color;
        ctx.fillText(label, labelX, labelY + 2);
      });
      ctx.setLineDash([]);
    }
  }, [data, errorData, isDarkMode, primaryMarkers, totalDuration, visible]);

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
      className={`lt-waterfall${isVisible ? " is-visible" : ""}${isDarkMode ? " lt-waterfall--dark" : ""}`}
      aria-hidden={!visible}
      style={containerStyle}
    >
	      <button type="button" className="lt-waterfall__backdrop" aria-label="워터폴 닫기" onClick={onClose} />
	      <aside
	        className="lt-waterfall__panel"
	        style={panelStyle}
	        role="dialog"
	        aria-modal="true"
	        aria-label="Waterfall 상세"
	      >
		        <header className="lt-waterfall__header">
		          <div>
		            <h2 className="lt-waterfall__title">Performance</h2>
		          </div>
		        </header>

        {loading ? (
          <div className="lt-waterfall__spinner" role="status" aria-label="워터폴 데이터를 불러오는 중입니다">
            <span className="lt-waterfall__spinner-circle" />
            <span className="lt-waterfall__spinner-circle" />
            <span className="lt-waterfall__spinner-circle" />
          </div>
        ) : null}
        {error ? <div className="lt-waterfall__status lt-waterfall__status--error">{error}</div> : null}

	        <div className="lt-waterfall__description">Event Timings 및 Core Web Vitals</div>

	        <section className="lt-waterfall__metrics">
	          {vitals.map((metric) => (
	            <article key={metric.key} className={`lt-waterfall__metric lt-waterfall__metric--${metric.state}`}>
	              <span className="lt-waterfall__metric-label">{metric.label}</span>
	              <div className="lt-waterfall__metric-value">
	                <span className={`lt-waterfall__bp lt-waterfall__bp--${metric.state}`} aria-hidden="true" />
	                <strong>{metric.value}</strong>
	              </div>
	            </article>
	          ))}
	        </section>

	        <div className="lt-waterfall__inline-metrics" aria-label="추가 성능 지표">
	          {inlineMetrics.map((metric) => (
	            <div
	              key={metric.key}
	              className={`lt-waterfall__inline-metric${metric.hasValue ? "" : " is-missing"}`}
	            >
	              <span className="lt-waterfall__inline-title">{metric.label}</span>
	              <span className="lt-waterfall__inline-value">{metric.value}</span>
	            </div>
	          ))}
	        </div>

	        <section className="lt-waterfall__chart">
	          <div className="lt-waterfall__chart-body">
	            <canvas ref={canvasRef} className="lt-waterfall__chart-canvas" />
	          </div>
	        </section>

	        <section className="lt-waterfall__list">
	          <header className="lt-waterfall__list-header">
	            <div className="lt-waterfall__list-title-row">
	              <span className="lt-waterfall__section-title">Water Fall</span>
	              <span className="lt-waterfall__count">
	                {filteredRows.length} / {rows.length} Requests
	              </span>
	            </div>
	            <div className="lt-waterfall__tabs" role="tablist" aria-label="워터폴 카테고리">
	              {categoryTabs.map((tab) => (
	                <button
	                  key={tab.key}
	                  type="button"
	                  role="tab"
	                  aria-selected={tab.key === activeCategory}
	                  disabled={!tab.enabled}
	                  className={`lt-waterfall__tab${tab.key === activeCategory ? " is-active" : ""}${tab.enabled && tab.key !== "all" ? " is-exist" : ""}`}
	                  onClick={() => {
	                    if (tab.enabled) {
	                      setActiveCategory(tab.key);
	                    }
	                  }}
	                >
	                  {tab.label}
	                </button>
	              ))}
	            </div>
	          </header>
	          <div className="lt-waterfall__time-axis" aria-hidden="true">
	            <span className="lt-waterfall__time-axis-left" />
	            <div className="lt-waterfall__time-axis-right">
	              {Array.from({ length: 5 }).map((_, index) => {
	                const ratio = index / 4;
	                const value = Math.round(totalDuration * ratio);
	                return (
	                  <span key={`tick-${index}`} className="lt-waterfall__time-axis-tick">
	                    {value}ms
	                  </span>
	                );
	              })}
	            </div>
	          </div>

	          <div className="lt-waterfall__yaxis-header-row" aria-hidden="true">
	            <div className="lt-waterfall__yaxis-header">
	              <span>NAME</span>
	              <span>SIZE</span>
	              <span>CODE</span>
	              <span>DURATION</span>
	            </div>
	            <span />
	          </div>

	          <div ref={listBodyRef} className="lt-waterfall__list-body">
	            {trackOffsets.trackWidth > 0 ? (
	              <div
	                className="lt-waterfall__grid"
	                style={
	                  {
	                    left: `${trackOffsets.trackLeft}px`,
	                    width: `${trackOffsets.trackWidth}px`,
	                    "--lt-grid-height": `${trackOffsets.trackHeight}px`,
	                  } as CSSProperties
	                }
	              >
	                {[
	                  { key: "grid-start", value: 0, color: "rgba(148, 163, 184, 0.35)" },
	                  { key: "grid-end", value: totalDuration, color: "rgba(148, 163, 184, 0.35)" },
	                  ...primaryMarkers,
	                ].map((marker) => {
	                  const clamped = totalDuration > 0 ? Math.min(Math.max(marker.value / totalDuration, 0), 1) : 0;
	                  return (
	                    <span
	                      key={`grid-${marker.key}-${marker.value}`}
	                      className="lt-waterfall__grid-marker"
	                      style={{ left: `calc(${(clamped * 100).toFixed(4)}% - 1px)`, color: marker.color }}
	                    />
	                  );
	                })}
	                {primaryMarkers.slice(0, 7).map((marker, index) => {
	                  const clamped = totalDuration > 0 ? Math.min(Math.max(marker.value / totalDuration, 0), 1) : 0;
	                  return (
	                    <span
	                      key={`grid-label-${marker.key}-${marker.value}`}
	                      className="lt-waterfall__grid-label"
	                      style={{
	                        left: `calc(${(clamped * 100).toFixed(4)}% + 6px)`,
	                        top: `${6 + index * 12}px`,
	                        color: marker.color,
	                      }}
	                    >
	                      {marker.label}
	                    </span>
	                  );
	                })}
	              </div>
	            ) : null}

	            <div className="lt-waterfall__wf-rows">
	              {filteredRows.map((row, index) => {
	                const entryType = row.entryType ?? "";
	                const initiatorType = row.initiatorType ?? "";
	                const nameTitle =
	                  entryType === "resource" && row.name && row.name.includes("://") ? row.name : undefined;
	                const badgeVariant = (() => {
	                  if (entryType === "reformNavigation") return "reformNavigation";
	                  const initiator = initiatorType.toLowerCase();
	                  if (entryType === "resource") {
	                    if (["fetch", "xmlhttprequest"].includes(initiator)) return "xhr";
	                    if (initiator === "css") return "style";
	                    if (["img", "image"].includes(initiator)) return "img";
	                    if (initiator) return initiator;
	                  }
	                  return entryType || "other";
	                })();
	                const hasName = Boolean(row.name && row.name.trim().length > 0);
	                const primaryLabel = hasName ? row.name : "(unnamed)";
	                const displayLabel =
	                  entryType === "resource"
	                    ? (() => {
	                        try {
	                          const url = new URL(primaryLabel);
	                          const segment = url.pathname.split("/").filter(Boolean).pop();
	                          return segment || primaryLabel;
	                        } catch {
	                          const parts = primaryLabel.split("/").filter(Boolean);
	                          return parts[parts.length - 1] || primaryLabel;
	                        }
	                      })()
	                    : primaryLabel;
	                const safeDuration = Number.isFinite(row.duration) ? row.duration : 0;
	                const durationText =
	                  safeDuration >= 1000 ? `${(safeDuration / 1000).toFixed(2)}s` : `${safeDuration.toFixed(0)}ms`;
	                const statusCode = Number.isFinite(row.status) && row.status > 0 ? row.status : null;
	                const statusText = statusCode != null ? String(statusCode) : "-";
	                const statusClass =
	                  statusCode == null
	                    ? "is-unknown"
	                    : statusCode >= 500
	                      ? "is-server-error"
	                      : statusCode >= 400
	                        ? "is-client-error"
	                        : statusCode >= 300
	                          ? "is-redirect"
	                          : statusCode >= 200
	                            ? "is-success"
	                            : "is-unknown";
	                const startRatio =
	                  totalDuration > 0 ? Math.min(Math.max(row.startTime / totalDuration, 0), 1) : 0;
	                const rawWidthRatio =
	                  totalDuration > 0 ? Math.max(safeDuration / totalDuration, 0) : 0;
	                const widthRatio = Math.min(
	                  1 - startRatio,
	                  Math.max(rawWidthRatio, MIN_RESOURCE_BAR_PCT / 100),
	                );
	                const barStart = Math.min(startRatio * 100, 100);
	                const barWidth = Math.min(widthRatio * 100, Math.max(100 - barStart, 0));
	                const isLcp = (row.markers ?? []).some((marker) => marker.toLowerCase() === "lcp");
	                const barVariant = entryType === "reformNavigation" ? "is-nav" : "is-resource";
	                const typeIconSrc = resolveWaterfallTypeIcon(badgeVariant);

	                return (
	                  <div key={row.id} className="lt-waterfall__wf-row">
	                    <div className="lt-waterfall__wf-yaxis">
	                      <div className="lt-waterfall__wf-name" title={nameTitle}>
	                        <img
	                          className="lt-waterfall__badge"
	                          src={typeIconSrc}
	                          alt=""
	                          aria-hidden="true"
	                          decoding="async"
	                          loading="lazy"
	                        />
	                        <span
	                          className={`lt-waterfall__wf-name-text${isLcp ? " is-lcp" : ""}`}
	                          title={nameTitle}
	                        >
	                          {displayLabel}
	                        </span>
	                      </div>
	                      <div className="lt-waterfall__wf-size">{row.sizeLabel ?? "-"}</div>
	                      <div className="lt-waterfall__wf-code">
	                        <span className={`lt-waterfall__status-pill ${statusClass}`}>{statusText}</span>
	                      </div>
	                      <div className="lt-waterfall__wf-duration">{durationText}</div>
	                    </div>
	                    <div
	                      className="lt-waterfall__resource-track"
	                      ref={index === 0 ? trackAnchorRef : undefined}
	                      aria-label={`${displayLabel} ${durationText}`}
	                    >
	                      <div
	                        className={`lt-waterfall__resource-bar ${barVariant}`}
	                        style={{ left: `${barStart}%`, width: `${Math.max(barWidth, 0)}%` }}
	                        title={`${durationText} (start ${row.startTime.toFixed(0)}ms)`}
	                      />
	                    </div>
	                  </div>
	                );
	              })}
	            </div>
	          </div>
	        </section>

	      </aside>
    </div>
  );
}
