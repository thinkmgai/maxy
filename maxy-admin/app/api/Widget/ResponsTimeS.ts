"use client";

import { API_URL } from "../../../settings";

export type ResponseTimeScatterRequest = {
  applicationId: number;
  osType?: string | null;
  from: number;
  to: number;
  tmzutc: number;
};

export type ResponseTimeDetailRequest = {
  deviceId: string;
  logTm: number;
};

type ResponseTimeAfterKey = {
  ts?: number | string;
};

type RawResponseTimeScatterPoint = {
  _id?: string;
  id?: string;
  logType?: string;
  log_type?: string | number;
  logTm?: number | null;
  log_tm?: number | null;
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
  com_sensitivity?: number | null;
  cpuUsage?: number | null;
  cpu_usage?: number | null;
  simOperatorNm?: string | null;
  sim_operator_nm?: string | null;
  appVer?: string | null;
  app_ver?: string | null;
  wait_time?: number | null;
  download_time?: number | null;
  response_size?: number | null;
  request_size?: number | null;
  osType?: string | null;
  os_type?: string | null;
  wtfFlag?: boolean | null;
  wtf_flag?: string | null;
  mxPageId?: string | null;
};

export type ResponseTimeScatterPoint = RawResponseTimeScatterPoint & {
  id: string;
  logType: string;
  logTm: number | null;
  intervaltime: number;
  loadingTime: number;
  deviceModel: string;
  deviceId: string;
  reqUrl: string;
  comType: string | null;
  comSensitivity: number | null;
  cpuUsage: number | null;
  simOperatorNm: string | null;
  appVer: string | null;
  osType: string | null;
  waitTime: number | null;
  downloadTime: number | null;
  responseSize: number | null;
  requestSize: number | null;
};

type ResponseTimeScatterEnvelope = {
  code: number;
  list: RawResponseTimeScatterPoint[];
  afterKey?: ResponseTimeAfterKey | null;
  message?: string;
};

export type ResponseTimeScatterResult = {
  list: ResponseTimeScatterPoint[];
  afterKey: number | null;
};

type RawResponseTimeDetail = {
  logTm?: number | null;
  log_tm?: number | null;
  deviceId?: string;
  device_id?: string;
  logType?: string | number | null;
  log_type?: string | number | null;
  reqUrl?: string | null;
  req_url?: string | null;
  pageUrl?: string | null;
  page_url?: string | null;
  userId?: string | null;
  user_id?: string | null;
  resMsg?: string | null;
  res_msg?: string | null;
  intervaltime?: number | null;
  downloadTime?: number | null;
  download_time?: number | null;
  waitTime?: number | null;
  wait_time?: number | null;
  responseSize?: number | null;
  response_size?: number | null;
  requestSize?: number | null;
  request_size?: number | null;
  webviewVer?: string | null;
  webview_ver?: string | null;
  appBuildNum?: string | null;
  app_build_num?: string | null;
  storageTotal?: number | null;
  storage_total?: number | null;
  storageUsage?: number | null;
  storage_usage?: number | null;
  batteryLvl?: string | number | null;
  battery_lvl?: string | number | null;
  memUsage?: number | null;
  mem_usage?: number | null;
  cpuUsage?: number | null;
  cpu_usage?: number | null;
  comSensitivity?: number | string | null;
  com_sensitivity?: number | string | null;
  comType?: string | null;
  com_type?: string | null;
  simOperatorNm?: string | null;
  sim_operator_nm?: string | null;
  osType?: string | null;
  os_type?: string | null;
  appVer?: string | null;
  app_ver?: string | null;
  timezone?: string | null;
  ip?: string | null;
  statusCode?: number | null;
  status_code?: number | null;
};

export type ResponseTimeDetail = {
  logTm: number;
  deviceId: string;
  logType: string;
  reqUrl: string | null;
  pageUrl: string | null;
  userId: string | null;
  resMsg: string | null;
  intervaltime: number | null;
  downloadTime: number | null;
  waitTime: number | null;
  responseSize: number | null;
  requestSize: number | null;
  webviewVer: string | null;
  appBuildNum: string | null;
  storageTotal: number | null;
  storageUsage: number | null;
  batteryLvl: string | null;
  memUsage: number | null;
  cpuUsage: number | null;
  comSensitivity: number | null;
  comType: string | null;
  simOperatorNm: string | null;
  osType: string | null;
  appVer: string | null;
  timezone: string | null;
  ip: string | null;
  statusCode: number | null;
};

type ResponseTimeDetailEnvelope = {
  code: number;
  detail?: RawResponseTimeDetail | null;
  message?: string;
};

