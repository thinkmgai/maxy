"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { useUserSettings } from "../../../../components/usersettings/UserSettingsProvider";
import { AppList, type ApplicationSummary } from "../../../api/AppList";
import {
  getLoadingTimeScatter,
  type LoadingTimeScatterPoint,
} from "../../../api/Widget/LoadingTimeS";
import { getWaterfallDetail, type WaterfallDetailResponse } from "../../../api/Waterfall";
import { getEventTimeLine, type EventTimeLineResponse } from "../../../api/EventTimeLine";
import { useTheme } from "../../../../components/theme/ThemeProvider";

import "./style.css";
import Waterfall from "./Waterfall";
import EventTimeLine from "./EventTimeLine";

type ScatterGroups = {
  warning: LoadingTimeScatterPoint[];
  high: LoadingTimeScatterPoint[];
  normal: LoadingTimeScatterPoint[];
  low: LoadingTimeScatterPoint[];
};

export type ChartPoint = LoadingTimeScatterPoint & {
  timestamp: number;
  loadingTime: number;
  group: keyof ScatterGroups;
  lcp?: number | null;
  cls?: number | null;
  inp?: number | null;
};

type CanvasRect = { left: number; top: number; width: number; height: number };

type DataBounds = { x1: number; x2: number; y1: number; y2: number };

type ChartMetrics = {
  width: number;
  height: number;
  margin: { top: number; right: number; bottom: number; left: number };
  plotWidth: number;
  plotHeight: number;
  xDomain: [number, number];
  yDomain: [number, number];
  xScale(value: number): number;
  yScale(value: number): number;
  invertX(value: number): number;
  invertY(value: number): number;
  yTicks: number[];
};

type HoverState = {
  point: ChartPoint;
  position: { x: number; y: number };
} | null;

type PointPixel = {
  point: ChartPoint;
  x: number;
  y: number;
};

type PointAnimation = {
  startX: number;
  startY: number;
  startTime: number;
  duration: number;
};

const WINDOW_MS = 5 * 60 * 1000; // 최근 5분
const REFRESH_INTERVAL_MS = 2000;
const WATERFALL_LEFT_OFFSET = 100;

