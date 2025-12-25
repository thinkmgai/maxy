"use client";

import {
  type CSSProperties,
  type FocusEvent as ReactFocusEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  type CalendarRange,
  formatDateISO,
  isoStringToDate,
} from "../../../../components/calendar/RangeCalendar";
import { FunnelRangeCalendar } from "./FunnelRangeCalendar";
import {
  DEFAULT_PERIOD_VALUE,
  DEFAULT_RANGE,
  FUNNEL_PERIOD_PRESETS,
  clampMonthToPresent,
  type DraftRange,
  type FunnelPeriodPresetId,
  type RequiredCalendarRange,
  calculateInclusiveDays,
  normalizeRange,
  normalisePeriodValueForSave,
  resolvePeriodToRange,
  resolvePeriodValue,
  toRangePeriodValue,
} from "../utils/period";
import {
  Bar,
  ComposedChart,
  CartesianGrid,
  ResponsiveContainer,
  Customized,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
  Label,
} from "recharts";

import type {
  FunnelDetailStep,
  FunnelDetailStepGroup,
  FunnelGroup,
  FunnelSummary,
  FunnelPeriodValue,
} from "../../../api/FunnelAnalysis";
import { getFunnelDetail } from "../../../api/FunnelAnalysis";

type FunnelMainContentProps = {
  onStart: () => void;
  selectedFunnel: FunnelSummary | null;
  loading: boolean;
  error: string | null;
  hasData: boolean;
  onDetailStepsChange?: (steps: FunnelDetailStep[] | null) => void;
};

type ChartDescriptor = {
  id: "funnel" | "vertical" | "horizontal";
  title: string;
  subtitle: string;
};

type ChartSeriesEntry = {
  key: string;
  id: number | null;
  name: string;
  color: string;
};

type TooltipStats = {
  active: number;
  dropoff: number;
  conversionRate: number | null;
  dropoffRate: number | null;
  entrance?: number | null;
  skipped?: number | null;
};

type TooltipStatsMap = Map<string, Map<string, TooltipStats>>;

type ChartModel = {
  data: Array<Record<string, number | string>>;
  series: ChartSeriesEntry[];
  maxValue: number;
  startTotal: number;
  endTotal: number;
  firstStepName: string | null;
  lastStepName: string | null;
  tooltipLookup: TooltipStatsMap;
};

type FunnelChartTooltipProps = {
  active?: boolean;
  label?: string | number;
  payload?: Array<{
    dataKey?: string | number;
    value?: number | string;
  }>;
};

type FunnelHoverState = {
  stepName: string;
  seriesKey: string;
  position: {
    x: number;
    y: number;
  };
};

type DetailHoverState = {
  stepName: string;
  seriesKey: string;
  position: {
    x: number;
    y: number;
  };
};

type FunnelStepSegment = {
  key: string;
  value: number;
  percent: number;
  series: ChartSeriesEntry;
};

type FunnelStepRow = {
  key: string;
  order: number;
  stepName: string;
  total: number;
  widthPercent: number;
  segments: FunnelStepSegment[];
};

type DisplayDate = {
  iso: string;
  main: string;
  long: string;
};

type PeriodDisplay = {
  isSingle: boolean;
  start: DisplayDate;
  end: DisplayDate;
};

type DetailTableRowBase = {
  key: string;
  stageOrder: number;
  stageName: string;
  groupName: string;
  groupColor: string;
  activeCount: number;
  firstStepPercent: number | null;
  completionRate: number | null;
  dropoffCount: number | null;
  dropoffRate: number | null;
};

type DetailTableRow = DetailTableRowBase & {
  showStageCell: boolean;
  rowSpan: number;
};

type AreaTooltipState = {
  stepName: string;
  seriesKey: string;
  position: {
    x: number;
    y: number;
  };
};

const createChartCardIcon = (chartId: number): ReactElement | null => {
  const chart = chartDictionary[chartId];
  if (!chart) {
    return null;
  }
  const suffix = `${chart.id}-${chartId}`;

  if (chart.id === "funnel") {
    const gradientId = `funnelGradient-${suffix}`;
    const baseGradientId = `funnelBase-${suffix}`;
    return (
      <svg className="funnel-chart-icon" viewBox="0 0 120 90" role="presentation" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="0%" x2="0%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
          <linearGradient id={baseGradientId} x1="0%" x2="100%" y1="0%" y2="0%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
        </defs>
        <rect x="14" y="16" width="92" height="30" rx="8" fill={`url(#${gradientId})`} />
        <path
          d="M18 50h84l-30 22v12c0 3.3-2.7 6-6 6h-12c-3.3 0-6-2.7-6-6V72L18 50Z"
          fill={`url(#${baseGradientId})`}
        />
        <circle cx="36" cy="28" r="4" fill="#e0f2fe" />
        <circle cx="60" cy="28" r="4" fill="#dbeafe" />
        <circle cx="84" cy="28" r="4" fill="#e0f2fe" />
      </svg>
    );
  }

  if (chart.id === "vertical") {
    const gradientA = `barGradientA-${suffix}`;
    const gradientB = `barGradientB-${suffix}`;
    const gradientC = `barGradientC-${suffix}`;
    return (
      <svg className="funnel-chart-icon" viewBox="0 0 120 90" role="presentation" aria-hidden="true">
        <defs>
          <linearGradient id={gradientA} x1="0%" x2="0%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
          <linearGradient id={gradientB} x1="0%" x2="0%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#f97316" />
          </linearGradient>
          <linearGradient id={gradientC} x1="0%" x2="0%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#0ea5e9" />
          </linearGradient>
        </defs>
        <rect x="20" y="34" width="18" height="36" rx="6" fill={`url(#${gradientA})`} />
        <rect x="50" y="20" width="18" height="50" rx="6" fill={`url(#${gradientB})`} />
        <rect x="80" y="10" width="18" height="60" rx="6" fill={`url(#${gradientC})`} />
        <line x1="18" y1="72" x2="102" y2="72" stroke="#cbd5f5" strokeWidth="2" strokeLinecap="round" />
        <line x1="18" y1="50" x2="102" y2="50" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4" />
      </svg>
    );
  }

  if (chart.id === "horizontal") {
    const gradientA = `hBarGradientA-${suffix}`;
    const gradientB = `hBarGradientB-${suffix}`;
    const gradientC = `hBarGradientC-${suffix}`;
    return (
      <svg className="funnel-chart-icon" viewBox="0 0 120 90" role="presentation" aria-hidden="true">
        <defs>
          <linearGradient id={gradientA} x1="0%" x2="100%" y1="0%" y2="0%">
            <stop offset="0%" stopColor="#fb7185" />
            <stop offset="100%" stopColor="#f97316" />
          </linearGradient>
          <linearGradient id={gradientB} x1="0%" x2="100%" y1="0%" y2="0%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
          <linearGradient id={gradientC} x1="0%" x2="100%" y1="0%" y2="0%">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
        </defs>
        <rect x="20" y="18" width="76" height="14" rx="7" fill={`url(#${gradientA})`} />
        <rect x="20" y="40" width="60" height="14" rx="7" fill={`url(#${gradientB})`} />
        <rect x="20" y="62" width="44" height="14" rx="7" fill={`url(#${gradientC})`} />
        <line x1="20" y1="15" x2="20" y2="80" stroke="#cbd5f5" strokeWidth="2" strokeLinecap="round" />
        <circle cx="20" cy="18" r="3" fill="#cbd5f5" />
        <circle cx="20" cy="40" r="3" fill="#cbd5f5" />
        <circle cx="20" cy="62" r="3" fill="#cbd5f5" />
      </svg>
    );
  }

  return null;
};

const chartDictionary: Record<number, ChartDescriptor> = {
  1: { id: "funnel", title: "퍼널", subtitle: "전환 퍼널" },
  2: { id: "vertical", title: "세로 막대", subtitle: "세로 막대" },
  3: { id: "horizontal", title: "가로 막대", subtitle: "가로 막대" },
};

const chartOrder = [1, 2, 3] as const;
const defaultGroupPalette = ["#2563eb", "#7c3aed", "#0ea5e9", "#f97316", "#10b981", "#ec4899"];
const CHART_PADDING = 22;
const VERTICAL_AXIS_WIDTH = 64;
const HORIZONTAL_AXIS_WIDTH = 110;
const VERTICAL_BAR_CATEGORY_GAP = 0.2;
const VERTICAL_BAR_GAP = 12;
const HORIZONTAL_BAR_CATEGORY_GAP = 0.26;
const HORIZONTAL_BAR_GAP = 8;
const MIN_FUNNEL_WIDTH_PERCENT = 10;
const FUNNEL_TOOLTIP_OFFSET = 12;
const FUNNEL_RENDER_MODE_OPTIONS = [
  { id: "custom", label: "스텝형" },
  { id: "area", label: "면적형" },
] as const;
const AREA_CHART_VIEWBOX_WIDTH = 1000;
const AREA_CHART_VIEWBOX_HEIGHT = 320;
const AREA_CHART_PADDING = { top: 20, right: 30, bottom: 42, left: 50 };

const getChartMargins = (chartId: number | null | undefined) => {
  const chart = chartId != null ? chartDictionary[chartId] : null;
  if (!chart) {
    return { left: CHART_PADDING, right: CHART_PADDING };
  }
  if (chart.id === "vertical") {
    return {
      left: Math.max(CHART_PADDING - VERTICAL_AXIS_WIDTH, 0),
      right: CHART_PADDING,
    };
  }
  return { left: CHART_PADDING, right: CHART_PADDING };
};

const getDetailPadding = (chartId: number | null | undefined) => {
  const { left, right } = getChartMargins(chartId);
  const chart = chartId != null ? chartDictionary[chartId] : null;
  const axisWidth =
    chart?.id === "vertical"
      ? VERTICAL_AXIS_WIDTH
      : chart?.id === "horizontal"
        ? HORIZONTAL_AXIS_WIDTH
        : 0;

  return {
    paddingLeft: Math.max(left + axisWidth, 0),
    paddingRight: Math.max(right, 0),
  };
};

type HighlightRibbonProps = {
  layout: "horizontal" | "vertical";
  seriesEntry: ChartSeriesEntry;
};

const HighlightRibbon = ({ layout, seriesEntry }: HighlightRibbonProps) => (
  <Customized component={<HighlightRibbonShape layout={layout} seriesEntry={seriesEntry} />} />
);

type HighlightRibbonShapeProps = {
  layout: "horizontal" | "vertical";
  seriesEntry: ChartSeriesEntry;
  formattedGraphicalItems?: Array<{
    props?: {
      dataKey?: string;
      points?: Array<{ x: number; y: number; width: number; height: number }>;
    };
  }>;
};

