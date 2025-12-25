import styles from "./RangeCalendar.module.css";

export type CalendarRange = { startDate: string; endDate: string } | null;

export type RangeCalendarProps = {
  month: Date;
  range: CalendarRange;
  onSelectDate: (date: Date) => void;
  onChangeMonth: (month: Date) => void;
  hideNextMonthButton?: boolean;
  disableFutureDates?: boolean;
  weekdayLabels?: readonly string[];
};

const DEFAULT_WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export function RangeCalendar({
  month,
  range,
  onSelectDate,
  onChangeMonth,
  hideNextMonthButton = false,
  disableFutureDates = false,
  weekdayLabels = DEFAULT_WEEKDAY_LABELS,
}: RangeCalendarProps) {
  const monthStart = startOfMonth(month);
  const gridStart = startOfWeek(monthStart);
  const days: Date[] = [];
  const today = disableFutureDates ? startOfDay(new Date()) : null;

  for (let i = 0; i < 42; i += 1) {
    days.push(addDays(gridStart, i));
  }

  const startDate = range?.startDate ? isoStringToDate(range.startDate) : null;
  const endDate = range?.endDate ? isoStringToDate(range.endDate) : null;
  const startIso = startDate ? formatDateISO(startDate) : null;
  const endIso = endDate ? formatDateISO(endDate) : null;
  const nextMonth = addMonths(month, 1);
  const disableNext =
    disableFutureDates && today !== null ? isMonthAfter(nextMonth, today) : false;

  return (
    <div className={styles.calendar_month}>
      <div className={styles.calendar_month_nav}>
        <button
          type="button"
          className={styles.calendar_nav_btn}
          aria-label="Previous month"
          onClick={() => onChangeMonth(addMonths(month, -1))}
        >
          ‹
        </button>
        <span className={styles.calendar_month_label}>
          {month.toLocaleString(undefined, { year: "numeric", month: "long" })}
        </span>
        {hideNextMonthButton ? null : (
          <button
            type="button"
            className={styles.calendar_nav_btn}
            aria-label="Next month"
            onClick={() => onChangeMonth(nextMonth)}
            disabled={disableNext}
          >
            ›
          </button>
        )}
      </div>
      <div className={styles.calendar_weekdays}>
        {weekdayLabels.map((label) => (
          <span key={label} className={styles.calendar_weekday}>
            {label}
          </span>
        ))}
      </div>
      <div className={styles.calendar_days}>
        {days.map((date) => {
          const iso = formatDateISO(date);
          const outside = !isSameMonth(date, monthStart);
          const isStart = startIso !== null && iso === startIso;
          const isEnd = endIso !== null && iso === endIso;
          const inRange =
            startIso !== null &&
            endIso !== null &&
            iso > startIso &&
            iso < endIso;
          const isSelected = isStart || isEnd;
          const weekday = date.getDay();
          const isFuture = disableFutureDates && today !== null && date.getTime() > today.getTime();
          const isDisabled = isFuture;

          const classNames = [styles.calendar_day];
          if (outside) classNames.push(styles["calendar_day--outside"]);
          if (inRange) classNames.push(styles["calendar_day--in-range"]);
          if (isSelected) classNames.push(styles["calendar_day--selected"]);
          if (isStart) classNames.push(styles["calendar_day--start"]);
          if (isEnd) classNames.push(styles["calendar_day--end"]);
          if (weekday === 0) classNames.push(styles["calendar_day--sunday"]);
          if (weekday === 6) classNames.push(styles["calendar_day--saturday"]);
          if (isDisabled) classNames.push(styles["calendar_day--disabled"]);

          const highlightLabel = (() => {
            if (isStart && isEnd) {
              return "Start / End";
            }
            if (isStart) {
              return "Start";
            }
            if (isEnd) {
              return "End";
            }
            return null;
          })();

          return (
            <button
              type="button"
              key={iso}
              className={classNames.join(" ")}
              onClick={isDisabled ? undefined : () => onSelectDate(date)}
              aria-pressed={isSelected}
              disabled={isDisabled}
              aria-disabled={isDisabled}
              aria-label={
                highlightLabel ? `${iso} (${highlightLabel.toLowerCase()})` : undefined
              }
            >
              <span className={styles.calendar_day_number}>{date.getDate()}</span>
              {highlightLabel ? (
                <span className={styles.calendar_day_label}>{highlightLabel}</span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function formatDateISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isoStringToDate(value?: string): Date | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (dateOnlyMatch) {
    const [, yearStr, monthStr, dayStr] = dateOnlyMatch;
    const year = Number(yearStr);
    const monthIndex = Number(monthStr) - 1;
    const day = Number(dayStr);
    const parsed = new Date(year, monthIndex, day);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfWeek(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  result.setDate(result.getDate() - day);
  result.setHours(0, 0, 0, 0);
  return result;
}

function addDays(date: Date, amount: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

function addMonths(date: Date, amount: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + amount);
  return result;
}

function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function isMonthAfter(target: Date, reference: Date): boolean {
  if (target.getFullYear() > reference.getFullYear()) {
    return true;
  }
  if (target.getFullYear() < reference.getFullYear()) {
    return false;
  }
  return target.getMonth() > reference.getMonth();
}

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}
