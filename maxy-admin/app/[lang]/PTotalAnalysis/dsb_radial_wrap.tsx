'use client';

// 리액트 훅과 필요한 라이브러리 임포트
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
// BI 정보를 가져오기 위한 API 및 타입
import { apiBIInfomations, type BiInfomation } from "@/app/api/BIInfomations";
// 사용자 설정을 관리하는 컨텍스트
import { useUserSettings } from "@/components/usersettings/UserSettingsProvider";
// 툴팁 라이브러리
import tippy, { followCursor, type TippyInstance } from "@/app/lib/tippy";
import "@/vendor/tippy/tippy.css";
import { dispatchOpenBiPopup, type BiPopupOpenDetail } from "./Popup/BiPopup";
import { canLoadBiPopupData, loadBiPopupData } from "./Popup/BiPopup/biPopupData";

// 메트릭 키 타입 정의 - 대시보드에 표시될 각 지표들을 식별하는 키
// 각 키는 특정 지표(예: 설치 수, 접속자 수 등)를 나타냄
type MetricKey =
  | "appInstallCount"           // 앱 설치 수
  | "appIosConnectCount"        // iOS 접속자 수
  | "appAndroidConnectCount"    // 안드로이드 접속자 수
  | "appMauCount"               // 월간 활성 사용자 수(MAU)
  | "appConnectCount"           // 일일 접속자 수(DAU)
  | "appCcuCount"               // 동시 접속자 수(CCU)
  | "appUseCount"               // 페이지 뷰 수(PV)
  | "appReconnectCount"         // 재방문율
  | "appSleepUserCount"         // 휴면 사용자 수
  | "appLoginUserCount"         // 로그인 사용자 수
  | "appAvgUseTime"             // 평균 체류 시간
  | "appLogCount"               // 로그 수
  | "appErrorCount"             // 에러 수
  | "appCrashCount";            // 크래시 수

// 날짜 종류를 나타내는 타입
type DayKind = "today" | "yesterday";

// 특정 지표의 값을 오늘과 어제로 구분하여 저장하는 타입
type MetricValue = {
  today: number | null;      // 오늘 값
  yesterday: number | null;  // 어제 값
};

// 모든 메트릭의 상태를 저장하는 타입
// 각 메트릭 키에 해당하는 오늘/어제 값을 가짐
type MetricState = Record<MetricKey, MetricValue>;

// 라벨 정의 타입
// 번역된 텍스트 또는 아이콘으로 표시되는 라벨을 정의
type LabelDefinition =
  | { 
      type: "translation";  // 번역이 필요한 텍스트 라벨
      key: string;          // 번역 키
      fallback?: string;    // 번역이 없을 경우 표시할 기본 텍스트
      suffix?: string;      // 값 뒤에 붙일 접미사 (예: %)
    }
  | { 
      type: "icon";         // 아이콘으로 표시되는 라벨
      icon: "ios" | "android";  // 표시할 아이콘 종류
      suffix?: string;      // 값 뒤에 붙일 접미사
    };

// 메트릭 정의 타입 - 각 지표의 표시 및 계산 방식을 정의
type MetricDefinition = {
  key: MetricKey;  // 메트릭 키
  label: LabelDefinition;  // 표시될 라벨
  id?: number;  // 고유 식별자 (옵션)
  showArrow?: boolean;  // 상승/하락 화살표 표시 여부
  showPointer?: boolean;  // 게이지 포인터 표시 여부
  // 메트릭 값을 계산하는 함수 (옵션)
  computeValue?: (metric: MetricValue, state: MetricState, day: DayKind) => number | null;
  // 메트릭 값을 포맷팅하는 함수 (옵션)
  formatValue?: (value: number | null) => string;
};

// DsbRadialWrap 컴포넌트의 props 타입
type DsbRadialWrapProps = {
  osType?: string;  // 운영체제 타입 (기본값: 'A' - 전체)
  isNoApp?: boolean;  // 애플리케이션 없음 상태 여부
};

// 렌더링에 사용되는 메트릭 데이터 타입
type RenderMetric = {
  definition: MetricDefinition;  // 메트릭 정의
  currentText: string;          // 현재 값 텍스트
  previousText: string;         // 이전 값 텍스트
  currentValue: number | null;  // 현재 값 (숫자)
  gaugePercent: number | null;  // 게이지 표시 비율 (0~100)
  trend: "up" | "down" | "flat" | null;  // 추세 (상승/하락/유지)
  hasValue: boolean;            // 유효한 값이 있는지 여부
  showPointer: boolean;         // 포인터 표시 여부
};

type ChangeDirection = "up" | "down";

type AnimatedCounterProps = {
  metricKey: MetricKey;
  value: string;
  numericValue: number | null;
  isActive: boolean;
};

const BI_POPUP_METRIC_KEYS = new Set<BiPopupOpenDetail["key"]>([
  "appInstallCount",
  "appIosConnectCount",
  "appAndroidConnectCount",
  "appMauCount",
  "appConnectCount",
  "appCcuCount",
  "appUseCount",
  "appReconnectCount",
  "appSleepUserCount",
  "appLoginUserCount",
  "appAvgUseTime",
  "appLogCount",
  "appErrorCount",
  "appCrashCount",
]);

function isBiPopupMetric(key: MetricKey): key is BiPopupOpenDetail["key"] {
  return BI_POPUP_METRIC_KEYS.has(key as BiPopupOpenDetail["key"]);
}

function determineDirection(
  metricKey: MetricKey,
  previousValue: number | null,
  nextValue: number | null
): ChangeDirection | null {
  if (
    previousValue === null ||
    nextValue === null ||
    Number.isNaN(previousValue) ||
    Number.isNaN(nextValue)
  ) {
    return null;
  }

  if (nextValue === previousValue) {
    return null;
  }

  // 값이 증가하면 위로, 감소하면 아래로 애니메이션
  if (nextValue > previousValue) {
    return "up";
  }

  return "down";
}

