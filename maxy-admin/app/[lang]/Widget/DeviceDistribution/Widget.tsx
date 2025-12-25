"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";

import { useUserSettings } from "../../../../components/usersettings/UserSettingsProvider";
import { useTheme } from "../../../../components/theme/ThemeProvider";
import {
  getDeviceDistributionData,
  type DeviceDistributionItem,
} from "../../../api/Widget/DeviceDistribution";
import {
  type FavoritesDateType,
  type FavoritesTroubleType,
} from "../../../api/Widget/Favorites";
import DeviceDistributionAllModal from "./DeviceDistributionAllModal";
import FavoritesTroublePopup from "../Favorites/FavoritesTroublePopup";

import "./style.css";

const REFRESH_INTERVAL_MS = 30_000;

type MetricKey = "error" | "crash";

type ChartDatum = {
  deviceModel: string;
  osType: string;
  deviceCount: number;
  viewCount: number;
  errorCount: number;
  crashCount: number;
  rate: number;
  count: number;
  bubbleSize: number;
};

type TroublePopupState = {
  deviceModel: string;
  dateType: FavoritesDateType;
  initialType: FavoritesTroubleType;
  hasError: boolean;
  hasCrash: boolean;
};

const OS_COLORS: Record<string, { fill: string; stroke: string }> = {
  android: { fill: "rgba(0, 163, 255, 0.35)", stroke: "rgba(0, 163, 255, 0.7)" },
  ios: { fill: "rgba(116, 105, 255, 0.35)", stroke: "rgba(116, 105, 255, 0.7)" },
  default: { fill: "rgba(79, 70, 229, 0.32)", stroke: "rgba(79, 70, 229, 0.65)" },
};

const MIN_BUBBLE_DIAMETER = 24;
const MAX_BUBBLE_DIAMETER = 60;
const BUBBLE_EDGE_PADDING = 4;
const MIN_BUBBLE_RADIUS = MIN_BUBBLE_DIAMETER / 2;
const MIN_BUBBLE_SIZE = Math.PI * MIN_BUBBLE_RADIUS * MIN_BUBBLE_RADIUS;

const numberFormatter = new Intl.NumberFormat("ko-KR");
const percentFormatter = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 1 });

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return "-";
  }
  return numberFormatter.format(Math.round(value));
}

function formatPercent(value: number): string {
  if (!Number.isFinite(value)) {
    return "-";
  }
  return `${percentFormatter.format(value)}%`;
}

function resolveOsLabel(osType: string | null | undefined): string {
  if (!osType || osType === "A" || osType.toLowerCase() === "all") {
    return "전체 OS";
  }
  return osType;
}

// Map API items into ScatterChart-friendly points (x: device count, y: error/crash %).
function buildChartData(items: DeviceDistributionItem[], metric: MetricKey): ChartDatum[] {
  const sorted = [...items].sort(
    (a, b) =>
      b.viewCount - a.viewCount ||
      b.errorCount - a.errorCount ||
      b.crashCount - a.crashCount,
  );

  const base = sorted.map((item) => {
    const rate = metric === "error" ? item.errorRate : item.crashRate;
    const count = metric === "error" ? item.errorCount : item.crashCount;
    return {
      deviceModel: item.deviceModel,
      osType: item.osType,
      deviceCount: item.deviceCount,
      viewCount: item.viewCount,
      errorCount: item.errorCount,
      crashCount: item.crashCount,
      rate: Number.isFinite(rate) ? rate : 0,
      count,
    };
  });

  const maxRate = Math.max(0, ...base.map((item) => item.rate));
  const bubbleScale = maxRate > 0 ? MAX_BUBBLE_DIAMETER / maxRate : 0;

  return base.map((item) => {
    const safeRate = Number.isFinite(item.rate) ? Math.max(item.rate, 0) : 0;
    const diameter =
      maxRate > 0
        ? Math.min(
            MAX_BUBBLE_DIAMETER,
            Math.max(MIN_BUBBLE_DIAMETER, safeRate * bubbleScale),
          )
        : MIN_BUBBLE_DIAMETER;
    const radius = diameter / 2;
    return {
      ...item,
      bubbleSize: Math.PI * radius * radius,
    };
  });
}

