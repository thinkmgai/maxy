"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

import { useUserSettings } from "../../../../components/usersettings/UserSettingsProvider";
import { AppList, type ApplicationSummary } from "../../../api/AppList";
import {
  getResourceUsageData,
  type ResourceUsageDateType,
} from "../../../api/Widget/ResourceUsage";
import ResourceUsageAllModal from "./ResourceUsageAllModal";
import { useTheme } from "../../../../components/theme/ThemeProvider";

import "./style.css";

const REFRESH_INTERVAL_MS = 30_000;
const MAX_SERIES = 6;

type MetricKey = "cpu" | "memory";

const METRIC_OPTIONS: Array<{
  key: MetricKey;
  label: string;
  unitLabel: string;
  icon: string;
}> = [
  { key: "cpu", label: "CPU", unitLabel: "%", icon: "/images/maxy/icon-cpu.svg" },
  { key: "memory", label: "MEM", unitLabel: "MB", icon: "/images/maxy/icon-memory.svg" },
];

type ChartDatum = {
  timestamp: number;
  label: string;
  [key: string]: number | string;
};

type LineConfig = {
  key: string;
  label: string;
  color: string;
};

type DeviceSeries = {
  deviceModel: string;
  osType: string;
  cpu: Array<[number, number]>;
  memory: Array<[number, number]>;
};

const SERIES_COLORS = ["#2563eb", "#f97316", "#10b981", "#6366f1", "#ec4899", "#0ea5e9"];

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

function normaliseOsTypeForApi(value: string | null | undefined): "all" | "Android" | "iOS" {
  if (!value || value === "A") {
    return "all";
  }
  const lower = value.toLowerCase();
  if (lower === "all") {
    return "all";
  }
  if (lower.startsWith("android")) {
    return "Android";
  }
  if (lower.startsWith("ios")) {
    return "iOS";
  }
  return value as "Android" | "iOS";
}