function AnimatedCounter({ metricKey, value, numericValue, isActive }: AnimatedCounterProps) {
  const [displayedValue, setDisplayedValue] = useState(value);
  const [direction, setDirection] = useState<ChangeDirection | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousNumericRef = useRef<number | null>(numericValue);
  const previousDisplayRef = useRef<string>(value);
  const isInitialRenderRef = useRef(true);

  useEffect(() => {
    if (isInitialRenderRef.current) {
      isInitialRenderRef.current = false;
      previousNumericRef.current = numericValue;
      previousDisplayRef.current = value;
      setDisplayedValue(value);
      setDirection(null);
      return;
    }

    if (!isActive) {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setDirection(null);
      setDisplayedValue(value);
      previousNumericRef.current = null;
      previousDisplayRef.current = value;
      return;
    }

    const previousDisplay = previousDisplayRef.current;
    const previousNumeric = previousNumericRef.current;

    if (value === previousDisplay) {
      setDisplayedValue(value);
      previousDisplayRef.current = value;
      previousNumericRef.current = numericValue;
      return;
    }

    const shouldSkipAnimation =
      value === "-" ||
      previousDisplay === "-" ||
      numericValue === null ||
      previousNumeric === null;

    if (shouldSkipAnimation) {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setDisplayedValue(value);
      setDirection(null);
      previousNumericRef.current = numericValue;
      previousDisplayRef.current = value;
      return;
    }

    const nextDirection = determineDirection(metricKey, previousNumeric, numericValue);

    if (nextDirection === null) {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setDisplayedValue(value);
      setDirection(null);
      previousNumericRef.current = numericValue;
      previousDisplayRef.current = value;
      return;
    }

    setDirection(nextDirection);
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setDisplayedValue(value);
      setDirection(null);
      timeoutRef.current = null;
    }, 210);

    previousNumericRef.current = numericValue;
    previousDisplayRef.current = value;
  }, [metricKey, value, numericValue, isActive]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const counterUnitClassName =
    direction === null
      ? "counter-unit"
      : `counter-unit ${direction === "up" ? "is-changing-up" : "is-changing-down"}`;

  return (
    <div className="counter" data-cnt-values={value}>
      <div className={counterUnitClassName} data-cnt-loc="0" data-cnt-value={value}>
        <div className="counter-number" data-cnt-js="prev">
          {value}
        </div>
        <div className="counter-number" data-cnt-js="current">
          {displayedValue}
        </div>
        <div className="counter-number" data-cnt-js="next">
          {value}
        </div>
      </div>
    </div>
  );
}

// 모든 메트릭 정의 배열 - 대시보드에 표시될 각 지표들의 설정을 정의
const METRIC_DEFINITIONS: MetricDefinition[] = [
  // 앱 설치 수
  {
    key: "appInstallCount",  // 메트릭 키
    id: 0,  // 고유 ID
    label: { 
      type: "translation",  // 번역이 필요한 텍스트 라벨
      key: "dashboard.bi.install",  // 번역 키
      fallback: "설치"  // 번역이 없을 경우 표시할 기본 텍스트
    },
    showPointer: true,  // 게이지 포인터 표시
  },
  {
    key: "appIosConnectCount",
    id: 2,
    label: { type: "icon", icon: "ios", suffix: "%" },
    showPointer: false,
    computeValue: (metric, _state, day) => sanitizeNumber(getMetricValue(metric, day)),
    formatValue: formatPercentText,
  },
  {
    key: "appAndroidConnectCount",
    id: 1,
    label: { type: "icon", icon: "android", suffix: "%" },
    showPointer: false,
    computeValue: (metric, _state, day) => sanitizeNumber(getMetricValue(metric, day)),
    formatValue: formatPercentText,
  },
  {
    key: "appMauCount",
    id: 3,
    label: { type: "translation", key: "dashboard.bi.mau", fallback: "MAU" },
    showArrow: true,
  },
  {
    key: "appConnectCount",
    label: { type: "translation", key: "dashboard.bi.dau", fallback: "DAU" },
    showArrow: true,
  },
  {
    key: "appCcuCount",
    id: 4,
    label: { type: "translation", key: "dashboard.bi.ccu", fallback: "CCU" },
    showPointer: false,
  },
  {
    key: "appUseCount",
    id: 5,
    label: { type: "translation", key: "dashboard.bi.pv", fallback: "PV" },
    showArrow: true,
  },
  {
    key: "appReconnectCount",
    id: 6,
    label: { type: "translation", key: "dashboard.bi.reconnect", fallback: "재방문", suffix: "%" },
    computeValue: (metric, _state, day) => computeReconnectPercent(metric, day),
    formatValue: formatPercentText,
  },
  {
    key: "appSleepUserCount",
    id: 7,
    label: { type: "translation", key: "dashboard.bi.sleep", fallback: "휴면" },
  },
  {
    key: "appLoginUserCount",
    id: 8,
    label: { type: "translation", key: "dashboard.bi.login", fallback: "로그인" },
  },
  {
    key: "appAvgUseTime",
    id: 9,
    label: { type: "translation", key: "dashboard.bi.avgUseTm", fallback: "체류시간" },
    formatValue: formatDuration,
  },
  {
    key: "appLogCount",
    id: 10,
    label: { type: "translation", key: "dashboard.bi.log", fallback: "로그" },
  },
  {
    key: "appErrorCount",
    id: 11,
    label: { type: "translation", key: "dashboard.bi.error", fallback: "에러" },
  },
  {
    key: "appCrashCount",
    id: 12,
    label: { type: "translation", key: "dashboard.bi.crash", fallback: "크래시" },
  },
];

const METRIC_KEYS = METRIC_DEFINITIONS.map((definition) => definition.key);

