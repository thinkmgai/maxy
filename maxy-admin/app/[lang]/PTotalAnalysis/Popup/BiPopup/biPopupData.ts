// BI 상세 정보를 가져오기 위한 API 및 타입 임포트
import {
  apiBIDetail,
  apiBIDetailCrash,
  apiBIDetailCrashTop10,
  apiBIDetailError,
  apiBIDetailErrorTop10,
  apiBIDetailCCU,
  apiBIDetailCCUDate,
  type BIDetailTop10Entry,
  type BIDetailResponse,
  type BIDetailTop10Response,
  type BIDetailSeriesEntry,
  type BIDetailCCURequest,
  type OsType,
} from "@/app/api/BIDetail";
import {
  type BiPopupMetricKey,      // BI 메트릭 키 타입
  type BiPopupOpenDetail,     // 팝업 상세 정보 타입
  type BiPopupRange,          // 날짜 범위 타입
  type BiPopupChartPayload,   // 차트 데이터 페이로드 타입
  type BiPopupDataKey,
  type BiPopupListRow,
  type BiPopupListRequest,
  type BiPopupValueRecord,
} from ".";

// 시리즈 포인트 타입: 날짜와 값을 가진 데이터 포인트
type SeriesPoint = { date: string; value: number };
// 결합된 행 타입: iOS와 Android 시리즈 데이터를 하나의 행으로 결합
type CombinedRow = { date: string; series0: number; series1: number; total: number };
// 차트 데이터 항목 타입: 키-값 쌍의 레코드
type ChartDatum = Record<string, number | string>;
// 차트 시리즈 디스크립터 타입: 차트 시리즈의 메타데이터
type ChartSeriesDescriptor = { dataKey: string; name: string; color?: string };

type ChartPayloadOptions = {
  renderAs?: "bar" | "line";
  xAxisType?: "category" | "number";
  aggregateOnAll?: boolean;
};


/**
 * 시리즈 통계 정보를 저장하는 타입
 * @property {CombinedRow[]} rows - 모든 데이터 행 배열
 * @property {CombinedRow} [firstRow] - 첫 번째 행 데이터
 * @property {CombinedRow} [lastRow] - 마지막 행 데이터
 * @property {number} dayCount - 일수
 * @property {number} series0Sum - 시리즈0(IOS)의 합계
 * @property {number} series1Sum - 시리즈1(Android)의 합계
 * @property {number} totalSum - 전체 합계
 * @property {number | null} series0Avg - 시리즈0 평균
 * @property {number | null} series1Avg - 시리즈1 평균
 * @property {number | null} totalAvg - 전체 평균
 */
type SeriesStats = {
  rows: CombinedRow[];
  firstRow?: CombinedRow;
  lastRow?: CombinedRow;
  dayCount: number;
  series0Sum: number;
  series1Sum: number;
  totalSum: number;
  series0Avg: number | null;
  series1Avg: number | null;
  totalAvg: number | null;
};

/**
 * 요청 범위를 나타내는 타입
 * @property {string} startDate - 시작일 (YYYY-MM-DD 형식)
 * @property {string} endDate - 종료일 (YYYY-MM-DD 형식)
 * @property {BiPopupRange} range - 날짜 범위 객체
 */
type RequestRange = {
  startDate: string;
  endDate: string;
  range: BiPopupRange;
};

/**
 * 빌더 컨텍스트 타입
 * @property {BiPopupMetricKey} key - 메트릭 키
 * @property {SeriesStats} stats - 시리즈 통계 정보
 * @property {RequestRange} requestRange - 요청 범위
 */
type BuilderContext = {
  key: BiPopupMetricKey;
  stats: SeriesStats;
  requestRange: RequestRange;
};

/**
 * BI 팝업 구성을 위한 설정 타입
 * @property {string} endpoint - API 엔드포인트
 * @property {() => RequestRange} getRange - 날짜 범위를 반환하는 함수
 * @property {(context: BuilderContext) => BiPopupOpenDetail} buildDetail - 상세 정보를 빌드하는 함수
 */
type BiPopupConfig = {
  endpoint: string;
  getRange: () => RequestRange;
  buildDetail: (context: BuilderContext) => Omit<BiPopupOpenDetail, "applicationId">;
};

/**
 * BI 메트릭 키에 따른 팝업 설정 매핑
 * 각 메트릭은 API 엔드포인트, 날짜 범위 생성 함수, 상세 정보 빌더 함수를 가짐
 */
const BI_POPUP_CONFIG: Partial<Record<BiPopupMetricKey, BiPopupConfig>> = {
  // 앱 설치 수 설정
  appInstallCount: {
    endpoint: "/PTotalAnalysis/BIDetailInstall",  // 설치 수 조회 API 엔드포인트
    getRange: createWeeklyRange,                // 주간 범위 생성 함수
    buildDetail: buildInstallDetail,            // 설치 수 상세 정보 빌더
  },
  // 일일 활성 사용자(DAU) 설정
  appConnectCount: {
    endpoint: "/PTotalAnalysis/BIDetailDAU",
    getRange: createWeeklyRange,
    buildDetail: buildDauDetail,
  },
  appIosConnectCount: {
    endpoint: "/PTotalAnalysis/BIDetailDAU",
    getRange: createWeeklyRange,
    buildDetail: (context) => buildOsConnectDetail(context, "ios"),
  },
  appAndroidConnectCount: {
    endpoint: "/PTotalAnalysis/BIDetailDAU",
    getRange: createWeeklyRange,
    buildDetail: (context) => buildOsConnectDetail(context, "android"),
  },
  // 로그인 사용자 수 설정
  appLoginUserCount: {
    endpoint: "/PTotalAnalysis/BIDetailLogin",
    getRange: createWeeklyRange,
    buildDetail: buildLoginDetail,
  },
  // 월간 활성 사용자(MAU) 설정
  appMauCount: {
    endpoint: "/PTotalAnalysis/BIDetailMAU",
    getRange: createYearToDateRange,  // 연초부터 현재까지의 범위 생성 함수
    buildDetail: buildMauDetail,
  },
  // 페이지 뷰(PV) 설정
  appUseCount: {
    endpoint: "/PTotalAnalysis/BIDetailPV",
    getRange: createWeeklyRange,
    buildDetail: buildPvDetail,
  },
  appCcuCount: {
    endpoint: "/PTotalAnalysis/BIDetailCCU",
    getRange: createTodayRange,
    buildDetail: buildCcuDetail,
  },
  appAvgUseTime: {
    endpoint: "/PTotalAnalysis/BIDetailStay",
    getRange: createWeeklyRange,
    buildDetail: buildStayDetail,
  },
  appLogCount: {
    endpoint: "/PTotalAnalysis/BIDetailLog",
    getRange: createWeeklyRange,
    buildDetail: buildLogDetail,
  },
  // 휴면 사용자 수 설정
  appSleepUserCount: {
    endpoint: "/PTotalAnalysis/BIDetailSleep",
    getRange: createWeeklyRange,
    buildDetail: buildRateTemplate,  // 비율 템플릿 사용
  },
  // 재방문율 설정
  appReconnectCount: {
    endpoint: "/PTotalAnalysis/BIDetailRevisit",
    getRange: createWeeklyRange,
    buildDetail: buildRateTemplate,  // 비율 템플릿 사용
  },
};