function parseNumeric(value: string | number | null | undefined): number {
  if (value == null) {
    return 0;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function formatCpu(value: number): string {
  if (!Number.isFinite(value)) {
    return "-";
  }
  return `${(Math.round(value * 10) / 10).toFixed(1).replace(/\.0$/, "")}%`;
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

function sanitiseSeriesKey(deviceModel: string, index: number): string {
  return `${deviceModel.replace(/[^a-zA-Z0-9]/g, "_")}_${index}`;
}

function buildLineDataset(
  seriesList: DeviceSeries[],
  metric: MetricKey,
  dateType: ResourceUsageDateType,
): { data: ChartDatum[]; configs: LineConfig[] } {
  const timestampMap = new Map<number, ChartDatum>();
  const configs: LineConfig[] = [];

  seriesList.forEach((series, index) => {
    const points = metric === "cpu" ? series.cpu : series.memory;
    if (!points || points.length === 0) {
      return;
    }

    const key = `${metric}_${sanitiseSeriesKey(series.deviceModel, index)}`;
    configs.push({
      key,
      label: series.deviceModel,
      color: SERIES_COLORS[index % SERIES_COLORS.length],
    });

    points.forEach(([timestampRaw, valueRaw]) => {
      const timestamp = Number(timestampRaw);
      if (!Number.isFinite(timestamp)) {
        return;
      }
      const numericValue = Number(valueRaw);
      if (!Number.isFinite(numericValue)) {
        return;
      }

      const stored =
        timestampMap.get(timestamp) ??
        {
          timestamp,
          label: formatAxisLabel(timestamp, dateType),
        };

      stored[key] = metric === "memory" ? numericValue / 1024 : numericValue;
      timestampMap.set(timestamp, stored);
    });
  });

  const data = Array.from(timestampMap.values()).sort((a, b) => a.timestamp - b.timestamp);
  return { data, configs };
}

function formatTooltipValue(metric: MetricKey, value: number): string {
  if (!Number.isFinite(value)) {
    return "-";
  }
  if (metric === "cpu") {
    return formatCpu(value);
  }
  return `${(Math.round(value * 10) / 10).toFixed(1).replace(/\.0$/, "")} MB`;
}

function ResourceUsageTooltip({
  active,
  payload,
  metric,
}: {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    dataKey: string;
    color?: string;
    payload: ChartDatum;
  }>;
  metric: MetricKey;
}) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const base = payload[0].payload;
  const timestamp = Number(base.timestamp);
  return (
    <div className="resource-usage-widget__tooltip">
      <div className="resource-usage-widget__tooltip-title">
        {Number.isFinite(timestamp) ? formatDateTime(timestamp) : "-"}
      </div>
      <div className="resource-usage-widget__tooltip-body">
        {payload.map((entry) => (
          <div className="resource-usage-widget__tooltip-row" key={entry.dataKey}>
            <span className="resource-usage-widget__tooltip-indicator" style={{ backgroundColor: entry.color }} />
            <span className="resource-usage-widget__tooltip-label">{entry.name}</span>
            <span className="resource-usage-widget__tooltip-value">
              {formatTooltipValue(metric, Number(entry.value))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const DATE_TYPE_LABELS: Record<ResourceUsageDateType, string> = {
  DAY: "일간",
  WEEK: "주간",
  MONTH: "월간",
};

export default function ResourceUsageWidget() {
  const {
    applicationId: storedApplicationId,
    userNo: storedUserNo,
    osType: storedOsType,
    tmzutc,
  } = useUserSettings();
  const { theme } = useTheme();
  const isDarkMode = theme === "dark";
  const axisTickColor = isDarkMode ? "#dbeafe" : "#1f2937";
  const gridStrokeColor = isDarkMode ? "rgba(148, 163, 184, 0.2)" : "#e2e8f0";

  const preferredApplicationId = useMemo(
    () => parseNumeric(storedApplicationId),
    [storedApplicationId],
  );
  const userNo = useMemo(() => parseNumeric(storedUserNo), [storedUserNo]);

  const [applications, setApplications] = useState<ApplicationSummary[] | null>(null);
  const [resolvedApplicationId, setResolvedApplicationId] = useState<number>(
    preferredApplicationId > 0 ? preferredApplicationId : 0,
  );
  const [isResolvingApp, setIsResolvingApp] = useState(false);
  const [appResolveError, setAppResolveError] = useState<string | null>(null);

  const [dateType] = useState<ResourceUsageDateType>("DAY");
  const [activeMetric, setActiveMetric] = useState<MetricKey>("cpu");

  const [seriesByDevice, setSeriesByDevice] = useState<DeviceSeries[]>([]);
  const [seriesLoading, setSeriesLoading] = useState(false);
  const [seriesError, setSeriesError] = useState<string | null>(null);
  const [isAllModalOpen, setAllModalOpen] = useState(false);

  const appCacheRef = useRef<{ userNo: number; list: ApplicationSummary[] } | null>(null);
  const seriesControllerRef = useRef<AbortController | null>(null);
  const refreshTimerRef = useRef<number | null>(null);

  const activeApplication = useMemo(() => {
    if (!applications || resolvedApplicationId <= 0) {
      return null;
    }
    return (
      applications.find(
        (app) => Number(app.applicationId) === Number(resolvedApplicationId),
      ) ?? null
    );
  }, [applications, resolvedApplicationId]);

  const applicationIdentifier = useMemo(() => {
    const candidate = activeApplication?.applicationId ?? resolvedApplicationId;
    return Number(candidate) > 0 ? String(candidate) : "";
  }, [activeApplication, resolvedApplicationId]);

  const apiOsType = useMemo(() => normaliseOsTypeForApi(storedOsType), [storedOsType]);

  const chartDataset = useMemo(
    () => buildLineDataset(seriesByDevice, activeMetric, dateType),
    [seriesByDevice, activeMetric, dateType],
  );

  const seriesLegend = chartDataset.configs;

  useEffect(() => {
    if (userNo <= 0) {
      setApplications(null);
      setResolvedApplicationId(preferredApplicationId > 0 ? preferredApplicationId : 0);
      setAppResolveError("사용자 정보가 필요합니다.");
      return;
    }

    let cancelled = false;
    async function resolveApplications() {
      setIsResolvingApp(true);
      setAppResolveError(null);
      try {
        let list: ApplicationSummary[] | null = null;
        if (appCacheRef.current && appCacheRef.current.userNo === userNo) {
          list = appCacheRef.current.list;
        }
        if (!list) {
          const response = await AppList({ userNo, osType: "all" });
          if (cancelled) return;
          list = response.applicationList ?? [];
          appCacheRef.current = { userNo, list };
        }
        if (cancelled) return;
        setApplications(list);

        if (preferredApplicationId > 0) {
          setResolvedApplicationId(preferredApplicationId);
          setAppResolveError(null);
          return;
        }

        const fallback = list.find((item) => Number(item.applicationId) > 0) ?? null;
        if (fallback) {
          setResolvedApplicationId(Number(fallback.applicationId));
          setAppResolveError(null);
        } else {
          setResolvedApplicationId(0);
          setAppResolveError("사용 가능한 애플리케이션이 없습니다.");
        }
      } catch (err) {
        if (!cancelled) {
          setApplications(null);
          setResolvedApplicationId(preferredApplicationId > 0 ? preferredApplicationId : 0);
          setAppResolveError(
            err instanceof Error ? err.message : "애플리케이션 목록을 불러오지 못했습니다.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsResolvingApp(false);
        }
      }
    }

    resolveApplications();
    return () => {
      cancelled = true;
    };
  }, [userNo, preferredApplicationId]);

  useEffect(() => {
    if (preferredApplicationId > 0) {
      setResolvedApplicationId(preferredApplicationId);
      setAppResolveError(null);
    }
  }, [preferredApplicationId]);

  useEffect(() => {
    setAllModalOpen(false);
  }, [applicationIdentifier, apiOsType]);

  const fetchSeries = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (resolvedApplicationId <= 0 || !applicationIdentifier) {
        setSeriesByDevice([]);
        setSeriesError("애플리케이션을 선택해주세요.");
        return;
      }

      if (mode === "initial") {
        setSeriesLoading(true);
      }

      if (seriesControllerRef.current) {
        seriesControllerRef.current.abort();
      }
      const controller = new AbortController();
      seriesControllerRef.current = controller;

      try {
        const seriesList = await getResourceUsageData(
          {
            applicationId: applicationIdentifier,
            osType: apiOsType === "all" ? null : apiOsType,
            dateType,
            tmzutc: tmzutc,
          },
          controller.signal,
        );

        if (controller.signal.aborted) {
          return;
        }

        const normalized = (seriesList ?? []).map((series) => ({
          deviceModel: series.deviceModel,
          osType: series.osType ?? "",
          cpu: (series.cpu ?? []).sort((a, b) => a[0] - b[0]),
          memory: (series.memory ?? []).sort((a, b) => a[0] - b[0]),
        }));
        setSeriesByDevice(normalized.slice(0, MAX_SERIES));
        setSeriesError(null);
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }
        setSeriesByDevice([]);
        setSeriesError(
          err instanceof Error ? err.message : "Resource Usage 데이터를 불러오지 못했습니다.",
        );
      } finally {
        if (seriesControllerRef.current === controller) {
          seriesControllerRef.current = null;
        }
        if (mode === "initial") {
          setSeriesLoading(false);
        }
      }
    },
    [resolvedApplicationId, applicationIdentifier, apiOsType, dateType, tmzutc],
  );

  useEffect(() => {
    fetchSeries("initial");
    return () => {
      if (seriesControllerRef.current) {
        seriesControllerRef.current.abort();
      }
      if (refreshTimerRef.current != null) {
        window.clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [fetchSeries]);

  useEffect(() => {
    if (refreshTimerRef.current != null) {
      window.clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    if (resolvedApplicationId <= 0) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      void fetchSeries("refresh");
    }, REFRESH_INTERVAL_MS);
    refreshTimerRef.current = timer;
    return () => {
      window.clearInterval(timer);
      refreshTimerRef.current = null;
    };
  }, [fetchSeries, resolvedApplicationId]);

  const renderStatus = useMemo(() => {
    if (isResolvingApp && chartDataset.data.length === 0) {
      return "데이터를 불러오고 있습니다.";
    }
    if (seriesLoading && chartDataset.data.length === 0) {
      return "데이터를 불러오고 있습니다.";
    }
    if (appResolveError) {
      return appResolveError;
    }
    if (chartDataset.data.length === 0) {
      return seriesError ?? null;
    }
    return null;
  }, [
    isResolvingApp,
    seriesLoading,
    chartDataset.data.length,
    seriesError,
    appResolveError,
  ]);

  return (
    <>
    <div className={`resource-usage-widget${isDarkMode ? " resource-usage-widget--dark" : ""}`}>
      <header className="resource-usage-widget__header">
        <div className="resource-usage-widget__title">
          <h4>Resource Usage</h4>
          <img
            src="/images/maxy/ic-question-grey-blue.svg"
            alt="도움말"
            className="resource-usage-widget__help"
          />
        </div>
        <div className="resource-usage-widget__actions">
          <button
            type="button"
            className="resource-usage-widget__all-btn"
            disabled={seriesLoading || resolvedApplicationId <= 0}
            onClick={() => {
              if (resolvedApplicationId > 0) {
                setAllModalOpen(true);
              }
            }}
          >
            ALL
          </button>
        </div>
      </header>

      <div className="resource-usage-widget__body">
        <div className="resource-usage-widget__metric-group">
          <button
            type="button"
            className={`resource-usage-widget__metric-btn${
              activeMetric === "cpu" ? " resource-usage-widget__metric-btn--active" : ""
            }`}
            onClick={() => setActiveMetric("cpu")}
          >
            <span className="resource-usage-widget__metric-icon">
              <img
                src={
                  activeMetric === "cpu"
                    ? "/images/maxy/icon-cpu-blue.svg"
                    : isDarkMode
                      ? "/images/maxy/icon-cpu-w.svg"
                      : "/images/maxy/icon-cpu.svg"
                }
                alt="CPU"
              />
            </span>
            <span>CPU</span>
          </button>
          <button
            type="button"
            className={`resource-usage-widget__metric-btn${
              activeMetric === "memory" ? " resource-usage-widget__metric-btn--active" : ""
            }`}
            onClick={() => setActiveMetric("memory")}
          >
            <span className="resource-usage-widget__metric-icon">
              <img
                src={
                  activeMetric === "memory"
                    ? "/images/maxy/icon-memory-blue.svg"
                    : isDarkMode
                      ? "/images/maxy/icon-memory-w.svg"
                      : "/images/maxy/icon-memory.svg"
                }
                alt="MEM"
              />
            </span>
            <span>MEM</span>
          </button>
        </div>

        {renderStatus ? (
          <div className="resource-usage-widget__status">{renderStatus}</div>
        ) : (
          <>
            <div className="resource-usage-widget__chart-panel">
              <div className="resource-usage-widget__chart">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartDataset.data} margin={{ top: 12, right: 16, bottom: -10, left: -15 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStrokeColor} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: axisTickColor }}
                      tickFormatter={(value) => value}
                      axisLine={{ stroke: axisTickColor }}
                      tickLine={{ stroke: axisTickColor }}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: axisTickColor }}
                      tickFormatter={(value) =>
                        activeMetric === "cpu" ? `${value.toFixed(0)}%` : `${value.toFixed(0)} MB`
                      }
                      axisLine={{ stroke: axisTickColor }}
                      tickLine={{ stroke: axisTickColor }}
                    />
                    <Tooltip content={<ResourceUsageTooltip metric={activeMetric} />} />
                    {chartDataset.configs.map((config) => (
                      <Line
                        key={config.key}
                        type="monotone"
                        dataKey={config.key}
                        name={config.label}
                        stroke={config.color}
                        strokeWidth={2}
                        dot={{ r: 2, strokeWidth: 0, fill: config.color }}
                        activeDot={{ r: 4 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="resource-usage-widget__legend">
              {seriesLegend.map((item) => (
                <div key={item.key} className="resource-usage-widget__legend-item">
                  <span
                    className="resource-usage-widget__legend-dot"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="resource-usage-widget__legend-label">{item.label}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      </div>
  <ResourceUsageAllModal
    open={isAllModalOpen}
    applicationId={applicationIdentifier}
    osType={apiOsType}
    dateType={dateType}
    tmzutc={tmzutc}
    onClose={() => setAllModalOpen(false)}
  />
    </>
  );
}