const ID_TO_KEY: Record<number, MetricKey | undefined> = {
  0: "appInstallCount",
  1: "appAndroidConnectCount",
  2: "appIosConnectCount",
  3: "appMauCount",
  4: "appCcuCount",
  5: "appUseCount",
  6: "appReconnectCount",
  7: "appSleepUserCount",
  8: "appLoginUserCount",
  9: "appAvgUseTime",
  10: "appLogCount",
  11: "appErrorCount",
  12: "appCrashCount",
  13: "appConnectCount",
};

// 구(舊) 대시보드에서 사용하던 한글 문구를 재현하기 위한 기본 툴팁 라벨.
const DEFAULT_TOOLTIP_VALUE_LABEL = "건수";
const DEFAULT_TOOLTIP_PERCENT_LABEL = "전일 대비";

// 툴팁에 표시될 값 라벨 (기본값: "건수")
// 특정 메트릭에 대해 다른 라벨을 사용하고 싶을 때 여기에 정의
const TOOLTIP_VALUE_LABELS: Partial<Record<MetricKey, string>> = {
  appAvgUseTime: "체류 시간",  // 평균 체류 시간은 '건수' 대신 '체류 시간'으로 표시
};

// 툴팁에 표시될 비율 라벨 (기본값: "전일 대비")
// 특정 메트릭에 대해 다른 비율 라벨을 사용하고 싶을 때 여기에 정의
const TOOLTIP_PERCENT_LABELS: Partial<Record<MetricKey, string>> = {
  appIosConnectCount: "비율",        // iOS 접속자 비율
  appAndroidConnectCount: "비율",    // 안드로이드 접속자 비율
  appMauCount: "전월 대비",          // MAU는 전월 대비로 표시
};

/**
 * 메트릭 키에 해당하는 툴팁 값 라벨을 반환합니다.
 * @param key 메트릭 키
 * @returns 툴팁에 표시할 값 라벨 (예: "건수", "체류 시간")
 */
function getTooltipValueLabel(key: MetricKey): string {
  return TOOLTIP_VALUE_LABELS[key] ?? DEFAULT_TOOLTIP_VALUE_LABEL;
}

/**
 * 메트릭 키에 해당하는 툴팁 비율 라벨을 반환합니다.
 * @param key 메트릭 키
 * @returns 툴팁에 표시할 비율 라벨 (예: "전일 대비", "비율", "전월 대비")
 */
function getTooltipPercentLabel(key: MetricKey): string {
  return TOOLTIP_PERCENT_LABELS[key] ?? DEFAULT_TOOLTIP_PERCENT_LABEL;
}

/**
 * 모든 메트릭의 초기 상태를 생성합니다.
 * @returns 모든 메트릭 키에 대해 today와 yesterday가 null로 초기화된 객체
 */
function createEmptyMetricState(): MetricState {
  return METRIC_KEYS.reduce((acc, key) => {
    acc[key] = { today: null, yesterday: null };  // 모든 값을 null로 초기화
    return acc;
  }, {} as MetricState);
}

/**
 * 지정된 날짜(오늘/어제)에 해당하는 메트릭 값을 반환합니다.
 * @param metric MetricValue 객체 (today, yesterday 값을 가짐)
 * @param day 날짜 종류 ("today" 또는 "yesterday")
 * @returns 해당 날짜의 메트릭 값 (number) 또는 값이 없으면 null
 */
function getMetricValue(metric: MetricValue, day: DayKind): number | null {
  return day === "today" ? metric.today : metric.yesterday;
}

/**
 * 큰 숫자를 압축된 형식으로 변환합니다 (예: 1500 → "1.5K").
 * @param value 변환할 숫자 (또는 null)
 * @returns 압축된 형식의 문자열 (예: "1.5K", "2.3M", "1B"), 값이 없으면 "-" 반환
 */
function formatCompactNumber(value: number | null): string {
  if (value === null || Number.isNaN(value)) {
    return "-";
  }
  const abs = Math.abs(value);
  // 10억 이상: B(억) 단위로 표시 (예: 1.5B)
  if (abs >= 1_000_000_000) {
    return `${Math.floor(value / 1_000_000_000).toLocaleString()}B`;
  }
  // 100만 이상: M(백만) 단위로 표시 (예: 2.3M)
  if (abs >= 1_000_000) {
    return `${Math.floor(value / 1_000_000).toLocaleString()}M`;
  }
  // 1,000 이상: K(천) 단위로 표시 (예: 1.5K)
  if (abs >= 1_000) {
    return `${Math.floor(value / 1_000).toLocaleString()}K`;
  }
  // 1,000 미만: 일반 숫자로 표시 (천 단위 구분자 포함)
  return value.toLocaleString();
}

/**
 * 숫자를 소수점 첫째 자리에서 반올림하고, .0인 경우 정수로 변환합니다.
 * @param value 반올림할 숫자
 * @returns 소수점 첫째 자리까지의 문자열 (예: 1.5 → "1.5", 2.0 → "2")
 */
// function roundToOneDecimal(value: number): string {
//   return value.toFixed(1).replace(/\.0$/, "");
// }

/**
 * 전체 대비 백분율을 계산합니다.
 * @param value 부분 값
 * @param total 전체 값
 * @returns 0에서 100 사이의 백분율 값, 계산 불가능한 경우 null
 */
function computePercent(value: number | null, total: number | null): number | null {
  if (value === null) {
    return null;
  }
  // 전체 값이 없거나 0 이하면 계산 불가 (단, 값이 0이면 0 반환)
  if (!total || total <= 0) {
    return value === 0 ? 0 : null;
  }
  // 0~100% 범위로 제한하여 반환
  return Math.max(0, Math.min(100, (value / total) * 100));
}

/**
 * 전일 대비 백분율을 계산합니다.
 * @param today 오늘 값
 * @param yesterday 어제 값
 * @returns 전일 대비 백분율 (예: 150이면 150%, 즉 50% 증가), 계산 불가능한 경우 null
 */
