"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useUserSettings } from "../../../../components/usersettings/UserSettingsProvider";
import { useTheme } from "../../../../components/theme/ThemeProvider";
import { AppList, type ApplicationSummary } from "../../../api/AppList";
import {
  getPageViewInfoList,
  getPageViewInfoDetail,
  type PageViewInfoDetailPoint,
  type PageViewInfoListItem,
  type PageViewDateType,
} from "../../../api/Widget/PageView";
import {
  type FavoritesDateType,
  type FavoritesTroubleType,
} from "../../../api/Widget/Favorites";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer as RechartsResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import FavoritesTroublePopup from "../Favorites/FavoritesTroublePopup";
import "./style.css";

const REFRESH_INTERVAL_MS = 15_000;
const MAX_ITEMS = 30;

const TYPE_COLORS: Record<number, string> = {
  0: "#2563eb",
  1: "#facc15",
  2: "#dc2626",
};

const TYPE_LABELS: Record<number, string> = {
  0: "로그",
  1: "에러",
  2: "크래시",
};

const CHART_PADDING = 8;
const CHART_MARGIN_RATIO = 0.04;
const CHART_MARGIN_MAX = 20;
const MIN_RENDER_RADIUS = 12;
const BUBBLE_EDGE_PADDING = 4;

const numberFormatter = new Intl.NumberFormat("ko-KR");
function parseNumeric(value: string | number | null | undefined): number {
  if (value == null) {
    return 0;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return "-";
  }
  return numberFormatter.format(Math.round(value));
}

function normalizeType(value: number | null | undefined): 0 | 1 | 2 {
  if (value === 2) {
    return 2;
  }
  if (value === 1) {
    return 1;
  }
  return 0;
}

function typeColor(value: number): string {
  return TYPE_COLORS[value] ?? TYPE_COLORS[0];
}

function typeLabel(value: number): string {
  return TYPE_LABELS[value] ?? TYPE_LABELS[0];
}

const emptyArray: PageViewInfoListItem[] = [];

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

type ChartDatum = {
  id: string;
  rank: number;
  reqUrl: string;
  shortLabel: string;
  count: number;
  type: 0 | 1 | 2;
  radius: number;
  borderColor: string;
  fillColor: string;
  showLabel: boolean;
};

type DetailModalState = {
  open: boolean;
  reqUrl: string;
  dateType: PageViewDateType;
  loading: boolean;
  error: string | null;
  items: PageViewInfoDetailPoint[];
};

type TroublePopupState = {
  reqUrl: string;
  dateType: FavoritesDateType;
  initialType: FavoritesTroubleType;
  hasError: boolean;
  hasCrash: boolean;
};

const DETAIL_MODAL_INIT: DetailModalState = {
  open: false,
  reqUrl: "",
  dateType: "DAY",
  loading: false,
  error: null,
  items: [],
};

