"use client";

// React 및 타입 임포트
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from "react";

// API 및 데이터 관련 임포트
import {
  apiBIDetailCrashTop10,        // 크래시 TOP 10 조회 API
  apiBIDetailErrorTop10,         // 에러 TOP 10 조회 API
  type BIDetailTop10Entry,       // TOP 10 항목 타입
  type BIDetailTop10Response,    // TOP 10 응답 타입
  type OsType,                   // OS 타입 (iOS/Android)
} from "@/app/api/BIDetail";

// 컴포넌트 및 유틸리티 임포트
import { RangeCalendar, formatDateISO, isoStringToDate } from "@/components/calendar/RangeCalendar";
import { loadBiPopupData } from "./biPopupData";  // BI 팝업 데이터 로더
import { CCUSummary } from "./CCUPopup";           // CCU 요약 컴포넌트
import { useUserSettings } from "@/components/usersettings/UserSettingsProvider";

// 차트 라이브러리 임포트 (Recharts)
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis,
} from "recharts";

// 스타일 시트 임포트
import "./maxyBiPopupWrap.css";

/**
 * BI 팝업에서 사용되는 메트릭 키 타입 정의
 * 각 키는 특정 BI 지표를 나타내며, 앱의 다양한 사용자 활동 및 시스템 지표를 추적합니다.
 * 
 * @typedef {string} BiPopupMetricKey
 * @property {string} appInstallCount - 앱 설치 수
 * @property {string} appIosConnectCount - iOS 접속 수
 * @property {string} appAndroidConnectCount - 안드로이드 접속 수
 * @property {string} appMauCount - 월간 활성 사용자 수 (MAU)
 * @property {string} appConnectCount - 일일 접속자 수 (DAU)
 * @property {string} appCcuCount - 동시 접속자 수 (CCU)
 * @property {string} appUseCount - 페이지 뷰 수
 * @property {string} appReconnectCount - 재방문자 수
 * @property {string} appSleepUserCount - 휴면 사용자 수
 * @property {string} appLoginUserCount - 로그인 사용자 수
 * @property {string} appAvgUseTime - 평균 사용 시간
 * @property {string} appLogCount - 로그 수집량
 * @property {string} appErrorCount - 에러 수
 * @property {string} appCrashCount - 크래시 수
 */
export type BiPopupMetricKey =
  | "appInstallCount"       // 앱 설치 수
  | "appIosConnectCount"    // iOS 접속 수
  | "appAndroidConnectCount" // 안드로이드 접속 수
  | "appMauCount"           // 월간 활성 사용자 수 (MAU)
  | "appConnectCount"       // 일일 접속자 수 (DAU)
  | "appCcuCount"           // 동시 접속자 수 (CCU)
  | "appUseCount"           // 페이지 뷰 수
  | "appReconnectCount"     // 재방문자 수
  | "appSleepUserCount"     // 휴면 사용자 수
  | "appLoginUserCount"     // 로그인 사용자 수
  | "appAvgUseTime"         // 평균 사용 시간
  | "appLogCount"           // 로그 수집량
  | "appErrorCount"         // 에러 수
  | "appCrashCount";        // 크래시 수

/**
 * BI 팝업에서 사용되는 데이터 키 타입 정의
 * 각 키는 특정 데이터 지표를 나타내며, 차트와 요약 정보에 사용됩니다.
 * 
 * @typedef {string} BiPopupDataKey
 * @property {string} sum - 합계
 * @property {string} avgSum - 평균 합계
 * @property {string} series0Sum - 시리즈 0 합계 (예: iOS)
 * @property {string} series1Sum - 시리즈 1 합계 (예: Android)
 * @property {string} series0Avg - 시리즈 0 평균
 * @property {string} series1Avg - 시리즈 1 평균
 * @property {string} avgSeries0 - 시리즈 0 평균 (별칭)
 * @property {string} avgSeries1 - 시리즈 1 평균 (별칭)
 * @property {string} all - 전체
 * @property {string} series0 - 시리즈 0 데이터
 * @property {string} series1 - 시리즈 1 데이터
 * @property {string} date - 날짜
 * @property {string} rate - 비율
 * @property {string} pvPerPerson - 1인당 페이지 뷰 수
 * @property {string} noLogin - 비로그인 사용자 수
 * @property {string} appAvgAllUser - 앱 평균 전체 사용자
 * @property {string} CCU - 동시 접속자 수
 * @property {string} iosPcu - iOS 피크 동시 접속자 수
 * @property {string} androidPcu - 안드로이드 피크 동시 접속자 수
 */
export type BiPopupDataKey =
  | "sum"           // 합계
  | "avgSum"        // 평균 합계
  | "series0Sum"    // 시리즈 0 합계 (예: iOS)
  | "series1Sum"    // 시리즈 1 합계 (예: Android)
  | "series0Avg"    // 시리즈 0 평균
  | "series1Avg"    // 시리즈 1 평균
  | "avgSeries0"    // 시리즈 0 평균 (별칭)
  | "avgSeries1"    // 시리즈 1 평균 (별칭)
  | "all"           // 전체
  | "series0"       // 시리즈 0
  | "series1"       // 시리즈 1
  | "date"          // 날짜
  | "rate"          // 비율
  | "pvPerPerson"   // 1인당 페이지 뷰 수
  | "noLogin"       // 비로그인 사용자 수
  | "appAvgAllUser" // 앱 평균 전체 사용자
  | "CCU"
  | "iosPcu"
  | "androidPcu";

/**
 * BI 팝업 필드 타입 정의
 * 각 필드는 UI에 표시될 항목의 메타데이터를 포함합니다.
 * 
 * @typedef {Object} BiPopupField
 * @property {string} titleKey - 다국어 지원을 위한 키 (i18n에서 사용)
 * @property {string} fallback - 다국어 키가 없을 때 사용할 기본 텍스트
 * @property {BiPopupDataKey} dataKey - 이 필드가 참조하는 데이터의 키
 */
type BiPopupField = {
  titleKey: string;
  fallback: string;
  dataKey: BiPopupDataKey;
};

/** 
 * 팝업 방향 타입 정의
 * @typedef {'left' | 'right'} PopupOrientation
 * @property {string} left - 왼쪽 정렬
 * @property {string} right - 오른쪽 정렬
 */
type PopupOrientation = "left" | "right";

/** 
 * 캘린더 모드 타입 정의
 * @typedef {'range' | 'ccu' | 'none'} PopupCalendarMode
 * @property {string} range - 날짜 범위 선택 가능
 * @property {string} ccu - CCU(동시 접속자) 전용 캘린더
 * @property {string} none - 캘린더 사용 안 함
 */
type PopupCalendarMode = "range" | "ccu" | "none";

/**
 * BI 팝업 변형 타입
 * @typedef {'standard' | 'log'} BiPopupVariant
 * @property {string} standard - 기본 팝업 스타일
 * @property {string} log - 로그 전용 스타일
 */
type BiPopupVariant = "standard" | "log";

/**
 * BI 팝업 목록 행 타입
 * 크래시/에러 목록 등에 사용되는 행 데이터 구조
 * 
 * @typedef {Object} BiPopupListRow
 * @property {number} rank - 순위
 * @property {number} count - 발생 횟수
 * @property {string} [causeName] - 원인 이름
 * @property {string} [causeBy] - 발생 원인
 * @property {string} [errorType] - 에러 유형
 * @property {number} [percent] - 비율(%)
 * @property {string} [message] - 에러 메시지
 */
export type BiPopupListRow = {
  rank: number;
  count: number;
  causeName?: string;
  causeBy?: string;
  errorType?: string;
  percent?: number;
  message?: string;
};

/**
 * BI 팝업 목록 조회 요청 파라미터 타입
 * 
 * @typedef {Object} BiPopupListRequest
 * @property {BiPopupMetricKey} metricKey - 조회할 메트릭 키
 * @property {number} applicationId - 애플리케이션 ID
 * @property {string} startDate - 시작 일자 (YYYY-MM-DD)
 * @property {string} endDate - 종료 일자 (YYYY-MM-DD)
 * @property {OsType} [osType] - OS 타입 (선택사항)
 */
export type BiPopupListRequest = {
  metricKey: BiPopupMetricKey;
  applicationId: number;
  startDate: string;
  endDate: string;
  osType?: OsType;
  tmzutc: number;
};

/**
 * BI 팝업 목록 컬럼 키 타입 (BiPopupListRow의 키들)
 * @typedef {keyof BiPopupListRow} BiPopupListColumnKey
 */
type BiPopupListColumnKey = keyof BiPopupListRow;

/**
 * BI 팝업 목록 컬럼 정의
 * 
 * @typedef {Object} BiPopupListColumn
 * @property {BiPopupListColumnKey} key - 컬럼에 표시할 데이터 키
 * @property {string} [titleKey] - 컬럼 제목 다국어 키
 * @property {string} fallback - 다국어 키가 없을 때 사용할 기본 제목
 * @property {'left' | 'right'} [align='left'] - 정렬 방향
 * @property {string} [width] - 컬럼 너비 (CSS 값)
 * @property {boolean} [sortable=false] - 정렬 가능 여부
 */
type BiPopupListColumn = {
  key: BiPopupListColumnKey;
  titleKey?: string;
  fallback: string;
  align?: "left" | "right";
  width?: string;
  sortable?: boolean;
};

/**
 * BI 팝업 목록 설정
 * 
 * @typedef {Object} BiPopupListConfig
 * @property {string} [titleKey] - 목록 제목 다국어 키
 * @property {string} fallbackTitle - 다국어 키가 없을 때 사용할 기본 제목
 * @property {string} [emptyTitleKey] - 데이터 없음 메시지 다국어 키
 * @property {string} [emptyFallback] - 데이터 없을 때 표시할 기본 메시지
 * @property {readonly BiPopupListColumn[]} columns - 컬럼 정의 배열
 */
type BiPopupListConfig = {
  titleKey?: string;
  fallbackTitle: string;
  emptyTitleKey?: string;
  emptyFallback?: string;
  columns: readonly BiPopupListColumn[];
};

/**
 * BI 차트 시리즈 타입
 * @property {string} dataKey - 데이터 키
 * @property {string} name - 시리즈 이름
 * @property {string} [color] - 시리즈 색상 (선택 사항)
 */
type BiPopupChartSeries = {
  dataKey: string;
  name: string;
  color?: string;
};