function computeDayOverDayPercent(today: number | null, yesterday: number | null): number | null {
  // 값이 없거나 어제 값이 0이면 계산 불가
  if (today === null || yesterday === null || yesterday === 0) {
    return null;
  }
  return (today / yesterday) * 100;
}

/**
 * 재방문율을 계산합니다.
 * @param metric MetricValue 객체 (today, yesterday 값 포함)
 * @param day 계산할 날짜 ("today" 또는 "yesterday")
 * @returns 재방문율(%), 계산 불가능한 경우 null
 * @description 오늘의 재방문율은 어제 대비 오늘의 비율로 계산
 */
function computeReconnectPercent(metric: MetricValue, day: DayKind): number | null {
  if (day === "today") {
    return computeDayOverDayPercent(metric.today, metric.yesterday);
  }
  return null;
}

/**
 * 백분율 값을 문자열로 포맷팅합니다.
 * @param value 포맷팅할 백분율 값 (예: 50.5)
 * @returns 포맷팅된 문자열 (예: "51"), 값이 없으면 "-" 반환
 */
function formatPercentText(value: number | null): string {
  if (value === null || Number.isNaN(value)) {
    return "-";
  }
  // 소수점 첫째 자리에서 반올림하여 정수로 변환
  return `${Math.round(value)}`;
}

/**
 * 초 단위의 시간을 사람이 읽기 쉬운 형식으로 변환합니다.
 * @param value 초 단위 시간 (예: 3665)
 * @returns 포맷팅된 시간 문자열 (예: "1h", "30m", "5s"), 값이 없으면 "-" 반환
 * @description 시간이 1시간 이상이면 시간 단위, 1분 이상이면 분 단위, 그 외는 초 단위로 표시
 */
function formatDuration(value: number | null): string {
  if (value === null || Number.isNaN(value)) {
    return "-";
  }

  // 초 단위로 변환하고 소수점 이하 버림
  const totalSeconds = Math.max(0, Math.floor(value));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  // 가장 큰 단위로 표시 (시간 > 분 > 초)
  if (hours > 0) {
    return `${hours}h`;  // 시간 단위 (예: 1h)
  }
  if (minutes > 0) {
    return `${minutes}m`;  // 분 단위 (예: 30m)
  }
  return `${seconds}s`;  // 초 단위 (예: 5s)
}

/**
 * 백분율 값을 0에서 100 사이의 값으로 제한합니다.
 * @param value 제한할 백분율 값
 * @returns 0에서 100 사이의 값, 유효하지 않은 값이면 null 반환
 */
function clampPercent(value: number | null): number | null {
  // 값이 없거나 숫자가 아니거나 무한대인 경우 null 반환
  if (value === null || Number.isNaN(value) || !Number.isFinite(value)) {
    return null;
  }
  // 0% 미만이면 0%로 제한
  if (value < 0) {
    return 0;
  }
  // 100% 초과면 100%로 제한
  if (value > 100) {
    return 100;
  }
  // 0~100% 범위 내의 값은 그대로 반환
  return value;
}

/**
 * 툴팁에 표시할 값을 포맷팅합니다.
 * @param definition 메트릭 정의
 * @param metric 메트릭 값 (today, yesterday)
 * @returns 포맷팅된 값 문자열, 값이 없으면 null
 * @description 체류 시간은 특별한 포맷으로, 나머지는 천 단위 구분자로 포맷팅
 */
function formatTooltipValue(definition: MetricDefinition, metric: MetricValue): string | null {
  const rawValue = metric.today;
  // 값이 없거나 유효하지 않으면 null 반환
  if (rawValue === null || Number.isNaN(rawValue)) {
    return null;
  }

  // 체류 시간인 경우 특별한 포맷 적용 (예: "1h 30m")
  if (definition.key === "appAvgUseTime") {
    return formatDuration(rawValue);
  }

  // 그 외는 천 단위 구분자로 포맷팅 (예: "1,234,567")
  return rawValue.toLocaleString();
}

/**
 * 툴팁의 두 번째 줄에 표시할 비율 값을 계산합니다.
 * @param definition 메트릭 정의
 * @param state 전체 메트릭 상태
 * @returns 계산된 비율 값 (%), 표시하지 않을 경우 null
 * @description 각 메트릭 유형에 따라 다른 방식으로 비율을 계산
 */
function getTooltipPercentValue(
  definition: MetricDefinition,
  state: MetricState
): number | null {
  // CCU(동시 접속자 수)는 툴팁에 비율을 표시하지 않음
  if (definition.key === "appCcuCount") {
    return null;
  }

  const metric = state[definition.key];
  if (!metric) {
    return null;
  }

  // iOS/안드로이드 접속자 수 또는 재방문율인 경우
  if (
    definition.key === "appIosConnectCount" ||
    definition.key === "appAndroidConnectCount" ||
    definition.key === "appReconnectCount"
  ) {
    // computeValue 함수를 사용하여 값을 계산하고 0~100% 범위로 클램핑
    const computed = definition.computeValue?.(metric, state, "today") ?? null;
    return clampPercent(computed);
  }

  // 그 외 메트릭은 게이지 퍼센트를 계산하여 반환
  return clampPercent(getGaugePercent(definition, state));
}

/**
 * 툴팁에 표시할 HTML 콘텐츠를 생성합니다.
 * @param definition 메트릭 정의
 * @param state 전체 메트릭 상태
 * @returns 툴팁 HTML 문자열, 표시할 내용이 없으면 null
 * @description 이전 서비스와 동일한 문구/줄바꿈 구조로 툴팁을 생성
 */
