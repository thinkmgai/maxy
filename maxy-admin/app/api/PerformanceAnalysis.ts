'use client';

import { API_URL } from "../../settings";

export type PerformanceQuery = {
  applicationId: number;
  osType: string;
  from: number;
  to: number;
  tmzutc: number;
};

type RequestOptions = {
  signal?: AbortSignal;
};

async function postJson<T>(path: string, payload: unknown, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal: options.signal,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

type ApiEnvelope<T> = T & {
  code: number;
  message?: string;
};

function ensureSuccess<T>(payload: ApiEnvelope<T>): T {
  if (payload.code !== 200) {
    throw new Error(payload.message ?? "서버에서 오류가 발생했습니다.");
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { code, message, ...rest } = payload;
  return rest as T;
}

export type CoreVitalResponse = {
  core: Record<string, number>;
  chart: {
    lcp: Array<[number, number]>;
    fcp: Array<[number, number]>;
    inp: Array<[number, number]>;
    cls: Array<[number, number]>;
  };
};

export async function getCoreVital(
  params: PerformanceQuery,
  signal?: AbortSignal
): Promise<CoreVitalResponse> {
  const payload = await postJson<ApiEnvelope<CoreVitalResponse>>("/PPerformanceAnalysis/CoreVital", params, {
    signal,
  });
  return ensureSuccess(payload);
}

export type VitalListItem = {
  reqUrl: string;
  mxPageId: string;
  count: number;
  loadingAvg: number;
  lcp?: number;
  fcp?: number;
  inp?: number;
  cls?: number;
};

export async function getVitalList(
  params: PerformanceQuery,
  signal?: AbortSignal
): Promise<VitalListItem[]> {
  const payload = await postJson<ApiEnvelope<{ list: VitalListItem[] }>>(
    "/PPerformanceAnalysis/VitalList",
    params,
    { signal }
  );
  const data = ensureSuccess(payload);
  return data.list;
}

export type PageLogDetailSummary = {
  title: string;
  alias?: string | null;
  reqUrl: string;
  count: number;
  averageLoading?: number | null;
  deviceName?: string | null;
  appVersion?: string | null;
  osVersion?: string | null;
  networkType?: string | null;
  simOperator?: string | null;
  logType?: string | null;
  userId?: string | null;
};

export type PageLogDetailItem = {
  id: string;
  loadingTime: number;
  reqUrl?: string | null;
  feeldex?: number | null;
  deviceId?: string | null;
  userId?: string | null;
  timestamp: number;
  networkStatus?: string | null;
  lcp?: number | null;
  fcp?: number | null;
  inp?: number | null;
  cls?: number | null;
  wtfFlag?: boolean | null;
};

export type PageLogVitalEntry = {
  metric: string;
  value: number;
  unit: string;
  status: string;
};

export type PageLogWaterfallEntry = {
  name: string;
  start: number;
  duration: number;
};

export type PageLogTimelineEntry = {
  label: string;
  timestamp: number;
  detail: string;
};

export type PageLogDetailResponse = {
  summary: PageLogDetailSummary;
  list: PageLogDetailItem[];
  vitals: PageLogVitalEntry[];
  waterfall: PageLogWaterfallEntry[];
  timeline: PageLogTimelineEntry[];
};

export type PageLogDetailQuery = PerformanceQuery & {
  mxPageId?: string;
  reqUrl?: string;
};

export async function getPageLogDetail(
  params: PageLogDetailQuery,
  signal?: AbortSignal
): Promise<PageLogDetailResponse> {
  const payload = await postJson<ApiEnvelope<PageLogDetailResponse>>(
    "/PPerformanceAnalysis/PageLogDetail",
    params,
    { signal }
  );
  return ensureSuccess(payload);
}

export type HitmapPoint = [number, number, number];

export type HitmapResponse = {
  datas: HitmapPoint[];
  maxCount: number;
  maxDuration: number;
  minTime: number;
  maxTime: number;
  durationStep: number;
};

type HitmapRequest = PerformanceQuery & {
  type: "page" | "api";
  interval: number;
  durationStep?: number;
};

export async function getHitmap(
  params: HitmapRequest,
  signal?: AbortSignal
): Promise<HitmapResponse> {
  const payload = await postJson<ApiEnvelope<HitmapResponse>>("/PPerformanceAnalysis/Hitmap", params, { signal });
  return ensureSuccess(payload);
}

export type LogListItem = {
  reqUrl: string;
  durationAvg: number;
  count: number;
  errorCount?: number;
  mxPageId?: string;
  docId?: string;
};

type LogListRequest = PerformanceQuery & {
  type: "PAGE" | "API";
  durationFrom?: number;
  durationTo?: number;
};

export async function getLogListByTime(
  params: LogListRequest,
  signal?: AbortSignal
): Promise<LogListItem[]> {
  const payload = await postJson<ApiEnvelope<{ list: LogListItem[] }>>(
    "/PPerformanceAnalysis/LogListByTime",
    params,
    { signal }
  );
  const data = ensureSuccess(payload);
  return data.list;
}

export type ApiErrorChartResponse = {
  "3xx": Array<[number, number]>;
  "4xx": Array<[number, number]>;
  "5xx": Array<[number, number]>;
};

export async function getApiErrorChart(
  params: PerformanceQuery,
  signal?: AbortSignal
): Promise<ApiErrorChartResponse> {
  const payload = await postJson<ApiEnvelope<ApiErrorChartResponse>>(
    "/PPerformanceAnalysis/ApiErrorChart",
    params,
    { signal }
  );
  return ensureSuccess(payload);
}

export type ApiErrorListItem = {
  reqUrl: string;
  count: number;
  statusCode: number;
  ratio: number;
};

export async function getApiErrorList(
  params: PerformanceQuery,
  signal?: AbortSignal
): Promise<ApiErrorListItem[]> {
  const payload = await postJson<ApiEnvelope<{ list: ApiErrorListItem[] }>>(
    "/PPerformanceAnalysis/ApiErrorList",
    params,
    { signal }
  );
  const data = ensureSuccess(payload);
  return data.list;
}