/**
 * BI 차트 데이터 페이로드 타입
 * @property {Array<Record<string, number | string>>} rows - 차트 행 데이터
 * @property {BiPopupChartSeries[]} series - 차트 시리즈 정의
 */
export type BiPopupChartPayload = {
  rows: Array<Record<string, number | string>>;
  series: BiPopupChartSeries[];
  valueFormatter?: (value: number) => string;
  renderAs?: "bar" | "line";
  xAxisType?: "category" | "number";
  aggregateOnAll?: boolean;
};

/**
 * BI 팝업 정의 타입
 * @property {BiPopupMetricKey} key - 메트릭 키
 * @property {string} titleKey - 제목 다국어 키
 * @property {string} fallbackTitle - 기본 제목
 * @property {readonly BiPopupField[]} totals - 요약 필드 배열
 * @property {readonly BiPopupField[]} summary - 상세 요약 필드 배열
 * @property {number} summaryColumns - 요약 영역 컬럼 수
 * @property {PopupOrientation} orientation - 팝업 방향 (왼쪽/오른쪽)
 * @property {"user" | "log"} icon - 아이콘 타입
 * @property {PopupCalendarMode} calendar - 캘린더 모드
 */
type BiPopupDefinition = {
  key: BiPopupMetricKey;
  titleKey: string;
  fallbackTitle: string;
  totals: readonly BiPopupField[];
  summary: readonly BiPopupField[];
  summaryColumns: number;
  orientation: PopupOrientation;
  icon: "user" | "log" | "error" | "crash";
  calendar: PopupCalendarMode;
  variant?: BiPopupVariant;
  listConfig?: BiPopupListConfig;
};

 /**
 * BI 팝업 값 레코드 타입
 * BI 데이터 키를 키로 하고, 숫자 또는 문자열을 값으로 하는 부분 레코드
 */
export type BiPopupValueRecord = Partial<Record<BiPopupDataKey, number | string>>;

/**
 * 날짜 범위 타입
 * @property {string | Date} from - 시작 일자
 * @property {string | Date} to - 종료 일자
 */
export type BiPopupRange = {
  from: string | Date;
  to: string | Date;
};

/**
 * BI 팝업 열기 상세 정보 타입
 * @property {BiPopupMetricKey} key - 메트릭 키
 * @property {BiPopupValueRecord} [totals] - 요약 데이터
 * @property {BiPopupValueRecord} [summary] - 상세 요약 데이터
 * @property {BiPopupRange} [range] - 날짜 범위
 * @property {string} [rangeLabel] - 범위 레이블
 * @property {string} [dateLabel] - 날짜 레이블
 * @property {BiPopupChartPayload} [chart] - 차트 데이터
 */
export type BiPopupOpenDetail = {
  key: BiPopupMetricKey;
  applicationId: number;
  totals?: BiPopupValueRecord;
  summary?: BiPopupValueRecord;
  range?: BiPopupRange;
  rangeLabel?: string;
  dateLabel?: string;
  chart?: BiPopupChartPayload;
  listRows?: BiPopupListRow[];
  listRequest?: BiPopupListRequest;
};

/**
 * BI 팝업 상태 타입
 * @property {BiPopupDefinition} definition - 팝업 정의
 * @property {Partial<Record<BiPopupDataKey, string>>} totals - 포맷된 요약 데이터
 * @property {Partial<Record<BiPopupDataKey, string>>} summary - 포맷된 상세 요약 데이터
 * @property {string} [rangeLabel] - 범위 레이블
 * @property {string} [dateLabel] - 날짜 레이블
 * @property {BiPopupChartPayload} [chart] - 차트 데이터
 */
type BiPopupState = {
  definition: BiPopupDefinition;
  totals: Partial<Record<BiPopupDataKey, string>>;
  summary: Partial<Record<BiPopupDataKey, string>>;
  range?: BiPopupRange;
  rangeLabel?: string;
  dateLabel?: string;
  chart?: BiPopupChartPayload;
  listRows?: BiPopupListRow[];
  listRequest?: BiPopupListRequest;
  applicationId: number;
};

/**
 * 전역 이벤트 타입 선언
 * - maxy:bi-popup-open: BI 팝업 열기 이벤트
 * - maxy:bi-popup-close: BI 팝업 닫기 이벤트
 */
declare global {
  interface WindowEventMap {
    "maxy:bi-popup-open": CustomEvent<BiPopupOpenDetail>;
    "maxy:bi-popup-close": CustomEvent<void>;
  }
}

/** 숫자 포맷터 (소수점 2자리까지 표시) */
const NUMBER_FORMATTER = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