function lightenColor(hex: string, factor: number): string {
  const parsed = hex.replace("#", "");
  if (parsed.length !== 6) {
    return hex;
  }
  const r = parseInt(parsed.slice(0, 2), 16);
  const g = parseInt(parsed.slice(2, 4), 16);
  const b = parseInt(parsed.slice(4, 6), 16);
  const mix = (channel: number) =>
    Math.max(0, Math.min(255, Math.round(channel + (255 - channel) * factor)));
  const toHex = (value: number) => value.toString(16).padStart(2, "0");
  return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`;
}

function shortenLabel(reqUrl: string, rank: number): string {
  if (!reqUrl) {
    return "알 수 없음";
  }
  if (reqUrl === "/") {
    return "홈";
  }
  const parts = reqUrl.split("/").filter(Boolean);
  const last = parts.pop() ?? "/";
  const shortened = last.length > 14 ? `${last.slice(0, 13)}…` : last;
  return shortened;
}

type PositionedDatum = ChartDatum & {
  x: number;
  y: number;
};

type Bounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
};

function makeStableId(reqUrl: string, type: number, index: number): string {
  const base = reqUrl ? `${reqUrl}-${type}` : `item-${type}-${index}`;
  return base.replace(/[^a-zA-Z0-9_-]+/g, "_");
}

function getDetailLabel(time: string, dateType: PageViewDateType): string {
  if (!time) {
    return "-";
  }
  if (dateType === "DAY") {
    return time.length >= 16 ? time.slice(11, 16) : time;
  }
  return time.length >= 10 ? time.slice(0, 10) : time;
}

const PACKED_LAYOUT_CONFIG = {
  bubblePadding: 2,
  gravitationalConstant: 0.01,
  friction: 0.92,
  maxIterations: 220,
  minSpeed: 0.03,
};

type PackedNode = PositionedDatum & {
  vx: number;
  vy: number;
  mass: number;
};

function hashSeed(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function computePackedLayout(items: ChartDatum[], seedLayout: PositionedDatum[] = []): PositionedDatum[] {
  if (items.length === 0) {
    return [];
  }

  const seedMap = new Map(seedLayout.map((item) => [item.id, item]));
  const maxRadius = items.reduce((acc, item) => Math.max(acc, item.radius), 0);
  const initialRadius = Math.max(12, Math.min(80, maxRadius * 1.4));
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  const nodes: PackedNode[] = items.map((item, index) => {
    const seeded = seedMap.get(item.id);
    let x = 0;
    let y = 0;

    if (seeded) {
      x = seeded.x;
      y = seeded.y;
    } else {
      const seed = hashSeed(item.id) + index * 131;
      const angle = seededRandom(seed) * Math.PI * 2 + index * goldenAngle * 0.1;
      const spread = 0.35 + seededRandom(seed + 1) * 0.65;
      const distance = initialRadius * spread;
      x = Math.cos(angle) * distance;
      y = Math.sin(angle) * distance;
    }

    return {
      ...item,
      x,
      y,
      vx: 0,
      vy: 0,
      mass: Math.max(item.radius * item.radius, 1),
    };
  });

  const { bubblePadding, gravitationalConstant, friction, maxIterations, minSpeed } = PACKED_LAYOUT_CONFIG;

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    for (let i = 0; i < nodes.length; i += 1) {
      const node = nodes[i];
      for (let j = i + 1; j < nodes.length; j += 1) {
        const other = nodes[j];
        let dx = node.x - other.x;
        let dy = node.y - other.y;
        let distSq = dx * dx + dy * dy;
        if (distSq === 0) {
          dx = 0.01;
          dy = 0.01;
          distSq = dx * dx + dy * dy;
        }
        const dist = Math.sqrt(distSq);
        const minDist = node.radius + other.radius + bubblePadding;

        if (dist < minDist) {
          const overlap = minDist - dist;
          const push = (overlap / dist) * 0.5;
          const px = dx * push;
          const py = dy * push;
          const totalMass = node.mass + other.mass;
          const nodeShare = totalMass > 0 ? other.mass / totalMass : 0.5;
          const otherShare = 1 - nodeShare;
          node.vx += px * nodeShare;
          node.vy += py * nodeShare;
          other.vx -= px * otherShare;
          other.vy -= py * otherShare;
        }
      }
    }

    let maxVelocity = 0;
    for (const node of nodes) {
      node.vx += -node.x * gravitationalConstant;
      node.vy += -node.y * gravitationalConstant;
      node.vx *= friction;
      node.vy *= friction;
      node.x += node.vx;
      node.y += node.vy;
      maxVelocity = Math.max(maxVelocity, Math.abs(node.vx) + Math.abs(node.vy));
    }

    if (maxVelocity < minSpeed) {
      break;
    }
  }

  const total = nodes.reduce(
    (acc, item) => {
      acc.x += item.x;
      acc.y += item.y;
      return acc;
    },
    { x: 0, y: 0 },
  );
  const count = nodes.length || 1;
  const meanX = total.x / count;
  const meanY = total.y / count;

  return nodes.map((item) => ({
    ...item,
    x: item.x - meanX,
    y: item.y - meanY,
  }));
}

function computeScaledBounds(
  points: PositionedDatum[],
  scale: number,
  minRadius: number = MIN_RENDER_RADIUS,
  edgePadding: number = BUBBLE_EDGE_PADDING,
): Bounds {
  if (points.length === 0) {
    return {
      minX: -80,
      maxX: 80,
      minY: -80,
      maxY: 80,
      width: 160,
      height: 160,
    };
  }
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  points.forEach((point) => {
    const radius = Math.max(point.radius * scale, minRadius) + edgePadding;
    const x = point.x * scale;
    const y = point.y * scale;
    minX = Math.min(minX, x - radius);
    maxX = Math.max(maxX, x + radius);
    minY = Math.min(minY, y - radius);
    maxY = Math.max(maxY, y + radius);
  });

  const width = Math.max(maxX - minX, 1);
  const height = Math.max(maxY - minY, 1);

  return {
    minX,
    maxX,
    minY,
    maxY,
    width,
    height,
  };
}

export default function PageViewWidget() {
  const {
    userNo: storedUserNo,
    applicationId: storedApplicationId,
    osType: storedOsType,
    tmzutc,
  } = useUserSettings();
  const { theme } = useTheme();
  const isDarkMode = theme === "dark";
  const chartAxisColor = isDarkMode ? "#dbeafe" : "#475569";
  const chartGridColor = isDarkMode ? "rgba(148, 163, 184, 0.2)" : "#e2e8f0";
  const bubbleLabelColor = isDarkMode ? "#e2e8f0" : "#1f2937";

  const userNo = useMemo(() => parseNumeric(storedUserNo), [storedUserNo]);
  const preferredApplicationId = useMemo(
    () => parseNumeric(storedApplicationId),
    [storedApplicationId],
  );

  const [applications, setApplications] = useState<ApplicationSummary[] | null>(null);
  const [resolvedApplicationId, setResolvedApplicationId] = useState<number>(
    preferredApplicationId > 0 ? preferredApplicationId : 0,
  );
  const [appResolveError, setAppResolveError] = useState<string | null>(null);
  const [isResolvingApp, setIsResolvingApp] = useState(false);

  const [records, setRecords] = useState<PageViewInfoListItem[]>(emptyArray);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, setLastUpdated] = useState<number | null>(null);
  const fetchControllerRef = useRef<AbortController | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appCacheRef = useRef<{ userNo: number; list: ApplicationSummary[] } | null>(null);
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });
  const renderWidth = canvasSize.width > 2 ? canvasSize.width : 320;
  const renderHeight = canvasSize.height > 2 ? canvasSize.height : 240;
  const minRenderRadius = useMemo(() => {
    const basis = Math.min(renderWidth, renderHeight);
    if (!Number.isFinite(basis) || basis <= 0) {
      return MIN_RENDER_RADIUS;
    }
    const scaled = Math.round(basis * 0.035);
    return Math.max(8, Math.min(18, scaled));
  }, [renderHeight, renderWidth]);

  const activeApplication = useMemo(
    () =>
      applications?.find(
        (item) => Number(item.applicationId) === resolvedApplicationId,
      ) ?? null,
    [applications, resolvedApplicationId],
  );

  const applicationIdentifier = useMemo(() => {
    const candidate = activeApplication?.applicationId ?? resolvedApplicationId;
    return Number(candidate) > 0 ? String(candidate) : "";
  }, [activeApplication, resolvedApplicationId]);

  const apiOsType = useMemo(() => normaliseOsTypeForApi(storedOsType), [storedOsType]);
  const previousOsTypeRef = useRef(apiOsType);

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
          if (cancelled) {
            return;
          }
          list = response.applicationList ?? [];
          appCacheRef.current = { userNo, list };
        }
        if (cancelled) {
          return;
        }

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
      } catch (resolveError) {
        if (!cancelled) {
          setApplications(null);
          setResolvedApplicationId(preferredApplicationId > 0 ? preferredApplicationId : 0);
          setAppResolveError(
            resolveError instanceof Error
              ? resolveError.message
              : "애플리케이션 목록을 불러오지 못했습니다.",
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

  const chartData: ChartDatum[] = useMemo(() => {
    if (!records || records.length === 0) {
      return [];
    }

    const maxCount = records.reduce(
      (acc, item) => Math.max(acc, parseNumeric(item.count)),
      0,
    );
    const labelThreshold = maxCount > 0 ? maxCount * 0.08 : 0;
    const baseRadius = 46;
    const minRadius = 20;

    return records.map((item, index) => {
      const count = parseNumeric(item.count);
      const type = normalizeType(item.type);
      const borderColor = typeColor(type);
      const magnitude = maxCount > 0 ? Math.sqrt(count / maxCount) : 0;
      const radius = Math.max(minRadius, baseRadius * magnitude);
      const fillColor = lightenColor(borderColor, 0.68);
      const pageUrl = item.pageURL ?? "";
      const id = makeStableId(pageUrl, type, index);

      return {
        id,
        rank: index + 1,
        reqUrl: pageUrl,
        shortLabel: shortenLabel(pageUrl, index + 1),
        count,
        type,
        radius,
        borderColor,
        fillColor,
        showLabel: count >= labelThreshold,
      };
    });
  }, [records]);

  const [detailModalState, setDetailModalState] = useState<DetailModalState>(DETAIL_MODAL_INIT);
  const detailAbortRef = useRef<AbortController | null>(null);
  const [troublePopup, setTroublePopup] = useState<TroublePopupState | null>(null);

  const layoutInput = useMemo(() => chartData.slice().sort((a, b) => b.radius - a.radius), [chartData]);
  const [displayPoints, setDisplayPoints] = useState<PositionedDatum[]>([]);
  const displayPointsRef = useRef<PositionedDatum[]>([]);
  const layoutRef = useRef<PositionedDatum[]>([]);
  const animationRef = useRef<number | null>(null);
  const [tooltipState, setTooltipState] = useState<{
    point: PositionedDatum;
    x: number;
    y: number;
  } | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const tooltipRafRef = useRef<number | null>(null);
  const tooltipPendingRef = useRef<{
    point: PositionedDatum;
    x: number;
    y: number;
  } | null>(null);

  useLayoutEffect(() => {
    const element = chartContainerRef.current;
    if (!element) {
      return;
    }

    const measure = () => {
      const elementRect = element.getBoundingClientRect();
      const parentRect = element.parentElement?.getBoundingClientRect();
      const measuredWidth =
        elementRect.width || parentRect?.width || element.clientWidth || element.offsetWidth || 0;
      const measuredHeight =
        elementRect.height || parentRect?.height || element.clientHeight || element.offsetHeight || 0;
      const width = measuredWidth > 2 ? measuredWidth : 320;
      const height = measuredHeight > 2 ? measuredHeight : 240;

      setCanvasSize((previous) => {
        if (Math.abs(previous.width - width) < 0.5 && Math.abs(previous.height - height) < 0.5) {
          return previous;
        }
        return { width, height };
      });
    };

    measure();
    const rafId = requestAnimationFrame(measure);

    const resizeObserver =
      typeof window !== "undefined" && "ResizeObserver" in window
        ? new window.ResizeObserver(() => {
            measure();
          })
        : null;

    if (resizeObserver) {
      const targets = new Set<Element>();
      targets.add(element);
      if (element.parentElement) {
        targets.add(element.parentElement);
      }
      const clippedAncestor = element.closest("#maxyComponent__PAGE_VIEW .maxy_component_item");
      if (clippedAncestor) {
        targets.add(clippedAncestor);
      }
      targets.forEach((target) => resizeObserver.observe(target));
    } else {
      window.addEventListener("resize", measure);
    }

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      } else {
        window.removeEventListener("resize", measure);
      }
      cancelAnimationFrame(rafId);
    };
  }, [layoutInput.length]);

  useEffect(() => {
    if (layoutInput.length === 0) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      layoutRef.current = [];
      setDisplayPoints([]);
      displayPointsRef.current = [];
      setTooltipState(null);
      return;
    }

    const targetLayout = computePackedLayout(layoutInput, layoutRef.current);
    const previousMap = new Map(layoutRef.current.map((item) => [item.id, item]));
    const startTime = typeof performance !== "undefined" ? performance.now() : Date.now();
    const duration = 900;

    if (previousMap.size === 0) {
      setDisplayPoints(targetLayout);
    }

    const animate = (timestamp: number) => {
      const now = typeof timestamp === "number" ? timestamp : startTime + duration;
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3);

      const framePoints = targetLayout.map((point) => {
        const previous = previousMap.get(point.id);
        const fromX = previous ? previous.x : point.x * 1.12;
        const fromY = previous ? previous.y : point.y * 1.12;

        return {
          ...point,
          x: fromX + (point.x - fromX) * eased,
          y: fromY + (point.y - fromY) * eased,
        };
      });

      displayPointsRef.current = framePoints;
      setDisplayPoints(framePoints);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        layoutRef.current = targetLayout;
        displayPointsRef.current = targetLayout.map((point) => ({ ...point }));
        animationRef.current = null;
      }
    };

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [layoutInput]);

  const layoutMetrics = useMemo(() => {
    if (displayPoints.length === 0) {
      return {
        minX: -80,
        maxX: 80,
        minY: -80,
        maxY: 80,
        width: 160,
        height: 160,
      };
    }
    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    displayPoints.forEach((point) => {
      minX = Math.min(minX, point.x - point.radius);
      maxX = Math.max(maxX, point.x + point.radius);
      minY = Math.min(minY, point.y - point.radius);
      maxY = Math.max(maxY, point.y + point.radius);
    });

    return {
      minX,
      maxX,
      minY,
      maxY,
      width: Math.max(maxX - minX, 1),
      height: Math.max(maxY - minY, 1),
    };
  }, [displayPoints]);

  const chartMargin = useMemo(() => {
    const base = Math.round(Math.min(renderWidth, renderHeight) * CHART_MARGIN_RATIO);
    return Math.max(CHART_PADDING, Math.min(base, CHART_MARGIN_MAX));
  }, [renderWidth, renderHeight]);
  const chartInsets = useMemo(() => {
    const base = Math.round(Math.min(renderWidth, renderHeight) * 0.06);
    const bottomExtra = Math.min(48, Math.max(12, base));
    return {
      top: chartMargin,
      right: chartMargin,
      bottom: chartMargin + bottomExtra,
      left: chartMargin,
    };
  }, [chartMargin, renderHeight, renderWidth]);

  const chartScale = useMemo(() => {
    if (layoutMetrics.width <= 0 || layoutMetrics.height <= 0 || displayPoints.length === 0) {
      return 1;
    }

    const availableWidth = Math.max(renderWidth - chartInsets.left - chartInsets.right, 1);
    const availableHeight = Math.max(renderHeight - chartInsets.top - chartInsets.bottom, 1);

    const fits = (scale: number) => {
      const bounds = computeScaledBounds(displayPoints, scale, minRenderRadius);
      return bounds.width <= availableWidth && bounds.height <= availableHeight;
    };

    let lo = 0;
    let hi = Math.min(availableWidth / layoutMetrics.width, availableHeight / layoutMetrics.height);
    if (!Number.isFinite(hi) || hi <= 0) {
      hi = 1;
    }

    if (fits(hi)) {
      lo = hi;
      let guard = 0;
      while (guard++ < 20) {
        const next = hi * 1.25;
        if (next > 50) {
          break;
        }
        if (fits(next)) {
          lo = next;
          hi = next;
          continue;
        }
        hi = next;
        break;
      }

      if (fits(hi)) {
        return hi;
      }
    } else {
      let guard = 0;
      while (guard++ < 24 && hi > 0.0001 && !fits(hi)) {
        hi *= 0.8;
      }
      if (!fits(hi)) {
        return hi;
      }
      lo = hi;
      hi = hi / 0.8;
    }

    for (let i = 0; i < 24; i += 1) {
      const mid = (lo + hi) / 2;
      if (fits(mid)) {
        lo = mid;
      } else {
        hi = mid;
      }
    }

    return lo * 0.985;
  }, [chartInsets, displayPoints, layoutMetrics, minRenderRadius, renderHeight, renderWidth]);

  const updateTooltipPosition = useCallback(
    (point: PositionedDatum, event: ReactPointerEvent<SVGCircleElement>) => {
      const container = chartContainerRef.current;
      if (!container) {
        return;
      }
      const rect = container.getBoundingClientRect();
      const tooltip = tooltipRef.current;
      const tooltipWidth = tooltip?.offsetWidth ?? 240;
      const tooltipHeight = tooltip?.offsetHeight ?? 96;
      const relX = event.clientX - rect.left;
      const relY = event.clientY - rect.top;
      const containerWidth = renderWidth;
      const containerHeight = renderHeight;
      const bubbleOffset = Math.max(14, point.radius * chartScale * 0.65);
      const spaceAbove = relY - bubbleOffset;
      const spaceBelow = containerHeight - relY - bubbleOffset;
      const placeBelow = spaceBelow >= tooltipHeight || spaceBelow >= spaceAbove;
      const padding = 8;
      let x = relX - tooltipWidth / 2;
      let y = placeBelow ? relY + bubbleOffset : relY - bubbleOffset - tooltipHeight;

      const maxX = Math.max(padding, containerWidth - tooltipWidth - padding);
      const maxY = Math.max(padding, containerHeight - tooltipHeight - padding);
      x = Math.min(Math.max(x, padding), maxX);
      y = Math.min(Math.max(y, padding), maxY);
      tooltipPendingRef.current = { point, x, y };
      if (tooltipRafRef.current == null) {
        tooltipRafRef.current = requestAnimationFrame(() => {
          tooltipRafRef.current = null;
          const pending = tooltipPendingRef.current;
          if (!pending) {
            return;
          }
          tooltipPendingRef.current = null;
          setTooltipState((prev) => {
            if (
              prev &&
              prev.point.id === pending.point.id &&
              prev.x === pending.x &&
              prev.y === pending.y
            ) {
              return prev;
            }
            return pending;
          });
        });
      }
    },
    [chartScale, renderHeight, renderWidth],
  );

  const handleBubblePointerEnter = useCallback(
    (point: PositionedDatum, event: ReactPointerEvent<SVGCircleElement>) => {
      updateTooltipPosition(point, event);
    },
    [updateTooltipPosition],
  );

  const handleBubblePointerMove = useCallback(
    (point: PositionedDatum, event: ReactPointerEvent<SVGCircleElement>) => {
      updateTooltipPosition(point, event);
    },
    [updateTooltipPosition],
  );

  const handleBubblePointerLeave = useCallback(() => {
    if (tooltipRafRef.current != null) {
      cancelAnimationFrame(tooltipRafRef.current);
      tooltipRafRef.current = null;
    }
    tooltipPendingRef.current = null;
    setTooltipState((prev) => (prev ? null : prev));
  }, []);

  const loadDetailData = useCallback(
    (reqUrl: string, dateType: PageViewDateType) => {
      if (!reqUrl) {
        return;
      }

      if (!applicationIdentifier) {
        setDetailModalState({
          open: true,
          reqUrl,
          dateType,
          loading: false,
          error: "프로젝트 또는 애플리케이션 정보가 없습니다.",
          items: [],
        });
        return;
      }

      if (detailAbortRef.current) {
        detailAbortRef.current.abort();
        detailAbortRef.current = null;
      }

      const controller = new AbortController();
      detailAbortRef.current = controller;

      setDetailModalState({
        open: true,
        reqUrl,
        dateType,
        loading: true,
        error: null,
        items: [],
      });

      getPageViewInfoDetail(
        {
          applicationId: applicationIdentifier,
          osType: apiOsType === "all" ? null : apiOsType,
          dateType,
          reqUrl,
          tmzutc: tmzutc,
        },
        controller.signal,
      )
        .then((items) => {
          if (controller.signal.aborted) {
            return;
          }
          setDetailModalState({
            open: true,
            reqUrl,
            dateType,
            loading: false,
            error: null,
            items,
          });
        })
        .catch((detailError) => {
          if (controller.signal.aborted) {
            return;
          }
          setDetailModalState({
            open: true,
            reqUrl,
            dateType,
            loading: false,
            error:
              detailError instanceof Error
                ? detailError.message
                : "상세 데이터를 불러오지 못했습니다.",
            items: [],
          });
        })
        .finally(() => {
          if (detailAbortRef.current === controller) {
            detailAbortRef.current = null;
          }
        });
    },
    [applicationIdentifier, apiOsType, tmzutc],
  );

  const dismissDetailModal = useCallback(() => {
    if (detailAbortRef.current) {
      detailAbortRef.current.abort();
      detailAbortRef.current = null;
    }
    setDetailModalState(DETAIL_MODAL_INIT);
  }, []);

  useEffect(() => {
    if (previousOsTypeRef.current !== apiOsType) {
      previousOsTypeRef.current = apiOsType;
      if (detailModalState.open) {
        dismissDetailModal();
      }
    }
  }, [apiOsType, detailModalState.open, dismissDetailModal]);

  const detailTooltipFormatter = useCallback(
    (value: number, name: string) => [formatNumber(value), name === "pageView" ? "PV" : "사용자"],
    [],
  );

  const handleBubbleClick = useCallback(
    (datum: ChartDatum) => {
      if (!datum.reqUrl) {
        return;
      }
      if (datum.type === 0) {
        return;
      }
      if (datum.type === 1) {
        dismissDetailModal();
        setTroublePopup({
          reqUrl: datum.reqUrl,
          dateType: "DAY",
          initialType: "error",
          hasError: true,
          hasCrash: false,
        });
        return;
      }
      if (datum.type === 2) {
        dismissDetailModal();
        setTroublePopup({
          reqUrl: datum.reqUrl,
          dateType: "DAY",
          initialType: "crash",
          hasError: false,
          hasCrash: true,
        });
        return;
      }
      setTroublePopup(null);
      loadDetailData(datum.reqUrl, "DAY");
    },
    [dismissDetailModal, loadDetailData],
  );

  useEffect(() => {
    if (!detailModalState.open) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        dismissDetailModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [detailModalState.open, dismissDetailModal]);

  const loadRecords = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (resolvedApplicationId <= 0 || !applicationIdentifier) {
        setRecords(emptyArray);
        setLastUpdated(null);
        if (mode === "initial") {
          setError(appResolveError ?? "애플리케이션을 선택해주세요.");
        }
        return;
      }

      if (mode === "initial") {
        setLoading(true);
      }

      if (fetchControllerRef.current) {
        fetchControllerRef.current.abort();
      }

      const controller = new AbortController();
      fetchControllerRef.current = controller;

      try {
        const list = await getPageViewInfoList(
          {
            applicationId: applicationIdentifier,
            osType: apiOsType === "all" ? null : apiOsType,
            dateType: "DAY",
            size: MAX_ITEMS,
            tmzutc: tmzutc,
          },
          controller.signal,
        );

        if (controller.signal.aborted) {
          return;
        }

        setRecords(list);
        setError(null);
        setLastUpdated(Date.now());
      } catch (fetchError) {
        if (controller.signal.aborted) {
          return;
        }
        if (mode === "initial") {
          setRecords(emptyArray);
        }
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Page View 데이터를 불러오지 못했습니다.",
        );
      } finally {
        if (fetchControllerRef.current === controller) {
          fetchControllerRef.current = null;
        }
        if (mode === "initial") {
          setLoading(false);
        }
      }
    },
    [resolvedApplicationId, applicationIdentifier, apiOsType, appResolveError, tmzutc],
  );

  useEffect(() => {
    loadRecords("initial");

    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    if (resolvedApplicationId > 0 && applicationIdentifier) {
      const timer = setInterval(() => {
        loadRecords("refresh");
      }, REFRESH_INTERVAL_MS);
      refreshTimerRef.current = timer;
      return () => {
        clearInterval(timer);
        refreshTimerRef.current = null;
      };
    }

    return undefined;
  }, [resolvedApplicationId, applicationIdentifier, loadRecords]);

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      if (fetchControllerRef.current) {
        fetchControllerRef.current.abort();
      }
      if (detailAbortRef.current) {
        detailAbortRef.current.abort();
      }
    };
  }, []);

  const hasData = chartData.length > 0;
  const centerX = renderWidth / 2;
  const centerY = renderHeight / 2;
  const layoutBounds = useMemo(
    () => computeScaledBounds(displayPoints, chartScale, minRenderRadius),
    [displayPoints, chartScale, minRenderRadius],
  );
  const layoutOffset = useMemo(() => {
    if (displayPoints.length === 0) {
      return { x: centerX, y: centerY };
    }
    const boundsCenterX = (layoutBounds.minX + layoutBounds.maxX) / 2;
    const boundsCenterY = (layoutBounds.minY + layoutBounds.maxY) / 2;
    const baseX = centerX - boundsCenterX;
    const baseY = centerY - boundsCenterY;
    const minX = chartInsets.left - layoutBounds.minX;
    const maxX = renderWidth - chartInsets.right - layoutBounds.maxX;
    const minY = chartInsets.top - layoutBounds.minY;
    const maxY = renderHeight - chartInsets.bottom - layoutBounds.maxY;

    return {
      x: minX > maxX ? (minX + maxX) / 2 : Math.min(Math.max(baseX, minX), maxX),
      y: minY > maxY ? (minY + maxY) / 2 : Math.min(Math.max(baseY, minY), maxY),
    };
  }, [
    centerX,
    centerY,
    chartInsets,
    displayPoints.length,
    layoutBounds,
    renderHeight,
    renderWidth,
  ]);
  const hoveredId = tooltipState?.point.id ?? null;
  const detailChartData = useMemo(() => {
    return detailModalState.items.map((item) => ({
      rawTime: item.time,
      label: getDetailLabel(item.time, detailModalState.dateType),
      pageView: item.viewCount,
      viewer: item.viewer,
    }));
  }, [detailModalState.items, detailModalState.dateType]);
  const isDayDetail = detailModalState.dateType === "DAY";

  let statusMessage: string | null = null;
  if (!hasData) {
    if (isResolvingApp) {
      statusMessage = "데이터를 불러오고 있습니다.";
    } else if (loading) {
      statusMessage = "데이터를 불러오고 있습니다.";
    } else if (error) {
      statusMessage = error;
    } else if (userNo <= 0) {
      statusMessage = "사용자 정보를 확인해주세요.";
    } else if (resolvedApplicationId <= 0) {
      statusMessage = appResolveError ?? "애플리케이션을 선택해주세요.";
    }
  }

  const inlineError =
    error && hasData
      ? error
      : null;

  return (
    <div className={`pageview-widget${isDarkMode ? " pageview-widget--dark" : ""}`}>
      <div className="pageview-widget__header">
        <div className="pageview-widget__title">
          <h4>Page View</h4>
          <img
            src="/images/maxy/ic-question-grey-blue.svg"
            alt="도움말"
            className="pageview-widget__help"
            title="상위 페이지의 로그/에러/크래시 건수를 보여줍니다."
          />
        </div>
      </div>
      {inlineError ? (
        <div className="pageview-widget__status" style={{ borderStyle: "solid" }}>
          {inlineError}
        </div>
      ) : null}
      <div className="pageview-widget__body" style={{ height: "auto", flex: "1 1 0" }}>
        {statusMessage ? (
          <div className="pageview-widget__status">{statusMessage}</div>
        ) : (
          <div className="pageview-widget__chart" ref={chartContainerRef}>
            <svg
              width={renderWidth}
              height={renderHeight}
              style={{ width: renderWidth, height: renderHeight }}
              role="img"
              aria-label="페이지 뷰 버블 차트"
              onPointerLeave={handleBubblePointerLeave}
            >
              <defs>
                {displayPoints.map((point) => {
                  const gradientId = `bubble-gradient-${point.id}`;
                  return (
                    <radialGradient key={gradientId} id={gradientId} cx="50%" cy="50%" r="65%">
                      <stop offset="0%" stopColor={lightenColor(point.borderColor, 0.86)} stopOpacity={0.95} />
                      <stop offset="60%" stopColor={lightenColor(point.borderColor, 0.68)} stopOpacity={0.82} />
                      <stop offset="100%" stopColor={point.fillColor} stopOpacity={0.74} />
                    </radialGradient>
                  );
                })}
              </defs>
              {displayPoints.map((point) => {
                const cx = layoutOffset.x + point.x * chartScale;
                const cy = layoutOffset.y + point.y * chartScale;
                const radiusPx = Math.max(point.radius * chartScale, minRenderRadius);
                const gradientId = `bubble-gradient-${point.id}`;
                const isHovered = hoveredId === point.id;
                const opacity = hoveredId && !isHovered ? 0.52 : 1;
                const isClickable = point.type !== 0;

                return (
                  <g
                    key={point.id}
                    className="pageview-widget__bubble"
                    role={isClickable ? "button" : undefined}
                    tabIndex={isClickable ? 0 : undefined}
                    aria-label={isClickable ? `${point.reqUrl} 상세 보기` : undefined}
                    onClick={isClickable ? () => handleBubbleClick(point) : undefined}
                    onKeyDown={
                      isClickable
                        ? (event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              handleBubbleClick(point);
                            }
                          }
                        : undefined
                    }
                  >
                    <circle
                      cx={cx}
                      cy={cy}
                      r={radiusPx}
                      className={isClickable ? undefined : "pageview-widget__bubble-circle--static"}
                      fill={`url(#${gradientId})`}
                      stroke={point.borderColor}
                      strokeWidth={isHovered ? 3 : 2}
                      opacity={opacity}
                      onPointerEnter={(event) => handleBubblePointerEnter(point, event)}
                      onPointerMove={(event) => handleBubblePointerMove(point, event)}
                      onPointerLeave={handleBubblePointerLeave}
                    />
                    {point.showLabel && radiusPx >= 28 ? (
                      <text
                        x={cx}
                        y={cy + radiusPx * 0.1}
                        textAnchor="middle"
                        fontSize={Math.max(11, radiusPx * 0.28)}
                        fontWeight={600}
                        fill={bubbleLabelColor}
                        className="pageview-widget__bubble-label"
                      >
                        {point.shortLabel}
                      </text>
                    ) : null}
                  </g>
                );
              })}
            </svg>
            {tooltipState ? (
              <div
                className="pageview-widget__tooltip pageview-widget__tooltip--floating"
                style={{ left: tooltipState.x, top: tooltipState.y, transform: "translate(0, 0)" }}
                ref={tooltipRef}
              >
                <div className="pageview-widget__tooltip-title">
                  {tooltipState.point.reqUrl || tooltipState.point.shortLabel}
                </div>
                <div className="pageview-widget__tooltip-row">
                  <span>유형</span>
                  <strong style={{ color: typeColor(tooltipState.point.type) }}>
                    {typeLabel(tooltipState.point.type)}
                  </strong>
                </div>
                <div className="pageview-widget__tooltip-row">
                  <span>건수</span>
                  <strong>{formatNumber(tooltipState.point.count)}</strong>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
      {detailModalState.open ? (
        <div
          className="pageview-widget__modal-backdrop"
          role="presentation"
          onClick={dismissDetailModal}
        >
          <div
            className="pageview-widget__modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pageview-widget-detail-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="pageview-widget__modal-header">
              <div className="pageview-widget__modal-title" id="pageview-widget-detail-title">
                {detailModalState.reqUrl || "상세 정보"}
              </div>
              <button
                type="button"
                className="pageview-widget__modal-close"
                onClick={dismissDetailModal}
                aria-label="닫기"
              >
                ×
              </button>
            </div>
            <div className="pageview-widget__modal-body">
              <div className="pageview-widget__modal-controls">
                {(["DAY", "WEEK", "MONTH"] as PageViewDateType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    className={`pageview-widget__modal-chip${
                      detailModalState.dateType === type ? " pageview-widget__modal-chip--active" : ""
                    }`}
                    disabled={detailModalState.loading && detailModalState.dateType === type}
                    onClick={() => {
                      if (detailModalState.reqUrl) {
                        loadDetailData(detailModalState.reqUrl, type);
                      }
                    }}
                  >
                    {type === "DAY" ? "일간" : type === "WEEK" ? "주간" : "월간"}
                  </button>
                ))}
              </div>
              {detailModalState.loading ? (
                <div className="pageview-widget__modal-status">상세 데이터를 불러오는 중입니다.</div>
              ) : detailModalState.error ? (
                <div className="pageview-widget__modal-status pageview-widget__modal-status--error">
                  {detailModalState.error}
                </div>
              ) : (
                <>
                  <div className="pageview-widget__modal-chart">
                    <RechartsResponsiveContainer width="100%" height={isDayDetail ? 240 : 260}>
                      {isDayDetail ? (
                        <LineChart data={detailChartData} margin={{ top: 12, right: 16, bottom: 20, left: 8 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                          <XAxis
                            dataKey="label"
                            tick={{ fontSize: 11, fill: chartAxisColor }}
                            angle={-25}
                            textAnchor="end"
                            height={46}
                            axisLine={{ stroke: chartAxisColor }}
                            tickLine={{ stroke: chartAxisColor }}
                          />
                          <YAxis
                            tick={{ fontSize: 11, fill: chartAxisColor }}
                            width={60}
                            allowDecimals={false}
                            axisLine={{ stroke: chartAxisColor }}
                            tickLine={{ stroke: chartAxisColor }}
                          />
                          <RechartsTooltip
                            formatter={detailTooltipFormatter}
                            labelFormatter={(label, payload) => payload?.[0]?.payload?.rawTime ?? label}
                          />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          <Line
                            type="monotone"
                            dataKey="pageView"
                            name="PV"
                            stroke="#2563eb"
                            strokeWidth={3}
                            dot={{ r: 3 }}
                            activeDot={{ r: 4 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="viewer"
                            name="사용자"
                            stroke="#ec4899"
                            strokeWidth={3}
                            dot={{ r: 3 }}
                            activeDot={{ r: 4 }}
                          />
                        </LineChart>
                      ) : (
                        <BarChart data={detailChartData} margin={{ top: 16, right: 16, bottom: 12, left: 8 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 11, fill: chartAxisColor }}
                          height={36}
                          axisLine={{ stroke: chartAxisColor }}
                          tickLine={{ stroke: chartAxisColor }}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: chartAxisColor }}
                          width={60}
                          allowDecimals={false}
                          axisLine={{ stroke: chartAxisColor }}
                          tickLine={{ stroke: chartAxisColor }}
                        />
                          <RechartsTooltip
                            formatter={detailTooltipFormatter}
                            labelFormatter={(label, payload) => payload?.[0]?.payload?.rawTime ?? label}
                          />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          <Bar
                            dataKey="pageView"
                            name="PV"
                            fill="#2563eb"
                            radius={[6, 6, 0, 0]}
                            barSize={28}
                          />
                          <Bar
                            dataKey="viewer"
                            name="사용자"
                            fill="#ec4899"
                            radius={[6, 6, 0, 0]}
                            barSize={28}
                          />
                        </BarChart>
                      )}
                    </RechartsResponsiveContainer>
                  </div>
                  <div className="pageview-widget__modal-table-wrapper">
                    <table className="pageview-widget__modal-table">
                      <thead>
                        <tr>
                          <th>시간</th>
                          <th>PV</th>
                          <th>사용자</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailChartData.map((item, index) => (
                          <tr key={`${item.rawTime}-${index}`}>
                            <td title={item.rawTime}>{item.label}</td>
                            <td>{formatNumber(item.pageView)}</td>
                            <td>{formatNumber(item.viewer)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
      <FavoritesTroublePopup
        open={Boolean(troublePopup)}
        applicationId={resolvedApplicationId}
        osType={apiOsType === "all" ? null : apiOsType}
        tmzutc={tmzutc}
        dateType={troublePopup?.dateType ?? "DAY"}
        reqUrl={troublePopup?.reqUrl ?? null}
        initialType={troublePopup?.initialType ?? "error"}
        hasError={Boolean(troublePopup?.hasError)}
        hasCrash={Boolean(troublePopup?.hasCrash)}
        onClose={() => setTroublePopup(null)}
      />
    </div>
  );
}