function toPoint(item: RawResponseTimeScatterPoint): ResponseTimeScatterPoint {
  const intervaltime =
    item.intervaltime ??
    item.interval_tm ??
    0;
  const loadingTime =
    item.loadingTime ??
    item.loading_time ??
    intervaltime;
  const deviceModel = item.deviceModel ?? item.device_model ?? "";
  const deviceId = item.deviceId ?? item.device_id ?? "";
  const reqUrl = item.reqUrl ?? item.req_url ?? "";
  const comType = item.comType ?? item.com_type ?? null;
  const comSensitivity = item.comSensitivity ?? item.com_sensitivity ?? null;
  const cpuUsage = item.cpuUsage ?? item.cpu_usage ?? null;
  const simOperatorNm = item.simOperatorNm ?? item.sim_operator_nm ?? null;
  const appVer = item.appVer ?? item.app_ver ?? null;
  const osType = item.osType ?? item.os_type ?? null;
  const logTypeRaw = item.logType ?? item.log_type ?? "";
  const logType =
    typeof logTypeRaw === "number" ? String(logTypeRaw) : (logTypeRaw ?? "").toString();
  const logTm = item.logTm ?? item.log_tm ?? null;
  const wtfFlag =
    typeof item.wtf_flag === "string"
      ? item.wtf_flag.toLowerCase() === "y"
      : item.wtfFlag ?? null;

  return {
    id: item._id ?? item.id ?? `${deviceId}:${logTm ?? ""}`,
    _id: item._id ?? item.id ?? `${deviceId}:${logTm ?? ""}`,
    logType,
    logTm,
    intervaltime,
    loadingTime,
    deviceModel,
    deviceId,
    reqUrl,
    comType,
    comSensitivity,
    cpuUsage,
    simOperatorNm,
    appVer,
    osType,
    waitTime: item.wait_time ?? null,
    downloadTime: item.download_time ?? null,
    responseSize: item.response_size ?? null,
    requestSize: item.request_size ?? null,
    wtfFlag,
    mxPageId: item.mxPageId ?? null,
  };
}

function toDetail(item: RawResponseTimeDetail): ResponseTimeDetail | null {
  const deviceId = item.deviceId ?? item.device_id ?? "";
  const logTm = item.logTm ?? item.log_tm ?? null;
  if (!deviceId || logTm == null) {
    return null;
  }

  const logTypeRaw = item.logType ?? item.log_type ?? "";
  const logType =
    typeof logTypeRaw === "number" ? String(logTypeRaw) : (logTypeRaw ?? "").toString();

  const comSensitivityRaw = item.comSensitivity ?? item.com_sensitivity ?? null;
  const comSensitivity =
    comSensitivityRaw == null || !Number.isFinite(Number(comSensitivityRaw))
      ? null
      : Number(comSensitivityRaw);

  const batteryLvlRaw = item.batteryLvl ?? item.battery_lvl ?? null;
  const batteryLvl = batteryLvlRaw == null ? null : String(batteryLvlRaw);

  return {
    logTm: Number(logTm),
    deviceId,
    logType,
    reqUrl: item.reqUrl ?? item.req_url ?? null,
    pageUrl: item.pageUrl ?? item.page_url ?? null,
    userId: item.userId ?? item.user_id ?? null,
    resMsg: item.resMsg ?? item.res_msg ?? null,
    intervaltime: item.intervaltime ?? null,
    downloadTime: item.downloadTime ?? item.download_time ?? null,
    waitTime: item.waitTime ?? item.wait_time ?? null,
    responseSize: item.responseSize ?? item.response_size ?? null,
    requestSize: item.requestSize ?? item.request_size ?? null,
    webviewVer: item.webviewVer ?? item.webview_ver ?? null,
    appBuildNum: item.appBuildNum ?? item.app_build_num ?? null,
    storageTotal: item.storageTotal ?? item.storage_total ?? null,
    storageUsage: item.storageUsage ?? item.storage_usage ?? null,
    batteryLvl,
    memUsage: item.memUsage ?? item.mem_usage ?? null,
    cpuUsage: item.cpuUsage ?? item.cpu_usage ?? null,
    comSensitivity,
    comType: item.comType ?? item.com_type ?? null,
    simOperatorNm: item.simOperatorNm ?? item.sim_operator_nm ?? null,
    osType: item.osType ?? item.os_type ?? null,
    appVer: item.appVer ?? item.app_ver ?? null,
    timezone: item.timezone ?? null,
    ip: item.ip ?? null,
    statusCode: item.statusCode ?? item.status_code ?? null,
  };
}

export async function getResponseTimeScatter(
  params: ResponseTimeScatterRequest,
  signal?: AbortSignal,
): Promise<ResponseTimeScatterResult> {
  const now = Date.now();
  const from = Number.isFinite(params.from) ? Math.round(params.from) : now - 3 * 60 * 1000;
  const to = Number.isFinite(params.to) ? Math.round(params.to) : now;

  const requestBody: ResponseTimeScatterRequest = {
    applicationId: params.applicationId,
    osType: params.osType ?? null,
    from,
    to,
    tmzutc: params.tmzutc,
  };

  const response = await fetch(`${API_URL}/widget/ResponsTimeS/List`, {
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

  const payload = (await response.json()) as ResponseTimeScatterEnvelope;

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

export async function getResponseTimeDetail(
  params: ResponseTimeDetailRequest,
  signal?: AbortSignal,
): Promise<ResponseTimeDetail | null> {
  const deviceId = (params.deviceId ?? "").trim();
  const logTm = Number(params.logTm);
  if (!deviceId || !Number.isFinite(logTm) || logTm <= 0) {
    return null;
  }

  const response = await fetch(`${API_URL}/widget/ResponsTimeS/Detail`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ deviceId, logTm }),
    signal,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `Request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as ResponseTimeDetailEnvelope;

  if (payload.code !== 200) {
    throw new Error(payload.message ?? "서버에서 오류가 발생했습니다.");
  }

  if (!payload.detail) {
    return null;
  }

  return toDetail(payload.detail);
}