// 차트 시리즈 기본 색상
const DEFAULT_SERIES_COLORS = ["#7277ff", "#2CAFFE", "#ff6969", "#7ad3ff"];
const CRASH_BAR_COLOR = "#ff6969";
const ERROR_BAR_COLOR = "#ffc700";
const LOG_BAR_COLOR = "#7277ff";
const STAY_BAR_COLOR = LOG_BAR_COLOR;

/**
 * BI 팝업 데이터 로드 파라미터 타입
 * @property {BiPopupMetricKey} metricKey - 메트릭 키
 * @property {number} applicationId - 애플리케이션 ID
 */
export type LoadBiPopupParams = {
  metricKey: BiPopupMetricKey;
  applicationId: number;
  osType?: string;
  rangeOverride?: {
    startDate: string;
    endDate: string;
  };
  tmzutc: number;
};

/**
 * 주어진 메트릭 키에 대한 데이터 로드 가능 여부 확인
 * @param {BiPopupMetricKey} key - 확인할 메트릭 키
 * @returns {boolean} 데이터 로드 가능 여부
 */
export function canLoadBiPopupData(key: BiPopupMetricKey): boolean {
  if (key === "appCrashCount" || key === "appErrorCount") {
    return true;
  }
  return Boolean(BI_POPUP_CONFIG[key]);
}

/**
 * BI 팝업 데이터를 비동기적으로 로드하는 함수
 * @param {LoadBiPopupParams} params - 로드 파라미터
 * @returns {Promise<BiPopupOpenDetail>} BI 팝업 상세 정보
 * @throws {Error} 지원하지 않는 메트릭이거나 데이터 로드 실패 시
 */
export async function loadBiPopupData(
  params: LoadBiPopupParams,
): Promise<BiPopupOpenDetail> {
  const rangeOverride = params.rangeOverride;
  if (params.metricKey === "appCrashCount") {
    return loadCrashPopupData(params);
  }
  if (params.metricKey === "appErrorCount") {
    return loadErrorPopupData(params);
  }
  if (params.metricKey === "appCcuCount") {
    return loadCcuPopupData(params);
  }
  // 메트릭 키에 해당하는 설정 가져오기
  const config = BI_POPUP_CONFIG[params.metricKey];
  if (!config) {
    throw new Error(`지원하지 않는 BI 팝업 메트릭: ${params.metricKey}`);
  }

  try {
    // 날짜 범위 생성
    const requestRange = rangeOverride
      ? createRangeFromStrings(rangeOverride.startDate, rangeOverride.endDate)
      : config.getRange();
    
    // API를 통해 BI 상세 데이터 요청
    const response = await apiBIDetail(config.endpoint, {
      applicationId: params.applicationId,
      startDate: requestRange.startDate,
      endDate: requestRange.endDate,
      tmzutc: params.tmzutc,
    });

    // 응답 코드 확인
    if (response.code !== 200) {
      throw new Error(response.message ?? "BI 상세 데이터를 불러오는 데 실패했습니다.");
    }

    // 시리즈 통계 계산
    const stats = buildSeriesStats(response);
    
    // 상세 정보 빌드
    const detail = config.buildDetail({
      key: params.metricKey,
      stats,
      requestRange,
    });

    // 최종 결과 반환
    return {
      key: detail.key,
      applicationId: params.applicationId,
      totals: detail.totals,         // 요약 통계
      summary: detail.summary,       // 상세 요약
      range: detail.range ?? requestRange.range,  // 날짜 범위
      rangeLabel: detail.rangeLabel, // 범위 라벨
      dateLabel: detail.dateLabel,   // 날짜 라벨
      chart: detail.chart,           // 차트 데이터
    };
  } catch (error) {
    console.error("BI 팝업 데이터 로드 중 오류 발생:", error);
    throw error;  // 상위 컴포넌트에서 처리할 수 있도록 에러 전파
  }
}

async function loadCrashPopupData(params: LoadBiPopupParams): Promise<BiPopupOpenDetail> {
  const requestRange = params.rangeOverride
    ? createRangeFromStrings(params.rangeOverride.startDate, params.rangeOverride.endDate)
    : createWeeklyRange();

  const osFilter = normaliseOsTypeParam(params.osType);
  const top10Os: OsType = osFilter === "all" ? "all" : osFilter;
  const [crashResponse, top10Response] = await Promise.all([
    apiBIDetailCrash({
      applicationId: params.applicationId,
      startDate: requestRange.startDate,
      endDate: requestRange.endDate,
      tmzutc: params.tmzutc,
    }),
    apiBIDetailCrashTop10({
      applicationId: params.applicationId,
      startDate: requestRange.startDate,
      endDate: requestRange.endDate,
      osType: top10Os,
      tmzutc: params.tmzutc,
    }),
  ]);

  if (crashResponse.code !== 200) {
    throw new Error(crashResponse.message ?? "BI 크래시 상세 데이터를 불러오는 데 실패했습니다.");
  }
  if (top10Response.code !== 200) {
    throw new Error(top10Response.message ?? "BI 크래시 Top10 데이터를 불러오는 데 실패했습니다.");
  }

  const crashStats = buildSeriesStats(crashResponse);
  const totalSum = crashStats.totalSum;
  const chart = buildLogChartPayload(crashStats.rows, CRASH_BAR_COLOR, "Crash");
  const listRows = buildCrashListRows(top10Response);
  const listRequest: BiPopupListRequest = {
    metricKey: "appCrashCount",
    applicationId: params.applicationId,
    startDate: requestRange.startDate,
    endDate: requestRange.endDate,
    osType: top10Os,
    tmzutc: params.tmzutc,
  };

  return {
    key: "appCrashCount",
    applicationId: params.applicationId,
    range: requestRange.range,
    totals: {
      sum: totalSum,
      avgSum: roundAverage(crashStats.totalAvg),
    },
    chart,
    listRows,
    listRequest,
  };
}