const HighlightRibbonShape = ({
  layout,
  seriesEntry,
  formattedGraphicalItems,
}: HighlightRibbonShapeProps) => {
  if (!formattedGraphicalItems) {
    return null;
  }

  const targetItem = formattedGraphicalItems.find(
    (item) => item?.props?.dataKey === seriesEntry.key && Array.isArray(item?.props?.points),
  );

  if (!targetItem) {
    return null;
  }

  const points = targetItem.props?.points;
  if (!Array.isArray(points) || points.length === 0) {
    return null;
  }
  const typedPoints = points as Array<{ x: number; y: number; width: number; height: number }>;

  const color = toRgba(seriesEntry.color, 0.5);

  if (layout === "vertical") {
    const minWidth = typedPoints.reduce(
      (min, point) => Math.min(min, point.width),
      Number.POSITIVE_INFINITY,
    );
    if (!Number.isFinite(minWidth) || minWidth <= 0) {
      return null;
    }
    const thickness = Math.max(Math.min(minWidth * 0.35, 14), 6);
    const path: string[] = [`M ${typedPoints[0].x + typedPoints[0].width} ${typedPoints[0].y}`];
    typedPoints.slice(1).forEach((point) => {
      path.push(`L ${point.x + point.width} ${point.y}`);
    });
    for (let index = typedPoints.length - 1; index >= 0; index -= 1) {
      const point = typedPoints[index];
      const innerX = Math.max(point.x + point.width - thickness, point.x);
      path.push(`L ${innerX} ${point.y + point.height}`);
      path.push(`L ${innerX} ${point.y}`);
    }
    path.push("Z");
    return <path d={path.join(" ")} fill={color} stroke="none" pointerEvents="none" />;
  }

  const minHeight = typedPoints.reduce(
    (min, point) => Math.min(min, point.height),
    Number.POSITIVE_INFINITY,
  );
  if (!Number.isFinite(minHeight) || minHeight <= 0) {
    return null;
  }
  const thickness = Math.max(Math.min(minHeight * 0.35, 14), 6);
  const path: string[] = [`M ${typedPoints[0].x} ${typedPoints[0].y}`];
  typedPoints.forEach((point) => {
    path.push(`L ${point.x + point.width} ${point.y}`);
  });
  for (let index = typedPoints.length - 1; index >= 0; index -= 1) {
    const point = typedPoints[index];
    const innerY = Math.min(point.y + thickness, point.y + point.height);
    path.push(`L ${point.x + point.width} ${innerY}`);
    path.push(`L ${point.x} ${innerY}`);
  }
  path.push("Z");

  return <path d={path.join(" ")} fill={color} stroke="none" pointerEvents="none" />;
};

function parseHexColor(color: string): { r: number; g: number; b: number } | null {
  const trimmed = color.trim();
  if (!trimmed.startsWith("#")) {
    return null;
  }
  let normalized = trimmed.slice(1);
  if (normalized.length === 3) {
    normalized = normalized
      .split("")
      .map((char) => char + char)
      .join("");
  }
  if (normalized.length !== 6) {
    return null;
  }
  const numeric = Number.parseInt(normalized, 16);
  if (Number.isNaN(numeric)) {
    return null;
  }
  return {
    r: (numeric >> 16) & 0xff,
    g: (numeric >> 8) & 0xff,
    b: numeric & 0xff,
  };
}

function resolveGroupColor(group: FunnelGroup | undefined, index: number): string {
  if (group && typeof group === "object") {
    const record = group as Record<string, unknown>;
    const candidate =
      record.color ??
      record.colour ??
      record.hexColor ??
      record.hex ??
      record.backgroundColor ??
      record.bgColor ??
      null;
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }
  return defaultGroupPalette[index % defaultGroupPalette.length];
}

function toRgba(color: string, alpha: number): string {
  const parsed = parseHexColor(color);
  if (!parsed) {
    return color;
  }
  return `rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, ${alpha})`;
}

function createGroupChipStyles(color: string): CSSProperties {
  const rgb = parseHexColor(color);
  if (!rgb) {
    return {
      "--segment-color": color,
    } as CSSProperties;
  }
  const { r, g, b } = rgb;
  return {
    "--segment-color": `rgb(${r}, ${g}, ${b})`,
    "--segment-color-soft": `rgba(${r}, ${g}, ${b}, 0.16)`,
    "--segment-color-border": `rgba(${r}, ${g}, ${b}, 0.38)`,
  } as CSSProperties;
}

function formatDisplayDate(date: Date): DisplayDate {
  const iso = formatDateISO(date);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const main = `${year}.${month}.${day}`;
  const long = date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return { iso, main, long };
}

function getGroupKey(group: FunnelGroup | undefined, index: number) {
  if (!group) {
    return `segment-${index}`;
  }
  if (group.id != null) {
    return `id-${group.id}`;
  }
  if (group.name) {
    return `name-${group.name}`;
  }
  return `segment-${index}`;
}

function normaliseChartValues(chart: FunnelSummary["chart"] | null | undefined) {
  if (Array.isArray(chart)) {
    return chart;
  }
  if (chart == null) {
    return [];
  }
  return [chart];
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

const PLACEHOLDER = "-";

function formatPercent(value: number) {
  const percentValue = Math.abs(value) <= 1 ? value * 100 : value;
  return `${percentValue.toFixed(1)}%`;
}

function parseChartValue(value: number | string | undefined): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(value, 0);
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? Math.max(parsed, 0) : 0;
  }
  return 0;
}

function clampPercent(value: number, min = 0, max = 100) {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(Math.max(value, min), max);
}