function createTooltipContent(
  definition: MetricDefinition,
  state: MetricState
): string | null {
  const metric = state[definition.key];
  if (!metric) {
    return null;
  }

  const formattedValue = formatTooltipValue(definition, metric);
  const percentValue = getTooltipPercentValue(definition, state);
  const valueLabel = getTooltipValueLabel(definition.key);
  const percentLabel = getTooltipPercentLabel(definition.key);

  const sections: string[] = [];

  if (formattedValue !== null) {
    sections.push(`${valueLabel}: <b>${formattedValue}</b>`);
  }

  if (definition.key !== "appCcuCount" && percentValue !== null) {
    sections.push(`${percentLabel}: <b>${formatPercentText(percentValue)}%</b>`);
  }

  if (sections.length === 0) {
    return null;
  }

  return sections.join("<br />");
}

/**
 * 게이지에 표시할 백분율 값을 계산합니다.
 * @param definition 메트릭 정의
 * @param state 전체 메트릭 상태
 * @returns 게이지에 표시할 백분율 (0~100), 계산 불가능한 경우 null
 */
function getGaugePercent(definition: MetricDefinition, state: MetricState): number | null {
  const metric = state[definition.key];

  // 재방문율인 경우 어제 대비 오늘의 비율을 계산
  if (definition.key === "appReconnectCount") {
    return computeDayOverDayPercent(metric.today, metric.yesterday);
  }

  // 오늘 값 계산 (computeValue 함수가 있으면 사용, 없으면 today 값 사용)
  const today = definition.computeValue
    ? definition.computeValue(metric, state, "today")
    : metric.today;
    
  // 어제 값 계산 (computeValue 함수가 있으면 사용, 없으면 yesterday 값 사용)
  const yesterday = definition.computeValue
    ? definition.computeValue(metric, state, "yesterday")
    : metric.yesterday;

  // 오늘 값이 없으면 게이지에 표시할 수 없음
  if (today === null) {
    return null;
  }

  // iOS/안드로이드 접속자 수는 이미 비율로 계산된 값을 그대로 사용
  if (definition.key === "appIosConnectCount" || definition.key === "appAndroidConnectCount") {
    return today;
  }

  // 어제 값이 없으면 오늘 값이 0이면 0%, 아니면 100% 반환
  if (yesterday === null) {
    return today === 0 ? 0 : 100;
  }

  // 어제 값이 0이면 오늘 값이 0이면 0%, 아니면 100% 반환 (0으로 나누기 방지)
  if (yesterday === 0) {
    return today === 0 ? 0 : 100;
  }

  // 어제 대비 오늘 값의 비율을 백분율로 계산
  return (today / yesterday) * 100;
}

/**
 * 메트릭의 추세(상승/하락/유지)를 계산합니다.
 * @param definition 메트릭 정의
 * @param state 전체 메트릭 상태
 * @param metric 계산할 메트릭 값
 * @returns "up"(상승), "down"(하락), "flat"(유지) 또는 null(표시 안 함)
 */
function getTrend(
  definition: MetricDefinition,
  state: MetricState,
  metric: MetricValue
): "up" | "down" | "flat" | null {
  // 화살표를 표시하지 않는 메트릭이면 null 반환
  if (!definition.showArrow) {
    return null;
  }
  
  // 오늘 값 계산 (computeValue 함수가 있으면 사용, 없으면 today 값 사용)
  const today = definition.computeValue
    ? definition.computeValue(metric, state, "today")
    : metric.today;
    
  // 어제 값 계산 (computeValue 함수가 있으면 사용, 없으면 yesterday 값 사용)
  const yesterday = definition.computeValue
    ? definition.computeValue(metric, state, "yesterday")
    : metric.yesterday;

  // 값이 없으면 추세를 계산할 수 없음
  if (today === null || yesterday === null) {
    return null;
  }

  // 오늘 값이 어제보다 크면 상승
  if (today > yesterday) {
    return "up";
  }
  // 오늘 값이 어제보다 작으면 하락
  if (today < yesterday) {
    return "down";
  }
  // 값이 같으면 유지
  return "flat";
}

/**
 * 메트릭의 라벨을 렌더링합니다.
 * @param definition 메트릭 정의
 * @returns 아이콘 또는 텍스트로 구성된 React 요소
 * @description 아이콘 타입인 경우 플랫폼(iOS/Android) 아이콘을, 
 * 텍스트 타입인 경우 번역된 텍스트를 반환합니다.
 */
function renderLabel(definition: MetricDefinition) {
  const { label } = definition;
  if (label.type === "icon") {
    const iconSrc =
      label.icon === "ios"
        ? "/images/maxy/icon-ios.svg"
        : "/images/maxy/icon-android.svg";
    const iconAlt = label.icon === "ios" ? "iOS" : "Android";
    return (
      <>
        <span>
          <img src={iconSrc} alt={iconAlt} />
        </span>
        <span className="sm-text">%</span>
      </>
    );
  }

  return (
    <>
      <span data-t={label.key}>{label.fallback ?? ""}</span>
      {label.suffix ? <span className="sm-text">{label.suffix}</span> : null}
    </>
  );
}

/**
 * API 응답을 메트릭 상태 객체로 변환합니다.
 * @param biInfomations BI 정보 배열 (API 응답)
 * @returns 변환된 메트릭 상태 객체
 * @description 서버에서 받은 데이터를 컴포넌트에서 사용할 수 있는 형식으로 변환
 */