async function loadErrorPopupData(params: LoadBiPopupParams): Promise<BiPopupOpenDetail> {
  const requestRange = params.rangeOverride
    ? createRangeFromStrings(params.rangeOverride.startDate, params.rangeOverride.endDate)
    : createWeeklyRange();

  const osFilter = normaliseOsTypeParam(params.osType);
  const top10Os: OsType = osFilter === "all" ? "all" : osFilter;
  const [errorResponse, top10Response] = await Promise.all([
    apiBIDetailError({
      applicationId: params.applicationId,
      startDate: requestRange.startDate,
      endDate: requestRange.endDate,
      tmzutc: params.tmzutc,
    }),
    apiBIDetailErrorTop10({
      applicationId: params.applicationId,
      startDate: requestRange.startDate,
      endDate: requestRange.endDate,
      osType: top10Os,
      tmzutc: params.tmzutc,
    }),
  ]);

  if (errorResponse.code !== 200) {
    throw new Error(errorResponse.message ?? "BI 에러 상세 데이터를 불러오는 데 실패했습니다.");
  }
  if (top10Response.code !== 200) {
    throw new Error(top10Response.message ?? "BI 에러 Top10 데이터를 불러오는 데 실패했습니다.");
  }

  const errorStats = buildSeriesStats(errorResponse);
  const totalSum = errorStats.totalSum;
  const chart = buildLogChartPayload(errorStats.rows, ERROR_BAR_COLOR, "Error");
  const listRows = buildErrorListRows(top10Response);
  const listRequest: BiPopupListRequest = {
    metricKey: "appErrorCount",
    applicationId: params.applicationId,
    startDate: requestRange.startDate,
    endDate: requestRange.endDate,
    osType: top10Os,
    tmzutc: params.tmzutc,
  };

  return {
    key: "appErrorCount",
    applicationId: params.applicationId,
    range: requestRange.range,
    totals: {
      sum: totalSum,
      avgSum: roundAverage(errorStats.totalAvg),
    },
    chart,
    listRows,
    listRequest,
  };
}

async function loadCcuPopupData(params: LoadBiPopupParams): Promise<BiPopupOpenDetail> {
  const applicationId = params.applicationId;
  const startDate = params.rangeOverride?.startDate ?? formatDate(today());
  const endDate = params.rangeOverride?.endDate ?? startDate;
  const isSingleDay = startDate === endDate;

  const response = isSingleDay
    ? await apiBIDetailCCU({ applicationId, startDate, tmzutc: params.tmzutc })
    : await apiBIDetailCCUDate({ applicationId, startDate, endDate, tmzutc: params.tmzutc });

  if (response.code !== 200) {
    throw new Error(response.message ?? "BI CCU 데이터를 불러오는 데 실패했습니다.");
  }

  const normaliseSeries = (series: BIDetailSeriesEntry[] | undefined): BIDetailSeriesEntry[] =>
    (series ?? []).map((entry) => ({
      date: entry.date ?? entry.hour ?? "",
      value: entry.value,
    }));

  const normalisedResponse: BIDetailResponse = {
    ...response,
    dailyAndroid: normaliseSeries(response.dailyAndroid),
    dailyIOS: normaliseSeries(response.dailyIOS),
  };

  const stats = buildSeriesStats(normalisedResponse);
  const requestRange = createRangeFromStrings(startDate, endDate);
  const detail = buildCcuDetail(
    {
      key: "appCcuCount",
      stats,
      requestRange,
    },
    { chartMode: isSingleDay ? "line" : "bar" },
  );

  const rangeDescriptor = detail.range ?? requestRange.range;
  const rangeLabel = detail.rangeLabel ?? formatRangeLabelFromRange(rangeDescriptor);

  return {
    key: "appCcuCount",
    applicationId,
    totals: detail.totals,
    summary: detail.summary,
    chart: detail.chart,
    range: rangeDescriptor,
    rangeLabel,
    dateLabel: detail.dateLabel ?? (isSingleDay ? startDate : undefined),
  };
}

function normaliseOsTypeParam(value: string | undefined): OsType {
  if (!value) {
    return "all";
  }
  const trimmed = value.trim().toLowerCase();
  if (trimmed === "android") {
    return "android";
  }
  if (trimmed === "ios" || trimmed === "i") {
    return "ios";
  }
  return "all";
}

function buildLogChartPayload(
  rows: CombinedRow[],
  barColor: string,
  labelPrefix: string,
): BiPopupChartPayload | undefined {
  if (rows.length === 0) {
    return undefined;
  }
  return {
    rows: rows.map((row) => ({
      date: row.date,
      total: row.total,
      ios: row.series0,
      android: row.series1,
    })),
    series: [
      {
        dataKey: "total",
        name: `${labelPrefix} Total`,
        color: barColor,
      },
      {
        dataKey: "ios",
        name: `${labelPrefix} iOS`,
        color: barColor,
      },
      {
        dataKey: "android",
        name: `${labelPrefix} Android`,
        color: barColor,
      },
    ],
  };
}

function buildCrashListRows(response: BIDetailTop10Response): BiPopupListRow[] {
  const rows: Array<{
    count: number;
    causeName: string;
    causeBy: string;
    message: string;
  }> = [];

  const pushEntries = (entries: BIDetailTop10Entry[] | undefined) => {
    if (!entries) {
      return;
    }
    for (const entry of entries) {
      rows.push({
        count: entry.Count ?? 0,
        causeName: entry["Cause Name"] ?? "-",
        causeBy: entry["Caused By"] ?? "-",
        message: entry.Message ?? "",
      });
    }
  };

  pushEntries(response.androidTop10);
  pushEntries(response.iosTop10);

  rows.sort((a, b) => b.count - a.count);
  const topRows = rows.slice(0, 10);
  const total = topRows.reduce((acc, row) => acc + row.count, 0);

  return topRows.map((row, index) => ({
    rank: index + 1,
    count: row.count,
    causeName: row.causeName,
    causeBy: row.causeBy,
    percent: total > 0 ? (row.count / total) * 100 : undefined,
    message: row.message,
  }));
}

