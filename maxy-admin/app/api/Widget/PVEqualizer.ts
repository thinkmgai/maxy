"use client";

import { API_URL } from "../../../settings";

export type PVEqualizerInfoItem = {
  reqUrl: string;
  viewCount: number;
  uniqDeviceCount?: number;
  logType?: string | number | null;
};

export type PVEqualizerDateType = "DAY" | "WEEK" | "MONTH";

export type PVEqualizerAllInfoItem = {
  reqUrl: string;
  viewCount: number;
  uniqDeviceCount: number;
  intervaltime: number;
};

export type PVEqualizerAllInfoListResponse = {
  list: PVEqualizerAllInfoItem[];
  hasMore: boolean;
  offset: number;
  limit: number;
  message?: string | null;
};

export type PVEqualizerDetailListItem = {
  logTm: number;
  deviceId: string;
  userId: string | null;
  stayTime: number;
  loadingTime: number;
};

export type PVEqualizerDetailChartItem = {
  time: string;
  stayTime: number;
  loadingTime: number;
};

export type PVEqualizerDetailResponse = {
  list: PVEqualizerDetailListItem[];
  chart: PVEqualizerDetailChartItem[];
  message?: string | null;
};

export type PVEqualizerInfoListResult = {
  items: PVEqualizerInfoItem[];
  message?: string | null;
};

type PVEqualizerInfoListEnvelope = {
  code: number;
  message?: string;
  list?: PVEqualizerInfoItem[];
};

type PVEqualizerAllInfoListEnvelope = {
  code: number;
  message?: string;
  list?: PVEqualizerAllInfoItem[];
  hasMore?: boolean;
  offset?: number;
  limit?: number;
};

type PVEqualizerDetailEnvelope = {
  code: number;
  message?: string;
  list?: PVEqualizerDetailListItem[];
  chart?: PVEqualizerDetailChartItem[];
};

function normaliseOsType(value?: string | null): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const lower = trimmed.toLowerCase();
  if (lower === "all" || lower === "전체" || lower === "a") {
    return "all";
  }
  if (lower === "android" || lower === "and") {
    return "Android";
  }
  if (lower === "ios" || lower === "iphone") {
    return "iOS";
  }
  return trimmed;
}

export async function getPVEqualizerInfoList(
  params: {
    applicationId: string;
    serverType?: string | number | null;
    osType?: string | null;
    size?: number;
    tmzutc: number;
  },
  signal?: AbortSignal,
): Promise<PVEqualizerInfoListResult> {
  const body = {
    applicationId: params.applicationId,
    serverType: params.serverType ?? null,
    osType: normaliseOsType(params.osType),
    size: Math.min(Math.max(params.size ?? 12, 1), 500),
    tmzutc: params.tmzutc,
  };

  const response = await fetch(`${API_URL}/widget/PVEqualizer/InfoList`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const fallback = await response.text().catch(() => "");
    throw new Error(fallback || `Request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as PVEqualizerInfoListEnvelope;
  if (payload.code !== 200) {
    throw new Error(payload.message ?? "PV Equalizer 데이터를 불러오지 못했습니다.");
  }

  return {
    items: Array.isArray(payload.list) ? payload.list : [],
    message: payload.message ?? null,
  };
}

export async function getPVEqualizerAllInfoList(
  params: {
    applicationId: string;
    serverType?: string | number | null;
    osType?: string | null;
    dateType: PVEqualizerDateType;
    limit: number;
    offset: number;
    tmzutc: number;
  },
  signal?: AbortSignal,
): Promise<PVEqualizerAllInfoListResponse> {
  const body = {
    applicationId: params.applicationId,
    serverType: params.serverType ?? null,
    osType: normaliseOsType(params.osType),
    dateType: params.dateType,
    limit: Math.min(Math.max(params.limit, 1), 500),
    offset: Math.min(Math.max(params.offset, 0), 1_000_000),
    tmzutc: params.tmzutc,
  };

  const response = await fetch(`${API_URL}/widget/PVEqualizer/All/InfoList`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const fallback = await response.text().catch(() => "");
    throw new Error(fallback || `Request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as PVEqualizerAllInfoListEnvelope;
  if (payload.code !== 200) {
    throw new Error(payload.message ?? "PV Equalizer 데이터를 불러오지 못했습니다.");
  }

  return {
    list: Array.isArray(payload.list) ? payload.list : [],
    hasMore: Boolean(payload.hasMore),
    offset: Number(payload.offset ?? body.offset),
    limit: Number(payload.limit ?? body.limit),
    message: payload.message ?? null,
  };
}

export async function getPVEqualizerDetail(
  params: {
    applicationId: string;
    serverType?: string | number | null;
    osType?: string | null;
    reqUrl: string;
    dateType?: PVEqualizerDateType | string | null;
    limit?: number;
    offset?: number;
    includeChart?: boolean;
    tmzutc: number;
  },
  signal?: AbortSignal,
): Promise<PVEqualizerDetailResponse> {
  const body = {
    applicationId: params.applicationId,
    serverType: params.serverType ?? null,
    osType: normaliseOsType(params.osType),
    reqUrl: params.reqUrl,
    dateType: params.dateType ?? "DAY",
    limit: Math.min(Math.max(params.limit ?? 100, 1), 500),
    offset: Math.min(Math.max(params.offset ?? 0, 0), 1_000_000),
    includeChart: params.includeChart ?? true,
    tmzutc: params.tmzutc,
  };

  const response = await fetch(`${API_URL}/widget/PVEqualizer/InfoDetail`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const fallback = await response.text().catch(() => "");
    throw new Error(fallback || `Request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as PVEqualizerDetailEnvelope;
  if (payload.code !== 200) {
    throw new Error(payload.message ?? "PV Equalizer 상세 데이터를 불러오지 못했습니다.");
  }

  return {
    list: Array.isArray(payload.list) ? payload.list : [],
    chart: Array.isArray(payload.chart) ? payload.chart : [],
    message: payload.message ?? null,
  };
}