/** 차트 시리즈 색상 배열 */
const CHART_COLORS = ["#544fc5", "#2caffe", "#ffab5f", "#7ad3ff"];

 const POPUP_DEFINITIONS: Record<BiPopupMetricKey, BiPopupDefinition> = {
   appInstallCount: {
     key: "appInstallCount",
     titleKey: "dashboard.bi.install",
     fallbackTitle: "Install",
     totals: [
       { titleKey: "dashboard.bi.installSum", fallback: "Total Installs", dataKey: "sum" },
       { titleKey: "common.text.avg", fallback: "Average", dataKey: "avgSum" },
       { titleKey: "iOS", fallback: "iOS", dataKey: "series0Sum" },
       { titleKey: "Android", fallback: "Android", dataKey: "series1Sum" },
     ],
     summary: [
       { titleKey: "dashboard.bi.datetime", fallback: "Date", dataKey: "date" },
       { titleKey: "dashboard.bi.installCount", fallback: "Install Count", dataKey: "all" },
       { titleKey: "iOS", fallback: "iOS", dataKey: "series0" },
       { titleKey: "Android", fallback: "Android", dataKey: "series1" },
     ],
     summaryColumns: 4,
     orientation: "right",
     icon: "user",
     calendar: "range",
   },
   appIosConnectCount: {
     key: "appIosConnectCount",
     titleKey: "OS (iOS)",
     fallbackTitle: "OS (iOS)",
     totals: [
       { titleKey: "dashboard.bi.all", fallback: "Total", dataKey: "sum" },
       { titleKey: "iOS", fallback: "iOS", dataKey: "series0Sum" },
     ],
     summary: [
       { titleKey: "dashboard.bi.datetime", fallback: "Date", dataKey: "date" },
       { titleKey: "dashboard.bi.all", fallback: "Total", dataKey: "all" },
       { titleKey: "iOS", fallback: "iOS", dataKey: "series0" },
     ],
     summaryColumns: 3,
     orientation: "right",
     icon: "user",
     calendar: "range",
   },
   appAndroidConnectCount: {
     key: "appAndroidConnectCount",
     titleKey: "OS (Android)",
     fallbackTitle: "OS (Android)",
     totals: [
     { titleKey: "dashboard.bi.all", fallback: "Total", dataKey: "sum" },
      { titleKey: "Android", fallback: "Android", dataKey: "series1Sum" },
    ],
     summary: [
       { titleKey: "dashboard.bi.datetime", fallback: "Date", dataKey: "date" },
       { titleKey: "dashboard.bi.all", fallback: "Total", dataKey: "all" },
       { titleKey: "Android", fallback: "Android", dataKey: "series1" },
     ],
     summaryColumns: 3,
     orientation: "right",
     icon: "user",
     calendar: "range",
   },
   appMauCount: {
     key: "appMauCount",
     titleKey: "dashboard.bi.mauFull",
     fallbackTitle: "Monthly Active Users",
     totals: [
       { titleKey: "dashboard.bi.all", fallback: "Total", dataKey: "sum" },
       { titleKey: "iOS", fallback: "iOS", dataKey: "series0Sum" },
       { titleKey: "dashboard.bi.iosDailyAvg", fallback: "iOS Daily Avg", dataKey: "series0Avg" },
       { titleKey: "Android", fallback: "Android", dataKey: "series1Sum" },
       { titleKey: "dashboard.bi.androidDailyAvg", fallback: "Android Daily Avg", dataKey: "series1Avg" },
     ],
     summary: [
       { titleKey: "dashboard.bi.datetime", fallback: "Date", dataKey: "date" },
       { titleKey: "dashboard.bi.all", fallback: "Total", dataKey: "all" },
       { titleKey: "iOS", fallback: "iOS", dataKey: "series0" },
       { titleKey: "Android", fallback: "Android", dataKey: "series1" },
     ],
     summaryColumns: 4,
     orientation: "right",
     icon: "user",
     calendar: "none",
   },
   appConnectCount: {
     key: "appConnectCount",
     titleKey: "dashboard.bi.dauFull",
     fallbackTitle: "Daily Active Users",
     totals: [
       { titleKey: "dashboard.bi.all", fallback: "Total", dataKey: "sum" },
       { titleKey: "iOS", fallback: "iOS", dataKey: "series0Sum" },
       { titleKey: "dashboard.bi.iosDailyAvg", fallback: "iOS Daily Avg", dataKey: "series0Avg" },
       { titleKey: "Android", fallback: "Android", dataKey: "series1Sum" },
       { titleKey: "dashboard.bi.androidDailyAvg", fallback: "Android Daily Avg", dataKey: "series1Avg" },
     ],
     summary: [
       { titleKey: "dashboard.bi.datetime", fallback: "Date", dataKey: "date" },
       { titleKey: "dashboard.bi.all", fallback: "Total", dataKey: "all" },
       { titleKey: "iOS", fallback: "iOS", dataKey: "series0" },
       { titleKey: "Android", fallback: "Android", dataKey: "series1" },
     ],
    summaryColumns: 4,
    orientation: "right",
    icon: "user",
    calendar: "range",
  },
  appCcuCount: {
    key: "appCcuCount",
    titleKey: "dashboard.bi.ccu",
    fallbackTitle: "Concurrent Users",
    totals: [
      { titleKey: "dashboard.bi.peakTotal", fallback: "Peak Total", dataKey: "sum" },
      { titleKey: "iOS", fallback: "iOS Peak", dataKey: "series0Sum" },
      { titleKey: "Android", fallback: "Android Peak", dataKey: "series1Sum" },
    ],
    summary: [
      { titleKey: "dashboard.bi.datetime", fallback: "일시", dataKey: "date" },
      { titleKey: "dashboard.bi.ccu", fallback: "동시 접속", dataKey: "CCU" },
      { titleKey: "iOS", fallback: "iOS", dataKey: "series0" },
      { titleKey: "Android", fallback: "Android", dataKey: "series1" },
      { titleKey: "dashboard.bi.iosPcu", fallback: "PCU (iOS)", dataKey: "iosPcu" },
      { titleKey: "dashboard.bi.androidPcu", fallback: "PCU (Android)", dataKey: "androidPcu" },
    ],
    summaryColumns: 6,
    orientation: "left",
    icon: "user",
    calendar: "ccu",
  },
  appUseCount: {
    key: "appUseCount",
    titleKey: "dashboard.bi.pageview",
     fallbackTitle: "Page Views",
     totals: [
       { titleKey: "dashboard.bi.pvSum", fallback: "Total PV", dataKey: "sum" },
       { titleKey: "dashboard.bi.dailyAvg", fallback: "Daily Avg", dataKey: "avgSeries0" },
       { titleKey: "dashboard.bi.viewerSum", fallback: "Viewers", dataKey: "series1Sum" },
       { titleKey: "dashboard.bi.pvPer", fallback: "PV per User", dataKey: "series0Avg" },
     ],
     summary: [
       { titleKey: "dashboard.bi.datetime", fallback: "Date", dataKey: "date" },
       { titleKey: "PV", fallback: "PV", dataKey: "series0" },
       { titleKey: "Viewer", fallback: "Viewer", dataKey: "series1" },
       { titleKey: "dashboard.bi.pvPer", fallback: "PV per User", dataKey: "pvPerPerson" },
     ],
     summaryColumns: 4,
     orientation: "right",
     icon: "user",
     calendar: "range",
   },
   appReconnectCount: {
     key: "appReconnectCount",
     titleKey: "dashboard.bi.returnVisit",
     fallbackTitle: "Return Visits",
     totals: [
       { titleKey: "dashboard.bi.alluser", fallback: "All Users", dataKey: "sum" },
       { titleKey: "dashboard.bi.dailyAvg", fallback: "Daily Avg", dataKey: "avgSeries1" },
       { titleKey: "dashboard.bi.reconnect", fallback: "Reconnect", dataKey: "series1Sum" },
       { titleKey: "dashboard.bi.revisitRate", fallback: "Revisit Rate", dataKey: "series0Avg" },
     ],
     summary: [
       { titleKey: "dashboard.bi.datetime", fallback: "Date", dataKey: "date" },
       { titleKey: "dashboard.bi.appConnectCount", fallback: "Connections", dataKey: "series0" },
       { titleKey: "dashboard.bi.reconnect", fallback: "Reconnect", dataKey: "series1" },
       { titleKey: "dashboard.bi.revisitRate", fallback: "Revisit Rate", dataKey: "rate" },
     ],
     summaryColumns: 4,
     orientation: "left",
     icon: "user",
     calendar: "range",
   },
   appSleepUserCount: {
     key: "appSleepUserCount",
     titleKey: "dashboard.bi.sleep",
     fallbackTitle: "Dormant Users",
     totals: [
       { titleKey: "dashboard.bi.alluser", fallback: "All Users", dataKey: "sum" },
       { titleKey: "dashboard.bi.dailyAvg", fallback: "Daily Avg", dataKey: "avgSeries1" },
       { titleKey: "dashboard.bi.sleep", fallback: "Dormant Users", dataKey: "series1Sum" },
       { titleKey: "dashboard.bi.sleepRate", fallback: "Dormant Rate", dataKey: "series0Avg" },
     ],
     summary: [
       { titleKey: "dashboard.bi.datetime", fallback: "Date", dataKey: "date" },
       { titleKey: "dashboard.bi.appConnectCount", fallback: "Connections", dataKey: "series0" },
       { titleKey: "dashboard.bi.sleep", fallback: "Dormant Users", dataKey: "series1" },
       { titleKey: "dashboard.bi.sleepRate", fallback: "Dormant Rate", dataKey: "rate" },
     ],
     summaryColumns: 4,
     orientation: "left",
     icon: "user",
     calendar: "range",
   },
   appLoginUserCount: {
     key: "appLoginUserCount",
     titleKey: "dashboard.bi.login",
     fallbackTitle: "Logins",
     totals: [
       { titleKey: "dashboard.bi.alluser", fallback: "All Users", dataKey: "sum" },
       { titleKey: "dashboard.bi.dailyAvg", fallback: "Daily Avg", dataKey: "series1Avg" },
       { titleKey: "dashboard.bi.login", fallback: "Logins", dataKey: "series1Sum" },
       { titleKey: "dashboard.bi.loginRate", fallback: "Login Rate", dataKey: "series0Avg" },
     ],
     summary: [
       { titleKey: "dashboard.bi.datetime", fallback: "Date", dataKey: "date" },
       { titleKey: "dashboard.bi.appConnectCount", fallback: "Connections", dataKey: "series0" },
       { titleKey: "dashboard.bi.login", fallback: "Logins", dataKey: "series1" },
       { titleKey: "dashboard.bi.loginRate", fallback: "Login Rate", dataKey: "rate" },
       { titleKey: "dashboard.bi.noLogin", fallback: "No Login", dataKey: "noLogin" },
     ],
     summaryColumns: 5,
     orientation: "left",
     icon: "user",
     calendar: "range",
   },
   appAvgUseTime: {
     key: "appAvgUseTime",
     titleKey: "dashboard.bi.staytime",
     fallbackTitle: "Stay Time",
     totals: [
       { titleKey: "dashboard.bi.alluser", fallback: "All Users", dataKey: "sum" },
       { titleKey: "dashboard.bi.dailyAvg", fallback: "Daily Avg", dataKey: "series1Avg" },
       { titleKey: "common.text.stay", fallback: "Stay", dataKey: "series1Sum" },
     ],
     summary: [
       { titleKey: "dashboard.bi.datetime", fallback: "Date", dataKey: "date" },
       { titleKey: "dashboard.bi.appConnectCount", fallback: "Connections", dataKey: "appAvgAllUser" },
       { titleKey: "dashboard.bi.staytime", fallback: "Stay Time", dataKey: "series0" },
     ],
     summaryColumns: 3,
     orientation: "left",
     icon: "user",
     calendar: "range",
   },
   appLogCount: {
     key: "appLogCount",
     titleKey: "dashboard.bi.log",
     fallbackTitle: "Log",
     totals: [
       { titleKey: "dashboard.bi.logCollection", fallback: "Log Collection", dataKey: "sum" },
       { titleKey: "dashboard.bi.dailyAvg", fallback: "Daily Avg", dataKey: "series0Avg" },
     ],
     summary: [
       { titleKey: "dashboard.bi.datetime", fallback: "Date", dataKey: "date" },
       { titleKey: "dashboard.bi.logCollection", fallback: "Log Collection", dataKey: "series0" },
     ],
     summaryColumns: 2,
     orientation: "left",
   icon: "log",
    calendar: "range",
  },
  appErrorCount: {
    key: "appErrorCount",
    titleKey: "dashboard.bi.error",
    fallbackTitle: "Error",
    totals: [
      { titleKey: "dashboard.bi.all", fallback: "Total", dataKey: "sum" },
      { titleKey: "common.text.avg", fallback: "Average", dataKey: "avgSum" },
    ],
    summary: [] as const,
    summaryColumns: 0,
    orientation: "left",
    icon: "error",
    calendar: "range",
    variant: "log",
    listConfig: {
      fallbackTitle: "",
      emptyFallback: "No error data available.",
      columns: [
        { key: "count", fallback: "Count", align: "right", width: "5rem" },
        { key: "errorType", fallback: "Error Type", width: "minmax(0, 1fr)" },
        { key: "percent", fallback: "Rate", align: "right", width: "4rem" },
      ],
    },
  },
  appCrashCount: {
    key: "appCrashCount",
    titleKey: "dashboard.bi.crash",
    fallbackTitle: "Crash",
     totals: [
       { titleKey: "dashboard.bi.all", fallback: "Total", dataKey: "sum" },
       { titleKey: "common.text.avg", fallback: "Average", dataKey: "avgSum" },
     ],
     summary: [] as const,
     summaryColumns: 0,
     orientation: "left",
     icon: "crash",
     calendar: "range",
     variant: "log",
     listConfig: {
        fallbackTitle: "",
        emptyFallback: "No crash data available.",
        columns: [
          { key: "count", fallback: "Count", align: "right", width: "5rem" },
          { key: "causeName", fallback: "Caused Name", width: "12rem" },
          { key: "causeBy", fallback: "Caused By", width: "minmax(0, 1fr)" },
          { key: "percent", fallback: "Rate", align: "right", width: "4rem" },
        ],
      },
   },
 };

/**
 * BI 팝업을 열기 위한 이벤트를 발송합니다.
 * @param {BiPopupOpenDetail} detail - 팝업에 표시할 상세 정보
 */
export function dispatchOpenBiPopup(detail: BiPopupOpenDetail) {
  if (typeof window === "undefined") {
    return;
  }
  const event = new CustomEvent<BiPopupOpenDetail>("maxy:bi-popup-open", {
    detail,
  });
  window.dispatchEvent(event);
}

/**
 * BI 팝업을 닫기 위한 이벤트를 발송합니다.
 */
export function dispatchCloseBiPopup() {
  if (typeof window === "undefined") {
    return;
  }
  const event = new CustomEvent<void>("maxy:bi-popup-close");
  window.dispatchEvent(event);
}

/**
 * 값이 Date 객체인지 확인합니다.
 * @param {unknown} value - 확인할 값
 * @returns {value is Date} Date 객체 여부
 */
function isDateLike(value: unknown): value is Date {
  return (
    typeof value === "object" &&
    value !== null &&
    "toISOString" in value &&
    typeof (value as { toISOString?: unknown }).toISOString === "function"
  );
}

/**
 * 값을 정규화하여 문자열로 변환합니다.
 * - Date 객체: YYYY-MM-DD 형식의 문자열로 변환
 * - 숫자: 1,000.00 형식의 문자열로 변환 (유효하지 않은 숫자는 "-" 반환)
 * - 문자열: 그대로 반환
 * - 기타: "-" 반환
 * 
 * @param {number | string | Date} value - 변환할 값
 * @returns {string} 변환된 문자열
 */
function normaliseValue(value: number | string | Date): string {
  if (isDateLike(value)) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return "-";
    }
    return NUMBER_FORMATTER.format(value);
  }
  if (typeof value === "string") {
    return value;
  }
  return "-";
}

/**
 * BI 값 레코드를 정규화합니다.
 * - undefined나 null인 값은 제외
 * - Date, number, string 타입의 값만 처리
 * 
 * @param {BiPopupValueRecord} [record] - 정규화할 레코드
 * @returns {Partial<Record<BiPopupDataKey, string>>} 정규화된 레코드
 */