function buildErrorListRows(response: BIDetailTop10Response): BiPopupListRow[] {
  const rows: Array<{ count: number; errorType: string; message: string }> = [];

  const pushEntries = (entries: BIDetailTop10Entry[] | undefined) => {
    if (!entries) {
      return;
    }
    for (const entry of entries) {
      rows.push({
        count: entry.Count ?? 0,
        errorType: entry["Error Type"] ?? "-",
        message: entry.Message ?? "",
      });
    }
  };

  pushEntries(response.androidTop10);
  pushEntries(response.iosTop10);

  rows.sort((a, b) => b.count - a.count);
  const topRows = rows.slice(0, 10);
  const total = topRows.reduce((acc, row) => acc + row.count, 0);

  return topRows.map((row, index) => ({
    rank: index + 1,
    count: row.count,
    errorType: row.errorType,
    percent: total > 0 ? (row.count / total) * 100 : undefined,
    message: row.message,
  }));
}

/**
 * API 응답으로부터 시리즈 통계를 계산하는 함수
 * @param {BIDetailResponse} response - BI 상세 정보 API 응답
 * @returns {SeriesStats} 계산된 시리즈 통계
 */
function buildSeriesStats(response: BIDetailResponse): SeriesStats {
  // iOS와 Android 시리즈 데이터 가져오기 및 유효성 검사
  const series0 = sanitizeSeries(response.dailyIOS ?? []);  // iOS 데이터
  const series1 = sanitizeSeries(response.dailyAndroid ?? []);  // Android 데이터
  
  // 날짜를 키로 하는 맵 생성 (중복 제거 및 그룹화 용도)
  const map = new Map<string, CombinedRow>();

  // iOS 데이터 처리
  for (const entry of series0) {
    const row = map.get(entry.date) ?? {
      date: entry.date,
      series0: 0,    // iOS 값
      series1: 0,    // Android 값 (아직 처리 안 됨)
      total: 0,      // 총합 (나중에 계산)
    };
    row.series0 += entry.value;  // iOS 값 누적
    map.set(entry.date, row);
  }

  // Android 데이터 처리
  for (const entry of series1) {
    const row = map.get(entry.date) ?? {
      date: entry.date,
      series0: 0,    // iOS 값 (없을 경우 0)
      series1: 0,    // Android 값
      total: 0,      // 총합 (나중에 계산)
    };
    row.series1 += entry.value;  // Android 값 누적
    map.set(entry.date, row);
  }

  // 맵의 값을 배열로 변환하고 총합 계산, 날짜순 정렬
  const rows = Array.from(map.values())
    .map((row) => ({ ...row, total: row.series0 + row.series1 }))  // 총합 계산
    .sort((a, b) => a.date.localeCompare(b.date));  // 날짜 오름차순 정렬

  // 통계 계산
  const dayCount = rows.length;  // 일수
  const series0Sum = rows.reduce((sum, row) => sum + row.series0, 0);  // iOS 총합
  const series1Sum = rows.reduce((sum, row) => sum + row.series1, 0);  // Android 총합
  const totalSum = series0Sum + series1Sum;  // 전체 총합

  // 결과 반환
  return {
    rows,                   // 모든 행 데이터
    firstRow: rows[0],      // 첫 번째 행 (가장 오래된 날짜)
    lastRow: rows[rows.length - 1],  // 마지막 행 (가장 최근 날짜)
    dayCount,               // 일수
    series0Sum,             // iOS 총합
    series1Sum,             // Android 총합
    totalSum,               // 전체 총합
    series0Avg: computeAverage(series0Sum, dayCount),    // iOS 평균
    series1Avg: computeAverage(series1Sum, dayCount),    // Android 평균
    totalAvg: computeAverage(totalSum, dayCount),        // 전체 평균
  };
}

/**
 * 설치 수 상세 정보를 빌드하는 함수
 * @param {BuilderContext} param0 - 빌더 컨텍스트
 * @returns {BiPopupOpenDetail} 설치 수 상세 정보
 */
function buildInstallDetail({
  key,
  stats,
  requestRange,
}: BuilderContext): Omit<BiPopupOpenDetail, "applicationId"> {
  // 마지막 행이 있으면 요약 정보 생성
  const summary = stats.lastRow
    ? {
        date: stats.lastRow.date,     // 날짜
        all: stats.lastRow.total,     // 전체 합계
        series0: stats.lastRow.series0, // iOS 값
        series1: stats.lastRow.series1, // Android 값
      }
    : undefined;
  
  // iOS/Android 차트 데이터 생성
  const chart = buildChartPayload(stats.rows, iosAndroidSeries());

  // 설치 수 상세 정보 반환
  return {
    key,  // 메트릭 키
    range: requestRange.range,  // 날짜 범위
    totals: {
      sum: stats.totalSum,          // 전체 합계
      avgSum: roundAverage(stats.totalAvg),  // 평균 합계 (반올림)
      series0Sum: stats.series0Sum, // iOS 합계
      series1Sum: stats.series1Sum, // Android 합계
    },
    summary,  // 요약 정보
    chart,    // 차트 데이터
  };
}

/**
 * 일일 활성 사용자(DAU) 상세 정보를 빌드하는 함수
 * 설치 수 상세 정보를 기반으로 iOS/Android 평균값 추가
 * @param {BuilderContext} context - 빌더 컨텍스트
 * @returns {BiPopupOpenDetail} DAU 상세 정보
 */
function buildDauDetail(context: BuilderContext): Omit<BiPopupOpenDetail, "applicationId"> {
  // 기본 설치 수 상세 정보 가져오기
  const base = buildInstallDetail(context);
  
  // DAU 전용 필드 추가하여 반환
  return {
    ...base,  // 기본 정보 상속
    totals: {
      ...base.totals,  // 기존 합계 정보 유지
      // iOS/Android 평균값 추가 (반올림)
      series0Avg: roundAverage(context.stats.series0Avg),
      series1Avg: roundAverage(context.stats.series1Avg),
    },
  };
}

