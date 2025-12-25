"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TooltipContentProps as RechartsTooltipContentProps } from "recharts/types/component/Tooltip";

import { useUserSettings } from "../../../../components/usersettings/UserSettingsProvider";
import { useTheme } from "../../../../components/theme/ThemeProvider";
import {
  getAccessibilitySeries,
  type AccessibilityDateType,
  type AccessibilitySeries,
} from "../../../api/Widget/Accessibility";

import "./style.css";

const REFRESH_INTERVAL_MS = 60_000;

const DATE_TYPE_OPTIONS: { value: AccessibilityDateType; label: string }[] = [
  { value: "DAY", label: "Day" },
  { value: "WEEK", label: "1W" },
  { value: "MONTH", label: "1M" },
];

type ChartDatum = {
  timestamp: number;
  label: string;
  login: number;
  noLogin: number;
  dau: number;
};

type SeriesConfigEntry = {
  key: keyof Pick<ChartDatum, "login" | "noLogin" | "dau">;
  label: string;
  color: string;
  fill?: string;
  type: "bar" | "line";
};

const numberFormatter = new Intl.NumberFormat("ko-KR");
const lastUpdatedFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

function formatNumber(value: number | null | undefined): string {
  if (!Number.isFinite(value ?? NaN)) {
    return "-";
  }
  return numberFormatter.format(Math.round(value as number));
}

function resolveOsLabel(osType: string | null | undefined): string {
  if (!osType || osType === "A" || osType.toLowerCase() === "all") {
    return "전체 OS";
  }
  if (osType.toLowerCase().startsWith("android")) {
    return "Android";
  }
  if (osType.toLowerCase().startsWith("ios")) {
    return "iOS";
  }
  return osType;
}

function buildChartData(
  series: AccessibilitySeries | null,
  axisFormatter: Intl.DateTimeFormat,
): ChartDatum[] {
  if (!series) {
    return [];
  }

  const map = new Map<number, ChartDatum>();

  const ensure = (timestamp: number): ChartDatum => {
    const existing = map.get(timestamp);
    if (existing) {
      return existing;
    }
    const label = axisFormatter.format(new Date(timestamp));
    const created: ChartDatum = {
      timestamp,
      label,
      login: 0,
      noLogin: 0,
      dau: 0,
    };
    map.set(timestamp, created);
    return created;
  };

  const assign = (points: AccessibilitySeries["login"], key: "login" | "noLogin" | "dau") => {
    if (!Array.isArray(points)) {
      return;
    }
    for (const point of points) {
      if (!point || typeof point.key !== "number") {
        continue;
      }
      const target = ensure(point.key);
      target[key] = Number(point.value) || 0;
    }
  };

  assign(series.login, "login");
  assign(series.noLogin, "noLogin");
  assign(series.dau, "dau");

  return Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
}

type AccessibilityTooltipProps = RechartsTooltipContentProps<number, string> & {
  config: Record<string, SeriesConfigEntry>;
  fullFormatter: Intl.DateTimeFormat;
};

