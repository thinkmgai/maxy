"use client";

import { API_URL } from "../../../settings";

export type FavoritesDateType = "DAY" | "WEEK" | "MONTH";

export type FavoritesInfoListRequest = {
  applicationId: number;
  osType?: string | null;
  dateType?: FavoritesDateType;
  size?: number;
  tmzutc: number;
};

export type FavoritesInfoListItem = {
  reqUrl: string;
  count: number;
  logCount: number;
  sumCpuUsage: number;
  sumMemUsage: number;
  loadingTime: number;
  responseTime: number;
  intervaltime: number;
  errorCount: number;
  crashCount: number;
  cpuUsage: number;
  memUsage: number;
  logType?: string | null;
};

type FavoritesInfoListEnvelope = {
  code: number;
  message?: string;
  list: FavoritesInfoListItem[];
};

export type FavoritesRowInfoResponse = {
  code: number;
  message?: string;
  count: Array<[number, number]>;
  error: Array<[number, number]>;
  crash: Array<[number, number]>;
  loadingTime: Array<[number, number]>;
  responseTime: Array<[number, number]>;
};

export type FavoritesAllInfoListRequest = {
  applicationId: number;
  osType?: string | null;
  dateType?: FavoritesDateType;
  limit?: number;
  offset?: number;
  tmzutc: number;
};

export type FavoritesAllInfoListResponse = {
  code: number;
  message?: string;
  offset: number;
  limit: number;
  hasMore: boolean;
  list: FavoritesInfoListItem[];
};

export type FavoritesTroubleType = "error" | "crash";

export type FavoritesTroubleCursor = {
  logTm: number;
  deviceId: string;
  memUsage: number;
};

export type FavoritesTroubleListItem = {
  logTm: number;
  deviceId: string;
  userId?: string | null;
  logType: number;
  osType?: string | null;
  appVer?: string | null;
  logName?: string | null;
  deviceModel?: string | null;
  memUsage: number;
};

export type FavoritesTroubleListResponse = {
  code: number;
  message?: string;
  list: FavoritesTroubleListItem[];
  hasMore: boolean;
  nextCursor: FavoritesTroubleCursor | null;
};

export type FavoritesTroubleDetailItem = {
  logTm: number;
  deviceId: string;
  userId?: string | null;
  logType: number;
  osType?: string | null;
  osVer?: string | null;
  appVer?: string | null;
  deviceModel?: string | null;
  comType?: string | null;
  comSensitivity?: string | null;
  cpuUsage?: number | null;
  memUsage: number;
  batteryLvl?: string | null;
  webviewVer?: string | null;
  appBuildNum?: string | null;
  reqUrl?: string | null;
  resMsg?: string | null;
  intervaltime?: number | null;
  storageUsage?: number | null;
  storageTotal?: number | null;
  timezone?: string | null;
  simOperatorNm?: string | null;
  ip?: string | null;
  pageId?: string | null;
};

export type FavoritesTroubleDetailResponse = {
  code: number;
  message?: string;
  item: FavoritesTroubleDetailItem | null;
};

export async function getFavoritesInfoList(
  params: FavoritesInfoListRequest,
  signal?: AbortSignal,
): Promise<FavoritesInfoListItem[]> {
  const body = {
    applicationId: params.applicationId,
    osType: params.osType ?? null,
    dateType: params.dateType ?? "DAY",
    size: params.size ?? 50,
    tmzutc: params.tmzutc,
  };

  const response = await fetch(`${API_URL}/widget/Favorites/InfoList`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Favorites 요청이 실패했습니다. (HTTP ${response.status})`);
  }

  const payload = (await response.json()) as FavoritesInfoListEnvelope;
  if (payload.code !== 200) {
    throw new Error(payload.message ?? "Favorites 데이터를 불러오지 못했습니다.");
  }

  return payload.list ?? [];
}

export async function getFavoritesAllInfoList(
  params: FavoritesAllInfoListRequest,
  signal?: AbortSignal,
): Promise<FavoritesAllInfoListResponse> {
  const response = await fetch(`${API_URL}/widget/Favorites/All/InfoList`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      applicationId: params.applicationId,
      osType: params.osType ?? null,
      dateType: params.dateType ?? "DAY",
      limit: params.limit ?? 100,
      offset: params.offset ?? 0,
      tmzutc: params.tmzutc,
    }),
    signal,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Favorites All 요청이 실패했습니다. (HTTP ${response.status})`);
  }

  const payload = (await response.json()) as FavoritesAllInfoListResponse;
  if (payload.code !== 200) {
    throw new Error(payload.message ?? "Favorites All 데이터를 불러오지 못했습니다.");
  }

  return payload;
}

