"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  getResourceUsageData,
  getResourceUsagePopupData,
  type ResourceUsageDateType,
  type ResourceUsageModelSeries,
  type ResourceUsagePopupRow,
} from "../../../api/Widget/ResourceUsage";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import "./resource-usage-modal.css";

type ResourceUsageAllModalProps = {
  open: boolean;
  applicationId: string;
  osType: "all" | "Android" | "iOS";
  dateType: ResourceUsageDateType;
  onDateTypeChange?: (dateType: ResourceUsageDateType) => void;
  onClose(): void;
  tmzutc: number;
};

const numberFormatter = new Intl.NumberFormat("ko-KR");
const timeFormatter = new Intl.DateTimeFormat("ko-KR", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  month: "2-digit",
  day: "2-digit",
});
const dateTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

const CPU_COLOR = "#009ff9";
const MEM_COLOR = "#f97316";
const PAGE_SIZE = 30;
const CHART_HEIGHT_PX = "100%";
const RANK_CLASSES = [
  "resource_one",
  "resource_two",
  "resource_three",
  "resource_four",
  "resource_five",
  "resource_six",
] as const;
const DATE_TYPE_OPTIONS: Array<{ value: ResourceUsageDateType; label: string }> = [
  { value: "DAY", label: "Day" },
  { value: "WEEK", label: "1W" },
  { value: "MONTH", label: "1M" },
];

type ChartDatum = {
  timestamp: number;
  label: string;
  cpu?: number;
  memory?: number;
};

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return "-";
  }
  return numberFormatter.format(Math.round(value));
}

function formatCpu(value: number): string {
  if (!Number.isFinite(value)) {
    return "-";
  }
  return `${(Math.round(value * 10) / 10).toFixed(1).replace(/\.0$/, "")}%`;
}

function formatMemoryMb(value: number): string {
  if (!Number.isFinite(value)) {
    return "-";
  }
  return `${(Math.round(value * 10) / 10).toFixed(1).replace(/\.0$/, "")} MB`;
}

function formatMemoryKb(value: number): string {
  if (!Number.isFinite(value)) {
    return "-";
  }
  if (value >= 1024 * 1024) {
    const gb = value / (1024 * 1024);
    return `${gb.toFixed(2).replace(/\.00$/, "")} GB`;
  }
  if (value >= 1024) {
    const mb = value / 1024;
    return `${mb.toFixed(1).replace(/\.0$/, "")} MB`;
  }
  return `${Math.round(value)} KB`;
}

function formatAxisLabel(timestamp: number, dateType: ResourceUsageDateType): string {
  if (!Number.isFinite(timestamp)) {
    return "-";
  }
  const date = new Date(timestamp);
  if (dateType === "DAY") {
    return timeFormatter.format(date);
  }
  return dateFormatter.format(date);
}

function formatDateTime(timestamp: number | null): string {
  if (!Number.isFinite(timestamp ?? NaN)) {
    return "-";
  }
  return dateTimeFormatter.format(new Date(timestamp as number));
}