function AccessibilityTooltip({
  active,
  payload,
  label,
  config,
  fullFormatter,
}: AccessibilityTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }
  const timestamp = payload[0]?.payload?.timestamp;
  const formattedLabel =
    typeof timestamp === "number" ? fullFormatter.format(new Date(timestamp)) : String(label ?? "");

  return (
    <div className="accessibility-widget__tooltip">
      <div className="accessibility-widget__tooltip-title">{formattedLabel}</div>
      <div className="accessibility-widget__tooltip-body">
        {payload.map((entry) => {
          const key = entry.dataKey;
          if (!key) {
            return null;
          }
          const meta = config[String(key)];
          if (!meta) {
            return null;
          }
          return (
            <div className="accessibility-widget__tooltip-row" key={meta.key}>
              <span
                className="accessibility-widget__tooltip-indicator"
                style={{ backgroundColor: entry.color ?? meta.color }}
              />
              <span className="accessibility-widget__tooltip-label">{meta.label}</span>
              <span className="accessibility-widget__tooltip-value">{formatNumber(entry.value)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AccessibilityWidget() {
  const { applicationId, osType, tmzutc } = useUserSettings();
  const { theme } = useTheme();
  const isDarkMode = theme === "dark";

  const [dateType, setDateType] = useState<AccessibilityDateType>("DAY");
  const [series, setSeries] = useState<AccessibilitySeries | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const controllerRef = useRef<AbortController | null>(null);
  const refreshTimerRef = useRef<number | null>(null);

  const resolvedApplicationId = useMemo(() => {
    if (applicationId == null) {
      return "";
    }
    const text = String(applicationId).trim();
    return text;
  }, [applicationId]);

  const resolvedTmzutc = useMemo(() => {
    if (typeof tmzutc === "number" && Number.isFinite(tmzutc)) {
      return tmzutc;
    }
    return 0;
  }, [tmzutc]);

  const axisFormatter = useMemo(() => {
    if (dateType === "DAY") {
      return new Intl.DateTimeFormat("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    }
    return new Intl.DateTimeFormat("ko-KR", {
      month: "2-digit",
      day: "2-digit",
    });
  }, [dateType]);

  const tooltipFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }),
    [],
  );

  const chartData = useMemo(
    () => buildChartData(series, axisFormatter),
    [series, axisFormatter],
  );

  const axisTickColor = isDarkMode ? "#dbeafe" : "#1f2937";
  const gridColor = isDarkMode ? "rgba(148, 163, 184, 0.2)" : "#e2e8f0";

  const seriesConfig = useMemo<Record<string, SeriesConfigEntry>>(
    () => ({
      login: {
        key: "login",
        label: "Login",
        color: "#0891b2",
        fill: "rgba(8, 145, 178, 0.55)",
        type: "bar",
      },
      noLogin: {
        key: "noLogin",
        label: "No Login",
        color: isDarkMode ? "rgba(180, 198, 255, 0.9)" : "#cbd5f5",
        fill: isDarkMode ? "rgba(180, 198, 255, 0.55)" : "rgba(203, 213, 245, 0.8)",
        type: "bar",
      },
      dau: {
        key: "dau",
        label: "DAU",
        color: isDarkMode ? "#7dd3fc" : "#1d4ed8",
        type: "line",
      },
    }),
    [isDarkMode],
  );

  const loadSeries = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (!resolvedApplicationId) {
        setSeries(null);
        setError("애플리케이션을 선택해주세요.");
        setLoading(false);
        return;
      }

      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;

      if (mode === "initial") {
        setLoading(true);
      }
      try {
        const result = await getAccessibilitySeries(
          {
            applicationId: resolvedApplicationId,
            osType: osType ?? null,
            dateType,
            tmzutc: resolvedTmzutc,
          },
          controller.signal,
        );
        if (controller.signal.aborted) {
          return;
        }
        setSeries(result);
        setError(null);
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }
        const message =
          err instanceof Error ? err.message : "Accessibility 데이터를 불러오지 못했습니다.";
        setError(message);
      } finally {
        if (!controller.signal.aborted && mode === "initial") {
          setLoading(false);
        }
      }
    },
    [resolvedApplicationId, osType, dateType, resolvedTmzutc],
  );

  useEffect(() => {
    void loadSeries("initial");
    return () => {
      controllerRef.current?.abort();
    };
  }, [loadSeries]);

  useEffect(() => {
    if (!resolvedApplicationId) {
      return;
    }
    const timer = window.setInterval(() => {
      void loadSeries("refresh");
    }, REFRESH_INTERVAL_MS);
    refreshTimerRef.current = timer;
    return () => {
      if (refreshTimerRef.current != null) {
        window.clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [resolvedApplicationId, loadSeries]);

  const lastUpdatedLabel =
    series?.lastUpdated && Number.isFinite(series.lastUpdated)
      ? lastUpdatedFormatter.format(new Date(series.lastUpdated))
      : "-";

  const statusMessage = useMemo(() => {
    if ((loading || !series) && chartData.length === 0) {
      return "데이터를 불러오고 있습니다.";
    }
    if (chartData.length === 0) {
      return error ?? null;
    }
    return null;
  }, [loading, series, chartData.length, error]);

  const inlineError = chartData.length > 0 ? error : null;

  return (
    <div className={`accessibility-widget${isDarkMode ? " accessibility-widget--dark" : ""}`}>
      <header className="accessibility-widget__header">
        <div className="accessibility-widget__title">
          <h4>Accessibility</h4>
          <img
            src="/images/maxy/ic-question-grey-blue.svg"
            alt="도움말"
            className="accessibility-widget__help"
          />
        </div>
        <div className="accessibility-widget__actions">
          <div className="maxy_component_btn_wrap accessibility-widget__date-buttons">
            {DATE_TYPE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`maxy_component_btn${
                  dateType === option.value ? " on" : ""
                } accessibility-widget__date-button`}
                onClick={() => setDateType(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {inlineError ? (
        <div className="accessibility-widget__inline-error" role="status">
          {inlineError}
        </div>
      ) : null}

      <div className="accessibility-widget__chart">
        {statusMessage ? (
          <div className="accessibility-widget__status">{statusMessage}</div>
        ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={chartData}
                  margin={{ top: 0, right: 8, bottom: 0, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: axisTickColor }}
                axisLine={{ stroke: axisTickColor }}
                tickLine={{ stroke: axisTickColor }}
              />
              <YAxis
                yAxisId="dau"
                orientation="right"
                width={34}
                tickFormatter={(value) => formatNumber(typeof value === "number" ? value : Number(value))}
                tick={{ fontSize: 10, fill: axisTickColor}}
                axisLine={{ stroke: axisTickColor }}
                tickLine={{ stroke: axisTickColor }}
                allowDecimals={false}
                tickMargin={0}
                padding={{ top: 0, bottom: 0 }}
              />
              <RechartsTooltip<number, string>
                content={(props) => (
                  <AccessibilityTooltip
                    {...(props as RechartsTooltipContentProps<number, string>)}
                    config={seriesConfig}
                    fullFormatter={tooltipFormatter}
                  />
                )}
              />
              <Legend />
              <Bar
                yAxisId="dau"
                dataKey="login"
                name={seriesConfig.login.label}
                fill={seriesConfig.login.fill}
                stroke={seriesConfig.login.color}
                stackId="users"
                radius={[2, 2, 0, 0]}
              />
              <Bar
                yAxisId="dau"
                dataKey="noLogin"
                name={seriesConfig.noLogin.label}
                fill={seriesConfig.noLogin.fill}
                stroke={seriesConfig.noLogin.color}
                stackId="users"
                radius={[2, 2, 0, 0]}
              />
              <Line
                yAxisId="dau"
                type="monotone"
                dataKey="dau"
                name={seriesConfig.dau.label}
                stroke={seriesConfig.dau.color}
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

    </div>
  );
}
