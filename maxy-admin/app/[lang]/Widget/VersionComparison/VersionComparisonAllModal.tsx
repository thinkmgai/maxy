"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  getVersionComparisonAllData,
  getVersionComparisonRowData,
  type VersionComparisonAllItem,
  type VersionComparisonDateType,
  type VersionComparisonRowSeriesResponse,
} from "../../../api/Widget/VersionComparison";

import "./version-comparison-modal.css";

const DATE_OPTIONS: { key: VersionComparisonDateType; label: string }[] = [
  { key: "DAY", label: "DAY" },
  { key: "WEEK", label: "WEEK" },
  { key: "MONTH", label: "MONTH" },
];

type VersionComparisonAllModalProps = {
  open: boolean;
  applicationId: string;
  onClose(): void;
  tmzutc: number;
};

const numberFormatter = new Intl.NumberFormat("ko-KR");

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return "-";
  }
  return numberFormatter.format(Math.round(value));
}

function formatDuration(value: number): string {
  if (!Number.isFinite(value)) {
    return "-";
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}s`;
  }
  return `${Math.round(value)}ms`;
}

function extractLatest(series: Array<[number, number]> | undefined): number | null {
  if (!series || series.length === 0) {
    return null;
  }
  const last = series[series.length - 1];
  return last?.[1] ?? null;
}

type MetricCardProps = {
  title: string;
  series: Array<[number, number]>;
  color: string;
  formatter: (value: number) => string;
};

function MetricCard({ title, series, color, formatter }: MetricCardProps) {
  const width = 200;
  const height = 80;
  const padding = { top: 10, right: 12, bottom: 16, left: 12 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const hasSeries = series.length > 1;
  const values = series.map(([, value]) => value);
  const maxValue = values.length ? Math.max(...values, 1) : 1;
  const minValue = values.length ? Math.min(...values, 0) : 0;
  const range = Math.max(maxValue - minValue, 1);

  const path = hasSeries
    ? series
        .map(([, value], index) => {
          const x = (index / (series.length - 1)) * chartWidth;
          const y = chartHeight - ((value - minValue) / range) * chartHeight;
          return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
        })
        .join(" ")
    : "";

  const latest = extractLatest(series);

  return (
    <div className="vc-modal-card">
      <div className="vc-modal-card__header">
        <span>{title}</span>
        <strong>{latest != null ? formatter(latest) : "-"}</strong>
      </div>
      {hasSeries ? (
        <svg
          className="vc-modal-card__chart"
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
        >
          <rect x="0" y="0" width={width} height={height} fill="rgba(248, 250, 255, 0.9)" />
          <g transform={`translate(${padding.left}, ${padding.top})`}>
            <path
              d={path}
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </g>
        </svg>
      ) : (
        <div className="vc-modal-card__empty">데이터 없음</div>
      )}
    </div>
  );
}

export default function VersionComparisonAllModal({
  open,
  applicationId,
  onClose,
  tmzutc,
}: VersionComparisonAllModalProps) {
  const [dateType, setDateType] = useState<VersionComparisonDateType>("DAY");
  const [list, setList] = useState<VersionComparisonAllItem[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [detail, setDetail] = useState<VersionComparisonRowSeriesResponse | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const listAbortRef = useRef<AbortController | null>(null);
  const detailAbortRef = useRef<AbortController | null>(null);

  const resetState = useCallback(() => {
    if (listAbortRef.current) {
      listAbortRef.current.abort();
      listAbortRef.current = null;
    }
    if (detailAbortRef.current) {
      detailAbortRef.current.abort();
      detailAbortRef.current = null;
    }
    setList([]);
    setFocusedIndex(null);
    setDetail(null);
    setListError(null);
    setDetailError(null);
  }, []);

  const fetchList = useCallback(async () => {
    if (!open) {
      return;
    }
    setLoadingList(true);
    setListError(null);
    setList([]);
    setFocusedIndex(null);
    setDetail(null);

    if (!applicationId) {
      setLoadingList(false);
      setListError("애플리케이션을 선택해주세요.");
      return;
    }

    if (listAbortRef.current) {
      listAbortRef.current.abort();
    }
    const controller = new AbortController();
    listAbortRef.current = controller;

    try {
      const rows = await getVersionComparisonAllData(
        {
          applicationId,
          dateType,
          size: 20,
          tmzutc: tmzutc,
        },
        controller.signal,
      );
      setList(rows);
      if (rows.length > 0) {
        setFocusedIndex(0);
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        setListError(error instanceof Error ? error.message : "전체 데이터를 불러오지 못했습니다.");
      }
    } finally {
      if (listAbortRef.current === controller) {
        listAbortRef.current = null;
      }
      setLoadingList(false);
    }
  }, [open, applicationId, dateType, tmzutc]);

  const fetchDetail = useCallback(
    async (row: VersionComparisonAllItem | undefined) => {
      if (!row) {
        setDetail(null);
        return;
      }
      setLoadingDetail(true);
      setDetailError(null);
      setDetail(null);

      if (!row.applicationId) {
        setLoadingDetail(false);
        setDetailError("애플리케이션 정보를 찾을 수 없습니다.");
        return;
      }

      if (detailAbortRef.current) {
        detailAbortRef.current.abort();
      }
      const controller = new AbortController();
      detailAbortRef.current = controller;

      try {
        const payload = await getVersionComparisonRowData(
          {
            applicationId: row.applicationId,
            osType: row.osType,
            appVer: row.appVer,
            dateType,
            tmzutc: tmzutc,
          },
          controller.signal,
        );
        setDetail(payload);
      } catch (error) {
        if (!controller.signal.aborted) {
          setDetailError(
            error instanceof Error ? error.message : "상세 데이터를 불러오지 못했습니다.",
          );
        }
      } finally {
        if (detailAbortRef.current === controller) {
          detailAbortRef.current = null;
        }
        setLoadingDetail(false);
      }
    },
    [dateType, tmzutc],
  );

  useEffect(() => {
    if (!open) {
      resetState();
      return;
    }
    fetchList();
  }, [fetchList, open, resetState]);

  useEffect(() => {
    if (!open) {
      return;
    }
    if (focusedIndex == null) {
      setDetail(null);
      setDetailError(null);
      return;
    }
    fetchDetail(list[focusedIndex]);
  }, [fetchDetail, focusedIndex, list, open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, open]);

  useEffect(() => {
    if (open) {
      fetchList();
    }
  }, [dateType, fetchList, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="vc-modal__backdrop" role="presentation">
      <div className="vc-modal" role="dialog" aria-modal="true" aria-label="Version Comparison All">
        <header className="vc-modal__header">
          <div>
            <h3>Version Comparison</h3>
            {focusedIndex != null && list[focusedIndex] ? (
              <p className="vc-modal__subtitle">
                {list[focusedIndex].osType} {list[focusedIndex].appVer}
              </p>
            ) : null}
          </div>
          <button type="button" className="vc-modal__close" aria-label="닫기" onClick={onClose}>
            ×
          </button>
        </header>

        <div className="vc-modal__controls">
          <div className="vc-modal__date-toggle">
            {DATE_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                className={`vc-modal__date-button${
                  dateType === option.key ? " vc-modal__date-button--active" : ""
                }`}
                onClick={() => setDateType(option.key)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="vc-modal__body">
          <section className="vc-modal__list">
            {loadingList ? (
              <div className="vc-modal__status">전체 데이터를 불러오는 중입니다…</div>
            ) : listError ? (
              <div className="vc-modal__status vc-modal__status--error">{listError}</div>
            ) : (
              <div className="vc-modal__table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>OS</th>
                      <th>Version</th>
                      <th>Install</th>
                      <th>DAU</th>
                      <th>Error</th>
                      <th>Crash</th>
                      <th>Loading</th>
                      <th>Response</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((item, index) => {
                      const isActive = index === focusedIndex;
                      return (
                        <tr
                          key={`${item.osType}-${item.appVer}-${index}`}
                          className={isActive ? "vc-modal__row--active" : undefined}
                          onClick={() => setFocusedIndex(index)}
                        >
                          <td>{item.osType}</td>
                          <td>{item.appVer}</td>
                          <td>{formatNumber(item.install)}</td>
                          <td>{formatNumber(item.dau)}</td>
                          <td>{formatNumber(item.error)}</td>
                          <td>{formatNumber(item.crash)}</td>
                          <td>{formatDuration(item.loadingTime)}</td>
                          <td>{formatDuration(item.responseTime)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="vc-modal__detail">
            {loadingDetail ? (
              <div className="vc-modal__status">상세 데이터를 불러오는 중입니다…</div>
            ) : detailError ? (
              <div className="vc-modal__status vc-modal__status--error">{detailError}</div>
            ) : detail ? (
              <div className="vc-modal__metrics">
                <MetricCard
                  title="Install"
                  series={detail.series.install}
                  color="#2563eb"
                  formatter={formatNumber}
                />
                <MetricCard
                  title="DAU"
                  series={detail.series.dau}
                  color="#0ea5e9"
                  formatter={formatNumber}
                />
                <MetricCard
                  title="Error"
                  series={detail.series.error}
                  color="#f97316"
                  formatter={formatNumber}
                />
                <MetricCard
                  title="Crash"
                  series={detail.series.crash}
                  color="#ef4444"
                  formatter={formatNumber}
                />
                <MetricCard
                  title="Loading Time"
                  series={detail.series.loadingTime}
                  color="#8b5cf6"
                  formatter={formatDuration}
                />
                <MetricCard
                  title="Response Time"
                  series={detail.series.responseTime}
                  color="#14b8a6"
                  formatter={formatDuration}
                />
              </div>
            ) : (
              <div className="vc-modal__status">행을 선택하면 상세 데이터를 확인할 수 있습니다.</div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