/**
 * 월간 활성 사용자(MAU) 상세 정보를 빌드하는 함수
 * DAU 상세 정보를 기반으로 월별 레이블 추가
 * @param {BuilderContext} context - 빌더 컨텍스트
 * @returns {BiPopupOpenDetail} MAU 상세 정보
 */
function buildMauDetail(context: BuilderContext): Omit<BiPopupOpenDetail, "applicationId"> {
  // DAU 상세 정보 가져오기
  const base = buildDauDetail(context);
  
  // 월별 레이블 추가하여 반환
  return {
    ...base,  // 기본 정보 상속
    dateLabel: formatMonthRange(context.stats),  // 'YYYY-MM ~ YYYY-MM' 형식의 월 범위
  };
}

/**
 * 페이지 뷰(PV) 상세 정보를 빌드하는 함수
 * @param {BuilderContext} param0 - 빌더 컨텍스트
 * @returns {BiPopupOpenDetail} PV 상세 정보
 */
function buildPvDetail({
  key,
  stats,
  requestRange,
}: BuilderContext): Omit<BiPopupOpenDetail, "applicationId"> {
  // 마지막 행이 있으면 요약 정보 생성 (1인당 PV 포함)
  const summary = stats.lastRow
    ? {
        date: stats.lastRow.date,  // 날짜
        series0: stats.lastRow.series0,  // PV
        series1: stats.lastRow.series1,  // 뷰어 수
        pvPerPerson: calculateRatio(stats.lastRow.series0, stats.lastRow.series1), // 1인당 PV
      }
    : undefined;

  // PV와 뷰어 수를 보여주는 차트 생성
  const chart = buildChartPayload(
    stats.rows,
    [
      { dataKey: "series0", name: "PV" },         // PV 시리즈
      { dataKey: "series1", name: "Viewer" },     // 뷰어 수 시리즈
    ],
    (row) => ({
      date: row.date,
      series0: row.series0,
      series1: row.series1,
      total: row.total,
      all: row.total,
      pvPerPerson: coerceChartNumber(calculateRatio(row.series0, row.series1)),
    }),
  );

  // PV 상세 정보 반환
  return {
    key,  // 메트릭 키
    range: requestRange.range,  // 날짜 범위
    totals: {
      sum: stats.series0Sum,  // PV 총합
      avgSeries0: roundAverage(stats.series0Avg),  // PV 일평균
      series1Sum: stats.series1Sum,  // 뷰어 수 총합
      series0Avg: calculateRatio(stats.series0Sum, stats.series1Sum),  // 1인당 평균 PV
    },
    summary,  // 요약 정보
    chart,    // 차트 데이터
  };
}

/**
 * 비율 기반 메트릭(재방문율, 휴면율 등)의 상세 정보를 빌드하는 함수
 * @param {BuilderContext} param0 - 빌더 컨텍스트
 * @returns {BiPopupOpenDetail} 비율 기반 메트릭 상세 정보
 */
function buildRateTemplate({
  key,
  stats,
  requestRange,
}: BuilderContext): Omit<BiPopupOpenDetail, "applicationId"> {
  // 마지막 행이 있으면 요약 정보 생성 (비율 포함)
  const summary = stats.lastRow
    ? {
        date: stats.lastRow.date,  // 날짜
        series0: stats.lastRow.series0,  // 전체 수
        series1: stats.lastRow.series1,  // 대상 수
        rate: formatPercent(percent(stats.lastRow.series1, stats.lastRow.series0)),  // 비율(%)
      }
    : undefined;
  
  // 메트릭 유형에 따른 이름 결정 (재방문/휴면)
  const metricName = key === "appReconnectCount" ? "Revisit" : "Dormant";
  
  // 커스텀 매퍼를 사용한 차트 데이터 생성
  const chart = buildChartPayload(
    stats.rows,
    [
      { dataKey: "connections", name: "Connections" },  // 연결 수
      { dataKey: "metricValue", name: metricName },     // 메트릭 값 (재방문/휴면)
    ],
    // 행 데이터를 차트 포맷으로 변환
    (row) => {
      const rateValue = formatPercent(percent(row.series1, row.series0));
      return {
        date: row.date,            // 날짜
        connections: row.total,    // 전체 연결 수
        metricValue: row.series1,  // 메트릭 값 (재방문/휴면 수)
        series0: row.series0,
        series1: row.series1,
        total: row.total,
        all: row.total,
        rate: coerceChartString(rateValue),
      };
    },
  );

  // 비율 기반 메트릭 상세 정보 반환
  return {
    key,  // 메트릭 키
    range: requestRange.range,  // 날짜 범위
    totals: {
      sum: stats.series0Sum,  // 전체 합계
      avgSeries1: roundAverage(stats.series1Avg),  // 대상 평균
      series1Sum: stats.series1Sum,  // 대상 합계
      series0Avg: formatPercent(percent(stats.series1Sum, stats.series0Sum)),  // 전체 대비 비율(%)
    },
    summary,  // 요약 정보
    chart,    // 차트 데이터
  };
}

/**
 * 로그인 상세 정보를 빌드하는 함수
 * @param {BuilderContext} param0 - 빌더 컨텍스트
 * @returns {BiPopupOpenDetail} 로그인 상세 정보
 */
