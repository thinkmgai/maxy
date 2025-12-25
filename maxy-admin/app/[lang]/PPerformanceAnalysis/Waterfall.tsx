import { useMemo, type ReactNode } from "react";
import type { PageLogDetailItem, PageLogWaterfallEntry } from "../../api/PerformanceAnalysis";

type WaterfallPanelProps = {
  open: boolean;
  row: PageLogDetailItem | null;
  steps: PageLogWaterfallEntry[];
  loading?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
};

function formatDuration(value?: number | null) {
  if (value == null || Number.isNaN(value)) {
    return "-";
  }
  if (value >= 1000) {
    const seconds = value / 1000;
    return Number.isInteger(seconds) ? `${seconds.toFixed(0)}초` : `${seconds.toFixed(2)}초`;
  }
  return `${Math.round(value)}ms`;
}

function formatAxisLabel(value: number) {
  if (value >= 1000) {
    const seconds = value / 1000;
    return Number.isInteger(seconds) ? `${seconds.toFixed(0)}s` : `${seconds.toFixed(1)}s`;
  }
  return `${Math.round(value)}ms`;
}

function formatTimestamp(value?: number | null) {
  if (value == null || Number.isNaN(value)) return "-";
  return new Date(value).toLocaleString();
}

function renderFeeldex(value?: number | null): ReactNode {
  if (value == null || value < 0) {
    return <span className="feeldex-icon empty" aria-label="Feeldex 없음">-</span>;
  }

  let status: "very_good" | "good" | "normal" | "bad" | "very_bad";
  if (value === 0) {
    status = "very_good";
  } else if (value === 1) {
    status = "good";
  } else if (value === 2 || value === 3) {
    status = "normal";
  } else if (value === 4) {
    status = "bad";
  } else {
    status = "very_bad";
  }

  const labelMap: Record<typeof status, string> = {
    very_good: "Feeldex Very Good",
    good: "Feeldex Good",
    normal: "Feeldex Normal",
    bad: "Feeldex Bad",
    very_bad: "Feeldex Very Bad",
  };

  return (
    <span
      className={`feeldex-icon ${status}`}
      aria-label={labelMap[status]}
      title={labelMap[status]}
      role="img"
    />
  );
}

function determineTickSize(maxValue: number) {
  const scales = [100, 200, 500, 1000, 2000, 5000, 10000, 20000];
  for (const scale of scales) {
    if (maxValue / scale <= 8) {
      return scale;
    }
  }
  return scales[scales.length - 1];
}

export default function WaterfallPanel({
  open,
  row,
  steps,
  loading = false,
  onOpen,
  onClose,
}: WaterfallPanelProps) {
  const safeSteps = useMemo(() => (open ? steps : []), [open, steps]);
  const maxTimeline = useMemo(() => {
    if (!safeSteps.length) return 0;
    return safeSteps.reduce((acc, item) => Math.max(acc, item.start + item.duration), 0);
  }, [safeSteps]);

  const axisMarks = useMemo(() => {
    if (!open || maxTimeline <= 0) return [];
    const tickSize = determineTickSize(maxTimeline);
    const marks: number[] = [];
    for (let value = 0; value <= maxTimeline; value += tickSize) {
      marks.push(Math.min(value, maxTimeline));
    }
    if (marks[marks.length - 1] !== maxTimeline) {
      marks.push(maxTimeline);
    }
    return marks;
  }, [open, maxTimeline]);

  const metaItems = useMemo<Array<{ label: string; value: ReactNode }>>(() => {
    if (!row) return [];
    const items: Array<{ label: string; value: ReactNode }> = [
      { label: "Loading", value: formatDuration(row.loadingTime) },
      { label: "Feeldex", value: renderFeeldex(row.feeldex) },
      { label: "Network", value: row.networkStatus ?? "-" },
      { label: "User ID", value: row.userId ?? "-" },
      { label: "Device ID", value: row.deviceId ?? "-" },
      { label: "Timestamp", value: formatTimestamp(row.timestamp) },
    ];
    return items.filter((item) => {
      if (typeof item.value === "string") {
        return item.value.length > 0 && item.value !== "-";
      }
      return item.value != null;
    });
  }, [row]);

  const safeMax = maxTimeline > 0 ? maxTimeline : 1;
  const totalLabel = safeSteps.length > 0 ? `${safeSteps.length} 단계` : null;

  return (
    <>
      <button
        type="button"
        className="pa_waterfall_stub"
        onClick={open ? onClose : onOpen}
        aria-expanded={open}
      >
        Waterfall
      </button>
      <div className={`pa_waterfall_backdrop ${open ? "open" : ""}`} aria-hidden={!open} onClick={onClose} />
      <aside className={`pa_waterfall_panel ${open ? "open" : ""}`} aria-hidden={!open}>
        <div className="pa_waterfall_panel_inner">
          <header className="pa_waterfall_header">
            <div className="pa_waterfall_header_left">
              <h3 className="pa_waterfall_title">Waterfall</h3>
              {row?.reqUrl ? <p className="pa_waterfall_subtitle">{row.reqUrl}</p> : null}
            </div>
            {totalLabel ? <span className="pa_waterfall_counter">{totalLabel}</span> : null}
          </header>

          {metaItems.length > 0 && (
            <div className="pa_waterfall_summary">
              {metaItems.map((item) => (
                <span key={item.label} className="pa_waterfall_summary_item">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </span>
              ))}
            </div>
          )}

          <div className="pa_waterfall_body">
            <div className="pa_waterfall_timeline">
              <div className="pa_waterfall_axis">
                {axisMarks.map((mark) => (
                  <span
                    key={mark}
                    className="pa_waterfall_axis_mark"
                    data-label={formatAxisLabel(mark)}
                    style={{ left: `${(mark / safeMax) * 100}%` }}
                  />
                ))}
              </div>
              {loading ? (
                <p className="pa_waterfall_empty">워터폴을 불러오는 중입니다…</p>
              ) : safeSteps.length === 0 ? (
                <p className="pa_waterfall_empty">워터폴 데이터가 없습니다.</p>
              ) : (
                <ul className="pa_waterfall_rows">
                  {safeSteps.map((step) => {
                    const startPercent = Math.max(0, Math.min((step.start / safeMax) * 100, 100));
                    const widthPercent = Math.max(
                      1.5,
                      Math.min((step.duration / safeMax) * 100, 100 - startPercent),
                    );
                    return (
                      <li key={`${step.name}-${step.start}`} className="pa_waterfall_row">
                        <div className="pa_waterfall_row_info">
                          <strong>{step.name}</strong>
                          <span>{`+${formatDuration(step.start)} • ${formatDuration(step.duration)}`}</span>
                        </div>
                        <div className="pa_waterfall_row_bar">
                          <span
                            className="pa_waterfall_row_fill"
                            style={{
                              left: `${startPercent}%`,
                              width: `${widthPercent}%`,
                            }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
