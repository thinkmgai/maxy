"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  getPVEqualizerAllInfoList,
  type PVEqualizerAllInfoItem,
  type PVEqualizerDateType,
} from "../../../api/Widget/PVEqualizer";

const DATE_OPTIONS: { key: PVEqualizerDateType; label: string }[] = [
  { key: "DAY", label: "Day" },
  { key: "WEEK", label: "1W" },
  { key: "MONTH", label: "1M" },
];

type MetricTab = "pageview" | "viewer" | "staytime";

const METRIC_TABS: { key: MetricTab; label: string }[] = [
  { key: "pageview", label: "Page View" },
  { key: "viewer", label: "Viewer" },
  { key: "staytime", label: "Stay Time (Avg.)" },
];

const PAGE_SIZE = 500;

const numberFormatter = new Intl.NumberFormat("ko-KR");

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return "-";
  }
  return numberFormatter.format(Math.round(value));
}

function formatDurationMs(value: number): string {
  if (!Number.isFinite(value)) {
    return "-";
  }
  if (value >= 60_000) {
    const minutes = Math.floor(value / 60_000);
    const seconds = Math.round((value % 60_000) / 1000);
    return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}s`;
  }
  return `${Math.round(value)}ms`;
}

function parseNumeric(value: unknown): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

type PVEqualizerAllModalProps = {
  open: boolean;
  applicationId: number;
  osType: string | null;
  tmzutc: number;
  onClose(): void;
};

export default function PVEqualizerAllModal({
  open,
  applicationId,
  osType,
  tmzutc,
  onClose,
}: PVEqualizerAllModalProps) {
  const [dateType, setDateType] = useState<PVEqualizerDateType>("DAY");
  const [tab, setTab] = useState<MetricTab>("pageview");
  const [list, setList] = useState<PVEqualizerAllInfoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const handleClose = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setList([]);
    setError(null);
    setLoading(false);
    setTab("pageview");
    setDateType("DAY");
    onClose();
  }, [onClose]);

  const modalRoot = useMemo(() => {
    if (typeof window === "undefined") return null;
    let el = document.getElementById("pv-analysis-modal-root");
    if (!el) {
      el = document.createElement("div");
      el.id = "pv-analysis-modal-root";
      document.body.appendChild(el);
    }
    return el;
  }, []);

  const fetchList = useCallback(() => {
    if (!open || applicationId <= 0) {
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setList([]);
    setLoading(true);
    setError(null);

    getPVEqualizerAllInfoList(
      {
        applicationId: String(applicationId),
        osType,
        dateType,
        limit: PAGE_SIZE,
        offset: 0,
        tmzutc,
      },
      controller.signal,
    )
      .then((payload) => {
        if (controller.signal.aborted) return;
        setList(Array.isArray(payload.list) ? payload.list : []);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "목록을 불러오지 못했습니다.");
        setList([]);
      })
      .finally(() => {
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
        setLoading(false);
      });
  }, [open, applicationId, osType, dateType, tmzutc]);

  useEffect(() => {
    if (open) {
      return;
    }
    abortRef.current?.abort();
    abortRef.current = null;
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const timer = window.setTimeout(() => {
      fetchList();
    }, 0);
    return () => {
      window.clearTimeout(timer);
    };
  }, [dateType, fetchList, open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleClose, open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const metricValue = useCallback(
    (item: PVEqualizerAllInfoItem) => {
      if (tab === "viewer") {
        return parseNumeric(item.uniqDeviceCount);
      }
      if (tab === "staytime") {
        return parseNumeric(item.intervaltime);
      }
      return parseNumeric(item.viewCount);
    },
    [tab],
  );

  const sorted = useMemo(() => {
    const data = [...list];
    data.sort((a, b) => metricValue(b) - metricValue(a));
    return data;
  }, [list, metricValue]);

  const maxValue = useMemo(() => {
    return Math.max(...sorted.map((item) => metricValue(item)), 0) || 1;
  }, [sorted, metricValue]);

  const axisTicks = useMemo(() => {
    const segments = 4;
    const max = maxValue || 1;
    return Array.from({ length: segments + 1 }, (_, index) => {
      const value = (max * index) / segments;
      const label =
        tab === "staytime"
          ? formatDurationMs(value)
          : formatNumber(value);
      return { value, label };
    });
  }, [maxValue, tab]);

  const listCountLabel = sorted.length ? `(${formatNumber(sorted.length)})` : "";

  if (!open || !modalRoot) {
    return null;
  }

  return createPortal(
    <div
      className="pv-analysis-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          handleClose();
        }
      }}
    >
      <div
        id="pvAnalysis__popup"
        className="maxy_popup_common pv_analysis"
        role="dialog"
        aria-modal="true"
        aria-label="PV Analysis"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="maxy_popup_grid_s_wrap">
          <div className="maxy_popup_title_wrap">
            <div className="maxy_popup_title_left">
              <img className="maxy_popup_analysis_icon" src="/images/maxy/icon-analysis.svg" alt="" />
              <span>PV Analysis</span>
              {listCountLabel ? <span>{listCountLabel}</span> : null}
            </div>
            <div className="maxy_popup_title_right">
              <div className="maxy_component_btn_wrap" role="group" aria-label="기간">
                {DATE_OPTIONS.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    className={`maxy_component_btn${dateType === option.key ? " on" : ""}`}
                    data-date={option.key}
                    onClick={() => setDateType(option.key)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="data_wrap">
            <div className="stack_button_wrap">
              <div className="type_tab_wrap" role="tablist" aria-label="지표">
                {METRIC_TABS.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    role="tab"
                    data-type={option.key}
                    className={`type_tab${tab === option.key ? " selected" : ""}`}
                    aria-selected={tab === option.key}
                    onClick={() => setTab(option.key)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="graph_wrap maxy_box">
              <div className="graph_wrap_inner enable_scrollbar">
                {error ? (
                  <div className="pv-analysis-status pv-analysis-status--error">{error}</div>
                ) : null}
                {!error && loading ? (
                  <div className="pv-analysis-status">데이터를 불러오는 중입니다.</div>
                ) : null}

                {!error && sorted.length > 0 ? (
                  <>
                    <div className="pv_list" role="list">
                      {sorted.map((item, index) => (
                        <div
                          key={`${item.reqUrl}-${index}-label`}
                          className="pv_row"
                          role="listitem"
                          title={[
                            `url: ${item.reqUrl || "-"}`,
                            `log_count: ${formatNumber(parseNumeric(item.viewCount))}`,
                            `Viewer: ${formatNumber(parseNumeric(item.uniqDeviceCount))}`,
                            `stay_time: ${formatDurationMs(parseNumeric(item.intervaltime))}`,
                          ].join("\n")}
                        >
                          <span className="name">{item.reqUrl}</span>
                        </div>
                      ))}
                    </div>
                    <div className="pv_graph" role="list">
                      <div className="pv_graph_grid" aria-hidden="true">
                        {axisTicks.map((tick, index) => (
                          <span key={`${tick.value}-${index}`} className="pv_graph_grid-line" />
                        ))}
                      </div>
                      {sorted.map((item, index) => {
                        const value = metricValue(item);
                        const ratio = Math.min(1, Math.max(0, value / maxValue));
                        const barWidth = `${(ratio * 100).toFixed(2)}%`;

                        return (
                          <div
                            key={`${item.reqUrl}-${index}-graph`}
                            className={`pv_graph_row pv_graph_row--${tab}`}
                            role="listitem"
                            title={[
                              `url: ${item.reqUrl || "-"}`,
                              `log_count: ${formatNumber(parseNumeric(item.viewCount))}`,
                              `Viewer: ${formatNumber(parseNumeric(item.uniqDeviceCount))}`,
                              `stay_time: ${formatDurationMs(parseNumeric(item.intervaltime))}`,
                            ].join("\n")}
                          >
                            <div className="pv_graph_barwrap" aria-hidden="true">
                              <div className="pv_graph_bar" style={{ width: barWidth }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : null}
              </div>

              <div className="graph_x_wrap">
                <div />
                <div className="pv_graph_axis" aria-hidden="true">
                  {axisTicks.map((tick, index) => (
                    <span key={`${tick.value}-${index}`} className="pv_graph_axis-tick">
                      {tick.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    modalRoot,
  );
}