function normaliseRecord(record?: BiPopupValueRecord): Partial<Record<BiPopupDataKey, string>> {
  if (!record) {
    return {};
  }

  const result: Partial<Record<BiPopupDataKey, string>> = {};

  for (const key in record) {
    const typedKey = key as BiPopupDataKey;
    const value = record[typedKey];
    if (value === undefined || value === null) {
      continue;
    }
    if (isDateLike(value)) {
      result[typedKey] = normaliseValue(value);
    } else if (typeof value === "number" || typeof value === "string") {
      result[typedKey] = normaliseValue(value);
    }
  }

  return result;
}

function formatYAxisNumber(value: number, chart: BiPopupChartPayload): string {
  if (chart.valueFormatter && chart.valueFormatter.name === "stayValueFormatter") {
    return formatStayAxis(value);
  }
  return formatChartNumber(value, chart.valueFormatter);
}

function formatStayAxis(value: number): string {
  if (!Number.isFinite(value)) {
    return "-";
  }
  const abs = Math.abs(value);
  if (abs >= 3600) {
    return `${Math.round(value / 3600)}h`;
  }
  if (abs >= 60) {
    return `${Math.round(value / 60)}m`;
  }
  return `${Math.round(value)}s`;
}

/**
 * 날짜 범위를 'YYYY-MM-DD ~ YYYY-MM-DD' 형식의 문자열로 변환합니다.
 * 
 * @param {BiPopupRange} [range] - 날짜 범위
 * @returns {string | undefined} 포맷된 날짜 범위 문자열 또는 undefined
 */
function formatRangeLabel(range?: BiPopupRange): string | undefined {
  if (!range) {
    return undefined;
  }

  const from = formatRangeEndpoint(range.from);
  const to = formatRangeEndpoint(range.to);

  if (!from && !to) {
    return undefined;
  }
  if (from && to) {
    return `${from} ~ ${to}`;
  }
  return from ?? to ?? undefined;
}

/**
 * 날짜 범위의 끝점을 'YYYY-MM-DD' 형식의 문자열로 변환합니다.
 * 
 * @param {string | Date} value - 변환할 날짜 값
 * @returns {string | undefined} 포맷된 날짜 문자열 또는 undefined
 */
function formatRangeEndpoint(value: string | Date): string | undefined {
  if (isDateLike(value)) {
    return formatDateISO(value);
  }
  if (typeof value === "string" && value.trim() !== "") {
    // 가능한 경우 날짜 부분만 유지
    return value.length > 10 ? value.slice(0, 10) : value;
  }
  return undefined;
}

type OsFilter = "all" | "android" | "ios";

type MaxyBiPopupWrapProps = {
  osType?: string;
};

const IOS_LABEL_REGEX = /\bios\b/i;
const ANDROID_LABEL_REGEX = /\bandroid\b/i;
const SUMMARY_FALLBACK_KEYS: Partial<Record<BiPopupDataKey, string[]>> = {
  all: ["total"],
};

function normaliseOsType(osType?: string): OsFilter {
  if (typeof osType !== "string") {
    return "all";
  }
  const trimmed = osType.trim().toLowerCase();
  if (trimmed === "android") {
    return "android";
  }
  if (trimmed === "ios" || trimmed === "i") {
    return "ios";
  }
  return "all";
}

function getFieldOsAffinity(field: BiPopupField): Exclude<OsFilter, "all"> | null {
  const label = `${field.titleKey ?? ""} ${field.fallback ?? ""}`;
  if (ANDROID_LABEL_REGEX.test(label)) {
    return "android";
  }
  if (IOS_LABEL_REGEX.test(label)) {
    return "ios";
  }
  return null;
}

function filterFieldsByOsType(
  fields: readonly BiPopupField[],
  osFilter: OsFilter,
): BiPopupField[] {
  if (osFilter === "all") {
    return Array.from(fields);
  }
  return fields.filter((field) => {
    const affinity = getFieldOsAffinity(field);
    if (!affinity) {
      return true;
    }
    return affinity === osFilter;
  });
}

function seriesMatchesOs(seriesName: string, osFilter: OsFilter): boolean {
  if (osFilter === "all") {
    return true;
  }
  if (osFilter === "android") {
    return ANDROID_LABEL_REGEX.test(seriesName);
  }
  if (osFilter === "ios") {
    return IOS_LABEL_REGEX.test(seriesName);
  }
  return false;
}