function DeviceDistributionTooltip({
  active,
  payload,
  metric,
}: {
  active?: boolean;
  payload?: Array<{
    name?: string;
    payload?: ChartDatum;
  }>;
  metric: MetricKey;
}) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }
  const data = payload[0]?.payload;
  if (!data) {
    return null;
  }

  return (
    <div className="device-distribution-tooltip">
      <div className="device-distribution-tooltip__title">
        {data.deviceModel} <span>({resolveOsLabel(data.osType)})</span>
      </div>
      <div className="device-distribution-tooltip__row">
        <span>디바이스 수</span>
        <strong>{formatNumber(data.deviceCount)}</strong>
      </div>
      <div className="device-distribution-tooltip__row">
        <span>뷰 카운트</span>
        <strong>{formatNumber(data.viewCount)}</strong>
      </div>
      <div className="device-distribution-tooltip__row">
        <span>{metric === "error" ? "에러 수" : "크래시 수"}</span>
        <strong>{formatNumber(data.count)}</strong>
      </div>
      <div className="device-distribution-tooltip__row">
        <span>{metric === "error" ? "에러 비율" : "크래시 비율"}</span>
        <strong>{formatPercent(data.rate)}</strong>
      </div>
    </div>
  );
}

export default function DeviceDistributionWidget() {
  const { applicationId, osType, tmzutc } = useUserSettings();
  const { theme } = useTheme();
  const [items, setItems] = useState<DeviceDistributionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeMetric, setActiveMetric] = useState<MetricKey>("error");
  const [allModalOpen, setAllModalOpen] = useState(false);
  const [troublePopup, setTroublePopup] = useState<TroublePopupState | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const refreshTimerRef = useRef<number | null>(null);

  const resolvedApplicationId = useMemo(() => {
    const parsed = Number(applicationId);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [applicationId]);

  const resolvedTmzutc = useMemo(() => {
    if (typeof tmzutc === "number" && Number.isFinite(tmzutc)) {
      return tmzutc;
    }
    return 540;
  }, [tmzutc]);

  const chartData = useMemo(
    () => buildChartData(items, activeMetric),
    [items, activeMetric],
  );

  const maxDevice = useMemo(
    () => Math.max(1, ...chartData.map((item) => item.deviceCount)),
    [chartData],
  );
  const maxRate = useMemo(
    () => Math.max(1, ...chartData.map((item) => item.rate)),
    [chartData],
  );

  const statusMessage = useMemo(() => {
    if (loading && chartData.length === 0) {
      return "데이터를 불러오고 있습니다.";
    }
    if (error) {
      return error;
    }
    return null;
  }, [loading, error, chartData.length]);

  const fetchData = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (!resolvedApplicationId) {
        setError("애플리케이션을 선택해주세요.");
        setItems([]);
        return;
      }

      // Abort any in-flight request to keep only the freshest fetch active.
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;

      if (mode === "initial") {
        setLoading(true);
      }

      try {
        const result = await getDeviceDistributionData(
          {
            applicationId: resolvedApplicationId,
            osType,
            tmzutc: resolvedTmzutc,
            size: 60,
          },
          controller.signal,
        );
        if (controller.signal.aborted) {
          return;
        }
        setItems(result.items);
        setError(null);
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }
        const message =
          err instanceof Error ? err.message : "Device Distribution 데이터를 불러오지 못했습니다.";
        setError(message);
        setItems([]);
      } finally {
        if (!controller.signal.aborted && mode === "initial") {
          setLoading(false);
        }
      }
    },
    [resolvedApplicationId, osType, resolvedTmzutc],
  );

  useEffect(() => {
    void fetchData("initial");
    return () => controllerRef.current?.abort();
  }, [fetchData]);

  useEffect(() => {
    if (!resolvedApplicationId) {
      return;
    }
    // Keep the widget refreshed in the background while the dashboard stays open.
    const timer = window.setInterval(() => {
      void fetchData("refresh");
    }, REFRESH_INTERVAL_MS);
    refreshTimerRef.current = timer;
    return () => {
      if (refreshTimerRef.current != null) {
        window.clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [resolvedApplicationId, fetchData]);

  const isDarkMode = theme === "dark";
  const xDomain: [number, number] = [0, Math.max(10, Math.ceil(maxDevice * 1.05))];
  const yDomain: [number, number] = [0, Math.max(10, Math.ceil(maxRate * 1.2))];

  const errorChartData = useMemo(() => buildChartData(items, "error"), [items]);
  const crashChartData = useMemo(() => buildChartData(items, "crash"), [items]);

  const openTroublePopup = useCallback(
    ({
      deviceModel,
      troubleType,
      hasError,
      hasCrash,
      dateType,
    }: {
      deviceModel: string;
      troubleType: FavoritesTroubleType;
      hasError: boolean;
      hasCrash: boolean;
      dateType: FavoritesDateType;
    }) => {
      const cleaned = deviceModel.trim();
      if (!cleaned) {
        return;
      }
      setTroublePopup({
        deviceModel: cleaned,
        dateType,
        initialType: troubleType,
        hasError,
        hasCrash,
      });
    },
    [],
  );

  const handleBubbleClick = useCallback(
    (metric: MetricKey, datum: ChartDatum) => {
      openTroublePopup({
        deviceModel: datum.deviceModel,
        troubleType: metric,
        hasError: datum.errorCount > 0,
        hasCrash: datum.crashCount > 0,
        dateType: "DAY",
      });
    },
    [openTroublePopup],
  );

  const groupByOs = useCallback((data: ChartDatum[]) => {
    const groups = new Map<string, ChartDatum[]>();
    data.forEach((datum) => {
      const key = datum.osType || "unknown";
      const list = groups.get(key) ?? [];
      list.push(datum);
      groups.set(key, list);
    });
    return Array.from(groups.entries());
  }, []);

  const renderChart = useCallback(
    (metric: MetricKey, data: ChartDatum[]) => {
      const grouped = groupByOs(data);
      const bubbleMaxSize = Math.max(MIN_BUBBLE_SIZE, ...data.map((item) => item.bubbleSize));
      const bubbleMaxRadius = Math.sqrt(bubbleMaxSize / Math.PI);
      const bubblePadding = Math.ceil(bubbleMaxRadius + BUBBLE_EDGE_PADDING);
      return (
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid
              vertical={false}
              strokeDasharray="6 6"
              stroke={isDarkMode ? "rgba(148, 163, 184, 0.3)" : "rgba(148, 163, 184, 0.5)"}
            />
            <XAxis
              type="number"
              dataKey="deviceCount"
              name="Device Count"
              domain={xDomain}
              tickFormatter={formatNumber}
              tickMargin={0}
              padding={{ left: bubblePadding, right: bubblePadding }}
              tick={{ fontSize: 10, fill: isDarkMode ? "#cbd5e1" : "#475569" }}
              axisLine={{ stroke: isDarkMode ? "#94a3b8" : "#0f172a", strokeWidth: 1.2 }}
              tickLine={{ stroke: isDarkMode ? "#94a3b8" : "#0f172a" }}
            />
            <YAxis
              type="number"
              dataKey="rate"
              name={metric === "error" ? "Error Rate" : "Crash Rate"}
              domain={yDomain}
              tickFormatter={formatPercent}
              tick={false}
              tickMargin={0}
              width={10}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
              padding={{ top: bubblePadding, bottom: bubblePadding }}
            />
            <ZAxis dataKey="bubbleSize" domain={[0, bubbleMaxSize]} range={[0, bubbleMaxSize]} />
            <RechartsTooltip
              cursor={{ stroke: isDarkMode ? "#94a3b8" : "#cbd5e1", strokeWidth: 1 }}
              content={<DeviceDistributionTooltip metric={metric} />}
            />
            <Legend />
            {grouped.map(([osKey, list], index) => {
              const palette =
                OS_COLORS[osKey.toLowerCase()] ??
                OS_COLORS[osKey === "Android" ? "android" : osKey === "iOS" ? "ios" : "default"] ??
                OS_COLORS.default;
              return (
                <Scatter
                  key={`${osKey}-${index}`}
                  name={resolveOsLabel(osKey)}
                  data={list}
                  fill={palette.fill}
                  stroke={palette.stroke}
                  strokeWidth={1.2}
                  onClick={(data) => {
                    const payload = (data as { payload?: ChartDatum })?.payload;
                    if (!payload) {
                      return;
                    }
                    handleBubbleClick(metric, payload);
                  }}
                />
              );
            })}
          </ScatterChart>
        </ResponsiveContainer>
      );
    },
    [groupByOs, handleBubbleClick, isDarkMode, xDomain, yDomain],
  );

  return (
    <>
      <div className="maxy_component_wrap">
        <div className="maxy_component_header space_between">
          <div className="header_title flex_column">
            <div className="header_title space_between">
              <h4>Device Distribution</h4>
              <img className="ic_question" alt="?" />
            </div>
            <div className="maxy_component_tab">
              <span
                className={`btn_tab${activeMetric === "error" ? " on" : ""}`}
                data-tab="bubbleError"
                role="button"
                tabIndex={0}
                onClick={() => setActiveMetric("error")}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setActiveMetric("error");
                  }
                }}
              >
                <img className="error_img" src="/images/maxy/icon-error-grey.svg" alt="" />
                <span>Error</span>
              </span>
              <span
                className={`btn_tab${activeMetric === "crash" ? " on" : ""}`}
                data-tab="bubbleCrash"
                role="button"
                tabIndex={0}
                onClick={() => setActiveMetric("crash")}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setActiveMetric("crash");
                  }
                }}
              >
                <img className="crash_img" src="/images/maxy/icon-crash-grey.svg" alt="" />
                <span>Crash</span>
              </span>
            </div>
          </div>
          <div className="maxy_component_btn_wrap">
            <button
              type="button"
              className="maxy_component_btn"
              onClick={() => setAllModalOpen(true)}
              disabled={items.length === 0}
            >
              ALL
            </button>
          </div>
        </div>

        <div className={`maxy_component_item_wrap${activeMetric === "error" ? "" : " hidden"}`} id="bubbleError">
          <div className="maxy_component_item" id="bubble_errorChart">
            {statusMessage ? (
              <div className="device-distribution__status">{statusMessage}</div>
            ) : (
              renderChart("error", errorChartData)
            )}
          </div>
        </div>

        <div className={`maxy_component_item_wrap${activeMetric === "crash" ? "" : " hidden"}`} id="bubbleCrash">
          <div className="maxy_component_item" id="bubble_crashChart">
            {statusMessage ? (
              <div className="device-distribution__status">{statusMessage}</div>
            ) : (
              renderChart("crash", crashChartData)
            )}
          </div>
        </div>
      </div>

      <DeviceDistributionAllModal
        open={allModalOpen}
        applicationId={resolvedApplicationId}
        osType={osType ?? null}
        tmzutc={resolvedTmzutc}
        onClose={() => setAllModalOpen(false)}
        onOpenTroublePopup={openTroublePopup}
      />
      <FavoritesTroublePopup
        open={Boolean(troublePopup)}
        applicationId={resolvedApplicationId}
        osType={osType ?? null}
        tmzutc={resolvedTmzutc}
        dateType={troublePopup?.dateType ?? "DAY"}
        reqUrl={null}
        deviceModel={troublePopup?.deviceModel ?? null}
        searchTarget="deviceModel"
        popupType="Device Distribution"
        initialType={troublePopup?.initialType ?? "error"}
        hasError={Boolean(troublePopup?.hasError)}
        hasCrash={Boolean(troublePopup?.hasCrash)}
        onClose={() => setTroublePopup(null)}
      />
    </>
  );
}
