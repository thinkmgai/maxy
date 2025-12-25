import {
  type CalendarRange,
  formatDateISO,
  isoStringToDate,
} from "../../../../components/calendar/RangeCalendar";
import type {
  FunnelPeriodDay,
  FunnelPeriod,
  FunnelPeriodRange,
  FunnelPeriodValue,
} from "../../../api/FunnelAnalysis";

export type DraftRange = { startDate: string; endDate?: string } | null;
export type RequiredCalendarRange = NonNullable<CalendarRange>;

const hasCompleteRange = (
  value: DraftRange | CalendarRange | null,
): value is RequiredCalendarRange => {
  if (!value) {
    return false;
  }
  return typeof value.startDate === "string" && typeof value.endDate === "string";
};

const clampDate = (value: Date): Date => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const today = (): Date => clampDate(new Date());

export const clampMonthToPresent = (value: Date): Date => {
  const start = new Date(value.getFullYear(), value.getMonth(), 1);
  const current = new Date();
  current.setDate(1);
  current.setHours(0, 0, 0, 0);
  if (start.getTime() > current.getTime()) {
    return current;
  }
  return start;
};

export const DEFAULT_PERIOD_VALUE: FunnelPeriodDay = { type: "day", days: 7 };

export const DEFAULT_RANGE: RequiredCalendarRange = (() => {
  const end = today();
  end.setDate(end.getDate() - 1);
  const start = new Date(end);
  start.setDate(end.getDate() - 6);
  return {
    startDate: formatDateISO(start),
    endDate: formatDateISO(end),
  };
})();

const normalizeRangeInternal = (
  range: DraftRange,
  fallback: CalendarRange | null,
): RequiredCalendarRange => {
  const fallbackRange = (fallback ?? DEFAULT_RANGE) as RequiredCalendarRange;
  if (!range?.startDate) {
    return fallbackRange;
  }
  const start =
    isoStringToDate(range.startDate) ??
    isoStringToDate(fallbackRange.startDate) ??
    today();
  const endValue = range.endDate ?? range.startDate;
  const end =
    isoStringToDate(endValue) ??
    isoStringToDate(fallbackRange.endDate) ??
    start;
  if (start.getTime() <= end.getTime()) {
    return {
      startDate: formatDateISO(start),
      endDate: formatDateISO(end),
    };
  }
  return {
    startDate: formatDateISO(end),
    endDate: formatDateISO(start),
  };
};

export function normalizeRange(
  range: DraftRange,
  fallback: CalendarRange | null,
): RequiredCalendarRange {
  return normalizeRangeInternal(range, fallback);
}

export function calculateInclusiveDays(range: CalendarRange | DraftRange | null): number | null {
  if (!range) {
    return null;
  }
  const normalizedRange = hasCompleteRange(range)
    ? range
    : normalizeRangeInternal(range as DraftRange, DEFAULT_RANGE);
  const start = isoStringToDate(normalizedRange.startDate);
  const end = isoStringToDate(normalizedRange.endDate);
  if (!start || !end) {
    return null;
  }
  const diff = Math.abs(end.getTime() - start.getTime());
  return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
}

const createRangeFromDates = (start: Date, end: Date): DraftRange => {
  const normalizedStart = clampDate(start);
  const normalizedEnd = clampDate(end);
  if (normalizedStart.getTime() <= normalizedEnd.getTime()) {
    return {
      startDate: formatDateISO(normalizedStart),
      endDate: formatDateISO(normalizedEnd),
    };
  }
  return {
    startDate: formatDateISO(normalizedEnd),
    endDate: formatDateISO(normalizedStart),
  };
};

export function createRangeFromDayCount(
  dayCount: number | string | null | undefined,
): DraftRange | null {
  if (dayCount === null || dayCount === undefined) {
    return null;
  }
  const numeric =
    typeof dayCount === "string"
      ? Number.parseInt(dayCount, 10)
      : typeof dayCount === "number"
        ? dayCount
        : NaN;
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }
  const normalizedCount = Math.max(1, Math.floor(numeric));
  const end = today();
  end.setDate(end.getDate() - 1);
  const start = new Date(end);
  start.setDate(end.getDate() - (normalizedCount - 1));
  return createRangeFromDates(start, end);
}

export const createLastWeekRange = (): DraftRange => {
  const reference = today();
  const weekday = reference.getDay();
  const start = new Date(reference);
  start.setDate(start.getDate() - weekday - 7);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return createRangeFromDates(start, end);
};