function coerceNumeric(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function formatCcuShare(value: number, total: number): string {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;
  return `${normaliseValue(value)} (${percent}%)`;
}

function filterChartByOsType(
  chart: BiPopupChartPayload | undefined,
  osFilter: OsFilter,
): BiPopupChartPayload | undefined {
  if (!chart) {
    return chart;
  }

  if (osFilter === "all") {
    if (chart.aggregateOnAll === false) {
      return chart;
    }
    const totalSeries = chart.series.find((series) => series.dataKey === "total");
    if (!totalSeries) {
      return chart;
    }
    const toNumber = (value: unknown): number => {
      if (typeof value === "number") {
        return Number.isFinite(value) ? value : 0;
      }
      if (typeof value === "string") {
        const parsed = Number(value.replace(/,/g, ""));
        return Number.isFinite(parsed) ? parsed : 0;
      }
      return 0;
    };
    const rows = chart.rows.map((row) => {
      const totalValue = row.total !== undefined ? toNumber(row.total) : toNumber(row.ios) + toNumber(row.android);
      return {
        date: row.date,
        total: totalValue,
      };
    });

    return {
      ...chart,
      rows,
      series: [totalSeries],
    };
  }

  const filteredSeries = chart.series.filter((series) => seriesMatchesOs(series.name, osFilter));
  if (filteredSeries.length === 0) {
    return chart;
  }

  return {
    ...chart,
    series: filteredSeries,
  };
}

function resolveIconClass(icon: BiPopupDefinition["icon"]): string {
  switch (icon) {
    case "log":
      return "icon_log";
    case "error":
      return "icon_error";
    case "crash":
      return "icon_crash";
    default:
      return "icon_user";
  }
}

type SelectedSummaryState = {
  filter: OsFilter;
  values: Partial<Record<BiPopupDataKey, string>>;
};

function deriveSummaryFromRow(
  row: Record<string, number | string>,
  fields: readonly BiPopupField[],
): Partial<Record<BiPopupDataKey, string>> {
  const next: Partial<Record<BiPopupDataKey, string>> = {};
  fields.forEach((field) => {
    let value: string | number | undefined = row[field.dataKey];
    if (value === undefined) {
      const fallbacks = SUMMARY_FALLBACK_KEYS[field.dataKey];
      if (fallbacks) {
        for (const fallbackKey of fallbacks) {
          if (fallbackKey in row) {
            value = row[fallbackKey];
            break;
          }
        }
      }
    }
    if (value === undefined || value === null) {
      return;
    }
    if (typeof value === "number" || typeof value === "string") {
      next[field.dataKey] = normaliseValue(value);
      return;
    }
    if (isDateLike(value)) {
      next[field.dataKey] = normaliseValue(value);
    }
  });
  return next;
}

/**
 * BI 팝업 래퍼 컴포넌트
 * BI 지표에 대한 상세 정보를 표시하는 팝업을 관리합니다.
 * 
 * @returns {JSX.Element} BI 팝업 컴포넌트
 */
/**
 * BI 팝업 래퍼 컴포넌트
 * BI 지표에 대한 상세 정보를 표시하는 팝업을 관리합니다.
 * 
 * @param {Object} props - 컴포넌트 프로퍼티
 * @param {string} [props.osType='A'] - OS 필터 타입 (A: 전체, I: iOS, A: Android)
 * @returns {JSX.Element} BI 팝업 컴포넌트
 */
export default function MaxyBiPopupWrap({ osType = "A" }: MaxyBiPopupWrapProps = {}) {
  const { tmzutc } = useUserSettings();
  // 팝업 상태 관리
  const [popupState, setPopupState] = useState<BiPopupState | null>(null);
  
  // 선택된 요약 정보 상태
  const [selectedSummary, setSelectedSummary] = useState<SelectedSummaryState | null>(null);
  
  // 목록에서 선택된 항목의 인덱스
  const [selectedListIndex, setSelectedListIndex] = useState<number | null>(null);
  
  // 목록에서 선택된 항목의 메시지
  const [selectedListMessage, setSelectedListMessage] = useState<string>("");
  
  // 목록 정렬 상태 (정렬 키와 방향)
  const [listSort, setListSort] = useState<{ 
    key: BiPopupListColumnKey | null; 
    direction: "asc" | "desc" 
  }>({
    key: null,        // 현재 정렬 기준 컬럼 키
    direction: "asc"  // 정렬 방향 (오름차순/내림차순)
  });
  
  // 목록 로딩 상태
  const [isListLoading, setIsListLoading] = useState(false);
  
  // 목록 로드 에러 메시지
  const [listLoadError, setListLoadError] = useState<string | null>(null);
  
  // 팝업 닫기 애니메이션 상태
  const [isClosing, setIsClosing] = useState(false);
  
  // 팝업 진입 애니메이션 상태
  const [isEntering, setIsEntering] = useState(false);
  
  // 팝업 DOM 요소 참조
  const popupRef = useRef<HTMLDivElement | null>(null);
  
  // 팝업 자동 닫기 타이머 참조
  const closeTimerRef = useRef<number | null>(null);
  
  // 현재 팝업 상태 참조 (최신 상태 유지를 위한 ref)
  const popupStateRef = useRef<BiPopupState | null>(null);
  
  // 팝업 닫기 진행 중 여부 (ref로 관리하여 클로저 문제 방지)
  const isClosingRef = useRef(false);
  
  // 마지막으로 불러온 목록의 고유 키 (중복 요청 방지용)
  const lastFetchedListKeyRef = useRef<string | null>(null);
  
  // 마지막으로 선택된 날짜 (날짜 기반 목록 조회 시 사용)
  const lastSelectedDateRef = useRef<string | null>(null);
  
  // 목록 조회 요청 취소를 위한 AbortController
  const listRequestAbortRef = useRef<AbortController | null>(null);
  // 캘린더 관련 상태
  const [isCalendarOpen, setIsCalendarOpen] = useState(false); // 캘린더 표시 여부
  
  // 선택된 날짜 범위 상태
  const [calendarRange, setCalendarRange] = useState<{ 
    startDate: string; 
    endDate: string 
  } | null>(null);
  
  // 캘린더 유효성 검사 에러 메시지
  const [calendarError, setCalendarError] = useState<string | null>(null);
  
  // 날짜 범위 적용 중 상태 (로딩 상태)
  const [isApplyingRange, setIsApplyingRange] = useState(false);
  
  // 캘린더에 현재 표시 중인 월
  const [displayedMonth, setDisplayedMonth] = useState<Date>(new Date());
  
  // 캘린더 팝오버 DOM 참조
  const calendarPopoverRef = useRef<HTMLDivElement | null>(null);
  
  // 캘린더 버튼 DOM 참조
  const calendarButtonRef = useRef<HTMLButtonElement | null>(null);
  
  // OS 필터 타입 정규화 (A: 전체, I: iOS, A: Android)
  const osFilter = normaliseOsType(osType);

  useEffect(() => {
    if (!isCalendarOpen) {
      return;
    }
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        calendarPopoverRef.current &&
        !calendarPopoverRef.current.contains(target) &&
        !calendarButtonRef.current?.contains(target)
      ) {
        setIsCalendarOpen(false);
        setCalendarError(null);
        setCalendarRange(null);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsCalendarOpen(false);
        setCalendarError(null);
        setCalendarRange(null);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isCalendarOpen]);

  const resetLogListState = useCallback(() => {
    listRequestAbortRef.current?.abort();
    listRequestAbortRef.current = null;
    setIsListLoading(false);
    setListLoadError(null);
    lastFetchedListKeyRef.current = null;
    lastSelectedDateRef.current = null;
    setSelectedListIndex(null);
    setSelectedListMessage("");
    setIsCalendarOpen(false);
    setCalendarError(null);
    setIsApplyingRange(false);
    setCalendarRange(null);
    setDisplayedMonth(new Date());
  }, []);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current !== null && typeof window !== "undefined") {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const startCloseAnimation = useCallback(() => {
    if (!popupStateRef.current) {
      setPopupState(null);
      setIsClosing(false);
      setIsEntering(false);
      setSelectedSummary(null);
      resetLogListState();
      clearCloseTimer();
      return false;
    }

    if (isClosingRef.current) {
      return false;
    }

    clearCloseTimer();
    setIsClosing(true);
    setIsEntering(false);

    if (typeof window !== "undefined") {
      closeTimerRef.current = window.setTimeout(() => {
        setPopupState(null);
        setIsClosing(false);
        setIsEntering(false);
        setSelectedSummary(null);
        resetLogListState();
        closeTimerRef.current = null;
      }, 700);
    } else {
      setPopupState(null);
      setIsClosing(false);
      setIsEntering(false);
      setSelectedSummary(null);
      resetLogListState();
    }

    return true;
  }, [clearCloseTimer, resetLogListState]);

  useEffect(() => {
    popupStateRef.current = popupState;
  }, [popupState]);

  useEffect(() => {
    isClosingRef.current = isClosing;
  }, [isClosing]);

  useEffect(() => {
    return () => {
      listRequestAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!popupState || isClosing || typeof window === "undefined") {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      setIsEntering(true);
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [popupState, isClosing]);

   useEffect(() => {
     if (typeof window === "undefined") {
       return;
     }

     const handleOpen = (event: Event) => {
       const customEvent = event as CustomEvent<BiPopupOpenDetail>;
       const detail = customEvent.detail;
       if (!detail) {
         return;
       }

       listRequestAbortRef.current?.abort();
       listRequestAbortRef.current = null;
       setIsListLoading(false);
       setListLoadError(null);
       lastFetchedListKeyRef.current = null;
       lastSelectedDateRef.current = null;

       const definition = POPUP_DEFINITIONS[detail.key];
       if (!definition) {
         console.warn("[MaxyBiPopupWrap] Unknown popup key:", detail.key);
         return;
       }

      const rangeLabel = detail.rangeLabel ?? formatRangeLabel(detail.range);
      const dateLabel = detail.dateLabel ?? rangeLabel;
      const calendarBase = detail.range
        ? formatRangeEndpoint(detail.range.from ?? detail.range.to ?? "")
        : undefined;
      setDisplayedMonth(isoStringToDate(calendarBase) ?? new Date());
      setCalendarRange(null);

      if (definition.variant === "log" && detail.listRows && detail.listRows.length > 0) {
        setSelectedListIndex(0);
        setSelectedListMessage(detail.listRows[0]?.message ?? "");
        setListSort({ key: "count", direction: "desc" });
      } else {
        setSelectedListIndex(null);
        setSelectedListMessage("");
        setListSort({ key: null, direction: "asc" });
      }

      clearCloseTimer();
      setIsClosing(false);
      setIsEntering(false);
      setSelectedSummary(null);
      setIsCalendarOpen(false);
      setCalendarError(null);
      setIsApplyingRange(false);
      setCalendarRange(null);
      setPopupState({
        definition,
        totals: normaliseRecord(detail.totals),
        summary: normaliseRecord(detail.summary),
        range: detail.range,
        rangeLabel,
        dateLabel,
        chart: detail.chart,
        listRows: detail.listRows,
        listRequest: detail.listRequest,
        applicationId: detail.applicationId,
      });
     };

    const handleClose = () => {
      const didStartAnimation = startCloseAnimation();
      if (!didStartAnimation) {
        clearCloseTimer();
        setPopupState(null);
        setIsClosing(false);
        setIsEntering(false);
        setSelectedSummary(null);
        resetLogListState();
      }
    };

     window.addEventListener("maxy:bi-popup-open", handleOpen as EventListener);
     window.addEventListener("maxy:bi-popup-close", handleClose);

    return () => {
      window.removeEventListener("maxy:bi-popup-open", handleOpen as EventListener);
      window.removeEventListener("maxy:bi-popup-close", handleClose);
      clearCloseTimer();
    };
  }, [clearCloseTimer, resetLogListState, startCloseAnimation]);

  const closePopup = useCallback(
    (event?: ReactMouseEvent) => {
      event?.preventDefault();
      const didStart = startCloseAnimation();
      if (didStart) {
        dispatchCloseBiPopup();
      }
    },
    [startCloseAnimation],
  );

  const handleCalendarClick = useCallback(() => {
    if (!popupState || isClosing) {
      return;
    }
    setCalendarError(null);
    if (isCalendarOpen) {
      setIsCalendarOpen(false);
      setCalendarRange(null);
      return;
    }
    const rangeFromState = popupState.range;
    const defaultStart =
      calendarRange?.startDate ??
      (rangeFromState ? formatRangeEndpoint(rangeFromState.from) : undefined) ??
      new Date().toISOString().slice(0, 10);
    const defaultEnd =
      calendarRange?.endDate ??
      (rangeFromState ? formatRangeEndpoint(rangeFromState.to) : undefined) ??
      defaultStart;
    setCalendarRange({ startDate: defaultStart, endDate: defaultEnd });
    setDisplayedMonth(isoStringToDate(defaultStart) ?? new Date());
    setIsCalendarOpen(true);
  }, [calendarRange, isCalendarOpen, isClosing, popupState]);

  const handleCalendarDateSelect = useCallback((date: Date) => {
    const iso = formatDateISO(date);
    setCalendarRange((prev) => {
      if (!prev || !prev.startDate) {
        return { startDate: iso, endDate: iso };
      }
      const start = prev.startDate;
      const end = prev.endDate ?? prev.startDate;

      if (prev.endDate) {
        if (iso < start) {
          return { startDate: iso, endDate: end };
        }
        if (iso > end) {
          return { startDate: start, endDate: iso };
        }
        return { startDate: iso, endDate: iso };
      }

      if (iso < start) {
        return { startDate: iso, endDate: start };
      }
      if (iso > start) {
        return { startDate: start, endDate: iso };
      }
      return { startDate: iso, endDate: iso };
    });
    setCalendarError(null);
    setDisplayedMonth(new Date(date.getFullYear(), date.getMonth(), 1));
  }, []);

  const handleCalendarCancel = useCallback(() => {
    setIsCalendarOpen(false);
    setCalendarError(null);
    setCalendarRange(null);
    setDisplayedMonth(new Date());
  }, []);

  const handleApplyRange = useCallback(async () => {
    if (!popupState || !calendarRange) {
      return;
    }
    const { startDate, endDate } = calendarRange;
    if (!startDate || !endDate) {
      setCalendarError("Select both start and end dates.");
      return;
    }
    if (startDate > endDate) {
      setCalendarError("Start date must be before end date.");
      return;
    }
    setIsApplyingRange(true);
    try {
      const detail = await loadBiPopupData({
        metricKey: popupState.definition.key,
        applicationId: popupState.applicationId,
        osType: osFilter,
        rangeOverride: { startDate, endDate },
        tmzutc,
      });
      setCalendarRange({ startDate, endDate });
      setIsCalendarOpen(false);
      setDisplayedMonth(isoStringToDate(endDate) ?? new Date());
      dispatchOpenBiPopup(detail);
    } catch (error) {
      console.error("[MaxyBiPopupWrap] Failed to apply range:", error);
      setCalendarError("Failed to apply range. Please try again.");
    } finally {
      setIsApplyingRange(false);
    }
  }, [calendarRange, osFilter, popupState, tmzutc]);

  const handleBackdropMouseDown = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (!popupState || isClosing) {
        return;
      }
      if (popupRef.current?.contains(event.target as Node)) {
        return;
      }
      closePopup(event);
    },
    [popupState, isClosing, closePopup],
  );

  const definition = popupState?.definition;
  const totals = popupState?.totals ?? {};
  const summary = popupState?.summary ?? {};
  const rangeLabel = popupState?.rangeLabel;
  const dateLabel = popupState?.dateLabel;
  const chart = popupState?.chart;
  const variant = definition?.variant ?? "standard";
  const isCcuPopup = definition?.key === "appCcuCount";

  const displayedTotals = useMemo(
    () => (definition ? filterFieldsByOsType(definition.totals, osFilter) : []),
    [definition, osFilter],
  );
  const displayedSummary = useMemo(() => {
    if (!definition) {
      return [];
    }
    if (definition.key === "appCcuCount") {
      return definition.summary;
    }
    return filterFieldsByOsType(definition.summary, osFilter);
  }, [definition, osFilter]);
  const summaryColumnCount = displayedSummary.length > 0 ? displayedSummary.length : 1;
  const filteredChart = filterChartByOsType(chart, osFilter);
  const selectedSummaryValues =
    selectedSummary && selectedSummary.filter === osFilter ? selectedSummary.values : null;
  const summaryData = isCcuPopup
    ? { ...summary, ...(selectedSummaryValues ?? {}) }
    : selectedSummaryValues ?? summary;
  const listRows = popupState?.listRows ?? [];
  const sortedRows = useMemo(() => {
    if (!listSort.key) {
      return listRows;
    }
    const key = listSort.key;
    const directionFactor = listSort.direction === "asc" ? 1 : -1;
    return [...listRows].sort((a, b) => {
      const aValue = a[key];
      const bValue = b[key];
      if (typeof aValue === "number" && typeof bValue === "number") {
        return (aValue - bValue) * directionFactor;
      }
      const aText = aValue === undefined || aValue === null ? "" : String(aValue).toLowerCase();
      const bText = bValue === undefined || bValue === null ? "" : String(bValue).toLowerCase();
      if (aText === bText) {
        return 0;
      }
      return (aText > bText ? 1 : -1) * directionFactor;
    });
  }, [listRows, listSort]);
  const handleListRowSelect = useCallback((row: BiPopupListRow, index: number) => {
    setSelectedListIndex(index);
    setSelectedListMessage(row.message ?? "");
  }, []);

  const handleColumnSort = useCallback(
    (columnKey: BiPopupListColumnKey) => {
      setListSort((prev) => {
        if (prev.key === columnKey) {
          return { key: columnKey, direction: prev.direction === "asc" ? "desc" : "asc" };
        }
        const sampleRow = listRows.find((row) => row[columnKey] !== undefined);
        const defaultDirection = typeof sampleRow?.[columnKey] === "number" ? "desc" : "asc";
        return { key: columnKey, direction: defaultDirection };
      });
    },
    [listRows],
  );

  const fetchLogListForDate = useCallback(
    async (date: string) => {
      const trimmedDate = date.trim();
      if (!trimmedDate) {
        return;
      }

      const state = popupStateRef.current;
      if (!state) {
        return;
      }
      const metricKey = state.definition.key;
      if (metricKey !== "appCrashCount" && metricKey !== "appErrorCount") {
        return;
      }

      const requestContext = state.listRequest;
      if (!requestContext) {
        return;
      }

      const requestKey = `${trimmedDate}::${osFilter}::${requestContext.metricKey}`;
      if (listRequestAbortRef.current && lastFetchedListKeyRef.current === requestKey) {
        return;
      }

      listRequestAbortRef.current?.abort();
      const controller = new AbortController();
      listRequestAbortRef.current = controller;
      setIsListLoading(true);
      setListLoadError(null);
      lastFetchedListKeyRef.current = requestKey;

      try {
        const targetOs: OsType = (requestContext.osType ?? osFilter) as OsType;
        const fetcher = requestContext.metricKey === "appErrorCount" ? apiBIDetailErrorTop10 : apiBIDetailCrashTop10;
        const response = await fetcher(
          {
            applicationId: requestContext.applicationId,
            startDate: trimmedDate,
            endDate: trimmedDate,
            osType: targetOs,
            tmzutc: requestContext.tmzutc,
          },
          { signal: controller.signal },
        );

        if (response.code !== 200) {
          throw new Error(response.message ?? "Failed to load list.");
        }

        const rows = buildLogListRowsFromResponse(response, requestContext.metricKey);
        setPopupState((prev) => {
          if (!prev || prev.definition.key !== metricKey) {
            return prev;
          }
          return {
            ...prev,
            listRows: rows,
            listRequest: {
              ...requestContext,
              startDate: trimmedDate,
              endDate: trimmedDate,
              osType: targetOs,
            },
          };
        });

        if (rows.length > 0) {
          setSelectedListIndex(0);
          setSelectedListMessage(rows[0]?.message ?? "");
        } else {
          setSelectedListIndex(null);
          setSelectedListMessage("");
        }
        lastSelectedDateRef.current = trimmedDate;
        lastFetchedListKeyRef.current = null;
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }
      console.warn("[MaxyBiPopupWrap] Unable to load log list for date:", trimmedDate);
      setListLoadError("Unable to load data. Please try again.");
      lastFetchedListKeyRef.current = null;
    } finally {
      if (listRequestAbortRef.current === controller) {
        listRequestAbortRef.current = null;
      }
      if (!controller.signal.aborted) {
        setIsListLoading(false);
      }
      }
    },
    [osFilter],
  );

  useEffect(() => {
    const lastDate = lastSelectedDateRef.current;
    const state = popupStateRef.current;
    if (
      !lastDate ||
      !state ||
      (state.definition.key !== "appCrashCount" && state.definition.key !== "appErrorCount")
    ) {
      return;
    }
    void fetchLogListForDate(lastDate);
  }, [fetchLogListForDate, osFilter]);

  const handleChartRowSelect = useCallback(
    (row: Record<string, number | string>) => {
      if (!definition) {
        return;
      }
      if (definition.key === "appCrashCount" || definition.key === "appErrorCount") {
        const selectedDate = normaliseChartDateValue(row.date);
        if (selectedDate) {
          lastSelectedDateRef.current = selectedDate;
          void fetchLogListForDate(selectedDate);
        }
      }
      if (definition.key === "appCcuCount") {
        const total = coerceNumeric("total" in row ? row.total : "all" in row ? row.all : 0);
        const ios = coerceNumeric(row.series0);
        const android = coerceNumeric(row.series1);
        const next: Partial<Record<BiPopupDataKey, string>> = {};
        const dateValue = typeof row.date === "string" ? row.date : normaliseChartDateValue(row.date) ?? "-";
        next.date = dateValue;
        next.CCU = normaliseValue(total);
        next.series0 = formatCcuShare(ios, total);
        next.series1 = formatCcuShare(android, total);
        if (summary.iosPcu) {
          next.iosPcu = summary.iosPcu;
        } else if (totals.series0Sum) {
          next.iosPcu = totals.series0Sum;
        }
        if (summary.androidPcu) {
          next.androidPcu = summary.androidPcu;
        } else if (totals.series1Sum) {
          next.androidPcu = totals.series1Sum;
        }
        setSelectedSummary({ filter: osFilter, values: next });
        return;
      }
      if (displayedSummary.length === 0) {
        return;
      }
      const derived = deriveSummaryFromRow(row, displayedSummary);
      if (Object.keys(derived).length === 0) {
        return;
      }
      setSelectedSummary({ filter: osFilter, values: derived });
    },
    [definition, displayedSummary, fetchLogListForDate, osFilter, summary, totals],
  );

  useEffect(() => {
    if (variant !== "log") {
      return;
    }
    if (sortedRows.length === 0) {
      if (selectedListIndex !== null) {
        setSelectedListIndex(null);
      }
      if (selectedListMessage) {
        setSelectedListMessage("");
      }
      return;
    }

    const currentIndex =
      selectedListMessage === ""
        ? -1
        : sortedRows.findIndex((row) => row.message === selectedListMessage);

    if (currentIndex !== -1) {
      if (currentIndex !== selectedListIndex) {
        setSelectedListIndex(currentIndex);
      }
      return;
    }

    if (selectedListIndex === null || selectedListIndex >= sortedRows.length) {
      setSelectedListIndex(0);
      setSelectedListMessage(sortedRows[0]?.message ?? "");
    } else {
      const row = sortedRows[selectedListIndex];
      if ((row?.message ?? "") !== selectedListMessage) {
        setSelectedListMessage(row?.message ?? "");
      }
    }
  }, [variant, sortedRows, selectedListIndex, selectedListMessage]);

  if (!popupState || !definition) {
    return <div id="maxyBiPopupWrap" aria-hidden="true" />;
  }
  const listConfig = definition.listConfig;
  const shouldShowSummary = variant === "standard" && displayedSummary.length > 0 && !isCcuPopup;
  const summaryWrapStyle = shouldShowSummary
    ? { gridTemplateColumns: `repeat(${summaryColumnCount}, 1fr)` }
    : undefined;
  const detailTextareaId = `${definition.key}Detail`;
  const popupClassName = [
    "maxy_popup_common",
    variant === "log" ? "log" : "bi",
    variant === "log" ? "" : definition.orientation === "left" ? "left-side" : "",
    isCcuPopup ? "ccu" : "",
    isClosing ? "hidden" : isEntering ? "show" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const iconClassName = resolveIconClass(definition.icon);
  const usesCalendar = definition.calendar !== "none";
  const calendarValue =
    definition.calendar === "range" || definition.calendar === "ccu" ? rangeLabel ?? "" : undefined;
  const dateValue = !usesCalendar ? dateLabel ?? "" : calendarValue ?? dateLabel ?? "";

  return (
    <div
      id="maxyBiPopupWrap"
      className="maxy_popup_backdrop"
      aria-live="polite"
      role="presentation"
      onMouseDown={handleBackdropMouseDown}
    >
      <div
        className={popupClassName}
        id={`${definition.key}__popUp`}
        role="dialog"
        aria-modal="true"
        aria-label={definition.fallbackTitle}
        ref={popupRef}
      >
         <button type="button" className="x_btn" aria-label="Close popup" onClick={closePopup} />
         <div className="maxy_popup_grid_s_wrap">
           <div className="maxy_popup_title_wrap">
             <div className="maxy_popup_title_left">
               <span className="maxy_popup_analysis_icon" aria-hidden="true" />
               <span>Statistics</span>
               <span className="title">/ {definition.fallbackTitle}</span>
             </div>
             <div className="maxy_popup_title_right">
               {usesCalendar ? (
                <div className="calendar_wrap">
                  <button
                    type="button"
                    className="btn_calendar"
                    aria-label="Select date range"
                    onClick={handleCalendarClick}
                    ref={calendarButtonRef}
                  />
                  <input
                    type="text"
                    id={`bi${definition.key}Calendar`}
                    className="calendar_input"
                    value={calendarValue}
                    readOnly
                    aria-readonly="true"
                    aria-label="Selected date range"
                  />
                  {isCalendarOpen ? (
                    <div className="calendar_popover" ref={calendarPopoverRef}>
                      <RangeCalendar
                        month={displayedMonth}
                        range={calendarRange}
                        onSelectDate={handleCalendarDateSelect}
                        onChangeMonth={setDisplayedMonth}
                        hideNextMonthButton
                        disableFutureDates
                      />
                      <div className="calendar_popover_preview">
                        <span>Start: {calendarRange?.startDate ?? "-"}</span>
                        <span>End: {calendarRange?.endDate ?? "-"}</span>
                      </div>
                      {calendarError ? <div className="calendar_popover_error">{calendarError}</div> : null}
                      <div className="calendar_popover_actions">
                        <button
                          type="button"
                          className="calendar_btn"
                          onClick={handleCalendarCancel}
                          disabled={isApplyingRange}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="calendar_btn calendar_btn--primary"
                          onClick={handleApplyRange}
                          disabled={isApplyingRange}
                        >
                          {isApplyingRange ? "Applying..." : "Apply"}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <span id="date">{dateValue || "-"}</span>
              )}
           </div>
          </div>

          {isCcuPopup ? null : (
            <div className="sum_data_wrap">
              <div className={iconClassName} />
              <div className="data_wrap" id="allWrap">
                {displayedTotals.map((item) => (
                  <div className="grid_column_wrap" key={item.dataKey}>
                    <div className="title" data-t={item.titleKey}>
                      {item.fallback}
                    </div>
                    <div data-bitype={item.dataKey}>{totals[item.dataKey] ?? "-"}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CCU 팝업은 상단에 특화된 요약 격자를 사용하므로 별도 컴포넌트로 분리 */}
          {isCcuPopup ? <CCUSummary fields={definition.summary} data={summaryData} /> : null}

          <div
            className="graph_wrap"
            id={`${definition.key}GraphWrap`}
            role="img"
            aria-label={`${definition.fallbackTitle} chart`}
            style={isCcuPopup ? { flex: "1 1 auto", minHeight: 0 } : undefined}
          >
            <BiPopupChart
              chart={filteredChart}
              onSelectRow={handleChartRowSelect}
              shouldAnimate={isEntering}
            />
          </div>

          {variant === "standard" && shouldShowSummary ? (
            <>
              <div className="sub_title" aria-live="polite">
                <span className="icon-selected" aria-hidden="true" />
                <span>Selected Value</span>
              </div>
              <div className="summary_wrap" id="summaryWrap" style={summaryWrapStyle}>
                {displayedSummary.map((item) => (
                  <div className="grid_content_wrap" key={item.dataKey}>
                    <div className="title" data-t={item.titleKey}>
                      {item.fallback}
                    </div>
                    <div data-bitype={item.dataKey}>{summaryData[item.dataKey] ?? "-"}</div>
                  </div>
                ))}
              </div>
            </>
          ) : null}

          {variant === "log" && listConfig ? (
            <>
              <BiPopupList
                config={listConfig}
                rows={sortedRows}
                selectedIndex={selectedListIndex}
                onSelectRow={handleListRowSelect}
                sortKey={listSort.key}
                sortDirection={listSort.direction}
                onRequestSort={handleColumnSort}
                isLoading={isListLoading}
                statusMessage={listLoadError ?? (isListLoading ? "Loading data..." : null)}
              />
              <div className="log_detail_wrap" id={`${definition.key}DetailWrap`}>
                <label htmlFor={detailTextareaId} data-t="common.text.notice">
                  Notice
                </label>
                <div className="separator" aria-hidden="true" />
                <div
                  id={detailTextareaId}
                  className="log_detail_text enable_scrollbar"
                  role="textbox"
                  aria-readonly="true"
                  aria-multiline="true"
                >
                  {selectedListMessage || ""}
                </div>
              </div>
            </>
          ) : null}
         </div>
       </div>
   </div>
 );
}

/**
 * BI 차트 컴포넌트의 Props 타입
 * @property {BiPopupChartPayload} [chart] - 차트 데이터
 */
type BiPopupChartProps = {
  chart?: BiPopupChartPayload;
  onSelectRow?: (row: Record<string, number | string>) => void;
  shouldAnimate?: boolean;
};

/**
 * BI 차트 컴포넌트
 * Recharts를 사용하여 라인 차트를 렌더링합니다.
 * 
 * @param {BiPopupChartProps} props - 컴포넌트 속성
 * @returns {JSX.Element} 차트 컴포넌트
 */
function BiPopupChart({ chart, onSelectRow, shouldAnimate = false }: BiPopupChartProps) {
  const chartRows = useMemo(() => {
    if (!chart) {
      return [];
    }
    return chart.rows.map((row) => ({
      ...row,
      date: formatChartDate(row.date),
    }));
  }, [chart]);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    setHoveredDate(null);
    setSelectedDate(null);
  }, [chart]);

  const extractPayloadDate = useCallback((payload?: Record<string, number | string>) => {
    if (!payload) {
      return null;
    }
    const raw = payload.date;
    return typeof raw === "string" ? raw : null;
  }, []);

  const handlePointSelection = useCallback(
    (payload?: Record<string, number | string>) => {
      if (!onSelectRow || !payload) {
        return;
      }
      onSelectRow(payload);
      const date = extractPayloadDate(payload);
      if (date) {
        setSelectedDate(date);
      }
    },
    [extractPayloadDate, onSelectRow],
  );

  const handleChartClick = useCallback(
    (state: any) => {
      const payload = state?.activePayload?.[0]?.payload as Record<string, number | string> | undefined;
      if (payload) {
        handlePointSelection(payload);
      }
    },
    [handlePointSelection],
  );

  const handleChartMouseMove = useCallback(
    (state: any) => {
      if (!state || !state.activePayload || state.activePayload.length === 0) {
        setHoveredDate(null);
        return;
      }
      const payload = state.activePayload[0]?.payload as Record<string, number | string> | undefined;
      const date = extractPayloadDate(payload);
      setHoveredDate(date);
    },
    [extractPayloadDate],
  );

  const handleChartMouseLeave = useCallback(() => {
    setHoveredDate(null);
  }, []);

  const activeDate = hoveredDate ?? selectedDate ?? null;
  const chartKind = chart?.renderAs ?? "bar";
  const xAxisType = chart?.xAxisType ?? "category";

  if (!chart || chart.series.length === 0 || chartRows.length === 0) {
    return (
      <div className="chart_empty" role="status">
        No chart data
      </div>
    );
  }

  const xAxisTickFormatter = useCallback(
    (value: string | number) => formatChartXAxisLabel(value, chartKind),
    [chartKind],
  );

  const commonElements = (
    <>
      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, #e5e7eb)" />
      <XAxis
        dataKey="date"
        tick={{ fill: "#000000" }}
        stroke="#000000"
        type={xAxisType === "number" ? "number" : "category"}
        tickFormatter={xAxisTickFormatter}
      />
      <YAxis
        stroke="#000000"
        tick={{ fill: "#000000" }}
        tickFormatter={(value) => formatYAxisNumber(value, chart)}
      />
      <RechartsTooltip
        formatter={(value, name) => [formatTooltipNumber(value, chart.valueFormatter), name]}
        labelFormatter={(label) => formatChartDate(label)}
        contentStyle={{
          color: "#000000",
          backgroundColor: "#ffffff",
          borderColor: "var(--color-border-out-light, #d1d5db)",
        }}
        labelStyle={{ color: "#000000", fontWeight: 600 }}
        itemStyle={{ color: "#000000" }}
        cursor={{ fill: "transparent", stroke: "transparent" }}
      />
      <Legend wrapperStyle={{ color: "#000000" }} />
    </>
  );

  return (
    <ResponsiveContainer
      key={`${chartKind}-${shouldAnimate ? "animate" : "static"}`}
      width="100%"
      height="100%"
    >
      {chartKind === "line" ? (
        <LineChart
          data={chartRows}
          onMouseMove={handleChartMouseMove}
          onMouseLeave={handleChartMouseLeave}
          onClick={handleChartClick}
        >
          {commonElements}
          {chart.series.map((series, index) => {
            const baseColor = series.color ?? CHART_COLORS[index % CHART_COLORS.length];
            const animateLine = shouldAnimate;
            return (
              <Line
                key={series.dataKey}
                type="monotone"
                dataKey={series.dataKey}
                name={series.name}
                stroke={baseColor}
                strokeWidth={2}
                isAnimationActive={animateLine}
                animationDuration={600}
              dot={(props) => {
                  const { cx, cy, payload, index } = props;
                  const key = `dot-${series.name}-${index ?? "na"}`;
                  if (typeof cx !== "number" || typeof cy !== "number" || !payload) {
                    return <g key={key} />;
                  }
                  const dotDate = typeof payload?.date === "string" ? payload.date : null;
                  const isActive = activeDate !== null && dotDate === activeDate;
                  const radius = isActive ? 5 : 3;
                  const fillColor = isActive ? lightenHexColor(baseColor, 0.15) : baseColor;
                  return (
                    <circle
                      key={key}
                      cx={cx}
                      cy={cy}
                      r={radius}
                      fill={fillColor}
                      stroke="#ffffff"
                      strokeWidth={isActive ? 2 : 1}
                    />
                  );
                }}
                activeDot={(props) => {
                  const { cx, cy, index } = props;
                  if (typeof cx !== "number" || typeof cy !== "number") {
                    return <g key={`active-dot-${series.name}-${index ?? "na"}`} />;
                  }
                  return (
                    <circle
                      key={`active-dot-${series.name}-${index ?? "na"}`}
                      cx={cx}
                      cy={cy}
                      r={6}
                      fill={lightenHexColor(baseColor, 0.3)}
                      stroke="#ffffff"
                      strokeWidth={2}
                    />
                  );
                }}
              />
            );
          })}
        </LineChart>
      ) : (
        <BarChart
          data={chartRows}
          onMouseMove={handleChartMouseMove}
          onMouseLeave={handleChartMouseLeave}
          onClick={handleChartClick}
        >
          {commonElements}
          {chart.series.map((series, index) => {
            const animateBar = shouldAnimate;
            return (
              <Bar
                key={series.dataKey}
                dataKey={series.dataKey}
                name={series.name}
                fill={series.color ?? CHART_COLORS[index % CHART_COLORS.length]}
                isAnimationActive={animateBar}
                animationDuration={600}
                barSize={30}
                activeBar={false}
              >
                {chartRows.map((row) => {
                  const baseColor = series.color ?? CHART_COLORS[index % CHART_COLORS.length];
                  const fillColor =
                    activeDate && row.date === activeDate ? lightenHexColor(baseColor, 0.25) : baseColor;
                  return (
                    <Cell
                      key={`${series.dataKey}-${row.date}`}
                      fill={fillColor}
                      cursor="pointer"
                      onClick={() => handlePointSelection(row)}
                    />
                  );
                })}
              </Bar>
            );
          })}
        </BarChart>
      )}
    </ResponsiveContainer>
  );
}

function lightenHexColor(hex: string, amount = 0.2): string {
  const sanitized = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(sanitized)) {
    return hex;
  }
  const factor = Math.min(Math.max(amount, 0), 1);
  const numeric = parseInt(sanitized, 16);
  const r = (numeric >> 16) & 0xff;
  const g = (numeric >> 8) & 0xff;
  const b = numeric & 0xff;

  const mix = (channel: number) => Math.min(255, Math.round(channel + (255 - channel) * factor));

  const next = (mix(r) << 16) | (mix(g) << 8) | mix(b);
  return `#${next.toString(16).padStart(6, "0")}`;
}

function formatTooltipNumber(value: unknown, valueFormatter?: (value: number) => string): string {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return "-";
    }
    if (valueFormatter) {
      try {
        return valueFormatter(value);
      } catch (error) {
        console.warn("[MaxyBiPopupWrap] Failed to format tooltip value:", error);
      }
    }
    return NUMBER_FORMATTER.format(value);
  }
  if (typeof value === "string") {
    return value;
  }
  return value === null || value === undefined ? "-" : String(value);
}

function formatChartXAxisLabel(value: string | number, chartKind: "bar" | "line"): string {
  if (chartKind !== "line") {
    if (typeof value === "string") {
      return value;
    }
    return String(value);
  }
  if (typeof value === "string") {
    const match = value.match(/^(\d{1,2}):/);
    if (match) {
      const hour = match[1].padStart(2, "0");
      return `${hour}시`;
    }
    return value;
  }
  return String(value);
}

type BiPopupListProps = {
  config: BiPopupListConfig;
  rows: BiPopupListRow[];
  selectedIndex?: number | null;
  onSelectRow?: (row: BiPopupListRow, index: number) => void;
  sortKey?: BiPopupListColumnKey | null;
  sortDirection?: "asc" | "desc";
  onRequestSort?: (column: BiPopupListColumnKey) => void;
  isLoading?: boolean;
  statusMessage?: string | null;
};

function BiPopupList({
  config,
  rows,
  selectedIndex = null,
  onSelectRow,
  sortKey = null,
  sortDirection = "asc",
  onRequestSort,
  isLoading = false,
  statusMessage = null,
}: BiPopupListProps) {
  const hasRows = rows.length > 0;
  const columnTemplate = config.columns.map((column) => column.width ?? "1fr").join(" ");

  const handleRowSelect = useCallback(
    (row: BiPopupListRow, index: number) => {
      onSelectRow?.(row, index);
    },
    [onSelectRow],
  );

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>, row: BiPopupListRow, index: number) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handleRowSelect(row, index);
      }
    },
    [handleRowSelect],
  );

  const handleSort = useCallback(
    (columnKey: BiPopupListColumnKey) => {
      onRequestSort?.(columnKey);
    },
    [onRequestSort],
  );

  return (
    <div
      className="popup_list"
      role="region"
      aria-live="polite"
      aria-busy={isLoading || undefined}
    >
      {config.titleKey || config.fallbackTitle ? (
        <div className="popup_list_header">
          <span data-t={config.titleKey}>{config.fallbackTitle}</span>
        </div>
      ) : null}
      {hasRows ? (
        <div className="popup_list_table" role="table">
          <div
            className="popup_list_row popup_list_row--header"
            role="row"
            style={{ gridTemplateColumns: columnTemplate }}
          >
            {config.columns.map((column) => {
              const isSortable = Boolean(onRequestSort) && column.sortable !== false;
              const isActiveSort = isSortable && sortKey === column.key;
              const ariaSort = isSortable
                ? isActiveSort
                  ? sortDirection === "asc"
                    ? "ascending"
                    : "descending"
                  : "none"
                : undefined;
              return (
                <span
                  key={column.key}
                  className="popup_list_cell popup_list_cell--header"
                  role="columnheader"
                  aria-sort={ariaSort}
                  style={{
                    textAlign: column.align ?? "left",
                  }}
                >
                  {isSortable ? (
                    <button
                      type="button"
                      className="popup_list_header_button"
                      onClick={() => handleSort(column.key)}
                    >
                      <span data-t={column.titleKey}>{column.fallback}</span>
                      {isActiveSort ? (
                        <span className="popup_list_header_sort" aria-hidden="true">
                          {sortDirection === "asc" ? "▲" : "▼"}
                        </span>
                      ) : null}
                    </button>
                  ) : (
                    <span data-t={column.titleKey}>{column.fallback}</span>
                  )}
                </span>
              );
            })}
          </div>
          {rows.map((row, index) => {
            const isSelected = selectedIndex === index;
            return (
              <div
                className={`popup_list_row${isSelected ? " popup_list_row--selected" : ""}`}
                key={`${row.count}-${row.causeName ?? row.errorType ?? "row"}-${row.causeBy ?? index}`}
                role="row"
                aria-selected={isSelected}
                style={{ gridTemplateColumns: columnTemplate }}
                tabIndex={0}
                onClick={() => handleRowSelect(row, index)}
                onKeyDown={(event) => handleKeyDown(event, row, index)}
              >
                {config.columns.map((column) => (
                  <span
                    key={column.key}
                    className="popup_list_cell"
                    role="cell"
                    style={{
                      textAlign: column.align ?? "left",
                    }}
                    title={getListCellRawValue(column.key, row)}
                  >
                    {formatListCell(column.key, row)}
                  </span>
                ))}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="popup_list_empty" data-t={config.emptyTitleKey}>
          {config.emptyFallback ?? "No data available"}
        </div>
      )}
      {statusMessage ? (
        <div
          className={`popup_list_status${isLoading ? " popup_list_status--loading" : ""}`}
          role={isLoading ? "status" : "alert"}
        >
          {statusMessage}
        </div>
      ) : null}
    </div>
  );
}

/**
 * 차트에 표시할 날짜를 포맷합니다.
 * 
 * @param {string | number | Date | undefined} value - 포맷할 날짜 값
 * @returns {string} 포맷된 날짜 문자열
 */
function normaliseChartDateValue(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed !== "") {
      return trimmed.length > 10 ? trimmed.slice(0, 10) : trimmed;
    }
  }
  if (isDateLike(value)) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString().slice(0, 10);
    }
  }
  return null;
}