function buildLoginDetail({
  key,
  stats,
  requestRange,
}: BuilderContext): Omit<BiPopupOpenDetail, "applicationId"> {
  // 마지막 행이 있으면 요약 정보 생성 (로그인율, 미로그인 사용자 수 포함)
  const summary = stats.lastRow
    ? {
        date: stats.lastRow.date,  // 날짜
        series0: stats.lastRow.series0,  // 전체 사용자
        series1: stats.lastRow.series1,  // 로그인 사용자
        rate: formatPercent(percent(stats.lastRow.series1, stats.lastRow.series0)),  // 로그인율(%)
        noLogin: Math.max(stats.lastRow.series0 - stats.lastRow.series1, 0),  // 미로그인 사용자 수
      }
    : undefined;
  
  // 로그인 차트 데이터 생성
  const chart = buildChartPayload(
    stats.rows,
    [
      { dataKey: "connections", name: "Connections" },  // 전체 연결 수
      { dataKey: "logins", name: "Logins" },           // 로그인 수
    ],
    // 행 데이터를 차트 포맷으로 변환
    (row) => {
      const rateValue = formatPercent(percent(row.series1, row.series0));
      return {
        date: row.date,            // 날짜
        connections: row.total,    // 전체 연결 수
        logins: row.series1,       // 로그인 수
        series0: row.series0,
        series1: row.series1,
        total: row.total,
        all: row.total,
        rate: coerceChartString(rateValue),
        noLogin: Math.max(row.series0 - row.series1, 0),
      };
    },
  );

  // 로그인 상세 정보 반환
  return {
    key,  // 메트릭 키
    range: requestRange.range,  // 날짜 범위
    totals: {
      sum: stats.series0Sum,  // 전체 사용자 합계
      series1Avg: roundAverage(stats.series1Avg),  // 로그인 사용자 평균
      series1Sum: stats.series1Sum,  // 로그인 사용자 합계
      series0Avg: formatPercent(percent(stats.series1Sum, stats.series0Sum)),  // 로그인율(%)
    },
    summary,  // 요약 정보
    chart,    // 차트 데이터
  };
}

function buildLogDetail({ key, stats, requestRange }: BuilderContext): Omit<BiPopupOpenDetail, "applicationId"> {
  const summary = stats.lastRow
    ? {
        date: stats.lastRow.date,
        series0: stats.lastRow.series0,
      }
    : undefined;

  const chart = buildTotalChart(stats.rows, "Log", LOG_BAR_COLOR, undefined, { aggregateOnAll: false });

  return {
    key,
    range: requestRange.range,
    totals: {
      sum: stats.totalSum,
      series0Avg: roundAverage(stats.totalAvg),
    },
    summary,
    chart,
  };
}

function buildStayDetail({ key, stats, requestRange }: BuilderContext): Omit<BiPopupOpenDetail, "applicationId"> {
  const chart =
    stats.rows.length === 0
      ? undefined
      : {
          rows: stats.rows.map((row) => ({
            date: row.date,
            total: row.total,
            // Selected Value 에서 사용되는 필드들
            appAvgAllUser: formatSecondsToDuration(row.total),
            series0: formatSecondsToDuration(row.series0),
            series1: row.series1,
            all: row.total,
          })),
          series: [
            {
              dataKey: "total",
              name: "Stay Time",
              color: STAY_BAR_COLOR,
            },
          ],
          valueFormatter: stayValueFormatter,
          aggregateOnAll: false,
        };

  const summary = stats.lastRow
    ? {
        date: stats.lastRow.date,
        appAvgAllUser: formatSecondsToDuration(stats.lastRow.total),
        series0: formatSecondsToDuration(stats.lastRow.series0),
      }
    : undefined;

  return {
    key,
    range: requestRange.range,
    totals: {
      sum: stats.totalSum,
      series1Avg: formatSecondsToDuration(stats.series1Avg),
      series1Sum: formatSecondsToDuration(stats.series1Sum),
    },
    summary,
    chart,
  };
}

const NUMBER_FORMATTER = new Intl.NumberFormat("en-US");

function formatNumber(value: number): string {
  return NUMBER_FORMATTER.format(Math.round(value));
}

function formatShareWithPercent(value: number, total: number): string {
  const safeTotal = total > 0 ? total : 0;
  const percent = safeTotal === 0 ? 0 : Math.round((value / safeTotal) * 100);
  return `${formatNumber(value)} (${percent}%)`;
}

function buildCcuDetail(
  { key, stats, requestRange }: BuilderContext,
  options: { chartMode?: "line" | "bar" } = {},
): Omit<BiPopupOpenDetail, "applicationId"> {
  const chartMode = options.chartMode ?? "line";

  const lastRow = stats.lastRow;

  const peakTotal = stats.rows.reduce((max, row) => Math.max(max, row.total), 0);
  const peakIos = stats.rows.reduce((max, row) => Math.max(max, row.series0), 0);
  const peakAndroid = stats.rows.reduce((max, row) => Math.max(max, row.series1), 0);

  const chart = buildChartPayload(
    stats.rows,
    [
      { dataKey: "series0", name: "iOS", color: DEFAULT_SERIES_COLORS[0] },
      { dataKey: "series1", name: "Android", color: DEFAULT_SERIES_COLORS[1] },
    ],
    (row) => ({
      date: row.date,
      series0: row.series0,
      series1: row.series1,
      total: row.total,
      all: row.total,
    }),
    undefined,
    {
      renderAs: chartMode,
      aggregateOnAll: chartMode === "line" ? false : true,
    },
  );

  const summary: BiPopupValueRecord = {
    iosPcu: peakIos,
    androidPcu: peakAndroid,
  };

  if (lastRow) {
    summary.date = chartMode === "line" ? requestRange.endDate : requestRange.endDate;
    summary.CCU = lastRow.total;
    summary.all = lastRow.total;
    summary.series0 = formatShareWithPercent(lastRow.series0, lastRow.total);
    summary.series1 = formatShareWithPercent(lastRow.series1, lastRow.total);
  } else {
    summary.CCU = peakTotal;
    summary.date = requestRange.endDate;
    summary.all = peakTotal;
  }

  return {
    key,
    range: requestRange.range,
    totals: {
      sum: peakTotal,
      series0Sum: peakIos,
      series1Sum: peakAndroid,
    },
    summary,
    chart,
  };
}

function stayValueFormatter(value: number): string {
  return formatSecondsToDuration(value);
}

function buildOsConnectDetail(
  { key, stats, requestRange }: BuilderContext,
  target: "ios" | "android",
): Omit<BiPopupOpenDetail, "applicationId"> {
  const isIos = target === "ios";
  const chart = buildOsTotalChart(stats.rows, isIos ? "iOS" : "Android", isIos);

  const summary = stats.lastRow
    ? {
        date: stats.lastRow.date,
        all: stats.lastRow.total,
        ...(isIos ? { series0: stats.lastRow.series0 } : { series1: stats.lastRow.series1 }),
      }
    : undefined;

  const totals = {
    sum: stats.totalSum,
    ...(isIos ? { series0Sum: stats.series0Sum } : { series1Sum: stats.series1Sum }),
  } as Partial<Record<BiPopupDataKey, number>>;

  return {
    key,
    range: requestRange.range,
    totals,
    summary,
    chart,
  };
}

