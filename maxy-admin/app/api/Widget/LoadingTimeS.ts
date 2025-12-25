"use client";

import { API_URL } from "../../../settings";

export type LoadingTimeScatterRequest = {
  applicationId: number;
  osType?: string | null;
  from: number;
  to: number;
  limit?: number;
  size?: number;
  tmzutc: number;
};

type LoadingTimeAfterKey = {
  ts?: number | string;
};

type RawLoadingTimeScatterPoint = {
  _id: string;
  logType?: string;
  log_type?: string;
  logTm?: number | null;
  intervaltime?: number;
  interval_tm?: number;
  loadingTime?: number;
  loading_time?: number;
  deviceModel?: string;
  device_model?: string;
  deviceId?: string;
  device_id?: string;
  reqUrl?: string;
  req_url?: string;
  comType?: string | null;
  com_type?: string | null;
  comSensitivity?: number | null;
  avg_com_sensitivity?: number | null;
  cpuUsage?: number | null;
  avgCpuUsage?: number | null;
  avg_cpu_usage?: number | null;
  avgComSensitivity?: number | null;
  simOperatorNm?: string | null;
  sim_operator_nm?: string | null;
  appVer?: string | null;
  app_ver?: string | null;
  userId?: string | null;
  userNm?: string | null;
  birthDay?: string | null;
  clientNm?: string | null;
  pageEndTm?: number | null;
  page_end_tm?: number | null;
  pageStartTm?: number | null;
  page_start_tm?: number | null;
  wtfFlag?: boolean | null;
  wtf_flag?: string | null;
  osType?: string | null;
  os_type?: string | null;
  mxPageId?: string | null;
  id?: string;
};

export type LoadingTimeScatterPoint = RawLoadingTimeScatterPoint & {
  id: string;
};

type LoadingTimeScatterEnvelope = {
  code: number;
  list: RawLoadingTimeScatterPoint[];
  afterKey?: LoadingTimeAfterKey | null;
  message?: string;
};

export type LoadingTimeScatterResult = {
  list: LoadingTimeScatterPoint[];
  afterKey: number | null;
};

function toPoint(item: RawLoadingTimeScatterPoint): LoadingTimeScatterPoint {
  const intervaltime =
    item.intervaltime ??
    item.interval_tm ??
    0;
  const loadingTime =
    item.loadingTime ??
    item.loading_time ??
    0;
  const deviceModel = item.deviceModel ?? item.device_model ?? "";
  const deviceId = item.deviceId ?? item.device_id ?? "";
  const reqUrl = item.reqUrl ?? item.req_url ?? "";
  const comType = item.comType ?? item.com_type ?? null;
  const comSensitivity = item.comSensitivity ?? item.avg_com_sensitivity ?? null;
  const cpuUsage = item.cpuUsage ?? item.avg_cpu_usage ?? null;
  const avgCpuUsage = item.avgCpuUsage ?? item.avg_cpu_usage ?? null;
  const avgComSensitivity = item.avgComSensitivity ?? item.avg_com_sensitivity ?? null;
  const simOperatorNm = item.simOperatorNm ?? item.sim_operator_nm ?? null;
  const appVer = item.appVer ?? item.app_ver ?? null;
  const pageStartTm = item.pageStartTm ?? item.page_start_tm ?? null;
  const pageEndTm = item.pageEndTm ?? item.page_end_tm ?? null;
  const osType = item.osType ?? item.os_type ?? null;
  const logType = item.logType ?? item.log_type ?? "";
  const wtfFlag =
    typeof item.wtf_flag === "string"
      ? item.wtf_flag.toLowerCase() === "y"
      : item.wtfFlag ?? null;

  return {
    id: item._id ?? item.id ?? `${deviceId}:${pageStartTm ?? ""}`,
    _id: item._id ?? item.id ?? `${deviceId}:${pageStartTm ?? ""}`,
    logType,
    logTm: item.logTm ?? null,
    intervaltime,
    loadingTime,
    deviceModel,
    deviceId,
    reqUrl,
    comType,
    comSensitivity,
    cpuUsage,
    avgCpuUsage,
    avgComSensitivity,
    simOperatorNm,
    appVer,
    userId: item.userId ?? null,
    userNm: item.userNm ?? null,
    birthDay: item.birthDay ?? null,
    clientNm: item.clientNm ?? null,
    pageEndTm,
    pageStartTm,
    wtfFlag,
    osType,
    mxPageId: item.mxPageId ?? null,
  };
}

export async function getLoadingTimeScatter(
  params: LoadingTimeScatterRequest,
  signal?: AbortSignal,
): Promise<LoadingTimeScatterResult> {
  const now = Date.now();
  const from = Number.isFinite(params.from) ? Math.round(params.from) : now - 3 * 60 * 1000;
  const to = Number.isFinite(params.to) ? Math.round(params.to) : now;

  const size = Math.min(Math.max(Math.round(params.size ?? 120), 10), 500);
  const limit = Math.min(Math.max(Math.round(params.limit ?? 1200), 1), 10000);

  const requestBody: LoadingTimeScatterRequest = {
    applicationId: params.applicationId,
    osType: params.osType ?? null,
    from,
    to,
    limit,
    size,
    tmzutc: params.tmzutc,
  };

  const response = await fetch(`${API_URL}/widget/LoadingTimeS/List`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
    signal,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `Request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as LoadingTimeScatterEnvelope;

  if (payload.code !== 200) {
    throw new Error(payload.message ?? "서버에서 오류가 발생했습니다.");
  }

  const afterKeyRaw =
    payload.afterKey?.ts ??
    // fallback for 다른 키명 사용 가능성
    // @ts-expect-error
    payload.afterKey?.from ??
    null;
  const afterKey =
    afterKeyRaw != null && Number.isFinite(Number(afterKeyRaw)) ? Number(afterKeyRaw) : null;

  return {
    list: (payload.list ?? []).map(toPoint),
    afterKey,
  };
}