export async function getFavoritesRowInfo(
  params: {
    applicationId: number;
    osType?: string | null;
    dateType: FavoritesDateType;
    reqUrl: string;
    tmzutc: number;
  },
  signal?: AbortSignal,
): Promise<FavoritesRowInfoResponse> {
  const response = await fetch(`${API_URL}/widget/Favorites/RowInfo`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      applicationId: params.applicationId,
      osType: params.osType ?? null,
      dateType: params.dateType,
      reqUrl: params.reqUrl,
      tmzutc: params.tmzutc,
    }),
    signal,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Favorites 상세 요청이 실패했습니다. (HTTP ${response.status})`);
  }

  return response.json() as Promise<FavoritesRowInfoResponse>;
}

export async function getFavoritesAllRowInfo(
  params: {
    applicationId: number;
    osType?: string | null;
    dateType: FavoritesDateType;
    reqUrl: string;
    tmzutc: number;
  },
  signal?: AbortSignal,
): Promise<FavoritesRowInfoResponse> {
  const response = await fetch(`${API_URL}/widget/Favorites/All/RowInfo`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      applicationId: params.applicationId,
      osType: params.osType ?? null,
      dateType: params.dateType,
      reqUrl: params.reqUrl,
      tmzutc: params.tmzutc,
    }),
    signal,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Favorites All 상세 요청이 실패했습니다. (HTTP ${response.status})`);
  }

  return response.json() as Promise<FavoritesRowInfoResponse>;
}

export async function getFavoritesTroubleList(
  params: {
    applicationId: number;
    osType?: string | null;
    dateType: FavoritesDateType;
    reqUrl: string;
    troubleType: FavoritesTroubleType;
    limit?: number;
    offset?: number;
    tmzutc: number;
  },
  signal?: AbortSignal,
): Promise<FavoritesTroubleListResponse> {
  const response = await fetch(`${API_URL}/widget/Favorites/TroubleList`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      applicationId: params.applicationId,
      osType: params.osType ?? null,
      dateType: params.dateType,
      reqUrl: params.reqUrl,
      troubleType: params.troubleType,
      limit: params.limit ?? 100,
      offset: params.offset ?? 0,
      tmzutc: params.tmzutc,
    }),
    signal,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Favorites TroubleList 요청이 실패했습니다. (HTTP ${response.status})`);
  }

  const payload = (await response.json()) as FavoritesTroubleListResponse;
  if (payload.code !== 200) {
    throw new Error(payload.message ?? "Favorites TroubleList 데이터를 불러오지 못했습니다.");
  }

  return payload;
}

export async function getFavoritesTroubleDetail(
  params: {
    applicationId: number;
    logTm: number;
    deviceId: string;
    memUsage: number;
    tmzutc: number;
  },
  signal?: AbortSignal,
): Promise<FavoritesTroubleDetailResponse> {
  const response = await fetch(`${API_URL}/widget/Favorites/TroubleDetail`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      applicationId: params.applicationId,
      logTm: params.logTm,
      deviceId: params.deviceId,
      memUsage: params.memUsage,
      tmzutc: params.tmzutc,
    }),
    signal,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Favorites TroubleDetail 요청이 실패했습니다. (HTTP ${response.status})`);
  }

  const payload = (await response.json()) as FavoritesTroubleDetailResponse;
  if (payload.code !== 200) {
    throw new Error(payload.message ?? "Favorites TroubleDetail 데이터를 불러오지 못했습니다.");
  }

  return payload;
}