function toNumber(value: unknown): number {
  if (value == null) {
    return NaN;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : NaN;
}

function buildChartData(
  series: ResourceUsageModelSeries | null,
  dateType: ResourceUsageDateType,
): ChartDatum[] {
  if (!series) {
    return [];
  }

  const bucket = new Map<number, ChartDatum>();

  (series.cpu ?? []).forEach(([timestampRaw, valueRaw]) => {
    const timestamp = toNumber(timestampRaw);
    const value = toNumber(valueRaw);
    if (!Number.isFinite(timestamp) || !Number.isFinite(value)) {
      return;
    }
    const stored =
      bucket.get(timestamp) ??
      {
        timestamp,
        label: formatAxisLabel(timestamp, dateType),
      };
    stored.cpu = value;
    bucket.set(timestamp, stored);
  });

  (series.memory ?? []).forEach(([timestampRaw, valueRaw]) => {
    const timestamp = toNumber(timestampRaw);
    const value = toNumber(valueRaw);
    if (!Number.isFinite(timestamp) || !Number.isFinite(value)) {
      return;
    }
    const stored =
      bucket.get(timestamp) ??
      {
        timestamp,
        label: formatAxisLabel(timestamp, dateType),
      };
    stored.memory = value / 1024;
    bucket.set(timestamp, stored);
  });

  return Array.from(bucket.values()).sort((a, b) => a.timestamp - b.timestamp);
}

function ResourceUsageModalTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    dataKey: string;
    color?: string;
    payload: ChartDatum;
  }>;
}) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const base = payload[0].payload;
  const timestamp = Number(base.timestamp);
  return (
    <div className="ru-modal__tooltip">
      <div className="ru-modal__tooltip-title">
        {Number.isFinite(timestamp) ? formatDateTime(timestamp) : "-"}
      </div>
      <div className="ru-modal__tooltip-body">
        {payload.map((entry) => (
          <div className="ru-modal__tooltip-row" key={entry.dataKey}>
            <span className="ru-modal__tooltip-indicator" style={{ backgroundColor: entry.color }} />
            <span className="ru-modal__tooltip-label">{entry.name}</span>
            <span className="ru-modal__tooltip-value">
              {entry.dataKey === "cpu"
                ? formatCpu(Number(entry.value))
                : formatMemoryMb(Number(entry.value))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function rowKey(row: { deviceModel: string; osType?: string | null }): string {
  return `${row.deviceModel}::${row.osType ?? ""}`;
}

export default function ResourceUsageAllModal({
  open,
  applicationId,
  osType,
  dateType,
  onDateTypeChange,
  onClose,
  tmzutc,
}: ResourceUsageAllModalProps) {
  const [activeDateType, setActiveDateType] = useState<ResourceUsageDateType>(dateType);
  const [rows, setRows] = useState<ResourceUsagePopupRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [totalRows, setTotalRows] = useState(0);
  const [seriesCache, setSeriesCache] = useState<Record<string, ResourceUsageModelSeries>>({});
  const [seriesLoading, setSeriesLoading] = useState(false);
  const [seriesError, setSeriesError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const listControllerRef = useRef<AbortController | null>(null);
  const seriesControllerRef = useRef<AbortController | null>(null);
  const listWrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    setActiveDateType(dateType);
  }, [open, dateType]);

  const handleDateTypeChange = useCallback(
    (next: ResourceUsageDateType) => {
      if (next === activeDateType) {
        return;
      }
      setActiveDateType(next);
      onDateTypeChange?.(next);
    },
    [activeDateType, onDateTypeChange],
  );

  const loadList = useCallback(
    async (mode: "initial" | "more", currentOffset = 0) => {
      if (!open) {
        return;
      }

      if (!applicationId) {
        setRows([]);
        setError("애플리케이션을 선택해주세요.");
        setLoading(false);
        setLoadingMore(false);
        setHasMore(false);
        setOffset(0);
        setTotalRows(0);
        return;
      }

      if (listControllerRef.current) {
        listControllerRef.current.abort();
      }
      const controller = new AbortController();
      listControllerRef.current = controller;

      if (mode === "initial") {
        setLoading(true);
        setError(null);
        setRows([]);
        setOffset(0);
        setHasMore(false);
        setTotalRows(0);
      } else {
        setLoadingMore(true);
      }

      const requestOffset = mode === "initial" ? 0 : currentOffset;

      try {
        const result = await getResourceUsagePopupData(
          {
            applicationId,
            osType: osType === "all" ? null : osType,
            dateType: activeDateType,
            size: PAGE_SIZE,
            offset: requestOffset,
            tmzutc: tmzutc,
          },
          controller.signal,
        );

        if (controller.signal.aborted) {
          return;
        }

        const pageItems = result.popupData ?? [];
        setRows((prev) => {
          const merged = mode === "initial" ? pageItems : [...prev, ...pageItems];
          setTotalRows(result.totalRows ?? merged.length);
          return merged;
        });

        const nextOffset =
          typeof result.nextOffset === "number"
            ? result.nextOffset
            : requestOffset + pageItems.length;
        setOffset(nextOffset);

        const moreFlag =
          typeof result.hasMore === "boolean" ? result.hasMore : pageItems.length === PAGE_SIZE;
        setHasMore(moreFlag);
        setError(null);
      } catch (fetchError) {
        if (!controller.signal.aborted) {
          if (mode === "initial") {
            setRows([]);
            setOffset(0);
            setHasMore(false);
            setTotalRows(0);
          }
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : "Resource Usage 목록을 불러오지 못했습니다.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [open, applicationId, osType, activeDateType, tmzutc],
  );

  const handleListScroll = useCallback(() => {
    if (!open || loading || loadingMore || !hasMore) {
      return;
    }
    const wrapper = listWrapperRef.current;
    if (!wrapper) {
      return;
    }
    const threshold = 24;
    if (wrapper.scrollTop + wrapper.clientHeight >= wrapper.scrollHeight - threshold) {
      loadList("more", offset);
    }
  }, [open, loading, loadingMore, hasMore, loadList, offset]);

  useEffect(() => {
    if (listControllerRef.current) {
      listControllerRef.current.abort();
      listControllerRef.current = null;
    }
    if (seriesControllerRef.current) {
      seriesControllerRef.current.abort();
      seriesControllerRef.current = null;
    }

    if (!open) {
      setRows([]);
      setError(null);
      setLoading(false);
      setLoadingMore(false);
      setHasMore(false);
      setOffset(0);
      setTotalRows(0);
      setSeriesCache({});
      setSeriesError(null);
      setSeriesLoading(false);
      setSelectedKey(null);
      return;
    }

    setSeriesCache({});
    setSeriesError(null);
    setSeriesLoading(false);
    setSelectedKey(null);
    loadList("initial");
  }, [open, applicationId, osType, activeDateType, tmzutc, loadList]);

  useEffect(() => {
    return () => {
      if (listControllerRef.current) {
        listControllerRef.current.abort();
      }
      if (seriesControllerRef.current) {
        seriesControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKey);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      return;
    }
    if (!rows.length) {
      setSelectedKey(null);
      return;
    }
    if (!selectedKey || !rows.some((row) => rowKey(row) === selectedKey)) {
      setSelectedKey(rowKey(rows[0]));
    }
  }, [open, rows, selectedKey]);

  useEffect(() => {
    if (!open || loading || loadingMore || !hasMore) {
      return;
    }
    const wrapper = listWrapperRef.current;
    if (!wrapper) {
      return;
    }
    if (wrapper.scrollHeight <= wrapper.clientHeight + 4) {
      loadList("more", offset);
    }
  }, [open, loading, loadingMore, hasMore, rows, offset, loadList]);

  const selectedRow = useMemo(() => {
    if (!selectedKey) {
      return null;
    }
    return rows.find((row) => rowKey(row) === selectedKey) ?? null;
  }, [rows, selectedKey]);

  const selectedSeries = useMemo(() => {
    if (!selectedKey) {
      return null;
    }
    return seriesCache[selectedKey] ?? null;
  }, [selectedKey, seriesCache]);

  useEffect(() => {
    if (!open || !selectedRow || !applicationId) {
      return;
    }

    if (!selectedRow.deviceModel) {
      return;
    }

    const key = rowKey(selectedRow);
    if (seriesCache[key]) {
      setSeriesLoading(false);
      setSeriesError(null);
      return;
    }

    if (seriesControllerRef.current) {
      seriesControllerRef.current.abort();
    }
    const controller = new AbortController();
    seriesControllerRef.current = controller;

    setSeriesLoading(true);
    setSeriesError(null);

    getResourceUsageData(
      {
        applicationId,
        osType: selectedRow.osType || null,
        deviceModel: selectedRow.deviceModel,
        dateType: activeDateType,
        tmzutc: tmzutc,
      },
      controller.signal,
    )
      .then((result) => {
        if (controller.signal.aborted) {
          return;
        }
        const seriesItem =
          result && result.length > 0
            ? result[0]
            : {
                deviceModel: selectedRow.deviceModel,
                osType: selectedRow.osType ?? "",
                cpu: [],
                memory: [],
              };
        setSeriesCache((prev) => ({
          ...prev,
          [key]: seriesItem,
        }));
        setSeriesError(null);
      })
      .catch((fetchError) => {
        if (!controller.signal.aborted) {
          setSeriesError(
            fetchError instanceof Error
              ? fetchError.message
              : "Resource Usage 차트 데이터를 불러오지 못했습니다.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setSeriesLoading(false);
        }
      });
  }, [open, selectedRow, applicationId, activeDateType, tmzutc, seriesCache]);

  const chartData = useMemo(
    () => buildChartData(selectedSeries, activeDateType),
    [selectedSeries, activeDateType],
  );

  const chartStatus = useMemo(() => {
    if (seriesLoading) {
      return "차트 데이터를 불러오는 중입니다...";
    }
    if (seriesError) {
      return seriesError;
    }
    if (!selectedRow) {
      return "모델을 선택해주세요.";
    }
    if (chartData.length === 0) {
      return "선택한 모델의 차트 데이터가 없습니다.";
    }
    return null;
  }, [chartData.length, selectedRow, seriesError, seriesLoading]);

  const isWaiting = loading || seriesLoading;

  const content = useMemo(() => {
    if (loading && rows.length === 0) {
      return <div className="ru-modal__status">전체 데이터를 불러오는 중입니다…</div>;
    }
    if (error && rows.length === 0) {
      return <div className="ru-modal__status ru-modal__status--error">{error}</div>;
    }
    return (
      <div className="ru-modal__content">
        <div className="ru-modal__list">
          <div className="ru-modal__list-header">
            <div className="ru-modal__list-title" />
            <div className="ru-modal__list-actions">
              {error ? <span className="ru-modal__list-error">{error}</span> : null}
            </div>
          </div>
          <div
            className="ru-modal__table-wrapper"
            ref={listWrapperRef}
            onScroll={handleListScroll}
          >
            <table className="ru-modal__table">
              <thead>
                <tr>
                  <th>Device Model</th>
                  <th>OS</th>
                  <th>Users</th>
                  <th>Usage</th>
                  <th>CPU</th>
                  <th>Memory</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const key = rowKey(row);
                  const isSelected = key === selectedKey;
                  const rankClass =
                    index < RANK_CLASSES.length ? ` ${RANK_CLASSES[index]}` : "";
                  return (
                    <tr
                      key={key}
                      className={`ru-modal__table-row${rankClass}${
                        isSelected ? " selected_row" : ""
                      }`}
                      onClick={() => setSelectedKey(key)}
                    >
                      <td>{row.deviceModel}</td>
                      <td>{row.osType || "-"}</td>
                      <td>{formatNumber(row.count)}</td>
                      <td>{formatNumber(row.usageCount)}</td>
                      <td>{formatCpu(row.cpuUsage)}</td>
                      <td>{formatMemoryKb(row.memUsage)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <div className="ru-modal__chart-panel">
          <div className="ru-modal__chart-header">
            <div>
              <p className="ru-modal__chart-title">CPU / Memory 사용 추이</p>
              <p className="ru-modal__chart-subtitle">
                {selectedRow ? selectedRow.deviceModel : "모델을 선택해주세요."}
              </p>
            </div>
          </div>
          <div className="ru-modal__chart">
            {chartStatus ? (
              <div className="ru-modal__chart-status">{chartStatus}</div>
            ) : (
              <ResponsiveContainer width="100%" height={CHART_HEIGHT_PX}>
                <LineChart data={chartData} margin={{ top: 12, right: 22, bottom: 0, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: "#475569" }}
                    tickFormatter={(value) => value}
                    axisLine={{ stroke: "#94a3b8" }}
                    tickLine={{ stroke: "#94a3b8" }}
                  />
                  <YAxis
                    yAxisId="cpu"
                    tick={{ fontSize: 10, fill: "#475569" }}
                    tickFormatter={(value) => {
                      const numeric = Number(value);
                      if (!Number.isFinite(numeric)) {
                        return "-";
                      }
                      return `${numeric.toFixed(0)}%`;
                    }}
                    axisLine={{ stroke: "#94a3b8" }}
                    tickLine={{ stroke: "#94a3b8" }}
                  />
                  <YAxis
                    yAxisId="memory"
                    orientation="right"
                    tick={{ fontSize: 10, fill: "#475569" }}
                    tickFormatter={(value) => {
                      const numeric = Number(value);
                      if (!Number.isFinite(numeric)) {
                        return "-";
                      }
                      return `${numeric.toFixed(0)} MB`;
                    }}
                    axisLine={{ stroke: "#94a3b8" }}
                    tickLine={{ stroke: "#94a3b8" }}
                  />
                  <Tooltip content={<ResourceUsageModalTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="cpu"
                    name="CPU"
                    stroke={CPU_COLOR}
                    strokeWidth={2}
                    dot={{ r: 2, strokeWidth: 0, fill: CPU_COLOR }}
                    activeDot={{ r: 4 }}
                    yAxisId="cpu"
                  />
                  <Line
                    type="monotone"
                    dataKey="memory"
                    name="MEM"
                    stroke={MEM_COLOR}
                    strokeWidth={2}
                    dot={{ r: 2, strokeWidth: 0, fill: MEM_COLOR }}
                    activeDot={{ r: 4 }}
                    yAxisId="memory"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="ru-modal__chart-legend" aria-hidden={chartStatus ? "true" : "false"}>
            <div className="ru-modal__chart-legend-item">
              <span className="ru-modal__chart-legend-dot" style={{ backgroundColor: CPU_COLOR }} />
              <span>CPU</span>
            </div>
            <div className="ru-modal__chart-legend-item">
              <span className="ru-modal__chart-legend-dot" style={{ backgroundColor: MEM_COLOR }} />
              <span>Memory</span>
            </div>
          </div>
        </div>
      </div>
    );
  }, [
    chartData,
    chartStatus,
    error,
    hasMore,
    loading,
    loadingMore,
    handleListScroll,
    rows,
    selectedKey,
    selectedRow,
    totalRows,
  ]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="ru-modal__backdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        id="resource__popup"
        className="ru-modal maxy_popup_common"
        role="dialog"
        aria-modal="true"
        aria-label="Resource Usage All"
      >
        <div className="maxy_popup_grid_s_wrap">
          <div className="maxy_popup_title_wrap">
            <div className="maxy_popup_title_left">
              <img className="maxy_popup_analysis_icon" alt="" />
              <span>Resource Usage</span>
            </div>
            <div className="maxy_popup_title_right">
              <div className="maxy_component_btn_wrap" role="group" aria-label="기간">
                {DATE_TYPE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`maxy_component_btn${activeDateType === option.value ? " on" : ""}`}
                    data-date={option.value}
                    onClick={() => handleDateTypeChange(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {content}
          {isWaiting ? (
            <div className="ru-modal__waiting" aria-hidden="true">
              <div className="lds-ellipsis">
                <div></div>
                <div></div>
                <div></div>
                <div></div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