export const createLastWeekWorkdayRange = (): DraftRange => {
  const reference = today();
  const weekday = reference.getDay();
  const sunday = new Date(reference);
  sunday.setDate(sunday.getDate() - weekday - 7);
  const monday = new Date(sunday);
  monday.setDate(sunday.getDate() + 1);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  return createRangeFromDates(monday, friday);
};

export const createLastMonthRange = (): DraftRange => {
  const current = today();
  const firstOfCurrent = new Date(current.getFullYear(), current.getMonth(), 1);
  const start = new Date(firstOfCurrent);
  start.setMonth(start.getMonth() - 1);
  start.setDate(1);
  const end = new Date(firstOfCurrent);
  end.setDate(0);
  return createRangeFromDates(start, end);
};

export const createTodayRange = (): DraftRange => {
  const current = today();
  return createRangeFromDates(current, current);
};

export const createYesterdayRange = (): DraftRange => {
  const current = today();
  current.setDate(current.getDate() - 1);
  return createRangeFromDates(current, current);
};

const isPeriodRangeValue = (
  value: Record<string, unknown>,
): value is { from?: string; to?: string } => {
  return "from" in value || "to" in value;
};

const tryParseJson = (value: string): unknown => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const normalizeRangeValueFromObject = (
  value: Record<string, unknown>,
): DraftRange | null => {
  const fromValue =
    typeof value.from === "string" && value.from.trim().length > 0 ? value.from : null;
  const toValue =
    typeof value.to === "string" && value.to.trim().length > 0 ? value.to : null;
  if (fromValue) {
    return {
      startDate: fromValue,
      endDate: toValue ?? fromValue,
    };
  }
  if (toValue) {
    return {
      startDate: toValue,
      endDate: toValue,
    };
  }
  return null;
};

export function resolvePeriodToRange(
  period: FunnelPeriod | FunnelPeriodValue | string | number | null | undefined,
): DraftRange | null {
  if (period === null || period === undefined) {
    return null;
  }
  if (typeof period === "number") {
    return createRangeFromDayCount(period);
  }
  if (typeof period === "string") {
    const trimmed = period.trim();
    if (!trimmed) {
      return null;
    }
    if (/^\d+$/.test(trimmed)) {
      return createRangeFromDayCount(Number.parseInt(trimmed, 10));
    }
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      const parsed = tryParseJson(trimmed);
      return resolvePeriodToRange(parsed as FunnelPeriod);
    }
    return null;
  }

  if (typeof period === "object") {
    const record = period as Record<string, unknown>;
    const typeValue = typeof record.type === "string" ? record.type : null;
    if (typeValue === "range") {
      return normalizeRangeValueFromObject(record);
    }
    if (typeValue === "day") {
      return createRangeFromDayCount(
        typeof record.days === "number" ? record.days : Number(record.days),
      );
    }
    if (typeValue === "lastweek") {
      return createLastWeekRange();
    }
    if (typeValue === "lastweek-workday") {
      return createLastWeekWorkdayRange();
    }
    if (isPeriodRangeValue(record)) {
      return normalizeRangeValueFromObject(record);
    }
  }

  return null;
}

export function resolvePeriodValue(
  period: FunnelPeriod | FunnelPeriodValue | string | number | null | undefined,
): FunnelPeriodValue | null {
  if (period === null || period === undefined) {
    return null;
  }
  if (typeof period === "number") {
    const range = createRangeFromDayCount(period);
    if (range) {
      return { type: "day", days: calculateInclusiveDays(range) ?? DEFAULT_PERIOD_VALUE.days };
    }
    return { type: "day", days: DEFAULT_PERIOD_VALUE.days };
  }
  if (typeof period === "string") {
    const trimmed = period.trim();
    if (!trimmed) {
      return null;
    }
    if (/^\d+$/.test(trimmed)) {
      return { type: "day", days: Number.parseInt(trimmed, 10) };
    }
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      const parsed = tryParseJson(trimmed);
      return resolvePeriodValue(parsed as FunnelPeriod);
    }
    return null;
  }
  if (typeof period === "object") {
    const record = period as Record<string, unknown>;
    const typeValue = typeof record.type === "string" ? record.type : null;
    if (typeValue === "day") {
      if (typeof record.days === "number" && Number.isFinite(record.days)) {
        return { type: "day", days: Math.max(1, Math.floor(record.days)) };
      }
      return { type: "day", days: DEFAULT_PERIOD_VALUE.days };
    }
    if (
      typeValue === "range" &&
      typeof record.from === "string" &&
      typeof record.to === "string"
    ) {
      return { type: "range", from: record.from, to: record.to };
    }
    if (typeValue === "lastweek" || typeValue === "lastweek-workday") {
      return { type: typeValue };
    }
    if (typeValue === "lastmonth") {
      const range = normalizeRange(createLastMonthRange(), DEFAULT_RANGE);
      return { type: "range", from: range.startDate, to: range.endDate };
    }
    if (typeValue === "today") {
      const range = normalizeRange(createTodayRange(), DEFAULT_RANGE);
      return { type: "range", from: range.startDate, to: range.endDate };
    }
    if (typeValue === "yesterday") {
      const range = normalizeRange(createYesterdayRange(), DEFAULT_RANGE);
      return { type: "range", from: range.startDate, to: range.endDate };
    }
    if (isPeriodRangeValue(record)) {
      const range = normalizeRangeValueFromObject(record);
      if (range) {
        const normalized = normalizeRange(range, DEFAULT_RANGE);
        return {
          type: "range",
          from: normalized.startDate,
          to: normalized.endDate,
        };
      }
    }
  }
  return null;
}

