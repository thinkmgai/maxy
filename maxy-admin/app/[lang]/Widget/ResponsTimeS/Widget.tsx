"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { useUserSettings } from "../../../../components/usersettings/UserSettingsProvider";
import { AppList, type ApplicationSummary } from "../../../api/AppList";
import {
  getResponseTimeScatter,
  getResponseTimeDetail,
  type ResponseTimeScatterPoint,
  type ResponseTimeDetail as ResponseTimeDetailData,
} from "../../../api/Widget/ResponsTimeS";
import { useTheme } from "../../../../components/theme/ThemeProvider";

import "./style.css";

type ScatterGroups = {
  warning: ResponseTimeScatterPoint[];
  high: ResponseTimeScatterPoint[];
  normal: ResponseTimeScatterPoint[];
  low: ResponseTimeScatterPoint[];
};

type ChartPoint = ResponseTimeScatterPoint & {
  timestamp: number;
  responseTime: number;
  group: keyof ScatterGroups;
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
const DEFAULT_LIMIT = 1200;
const REFRESH_INTERVAL_MS = 2000;
const EXIT_DELAY = 320;

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

const LOG_TYPE_GROUP_MAP: Record<number, string> = {
  131073: "WebNavigation",
  131074: "WebNavigation",
  131075: "WebNavigation",
  131076: "WebNavigation",
  131077: "WebNavigation",
  131078: "WebNavigation",
  131088: "WebNavigation",
  131089: "WebNavigation",
  131105: "WebNavigation",
  131108: "WebNavigation",
  524289: "HttpRequest",
  524291: "HttpRequest",
  524292: "HttpRequest",
  524293: "HttpRequest",
  1048577: "NativeAction",
  1048578: "NativeAction",
  1048579: "NativeAction",
  1048580: "NativeAction",
  1048581: "NativeAction",
  1048582: "NativeAction",
  1048583: "NativeAction",
  1048592: "NativeAction",
  1048593: "NativeAction",
  1048595: "NativeClick",
  2097152: "Native",
  4194306: "Custom Tag",
  8388610: "Ajax",
  8388611: "Ajax",
  8388612: "Ajax",
  8388613: "Ajax",
  8388614: "Ajax",
};

function getLogTypeGroupName(value: unknown): string {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "-";
  return LOG_TYPE_GROUP_MAP[numeric] ?? String(value);
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

function formatDuration(value: number): string {
  if (!Number.isFinite(value)) return "-";
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}s`;
  }
  return `${Math.round(value)}ms`;
}

function formatBytes(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(Number(value))) return "-";
  const bytes = Math.max(0, Number(value));
  const units = ["B", "KB", "MB", "GB"] as const;
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  const precision = unitIndex === 0 ? 0 : size >= 10 ? 1 : 2;
  return `${size.toFixed(precision)}${units[unitIndex]}`;
}

function formatMem(type: "kb" | "mb", value: number | null | undefined): string {
  if (value == null) return "-";
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return "-";
  const converted = numeric / 1024;
  const fixed = converted.toFixed(1);
  return type === "kb" ? `${fixed}MB` : `${fixed}GB`;
}

function percent(numerator: number | null | undefined, denominator: number | null | undefined): number | null {
  if (numerator == null || denominator == null) return null;
  const num = Number(numerator);
  const den = Number(denominator);
  if (!Number.isFinite(num) || !Number.isFinite(den) || den <= 0) return null;
  const result = Math.round((num / den) * 100);
  if (!Number.isFinite(result)) return 0;
  return Math.min(100, Math.max(0, result));
}

function convertCaToComma(value: string | null | undefined, fallback = "-"): string {
  if (value == null) return fallback;
  const text = String(value);
  if (!text.trim()) return fallback;
  return text.includes("^") ? text.replaceAll("^", ",") : text;
}

async function copyToClipboard(text: string): Promise<void> {
  if (typeof window === "undefined") return;
  const value = String(text ?? "");
  if (!value) return;

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
      return;
    }
  } catch {
    // fallback below
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "0";
  textarea.style.left = "-9999px";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);
  try {
    document.execCommand("copy");
  } finally {
    document.body.removeChild(textarea);
  }
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

function categorize(points: ResponseTimeScatterPoint[], limit: number): ScatterGroups {
  const sorted = [...points].sort((a, b) => b.intervaltime - a.intervaltime);
  const groups: ScatterGroups = {
    warning: [],
    high: [],
    normal: [],
    low: [],
  };

  const safeTotal = sorted.reduce(
    (acc, point) => (point.intervaltime >= limit ? acc : acc + 1),
    0,
  );
  const highCutoff = Math.ceil(safeTotal * 0.3);
  const normalCutoff = Math.ceil(safeTotal * 0.7);

  let cursor = 0;
  for (const point of sorted) {
    if (point.intervaltime >= limit) {
      groups.warning.push(point);
      continue;
    }

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
    groups[group].map((point) => {
      const timestamp: number = point.logTm ?? 0;
      const responseTime: number = point.intervaltime ?? 0;
      return {
        ...point,
        timestamp,
        responseTime,
        group,
      };
    });

  return {
    warning: mapPoint("warning"),
    high: mapPoint("high"),
    normal: mapPoint("normal"),
    low: mapPoint("low"),
  };
}

/** Response time scatter widget for the 대시보드 영역. */
export default function ResponseTimeScatterWidget() {
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
      highlightStroke: isDarkMode ? "#f87272" : "#ef4444",
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

  const [data, setData] = useState<ResponseTimeScatterPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [resolvedApplicationId, setResolvedApplicationId] = useState<number>(
    applicationId > 0 ? applicationId : 0,
  );
  const afterKeyRef = useRef<number | null>(null);
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
  const [hoverState, setHoverState] = useState<HoverState>(null);
  const [hoveredSeries, setHoveredSeries] = useState<keyof ScatterGroups | null>(null);
  const refreshTimerRef = useRef<number | null>(null);
  const lastFetchToRef = useRef<number | null>(null);
  const activeFetchControllerRef = useRef<AbortController | null>(null);
  const pointAnimationsRef = useRef<Map<string, PointAnimation>>(new Map());
  const previousPointIdsRef = useRef<Set<string>>(new Set());
  const animationFrameRef = useRef<number | null>(null);

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
  }, []);

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
      const previousTo = lastFetchToRef.current;
      let from: number;
      if (mode === "initial") {
        // 첫 요청은 전체(5분 내) 구간을 가져오기 위해 0으로 전달
        from = 0;
        afterKeyRef.current = null;
      } else if (previousTo == null) {
        from = afterKeyRef.current ?? Math.max(0, clampedTo - WINDOW_MS);
      } else {
        from = afterKeyRef.current ?? Math.max(0, Math.min(previousTo, clampedTo));
      }
      if (!Number.isFinite(from) || from < 0) {
        from = Math.max(0, clampedTo - WINDOW_MS);
      }

      try {
        const { list, afterKey } = await getResponseTimeScatter(
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
        } else {
          // afterKey가 내려오지 않아도 동일한 0 요청을 반복하지 않도록 현재 조회 상한을 저장
          afterKeyRef.current = clampedTo;
        }

        const effectiveTo = clampedTo;
        lastFetchToRef.current = effectiveTo;
        const cutoff = Math.max(0, effectiveTo - WINDOW_MS);

        setData((prev) => {
          if (mode === "initial") {
            return list
              .filter((item) => (item.logTm ?? 0) >= cutoff)
              .sort((a, b) => (a.logTm ?? 0) - (b.logTm ?? 0));
          }
          const merged = new Map<string, ResponseTimeScatterPoint>();
          for (const item of prev) {
            const safeLogTm = item.logTm ?? 0;
            if (safeLogTm >= cutoff) {
              merged.set(item.id, { ...item, logTm: safeLogTm });
            }
          }
          for (const item of list) {
            const safeLogTm = item.logTm ?? 0;
            if (safeLogTm >= cutoff) {
              merged.set(item.id, { ...item, logTm: safeLogTm });
            }
          }
          return Array.from(merged.values()).sort(
            (a, b) => (a.logTm ?? 0) - (b.logTm ?? 0),
          );
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
    };
  }, [fetchAndUpdate, resolvedApplicationId]);

  const groups = useMemo(() => categorize(data, DEFAULT_LIMIT), [data]);
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
    let maxResponseTime = 0;
    for (const point of allPoints) {
      if (point.timestamp < minTime) {
        minTime = point.timestamp;
      }
      if (point.timestamp > maxTime) {
        maxTime = point.timestamp;
      }
      if (point.responseTime > maxResponseTime) {
        maxResponseTime = point.responseTime;
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
    const { ticks: rawYTicks, upper } = computeYAxis(maxResponseTime);
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
      y: chartMetrics.yScale(point.responseTime),
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
          point.responseTime >= y1 &&
          point.responseTime <= y2,
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
          const finalY = yScale(point.responseTime);
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
      const finalY = chartMetrics.yScale(chartPoint.responseTime);
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
          <h3 className="rt-widget__title">Response Time (S)</h3>
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
                  <dt>Response Time</dt>
                  <dd>{formatDuration(tooltipInfo.point.responseTime)}</dd>
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

type SortKey = "time" | "feeldex" | "device" | "timestamp" | "network" | "url";

type SortConfig = {
  key: SortKey;
  direction: "asc" | "desc";
};

type SelectionPopupProps = {
  points: ChartPoint[];
  onClose: () => void;
  isDarkMode: boolean;
};

function SelectionPopup({ points, onClose, isDarkMode }: SelectionPopupProps) {
  const [isPopupVisible, setPopupVisible] = useState(false);
  const closeTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setPopupVisible(true);
    return () => {
      if (closeTimeoutRef.current != null) {
        window.clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  const orderedByResponse = useMemo(
    () => [...points].sort((a, b) => b.responseTime - a.responseTime),
    [points],
  );

  const responseFeeldexThresholds = useMemo(() => {
    if (!orderedByResponse.length) {
      return null;
    }
    const ascending = [...orderedByResponse].sort((a, b) => a.responseTime - b.responseTime);
    const quantile = (q: number) => {
      if (!ascending.length) return null;
      const index = Math.min(ascending.length - 1, Math.max(0, Math.floor((ascending.length - 1) * q)));
      return ascending[index]?.responseTime ?? null;
    };
    return {
      q20: quantile(0.2),
      q40: quantile(0.4),
      q60: quantile(0.6),
      q80: quantile(0.8),
    };
  }, [orderedByResponse]);

  const feeldexInfo = useCallback(
    (point: ChartPoint) => {
      if (!responseFeeldexThresholds) {
        return null;
      }
      const value = point.responseTime;
      if (!Number.isFinite(value)) {
        return null;
      }
      const { q20, q40, q60, q80 } = responseFeeldexThresholds;
      if (q20 == null || q40 == null || q60 == null || q80 == null) {
        return null;
      }

      if (value <= q20) return { level: "great", label: "Very Good", iconPath: FEELDEX_ICON_PATHS.great };
      if (value <= q40) return { level: "good", label: "Good", iconPath: FEELDEX_ICON_PATHS.good };
      if (value <= q60) return { level: "soso", label: "Normal", iconPath: FEELDEX_ICON_PATHS.soso };
      if (value <= q80) return { level: "bad", label: "Bad", iconPath: FEELDEX_ICON_PATHS.bad };
      return { level: "awful", label: "Too Bad", iconPath: FEELDEX_ICON_PATHS.awful };
    },
    [responseFeeldexThresholds],
  );

  const convertComSensitivity = useCallback((value: number | null | undefined) => {
    if (value == null) {
      return { label: "Unknown", className: "unknown" };
    }
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < 0) {
      return { label: "Unknown", className: "unknown" };
    }
    const score = numeric <= 1.5 ? numeric * 100 : numeric;
    if (score >= 0 && score <= 20) {
      return { label: "Too Bad", className: "too_bad" };
    }
    if (score > 20 && score <= 40) {
      return { label: "Bad", className: "bad" };
    }
    if (score > 40 && score <= 60) {
      return { label: "Normal", className: "normal" };
    }
    if (score > 60 && score <= 80) {
      return { label: "Good", className: "good" };
    }
    return { label: "Very Good", className: "very_good" };
  }, []);

  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "time",
    direction: "desc",
  });
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [isDetailOpen, setDetailOpen] = useState(false);

  const activePoint = useMemo(() => {
    if (selectedPointId) {
      const found = orderedByResponse.find((point) => point.id === selectedPointId);
      if (found) {
        return found;
      }
    }
    return orderedByResponse[0] ?? null;
  }, [orderedByResponse, selectedPointId]);

  const subtitle = useMemo(() => {
    if (!activePoint) {
      return { desc: "-", url: "-" };
    }
    return {
      desc: `⏱ ${formatDuration(activePoint.responseTime)}`,
      url: activePoint.reqUrl || "-",
    };
  }, [activePoint]);

  const detailBadges = useMemo(() => {
    if (!activePoint) {
      return [];
    }
    const badges: Array<{ key: string; label: string; title?: string; iconPath: string }> = [];
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
      (anyPoint.timezone as string | null | undefined) ??
      null;
    if (location) {
      badges.push({
        key: "location",
        label: String(location),
        iconPath: ICON_PATHS.location,
      });
    }
    return badges;
  }, [activePoint]);

  const getSortValue = useCallback((point: ChartPoint, key: SortKey) => {
    switch (key) {
      case "time":
        return point.responseTime ?? null;
      case "feeldex":
        return point.responseTime ?? null;
      case "device":
        return point.deviceId || point.deviceModel || "";
      case "timestamp":
        return point.timestamp ?? point.logTm ?? null;
      case "network":
        return point.comSensitivity ?? null;
      case "url":
        return point.reqUrl || "";
      default:
        return null;
    }
  }, []);

  const displayPoints = useMemo(() => {
    const base = [...orderedByResponse];
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
  }, [getSortValue, orderedByResponse, sortConfig]);

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
          className={`rt-response-popup__sort-indicator${isActive ? " is-active" : ""}`}
          aria-hidden="true"
        >
          <span className="rt-response-popup__sort-triangle">{symbol}</span>
        </span>
      );
    },
    [sortConfig],
  );

  const handleScrimClick = useCallback(() => {
    if (isDetailOpen) {
      setDetailOpen(false);
      return;
    }
    if (closeTimeoutRef.current != null) {
      return;
    }
    setPopupVisible(false);
    closeTimeoutRef.current = window.setTimeout(() => onClose(), EXIT_DELAY);
  }, [isDetailOpen, onClose]);

  const handleRowClick = useCallback((point: ChartPoint) => {
    setSelectedPointId(point.id);
    setDetailOpen(true);
  }, []);

  const themeClass = isDarkMode ? " rt-response-popup--dark" : "";

  return (
    <>
      <button
        type="button"
        className="rt-popup__scrim"
        aria-label="Response Time 상세 팝업 닫기"
        onClick={handleScrimClick}
      />
      <div
        className={`maxy_popup_common rt-response-popup${isPopupVisible ? " is-visible" : ""}${themeClass}`}
        style={{ display: "block" }}
        role="dialog"
        aria-modal="true"
        aria-live="polite"
        aria-label="Response Time 상세 팝업"
      >
        <div className="maxy_popup_grid_s_wrap">
          <div className="maxy_popup_title_wrap">
            <div className="maxy_popup_title_left">
              <img
                alt=""
                className="img_profiling"
                src="/images/maxy/icon-profiling.svg"
                aria-hidden="true"
              />
              <span className="title">Profiling/</span>
              <span className="popup_type">Response Time</span>
              <span className="popup_count">({formatNumber(points.length)})</span>
              <div className="sub_title_wrap">
                {detailBadges.map((badge) => (
                  <span key={badge.key} className="sub_title" title={badge.title ?? badge.label}>
                    <img src={badge.iconPath} alt="" aria-hidden="true" className="rt-response-popup__meta-icon" />
                    <span>{badge.label}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="maxy_popup_sub_title">
            <div className="sub_title_left">
              <span className="desc" title={subtitle.desc}>
                {subtitle.desc}
              </span>
              <span className="url" title={subtitle.url}>
                {subtitle.url}
              </span>
            </div>
          </div>

          <div className="maxy_table_wrap_v2 rt-response-popup__table-wrap" role="region" aria-label="선택된 응답 로그 목록">
            <div className="rt-response-popup__table-scroll">
              <table className="rt-response-popup__table">
                <colgroup>
                  <col style={{ width: "96px" }} />
                  <col style={{ width: "86px" }} />
                  <col style={{ width: "180px" }} />
                  <col style={{ width: "176px" }} />
                  <col style={{ width: "140px" }} />
                  <col />
                </colgroup>
                <thead>
                  <tr>
                    <th scope="col">
                      <button
                        type="button"
                        className="rt-response-popup__sort"
                        onClick={() => toggleSort("time")}
                      >
                        Time {renderSortIndicator("time")}
                      </button>
                    </th>
                    <th scope="col">
                      <button
                        type="button"
                        className="rt-response-popup__sort"
                        onClick={() => toggleSort("feeldex")}
                      >
                        Feeldex {renderSortIndicator("feeldex")}
                      </button>
                    </th>
                    <th scope="col">
                      <button
                        type="button"
                        className="rt-response-popup__sort"
                        onClick={() => toggleSort("device")}
                      >
                        Device ID {renderSortIndicator("device")}
                      </button>
                    </th>
                    <th scope="col">
                      <button
                        type="button"
                        className="rt-response-popup__sort"
                        onClick={() => toggleSort("timestamp")}
                      >
                        Time Stamp {renderSortIndicator("timestamp")}
                      </button>
                    </th>
                    <th scope="col">
                      <button
                        type="button"
                        className="rt-response-popup__sort"
                        onClick={() => toggleSort("network")}
                      >
                        Network {renderSortIndicator("network")}
                      </button>
                    </th>
                    <th scope="col">
                      <button
                        type="button"
                        className="rt-response-popup__sort"
                        onClick={() => toggleSort("url")}
                      >
                        Call {renderSortIndicator("url")}
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {displayPoints.map((point) => {
                    const info = feeldexInfo(point);
                    const networkInfo = convertComSensitivity(point.comSensitivity ?? null);
                    const isSelected = selectedPointId === point.id;
                    const rowClassName =
                      "rt-response-popup__row" +
                      (isSelected ? " rt-response-popup__row--selected" : "") +
                      (point.wtfFlag ? " rt-response-popup__row--alert" : "");
                    return (
                      <tr
                        key={point.id}
                        className={rowClassName}
                        onClick={() => handleRowClick(point)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            handleRowClick(point);
                          }
                        }}
                        tabIndex={0}
                        role="button"
                      >
                        <td>{formatDuration(point.responseTime)}</td>
                        <td>
                          {info ? (
                            <span className={`rt-response-popup__feeldex rt-response-popup__feeldex--${info.level}`}>
                              <img
                                src={info.iconPath}
                                alt=""
                                aria-hidden="true"
                                className="rt-response-popup__feeldex-icon"
                              />
                              <span className="sr-only">{info.label}</span>
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td>{point.deviceId || point.deviceModel || "-"}</td>
                        <td>{point.timestamp ? formatTooltipTimestamp(point.timestamp) : "-"}</td>
                        <td>
                          <span className="rt-response-popup__network">
                            <span
                              className={`network_status ${networkInfo.className}`}
                              aria-hidden="true"
                            />
                            <span className="txt">{networkInfo.label}</span>
                          </span>
                        </td>
                        <td className="rt-response-popup__cell-url" title={point.reqUrl}>
                          {point.reqUrl || "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div
          className={`maxy_popup_gray_bg_wrap popup_right_side_wrap ${isDetailOpen ? "show" : "hidden"}`}
          aria-label="API 상세 패널"
        >
          <div className="right_detail rt-response-popup__detail">
            {activePoint ? (
              <ResponseTimeDetail
                point={activePoint}
                points={orderedByResponse}
              />
            ) : (
              <p className="rt-response-detail__empty">선택된 로그가 없습니다.</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

type ResponseTimeDetailProps = {
  point: ChartPoint;
  points: ChartPoint[];
};

function ResponseTimeDetail({ point, points }: ResponseTimeDetailProps) {
  const detailCacheRef = useRef<Map<string, ResponseTimeDetailData | null>>(new Map());
  const [detailData, setDetailData] = useState<ResponseTimeDetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    const deviceId = (point.deviceId ?? "").trim();
    const logTm = Number(point.logTm ?? point.timestamp ?? 0);
    const key = `${deviceId}:${logTm}`;

    if (!deviceId || !Number.isFinite(logTm) || logTm <= 0) {
      setDetailData(null);
      setDetailLoading(false);
      setDetailError(null);
      return undefined;
    }

    if (detailCacheRef.current.has(key)) {
      setDetailData(detailCacheRef.current.get(key) ?? null);
      setDetailLoading(false);
      setDetailError(null);
      return undefined;
    }

    const controller = new AbortController();
    setDetailLoading(true);
    setDetailError(null);
    setDetailData(null);

    getResponseTimeDetail({ deviceId, logTm }, controller.signal)
      .then((next) => {
        if (controller.signal.aborted) return;
        detailCacheRef.current.set(key, next);
        setDetailData(next);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setDetailError(error instanceof Error ? error.message : String(error));
        detailCacheRef.current.set(key, null);
        setDetailData(null);
      })
      .finally(() => {
        if (controller.signal.aborted) return;
        setDetailLoading(false);
      });

    return () => controller.abort();
  }, [point.deviceId, point.logTm, point.timestamp]);

  const statusInfo = useMemo(() => {
    if (point.wtfFlag) {
      return { label: "Error", className: "error" };
    }
    return { label: "Normal", className: "success" };
  }, [point.wtfFlag]);

  const statusText = useMemo(() => {
    const statusCode = detailData?.statusCode;
    if (statusCode == null) {
      return statusInfo.label;
    }
    return `${statusInfo.label} (${statusCode})`;
  }, [detailData?.statusCode, statusInfo.label]);

  const percentile = useMemo(() => {
    if (!points.length) {
      return 0;
    }
    if (points.length === 1) {
      return 0;
    }
    const ascending = [...points].sort((a, b) => a.responseTime - b.responseTime);
    const index = ascending.findIndex((candidate) => candidate.id === point.id);
    if (index < 0) {
      return 0;
    }
    return Math.round((index / (ascending.length - 1)) * 100);
  }, [point.id, points]);

  const gaugeTone = useMemo(() => {
    if (percentile < 33) return "green";
    if (percentile < 66) return "yellow";
    return "red";
  }, [percentile]);

  const cpuUsagePct = useMemo(() => {
    const source = detailData?.cpuUsage ?? point.cpuUsage ?? null;
    if (source == null) return null;
    const numeric = Number(source);
    if (!Number.isFinite(numeric)) return null;
    return clamp(numeric, 0, 100);
  }, [detailData?.cpuUsage, point.cpuUsage]);

  const batteryUsagePct = useMemo(() => {
    const source = detailData?.batteryLvl ?? null;
    if (source == null) return null;
    const numeric = Number(source);
    if (!Number.isFinite(numeric)) return null;
    return clamp(numeric, 0, 100);
  }, [detailData?.batteryLvl]);

  const waitMs = useMemo(() => {
    const numeric = Number(detailData?.waitTime ?? point.waitTime ?? 0);
    return Number.isFinite(numeric) ? Math.max(0, numeric) : 0;
  }, [detailData?.waitTime, point.waitTime]);

  const downloadMs = useMemo(() => {
    const numeric = Number(detailData?.downloadTime ?? point.downloadTime ?? 0);
    return Number.isFinite(numeric) ? Math.max(0, numeric) : 0;
  }, [detailData?.downloadTime, point.downloadTime]);

  const totalMs = useMemo(() => {
    const numeric = Number(point.responseTime ?? 0);
    return Number.isFinite(numeric) ? Math.max(0, numeric) : 0;
  }, [point.responseTime]);

  const waitPct = useMemo(() => {
    if (totalMs <= 0) return 0;
    return clamp((waitMs / totalMs) * 100, 0, 100);
  }, [totalMs, waitMs]);

  const downloadPct = useMemo(() => {
    if (totalMs <= 0) return 0;
    return clamp((downloadMs / totalMs) * 100, 0, 100);
  }, [downloadMs, totalMs]);

  const endTimestamp = point.timestamp ?? null;
  const startTimestamp =
    endTimestamp != null && Number.isFinite(endTimestamp) ? Math.round(endTimestamp - totalMs) : null;

  const networkTypeText = getLogTypeGroupName(detailData?.logType ?? point.logType);

  const apiUrlText = detailData?.reqUrl ?? point.reqUrl ?? "-";
  const pageUrlText = detailData?.pageUrl ?? point.mxPageId ?? "-";
  const resMsgText = convertCaToComma(detailData?.resMsg ?? null, "-");

  const webviewVerText = detailData?.webviewVer || "-";
  const appBuildText = detailData?.appBuildNum || "-";
  const storagePct = percent(detailData?.storageUsage ?? null, detailData?.storageTotal ?? null);
  const storageUsageText =
    detailData?.storageUsage != null &&
    detailData?.storageTotal != null &&
    detailData.storageUsage > 0 &&
    detailData.storageTotal > 0
      ? `${formatMem("mb", detailData.storageTotal)} (${storagePct ?? 0}%)`
      : "-";
  const memoryUsageText = formatMem("kb", detailData?.memUsage ?? null);
  const userIdText = detailData?.userId && detailData.userId.trim() ? detailData.userId : "-";

  const handleResMsgCopy = useCallback(() => {
    if (!resMsgText || resMsgText === "-") {
      return;
    }
    void copyToClipboard(resMsgText);
  }, [resMsgText]);

  const renderMiniProgress = useCallback(
    (percent: number | null, color: string) => {
      const safe = percent == null ? 0 : clamp(percent, 0, 100);
      const label = percent == null ? "-" : `${Math.round(safe)}%`;
      return (
        <div
          className="mini_progress_wrap"
          style={{ borderColor: color, ["--rt-progress-color" as never]: color } as CSSProperties}
        >
          <span
            className="bar"
            style={{ width: `${safe}%`, backgroundColor: color }}
            aria-hidden="true"
          />
          <span className="pct_txt">{label}</span>
        </div>
      );
    },
    [],
  );

  return (
    <div className="rt-response-detail" aria-busy={detailLoading}>
      {(detailLoading || detailError) && (
        <span className="sr-only">
          {detailLoading ? "상세 정보를 불러오는 중입니다." : detailError}
        </span>
      )}
      <div className="rt-response-detail__analysis">
        <div className="rt-response-detail__analysis-title">
          <span className="rt-response-detail__analysis-label">Analysis</span>
          <span className={`rt-response-detail__status ${statusInfo.className}`}>{statusText}</span>
        </div>
        <div className="rt-response-detail__gauge" aria-label={`Percentile ${percentile}%`}>
          <span className={`rt-response-detail__gauge-label ${gaugeTone}`}>{percentile}%</span>
          <div className={`rt-response-detail__gauge-track ${gaugeTone}`}>
            <div className={`rt-response-detail__gauge-fill ${gaugeTone}`} style={{ width: `${percentile}%` }} />
            <div className="rt-response-detail__gauge-marker top5" aria-hidden="true" />
            <div className="rt-response-detail__gauge-marker top95" aria-hidden="true" />
          </div>
        </div>
      </div>

      <div className="rt-response-detail__box">
        <section className="rt-response-detail__section">
          <div className="rt-response-detail__row">
            <span className="rt-response-detail__row-title">API URL</span>
            <div
              className="rt-response-detail__row-value font_purple"
              title={apiUrlText}
            >
              {apiUrlText}
            </div>
          </div>
          <div className="rt-response-detail__row">
            <span className="rt-response-detail__row-title">PAGE URL</span>
            <div
              className="rt-response-detail__row-value rt-response-detail__row-value--scroll font_purple enable_scrollbar"
              title={pageUrlText}
            >
              {pageUrlText}
            </div>
          </div>
        </section>

        <section className="rt-response-detail__section">
          <div className="rt-response-detail__grid2">
            <div className="rt-response-detail__row">
              <span className="rt-response-detail__row-title">Web View Ver</span>
              <div className="rt-response-detail__row-value font_purple">{webviewVerText}</div>
            </div>
            <div className="rt-response-detail__row">
              <span className="rt-response-detail__row-title">App Build No</span>
              <div className="rt-response-detail__row-value font_purple">{appBuildText}</div>
            </div>
          </div>
          <div className="rt-response-detail__grid2">
            <div className="rt-response-detail__row">
              <span className="rt-response-detail__row-title">Storage Usage</span>
              <div className="rt-response-detail__row-value font_purple">{storageUsageText}</div>
            </div>
            <div className="rt-response-detail__row">
              <span className="rt-response-detail__row-title">Memory Usage</span>
              <div className="rt-response-detail__row-value font_purple">{memoryUsageText}</div>
            </div>
          </div>
          <div className="rt-response-detail__grid2">
            <div className="rt-response-detail__row">
              <span className="rt-response-detail__row-title">Battery Usage</span>
              <div className="rt-response-detail__row-value">
                {renderMiniProgress(batteryUsagePct, "#7277FF")}
              </div>
            </div>
            <div className="rt-response-detail__row">
              <span className="rt-response-detail__row-title">CPU Usage</span>
              <div className="rt-response-detail__row-value">
                {renderMiniProgress(cpuUsagePct, "#7277FF")}
              </div>
            </div>
          </div>
        </section>

        <section className="rt-response-detail__section">
          <div className="rt-response-detail__grid2">
            <div className="rt-response-detail__row">
              <span className="rt-response-detail__row-title">Device ID</span>
              <div className="rt-response-detail__row-value font_purple" title={point.deviceId || ""}>
                {point.deviceId || point.deviceModel || "-"}
              </div>
            </div>
            <div className="rt-response-detail__row">
              <span className="rt-response-detail__row-title">Network Type</span>
              <div className="rt-response-detail__row-value font_purple" title={networkTypeText}>
                {networkTypeText}
              </div>
            </div>
          </div>
          <div className="rt-response-detail__grid2">
            <div className="rt-response-detail__row">
              <span className="rt-response-detail__row-title">User ID</span>
              <div className="rt-response-detail__row-value font_purple">{userIdText}</div>
            </div>
            <div className="rt-response-detail__row">
              <span className="rt-response-detail__row-title">Res Msg</span>
              <div
                className={`rt-response-detail__row-value font_purple${resMsgText && resMsgText !== "-" ? " rt-response-detail__row-value--copy" : ""}`}
                title={resMsgText}
                role={resMsgText && resMsgText !== "-" ? "button" : undefined}
                tabIndex={resMsgText && resMsgText !== "-" ? 0 : undefined}
                aria-label="Res Msg 복사"
                onClick={handleResMsgCopy}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleResMsgCopy();
                  }
                }}
              >
                {resMsgText}
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="rt-response-detail__cards">
        <div className="rt-response-detail__card">
          <div className="key">Elapsed Time</div>
          <div className="value">{formatDuration(totalMs)}</div>
        </div>
        <div className="rt-response-detail__card">
          <div className="key">Start Time</div>
          <div className="value">{startTimestamp != null ? formatTooltipTimestamp(startTimestamp) : "-"}</div>
        </div>
        <div className="rt-response-detail__card">
          <div className="key">End Time</div>
          <div className="value">{endTimestamp != null ? formatTooltipTimestamp(endTimestamp) : "-"}</div>
        </div>
        <div className="rt-response-detail__card">
          <div className="key">Request</div>
          <div className="value">{formatBytes(detailData?.requestSize ?? point.requestSize)}</div>
        </div>
        <div className="rt-response-detail__card">
          <div className="key">Response</div>
          <div className="value">{formatBytes(detailData?.responseSize ?? point.responseSize)}</div>
        </div>
      </div>

      <div className="rt-response-detail__chart enable_scrollbar">
        <div className="rt-response-detail__xrange">
          <div className="rt-response-detail__yaxis">
            <div className="rt-response-detail__yaxis-row">
              <span className="rt-response-detail__dot dot-blue" aria-hidden="true" />
              <span className="rt-response-detail__yaxis-name">Elapsed Time</span>
              <span className="rt-response-detail__yaxis-duration">{formatDuration(totalMs)}</span>
            </div>
            <div className="rt-response-detail__yaxis-row">
              <span className="rt-response-detail__dot dot-yellow" aria-hidden="true" />
              <span className="rt-response-detail__yaxis-name">Waiting Time</span>
              <span className="rt-response-detail__yaxis-duration">{formatDuration(waitMs)}</span>
            </div>
            <div className="rt-response-detail__yaxis-row">
              <span className="rt-response-detail__dot dot-green" aria-hidden="true" />
              <span className="rt-response-detail__yaxis-name">Download Time</span>
              <span className="rt-response-detail__yaxis-duration">{formatDuration(downloadMs)}</span>
            </div>
          </div>

          <div className="rt-response-detail__bars" aria-hidden="true">
            <div className="rt-response-detail__bar-row">
              <span className="rt-response-detail__bar-fill bar-blue" style={{ width: "100%" }} />
            </div>
            <div className="rt-response-detail__bar-row">
              <span className="rt-response-detail__bar-fill bar-yellow" style={{ width: `${waitPct}%` }} />
            </div>
            <div className="rt-response-detail__bar-row">
              <span
                className="rt-response-detail__bar-fill bar-green"
                style={{ width: `${downloadPct}%` }}
              />
            </div>
          </div>
        </div>

        <div className="rt-response-detail__jennifer">
          <div className="txt">
            <span className="mk_error" aria-hidden="true" />
            <span>Learn more by connecting with Jennifer Soft.</span>
          </div>
          <button type="button" className="btn_jennifer">
            See more Jennifer Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