function transformResponse(biInfomations: BiInfomation[]): MetricState {
  const nextState = createEmptyMetricState();

  biInfomations.forEach((info) => {
    const key = ID_TO_KEY[info.ID ?? -1];
    if (!key) {
      return;
    }
    nextState[key] = {
      today: sanitizeNumber(info.Today),
      yesterday: sanitizeNumber(info.Yesterday),
    };
  });

  const android = nextState.appAndroidConnectCount;
  const ios = nextState.appIosConnectCount;
  const providedTotal = nextState.appConnectCount;

  const hasToday = providedTotal.today !== null || android.today !== null || ios.today !== null;
  const hasYesterday =
    providedTotal.yesterday !== null || android.yesterday !== null || ios.yesterday !== null;

  nextState.appConnectCount = {
    today:
      providedTotal.today !== null
        ? providedTotal.today
        : hasToday
          ? (android.today ?? 0) + (ios.today ?? 0)
          : null,
    yesterday:
      providedTotal.yesterday !== null
        ? providedTotal.yesterday
        : hasYesterday
          ? (android.yesterday ?? 0) + (ios.yesterday ?? 0)
          : null,
  };

  return nextState;
}

/**
 * 숫자로 변환 가능한지 검사하고, 유효한 숫자를 반환합니다.
 * @param value 검사할 값
 * @returns 유효한 숫자 또는 null
 */
function sanitizeNumber(value: unknown): number | null {
  // 값이 숫자가 아니거나 NaN이면 null 반환
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }
  // 유효한 숫자 반환
  return value;
}

/**
 * 게이지 차트를 캔버스에 그립니다.
 * @param canvas 게이지를 그릴 캔버스 요소
 * @param percent 게이지에 표시할 백분율 (0-100)
 * @param showPointer 게이지 포인터 표시 여부
 * @param isDarkMode 다크 모드 여부
 */
function drawGauge(
  canvas: HTMLCanvasElement,
  percent: number | null,
  showPointer: boolean,
  isDarkMode: boolean
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }

  const size = 100;
  const center = size / 2;
  const radius = 40;
  const baseLineWidth = 8;
  const startDeg = 135;
  const startAngle = (Math.PI / 180) * startDeg;
  const devicePixelRatio = (typeof window !== "undefined" && window.devicePixelRatio) || 1;

  const scaledSize = size * devicePixelRatio;
  if (canvas.width !== scaledSize || canvas.height !== scaledSize) {
    canvas.width = scaledSize;
    canvas.height = scaledSize;
  }

  const cssSize = `${size}px`;
  if (canvas.style.width !== cssSize) {
    canvas.style.width = cssSize;
  }
  if (canvas.style.height !== cssSize) {
    canvas.style.height = cssSize;
  }

  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  ctx.clearRect(0, 0, size, size);

  const baseStartAngle = percent === null ? 0 : startAngle;
  const baseEndAngle = percent === null ? Math.PI * 2 : (Math.PI / 180) * 45;

  ctx.beginPath();
  ctx.arc(center, center, radius, baseStartAngle, baseEndAngle, false);
  ctx.strokeStyle = isDarkMode ? "#313233" : "#ECEEF2";
  ctx.lineWidth = baseLineWidth;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.closePath();

  if (percent === null) {
    return;
  }

  const clamped = clampPercent(percent);
  if (clamped === null) {
    return;
  }

  const endDeg = startDeg + clamped * 2.7;
  const endAngle = (Math.PI / 180) * endDeg;

  if (!showPointer) {
    return;
  }

  const pointerRadius = 7;
  const pointerX = center + radius * Math.cos(endAngle);
  const pointerY = center + radius * Math.sin(endAngle);

  ctx.beginPath();
  ctx.fillStyle = isDarkMode ? "#B2B5FF" : "#4D52FF";
  ctx.arc(pointerX, pointerY, pointerRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.closePath();
}

/**
 * 대시보드에 표시되는 원형 게이지 차트 컴포넌트
 * @param osType 운영체제 타입 (A: 전체, I: iOS, A: Android)
 */