/** Main viewport for the funnel analysis landing page. */
export default function FunnelMainContent({
  onStart,
  selectedFunnel,
  loading,
  error,
  hasData,
  onDetailStepsChange,
}: FunnelMainContentProps) {
  const [selectedGroupKeys, setSelectedGroupKeys] = useState<Set<string>>(() => new Set());
  const [activeChartId, setActiveChartId] = useState<number>(chartOrder[0]);
  const [pathType, setPathType] = useState<"open" | "closed">("closed");
  const [periodValue, setPeriodValue] = useState<FunnelPeriodValue>(DEFAULT_PERIOD_VALUE);
  const [draftPeriodValue, setDraftPeriodValue] = useState<FunnelPeriodValue>(DEFAULT_PERIOD_VALUE);
  const [draftRange, setDraftRange] = useState<DraftRange>(DEFAULT_RANGE);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(
    () => clampMonthToPresent(isoStringToDate(DEFAULT_RANGE.startDate) ?? new Date()),
  );
  const [tooltipSeriesKey, setTooltipSeriesKey] = useState<string | null>(null);
  const resolvedRange = useMemo(
    () => normalizeRange(resolvePeriodToRange(periodValue), DEFAULT_RANGE),
    [periodValue],
  );
  const periodPresetLabel = useMemo(() => {
    if (periodValue?.type === "day") {
      return null;
    }
    const preset = FUNNEL_PERIOD_PRESETS.find((presetOption) => presetOption.match(periodValue));
    return preset?.label ?? null;
  }, [periodValue]);
  const calendarTriggerRef = useRef<HTMLButtonElement | null>(null);
  const calendarPopoverRef = useRef<HTMLDivElement | null>(null);
  const dayCount = useMemo(
    () => calculateInclusiveDays(resolvedRange),
    [resolvedRange],
  );
  const periodDisplay = useMemo<PeriodDisplay | null>(() => {
    const startDate = isoStringToDate(resolvedRange.startDate);
    const endDate = isoStringToDate(resolvedRange.endDate);
    if (!startDate || !endDate) {
      return null;
    }
    const start = formatDisplayDate(startDate);
    const end = formatDisplayDate(endDate);
    const isSingle = start.iso === end.iso;
    return { isSingle, start, end };
  }, [resolvedRange]);
  const periodAccessibleLabel = useMemo(() => {
    if (!periodDisplay) {
      return "기간을 선택하세요";
    }
    if (periodDisplay.isSingle) {
      return periodDisplay.start.long;
    }
    return `${periodDisplay.start.long} ~ ${periodDisplay.end.long}`;
  }, [periodDisplay]);
  const visibleCalendarRange = useMemo<CalendarRange | null>(() => {
    if (!draftRange) {
      return null;
    }
    const { startDate, endDate } = draftRange;
    if (!startDate) {
      return null;
    }
    if (!endDate) {
      return { startDate, endDate: startDate };
    }
    return normalizeRange(draftRange, resolvedRange);
  }, [draftRange, resolvedRange]);
  const activePresetId = useMemo<FunnelPeriodPresetId | null>(() => {
    const preset = FUNNEL_PERIOD_PRESETS.find((option) => option.match(draftPeriodValue));
    return preset?.id ?? null;
  }, [draftPeriodValue]);
  const previousCalendarMonth = useMemo(() => {
    const prev = new Date(calendarMonth);
    prev.setMonth(prev.getMonth() - 1);
    return clampMonthToPresent(prev);
  }, [calendarMonth]);
  const handlePathTypeChange = useCallback((next: "open" | "closed") => {
    setPathType(next);
  }, []);

  const [detailSteps, setDetailSteps] = useState<FunnelDetailStep[] | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [highlightedGroupId, setHighlightedGroupId] = useState<number | null>(null);
  const [funnelTooltip, setFunnelTooltip] = useState<FunnelHoverState | null>(null);
  const [detailTooltip, setDetailTooltip] = useState<DetailHoverState | null>(null);
  const [funnelRenderMode, setFunnelRenderMode] = useState<"custom" | "area">("custom");
  const isFunnelChartActive = chartDictionary[activeChartId]?.id === "funnel";
  const funnelChartRef = useRef<HTMLDivElement | null>(null);
  const funnelAreaChartRef = useRef<HTMLDivElement | null>(null);
  const detailResultsRef = useRef<HTMLDivElement | null>(null);
  const [areaTooltip, setAreaTooltip] = useState<AreaTooltipState | null>(null);
  const savedPathType = selectedFunnel?.route === 2 ? "open" : "closed";

  useEffect(() => {
    const next = new Set<string>();
    selectedFunnel?.group?.forEach((group, index) => {
      next.add(getGroupKey(group, index));
    });
    setSelectedGroupKeys(next);
  }, [selectedFunnel]);

  useEffect(() => {
    setHighlightedGroupId(null);
  }, [selectedFunnel?.id]);

  useEffect(() => {
    if (!isFunnelChartActive) {
      setFunnelTooltip(null);
    }
  }, [isFunnelChartActive]);

  useEffect(() => {
    if (!isFunnelChartActive) {
      setFunnelRenderMode("custom");
    }
  }, [isFunnelChartActive]);

  useEffect(() => {
    if (funnelRenderMode !== "custom") {
      setFunnelTooltip(null);
    }
  }, [funnelRenderMode]);

  useEffect(() => {
    if (funnelRenderMode !== "area") {
      setAreaTooltip(null);
    }
  }, [funnelRenderMode]);

  const handleFunnelSegmentHover = useCallback(
    (event: ReactMouseEvent<HTMLElement>, stepName: string, seriesKey: string) => {
      if (!funnelChartRef.current) {
        return;
      }
      const bounds = funnelChartRef.current.getBoundingClientRect();
      setFunnelTooltip({
        stepName,
        seriesKey,
        position: {
          x: event.clientX - bounds.left,
          y: event.clientY - bounds.top,
        },
      });
    },
    [],
  );

  const handleFunnelSegmentFocus = useCallback(
    (event: ReactFocusEvent<HTMLElement>, stepName: string, seriesKey: string) => {
      if (!funnelChartRef.current) {
        return;
      }
      const containerBounds = funnelChartRef.current.getBoundingClientRect();
      const targetBounds = event.currentTarget.getBoundingClientRect();
      setFunnelTooltip({
        stepName,
        seriesKey,
        position: {
          x: targetBounds.left + targetBounds.width / 2 - containerBounds.left,
          y: targetBounds.top + targetBounds.height / 2 - containerBounds.top,
        },
      });
    },
    [],
  );

  const clearFunnelTooltip = useCallback(() => {
    setFunnelTooltip(null);
    setTooltipSeriesKey(null);
  }, []);

  const handleDetailGroupHover = useCallback(
    (event: ReactMouseEvent<HTMLElement>, stepName: string, seriesKey: string) => {
      setDetailTooltip({
        stepName,
        seriesKey,
        position: { x: event.clientX, y: event.clientY },
      });
    },
    [],
  );

  const handleDetailGroupFocus = useCallback(
    (event: ReactFocusEvent<HTMLElement>, stepName: string, seriesKey: string) => {
      const rect = event.currentTarget.getBoundingClientRect();
      setDetailTooltip({
        stepName,
        seriesKey,
        position: {
          x: rect.left + rect.width / 2,
          y: rect.top,
        },
      });
    },
    [],
  );

  const clearDetailTooltip = useCallback(() => {
    setDetailTooltip(null);
  }, []);

  const handleAreaMarkerEnter = useCallback(
    (event: ReactMouseEvent<SVGCircleElement>, stepName: string, seriesKey: string) => {
      if (!funnelAreaChartRef.current) {
        return;
      }
      setTooltipSeriesKey(seriesKey);
      setAreaTooltip({
        stepName,
        seriesKey,
        position: {
          x: event.clientX,
          y: event.clientY,
        },
      });
    },
    [setTooltipSeriesKey],
  );

  const clearAreaTooltip = useCallback(() => {
    setAreaTooltip(null);
    setTooltipSeriesKey(null);
  }, []);

  useEffect(() => {
    const resolved = resolvePeriodValue(selectedFunnel?.period) ?? DEFAULT_PERIOD_VALUE;
    setPeriodValue(resolved);
    setDraftPeriodValue(resolved);
    const normalized = normalizeRange(resolvePeriodToRange(resolved), DEFAULT_RANGE);
    setDraftRange(normalized);
    setCalendarMonth(
      clampMonthToPresent(isoStringToDate(normalized.startDate) ?? new Date()),
    );
  }, [selectedFunnel]);

  useEffect(() => {
    const validCharts = normaliseChartValues(selectedFunnel?.chart)
      .map((value) => {
        const numericValue =
          typeof value === "number" ? value : Number.parseInt(String(value), 10);
        return Number.isFinite(numericValue) ? numericValue : null;
      })
      .filter((value): value is number => value != null && chartDictionary[value] != null);

    setActiveChartId(validCharts[0] ?? chartOrder[0]);
  }, [selectedFunnel]);

  const groups = selectedFunnel?.group ?? [];

  const buildDetailGroupKey = useCallback((groupDetail: FunnelDetailStepGroup) => {
    if (groupDetail?.id != null) {
      return `id-${groupDetail.id}`;
    }
    if (typeof groupDetail?.name === "string" && groupDetail.name.trim().length > 0) {
      return `name-${groupDetail.name.trim()}`;
    }
    return `order-${groupDetail?.order ?? "unknown"}`;
  }, []);

  const groupOrderMap = useMemo(() => {
    const byId = new Map<number, number>();
    const byName = new Map<string, number>();
    groups.forEach((group, index) => {
      if (group?.id != null) {
        byId.set(group.id, index);
      }
      const name =
        typeof group?.name === "string" && group.name.trim().length > 0 ? group.name.trim() : null;
      if (name) {
        byName.set(name, index);
      }
    });
    return { byId, byName };
  }, [groups]);

  const groupColorById = useMemo(() => {
    const map = new Map<number, string>();

    groups.forEach((group, index) => {
      if (group?.id == null) {
        return;
      }
      if (!map.has(group.id)) {
        map.set(group.id, resolveGroupColor(group, index));
      }
    });

    detailSteps?.forEach((step) => {
      step.groups?.forEach((groupDetail, index) => {
        if (groupDetail?.id == null || map.has(groupDetail.id)) {
          return;
        }
        const directColor =
          typeof groupDetail.color === "string" && groupDetail.color.trim().length > 0
            ? groupDetail.color.trim()
            : null;
        map.set(groupDetail.id, directColor ?? defaultGroupPalette[index % defaultGroupPalette.length]);
      });
    });

    return map;
  }, [groups, detailSteps]);

  const getGroupSortOrder = useCallback(
    (groupDetail: FunnelDetailStepGroup | null | undefined) => {
      const mapped =
        (groupDetail?.id != null ? groupOrderMap.byId.get(groupDetail.id) : undefined) ??
        (typeof groupDetail?.name === "string" && groupDetail.name.trim().length > 0
          ? groupOrderMap.byName.get(groupDetail.name.trim())
          : undefined);
      if (mapped != null) {
        return mapped;
      }
      if (typeof groupDetail?.order === "number") {
        return groupDetail.order - 1;
      }
      return Number.MAX_SAFE_INTEGER;
    },
    [groupOrderMap],
  );

  const compareGroupDetails = useCallback(
    (a: FunnelDetailStepGroup, b: FunnelDetailStepGroup) => {
      const orderA = getGroupSortOrder(a);
      const orderB = getGroupSortOrder(b);
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      const rawOrderA = typeof a?.order === "number" ? a.order : Number.MAX_SAFE_INTEGER;
      const rawOrderB = typeof b?.order === "number" ? b.order : Number.MAX_SAFE_INTEGER;
      if (rawOrderA !== rawOrderB) {
        return rawOrderA - rawOrderB;
      }
      const nameA = typeof a?.name === "string" ? a.name : "";
      const nameB = typeof b?.name === "string" ? b.name : "";
      return nameA.localeCompare(nameB, "ko");
    },
    [getGroupSortOrder],
  );

  const getGroupPresentation = useCallback(
    (groupDetail: FunnelDetailStepGroup, fallbackIndex: number): ChartSeriesEntry => {
      const summaryGroup =
        groupDetail?.id != null ? groups.find((group) => group?.id === groupDetail.id) : undefined;
      const paletteIndex =
        typeof groupDetail?.order === "number" && groupDetail.order > 0
          ? groupDetail.order - 1
          : fallbackIndex;
      const baseIndex = Number.isFinite(paletteIndex) ? Math.max(0, paletteIndex) : fallbackIndex;
      const preferredColor =
        typeof groupDetail?.color === "string" && groupDetail.color.trim().length > 0
          ? groupDetail.color.trim()
          : null;
      const color =
        preferredColor ??
        (groupDetail?.id != null ? groupColorById.get(groupDetail.id) : null) ??
        (summaryGroup ? resolveGroupColor(summaryGroup, baseIndex) : null) ??
        defaultGroupPalette[baseIndex % defaultGroupPalette.length];
      const rawName =
        typeof groupDetail?.name === "string" && groupDetail.name.trim().length > 0
          ? groupDetail.name.trim()
          : summaryGroup?.name && summaryGroup.name.trim().length > 0
            ? summaryGroup.name.trim()
            : null;
      const name =
        rawName ??
        (groupDetail?.id != null ? `세그먼트 ${groupDetail.id}` : `세그먼트${baseIndex + 1}`);
      const key =
        groupDetail?.id != null
          ? `id_${groupDetail.id}`
          : rawName
            ? `name_${rawName}`
            : `order_${groupDetail.order ?? baseIndex}_${baseIndex}`;
      return {
        id: groupDetail?.id ?? null,
        key,
        name,
        color,
      };
    },
    [groups, groupColorById],
  );

  const toggleGroup = (key: string) => {
    setSelectedGroupKeys((prev) => {
      if (prev.has(key) && prev.size <= 1) {
        return prev;
      }
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const toggleChart = (chartId: number) => {
    setActiveChartId((current) => (current === chartId ? current : chartId));
  };

  const toggleHighlightedGroup = (groupId: number | null) => {
    setHighlightedGroupId((current) => (current === groupId ? null : groupId));
  };

  const handleCalendarToggle = useCallback(() => {
    if (isCalendarOpen) {
      setIsCalendarOpen(false);
      setDraftRange(resolvedRange);
      setDraftPeriodValue(periodValue);
      return;
    }
    setDraftRange(resolvedRange);
    setDraftPeriodValue(periodValue);
    const focusDate =
      isoStringToDate(resolvedRange.startDate) ??
      isoStringToDate(resolvedRange.endDate) ??
      new Date();
    setCalendarMonth(clampMonthToPresent(focusDate));
    setIsCalendarOpen(true);
  }, [isCalendarOpen, periodValue, resolvedRange]);

  const handleCalendarCancel = useCallback(() => {
    setDraftRange(resolvedRange);
    setDraftPeriodValue(periodValue);
    setIsCalendarOpen(false);
  }, [periodValue, resolvedRange]);

  const handleSelectDate = useCallback((date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const candidate = new Date(date);
    candidate.setHours(0, 0, 0, 0);
    const effectiveDate = candidate.getTime() > today.getTime() ? today : candidate;
    const iso = formatDateISO(effectiveDate);
    setDraftRange((prev) => {
      let nextRange: DraftRange;
      if (!prev || !prev.startDate || (prev.startDate && prev.endDate)) {
        nextRange = { startDate: iso };
      } else if (!prev.endDate) {
        if (iso < prev.startDate) {
          nextRange = { startDate: iso, endDate: prev.startDate };
        } else {
          nextRange = { startDate: prev.startDate, endDate: iso };
        }
      } else {
        nextRange = { startDate: iso };
      }
      if (nextRange?.startDate) {
        const finalEnd = nextRange.endDate ?? nextRange.startDate;
        setDraftPeriodValue({
          type: "range",
          from: nextRange.startDate,
          to: finalEnd,
        });
      }
      return nextRange;
    });
  }, []);

  const handleCalendarApply = useCallback(() => {
    const normalizedRange = normalizeRange(draftRange, resolvedRange);
    if (draftPeriodValue.type === "range") {
      setDraftPeriodValue({
        type: "range",
        from: normalizedRange.startDate,
        to: normalizedRange.endDate,
      });
    }
    const normalizedValue = normalisePeriodValueForSave(draftPeriodValue, normalizedRange);
    setPeriodValue(normalizedValue);
    setDraftRange(normalizedRange);
    setIsCalendarOpen(false);
  }, [draftPeriodValue, draftRange, resolvedRange]);

  const handlePresetSelect = useCallback((presetId: FunnelPeriodPresetId) => {
    const preset = FUNNEL_PERIOD_PRESETS.find((option) => option.id === presetId);
    if (!preset) {
      return;
    }
    const selection = preset.resolve();
    setDraftPeriodValue(selection.period);
    setDraftRange(selection.range);
    const currentMonth = new Date();
    currentMonth.setDate(1);
    setCalendarMonth(clampMonthToPresent(currentMonth));
  }, []);

  const handlePrimaryMonthChange = useCallback((date: Date) => {
    setCalendarMonth(clampMonthToPresent(date));
  }, []);

  const handleSecondaryMonthChange = useCallback((date: Date) => {
    const next = new Date(date);
    next.setMonth(next.getMonth() + 1);
    setCalendarMonth(clampMonthToPresent(next));
  }, []);

  const canApplyCalendar = draftRange !== null && !!draftRange.startDate;

  useEffect(() => {
    if (!isCalendarOpen) {
      return;
    }

    const handleDocumentClick = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) {
        return;
      }

      const triggerEl = calendarTriggerRef.current;
      const popoverEl = calendarPopoverRef.current;
      const clickedInsidePopover = popoverEl?.contains(target) ?? false;
      const clickedTrigger = triggerEl?.contains(target) ?? false;

      if (!clickedInsidePopover && !clickedTrigger) {
        setIsCalendarOpen(false);
        setDraftRange(resolvedRange);
        setDraftPeriodValue(periodValue);
      }
    };

    document.addEventListener("mousedown", handleDocumentClick);
    document.addEventListener("touchstart", handleDocumentClick);

    return () => {
      document.removeEventListener("mousedown", handleDocumentClick);
      document.removeEventListener("touchstart", handleDocumentClick);
    };
  }, [isCalendarOpen, periodValue, resolvedRange]);

  const selectedGroupIds = useMemo(() => {
    const ids: number[] = [];
    groups.forEach((group, index) => {
      const key = getGroupKey(group, index);
      if (group?.id != null && selectedGroupKeys.has(key)) {
        ids.push(group.id);
      }
    });
    return ids.sort((a, b) => a - b);
  }, [groups, selectedGroupKeys]);

  const summaryKeyById = useMemo(() => {
    const map = new Map<number, string>();
    groups.forEach((group, index) => {
      if (!group) {
        return;
      }
      const key = getGroupKey(group, index);
      if (group.id != null) {
        map.set(group.id, key);
      }
    });
    return map;
  }, [groups]);

  const summaryKeysByIndex = useMemo(
    () => groups.map((group, index) => getGroupKey(group, index)),
    [groups],
  );

  const visibleDetailSteps = useMemo(() => {
    if (!detailSteps) {
      return null;
    }

    const selectedIds = new Set(selectedGroupIds);
    const selectedKeys = new Set(Array.from(selectedGroupKeys));

    if (groups.length === 0) {
      return detailSteps;
    }

    if (selectedKeys.size === 0) {
      return detailSteps.map((step) => ({
        ...step,
        groups: [],
      }));
    }

    if (selectedKeys.size === groups.length) {
      return detailSteps;
    }

    return detailSteps.map((step) => {
      const filteredGroups =
        step.groups?.filter((groupDetail, groupIndex) => {
          if (!groupDetail) {
            return false;
          }

          if (groupDetail.id != null) {
            if (selectedIds.has(groupDetail.id)) {
              return true;
            }
            const mappedKey = summaryKeyById.get(groupDetail.id);
            if (mappedKey && selectedKeys.has(mappedKey)) {
              return true;
            }
            return false;
          }

          const effectiveIndex =
            typeof groupDetail.order === "number" && groupDetail.order > 0
              ? groupDetail.order - 1
              : groupIndex;
          const summaryKey =
            summaryKeysByIndex[effectiveIndex] ?? summaryKeysByIndex[groupIndex];

          if (summaryKey) {
            return selectedKeys.has(summaryKey);
          }

          if (typeof groupDetail.name === "string" && groupDetail.name.trim().length > 0) {
            return selectedKeys.has(`name-${groupDetail.name.trim()}`);
          }

          return false;
        }) ?? [];

      return {
        ...step,
        groups: filteredGroups,
      };
    });
  }, [
    detailSteps,
    groups,
    selectedGroupIds,
    selectedGroupKeys,
    summaryKeyById,
    summaryKeysByIndex,
  ]);

  const lastStepOrder = useMemo(() => {
    if (!visibleDetailSteps || visibleDetailSteps.length === 0) {
      return null;
    }
    return visibleDetailSteps.reduce(
      (max, step) => (typeof step?.order === "number" && step.order > max ? step.order : max),
      0,
    );
  }, [visibleDetailSteps]);

  const openFunnelPrevActive = useMemo(() => {
    const map = new Map<string, number>();
    if (!visibleDetailSteps) {
      return map;
    }
    const tracker = new Map<string, number>();
    const orderedSteps = visibleDetailSteps.slice().sort((a, b) => a.order - b.order);
    orderedSteps.forEach((step) => {
      const orderedGroups = (step.groups ?? []).slice().sort(compareGroupDetails);
      orderedGroups.forEach((groupDetail, index) => {
        const key = buildDetailGroupKey(groupDetail) || `idx-${index}`;
        const prev = tracker.get(key) ?? 0;
        map.set(`${step.order}-${key}`, prev);
        const nextActive =
          typeof groupDetail.active_count === "number"
            ? groupDetail.active_count
            : groupDetail.active_count == null
              ? 0
              : Number.parseFloat(String(groupDetail.active_count));
        tracker.set(key, nextActive);
      });
    });
    return map;
  }, [buildDetailGroupKey, compareGroupDetails, visibleDetailSteps]);

  useEffect(() => {
    if (!selectedFunnel) {
      setDetailSteps(null);
      setDetailError(null);
      onDetailStepsChange?.(null);
      return;
    }

    const controller = new AbortController();
    setDetailSteps(null);
    setFunnelTooltip(null);
    setAreaTooltip(null);
    setHighlightedGroupId(null);
    setDetailLoading(true);
    setDetailError(null);

    const requestPayload = {
      id: selectedFunnel.id,
      group: "",
      period: toRangePeriodValue(resolvedRange),
      route: pathType === "open" ? 2 : 1,
    };

    getFunnelDetail(requestPayload, controller.signal)
      .then((steps) => {
        const ordered = steps.sort((a, b) => a.order - b.order);
        setDetailSteps(ordered);
        onDetailStepsChange?.(ordered);
      })
      .catch((fetchError) => {
        if (controller.signal.aborted) {
          return;
        }
        setDetailSteps(null);
        setDetailError(fetchError instanceof Error ? fetchError.message : "세부 정보를 불러오지 못했습니다.");
        onDetailStepsChange?.(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setDetailLoading(false);
        }
      });

    return () => controller.abort();
  }, [
    selectedFunnel,
    resolvedRange.startDate,
    resolvedRange.endDate,
    pathType,
    onDetailStepsChange,
  ]);

  useEffect(() => {
    if (highlightedGroupId == null) {
      return;
    }

    const hasHighlightedGroup =
      visibleDetailSteps?.some((step) => step.groups?.some((group) => group.id === highlightedGroupId)) ?? false;

    if (!hasHighlightedGroup) {
      setHighlightedGroupId(null);
    }
  }, [visibleDetailSteps, highlightedGroupId]);

  useEffect(() => {
    if (highlightedGroupId == null) {
      return;
    }

    if (!selectedGroupIds.includes(highlightedGroupId)) {
      setHighlightedGroupId(null);
    }
  }, [selectedGroupIds, highlightedGroupId]);

  useEffect(() => {
    setDetailTooltip(null);
  }, [visibleDetailSteps]);

  const renderDetailStepGroup = (
    groupDetail: FunnelDetailStepGroup,
    fallbackIndex: number,
    stepOrder: number,
    stepName: string,
  ) => {
    const effectiveIndex =
      typeof groupDetail.order === "number" && groupDetail.order > 0
        ? groupDetail.order - 1
        : fallbackIndex;
    const info = getGroupPresentation(groupDetail, effectiveIndex);
    const styles = createGroupChipStyles(info.color);
    const isActive = info.id != null && info.id === highlightedGroupId;

    const toCount = (value: unknown): number => {
      if (typeof value === "number" && Number.isFinite(value)) return value;
      if (typeof value === "string" && value.trim().length > 0) {
        const parsed = Number.parseFloat(value);
        return Number.isFinite(parsed) ? parsed : 0;
      }
      return 0;
    };
    const rawActive = toCount(groupDetail.active_count);
    const rawEntrance = toCount(groupDetail.entrance_count);
    const rawSkipped = toCount(groupDetail.skipped_count);
    const isOpenFunnel = pathType === "open";
    const isFirstStep = stepOrder === 1;
    const isLastStep = lastStepOrder != null && stepOrder === lastStepOrder;
    const newInflow = isOpenFunnel ? (isFirstStep ? rawActive : rawEntrance) : 0;
    const retained = isOpenFunnel ? Math.max(rawActive - newInflow, 0) : 0;
    const dropoffBase = toCount(groupDetail.dropoff_count);
    const prevKey = buildDetailGroupKey(groupDetail);
    const prevActive = isOpenFunnel ? openFunnelPrevActive.get(`${stepOrder}-${prevKey}`) ?? 0 : 0;
    const retainedForDropoff =
      isOpenFunnel && stepOrder >= 2 ? Math.max(rawActive - newInflow, 0) : rawActive;
    const computedDropoff =
      isOpenFunnel && !isLastStep ? Math.max(prevActive - retainedForDropoff, 0) : dropoffBase;
    const dropoffForDisplay =
      isOpenFunnel && dropoffBase != null && Number.isFinite(dropoffBase)
        ? dropoffBase
        : isLastStep
          ? null
          : computedDropoff;

    const activeCount = formatNumber(rawActive);
    const dropoffCount = isLastStep ? "–" : formatNumber(dropoffForDisplay ?? 0);
    const newInflowText = formatNumber(newInflow);
    const retainedText = formatNumber(retained);
    const detailSeriesKey = info.key;

    return (
      <button
        key={`${info.key}-${groupDetail.order}`}
        type="button"
        className={`funnel-step-segment${isActive ? " is-highlighted" : ""}`}
        style={styles}
        onClick={() => toggleHighlightedGroup(info.id)}
        aria-pressed={isActive}
      onMouseMove={(event) => handleDetailGroupHover(event, stepName, detailSeriesKey)}
      onMouseLeave={clearDetailTooltip}
      onFocus={(event) => handleDetailGroupFocus(event, stepName, detailSeriesKey)}
      onBlur={clearDetailTooltip}
    >
        <span className="funnel-step-segment-stats">
          <span className="funnel-step-segment-stat">
            <span className="funnel-step-segment-stat-label">
              {isOpenFunnel ? "활성(새/유지)" : "활성"}
            </span>
            <span className="funnel-step-segment-stat-value">{activeCount}</span>
            {isOpenFunnel ? (
              <span className="funnel-step-segment-stat-subvalue">
                {newInflowText} / {retainedText}
              </span>
            ) : null}
          </span>
          <span className="funnel-step-segment-stat-divider" aria-hidden="true" />
          <span className="funnel-step-segment-stat">
            <span className="funnel-step-segment-stat-label">이탈</span>
            <span className="funnel-step-segment-stat-value">{dropoffCount}</span>
            {isOpenFunnel ? (
              <span className="funnel-step-segment-stat-subvalue" aria-hidden="true">
                &nbsp;
              </span>
            ) : null}
          </span>
        </span>
      </button>
    );
  };

  const chartModel = useMemo<ChartModel>(() => {
    if (!visibleDetailSteps || visibleDetailSteps.length === 0) {
      return {
        data: [],
        series: [],
        maxValue: 0,
        startTotal: 0,
        endTotal: 0,
        firstStepName: null,
        lastStepName: null,
        tooltipLookup: new Map(),
      };
    }

    const seriesMap = new Map<string, ChartSeriesEntry>();
    const prevActiveByGroup = new Map<string, number>();
    let maxValue = 0;
    const tooltipLookup: TooltipStatsMap = new Map();

    const rows = visibleDetailSteps
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((step) => {
        const isLastStep = lastStepOrder != null && step.order === lastStepOrder;
        const row: Record<string, number | string> = {
          stepOrder: step.order,
          stepName: step.stepnm || `단계 ${step.order}`,
        };

        step.groups
          ?.slice()
          .sort(compareGroupDetails)
          .forEach((groupDetail, index) => {
            const effectiveIndex =
              typeof groupDetail.order === "number" && groupDetail.order > 0
                ? groupDetail.order - 1
                : index;
            const info = getGroupPresentation(groupDetail, effectiveIndex);
            const value = groupDetail.active_count ?? 0;
            const entrance =
              typeof groupDetail.entrance_count === "number"
                ? groupDetail.entrance_count
                : groupDetail.entrance_count == null
                  ? 0
                  : Number.parseFloat(String(groupDetail.entrance_count));
            const prevKey = info.key;
            const prevActive = prevActiveByGroup.get(prevKey) ?? 0;
            const retained = pathType === "open" ? Math.max(value - entrance, 0) : value;
            const rawDropoff =
              typeof groupDetail.dropoff_count === "number"
                ? groupDetail.dropoff_count
                : groupDetail.dropoff_count == null
                  ? null
                  : Number.parseFloat(String(groupDetail.dropoff_count));
            const computedDropoff =
              pathType === "open"
                ? Math.max(prevActive - retained, 0)
                : rawDropoff ?? 0;
            const dropoffValue =
              pathType === "open" && rawDropoff != null && Number.isFinite(rawDropoff)
                ? rawDropoff
                : isLastStep
                  ? rawDropoff ?? null
                  : computedDropoff;
            prevActiveByGroup.set(prevKey, value);
            seriesMap.set(info.key, info);
            row[info.key] = value;
            if (value > maxValue) {
              maxValue = value;
            }
            const stepName = typeof row.stepName === "string" ? row.stepName : null;
            if (stepName) {
              const stepStats = tooltipLookup.get(stepName) ?? new Map();
              stepStats.set(info.key, {
                active: groupDetail.active_count ?? 0,
                dropoff:
                  dropoffValue != null && Number.isFinite(dropoffValue) && !isLastStep
                    ? dropoffValue
                    : null,
                conversionRate:
                  typeof groupDetail.conversion_rate === "number"
                    ? groupDetail.conversion_rate
                    : typeof groupDetail.conversion_rate === "string"
                      ? Number.parseFloat(groupDetail.conversion_rate)
                      : null,
                dropoffRate:
                  typeof groupDetail.dropoff_rate === "number"
                    ? groupDetail.dropoff_rate
                    : typeof groupDetail.dropoff_rate === "string"
                      ? Number.parseFloat(groupDetail.dropoff_rate)
                      : null,
                entrance:
                  typeof groupDetail.entrance_count === "number"
                    ? groupDetail.entrance_count
                    : groupDetail.entrance_count == null
                      ? null
                      : Number.parseFloat(String(groupDetail.entrance_count)),
                skipped:
                  typeof groupDetail.skipped_count === "number"
                    ? groupDetail.skipped_count
                    : groupDetail.skipped_count == null
                      ? null
                      : Number.parseFloat(String(groupDetail.skipped_count)),
              });
              tooltipLookup.set(stepName, stepStats);
            }
          });

        return row;
      });

    const getSeriesOrder = (entry: ChartSeriesEntry) => {
      const mappedOrder =
        (entry.id != null ? groupOrderMap.byId.get(entry.id) : undefined) ??
        (entry.name ? groupOrderMap.byName.get(entry.name) : undefined);
      return mappedOrder != null ? mappedOrder : Number.MAX_SAFE_INTEGER;
    };

    const series = Array.from(seriesMap.values()).sort((a, b) => {
      const orderA = getSeriesOrder(a);
      const orderB = getSeriesOrder(b);
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      if (a.id != null && b.id != null && a.id !== b.id) {
        return a.id - b.id;
      }
      return a.name.localeCompare(b.name, "ko");
    });

    const sumRow = (row: Record<string, number | string>) =>
      series.reduce((sum, entry) => {
        const value = row[entry.key];
        return sum + (typeof value === "number" ? value : Number(value ?? 0));
      }, 0);

    const firstRow = rows[0];
    const lastRow = rows[rows.length - 1];
    const firstStepName = typeof firstRow?.stepName === "string" ? firstRow.stepName : null;
    const lastStepName =
      rows.length > 1 && typeof lastRow?.stepName === "string" ? lastRow.stepName : firstStepName;

    return {
      data: rows,
      series,
      maxValue,
      startTotal: firstRow ? sumRow(firstRow) : 0,
      endTotal: lastRow ? sumRow(lastRow) : 0,
      firstStepName,
      lastStepName,
      tooltipLookup,
    };
  }, [
    visibleDetailSteps,
    getGroupPresentation,
    groupOrderMap,
    compareGroupDetails,
    pathType,
    lastStepOrder,
  ]);

  const funnelSteps = useMemo<FunnelStepRow[]>(() => {
    if (chartModel.data.length === 0 || chartModel.series.length === 0) {
      return [];
    }

    const totals = chartModel.data.map((row) =>
      chartModel.series.reduce((sum, series) => {
        const rawValue = row[series.key] as number | string | undefined;
        return sum + parseChartValue(rawValue);
      }, 0),
    );

    const maxTotal = totals.reduce((max, value) => Math.max(max, value), 0);

    return chartModel.data.map((row, index) => {
      const total = totals[index] ?? 0;
      const rawStepName = row.stepName;
      const stepName =
        typeof rawStepName === "string" && rawStepName.trim().length > 0
          ? rawStepName
          : `단계 ${row.stepOrder ?? index + 1}`;
      const order = typeof row.stepOrder === "number" ? row.stepOrder : index + 1;
      const basePercent = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
      const widthPercent =
        total > 0 ? clampPercent(basePercent, MIN_FUNNEL_WIDTH_PERCENT, 100) : 0;
      const segments = chartModel.series
        .map((series) => {
          const rawValue = row[series.key] as number | string | undefined;
          const value = parseChartValue(rawValue);
          if (value <= 0) {
            return null;
          }
          const percent = total > 0 ? clampPercent((value / total) * 100, 0, 100) : 0;
          return {
            key: `${order}-${series.key}`,
            value,
            percent,
            series,
          };
        })
        .filter((segment): segment is FunnelStepSegment => Boolean(segment));

      return {
        key: `${order}-${stepName}`,
        order,
        stepName,
        total,
        widthPercent,
        segments,
      };
    });
  }, [chartModel]);

  const areaChartGeometry = useMemo(() => {
    if (chartModel.data.length === 0 || chartModel.series.length === 0) {
      return null;
    }
    const stepCount = chartModel.data.length;
    const innerWidth = AREA_CHART_VIEWBOX_WIDTH - AREA_CHART_PADDING.left - AREA_CHART_PADDING.right;
    const innerHeight = AREA_CHART_VIEWBOX_HEIGHT - AREA_CHART_PADDING.top - AREA_CHART_PADDING.bottom;
    const xPositions = chartModel.data.map((_, index) => {
      if (stepCount === 1) {
        return AREA_CHART_PADDING.left + innerWidth / 2;
      }
      return AREA_CHART_PADDING.left + (index / (stepCount - 1)) * innerWidth;
    });
    const stackBase = new Array(stepCount).fill(0);
    let maxStackValue = 0;
    const polygonSources: Array<{
      series: ChartSeriesEntry;
      upper: Array<[number, number]>;
      lower: Array<[number, number]>;
      isDimmed: boolean;
    }> = [];
    const markerSources: Array<{
      key: string;
      series: ChartSeriesEntry;
      stepName: string;
      x: number;
      rawY: number;
      value: number;
    }> = [];

    chartModel.series.forEach((series) => {
      const upperPoints: Array<[number, number]> = [];
      const lowerPoints: Array<[number, number]> = [];
      xPositions.forEach((x, index) => {
        const value = parseChartValue(chartModel.data[index][series.key] as number | string | undefined);
        const base = stackBase[index];
        const top = base + value;
        upperPoints.push([x, top]);
        lowerPoints.push([x, base]);
        if (value > 0) {
          const rawStepName = chartModel.data[index].stepName;
          const stepName =
            typeof rawStepName === "string" && rawStepName.trim().length > 0
              ? rawStepName
              : `단계 ${index + 1}`;
          markerSources.push({
            key: `${series.key}-${index}`,
            series,
            stepName,
            x,
            rawY: top,
            value,
          });
        }
        stackBase[index] = top;
        if (stackBase[index] > maxStackValue) {
          maxStackValue = stackBase[index];
        }
      });
      if (upperPoints.length === 0) {
        return;
      }
      polygonSources.push({
        series,
        upper: upperPoints,
        lower: lowerPoints,
        isDimmed:
          highlightedGroupId != null && series.id != null && highlightedGroupId !== series.id,
      });
    });

    const maxValue = maxStackValue > 0 ? maxStackValue * 1.1 : 1;
    const valueToY = (value: number) => {
      if (maxValue <= 0) {
        return AREA_CHART_PADDING.top + innerHeight;
      }
      const clamped = Math.min(Math.max(value / maxValue, 0), 1);
      return AREA_CHART_PADDING.top + innerHeight - clamped * innerHeight;
    };

    const polygons = polygonSources.map(({ series, upper, lower, isDimmed }) => {
      const commands: string[] = [];
      upper.forEach(([x, rawY], idx) => {
        commands.push(`${idx === 0 ? "M" : "L"} ${x} ${valueToY(rawY)}`);
      });
      for (let idx = lower.length - 1; idx >= 0; idx -= 1) {
        const [x, rawY] = lower[idx];
        commands.push(`L ${x} ${valueToY(rawY)}`);
      }
      commands.push("Z");
      return {
        series,
        path: commands.join(" "),
        isDimmed,
      };
    });

    const markers = markerSources.map((marker) => ({
      key: marker.key,
      series: marker.series,
      stepName: marker.stepName,
      x: marker.x,
      y: valueToY(marker.rawY),
      value: marker.value,
    }));

    return {
      polygons,
      markers,
      baselineY: AREA_CHART_PADDING.top + innerHeight,
      firstX: xPositions[0] ?? AREA_CHART_PADDING.left,
      lastX: xPositions[xPositions.length - 1] ?? AREA_CHART_VIEWBOX_WIDTH - AREA_CHART_PADDING.right,
    };
  }, [chartModel, highlightedGroupId]);

  useEffect(() => {
    setFunnelTooltip(null);
  }, [chartModel]);

  useEffect(() => {
    setPathType(savedPathType);
  }, [selectedFunnel?.route]);

  const detailTableRows = useMemo((): DetailTableRow[] => {
    if (!visibleDetailSteps || visibleDetailSteps.length === 0) {
      return [];
    }
    const sortedSteps = visibleDetailSteps.slice().sort((a, b) => a.order - b.order);
    const firstStepActiveByGroup: Map<number | string, number> = new Map();

    const baseRows: DetailTableRowBase[] = sortedSteps.flatMap((step, stepIndex) => {
      const nextStep = sortedSteps[stepIndex + 1];
      return (
        step.groups
          ?.slice()
          .sort(compareGroupDetails)
          .map((groupDetail, groupIndex) => {
            const info = getGroupPresentation(groupDetail, groupIndex);
            const activeCount = groupDetail.active_count ?? 0;
            const firstStepKey =
              groupDetail.id != null
                ? groupDetail.id
                : typeof groupDetail.name === "string" && groupDetail.name.trim().length > 0
                  ? groupDetail.name.trim()
                  : `order-${groupDetail.order}`;
            if (stepIndex === 0) {
              firstStepActiveByGroup.set(firstStepKey, activeCount);
            }
            const firstStepBaseline = firstStepActiveByGroup.get(firstStepKey);
            const resolvedBaseline = firstStepBaseline ?? (stepIndex === 0 ? activeCount : null);
            const firstStepPercent =
              resolvedBaseline == null
                ? null
                : resolvedBaseline === 0
                  ? activeCount === 0
                    ? 100
                    : null
                  : Math.round(((activeCount / resolvedBaseline) * 100 + Number.EPSILON) * 10) / 10;

            const matchingNextGroup =
              nextStep?.groups
                ?.slice()
                .find((candidate) => {
                  if (groupDetail.id != null && candidate.id === groupDetail.id) {
                    return true;
                  }
                  if (
                    typeof groupDetail.name === "string" &&
                    groupDetail.name.trim().length > 0 &&
                    typeof candidate.name === "string" &&
                    candidate.name.trim().length > 0
                  ) {
                    return candidate.name.trim() === groupDetail.name.trim();
                  }
                  return candidate.order === groupDetail.order;
                }) ?? null;

            const nextActive = matchingNextGroup?.active_count ?? 0;
            const hasNextStep = Boolean(nextStep);

            const dropoffCountFromApi =
              typeof groupDetail.dropoff_count === "number" ? groupDetail.dropoff_count : null;

            const nextActiveClamped = Math.max(Math.min(nextActive, activeCount), 0);
            const computedDropoff = hasNextStep ? Math.max(activeCount - nextActiveClamped, 0) : null;
            const dropoffCount = hasNextStep
              ? dropoffCountFromApi != null
                ? Math.max(Math.min(dropoffCountFromApi, activeCount), 0)
                : computedDropoff
              : null;

            const totalAtStep =
              dropoffCount != null ? Math.max(activeCount + dropoffCount, 0) : Math.max(activeCount, 0);

            const completionRate =
              hasNextStep && dropoffCount != null && activeCount > 0
                ? Math.max(Math.min(((activeCount - dropoffCount) / activeCount) * 100, 100), 0)
                : hasNextStep && activeCount === 0 && dropoffCount === 0
                  ? 100
                  : null;

            const dropoffRate =
              hasNextStep && dropoffCount != null && activeCount > 0
                ? Math.max(Math.min((dropoffCount / activeCount) * 100, 100), 0)
                : null;

            const shouldShowDropoff = hasNextStep || dropoffCount != null || dropoffRate != null;

            return {
              key: `${step.order}-${info.key}`,
              stageOrder: step.order,
              stageName: step.stepnm || `단계 ${step.order}`,
              groupName: info.name,
              groupColor: info.color,
              activeCount,
              firstStepPercent,
              completionRate,
              dropoffCount: shouldShowDropoff ? dropoffCount : null,
              dropoffRate: shouldShowDropoff ? dropoffRate : null,
            };
          }) ?? []
      );
    });

    if (baseRows.length === 0) {
      return [];
    }

    const mergedRows: DetailTableRow[] = [];
    let currentStageKey: string | null = null;
    let currentStageIndex = -1;

    baseRows.forEach((row) => {
      const stageKey = `${row.stageOrder}::${row.stageName}`;
      if (stageKey === currentStageKey && currentStageIndex >= 0) {
        const previous = mergedRows[currentStageIndex];
        mergedRows[currentStageIndex] = {
          ...previous,
          rowSpan: previous.rowSpan + 1,
        };
        mergedRows.push({
          ...row,
          showStageCell: false,
          rowSpan: 0,
        });
      } else {
        currentStageKey = stageKey;
        currentStageIndex = mergedRows.length;
        mergedRows.push({
          ...row,
          showStageCell: true,
          rowSpan: 1,
        });
      }
    });

    return mergedRows;
  }, [visibleDetailSteps, getGroupPresentation, compareGroupDetails]);

  const renderTooltipInnerContent = useCallback(
    (
      stepName: string,
      seriesEntry: ChartSeriesEntry | undefined,
      stats: TooltipStats | null | undefined,
    ): ReactElement | null => {
      if (!stats) {
        return null;
      }
      const activeCount = stats?.active ?? null;
      const dropoffCount = stats?.dropoff ?? null;
      const computedCompletionRate =
        activeCount != null && dropoffCount != null && activeCount > 0
          ? Math.max(Math.min(((activeCount - dropoffCount) / activeCount) * 100, 100), 0)
          : null;
      const computedDropoffRate =
        activeCount != null && dropoffCount != null && activeCount > 0
          ? Math.max(Math.min((dropoffCount / activeCount) * 100, 100), 0)
          : null;
      const conversionRate =
        computedCompletionRate ??
        (stats?.conversionRate != null && Number.isFinite(stats.conversionRate)
          ? stats.conversionRate
          : null);
      const dropoffRate =
        computedDropoffRate ??
        (stats?.dropoffRate != null && Number.isFinite(stats.dropoffRate) ? stats.dropoffRate : null);
      const isOpenFunnel = pathType === "open";
      const entrance =
        stats?.entrance != null && Number.isFinite(stats.entrance) ? stats.entrance : null;
      const skipped =
        stats?.skipped != null && Number.isFinite(stats.skipped) ? stats.skipped : null;
      return (
        <>
          <div className="funnel-chart-tooltip-header">
            <span className="funnel-chart-tooltip-step">{stepName}</span>
            {seriesEntry ? (
              <span className="funnel-chart-tooltip-segment" style={{ color: seriesEntry.color }}>
                {seriesEntry.name}
              </span>
            ) : null}
          </div>
          <div className="funnel-chart-tooltip-body">
            {isOpenFunnel ? (
              <div className="funnel-chart-tooltip-stat">
                <span>새유입 / 건너뛴 사용자</span>
                <strong>
                  {entrance != null ? formatNumber(entrance) : "--"}
                  <span aria-hidden="true"> / </span>
                  {skipped != null ? formatNumber(skipped) : "--"}
                </strong>
              </div>
            ) : null}
            <div className="funnel-chart-tooltip-stat">
              <span>활성 / 이탈</span>
              <strong>
                {formatNumber(stats.active)}
                <span aria-hidden="true"> / </span>
                {stats.dropoff != null && Number.isFinite(stats.dropoff)
                  ? formatNumber(stats.dropoff)
                  : "--"}
              </strong>
            </div>
            <div className="funnel-chart-tooltip-stat">
              <span>완료율 / 이탈율</span>
              <strong>
                {conversionRate != null ? formatPercent(conversionRate) : "--"}
                <span aria-hidden="true"> / </span>
                {dropoffRate != null ? formatPercent(dropoffRate) : "--"}
              </strong>
            </div>
          </div>
        </>
      );
    },
    [pathType],
  );

  const chartTooltipRenderer = useCallback(
    ({ active, label }: FunnelChartTooltipProps) => {
      if (!active || !tooltipSeriesKey || label == null) {
        return null;
      }
      const stepName = typeof label === "string" ? label : String(label ?? "");
      const stepLookup = chartModel.tooltipLookup.get(stepName);
      if (!stepLookup || !stepLookup.has(tooltipSeriesKey)) {
        return null;
      }
      const stats = stepLookup.get(tooltipSeriesKey);
      if (!stats) {
        return null;
      }
      const seriesEntry = chartModel.series.find((series) => series.key === tooltipSeriesKey);
      const inner = renderTooltipInnerContent(stepName, seriesEntry, stats);
      if (!inner) {
        return null;
      }
      return <div className="funnel-chart-tooltip">{inner}</div>;
    },
    [chartModel.tooltipLookup, chartModel.series, renderTooltipInnerContent, tooltipSeriesKey],
  );

  const funnelTooltipData = useMemo(() => {
    if (!funnelTooltip) {
      return null;
    }
    const stepLookup = chartModel.tooltipLookup.get(funnelTooltip.stepName);
    if (!stepLookup) {
      return null;
    }
    const stats = stepLookup.get(funnelTooltip.seriesKey);
    if (!stats) {
      return null;
    }
    const seriesEntry = chartModel.series.find((series) => series.key === funnelTooltip.seriesKey);
    if (!seriesEntry) {
      return null;
    }
    return { stepName: funnelTooltip.stepName, seriesEntry, stats };
  }, [chartModel.series, chartModel.tooltipLookup, funnelTooltip, renderTooltipInnerContent]);

  const areaTooltipPayload = useMemo(() => {
    if (!areaTooltip) {
      return null;
    }
    const stepLookup = chartModel.tooltipLookup.get(areaTooltip.stepName);
    if (!stepLookup) {
      return null;
    }
    const stats = stepLookup.get(areaTooltip.seriesKey);
    if (!stats) {
      return null;
    }
    const seriesEntry = chartModel.series.find((series) => series.key === areaTooltip.seriesKey);
    if (!seriesEntry) {
      return null;
    }
    const inner = renderTooltipInnerContent(areaTooltip.stepName, seriesEntry, stats);
    if (!inner) {
      return null;
    }
    const offset = FUNNEL_TOOLTIP_OFFSET;
    const viewportWidth = typeof window !== "undefined" ? window.innerWidth : null;
    const viewportHeight = typeof window !== "undefined" ? window.innerHeight : null;
    const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
    const left = viewportWidth
      ? clamp(areaTooltip.position.x + offset, offset, viewportWidth - offset)
      : areaTooltip.position.x + offset;
    const top = viewportHeight
      ? clamp(areaTooltip.position.y - offset, offset, viewportHeight - offset)
      : areaTooltip.position.y - offset;
    return { inner, position: { left, top } };
  }, [areaTooltip, chartModel.series, chartModel.tooltipLookup, renderTooltipInnerContent]);

  const detailTooltipPayload = useMemo(() => {
    if (!detailTooltip) {
      return null;
    }
    const stepLookup = chartModel.tooltipLookup.get(detailTooltip.stepName);
    if (!stepLookup) {
      return null;
    }
    const stats = stepLookup.get(detailTooltip.seriesKey);
    if (!stats) {
      return null;
    }
    const seriesEntry = chartModel.series.find((series) => series.key === detailTooltip.seriesKey);
    if (!seriesEntry) {
      return null;
    }
    const inner = renderTooltipInnerContent(detailTooltip.stepName, seriesEntry, stats);
    if (!inner) {
      return null;
    }
    const offset = FUNNEL_TOOLTIP_OFFSET;
    const viewportWidth = typeof window !== "undefined" ? window.innerWidth : null;
    const viewportHeight = typeof window !== "undefined" ? window.innerHeight : null;
    const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
    const left =
      viewportWidth != null
        ? clamp(detailTooltip.position.x + offset, offset, viewportWidth - offset)
        : detailTooltip.position.x + offset;
    const top =
      viewportHeight != null
        ? clamp(detailTooltip.position.y - offset, offset, viewportHeight - offset)
        : detailTooltip.position.y - offset;
    return {
      inner,
      position: { left, top },
    };
  }, [chartModel.series, chartModel.tooltipLookup, detailTooltip, renderTooltipInnerContent]);

const renderCustomFunnelChartContent = (
    chartHeight: number,
    customTooltipContent: ReactElement | null,
    funnelTooltipStyle: CSSProperties | undefined,
  ) => (
    <div
      className="funnel-custom-chart"
      ref={funnelChartRef}
      onMouseLeave={clearFunnelTooltip}
    >
      {funnelSteps.length === 0 ? (
        <p className="funnel-detail-status">표시할 데이터가 없습니다.</p>
      ) : (
        funnelSteps.map((row) => (
          <div key={row.key} className="funnel-custom-row">
            <div className="funnel-custom-row-info">
              <span className="funnel-custom-row-order">{`${row.order}단계`}</span>
              <span className="funnel-custom-row-name">{row.stepName}</span>
            </div>
            <div className="funnel-custom-row-bar">
              <div
                className={`funnel-custom-row-track${row.total <= 0 ? " is-empty" : ""}`}
                style={{ width: row.total > 0 ? `${row.widthPercent}%` : undefined }}
              >
                {row.total > 0 && row.segments.length > 0 ? (
                  row.segments.map((segment) => {
                    const isDimmed =
                      highlightedGroupId != null &&
                      segment.series.id != null &&
                      highlightedGroupId !== segment.series.id;
                    return (
                      <button
                        key={segment.key}
                        type="button"
                        className={`funnel-custom-segment${isDimmed ? " is-dimmed" : ""}`}
                        style={{
                          width: `${segment.percent}%`,
                          backgroundColor: segment.series.color,
                        }}
                        onMouseMove={(event) =>
                          handleFunnelSegmentHover(event, row.stepName, segment.series.key)
                        }
                        onFocus={(event) =>
                          handleFunnelSegmentFocus(event, row.stepName, segment.series.key)
                        }
                        onMouseLeave={clearFunnelTooltip}
                        onBlur={clearFunnelTooltip}
                        onClick={() => {
                          if (segment.series.id != null) {
                            toggleHighlightedGroup(segment.series.id);
                          }
                        }}
                      >
                        <span className="funnel-sr-only">
                          {`${row.stepName} - ${segment.series.name}: ${formatNumber(segment.value)}`}
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <span className="funnel-custom-row-placeholder">데이터 없음</span>
                )}
              </div>
            </div>
            <div className="funnel-custom-row-total">{formatNumber(row.total)}</div>
          </div>
        ))
      )}
      {customTooltipContent && funnelTooltipStyle ? (
        <div className="funnel-chart-tooltip funnel-custom-tooltip" style={funnelTooltipStyle}>
          {customTooltipContent}
        </div>
      ) : null}
    </div>
  );

const renderAreaFunnelChartContent = (chartHeight: number) => {
    if (!areaChartGeometry) {
      return <p className="funnel-detail-status">표시할 데이터가 없습니다.</p>;
    }

    const axisBaselineY = areaChartGeometry.baselineY;
    const startLabel = chartModel.firstStepName ?? "시작";
    const endLabel = chartModel.lastStepName ?? "종료";
    const startTotal = formatNumber(chartModel.startTotal);
    const endTotal = formatNumber(chartModel.endTotal);

    return (
      <div
        className="funnel-area-chart"
        ref={funnelAreaChartRef}
        onMouseLeave={clearAreaTooltip}
      >
        <svg
          className="funnel-area-svg"
          preserveAspectRatio="none"
          viewBox={`0 0 ${AREA_CHART_VIEWBOX_WIDTH} ${AREA_CHART_VIEWBOX_HEIGHT}`}
        >
          <line
            x1={areaChartGeometry.firstX}
            y1={axisBaselineY}
            x2={areaChartGeometry.lastX}
            y2={axisBaselineY}
            stroke="rgba(148, 163, 184, 0.35)"
            strokeWidth={1.5}
          />
          <text
            x={areaChartGeometry.firstX}
            y={axisBaselineY + 18}
            fill="#475569"
            fontSize={12}
          >
            {`${startTotal}`}
          </text>
          <text
            x={areaChartGeometry.lastX}
            y={axisBaselineY + 18}
            fill="#475569"
            fontSize={12}
            textAnchor="end"
          >
            {`${endTotal}`}
          </text>
          {areaChartGeometry.polygons.map(({ series, path, isDimmed }) => (
            <path
              key={series.key}
              d={path}
              fill={toRgba(series.color, isDimmed ? 0.25 : 0.6)}
              stroke={series.color}
              strokeWidth={2}
              opacity={isDimmed ? 0.45 : 0.95}
              onClick={() => {
                if (series.id != null) {
                  toggleHighlightedGroup(series.id);
                }
              }}
              onMouseEnter={() => setTooltipSeriesKey(series.key)}
            />
          ))}
          {areaChartGeometry.markers.map((marker) => (
            <circle
              key={marker.key}
              cx={marker.x}
              cy={marker.y}
              r={4}
              fill={marker.series.color}
              stroke="#fff"
              strokeWidth={1.5}
              onMouseEnter={(event) => handleAreaMarkerEnter(event, marker.stepName, marker.series.key)}
            />
          ))}
        </svg>
        {areaTooltipPayload ? (
          <div
            className="funnel-chart-tooltip funnel-area-tooltip"
            style={{
              position: "fixed",
              left: areaTooltipPayload.position.left,
              top: areaTooltipPayload.position.top,
            }}
          >
            {areaTooltipPayload.inner}
          </div>
        ) : null}
      </div>
    );
  };

const renderFunnelChartSection = (chartType: ChartDescriptor) => {
    const isAreaMode = funnelRenderMode === "area";
    const chartHeight = isAreaMode
      ? Math.max(340, chartModel.data.length > 4 ? 400 : 360)
      : Math.max(360, funnelSteps.length * 110);

    let funnelTooltipStyle: CSSProperties | undefined;
    if (!isAreaMode && funnelTooltip && funnelChartRef.current) {
      const bounds = funnelChartRef.current.getBoundingClientRect();
      const maxLeft = Math.max(bounds.width - FUNNEL_TOOLTIP_OFFSET, FUNNEL_TOOLTIP_OFFSET);
      const maxTop = Math.max(bounds.height - FUNNEL_TOOLTIP_OFFSET, FUNNEL_TOOLTIP_OFFSET);
      const left = Math.min(
        Math.max(funnelTooltip.position.x + FUNNEL_TOOLTIP_OFFSET, FUNNEL_TOOLTIP_OFFSET),
        maxLeft,
      );
      const top = Math.min(
        Math.max(funnelTooltip.position.y - FUNNEL_TOOLTIP_OFFSET, FUNNEL_TOOLTIP_OFFSET),
        maxTop,
      );
      funnelTooltipStyle = {
        left,
        top,
        transform: "translate(-50%, -120%)",
      };
    }

    const customTooltipContent =
      !isAreaMode && funnelTooltip
        ? (() => {
            const stepLookup = chartModel.tooltipLookup.get(funnelTooltip.stepName);
            if (!stepLookup) {
              return null;
            }
            const stats = stepLookup.get(funnelTooltip.seriesKey);
            if (!stats) {
              return null;
            }
            const seriesEntry = chartModel.series.find((series) => series.key === funnelTooltip.seriesKey);
            if (!seriesEntry) {
              return null;
            }
            return renderTooltipInnerContent(funnelTooltip.stepName, seriesEntry, stats);
          })()
        : null;

    return (
      <section className={`funnel-detail-chart-area chart-${chartType.id}`} aria-label="퍼널 차트">
        <div className="funnel-detail-chart-frame">
          <div className="funnel-mode-toggle" role="group" aria-label="퍼널 표시 방식">
            {FUNNEL_RENDER_MODE_OPTIONS.map((option) => {
              const selected = funnelRenderMode === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  className={`funnel-mode-toggle-btn${selected ? " is-active" : ""}`}
                  onClick={() => setFunnelRenderMode(option.id)}
                  aria-pressed={selected}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          {isAreaMode
            ? renderAreaFunnelChartContent(chartHeight)
            : renderCustomFunnelChartContent(chartHeight, customTooltipContent, funnelTooltipStyle)}
        </div>
      </section>
    );
  };

const renderDetailCharts = () => {
    if (!visibleDetailSteps || visibleDetailSteps.length === 0 || chartModel.data.length === 0) {
      return null;
    }

    const chartType = chartDictionary[activeChartId];
    if (!chartType) {
      return null;
    }

    if (chartType.id === "funnel") {
      return renderFunnelChartSection(chartType);
    }

    const isHorizontal = chartType.id === "horizontal";
    const layout = isHorizontal ? "vertical" : "horizontal";
    const chartHeight = isHorizontal
      ? Math.max(320, chartModel.data.length * 120)
      : Math.max(360, chartModel.series.length > 4 ? 460 : 360);
    const domainMax = chartModel.maxValue > 0 ? Math.ceil(chartModel.maxValue * 1.1) : "auto";
    const { left: marginLeft, right: marginRight } = getChartMargins(activeChartId);
    const highlightedSeriesEntry =
      highlightedGroupId != null
        ? chartModel.series.find((entry) => entry.id === highlightedGroupId)
        : null;

    return (
      <section className={`funnel-detail-chart-area chart-${chartType.id}`} aria-label="퍼널 차트">
        <div className="funnel-detail-chart-frame">
          <ResponsiveContainer width="100%" height={chartHeight}>
            <ComposedChart
              data={chartModel.data}
              layout={layout}
              margin={{
                top: 18,
                right: marginRight,
                left: marginLeft,
                bottom: 24,
              }}
              onMouseLeave={() => setTooltipSeriesKey(null)}
              barCategoryGap={
                isHorizontal
                  ? `${(HORIZONTAL_BAR_CATEGORY_GAP * 100).toFixed(0)}%`
                  : `${(VERTICAL_BAR_CATEGORY_GAP * 100).toFixed(0)}%`
              }
              barGap={isHorizontal ? HORIZONTAL_BAR_GAP : VERTICAL_BAR_GAP}
            >
              <CartesianGrid
                stroke="rgba(148, 163, 184, 0.28)"
                strokeDasharray="3 3"
                vertical={!isHorizontal}
              />
              {isHorizontal ? (
                <>
                  <XAxis
                    type="number"
                    tick={{ fill: "#475569", fontSize: 12 }}
                    axisLine={{ stroke: "rgba(148, 163, 184, 0.5)" }}
                    tickLine={false}
                    tickMargin={10}
                    allowDecimals={false}
                    domain={[0, domainMax]}
                  />
                  <YAxis
                    type="category"
                    dataKey="stepName"
                    tick={{ fill: "#475569", fontSize: 12 }}
                    axisLine={{ stroke: "rgba(148, 163, 184, 0.5)" }}
                    tickLine={false}
                    width={HORIZONTAL_AXIS_WIDTH}
                    tickMargin={8}
                  />
                </>
              ) : (
                <>
                  <XAxis
                    dataKey="stepName"
                    tick={false}
                    axisLine={{ stroke: "rgba(148, 163, 184, 0.5)" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#475569", fontSize: 12 }}
                    axisLine={{ stroke: "rgba(148, 163, 184, 0.5)" }}
                    tickLine={false}
                    allowDecimals={false}
                    domain={[0, domainMax]}
                    tickMargin={10}
                    width={VERTICAL_AXIS_WIDTH}
                  />
                </>
              )}
              <RechartsTooltip
                cursor={{ fill: "rgba(148, 163, 184, 0.08)" }}
                content={chartTooltipRenderer}
                contentStyle={{
                  background: "transparent",
                  border: "none",
                  boxShadow: "none",
                  padding: 0,
                  transition: "none",
                }}
                wrapperStyle={{ outline: "none", transition: "none" }}
              />
              {highlightedSeriesEntry ? (
                <HighlightRibbon layout={layout} seriesEntry={highlightedSeriesEntry} />
              ) : null}
              {chartModel.series.map((seriesEntry) => (
                <Bar
                  key={seriesEntry.key}
                  dataKey={seriesEntry.key}
                  name={seriesEntry.name}
                  fill={seriesEntry.color}
                  maxBarSize={isHorizontal ? 48 : 56}
                  radius={isHorizontal ? [0, 14, 14, 0] : [14, 14, 6, 6]}
                  fillOpacity={
                    highlightedGroupId != null &&
                    seriesEntry.id != null &&
                    highlightedGroupId !== seriesEntry.id
                      ? 0.35
                      : 0.95
                  }
                  onClick={() => {
                    if (seriesEntry.id != null) {
                      toggleHighlightedGroup(seriesEntry.id);
                    }
                  }}
                  cursor={seriesEntry.id != null ? "pointer" : "default"}
                  onMouseEnter={() => setTooltipSeriesKey(seriesEntry.key)}
                  onMouseLeave={() => setTooltipSeriesKey(null)}
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>
    );
  };

const renderDetailTable = () => {
    if (!detailTableRows || detailTableRows.length === 0) {
      return null;
    }

    const renderNumberCell = (value: number | null) =>
      value == null ? <span className="placeholder">{PLACEHOLDER}</span> : formatNumber(value);
    const renderPercentCell = (value: number | null) =>
      value == null ? <span className="placeholder">{PLACEHOLDER}</span> : formatPercent(value);

    return (
      <section className="funnel-detail-summary" aria-label="단계별 세그먼트 통계">
        <header className="funnel-detail-summary-header">
          <h3 className="funnel-detail-summary-title">단계별 세그먼트 요약</h3>
          <p className="funnel-detail-summary-subtitle">활성 사용자와 이탈 지표를 단계별로 확인하세요.</p>
        </header>
        <div className="funnel-detail-summary-table-wrapper">
          <table className="funnel-detail-table">
            <thead>
              <tr>
                <th scope="col">단계</th>
                <th scope="col">세그먼트</th>
                <th scope="col" className="is-numeric">
                  활성 사용자
                </th>
                <th scope="col" className="is-numeric">
                  1단계 대비 비율
                </th>
                <th scope="col" className="is-numeric">
                  완료율
                </th>
                <th scope="col" className="is-numeric">
                  이탈수
                </th>
                <th scope="col" className="is-numeric">
                  이탈률
                </th>
              </tr>
            </thead>
            <tbody>
              {detailTableRows.map((row) => (
                <tr key={row.key}>
                  {row.showStageCell ? (
                    <th
                      scope={row.rowSpan > 1 ? "rowgroup" : "row"}
                      className="funnel-detail-table-stage"
                      rowSpan={row.rowSpan}
                    >
                      <div className="funnel-detail-table-stage-content">
                        <span className="funnel-detail-table-stage-order">{`${row.stageOrder}단계`}</span>
                        <span className="funnel-detail-table-stage-name">{row.stageName}</span>
                      </div>
                    </th>
                  ) : null}
                  <td>
                    <span className="funnel-detail-table-segment">
                      <span
                        className="funnel-detail-table-segment-swatch"
                        aria-hidden="true"
                        style={{ backgroundColor: row.groupColor }}
                      />
                      {row.groupName}
                    </span>
                  </td>
                  <td className="is-numeric">
                    {renderNumberCell(row.activeCount)}
                  </td>
                  <td className="is-numeric">{renderPercentCell(row.firstStepPercent)}</td>
                  <td className="is-numeric">{renderPercentCell(row.completionRate)}</td>
                  <td className="is-numeric">{renderNumberCell(row.dropoffCount)}</td>
                  <td className="is-numeric">{renderPercentCell(row.dropoffRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    );
  };
  const renderDetailArea = () => {
    if (detailLoading) {
      return <p className="funnel-detail-status">세부 데이터를 불러오는 중입니다…</p>;
    }
    if (detailError) {
      return <p className="funnel-detail-status funnel-detail-status-error">{detailError}</p>;
    }
    if (!detailSteps || detailSteps.length === 0) {
      return <p className="funnel-detail-status">세부 데이터가 아직 없습니다.</p>;
    }

    const activeSteps = (visibleDetailSteps ?? detailSteps).slice().sort((a, b) => a.order - b.order);
    const hasVisibleGroups = activeSteps.some((step) => (step.groups?.length ?? 0) > 0);

    if (!hasVisibleGroups) {
      return (
        <p className="funnel-detail-status">
          세그먼트가 선택되지 않았습니다. 최소 한 개 이상의 세그먼트를 선택하세요.
        </p>
      );
    }

    const activeChart = chartDictionary[activeChartId];
    const usesLeftAxis = activeChart?.id === "vertical";
    const detailPaddingLeft = 0;
    const detailPaddingRight = 0;
    const clampedColumns = Math.min(Math.max(activeSteps.length, 1), 5);

    return (
      <div
        className="funnel-detail-results"
        ref={detailResultsRef}
        style={{
          gridTemplateColumns: `repeat(${clampedColumns}, minmax(0, 1fr))`,
          paddingLeft: detailPaddingLeft,
          paddingRight: detailPaddingRight,
        }}
      >
        {activeSteps.map((step, index) => (
          <article key={`${step.id ?? "step"}-${step.order}-${index}`} className="funnel-detail-step">
            <header className="funnel-detail-step-header">
              <span className="funnel-detail-step-index">{`${step.order}단계`}</span>
              <h4 className="funnel-detail-step-title">{step.stepnm || "이름 없는 단계"}</h4>
            </header>
            <ul className="funnel-detail-step-segments">
              {step.groups
                ?.slice()
                .sort(compareGroupDetails)
                .map((groupDetail, groupIndex) =>
                  renderDetailStepGroup(
                    groupDetail,
                    groupIndex,
                    step.order,
                    step.stepnm || `단계 ${step.order}`,
                  ),
                )}
            </ul>
          </article>
        ))}
      </div>
    );
  };
  if (loading) {
    return (
      <main className="funnel-main-area">
        <section className="funnel-main-panel">
          <h2>Loading funnels...</h2>
          <p>잠시만 기다려 주세요.</p>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="funnel-main-area">
        <section className="funnel-main-panel funnel-main-panel-error" role="alert">
          <h2>퍼널 데이터를 불러올 수 없습니다</h2>
          <p>{error}</p>
          <button type="button" className="funnel-start-button" onClick={onStart}>
            새 퍼널 만들기
          </button>
        </section>
      </main>
    );
  }

  if (selectedFunnel) {
    return (
      <main className="funnel-main-area">
        <section className="funnel-detail-layout">
          <aside className="funnel-detail-sidebar" aria-label="선택된 퍼널 요약">
            <header className="funnel-detail-header">
              <span className="funnel-detail-badge">선택된 퍼널</span>
              <h2 className="funnel-detail-title">{selectedFunnel.name}</h2>
              {selectedFunnel.updatedAt ? (
                <span className="funnel-detail-meta">
                  마지막 수정{" "}
                  {new Date(selectedFunnel.updatedAt).toLocaleString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              ) : null}
              {selectedFunnel.userId ? (
                <span className="funnel-detail-meta">소유자 {selectedFunnel.userId}</span>
              ) : null}
              {selectedFunnel.description ? (
                <p className="funnel-detail-intro">{selectedFunnel.description}</p>
              ) : null}
            </header>

            <section className="funnel-detail-section">
              <h3>기간</h3>
              <p className="funnel-detail-description">
                분석 기간을 선택하면 오른쪽 차트가 즉시 갱신됩니다.
              </p>
              <div className="funnel-detail-period">
                <button
                  type="button"
                  className="funnel-select-trigger"
                  onClick={handleCalendarToggle}
                  aria-haspopup="dialog"
                  aria-expanded={isCalendarOpen}
                  ref={calendarTriggerRef}
                  aria-label={periodAccessibleLabel}
                  title={periodAccessibleLabel}
                >
                  <span className="funnel-period-display">
                    <span className="funnel-period-heading">
                      {dayCount !== null && periodPresetLabel ? (
                        <span className="funnel-period-count">{`${dayCount}일 - ${periodPresetLabel}`}</span>
                      ) : dayCount !== null ? (
                        <span className="funnel-period-count">{`${dayCount}일`}</span>
                      ) : (
                        <span className="funnel-period-count">기간 선택</span>
                      )}
                    </span>
                    {periodDisplay ? (
                      <span className="funnel-period-value">
                        <span className="funnel-period-line">
                          <time className="funnel-period-date" dateTime={periodDisplay.start.iso}>
                            {periodDisplay.start.main}
                          </time>
                          {periodDisplay.isSingle ? null : (
                            <>
                              <span className="funnel-period-between">~</span>
                              <time className="funnel-period-date" dateTime={periodDisplay.end.iso}>
                                {periodDisplay.end.main}
                              </time>
                            </>
                          )}
                        </span>
                        {!periodDisplay.isSingle ? (
                          <span className="funnel-period-meta">
                            {periodDisplay.start.long} ~ {periodDisplay.end.long}
                          </span>
                        ) : (
                          <span className="funnel-period-meta">{periodDisplay.start.long}</span>
                        )}
                      </span>
                    ) : (
                      <span className="funnel-period-placeholder">기간을 선택하세요</span>
                    )}
                  </span>
                </button>
                {isCalendarOpen ? (
                  <div className="funnel-calendar-popover" ref={calendarPopoverRef}>
                    <div className="funnel-period-panel">
                      <div className="funnel-period-presets">
                        <h4 className="funnel-period-presets-title">빠른 선택</h4>
                        <ul className="funnel-period-preset-list">
                          {FUNNEL_PERIOD_PRESETS.map((preset) => (
                            <li key={preset.id}>
                              <button
                                type="button"
                                className={`funnel-period-preset-button${
                                  activePresetId === preset.id ? " is-active" : ""
                                }`}
                                onClick={() => handlePresetSelect(preset.id)}
                              >
                                {preset.label}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    <div className="funnel-period-calendar">
                      <div className="funnel-period-calendar-month">
                        <FunnelRangeCalendar
                          month={previousCalendarMonth}
                          range={visibleCalendarRange ?? resolvedRange}
                          onSelectDate={handleSelectDate}
                          onChangeMonth={handleSecondaryMonthChange}
                          hideNextMonthButton
                          disableFutureDates
                        />
                      </div>
                      <div className="funnel-period-calendar-month">
                        <FunnelRangeCalendar
                          month={calendarMonth}
                          range={visibleCalendarRange ?? resolvedRange}
                          onSelectDate={handleSelectDate}
                          onChangeMonth={handlePrimaryMonthChange}
                            disableFutureDates
                          />
                        </div>
                      </div>
                    </div>
                    <div className="funnel-calendar-actions">
                      <button
                        type="button"
                        className="funnel-calendar-cancel"
                        onClick={handleCalendarCancel}
                      >
                        취소
                      </button>
                      <button
                        type="button"
                        className="funnel-calendar-apply"
                        onClick={handleCalendarApply}
                        disabled={!canApplyCalendar}
                      >
                        적용
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </section>

            <section className="funnel-detail-section">
              <h3>유입경로</h3>
              <p className="funnel-detail-description">
                퍼널의 저장된 유입경로는 {savedPathType === "open" ? "개방형" : "폐쇄형"} 입니다. 필요하면 여기서 바꿔서 즉시 재조회할 수 있습니다.
              </p>
              <div className="funnel-segmented">
                <button
                  type="button"
                  className={`funnel-segmented-button${pathType === "closed" ? " is-active" : ""}`}
                  onClick={() => handlePathTypeChange("closed")}
                  aria-pressed={pathType === "closed"}
                >
                  폐쇄형
                </button>
                <button
                  type="button"
                  className={`funnel-segmented-button${pathType === "open" ? " is-active" : ""}`}
                  onClick={() => handlePathTypeChange("open")}
                  aria-pressed={pathType === "open"}
                >
                  개방형
                </button>
              </div>
              {/* {pathType !== savedPathType ? (
                <p className="funnel-detail-meta">저장된 설정: {savedPathType === "open" ? "개방형" : "폐쇄형"}</p>
              ) : null} */}
            </section>

            <section className="funnel-detail-section">
              <h3>세그먼트</h3>
              <p className="funnel-detail-description">
                비교할 세그먼트를 선택하거나 제외하세요. 기본으로 모두 선택됩니다.
              </p>
              {groups.length > 0 ? (
                <>
                  <ul className="funnel-detail-segment-list">
                    {groups.map((group, index) => {
                      const key = getGroupKey(group, index);
                      const label = group?.name ?? `Segment ${index + 1}`;
                      const checked = selectedGroupKeys.has(key);
                      const color = resolveGroupColor(group, index);
                      const chipStyles = createGroupChipStyles(color);

                      return (
                        <li key={key} className="funnel-detail-segment-item">
                          <label className="funnel-detail-checkbox" style={chipStyles}>
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={checked && selectedGroupKeys.size <= 1}
                              onChange={() => toggleGroup(key)}
                            />
                            <span className="funnel-detail-checkbox-box" aria-hidden="true" />
                            <span className="funnel-detail-checkbox-label">{label}</span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </>
              ) : (
                <p className="funnel-detail-empty">이 퍼널에는 아직 세그먼트가 없습니다.</p>
              )}
            </section>

            <section className="funnel-detail-section">
              <h3>차트</h3>
              <p className="funnel-detail-description">
                다양한 차트로 데이터를 바로 비교해 볼 수 있습니다.
              </p>
              <div className="funnel-chart-grid">
                {chartOrder.map((chartId) => {
                  const chart = chartDictionary[chartId];
                  if (!chart) {
                    return null;
                  }
                  const isActive = activeChartId === chartId;
                  const icon = createChartCardIcon(chartId);
                  return (
                    <button
                      key={chart.id}
                      type="button"
                      className={`funnel-chart-card${isActive ? " is-selected" : ""}`}
                      onClick={() => toggleChart(chartId)}
                      aria-pressed={isActive}
                      aria-label={`${chart.title} chart`}
                    >
                      {icon}
                      <span className="funnel-chart-label">
                        <span className="funnel-chart-title">{chart.title}</span>
                        <span className="funnel-chart-subtitle">{chart.subtitle}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          </aside>

          <section className="funnel-detail-content" aria-label="Funnel analysis results">
            {renderDetailArea()}
            {renderDetailCharts()}
            {renderDetailTable()}
          </section>
        </section>
        {detailTooltipPayload ? (
          <div
            className="funnel-chart-tooltip funnel-custom-tooltip"
            style={{
              position: "fixed",
              left: detailTooltipPayload.position.left,
              top: detailTooltipPayload.position.top,
              transform: "translate(-50%, -120%)",
              pointerEvents: "none",
              zIndex: 6,
            }}
          >
            {detailTooltipPayload.inner}
          </div>
        ) : null}
      </main>
    );
  }

  if (hasData) {
    return (
      <main className="funnel-main-area">
        <section className="funnel-main-panel">
          <h2>Select a funnel from the list</h2>
          <p>Picking a funnel populates this space with its metadata, filters, and charts.</p>
          <button type="button" className="funnel-start-button" onClick={onStart}>
            Create funnel
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="funnel-main-area">
      <section className="funnel-empty">
        <div className="funnel-empty-illustration" aria-hidden="true">
          <span className="funnel-empty-chart" />
          <span className="funnel-empty-steps" />
        </div>
        <div className="funnel-empty-body">
          <h2>Start building your funnel analysis</h2>
          <p>Define your conversion journey, choose comparison groups and charts, and craft a tailored workspace.</p>
          <button type="button" className="funnel-start-button" onClick={onStart}>
            Get started
          </button>
        </div>
      </section>
    </main>
  );
}