function buildTotalChart(
  rows: CombinedRow[],
  seriesName: string,
  color?: string,
  valueFormatter?: (value: number) => string,
  options: ChartPayloadOptions = {},
): BiPopupChartPayload | undefined {
  if (rows.length === 0) {
    return undefined;
  }

  return {
    rows: rows.map((row) => ({
      date: row.date,
      total: row.total,
      series0: row.series0,
      series1: row.series1,
      all: row.total,
    })),
    series: [
      {
        dataKey: "total",
        name: seriesName,
      color,
    },
  ],
    valueFormatter,
    renderAs: options.renderAs,
    xAxisType: options.xAxisType,
    aggregateOnAll: options.aggregateOnAll ?? true,
  };
}

function buildOsTotalChart(
  rows: CombinedRow[],
  seriesName: string,
  isIos: boolean,
  options: ChartPayloadOptions = {},
): BiPopupChartPayload | undefined {
  if (rows.length === 0) {
    return undefined;
  }
  const dataKey = isIos ? "series0" : "series1";
  const color = isIos ? DEFAULT_SERIES_COLORS[0] : DEFAULT_SERIES_COLORS[1];

  return {
    rows: rows.map((row) => ({
      date: row.date,
      series0: row.series0,
      series1: row.series1,
      total: row.total,
      all: row.total,
    })),
    series: [
      {
        dataKey,
        name: seriesName,
        color,
      },
    ],
    renderAs: options.renderAs,
    xAxisType: options.xAxisType,
  };
}

function formatSecondsToDuration(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "-";
  }
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  const hours = Math.floor(abs / 3600);
  const minutes = Math.floor((abs % 3600) / 60);
  const seconds = Math.floor(abs % 60);
  const parts: string[] = [];
  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (minutes > 0 || hours > 0) {
    parts.push(`${minutes}m`);
  }
  parts.push(`${seconds}s`);
  return `${sign}${parts.join(" ")}`;
}

function createRangeFromStrings(startDate: string, endDate: string): RequestRange {
  const start = normaliseDateString(startDate);
  const end = normaliseDateString(endDate);
  return {
    startDate: start,
    endDate: end,
    range: {
      from: start,
      to: end,
    },
  };
}

function normaliseDateString(value: string): string {
  if (!value) {
    return new Date().toISOString().slice(0, 10);
  }
  return value.slice(0, 10);
}

/**
 * 최근 7일 범위를 생성하는 함수 (어제 기준)
 * @returns {RequestRange} 주간 범위 정보
 */
function createWeeklyRange(): RequestRange {
  const end = addDays(today(), -1);      // 어제
  const start = addDays(end, -6);        // 6일 전 (총 7일)
  return buildRangeDescriptor(start, end);
}

function createTodayRange(): RequestRange {
  const current = today();
  return buildRangeDescriptor(current, current);
}

/**
 * 올해 1월 1일부터 어제까지의 범위를 생성하는 함수
 * @returns {RequestRange} 연간 범위 정보
 */
function createYearToDateRange(): RequestRange {
  const end = addDays(today(), -1);      // 어제
  const start = new Date(end.getFullYear(), 0, 1);  // 올해 1월 1일
  return buildRangeDescriptor(start, end);
}

function formatRangeLabelFromRange(range?: BiPopupRange): string | undefined {
  if (!range) {
    return undefined;
  }

  const formatEndpoint = (value: string | Date): string | undefined => {
    if (value instanceof Date) {
      return formatDate(value);
    }
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed === "") {
        return undefined;
      }
      return trimmed.length > 10 ? trimmed.slice(0, 10) : trimmed;
    }
    return undefined;
  };

  const from = formatEndpoint(range.from);
  const to = formatEndpoint(range.to);

  if (!from && !to) {
    return undefined;
  }
  if (from && to) {
    return from === to ? from : `${from} ~ ${to}`;
  }
  return from ?? to ?? undefined;
}

/**
 * 오늘 날짜를 시간을 제외하고 반환하는 함수
 * @returns {Date} 오늘 날짜 (시간은 00:00:00)
 */
function today(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * 주어진 날짜에 일수를 더하거나 뺀 날짜를 반환하는 함수
 * @param {Date} date - 기준 날짜
 * @param {number} delta - 더하거나 뺄 일수 (음수 가능)
 * @returns {Date} 계산된 날짜
 */
function addDays(date: Date, delta: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + delta);
  return next;
}

/**
 * 시작일과 종료일로부터 범위 정보를 생성하는 함수
 * @param {Date} start - 시작일
 * @param {Date} end - 종료일
 * @returns {RequestRange} 범위 정보
 */
function buildRangeDescriptor(start: Date, end: Date): RequestRange {
  const startDate = formatDate(start);
  const endDate = formatDate(end);
  return {
    startDate,  // YYYY-MM-DD 형식의 시작일
    endDate,    // YYYY-MM-DD 형식의 종료일
    range: { from: startDate, to: endDate },  // 범위 객체
  };
}

/**
 * Date 객체를 'YYYY-MM-DD' 형식의 문자열로 변환하는 함수
 * @param {Date} date - 변환할 날짜
 * @returns {string} 'YYYY-MM-DD' 형식의 문자열
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");  // 월 (01-12)
  const day = String(date.getDate()).padStart(2, "0");         // 일 (01-31)
  return `${year}-${month}-${day}`;
}

function normaliseRangeBoundary(value?: string): string {
  if (!value) {
    return formatDate(today());
  }
  const trimmed = value.trim();
  if (trimmed === "") {
    return formatDate(today());
  }
  return trimmed.length > 10 ? trimmed.slice(0, 10) : trimmed;
}

/**
 * 시리즈 데이터를 정제하는 함수
 * - 유효하지 않은 날짜 또는 값을 가진 항목 제거
 * @param {BIDetailSeriesEntry[]} series - 정제할 시리즈 데이터
 * @returns {SeriesPoint[]} 정제된 시리즈 데이터
 */