const SERIES_META: Array<{
  key: keyof ScatterGroups;
  name: string;
  color: string;
  shape: "circle" | "square" | "cross";
  stroke?: string;
  fillOpacity?: number;
}> = [
  { key: "low", name: "Low", color: "#CEEBFF", shape: "square" },
  { key: "normal", name: "Normal", color: "#82A2FF", shape: "square" },
  { key: "high", name: "High", color: "#7C76FF", shape: "square" },
  {
    key: "warning",
    name: "Warning",
    color: "rgba(255,81,81,0.35)",
    stroke: "rgb(255,81,81)",
    shape: "cross",
    fillOpacity: 1,
  },
];
function formatDuration(value: number): string {
  if (!Number.isFinite(value)) return "-";
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}s`;
  }
  return `${Math.round(value)}ms`;
}

const NETWORK_LABELS: Record<number, string> = {
  0: "Very Good",
  1: "Good",
  2: "Normal",
  3: "Bad",
  4: "Very Bad",
  5: "Very Bad",
};

function formatNetworkLabel(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }
  const trimmed = String(value).trim();
  if (!trimmed) {
    return "-";
  }
  const numeric = Number(trimmed);
  if (Number.isInteger(numeric) && numeric >= 0 && numeric <= 5) {
    return NETWORK_LABELS[numeric] ?? trimmed;
  }
  return trimmed;
}

const numberFormatter = new Intl.NumberFormat("en-US");

function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

const tickTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

function formatTickTimestamp(value: number): string {
  return tickTimeFormatter.format(new Date(value));
}

function isNativePageType(logType: string | null | undefined): boolean {
  if (!logType) return false;
  const trimmed = String(logType).trim();
  if (!trimmed) return false;
  return trimmed.startsWith("10") || trimmed.startsWith("20");
}

const tooltipTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

function formatTooltipTimestamp(value: number): string {
  return tooltipTimeFormatter.format(new Date(value));
}

type StringSummary = {
  display: string;
  title?: string;
  values: string[];
  hasMultiple: boolean;
};

type NumericStats<T> = {
  min: number;
  max: number;
  average: number;
  count: number;
  minSource: T | null;
  maxSource: T | null;
};

type MetaBadge = {
  key: string;
  label: string;
  title?: string;
  iconPath: string;
};

const ICON_PATHS = {
  device: "/images/maxy/icon-device.svg",
  app: "/images/maxy/icon-app.svg",
  os: {
    ios: "/images/maxy/icon-ios-purple.svg",
    android: "/images/maxy/icon-android-light-grey.svg",
    default: "/images/maxy/icon-app-blue.svg",
  },
  network: "/images/maxy/icon-network-type.svg",
  carrier: "/images/maxy/icon-simoperator.svg",
  location: "/images/maxy/icon-time-zone.svg",
  user: "/images/maxy/icon-account-user-bk.svg",
} as const;

const FEELDEX_ICON_PATHS = {
  great: "/images/maxy/feeldex-very-good.svg",
  good: "/images/maxy/feeldex-good.svg",
  soso: "/images/maxy/feeldex-normal.svg",
  bad: "/images/maxy/feeldex-bad.svg",
  awful: "/images/maxy/feeldex-very-bad.svg",
} as const;

function summarizeStringField(
  points: ChartPoint[],
  accessor: (point: ChartPoint) => string | null | undefined,
): StringSummary {
  const unique = points
    .map((point) => accessor(point))
    .filter((value): value is string => {
      if (value == null) return false;
      const trimmed = String(value).trim();
      return trimmed.length > 0;
    })
    .map((value) => String(value).trim());
  const uniqueValues = Array.from(new Set(unique));
  if (uniqueValues.length === 0) {
    return { display: "-", values: [], hasMultiple: false };
  }
  const primary = uniqueValues[0];
  const hasMultiple = uniqueValues.length > 1;
  const display = primary;
  const title = hasMultiple ? uniqueValues.join(", ") : primary;
  return { display, title, values: uniqueValues, hasMultiple };
}

function computeNumericStats<T>(
  items: T[],
  accessor: (item: T) => number | null | undefined,
): NumericStats<T> {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  let sum = 0;
  let count = 0;
  let minSource: T | null = null;
  let maxSource: T | null = null;

  for (const item of items) {
    const raw = accessor(item);
    if (raw == null) {
      continue;
    }
    const value = Number(raw);
    if (!Number.isFinite(value)) {
      continue;
    }
    if (value < min) {
      min = value;
      minSource = item;
    }
    if (value > max) {
      max = value;
      maxSource = item;
    }
    sum += value;
    count += 1;
  }

  if (count === 0) {
    return {
      min: 0,
      max: 0,
      average: 0,
      count: 0,
      minSource: null,
      maxSource: null,
    };
  }

  return {
    min,
    max,
    average: sum / count,
    count,
    minSource,
    maxSource,
  };
}

function computeTimestampRange(points: ChartPoint[]): { start: number | null; end: number | null } {
  let start = Number.POSITIVE_INFINITY;
  let end = Number.NEGATIVE_INFINITY;
  for (const point of points) {
    const value = point.timestamp;
    if (!Number.isFinite(value)) {
      continue;
    }
    if (value < start) {
      start = value;
    }
    if (value > end) {
      end = value;
    }
  }
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return { start: null, end: null };
  }
  return { start, end };
}

function resolveOsIcon(value: string | null | undefined): string {
  if (!value) {
    return ICON_PATHS.os.default;
  }
  const lower = value.toLowerCase();
  if (lower.includes("ios") || lower.includes("iphone") || lower.includes("ipad")) {
    return ICON_PATHS.os.ios;
  }
  if (lower.includes("android")) {
    return ICON_PATHS.os.android;
  }
  return ICON_PATHS.os.default;
}

type SortKey = "time" | "feeldex" | "device" | "user" | "timestamp" | "network" | "url";

type SortConfig = {
  key: SortKey;
  direction: "asc" | "desc";
};

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function niceNumber(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 1;
  }
  const exponent = Math.floor(Math.log10(value));
  const fraction = value / 10 ** exponent;
  let niceFraction: number;
  if (fraction <= 1) {
    niceFraction = 1;
  } else if (fraction <= 2) {
    niceFraction = 2;
  } else if (fraction <= 5) {
    niceFraction = 5;
  } else {
    niceFraction = 10;
  }
  return niceFraction * 10 ** exponent;
}

function computeYAxis(maxValue: number, tickCount = 5): { ticks: number[]; upper: number } {
  const safeMax = Math.max(1, maxValue * 1.05);
  const step = niceNumber(safeMax / Math.max(1, tickCount));
  const upper = Math.max(step, Math.ceil(safeMax / step) * step);
  const ticks: number[] = [];
  const divisions = Math.max(1, tickCount);
  for (let index = 0; index <= divisions; index += 1) {
    ticks.push(step * index);
  }
  return { ticks, upper };
}

function easeOutCubic(value: number): number {
  const clamped = clamp(value, 0, 1);
  const inverse = 1 - clamped;
  return 1 - inverse * inverse * inverse;
}

function getItemTimestamp(point: LoadingTimeScatterPoint): number {
  // Use page_start_tm (millisecond timestamp) as primary x-axis source.
  if (point.pageStartTm && Number.isFinite(point.pageStartTm)) {
    return point.pageStartTm;
  }
  if (point.pageEndTm && Number.isFinite(point.pageEndTm)) {
    return point.pageEndTm;
  }
  if (point.logTm && Number.isFinite(point.logTm)) {
    return point.logTm;
  }
  return 0;
}

function categorize(points: LoadingTimeScatterPoint[]): ScatterGroups {
  const groups: ScatterGroups = {
    warning: [],
    high: [],
    normal: [],
    low: [],
  };

  const warningPoints = points.filter((point) => point.wtfFlag);
  warningPoints.forEach((point) => groups.warning.push(point));

  const sorted = points
    .filter((point) => !point.wtfFlag)
    .sort((a, b) => (b.loadingTime ?? 0) - (a.loadingTime ?? 0));

  const safeTotal = sorted.length;
  const highCutoff = Math.ceil(safeTotal * 0.3);
  const normalCutoff = Math.ceil(safeTotal * 0.7);

  let cursor = 0;
  for (const point of sorted) {
    if (cursor < highCutoff) {
      groups.high.push(point);
    } else if (cursor < normalCutoff) {
      groups.normal.push(point);
    } else {
      groups.low.push(point);
    }
    cursor += 1;
  }

  return groups;
}

function buildChartSeries(groups: ScatterGroups): Record<keyof ScatterGroups, ChartPoint[]> {
  const mapPoint = (group: keyof ScatterGroups) =>
    groups[group].map((point) => ({
      ...point,
      timestamp: getItemTimestamp(point),
      loadingTime: point.loadingTime ?? 0,
      group,
    }));

  return {
    warning: mapPoint("warning"),
    high: mapPoint("high"),
    normal: mapPoint("normal"),
    low: mapPoint("low"),
  };
}

/** Loading time scatter widget for the 대시보드 영역. */
export default function LoadingTimeScatterWidget() {
  const {
    applicationId: storedApplicationId,
    userNo: storedUserNo,
    tmzutc,
    osType: storedOsType,
  } = useUserSettings();
  const { theme } = useTheme();
  const isDarkMode = theme === "dark";
  const themeColors = useMemo(
    () => ({
      text: isDarkMode ? "#e2e8f0" : "#111827",
      axis: isDarkMode ? "rgba(148, 163, 184, 0.45)" : "#111827",
      highlightStroke: isDarkMode ? "#f87171" : "#ef4444",
      highlightFill: isDarkMode ? "rgba(248, 113, 113, 0.12)" : "rgba(239,68,68,0.08)",
      focusStroke: isDarkMode ? "#38bdf8" : "#1d4ed8",
    }),
    [isDarkMode],
  );
  const { text: chartTextColor, axis: axisLineColor, highlightStroke, highlightFill, focusStroke } =
    themeColors;
  const applicationId = useMemo(() => {
    if (storedApplicationId == null) {
      return 0;
    }
    const numeric = Number(storedApplicationId);
    return Number.isFinite(numeric) ? numeric : 0;
  }, [storedApplicationId]);
  const resolvedOsType = useMemo(() => storedOsType ?? "A", [storedOsType]);
  const userNo = useMemo(() => {
    if (typeof storedUserNo === "number" && Number.isFinite(storedUserNo)) {
      return storedUserNo;
    }
    if (typeof storedUserNo === "string" && storedUserNo.trim() !== "") {
      const parsed = Number(storedUserNo);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }, [storedUserNo]);

  const [data, setData] = useState<LoadingTimeScatterPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [resolvedApplicationId, setResolvedApplicationId] = useState<number>(
    applicationId > 0 ? applicationId : 0,
  );
  const [appResolveError, setAppResolveError] = useState<string | null>(null);
  const [isResolvingApp, setIsResolvingApp] = useState(false);
  const [applicationCache, setApplicationCache] = useState<ApplicationSummary[] | null>(null);
  const [cachedUserNo, setCachedUserNo] = useState<number | null>(null);
  const [timeRange, setTimeRange] = useState<{ from: number; to: number } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointerCaptureRef = useRef<number | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number } | null>(null);
  const [dragRect, setDragRect] = useState<CanvasRect | null>(null);
  const [selectionResult, setSelectionResult] = useState<{
    points: ChartPoint[];
    bounds: DataBounds;
    rect: CanvasRect;
  } | null>(null);
  const [waterfallPoint, setWaterfallPoint] = useState<ChartPoint | null>(null);
  const [isWaterfallOpen, setWaterfallOpen] = useState(false);
  const [waterfallData, setWaterfallData] = useState<WaterfallDetailResponse | null>(null);
  const [waterfallLoading, setWaterfallLoading] = useState(false);
  const [waterfallError, setWaterfallError] = useState<string | null>(null);
  const [eventTimeLinePoint, setEventTimeLinePoint] = useState<ChartPoint | null>(null);
  const [isEventTimeLineOpen, setEventTimeLineOpen] = useState(false);
  const [eventTimeLineData, setEventTimeLineData] = useState<EventTimeLineResponse | null>(null);
  const [eventTimeLineLoading, setEventTimeLineLoading] = useState(false);
  const [eventTimeLineError, setEventTimeLineError] = useState<string | null>(null);
  const [hoverState, setHoverState] = useState<HoverState>(null);
  const [hoveredSeries, setHoveredSeries] = useState<keyof ScatterGroups | null>(null);
  const refreshTimerRef = useRef<number | null>(null);
  const lastFetchToRef = useRef<number | null>(null);
  const afterKeyRef = useRef<number | null>(null);
  const activeFetchControllerRef = useRef<AbortController | null>(null);
  const pointAnimationsRef = useRef<Map<string, PointAnimation>>(new Map());
  const previousPointIdsRef = useRef<Set<string>>(new Set());
  const animationFrameRef = useRef<number | null>(null);
  const waterfallAbortControllerRef = useRef<AbortController | null>(null);
  const eventTimeLineAbortControllerRef = useRef<AbortController | null>(null);

  const handleShowWaterfall = useCallback((point: ChartPoint) => {
    setWaterfallPoint((prev) => {
      if (prev && prev.id === point.id) {
        return { ...point };
      }
      return point;
    });
    setWaterfallError(null);
    setWaterfallData(null);
    setWaterfallOpen(true);
  }, []);

  const handleCloseWaterfall = useCallback(() => {
    setWaterfallOpen(false);
    setWaterfallPoint(null);
    setWaterfallData(null);
    setWaterfallError(null);
    setWaterfallLoading(false);
    if (waterfallAbortControllerRef.current) {
      waterfallAbortControllerRef.current.abort();
      waterfallAbortControllerRef.current = null;
    }
  }, []);

  const handleShowEventTimeLine = useCallback((point: ChartPoint) => {
    setEventTimeLinePoint((prev) => {
      if (prev && prev.id === point.id) {
        return { ...point };
      }
      return point;
    });
    setEventTimeLineError(null);
    setEventTimeLineData(null);
    setEventTimeLineOpen(true);
  }, []);

  const handleCloseEventTimeLine = useCallback(() => {
    setEventTimeLineOpen(false);
    setEventTimeLinePoint(null);
    setEventTimeLineData(null);
    setEventTimeLineError(null);
    setEventTimeLineLoading(false);
    if (eventTimeLineAbortControllerRef.current) {
      eventTimeLineAbortControllerRef.current.abort();
      eventTimeLineAbortControllerRef.current = null;
    }
  }, []);

  const handleShowPerformance = useCallback(
    (point: ChartPoint) => {
      if (isNativePageType(point.logType ?? null)) {
        if (isWaterfallOpen) {
          handleCloseWaterfall();
        }
        handleShowEventTimeLine(point);
        return;
      }
      if (isEventTimeLineOpen) {
        handleCloseEventTimeLine();
      }
      handleShowWaterfall(point);
    },
    [
      handleCloseEventTimeLine,
      handleCloseWaterfall,
      handleShowEventTimeLine,
      handleShowWaterfall,
      isEventTimeLineOpen,
      isWaterfallOpen,
    ],
  );

  const resetForApplicationChange = useCallback(() => {
    setData([]);
    setTimeRange(null);
    dragStartRef.current = null;
    setDragRect(null);
    setSelectionResult(null);
    setHoverState(null);
    setHoveredSeries(null);
    previousPointIdsRef.current.clear();
    pointAnimationsRef.current.clear();
    afterKeyRef.current = null;
  }, []);

  useEffect(() => {
    if (!selectionResult || selectionResult.points.length === 0) {
      if (waterfallPoint || isWaterfallOpen) {
        handleCloseWaterfall();
      }
      if (eventTimeLinePoint || isEventTimeLineOpen) {
        handleCloseEventTimeLine();
      }
    }
  }, [
    eventTimeLinePoint,
    handleCloseEventTimeLine,
    handleCloseWaterfall,
    isEventTimeLineOpen,
    isWaterfallOpen,
    selectionResult,
    waterfallPoint,
  ]);

  const fetchWaterfallData = useCallback(
    async (point: ChartPoint) => {
      if (resolvedApplicationId <= 0) {
        setWaterfallError("애플리케이션 정보가 필요합니다.");
        setWaterfallData(null);
        return;
      }

      if (waterfallAbortControllerRef.current) {
        waterfallAbortControllerRef.current.abort();
        waterfallAbortControllerRef.current = null;
      }

      const controller = new AbortController();
      waterfallAbortControllerRef.current = controller;

      setWaterfallLoading(true);
      setWaterfallError(null);

      try {
        const payload = await getWaterfallDetail(
          {
            applicationId: resolvedApplicationId,
            deviceId: point.deviceId ?? null,
            osType: point.osType ?? null,
            reqUrl: point.reqUrl ?? null,
            mxPageId: point.mxPageId ?? null,
            logTm: point.logTm ?? point.timestamp ?? null,
            pageStartTm: point.pageStartTm ?? null,
            pageEndTm: point.pageEndTm ?? point.logTm ?? null,
            limit: 120,
          },
          controller.signal,
        );

        if (!controller.signal.aborted) {
          setWaterfallData(payload);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setWaterfallError(err instanceof Error ? err.message : "워터폴 데이터를 불러오지 못했습니다.");
          setWaterfallData(null);
        }
      } finally {
        if (waterfallAbortControllerRef.current === controller) {
          waterfallAbortControllerRef.current = null;
        }
        if (!controller.signal.aborted) {
          setWaterfallLoading(false);
        }
      }
    },
    [resolvedApplicationId, tmzutc],
  );

  useEffect(() => {
    if (!isWaterfallOpen || !waterfallPoint) {
      return;
    }
    fetchWaterfallData(waterfallPoint);
  }, [fetchWaterfallData, isWaterfallOpen, waterfallPoint]);

  const fetchEventTimeLineData = useCallback(
    async (point: ChartPoint) => {
      if (resolvedApplicationId <= 0) {
        setEventTimeLineError("애플리케이션 정보가 필요합니다.");
        setEventTimeLineData(null);
        return;
      }
      if (!point.deviceId) {
        setEventTimeLineError("deviceId 값이 필요합니다.");
        setEventTimeLineData(null);
        return;
      }

      const from =
        point.pageStartTm ?? point.logTm ?? point.timestamp ?? null;
      const to =
        point.pageEndTm ?? point.pageStartTm ?? point.logTm ?? point.timestamp ?? null;
      if (from == null || to == null || !Number.isFinite(from) || !Number.isFinite(to)) {
        setEventTimeLineError("페이지 시간 정보가 부족합니다.");
        setEventTimeLineData(null);
        return;
      }

      if (eventTimeLineAbortControllerRef.current) {
        eventTimeLineAbortControllerRef.current.abort();
        eventTimeLineAbortControllerRef.current = null;
      }

      const controller = new AbortController();
      eventTimeLineAbortControllerRef.current = controller;

      setEventTimeLineLoading(true);
      setEventTimeLineError(null);

      try {
        const payload = await getEventTimeLine(
          {
            applicationId: resolvedApplicationId,
            deviceId: point.deviceId,
            mxPageId: point.mxPageId ?? null,
            from: Math.round(from),
            to: Math.round(to),
            limit: 1200,
          },
          controller.signal,
        );

        if (!controller.signal.aborted) {
          setEventTimeLineData(payload);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setEventTimeLineError(
            err instanceof Error ? err.message : "Event Time Line 데이터를 불러오지 못했습니다.",
          );
          setEventTimeLineData(null);
        }
      } finally {
        if (eventTimeLineAbortControllerRef.current === controller) {
          eventTimeLineAbortControllerRef.current = null;
        }
        if (!controller.signal.aborted) {
          setEventTimeLineLoading(false);
        }
      }
    },
    [resolvedApplicationId],
  );

  useEffect(() => {
    if (!isEventTimeLineOpen || !eventTimeLinePoint) {
      return;
    }
    fetchEventTimeLineData(eventTimeLinePoint);
  }, [eventTimeLinePoint, fetchEventTimeLineData, isEventTimeLineOpen]);

  useEffect(() => {
    if (userNo !== cachedUserNo) {
      setApplicationCache(null);
      setCachedUserNo(userNo ?? null);
      if (applicationId <= 0 && resolvedApplicationId !== 0) {
        resetForApplicationChange();
        setResolvedApplicationId(0);
      }
    }

    if (applicationId > 0) {
      setIsResolvingApp(false);
      if (applicationId !== resolvedApplicationId) {
        resetForApplicationChange();
        setError(null);
        setLastUpdated(null);
        setResolvedApplicationId(applicationId);
      }
      setAppResolveError(null);
      return;
    }

    if (userNo == null) {
      setIsResolvingApp(false);
      if (resolvedApplicationId !== 0) {
        resetForApplicationChange();
        setResolvedApplicationId(0);
      }
      setAppResolveError("사용자 정보가 필요합니다.");
      return;
    }
    const userNoForRequest = userNo!;

    if (resolvedApplicationId > 0) {
      setIsResolvingApp(false);
      return;
    }

    let cancelled = false;
    setIsResolvingApp(true);
    setAppResolveError(null);
    async function resolveApplication() {
      try {
        let apps = applicationCache;
        if (!apps) {
          const response = await AppList({ userNo: userNoForRequest, osType: "all" });
          apps = response.applicationList;
          if (!cancelled) {
            setApplicationCache(apps);
          }
        }
        if (cancelled) return;
        const fallbackEntry = apps?.find((item) => Number(item.applicationId) > 0) ?? null;
        const fallbackId = fallbackEntry?.applicationId ?? 0;
        if (fallbackId > 0) {
          if (fallbackId !== resolvedApplicationId) {
            resetForApplicationChange();
            setError(null);
            setLastUpdated(null);
            setResolvedApplicationId(fallbackId);
          }
          setAppResolveError(null);
        } else {
          if (resolvedApplicationId !== 0) {
            resetForApplicationChange();
            setResolvedApplicationId(0);
          }
          setError(null);
          setLastUpdated(null);
          setAppResolveError("사용 가능한 애플리케이션이 없습니다.");
        }
      } catch (err) {
        if (!cancelled) {
          if (resolvedApplicationId !== 0) {
            resetForApplicationChange();
            setResolvedApplicationId(0);
          }
          setError(null);
          setLastUpdated(null);
          setAppResolveError(
            err instanceof Error ? err.message : "애플리케이션 정보를 불러오지 못했습니다.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsResolvingApp(false);
        }
      }
    }

    resolveApplication();
    return () => {
      cancelled = true;
      setIsResolvingApp(false);
    };
  }, [
    applicationId,
    userNo,
    resolvedApplicationId,
    applicationCache,
    cachedUserNo,
    resetForApplicationChange,
  ]);

  const fetchAndUpdate = useCallback(
    async (mode: "initial" | "incremental"): Promise<boolean> => {
      if (resolvedApplicationId <= 0) {
        return false;
      }

      if (activeFetchControllerRef.current) {
        activeFetchControllerRef.current.abort();
      }

      const controller = new AbortController();
      activeFetchControllerRef.current = controller;

      const now = Date.now();
      const clampedTo = now;
      if (mode === "initial") {
        afterKeyRef.current = null; // 첫 요청은 전체(5분 내) 구간을 가져온다.
      }
      let from = afterKeyRef.current ?? 0;
      if (!Number.isFinite(from) || from < 0) {
        from = 0;
      }

      try {
        const { list, afterKey } = await getLoadingTimeScatter(
          {
            applicationId: resolvedApplicationId,
            osType: resolvedOsType,
            from,
            to: clampedTo,
            tmzutc: tmzutc,
          },
          controller.signal,
        );

        if (controller.signal.aborted) {
          return false;
        }
        if (afterKey != null && Number.isFinite(afterKey)) {
          afterKeyRef.current = afterKey;
        }

        // Keep the window anchored to "now" so time flows forward even as new data arrives.
        const effectiveTo = clampedTo;
        lastFetchToRef.current = effectiveTo;
        const cutoff = Math.max(0, effectiveTo - WINDOW_MS);

        setData((prev) => {
          if (mode === "initial") {
            return list
              .filter((item) => getItemTimestamp(item) >= cutoff)
              .sort((a, b) => getItemTimestamp(a) - getItemTimestamp(b));
          }
          return [...prev, ...list]
            .filter((item) => getItemTimestamp(item) >= cutoff)
            .sort((a, b) => getItemTimestamp(a) - getItemTimestamp(b));
        });
        setLastUpdated(Date.now());
        setTimeRange({ from: cutoff, to: effectiveTo });
        setError(null);
        if (mode === "initial") {
          dragStartRef.current = null;
          setDragRect(null);
          setSelectionResult(null);
          setHoverState(null);
          setHoveredSeries(null);
        }
        return true;
      } catch (err) {
        if (!controller.signal.aborted) {
          if (mode === "initial") {
            setData([]);
            setTimeRange(null);
            setError(err instanceof Error ? err.message : "데이터를 불러오지 못했습니다.");
          }
        }
        return false;
      } finally {
        if (activeFetchControllerRef.current === controller) {
          activeFetchControllerRef.current = null;
        }
      }
    },
    [resolvedApplicationId, resolvedOsType, tmzutc],
  );

  useEffect(() => {
    let cancelled = false;

    const stopTimer = () => {
      if (refreshTimerRef.current != null) {
        window.clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };

    stopTimer();

    if (activeFetchControllerRef.current) {
      activeFetchControllerRef.current.abort();
      activeFetchControllerRef.current = null;
    }

    lastFetchToRef.current = null;
    afterKeyRef.current = null;

    if (resolvedApplicationId <= 0) {
      setData([]);
      setError(null);
      setTimeRange(null);
      dragStartRef.current = null;
      setDragRect(null);
      setSelectionResult(null);
      setHoverState(null);
      setHoveredSeries(null);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    const runLoop = () => {
      refreshTimerRef.current = window.setTimeout(async () => {
        if (cancelled) {
          return;
        }
        await fetchAndUpdate("incremental");
        if (!cancelled) {
          runLoop();
        }
      }, REFRESH_INTERVAL_MS);
    };

    (async () => {
      setLoading(true);
      setError(null);
      const success = await fetchAndUpdate("initial");
      if (cancelled) {
        return;
      }
      setLoading(false);
      if (success) {
        runLoop();
      }
    })();

    return () => {
      cancelled = true;
      stopTimer();
      if (activeFetchControllerRef.current) {
        activeFetchControllerRef.current.abort();
        activeFetchControllerRef.current = null;
      }
      lastFetchToRef.current = null;
      afterKeyRef.current = null;
    };
  }, [fetchAndUpdate, resolvedApplicationId]);

  const groups = useMemo(() => categorize(data), [data]);
  const chartSeries = useMemo(() => buildChartSeries(groups), [groups]);
  const chartPointMap = useMemo(() => {
    const map = new Map<string, ChartPoint>();
    (Object.values(chartSeries) as ChartPoint[][]).forEach((seriesPoints) => {
      seriesPoints.forEach((point) => {
        map.set(point.id, point);
      });
    });
    return map;
  }, [chartSeries]);
  const allPoints = useMemo(
    () => [
      ...chartSeries.warning,
      ...chartSeries.high,
      ...chartSeries.normal,
      ...chartSeries.low,
    ],
    [chartSeries],
  );
  const updateCanvasSize = useCallback(
    (node: HTMLDivElement | null, size?: { width: number; height: number }) => {
      if (!node) {
        return;
      }
      const nextWidth = size?.width ?? node.clientWidth;
      const nextHeight = size?.height ?? node.clientHeight;
      const next = { width: nextWidth, height: nextHeight };
      setCanvasSize((prev) =>
        prev && prev.width === next.width && prev.height === next.height ? prev : next,
      );
    },
    [],
  );

  const setContainerNode = useCallback((node: HTMLDivElement | null) => {
    containerRef.current = node;
    if (node) {
      requestAnimationFrame(() => updateCanvasSize(node));
    }
  }, [updateCanvasSize]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) {
      return;
    }

    const updateSize = () => updateCanvasSize(node);
    updateSize();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.target === node) {
            updateCanvasSize(node, {
              width: entry.contentRect.width,
              height: entry.contentRect.height,
            });
          }
        }
      });
      observer.observe(node);
      return () => observer.disconnect();
    }

    return () => {
      /* no-op fallback */
    };
  }, [updateCanvasSize]);

  const chartMetrics = useMemo<ChartMetrics | null>(() => {
    if (!canvasSize) {
      return null;
    }
    const width = Math.max(1, Math.round(canvasSize.width));
    const height = Math.max(1, Math.round(canvasSize.height));
    const baseMargin = { top: 12, right: 12, bottom: 36 };

    let minTime = Number.POSITIVE_INFINITY;
    let maxTime = Number.NEGATIVE_INFINITY;
    let maxLoadingTime = 0;
    for (const point of allPoints) {
      if (point.timestamp < minTime) {
        minTime = point.timestamp;
      }
      if (point.timestamp > maxTime) {
        maxTime = point.timestamp;
      }
      if (point.loadingTime > maxLoadingTime) {
        maxLoadingTime = point.loadingTime;
      }
    }

    if (!Number.isFinite(minTime) || !Number.isFinite(maxTime)) {
      const now = Date.now();
      minTime = now - WINDOW_MS;
      maxTime = now;
    }

    let xStart = timeRange?.from ?? minTime;
    let xEnd = timeRange?.to ?? maxTime;
    if (!Number.isFinite(xStart) || !Number.isFinite(xEnd)) {
      const now = Date.now();
      xStart = now - WINDOW_MS;
      xEnd = now;
    }
    if (xEnd <= xStart) {
      xEnd = xStart + 1;
    }
    const xDomain: [number, number] = [xStart, xEnd];
    const { ticks: rawYTicks, upper } = computeYAxis(maxLoadingTime);
    const yTickLabels = rawYTicks.map((tick) => formatDuration(tick));
    const maxLabelWidth = yTickLabels.reduce((acc, label) => Math.max(acc, label.length), 0);
    const estimatedLabelPixels = Math.ceil(maxLabelWidth * 6.75);
    const margin = {
      ...baseMargin,
      left: Math.max(estimatedLabelPixels + 12, 32),
    };
    const plotWidth = Math.max(1, width - margin.left - (margin.right ?? 0));
    const plotHeight = Math.max(1, height - margin.top - margin.bottom);
    const yDomain: [number, number] = [0, upper];
    const xSpan = Math.max(1, xDomain[1] - xDomain[0]);
    const ySpan = Math.max(1, yDomain[1] - yDomain[0]);

    const xScale = (value: number) =>
      margin.left + clamp((value - xDomain[0]) / xSpan, 0, 1) * plotWidth;
    const yScale = (value: number) => {
      const clamped = clamp(value, yDomain[0], yDomain[1]);
      const ratio = (clamped - yDomain[0]) / ySpan;
      return margin.top + plotHeight - ratio * plotHeight;
    };
    const invertX = (pixel: number) =>
      xDomain[0] + clamp((pixel - margin.left) / plotWidth, 0, 1) * xSpan;
    const invertY = (pixel: number) =>
      yDomain[0] + (1 - clamp((pixel - margin.top) / plotHeight, 0, 1)) * ySpan;

    return {
      width,
      height,
      margin,
      plotWidth,
      plotHeight,
      xDomain,
      yDomain,
      xScale,
      yScale,
      invertX,
      invertY,
      yTicks: rawYTicks,
    };
  }, [allPoints, canvasSize, timeRange]);

  const pointPixels = useMemo<PointPixel[]>(() => {
    if (!chartMetrics) {
      return [];
    }
    return allPoints.map((point) => ({
      point,
      x: chartMetrics.xScale(point.timestamp),
      y: chartMetrics.yScale(point.loadingTime),
    }));
  }, [allPoints, chartMetrics]);

  const pointerWithinPlot = useCallback(
    (position: { x: number; y: number }) => {
      if (!chartMetrics) {
        return false;
      }
      const { margin, width, height } = chartMetrics;
      return (
        position.x >= margin.left &&
        position.x <= width - margin.right &&
        position.y >= margin.top &&
        position.y <= height - margin.bottom
      );
    },
    [chartMetrics],
  );

  const clampToPlot = useCallback(
    (position: { x: number; y: number }) => {
      if (!chartMetrics) {
        return position;
      }
      const { margin, width, height } = chartMetrics;
      return {
        x: clamp(position.x, margin.left, width - margin.right),
        y: clamp(position.y, margin.top, height - margin.bottom),
      };
    },
    [chartMetrics],
  );

  const computeRect = useCallback(
    (start: { x: number; y: number }, current: { x: number; y: number }): CanvasRect => ({
      left: Math.min(start.x, current.x),
      top: Math.min(start.y, current.y),
      width: Math.abs(current.x - start.x),
      height: Math.abs(current.y - start.y),
    }),
    [],
  );

  const getPointerPosition = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return null;
    }
    return { x, y };
  }, []);

  const toDataPoint = useCallback(
    (pixelX: number, pixelY: number): { x: number; y: number } | null => {
      if (!chartMetrics) {
        return null;
      }
      const { margin, width, height, invertX, invertY } = chartMetrics;
      const clampedX = clamp(pixelX, margin.left, width - margin.right);
      const clampedY = clamp(pixelY, margin.top, height - margin.bottom);
      const x = invertX(clampedX);
      const y = invertY(clampedY);
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        return null;
      }
      return { x, y };
    },
    [chartMetrics],
  );

  const rectToDataBounds = useCallback(
    (rect: CanvasRect | null): DataBounds | null => {
      if (!rect || !chartMetrics || rect.width < 1 || rect.height < 1) {
        return null;
      }
      const corners = [
        toDataPoint(rect.left, rect.top),
        toDataPoint(rect.left + rect.width, rect.top),
        toDataPoint(rect.left, rect.top + rect.height),
        toDataPoint(rect.left + rect.width, rect.top + rect.height),
      ].filter((point): point is { x: number; y: number } => point != null);
      if (corners.length === 0) {
        return null;
      }
      return {
        x1: Math.min(...corners.map((point) => point.x)),
        x2: Math.max(...corners.map((point) => point.x)),
        y1: Math.min(...corners.map((point) => point.y)),
        y2: Math.max(...corners.map((point) => point.y)),
      };
    },
    [chartMetrics, toDataPoint],
  );

  const findNearestPoint = useCallback(
    (position: { x: number; y: number }) => {
      if (!chartMetrics || pointPixels.length === 0 || !pointerWithinPlot(position)) {
        return null;
      }
      const maxDistance = 13;
      const maxDistanceSq = maxDistance * maxDistance;
      let best: PointPixel | null = null;
      let bestSq = maxDistanceSq;
      for (const candidate of pointPixels) {
        const dx = candidate.x - position.x;
        const dy = candidate.y - position.y;
        const distSq = dx * dx + dy * dy;
        if (distSq <= bestSq) {
          bestSq = distSq;
          best = candidate;
        }
      }
      if (!best) {
        return null;
      }
      return {
        point: best.point,
        position: { x: best.x, y: best.y },
      };
    },
    [chartMetrics, pointPixels, pointerWithinPlot],
  );

  useEffect(
    () => () => {
      if (animationFrameRef.current != null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    },
    [],
  );


  const boundsToCanvasRect = useCallback(
    (bounds: DataBounds | null): CanvasRect | null => {
      if (!bounds || !chartMetrics) {
        return null;
      }
      const { xDomain, yDomain, xScale, yScale } = chartMetrics;
      const clampedX1 = clamp(bounds.x1, xDomain[0], xDomain[1]);
      const clampedX2 = clamp(bounds.x2, xDomain[0], xDomain[1]);
      const clampedY1 = clamp(bounds.y1, yDomain[0], yDomain[1]);
      const clampedY2 = clamp(bounds.y2, yDomain[0], yDomain[1]);
      const left = xScale(clampedX1);
      const right = xScale(clampedX2);
      const bottom = yScale(clampedY1);
      const top = yScale(clampedY2);
      const width = Math.abs(right - left);
      const height = Math.abs(bottom - top);
      if (width <= 0 || height <= 0) {
        return null;
      }
      return {
        left: Math.min(left, right),
        top: Math.min(top, bottom),
        width,
      height,
    };
    },
    [chartMetrics],
  );


  const totalCount = data.length;
  const displayError = appResolveError ?? error;

  const activeOverlayRect = useMemo(() => {
    if (!dragRect || dragRect.width < 1 || dragRect.height < 1) {
      return null;
    }
    return dragRect;
  }, [dragRect]);

  const activeDataBounds = useMemo(() => {
    if (!dragRect || dragRect.width < 1 || dragRect.height < 1) {
      return null;
    }
    return rectToDataBounds(dragRect);
  }, [dragRect, rectToDataBounds]);

  const highlightBounds = activeDataBounds ?? selectionResult?.bounds ?? null;

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (
        totalCount === 0 ||
        isResolvingApp ||
        loading ||
        displayError ||
        !chartMetrics ||
        event.button !== 0
      ) {
        return;
      }
      const position = getPointerPosition(event);
      if (!position || !pointerWithinPlot(position)) {
        return;
      }
      event.preventDefault();
      const start = clampToPlot(position);
      dragStartRef.current = start;
      setDragRect({ left: start.x, top: start.y, width: 0, height: 0 });
      setSelectionResult(null);
      setHoverState(null);
      setHoveredSeries(null);
      pointerCaptureRef.current = event.pointerId;
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [
      chartMetrics,
      clampToPlot,
      displayError,
      getPointerPosition,
      isResolvingApp,
      loading,
      pointerWithinPlot,
      totalCount,
    ],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!chartMetrics) {
        return;
      }
      const position = getPointerPosition(event);
      if (!position) {
        return;
      }
      const start = dragStartRef.current;
      if (start) {
        const next = clampToPlot(position);
        setDragRect(computeRect(start, next));
        setHoverState(null);
        return;
      }
      setHoverState(findNearestPoint(position));
    },
    [chartMetrics, clampToPlot, computeRect, findNearestPoint, getPointerPosition],
  );

  const handlePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (pointerCaptureRef.current != null) {
        try {
          event.currentTarget.releasePointerCapture(pointerCaptureRef.current);
        } catch {
          // ignore release errors
        }
        pointerCaptureRef.current = null;
      }
      const start = dragStartRef.current;
      if (!start || !chartMetrics) {
        dragStartRef.current = null;
        setDragRect(null);
        return;
      }
      const position = getPointerPosition(event) ?? start;
      const next = clampToPlot(position);
      const rect = computeRect(start, next);
      dragStartRef.current = null;
      setDragRect(null);
      if (rect.width < 2 || rect.height < 2) {
        setSelectionResult(null);
        return;
      }
      const bounds = rectToDataBounds(rect);
      if (!bounds) {
        setSelectionResult(null);
        return;
      }
      const { x1, x2, y1, y2 } = bounds;
      const selected = allPoints.filter(
        (point) =>
          point.timestamp >= x1 &&
          point.timestamp <= x2 &&
          point.loadingTime >= y1 &&
          point.loadingTime <= y2,
      );
      setSelectionResult(selected.length > 0 ? { points: selected, bounds, rect } : null);
    },
    [allPoints, chartMetrics, clampToPlot, computeRect, getPointerPosition, rectToDataBounds],
  );

  const handlePointerLeave = useCallback(() => {
    dragStartRef.current = null;
    setDragRect(null);
    setHoverState(null);
    const id = pointerCaptureRef.current;
    if (id != null) {
      try {
        containerRef.current?.releasePointerCapture(id);
      } catch {
        // ignore release errors
      }
      pointerCaptureRef.current = null;
    }
  }, []);

  const clearSelectionResult = useCallback(() => {
    setSelectionResult(null);
  }, []);

  const handleFooterItemEnter = useCallback((seriesKey: keyof ScatterGroups) => {
    setHoveredSeries(seriesKey);
  }, []);

  const handleFooterItemLeave = useCallback(() => {
    setHoveredSeries(null);
  }, []);

  const xTicks = useMemo(() => {
    if (!timeRange) {
      return undefined;
    }
    const { from, to } = timeRange;
    if (to <= from) {
      return [from, to];
    }

    const span = to - from;
    const plotWidth = chartMetrics?.plotWidth ?? 0;
    const interiorCount = plotWidth < 480 ? 1 : 2;

    const tickSet = new Set<number>();
    tickSet.add(from);
    tickSet.add(to);

    if (interiorCount >= 1) {
      tickSet.add(from + span / 2);
    }
    if (interiorCount >= 2) {
      tickSet.add(from + span / 3);
      tickSet.add(from + (span * 2) / 3);
    }

    return Array.from(tickSet).sort((a, b) => a - b);
  }, [chartMetrics, timeRange]);

  const tooltipInfo = useMemo(() => {
    if (!hoverState || !chartMetrics) {
      return null;
    }
    const { width, height } = chartMetrics;
    const tooltipWidth = 220;
    const tooltipHeight = 120;
    const pointerX = hoverState.position.x;
    const pointerY = hoverState.position.y;
    let left = pointerX + 12;
    if (left + tooltipWidth > width - 8) {
      left = pointerX - tooltipWidth - 12;
    }
    if (left < 8) {
      left = 8;
    }
    let top = pointerY - tooltipHeight - 12;
    if (top < 8) {
      top = pointerY + 12;
      if (top + tooltipHeight > height - 8) {
        top = Math.max(8, height - tooltipHeight - 8);
      }
    }
    return { point: hoverState.point, left, top };
  }, [chartMetrics, hoverState]);

  const renderScene = useCallback(
    (frameTime?: number) => {
      if (!chartMetrics) {
        return;
      }
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return;
      }
      const { width, height, margin, plotWidth, plotHeight, yTicks, xScale, yScale } =
        chartMetrics;
      const dpr = window.devicePixelRatio || 1;
      const scaledWidth = Math.round(width * dpr);
      const scaledHeight = Math.round(height * dpr);
      if (canvas.width !== scaledWidth || canvas.height !== scaledHeight) {
        canvas.width = scaledWidth;
        canvas.height = scaledHeight;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
      }

      const timestamp = frameTime ?? performance.now();
      const buffer = 70;
      const animations = pointAnimationsRef.current;
      for (const id of Array.from(animations.keys())) {
        if (!chartPointMap.has(id)) {
          animations.delete(id);
        }
      }

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.restore();

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.lineCap = "butt";
      ctx.lineJoin = "miter";
      ctx.fillStyle = "transparent";
      ctx.fillRect(0, 0, width, height);

      const highlightRect = boundsToCanvasRect(highlightBounds);
      if (highlightRect) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(
          margin.left - buffer,
          margin.top - buffer,
          plotWidth + buffer * 2,
          plotHeight + buffer * 2,
        );
        ctx.clip();
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = highlightFill;
        ctx.fillRect(highlightRect.left, highlightRect.top, highlightRect.width, highlightRect.height);
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = highlightStroke;
        ctx.strokeRect(highlightRect.left, highlightRect.top, highlightRect.width, highlightRect.height);
        ctx.restore();
      }

      ctx.setLineDash([]);
      ctx.fillStyle = chartTextColor;
      ctx.strokeStyle = axisLineColor;
      ctx.textBaseline = "top";
      ctx.font = "10px 'Inter', 'Noto Sans KR', -apple-system, BlinkMacSystemFont, sans-serif";
      const fromTick = timeRange?.from ?? null;
      const toTick = timeRange?.to ?? null;
      const epsilon = fromTick != null && toTick != null ? Math.max((toTick - fromTick) * 0.001, 1) : 1;
      if (xTicks && xTicks.length > 0) {
        for (const tick of xTicks) {
          const x = xScale(tick);
          if (x < margin.left - buffer || x > margin.left + plotWidth + buffer) {
            continue;
          }

          const isStart = fromTick != null && Math.abs(tick - fromTick) <= epsilon;
          const isEnd = toTick != null && Math.abs(tick - toTick) <= epsilon;
          ctx.beginPath();
          ctx.moveTo(x, margin.top + plotHeight);
          ctx.lineTo(x, margin.top + plotHeight + 4);
          ctx.stroke();

          ctx.textAlign = isStart ? "left" : isEnd ? "right" : "center";
          const labelX = isStart ? x + 2 : isEnd ? x - 2 : x;
          ctx.fillText(formatTickTimestamp(tick), labelX, margin.top + plotHeight + 6);
        }
      }
      ctx.textAlign = "center";

      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      for (const tick of yTicks) {
        const y = yScale(tick);
        ctx.beginPath();
        ctx.moveTo(margin.left, y);
        ctx.lineTo(margin.left + 4, y);
        ctx.stroke();
        ctx.fillText(formatDuration(tick), margin.left - 6, y);
      }

      ctx.save();
      ctx.beginPath();
      ctx.rect(
        margin.left - buffer,
        margin.top - buffer,
        plotWidth + buffer * 2,
        plotHeight + buffer * 2,
      );
      ctx.clip();
      const pointSize = 6;
      let hasActiveAnimation = false;
      for (const series of SERIES_META) {
        const seriesPoints = chartSeries[series.key];
        if (!seriesPoints || seriesPoints.length === 0) {
          continue;
        }
        const strokeColor = series.stroke ?? series.color;
        const isDimmed = hoveredSeries != null && hoveredSeries !== series.key;
        const dimFactor = isDimmed ? 0.25 : 1;
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = series.shape === "cross" ? 1.4 : 1;
        const targetFill = series.shape === "cross" ? null : series.color;
        const baseAlpha = series.shape === "cross" ? 1 : series.fillOpacity ?? 0.85;
        for (const point of seriesPoints) {
          const finalX = xScale(point.timestamp);
          const finalY = yScale(point.loadingTime);
          const animation = animations.get(point.id);
          let currentX = finalX;
          let currentY = finalY;
          if (animation) {
            const progress = (timestamp - animation.startTime) / animation.duration;
            if (progress >= 1) {
              animations.delete(point.id);
            } else {
              hasActiveAnimation = true;
              const eased = easeOutCubic(progress);
              currentX = animation.startX + (finalX - animation.startX) * eased;
              currentY = animation.startY + (finalY - animation.startY) * eased;
            }
          }

          const half = pointSize / 2;
          if (series.shape === "cross") {
            ctx.globalAlpha = dimFactor;
            ctx.beginPath();
            ctx.moveTo(currentX - half, currentY - half);
            ctx.lineTo(currentX + half, currentY + half);
            ctx.moveTo(currentX - half, currentY + half);
            ctx.lineTo(currentX + half, currentY - half);
            ctx.stroke();
          } else {
            const currentAlpha = baseAlpha * dimFactor;
            ctx.globalAlpha = currentAlpha;
            ctx.fillStyle = targetFill!;
            ctx.fillRect(currentX - half, currentY - half, pointSize, pointSize);
            ctx.globalAlpha = Math.max(0.25, dimFactor);
            ctx.strokeRect(currentX - half, currentY - half, pointSize, pointSize);
          }
        }
        ctx.globalAlpha = 1;
      }
      ctx.globalAlpha = 1;
      ctx.restore();

      if (hoverState) {
        const hoverDimmed =
          hoveredSeries != null && hoverState.point.group !== hoveredSeries ? 0.3 : 1;
        ctx.strokeStyle = focusStroke;
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.globalAlpha = 0.6 * hoverDimmed;
        ctx.beginPath();
        ctx.arc(hoverState.position.x, hoverState.position.y, 7, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.setLineDash([]);
      ctx.strokeStyle = axisLineColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(margin.left, margin.top + plotHeight);
      ctx.lineTo(margin.left + plotWidth, margin.top + plotHeight);
      ctx.stroke();

      ctx.restore();

      if (hasActiveAnimation) {
        if (animationFrameRef.current == null) {
          animationFrameRef.current = requestAnimationFrame((nextTime) => {
            animationFrameRef.current = null;
            renderScene(nextTime);
          });
        }
      }
    },
    [
      axisLineColor,
      boundsToCanvasRect,
      chartMetrics,
      chartSeries,
      chartPointMap,
      chartTextColor,
      focusStroke,
      highlightBounds,
      highlightFill,
      highlightStroke,
      hoverState,
      hoveredSeries,
      timeRange,
      xTicks,
    ],
  );

  const requestRender = useCallback(() => {
    if (animationFrameRef.current != null) {
      return;
    }
    animationFrameRef.current = requestAnimationFrame((frameTime) => {
      animationFrameRef.current = null;
      renderScene(frameTime);
    });
  }, [renderScene]);

  useEffect(() => {
    if (!chartMetrics) {
      pointAnimationsRef.current.clear();
      previousPointIdsRef.current = new Set();
      return;
    }

    const currentIds = new Set(data.map((item) => item.id));
    const previousIds = previousPointIdsRef.current;
    const animations = pointAnimationsRef.current;
    const now = performance.now();
    let added = false;

    const { margin, plotWidth, plotHeight } = chartMetrics;
    const randomOffset = (range: number) => (Math.random() * 2 - 1) * range;
    const clampY = (value: number) =>
      clamp(value, margin.top - plotHeight * 0.15, margin.top + plotHeight + plotHeight * 0.15);
    const clampX = (value: number) =>
      clamp(value, margin.left - plotWidth * 0.15, margin.left + plotWidth + plotWidth * 0.15);

    for (const id of currentIds) {
      if (previousIds.has(id)) {
        continue;
      }
      const chartPoint = chartPointMap.get(id);
      if (!chartPoint) {
        continue;
      }
      const finalX = chartMetrics.xScale(chartPoint.timestamp);
      const finalY = chartMetrics.yScale(chartPoint.loadingTime);
      const direction = Math.floor(Math.random() * 4);
      let startX = finalX;
      let startY = finalY;
      switch (direction) {
        case 0:
          startX = margin.left - 60;
          startY = clampY(finalY + randomOffset(plotHeight * 0.3));
          break;
        case 1:
          startX = margin.left + plotWidth + 60;
          startY = clampY(finalY + randomOffset(plotHeight * 0.3));
          break;
        case 2:
          startX = clampX(finalX + randomOffset(plotWidth * 0.3));
          startY = margin.top - 60;
          break;
        default:
          startX = clampX(finalX + randomOffset(plotWidth * 0.3));
          startY = margin.top + plotHeight + 60;
          break;
      }

      animations.set(id, {
        startX,
        startY,
        startTime: now,
        duration: 600 + Math.random() * 250,
      });
      added = true;
    }

    previousPointIdsRef.current = currentIds;

    if (added) {
      requestRender();
    } else {
      requestRender();
    }
  }, [chartMetrics, chartPointMap, data, requestRender]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const handleResize = () => {
      const node = containerRef.current;
      if (!node) {
        return;
      }
      updateCanvasSize(node);
      requestRender();
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [requestRender, updateCanvasSize]);

  useEffect(() => {
    requestRender();
  }, [requestRender, chartMetrics, chartSeries, highlightBounds, hoverState, hoveredSeries, xTicks]);

  const finalOverlayRect = selectionResult?.rect ?? null;

  return (
    <div className={`rt-widget${isDarkMode ? " rt-widget--dark" : ""}`}>
      <header className="rt-widget__header">
        <div className="rt-widget__title-group">
          <h3 className="rt-widget__title">Loading Time (S)</h3>
          <img
            src="/images/maxy/ic-question-grey-blue.svg"
            alt="도움말"
            className="rt-widget__help"
          />
        </div>
        <span className="rt-widget__timestamp">
          {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : "-"}
        </span>
      </header>

      {(isResolvingApp || loading) && (
        <p className="rt-widget__status">데이터를 불러오고 있습니다.</p>
      )}
      {!isResolvingApp && !loading && displayError && (
        <p className="rt-widget__error">{displayError}</p>
      )}

      {!isResolvingApp && !loading && !displayError && (
        <div
          ref={setContainerNode}
          className="rt-widget__chart"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          onPointerCancel={handlePointerLeave}
        >
          <canvas ref={canvasRef} className="rt-widget__canvas" />
          {tooltipInfo && (
            <div
              className="rt-tooltip"
              style={{ left: `${tooltipInfo.left}px`, top: `${tooltipInfo.top}px` }}
            >
              <strong>{formatTooltipTimestamp(tooltipInfo.point.timestamp)}</strong>
              <dl>
                <div>
                  <dt>Loading Time</dt>
                  <dd>{formatDuration(tooltipInfo.point.loadingTime)}</dd>
                </div>
                <div>
                  <dt>디바이스</dt>
                  <dd>{tooltipInfo.point.deviceModel}</dd>
                </div>
                <div>
                  <dt>URL</dt>
                  <dd className="rt-url">{tooltipInfo.point.reqUrl}</dd>
                </div>
              </dl>
            </div>
          )}
          {activeOverlayRect && (
            <div
              className="rt-selection-overlay is-active"
              style={{
                left: `${activeOverlayRect.left}px`,
                top: `${activeOverlayRect.top}px`,
                width: `${activeOverlayRect.width}px`,
                height: `${activeOverlayRect.height}px`,
              }}
            />
          )}
          {finalOverlayRect && (
            <div
              className="rt-selection-overlay is-final"
              style={{
                left: `${finalOverlayRect.left}px`,
                top: `${finalOverlayRect.top}px`,
                width: `${finalOverlayRect.width}px`,
                height: `${finalOverlayRect.height}px`,
              }}
            />
          )}
        </div>
      )}

      {selectionResult && selectionResult.points.length > 0 && (
        <SelectionPopup
          points={selectionResult.points}
          onClose={clearSelectionResult}
          isDarkMode={isDarkMode}
          onShowPerformance={handleShowPerformance}
          isWaterfallOpen={isWaterfallOpen}
          waterfallPoint={waterfallPoint}
          waterfallData={waterfallData}
          waterfallLoading={waterfallLoading}
          waterfallError={waterfallError}
          onCloseWaterfall={handleCloseWaterfall}
          isEventTimeLineOpen={isEventTimeLineOpen}
          eventTimeLinePoint={eventTimeLinePoint}
          eventTimeLineData={eventTimeLineData}
          eventTimeLineLoading={eventTimeLineLoading}
          eventTimeLineError={eventTimeLineError}
          onCloseEventTimeLine={handleCloseEventTimeLine}
        />
      )}

      <footer className="rt-widget__footer">
        {SERIES_META.map((series) => {
          const count = groups[series.key].length;
          const markerStyle = {
            "--marker-color": series.stroke ?? series.color,
            "--marker-fill": series.shape === "cross" ? "transparent" : series.color,
          } as CSSProperties;
          const isDimmed = hoveredSeries != null && hoveredSeries !== series.key;
          const isActive = hoveredSeries === series.key;
          const itemClass =
            "rt-footer-item" +
            (isActive ? " is-active" : "") +
            (isDimmed ? " is-dimmed" : "");

          return (
            <span
              key={series.key}
              className={itemClass}
              onMouseEnter={() => handleFooterItemEnter(series.key)}
              onMouseLeave={handleFooterItemLeave}
            >
              <span
                className={`rt-footer-marker${series.shape === "cross" ? " is-cross" : ""}`}
                style={markerStyle}
              />
              <span className="rt-footer-label">
                {series.name} <strong>{formatNumber(count)}</strong>
              </span>
            </span>
          );
        })}
      </footer>
    </div>
  );
}

type SelectionPopupProps = {
  points: ChartPoint[];
  onClose: () => void;
  isDarkMode: boolean;
  onShowPerformance(point: ChartPoint): void;
  isWaterfallOpen: boolean;
  waterfallPoint: ChartPoint | null;
  waterfallData: WaterfallDetailResponse | null;
  waterfallLoading: boolean;
  waterfallError: string | null;
  onCloseWaterfall(): void;
  isEventTimeLineOpen: boolean;
  eventTimeLinePoint: ChartPoint | null;
  eventTimeLineData: EventTimeLineResponse | null;
  eventTimeLineLoading: boolean;
  eventTimeLineError: string | null;
  onCloseEventTimeLine(): void;
};

function SelectionPopup({
  points,
  onClose,
  isDarkMode,
  onShowPerformance,
  isWaterfallOpen,
  waterfallPoint,
  waterfallData,
  waterfallLoading,
  waterfallError,
  onCloseWaterfall,
  isEventTimeLineOpen,
  eventTimeLinePoint,
  eventTimeLineData,
  eventTimeLineLoading,
  eventTimeLineError,
  onCloseEventTimeLine,
}: SelectionPopupProps) {
  const orderedByLoading = useMemo(
    () => [...points].sort((a, b) => b.loadingTime - a.loadingTime),
    [points],
  );
  const loadingStats = useMemo(
    () => computeNumericStats(orderedByLoading, (point) => point.loadingTime),
    [orderedByLoading],
  );
  const tablePoints = orderedByLoading;
  const isTruncated = false;

  const [sortConfig, setSortConfig] = useState<SortConfig | null>({
    key: "time",
    direction: "desc",
  });
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const tableWrapRef = useRef<HTMLDivElement>(null);
  const eventTimeLineRef = useRef<HTMLDivElement | null>(null);
  const waterfallRef = useRef<HTMLDivElement | null>(null);
  const [waterfallOffsets, setWaterfallOffsets] = useState<{
    top: number;
    bottom: number;
    left: number;
    width: number;
  }>({
    top: 0,
    bottom: 0,
    left: 0,
    width: 0,
  });

  const getSortValue = useCallback((point: ChartPoint, key: SortKey) => {
    switch (key) {
      case "time":
        return point.loadingTime ?? null;
      case "feeldex":
        return point.avgComSensitivity ?? point.comSensitivity ?? null;
      case "device":
        return point.deviceId || point.deviceModel || "";
      case "user":
        return point.userId || point.userNm || point.clientNm || "";
      case "timestamp":
        return point.timestamp ?? null;
      case "network":
        return point.comType || "";
      case "url":
        return point.reqUrl || "";
      default:
        return null;
    }
  }, []);

  const displayPoints = useMemo(() => {
    const base = [...tablePoints];
    if (!sortConfig) {
      return base;
    }

    const { key, direction } = sortConfig;
    const multiplier = direction === "asc" ? 1 : -1;

    base.sort((a, b) => {
      const aValue = getSortValue(a, key);
      const bValue = getSortValue(b, key);

      if (aValue == null && bValue == null) {
        return 0;
      }
      if (aValue == null) {
        return 1;
      }
      if (bValue == null) {
        return -1;
      }

      if (typeof aValue === "number" && typeof bValue === "number") {
        if (aValue === bValue) return 0;
        return aValue > bValue ? multiplier : -multiplier;
      }

      const aText = String(aValue).toLowerCase();
      const bText = String(bValue).toLowerCase();
      if (aText === bText) return 0;
      return aText > bText ? multiplier : -multiplier;
    });

    return base;
  }, [getSortValue, sortConfig, tablePoints]);

  useLayoutEffect(() => {
    const popupEl = popupRef.current;
    const tableEl = tableWrapRef.current;
    if (!popupEl || !tableEl) {
      return;
    }

    const computeOffsets = () => {
      const popupRect = popupEl.getBoundingClientRect();
      const tableRect = tableEl.getBoundingClientRect();
      const left = Math.min(Math.max(0, WATERFALL_LEFT_OFFSET), Math.max(0, popupRect.width));
      const availableWidth = Math.max(0, popupRect.width - left);
      const width = availableWidth;

      setWaterfallOffsets({
        top: Math.max(0, tableRect.top - popupRect.top),
        bottom: 0,
        left,
        width,
      });
    };

    let rafId: number | null = null;
    const handleResize = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      rafId = requestAnimationFrame(() => {
        rafId = null;
        computeOffsets();
      });
    };

    computeOffsets();
    window.addEventListener("resize", handleResize);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(popupEl);
      resizeObserver.observe(tableEl);
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      resizeObserver?.disconnect();
    };
  }, [displayPoints.length, isEventTimeLineOpen, isWaterfallOpen]);

  useEffect(() => {
    if (waterfallPoint) {
      setSelectedPointId(waterfallPoint.id);
      return;
    }
    if (eventTimeLinePoint) {
      setSelectedPointId(eventTimeLinePoint.id);
    }
  }, [eventTimeLinePoint, waterfallPoint]);

  const handlePopupPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!isWaterfallOpen && !isEventTimeLineOpen) {
        return;
      }
      const target = event.target as Node;
      if (tableWrapRef.current) {
        const tableBody = tableWrapRef.current.querySelector("tbody");
        if (tableBody && tableBody.contains(target)) {
          return;
        }
      }
      if (waterfallRef.current && waterfallRef.current.contains(target)) {
        return;
      }
      if (eventTimeLineRef.current && eventTimeLineRef.current.contains(target)) {
        return;
      }
      if (isWaterfallOpen) {
        onCloseWaterfall();
        return;
      }
      if (isEventTimeLineOpen) {
        onCloseEventTimeLine();
      }
    },
    [isEventTimeLineOpen, isWaterfallOpen, onCloseEventTimeLine, onCloseWaterfall],
  );

  const handleScrimClick = useCallback(() => {
    if (isWaterfallOpen) {
      onCloseWaterfall();
      return;
    }
    if (isEventTimeLineOpen) {
      onCloseEventTimeLine();
      return;
    }
    onClose();
  }, [isEventTimeLineOpen, isWaterfallOpen, onClose, onCloseEventTimeLine, onCloseWaterfall]);

  useEffect(() => {
    if (!selectedPointId) {
      return;
    }
    if (!displayPoints.some((point) => point.id === selectedPointId)) {
      setSelectedPointId(null);
    }
  }, [displayPoints, selectedPointId]);

  const activePoint = useMemo(() => {
    if (selectedPointId) {
      const match = displayPoints.find((point) => point.id === selectedPointId);
      if (match) {
        return match;
      }
    }
    return displayPoints[0] ?? null;
  }, [displayPoints, selectedPointId]);

  const urlSummary = useMemo(() => {
    if (!activePoint) {
      return summarizeStringField(points, (point) => point.reqUrl);
    }
    return {
      display: activePoint.reqUrl ?? "-",
      values: activePoint.reqUrl ? [activePoint.reqUrl] : [],
      hasMultiple: false,
    };
  }, [activePoint, points]);

  const selectedLoadingTime = useMemo(() => {
    if (!activePoint) {
      return null;
    }
    return formatDuration(activePoint.loadingTime ?? Number.NaN);
  }, [activePoint]);

  const detailBadges = useMemo<MetaBadge[]>(() => {
    if (!activePoint) {
      return [];
    }
    const badges: MetaBadge[] = [];
    const device = activePoint.deviceModel || activePoint.deviceId;
    if (device) {
      badges.push({
        key: "device",
        label: device,
        iconPath: ICON_PATHS.device,
      });
    }
    if (activePoint.appVer) {
      badges.push({
        key: "appVer",
        label: activePoint.appVer,
        iconPath: ICON_PATHS.app,
      });
    }
    if (activePoint.osType) {
      badges.push({
        key: "os",
        label: activePoint.osType,
        iconPath: resolveOsIcon(activePoint.osType),
      });
    }
    if (activePoint.comType) {
      badges.push({
        key: "network",
        label: activePoint.comType,
        iconPath: ICON_PATHS.network,
      });
    }
    if (activePoint.simOperatorNm) {
      badges.push({
        key: "carrier",
        label: activePoint.simOperatorNm,
        iconPath: ICON_PATHS.carrier,
      });
    }
    const anyPoint = activePoint as Record<string, unknown>;
    const location =
      (anyPoint.timeZone as string | null | undefined) ??
      (anyPoint.location as string | null | undefined) ??
      (anyPoint.region as string | null | undefined) ??
      (anyPoint.areaNm as string | null | undefined) ??
      null;
    if (location) {
      badges.push({
        key: "location",
        label: String(location),
        iconPath: ICON_PATHS.location,
      });
    }
    const userLabel = activePoint.userId || activePoint.userNm || activePoint.clientNm;
    if (userLabel) {
      badges.push({
        key: "user",
        label: userLabel,
        iconPath: ICON_PATHS.user,
      });
    }
    return badges;
  }, [activePoint]);

  const feeldexInfo = useCallback((value: number | null | undefined) => {
    if (value == null || Number.isNaN(Number(value))) {
      return null;
    }
    const numeric = Number(value);
    if (numeric >= 0.8) return { level: "great", label: "Very Good", iconPath: FEELDEX_ICON_PATHS.great };
    if (numeric >= 0.6) return { level: "good", label: "Good", iconPath: FEELDEX_ICON_PATHS.good };
    if (numeric >= 0.4) return { level: "soso", label: "Normal", iconPath: FEELDEX_ICON_PATHS.soso };
    if (numeric >= 0.2) return { level: "bad", label: "Bad", iconPath: FEELDEX_ICON_PATHS.bad };
    return { level: "awful", label: "Awful", iconPath: FEELDEX_ICON_PATHS.awful };
  }, []);

  const highlightedId = loadingStats.maxSource?.id ?? null;
  const themeClass = isDarkMode ? " lt-popup-native--dark" : "";

  const toggleSort = useCallback((key: SortKey) => {
    setSortConfig((previous) => {
      if (!previous || previous.key !== key) {
        return { key, direction: key === "time" ? "desc" : "asc" };
      }
      return { key, direction: previous.direction === "asc" ? "desc" : "asc" };
    });
  }, []);

  const renderSortIndicator = useCallback(
    (key: SortKey) => {
      const isActive = sortConfig?.key === key;
      const direction: SortConfig["direction"] =
        isActive && sortConfig ? sortConfig.direction : key === "time" ? "desc" : "asc";
      const symbol = direction === "asc" ? "▲" : "▼";
      return (
        <span
          className={`lt-popup-native__sort-indicator${isActive ? " is-active" : ""}`}
          aria-hidden="true"
        >
          <span className="lt-popup-native__sort-triangle">{symbol}</span>
        </span>
      );
    },
    [sortConfig],
  );

  const rowKeyCounts = new Map<string, number>();

  return (
    <>
      <button
        type="button"
        className="lt-popup__scrim"
        aria-label="Loading Time 상세 팝업 닫기"
        onClick={handleScrimClick}
      />
      <div
        ref={popupRef}
        className={`lt-popup-native${themeClass}`}
        role="dialog"
        aria-modal="true"
        aria-live="polite"
        aria-label="Loading Time 상세 팝업"
        onPointerDown={handlePopupPointerDown}
      >
        <header className="lt-popup-native__header">
          <div className="lt-popup-native__title">
            <span className="lt-popup-native__title-prefix">Profiling/</span>
            <span className="lt-popup-native__title-main">Loading Time</span>
            <span className="lt-popup-native__count">({formatNumber(points.length)})</span>
            <div className="lt-popup-native__meta-chips">
              {detailBadges.map((badge, index) => (
                <span
                  key={badge.key}
                  className={`lt-popup-native__meta-chip${index === 0 ? " lt-popup-native__meta-chip--first" : ""}`}
                  title={badge.title ?? badge.label}
                >
                  <img src={badge.iconPath} alt="" aria-hidden="true" className="lt-popup-native__meta-icon" />
                  <span>{badge.label}</span>
                </span>
              ))}
            </div>
          </div>
          <div className="lt-popup-native__subtitle">
            <span className="lt-popup-native__url" title={urlSummary.title ?? urlSummary.display}>
              {urlSummary.values.length > 0 ? urlSummary.display : "-"}
            </span>
            {selectedLoadingTime ? (
              <span className="lt-popup-native__range">⏱ {selectedLoadingTime}</span>
            ) : null}
          </div>
        </header>
        <div className="lt-popup-native__table-wrap" ref={tableWrapRef}>
          <div
            className="lt-popup-native__table-scroll"
            role="region"
            aria-label="선택된 로딩 로그 목록"
          >
            <table className="lt-popup-native__table">
              <thead>
                <tr>
                  <th scope="col">
                    <button
                      type="button"
                      className="lt-popup-native__sort"
                      onClick={() => toggleSort("time")}
                    >
                      Time {renderSortIndicator("time")}
                    </button>
                  </th>
                  <th scope="col">
                    <button
                      type="button"
                      className="lt-popup-native__sort"
                      onClick={() => toggleSort("feeldex")}
                    >
                      Feeldex {renderSortIndicator("feeldex")}
                    </button>
                  </th>
                  <th scope="col">
                    <button
                      type="button"
                      className="lt-popup-native__sort"
                      onClick={() => toggleSort("device")}
                    >
                      Device ID {renderSortIndicator("device")}
                    </button>
                  </th>
                  <th scope="col">
                    <button
                      type="button"
                      className="lt-popup-native__sort"
                      onClick={() => toggleSort("user")}
                    >
                      User ID {renderSortIndicator("user")}
                    </button>
                  </th>
                  <th scope="col">
                    <button
                      type="button"
                      className="lt-popup-native__sort"
                      onClick={() => toggleSort("timestamp")}
                    >
                      Time Stamp {renderSortIndicator("timestamp")}
                    </button>
                  </th>
                  <th scope="col">
                    <button
                      type="button"
                      className="lt-popup-native__sort"
                      onClick={() => toggleSort("network")}
                    >
                      Network {renderSortIndicator("network")}
                    </button>
                  </th>
                  <th scope="col">
                    <button
                      type="button"
                      className="lt-popup-native__sort"
                      onClick={() => toggleSort("url")}
                    >
                      Page URL {renderSortIndicator("url")}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayPoints.map((point) => {
                  const info = feeldexInfo(point.avgComSensitivity ?? point.comSensitivity ?? null);
                  const isSelected = selectedPointId === point.id;
                  const baseRowKey = [
                    point.id,
                    point.timestamp ?? point.pageStartTm ?? point.logTm ?? point.pageEndTm ?? "",
                    point.loadingTime ?? "",
                    point.reqUrl ?? "",
                    point.deviceId ?? point.deviceModel ?? "",
                  ]
                    .filter((value) => String(value).length > 0)
                    .join("|");
                  const duplicateCount = rowKeyCounts.get(baseRowKey) ?? 0;
                  rowKeyCounts.set(baseRowKey, duplicateCount + 1);
                  const rowKey =
                    duplicateCount === 0 ? baseRowKey : `${baseRowKey}|${duplicateCount}`;
                  const rowClassName =
                    "lt-popup-native__row" +
                    (point.id === highlightedId ? " lt-popup-native__row--highlight" : "") +
                    (isSelected ? " lt-popup-native__row--selected" : "") +
                    (point.wtfFlag ? " lt-popup-native__row--alert" : "");
                  return (
                  <tr
                    key={rowKey}
                    className={rowClassName}
                    onClick={() => {
                      setSelectedPointId(point.id);
                      onShowPerformance(point);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedPointId(point.id);
                        onShowPerformance(point);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                  >
                      <td>{formatDuration(point.loadingTime)}</td>
                      <td>
                        {info ? (
                          <span className={`lt-popup-native__feeldex lt-popup-native__feeldex--${info.level}`}>
                            <img
                              src={info.iconPath}
                              alt=""
                              aria-hidden="true"
                              className="lt-popup-native__feeldex-icon"
                            />
                            <span className="sr-only">{info.label}</span>
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td>{point.deviceId || point.deviceModel || "-"}</td>
                      <td>{point.userId || point.userNm || "-"}</td>
                      <td>{formatTooltipTimestamp(point.timestamp)}</td>
                      <td>
                        <span className="lt-popup-native__network">
                          <i className="icon_network_type" aria-hidden="true" />
                          <span>{formatNetworkLabel(point.comType)}</span>
                        </span>
                      </td>
                      <td className="lt-popup-native__cell-url" title={point.reqUrl}>
                        {point.reqUrl}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {isTruncated ? (
            <div className="lt-popup-native__table-hint">
              총 {formatNumber(points.length)}건 중 상위 {formatNumber(tablePoints.length)}건만 표시됩니다.
            </div>
          ) : null}
        </div>
        <Waterfall
          visible={isWaterfallOpen}
          point={waterfallPoint}
          onClose={onCloseWaterfall}
          data={waterfallData}
          loading={waterfallLoading}
          error={waterfallError}
          isDarkMode={isDarkMode}
          offsets={waterfallOffsets}
          containerRef={waterfallRef}
        />
        <EventTimeLine
          visible={isEventTimeLineOpen}
          point={eventTimeLinePoint}
          onClose={onCloseEventTimeLine}
          data={eventTimeLineData}
          loading={eventTimeLineLoading}
          error={eventTimeLineError}
          isDarkMode={isDarkMode}
          offsets={waterfallOffsets}
          containerRef={eventTimeLineRef}
        />
      </div>
    </>
  );
}
