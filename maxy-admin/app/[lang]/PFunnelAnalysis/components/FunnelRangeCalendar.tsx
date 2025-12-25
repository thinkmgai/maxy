import styles from "./FunnelRangeCalendar.module.css";

export type CalendarRange = { startDate: string; endDate: string } | null;

export type FunnelRangeCalendarProps = {
  month: Date;
  range: CalendarRange;
  onSelectDate: (date: Date) => void;
  onChangeMonth: (month: Date) => void;
  hideNextMonthButton?: boolean;
  disableFutureDates?: boolean;
};

export function FunnelRangeCalendar({
  month,
  range,
  onSelectDate,
  onChangeMonth,
  hideNextMonthButton = false,
  disableFutureDates = false,
}: FunnelRangeCalendarProps) {
  const monthStart = startOfMonth(month);
  const days = createMonthCells(monthStart);
  const today = disableFutureDates ? startOfDay(new Date()) : null;

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
      <div className={styles.calendar_days}>
        {days.map((value, index) => {
          if (!value) {
            return (
              <button
                key={`pad-${index}`}
                type="button"
                className={`${styles.calendar_day} ${styles.calendar_day_placeholder}`}
                disabled
                aria-hidden="true"
                tabIndex={-1}
              >
                <span className={styles.calendar_day_number}>&nbsp;</span>
              </button>
            );
          }
          const iso = formatDateISO(value);
          const isStart = startIso !== null && iso === startIso;
          const isEnd = endIso !== null && iso === endIso;
          const inRange =
            startIso !== null &&
            endIso !== null &&
            iso > startIso &&
            iso < endIso;
          const isSelected = isStart || isEnd;
          const weekday = value.getDay();
          const isFuture = disableFutureDates && today !== null && value.getTime() > today.getTime();
          const isDisabled = isFuture;

          const classNames = [styles.calendar_day];
          if (inRange) classNames.push(styles["calendar_day--in-range"]);
          if (isSelected) classNames.push(styles["calendar_day--selected"]);
          if (isStart) classNames.push(styles["calendar_day--start"]);
          if (isEnd) classNames.push(styles["calendar_day--end"]);
          if (weekday === 0) classNames.push(styles["calendar_day--sunday"]);
          if (weekday === 6) classNames.push(styles["calendar_day--saturday"]);
          if (isDisabled) classNames.push(styles["calendar_day--disabled"]);

          return (
            <button
              type="button"
              key={iso}
              className={classNames.join(" ")}
              onClick={isDisabled ? undefined : () => onSelectDate(value)}
              aria-pressed={isSelected}
              disabled={isDisabled}
              aria-disabled={isDisabled}
            >
              <span className={styles.calendar_day_number}>{value.getDate()}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, amount: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + amount);
  return result;
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

function formatDateISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isoStringToDate(value?: string): Date | null {
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

function getDaysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function createMonthCells(monthStart: Date): Array<Date | null> {
  const daysInMonth = getDaysInMonth(monthStart);
  const leadingPad = monthStart.getDay();
  const totalCells = Math.ceil((leadingPad + daysInMonth) / 7) * 7;
  const cells: Array<Date | null> = [];

  for (let i = 0; i < leadingPad; i += 1) {
    cells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(monthStart.getFullYear(), monthStart.getMonth(), day));
  }
  while (cells.length < totalCells) {
    cells.push(null);
  }
  return cells;
}