function sanitizeSeries(series: BIDetailSeriesEntry[]): SeriesPoint[] {
  return series
    .map((entry) => {
      const candidate =
        typeof entry.date === "string" && entry.date.trim() !== ""
          ? entry.date.trim()
          : typeof entry.hour === "string" && entry.hour.trim() !== ""
            ? entry.hour.trim()
            : "";
      return {
        date: candidate,
        value: normalizeNumber(entry.value),  // 숫자 정규화
      };
    })
    .filter((entry) => entry.date !== "");  // 유효한 날짜만 필터링
}

/**
 * 값을 숫자로 정규화하는 함수
 * - 유효한 숫자인 경우 그대로 반환, 그렇지 않으면 0 반환
 * @param {unknown} value - 정규화할 값
 * @returns {number} 정규화된 숫자
 */
function normalizeNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;  // 이미 유효한 숫자인 경우
  }
  const parsed = Number(value);  // 숫자로 변환 시도
  return Number.isFinite(parsed) ? parsed : 0;  // 유효한 숫자면 변환값, 아니면 0
}

/**
 * 일평균을 계산하는 함수
 * @param {number} total - 총합
 * @param {number} dayCount - 일수
 * @returns {number | null} 일평균 (일수가 0 이하이면 null)
 */
function computeAverage(total: number, dayCount: number): number | null {
  if (dayCount <= 0) {
    return null;  // 0으로 나누기 방지
  }
  return total / dayCount;
}

/**
 * 평균값을 반올림하여 반환하는 함수
 * @param {number | null} value - 반올림할 값
 * @returns {number | undefined} 반올림된 값 (유효하지 않으면 undefined)
 */
function roundAverage(value: number | null): number | undefined {
  if (value === null || !Number.isFinite(value)) {
    return undefined;  // 유효하지 않은 값
  }
  return Math.round(value);  // 반올림
}

/**
 * 백분율을 계산하는 함수
 * @param {number} part - 부분 값
 * @param {number} whole - 전체 값
 * @returns {number | null} 백분율 (전체 값이 0 이하이면 null)
 */
function percent(part: number, whole: number): number | null {
  if (whole <= 0) {
    return null;  // 0으로 나누기 방지
  }
  return (part / whole) * 100;  // 백분율 계산 (0-100)
}

/**
 * 백분율 값을 문자열로 포맷팅하는 함수
 * @param {number | null} value - 포맷팅할 백분율 값
 * @param {number} [fractionDigits=2] - 소수점 이하 자릿수 (기본값: 2)
 * @returns {string | undefined} 포맷팅된 문자열 (유효하지 않으면 undefined)
 */
function formatPercent(value: number | null, fractionDigits = 2): string | undefined {
  if (value === null || !Number.isFinite(value)) {
    return undefined;  // 유효하지 않은 값
  }
  return `${value.toFixed(fractionDigits)}%`;  // 소수점 이하 자릿수 고정
}

/**
 * 두 수의 비율을 계산하는 함수
 * @param {number} numerator - 분자
 * @param {number} denominator - 분모
 * @returns {number | undefined} 비율 (분모가 0 이하이면 undefined)
 */
function calculateRatio(numerator: number, denominator: number): number | undefined {
  if (denominator <= 0) {
    return undefined;  // 0으로 나누기 방지
  }
  return Number((numerator / denominator).toFixed(2));  // 비율 계산
}

function coerceChartNumber(value: number | null | undefined): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return 0;
}

function coerceChartString(value: string | undefined): string {
  return value ?? "-";
}

/**
 * 월 범위를 'YYYY-MM ~ YYYY-MM' 형식의 문자열로 변환하는 함수
 * @param {SeriesStats} stats - 시리즈 통계 정보
 * @returns {string | undefined} 포맷팅된 월 범위 문자열 (유효하지 않으면 undefined)
 */
function formatMonthRange(stats: SeriesStats): string | undefined {
  if (!stats.firstRow || !stats.lastRow) {
    return undefined;  // 유효한 날짜가 없는 경우
  }
  const start = stats.firstRow.date.slice(0, 7);
  const end = stats.lastRow.date.slice(0, 7);
  return start === end ? start : `${start} ~ ${end}`;
}

/**
 * iOS/Android 시리즈 디스크립터를 생성하는 함수
 * @returns {ChartSeriesDescriptor[]} iOS/Android 시리즈 디스크립터 배열
 */
function iosAndroidSeries(): ChartSeriesDescriptor[] {
  return [
    { dataKey: "series0", name: "iOS" },      // iOS 시리즈
    { dataKey: "series1", name: "Android" },  // Android 시리즈
  ];
}

/**
 * 차트 데이터 페이로드를 생성하는 함수
 * @param {CombinedRow[]} rows - 차트 행 데이터
 * @param {ChartSeriesDescriptor[]} descriptors - 시리즈 디스크립터 배열
 * @param {(row: CombinedRow) => ChartDatum} [mapper=defaultChartRow] - 행 데이터 매핑 함수
 * @returns {BiPopupChartPayload | undefined} 차트 페이로드 (행이 없으면 undefined)
 */
function buildChartPayload(
  rows: CombinedRow[],
  descriptors: ChartSeriesDescriptor[],
  mapper: (row: CombinedRow) => ChartDatum = defaultChartRow,
  valueFormatter?: (value: number) => string,
  options: ChartPayloadOptions = {},
): BiPopupChartPayload | undefined {
  if (rows.length === 0) {
    return undefined;  // 데이터가 없으면 undefined 반환
  }
  
  // 차트 페이로드 생성
  return {
    rows: rows.map(mapper),  // 각 행을 매핑 함수로 변환
    series: descriptors.map((desc, index) => ({
      ...desc,
      // 색상이 지정되지 않았으면 기본 색상 사용 (순환)
      color: desc.color ?? DEFAULT_SERIES_COLORS[index % DEFAULT_SERIES_COLORS.length],
    })),
    valueFormatter,
    renderAs: options.renderAs,
    xAxisType: options.xAxisType,
    aggregateOnAll: options.aggregateOnAll ?? true,
  };
}

/**
 * 기본 차트 행 매핑 함수
 * @param {CombinedRow} row - 변환할 행 데이터
 * @returns {ChartDatum} 차트 데이터 항목
 */
function defaultChartRow(row: CombinedRow): ChartDatum {
  return {
    date: row.date,      // 날짜
    series0: row.series0, // iOS 값
    series1: row.series1, // Android 값
    total: row.total,     // 합계
    all: row.total,       // Selected Value용 전체 합계
  };
}