export function normalisePeriodValueForSave(
  value: FunnelPeriodValue | null | undefined,
  fallbackRange: RequiredCalendarRange,
): FunnelPeriodValue {
  if (!value) {
    return { ...DEFAULT_PERIOD_VALUE };
  }
  if (value.type === "day") {
    const normalizedDays = Number.isFinite(value.days)
      ? Math.max(1, Math.floor(value.days))
      : calculateInclusiveDays(fallbackRange) ?? DEFAULT_PERIOD_VALUE.days;
    return { type: "day", days: normalizedDays };
  }
  if (value.type === "range") {
    const normalized = normalizeRange(
      {
        startDate: value.from ?? fallbackRange.startDate,
        endDate: value.to ?? fallbackRange.endDate,
      },
      fallbackRange,
    );
    return {
      type: "range",
      from: normalized.startDate,
      to: normalized.endDate,
    };
  }
  return value;
}

export const toRangePeriodValue = (
  range: RequiredCalendarRange,
): FunnelPeriodRange => ({
  type: "range",
  from: range.startDate,
  to: range.endDate,
});

export type FunnelPeriodPresetId =
  | "today"
  | "yesterday"
  | "lastweek"
  | "lastweek-workday"
  | "day-7"
  | "day-14"
  | "day-30"
  | "lastmonth";

export type FunnelPeriodPreset = {
  id: FunnelPeriodPresetId;
  label: string;
  resolve: () => { period: FunnelPeriodValue; range: RequiredCalendarRange };
  match: (value: FunnelPeriodValue | null | undefined) => boolean;
};

const buildDayPreset = (
  label: string,
  days: number,
): FunnelPeriodPreset => ({
  id: `day-${days}` as FunnelPeriodPresetId,
  label,
  resolve: () => {
    const range = normalizeRange(createRangeFromDayCount(days), DEFAULT_RANGE);
    return {
      period: { type: "day", days },
      range,
    };
  },
  match: (value) => value?.type === "day" && value.days === days,
});

const buildStaticRangePreset = (
  id: FunnelPeriodPresetId,
  label: string,
  factory: () => DraftRange | null,
): FunnelPeriodPreset => ({
  id,
  label,
  resolve: () => {
    const range = normalizeRange(factory(), DEFAULT_RANGE);
    return { period: toRangePeriodValue(range), range };
  },
  match: (value) => {
    if (value?.type !== "range") {
      return false;
    }
    const range = normalizeRange(factory(), DEFAULT_RANGE);
    return value.from === range.startDate && value.to === range.endDate;
  },
});

export const FUNNEL_PERIOD_PRESETS: readonly FunnelPeriodPreset[] = [
  buildStaticRangePreset("today", "오늘", createTodayRange),
  buildStaticRangePreset("yesterday", "어제", createYesterdayRange),
  {
    id: "lastweek",
    label: "지난주",
    resolve: () => {
      const range = normalizeRange(createLastWeekRange(), DEFAULT_RANGE);
      return { period: { type: "lastweek" }, range };
    },
    match: (value) => value?.type === "lastweek",
  },
  {
    id: "lastweek-workday",
    label: "지난주(평일)",
    resolve: () => {
      const range = normalizeRange(createLastWeekWorkdayRange(), DEFAULT_RANGE);
      return { period: { type: "lastweek-workday" }, range };
    },
    match: (value) => value?.type === "lastweek-workday",
  },
  buildDayPreset("지난 7일", 7),
  buildDayPreset("지난 14일", 14),
  buildDayPreset("지난 30일", 30),
  buildStaticRangePreset("lastmonth", "지난달", createLastMonthRange),
];

export const findPreset = (
  id: FunnelPeriodPresetId,
): FunnelPeriodPreset | undefined => FUNNEL_PERIOD_PRESETS.find((preset) => preset.id === id);