function formatChartDate(value: string | number | Date | undefined): string {
  if (isDateLike(value)) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "number") {
    return value.toString();
  }
  if (typeof value === "string") {
    return value.length > 10 ? value.slice(0, 10) : value;
  }
  return "-";
}

/**
 * 차트에 표시할 숫자를 포맷합니다.
 * 
 * @param {unknown} value - 포맷할 값
 * @returns {string} 포맷된 숫자 문자열 또는 "-" (유효하지 않은 경우)
 */
function formatChartNumber(value: unknown, formatter?: (value: number) => string): string {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return "-";
    }
    if (formatter) {
      return formatter(value);
    }
    return formatCompactValue(value);
  }
  if (typeof value === "string") {
    return value;
  }
  return "-";
}

function formatCompactValue(value: number): string {
  const absValue = Math.abs(value);
  if (absValue >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (absValue >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (absValue >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return NUMBER_FORMATTER.format(value);
}

function formatListCell(columnKey: BiPopupListColumnKey, row: BiPopupListRow): string {
  switch (columnKey) {
    case "rank":
      return row.rank.toString();
    case "count":
      return formatCompactValue(row.count);
    case "causeName":
      return row.causeName ?? "-";
    case "causeBy":
      return row.causeBy ?? "-";
    case "errorType":
      return row.errorType ?? "-";
    case "percent":
      return formatPercentValue(row.percent);
    default:
      return "-";
  }
}

function formatPercentValue(value?: number): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return `${value.toFixed(1)}%`;
  }
  return "-";
}

function buildLogListRowsFromResponse(
  response: BIDetailTop10Response,
  metricKey: BiPopupMetricKey,
): BiPopupListRow[] {
  if (metricKey === "appErrorCount") {
    const entries: Array<{ count: number; errorType: string; message: string }> = [];
    const appendErrorEntries = (rows: BIDetailTop10Entry[] | undefined) => {
      if (!rows) {
        return;
      }
      rows.forEach((row) => {
        entries.push({
          count: row.Count ?? 0,
          errorType: row["Error Type"] ?? "-",
          message: row.Message ?? "",
        });
      });
    };

    appendErrorEntries(response.androidTop10);
    appendErrorEntries(response.iosTop10);
    entries.sort((a, b) => b.count - a.count);
    const limited = entries.slice(0, 10);
    const total = limited.reduce((sum, item) => sum + item.count, 0);

    return limited.map((item, index) => ({
      rank: index + 1,
      count: item.count,
      errorType: item.errorType,
      percent: total > 0 ? (item.count / total) * 100 : undefined,
      message: item.message,
    }));
  }

  const combined: Array<{ count: number; causeName: string; causeBy: string; message: string }> = [];

  const appendCrashEntries = (rows: BIDetailTop10Entry[] | undefined) => {
    if (!rows) {
      return;
    }
    rows.forEach((row) => {
      combined.push({
        count: row.Count ?? 0,
        causeName: row["Cause Name"] ?? "-",
        causeBy: row["Caused By"] ?? "-",
        message: row.Message ?? "",
      });
    });
  };

  appendCrashEntries(response.androidTop10);
  appendCrashEntries(response.iosTop10);
  combined.sort((a, b) => b.count - a.count);
  const limited = combined.slice(0, 10);
  const total = limited.reduce((sum, item) => sum + item.count, 0);

  return limited.map((item, index) => ({
    rank: index + 1,
    count: item.count,
    causeName: item.causeName,
    causeBy: item.causeBy,
    percent: total > 0 ? (item.count / total) * 100 : undefined,
    message: item.message,
  }));
}

function getListCellRawValue(columnKey: BiPopupListColumnKey, row: BiPopupListRow): string | undefined {
  switch (columnKey) {
    case "rank":
      return row.rank.toString();
    case "count":
      return row.count.toString();
    case "causeName":
      return row.causeName;
    case "causeBy":
      return row.causeBy;
    case "errorType":
      return row.errorType;
    case "percent":
      return row.percent !== undefined ? `${row.percent.toFixed(1)}%` : undefined;
    case "message":
      return row.message;
    default:
      return undefined;
  }
}