export default function DsbRadialWrap({ osType = "A", isNoApp = false }: DsbRadialWrapProps) {
  // 사용자 설정에서 애플리케이션 ID와 타임존 오프셋 가져오기
  const { applicationId, tmzutc } = useUserSettings();
  
  // 메트릭 상태 관리
  const [metricState, setMetricState] = useState<MetricState>(() => createEmptyMetricState());
  
  // 로딩 상태 관리
  const [isLoading, setIsLoading] = useState(false);
  
  // 에러 상태 관리
  const [error, setError] = useState<string | null>(null);
  
  // 다크 모드 상태 관리
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // 툴팁 인스턴스 참조
  const tooltipInstancesRef = useRef<Map<MetricKey, TippyInstance>>(new Map());

  // 애플리케이션 ID를 숫자로 변환하여 반환
  const numericApplicationId = useMemo(() => {
    // 이미 숫자인 경우 그대로 반환
    if (typeof applicationId === "number") {
      return applicationId;
    }
    // 문자열인 경우 숫자로 변환 시도
    if (typeof applicationId === "string" && applicationId.trim() !== "") {
      const parsed = Number(applicationId);
      // 유효한 숫자인지 확인 후 반환
      return Number.isFinite(parsed) ? parsed : null;
    }
    // 변환할 수 없는 경우 null 반환
    return null;
  }, [applicationId]);

  // 다크 모드 상태 감지 및 업데이트
  useEffect(() => {
    // 서버 사이드 렌더링 시 document가 없을 수 있으므로 체크
    if (typeof document === "undefined") {
      return;
    }

    // 다크 모드 상태를 업데이트하는 함수
    const updateDarkMode = () => {
      setIsDarkMode(document.body.classList.contains("dark_mode"));
    };

    // 초기 다크 모드 상태 설정
    updateDarkMode();

    // body의 class 변경을 감지하기 위한 MutationObserver 설정
    const observer = new MutationObserver(updateDarkMode);
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });

    // 컴포넌트 언마운트 시 observer 정리
    return () => observer.disconnect();
  }, []);

  // 메트릭을 초기화해야 하는지 여부를 결정
  const shouldResetMetrics = numericApplicationId === null || !osType;

  // 프로젝트 ID, 애플리케이션 ID 또는 OS 타입이 변경될 때마다 메트릭 데이터 가져오기
  useEffect(() => {
    // 필수 파라미터가 없으면 아무 작업도 하지 않음
    if (shouldResetMetrics) {
      return;
    }

    let isActive = true;
    let controller: AbortController | null = null;
    let timeoutId: ReturnType<typeof globalThis.setTimeout> | null = null;
    let isInitialFetch = true;

    const fetchBiInformations = () => {
      if (!isActive) {
        return;
      }

      const currentController = new AbortController();
      controller = currentController;

      if (isInitialFetch) {
        setIsLoading(true);
      }
      setError(null);

      apiBIInfomations(
        {
          applicationId: numericApplicationId,
          osType,
          tmzutc: tmzutc,
        },
        { signal: currentController.signal }
      )
        .then((response) => {
          if (
            !isActive ||
            controller !== currentController ||
            currentController.signal.aborted
          ) {
            return;
          }
          setMetricState(transformResponse(response.biInfomations ?? []));
        })
        .catch((err: unknown) => {
          if (
            !isActive ||
            controller !== currentController ||
            currentController.signal.aborted
          ) {
            return;
          }
          console.error(err);
          setMetricState(createEmptyMetricState());
          setError(err instanceof Error ? err.message : "Failed to load BI information.");
        })
        .finally(() => {
          if (
            !isActive ||
            controller !== currentController ||
            currentController.signal.aborted
          ) {
            return;
          }
          setIsLoading(false);
          isInitialFetch = false;
          timeoutId = globalThis.setTimeout(fetchBiInformations, 3000);
        });
    };

    fetchBiInformations();

    return () => {
      isActive = false;
      if (controller) {
        controller.abort();
      }
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    };
  }, [numericApplicationId, osType, tmzutc, shouldResetMetrics]);

  // shouldResetMetrics가 true로 변경되면 메트릭 상태를 초기화
  useEffect(() => {
    // 초기화가 필요하지 않은 경우 아무 작업도 하지 않음
    if (!shouldResetMetrics) {
      return;
    }
    // 메트릭 상태를 빈 상태로 초기화
    setMetricState(createEmptyMetricState());
    // 로딩 상태 해제
    setIsLoading(false);
    // 에러 상태 초기화
    setError(null);
  }, [shouldResetMetrics]);

  // 렌더링에 사용할 메트릭 데이터 생성
  const metrics: RenderMetric[] = useMemo(() => {
    // 애플리케이션이 없는 경우 기본 표시값만 렌더링
    if (isNoApp) {
      return METRIC_DEFINITIONS.map((definition) => ({
        definition,
        currentText: "-",
        previousText: "-",
        currentValue: null,
        gaugePercent: null,
        trend: null,
        hasValue: false,
        showPointer: false,
      }));
    }

    // 모든 메트릭 정의에 대해 반복하여 렌더링용 데이터 생성
    return METRIC_DEFINITIONS.map((definition) => {
      // 현재 메트릭의 상태 가져오기
      const metric = metricState[definition.key];
      // 오늘 값 (숫자) 계산
      const rawCurrentValue = definition.computeValue
        ? definition.computeValue(metric, metricState, "today")
        : getMetricValue(metric, "today");
      const currentValue =
        rawCurrentValue === null || Number.isNaN(rawCurrentValue) ? null : rawCurrentValue;
      // 게이지에 표시할 백분율 계산 (0~100 사이로 제한)
      const gaugePercent = clampPercent(getGaugePercent(definition, metricState));
      // 추세(상승/하락/유지) 계산
      const trend = getTrend(definition, metricState, metric);
      // 오늘 값 텍스트 포맷팅
      const currentText = getDisplayValue(definition, metric, metricState, "today");
      // 어제 값 텍스트 포맷팅
      const previousText = getDisplayValue(definition, metric, metricState, "yesterday");
      // 유효한 값이 있는지 여부
      const hasValue = currentValue !== null;
      // 포인터 표시 여부 (기본값: true)
      const showPointer = definition.showPointer !== false;

      return {
        definition,
        currentText,
        previousText,
        currentValue,
        gaugePercent,
        trend,
        hasValue,
        showPointer,
      };
    });
  }, [isNoApp, metricState]);

  // 메트릭이나 다크 모드가 변경될 때마다 게이지 다시 그리기
  useEffect(() => {
    // 서버 사이드 렌더링 시 document가 없을 수 있으므로 체크
    if (typeof document === "undefined") {
      return;
    }

    // 각 메트릭에 대해 게이지 그리기
    metrics.forEach(({ definition, gaugePercent, showPointer }) => {
      // 메트릭 키에 해당하는 캔버스 요소 찾기
      const canvas = document.getElementById(definition.key) as HTMLCanvasElement | null;
      if (!canvas) {
        return;
      }
      // 게이지 그리기
      const percent = isNoApp ? null : gaugePercent;
      drawGauge(canvas, percent, showPointer && !isNoApp, isDarkMode);
    });
  }, [metrics, isDarkMode, isNoApp]);

  // 메트릭이나 메트릭 상태가 변경될 때마다 툴팁 업데이트
  useEffect(() => {
    // 서버 사이드 렌더링 시 document가 없을 수 있으므로 체크
    if (typeof document === "undefined") {
      return;
    }

    // 툴팁 인스턴스 참조 가져오기
    const instances = tooltipInstancesRef.current;
    if (isNoApp) {
      instances.forEach((instance) => instance.destroy());
      instances.clear();
      return;
    }
    // 현재 활성화된 메트릭 키를 추적하기 위한 Set
    const activeKeys = new Set<MetricKey>();

    // 각 메트릭에 대해 툴팁 설정
    metrics.forEach(({ definition, hasValue }) => {
      const key = definition.key;
      // 툴팁을 표시할 캔버스 요소 찾기
      const canvas = document.getElementById(key) as HTMLCanvasElement | null;
      // 툴팁 타겟 요소 (캔버스의 부모 요소)
      const target = canvas?.parentElement ?? null;
      // 툴팁 내용 생성 (값이 있는 경우에만)
      const content = hasValue ? createTooltipContent(definition, metricState) : null;
      // 기존 툴팁 인스턴스 가져오기
      const existing = instances.get(key);

      // 타겟이나 컨텐츠가 없는 경우 기존 툴팁 제거
      if (!target || !content) {
        if (existing) {
          existing.destroy();
          instances.delete(key);
        }
        return;
      }

      // 현재 메트릭 키를 활성화된 키로 추가
      activeKeys.add(key);

      // 기존 툴팁이 있는 경우 내용만 업데이트
      if (existing) {
        existing.setContent(content);
        return;
      }

      // 새 툴팁 생성
      const instance = tippy(target, {
        content, // 툴팁 내용
        allowHTML: true, // HTML 허용
        theme: "maxy-tooltip", // 테마 설정
        arrow: false, // 화살표 표시 안 함
        placement: "bottom", // 툴팁 위치 (하단)
        followCursor: true, // 커서를 따라가도록 설정
        plugins: [followCursor], // 커서 추적 플러그인
        delay: [0, 0], // 딜레이 없음
        offset: [0, 8], // 오프셋 설정 (x: 0, y: 8)
      });

      // 인스턴스 맵에 저장
      instances.set(key, instance);
    });

    // 더 이상 필요하지 않은 툴팁 제거
    instances.forEach((instance, key) => {
      if (!activeKeys.has(key)) {
        instance.destroy();
        instances.delete(key);
      }
    });
  }, [isNoApp, metrics, metricState]);

  // 컴포넌트 언마운트 시 모든 툴팁 정리
  useEffect(() => {
    // 현재 컴포넌트의 툴팁 인스턴스 참조 가져오기
    const instances = tooltipInstancesRef.current;
    
    // 클린업 함수: 컴포넌트 언마운트 시 모든 툴팁 제거
    return () => {
      // 모든 툴팁 인스턴스 제거
      instances.forEach((instance) => instance.destroy());
      // 인스턴스 맵 비우기
      instances.clear();
    };
  }, []);


  // 메트릭 클릭 이벤트 핸들러 함수
  const handleMetricClick = useCallback(
    async (metric: RenderMetric) => {
      if (isNoApp || !metric.hasValue || shouldResetMetrics) {
        return;
      }
      const key = metric.definition.key;
      if (!isBiPopupMetric(key)) {
        return;
      }

      if (!canLoadBiPopupData(key) || numericApplicationId === null) {
        if (numericApplicationId === null) {
          return;
        }
        dispatchOpenBiPopup({ key, applicationId: numericApplicationId });
        return;
      }

      try {
        const detail = await loadBiPopupData({
          metricKey: key,
          applicationId: numericApplicationId,
          osType,
          tmzutc,
        });
        dispatchOpenBiPopup(detail);
      } catch (error) {
        console.error(error);
        dispatchOpenBiPopup({
          key,
          applicationId: numericApplicationId,
          totals: { sum: "Failed to load" },
        });
      }
    },
    [isNoApp, numericApplicationId, osType, tmzutc, shouldResetMetrics],
  );

  // 컴포넌트 렌더링
  return (
    <>
      {/* 메트릭 목록 컨테이너 */}
      <ul className="dsb_radial_wrap" aria-busy={isLoading}>
        {metrics.map((metric) => {
          // 메트릭 속성 구조 분해 할당
          const { definition, hasValue, currentText, currentValue, trend } = metric;
          // 메트릭의 활성화 상태에 따라 클래스 이름 결정
          const liClassName = hasValue ? "open" : "disabled";

          return (
            <li
              key={definition.key}
              className={liClassName}
              onClick={() => {
                void handleMetricClick(metric);
              }}
            >
              {/* 게이지 캔버스 */}
              <canvas id={definition.key} width={100} height={100} />
              
              {/* 카운터 컨테이너 */}
              <AnimatedCounter
                metricKey={definition.key}
                value={currentText}
                numericValue={currentValue}
                isActive={hasValue}
              />
              {/* 메트릭 라벨 렌더링 */}
              {renderLabel(definition)}
              
              {/* 상승/하락 화살표 표시 (설정된 경우에만) */}
              {definition.showArrow ? (
                <i>
                  <img
                    id={`${definition.key}Tri`}
                    className={`img_arrow${trend === "up" ? " arrow_up" : ""}`}
                    alt={trend === "up" ? "상승" : "하락"}
                  />
                </i>
              ) : null}
            </li>
          );
        })}
      </ul>
      {/* 에러 메시지 표시 (에러가 있는 경우에만) */}
      {!isNoApp && error ? (
        <p role="status" className="bi-error-message">
          {error}
        </p>
      ) : null}
    </>
  );
}

/**
 * 메트릭 값을 화면에 표시할 형식으로 변환합니다.
 * @param definition 메트릭 정의
 * @param metric 메트릭 값 (오늘/어제 값 포함)
 * @param state 전체 메트릭 상태
 * @param day 'today' 또는 'yesterday' 중 하나
 * @returns 포맷팅된 문자열
 */
function getDisplayValue(
  definition: MetricDefinition,
  metric: MetricValue,
  state: MetricState,
  day: DayKind
): string {
  // computeValue 함수가 정의되어 있으면 해당 함수로 값을 계산하고, 아니면 기본값 사용
  const rawValue = definition.computeValue
    ? definition.computeValue(metric, state, day)
    : getMetricValue(metric, day);

  // formatValue 함수가 정의되어 있으면 해당 함수로 포맷팅
  if (definition.formatValue) {
    return definition.formatValue(rawValue);
  }

  // 기본 포맷팅: 큰 숫자는 축약형으로 변환 (예: 1000 → 1K)
  return formatCompactNumber(rawValue);
}
