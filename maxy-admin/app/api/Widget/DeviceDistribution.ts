"use client";

import { API_URL } from "../../../settings";
import type {
  FavoritesDateType,
  FavoritesTroubleDetailResponse,
  FavoritesTroubleListResponse,
  FavoritesTroubleType,
} from "./Favorites";

export type DeviceDistributionItem = {
  deviceModel: string;
  osType: string;
  deviceCount: number;
  viewCount: number;
  errorCount: number;
  crashCount: number;
  errorRate: number;
  crashRate: number;
};

export type DeviceDistributionTotals = {
  totalDevices: number;
  totalViews: number;
  totalErrors: number;
  totalCrashes: number;
  lastUpdated: number;
  windowStart?: number | null;
  windowEnd?: number | null;
};

export type DeviceDistributionAllInfoListRequest = {
  applicationId: number;
  osType?: string | null;
  dateType?: FavoritesDateType;
  limit?: number;
  offset?: number;
  tmzutc: number;
};

export type DeviceDistributionAllInfoListItem = {
  osType: string;
  deviceModel: string;
  userCount: number;
  errorCount: number;
  crashCount: number;
};

export type DeviceDistributionAllInfoTotals = {
  totalUsers: number;
  totalErrors: number;
  totalCrashes: number;
};

export type DeviceDistributionAllInfoListResponse = {
  code: number;
  message?: string;
  offset: number;
  limit: number;
  hasMore: boolean;
  totals: DeviceDistributionAllInfoTotals;
  list: DeviceDistributionAllInfoListItem[];
};

export type DeviceDistributionAllRowInfoResponse = {
  code: number;
  message?: string;
  user: Array<[number, number]>;
  error: Array<[number, number]>;
  crash: Array<[number, number]>;
};

export type DeviceDistributionTroubleListRequest = {
  applicationId: number;
  osType?: string | null;
  dateType: FavoritesDateType;
  deviceModel: string;
  troubleType: FavoritesTroubleType;
  limit?: number;
  offset?: number;
  tmzutc: number;
};

export type DeviceDistributionTroubleDetailRequest = {
  applicationId: number;
  logTm: number;
  deviceId: string;
  memUsage: number;
  tmzutc: number;
};

type DeviceDistributionEnvelope = {
  code: number;
  message?: string;
  result: {
    items: DeviceDistributionItem[];
    totals: DeviceDistributionTotals;
  };
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
  if (lower === "a" || lower === "all") {
    return null;
  }
  if (lower.startsWith("android")) {
    return "Android";
  }
  if (lower === "ios" || lower === "iphone") {
    return "iOS";
  }
  return trimmed;
}

function toNumber(value: unknown, fallback = 0): number {
  if (value == null) {
    return fallback;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function clampSize(value: number | undefined, min: number, max: number): number {
  if (value == null || Number.isNaN(value)) {
    return min;
  }
  return Math.min(Math.max(Math.trunc(value), min), max);
}

function normaliseItem(
  raw: DeviceDistributionItem,
  totals: DeviceDistributionTotals,
): DeviceDistributionItem {
  const deviceCount = toNumber(raw.deviceCount);
  const viewCount = toNumber(raw.viewCount);
  const errorCount = toNumber(raw.errorCount);
  const crashCount = toNumber(raw.crashCount);
  const totalError = totals.totalErrors || 0;
  const totalCrash = totals.totalCrashes || 0;

  const errorRate =
    toNumber(raw.errorRate, NaN) ?? NaN;
  const crashRate =
    toNumber(raw.crashRate, NaN) ?? NaN;

  const computedErrorRate =
    Number.isFinite(errorRate) && errorRate >= 0
      ? errorRate
      : totalError > 0
        ? (errorCount / totalError) * 100
        : 0;
  const computedCrashRate =
    Number.isFinite(crashRate) && crashRate >= 0
      ? crashRate
      : totalCrash > 0
        ? (crashCount / totalCrash) * 100
        : 0;

  return {
    deviceModel: raw.deviceModel || "-",
    osType: raw.osType || "unknown",
    deviceCount,
    viewCount,
    errorCount,
    crashCount,
    errorRate: Math.round(computedErrorRate * 100) / 100,
    crashRate: Math.round(computedCrashRate * 100) / 100,
  };
}

function normaliseTotals(raw: Partial<DeviceDistributionTotals> | undefined): DeviceDistributionTotals {
  return {
    totalDevices: toNumber(raw?.totalDevices),
    totalViews: toNumber(raw?.totalViews),
    totalErrors: toNumber(raw?.totalErrors),
    totalCrashes: toNumber(raw?.totalCrashes),
    lastUpdated: toNumber(raw?.lastUpdated),
    windowStart: raw?.windowStart ?? null,
    windowEnd: raw?.windowEnd ?? null,
  };
}

export async function getDeviceDistributionData(
  params: {
    applicationId: string | number;
    osType?: string | null;
    serverType?: string | number | null;
    size?: number;
    tmzutc: number;
  },
  signal?: AbortSignal,
): Promise<{ items: DeviceDistributionItem[]; totals: DeviceDistributionTotals }> {
  const body: Record<string, unknown> = {
    applicationId: params.applicationId,
    osType: normaliseOsType(params.osType),
    tmzutc: params.tmzutc,
    size: clampSize(params.size ?? 30, 1, 100),
  };

  if (params.serverType != null) {
    body.serverType = params.serverType;
  }

  const response = await fetch(`${API_URL}/widget/DeviceDistribution/Data`, {
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

  const payload = (await response.json()) as DeviceDistributionEnvelope;
  if (payload.code !== 200 || !payload.result) {
    throw new Error(payload.message ?? "Device Distribution 데이터를 불러오지 못했습니다.");
  }

  const totals = normaliseTotals(payload.result.totals);
  const items =
    Array.isArray(payload.result.items) && payload.result.items.length > 0
      ? payload.result.items.map((item) => normaliseItem(item, totals))
      : [];

  return {
    items,
    totals,
  };
}

export async function getDeviceDistributionAllInfoList(
  params: DeviceDistributionAllInfoListRequest,
  signal?: AbortSignal,
): Promise<DeviceDistributionAllInfoListResponse> {
  const response = await fetch(`${API_URL}/widget/DeviceDistribution/All/InfoList`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      applicationId: params.applicationId,
      osType: normaliseOsType(params.osType),
      dateType: params.dateType ?? "DAY",
      limit: params.limit ?? 100,
      offset: params.offset ?? 0,
      tmzutc: params.tmzutc,
    }),
    signal,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Device Distribution All 요청이 실패했습니다. (HTTP ${response.status})`);
  }

  const payload = (await response.json()) as DeviceDistributionAllInfoListResponse;
  if (payload.code !== 200) {
    throw new Error(payload.message ?? "Device Distribution All 데이터를 불러오지 못했습니다.");
  }

  return payload;
}

export async function getDeviceDistributionAllRowInfo(
  params: {
    applicationId: number;
    osType?: string | null;
    dateType: FavoritesDateType;
    deviceModel: string;
    tmzutc: number;
  },
  signal?: AbortSignal,
): Promise<DeviceDistributionAllRowInfoResponse> {
  const response = await fetch(`${API_URL}/widget/DeviceDistribution/All/RowInfo`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      applicationId: params.applicationId,
      osType: normaliseOsType(params.osType),
      dateType: params.dateType,
      deviceModel: params.deviceModel,
      tmzutc: params.tmzutc,
    }),
    signal,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Device Distribution All 상세 요청이 실패했습니다. (HTTP ${response.status})`);
  }

  const payload = (await response.json()) as DeviceDistributionAllRowInfoResponse;
  if (payload.code !== 200) {
    throw new Error(payload.message ?? "Device Distribution All 상세 데이터를 불러오지 못했습니다.");
  }

  return payload;
}

export async function getDeviceDistributionTroubleList(
  params: DeviceDistributionTroubleListRequest,
  signal?: AbortSignal,
): Promise<FavoritesTroubleListResponse> {
  const response = await fetch(`${API_URL}/widget/DeviceDistribution/TroubleList`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      applicationId: params.applicationId,
      osType: normaliseOsType(params.osType),
      dateType: params.dateType,
      deviceModel: params.deviceModel,
      troubleType: params.troubleType,
      limit: params.limit ?? 100,
      offset: params.offset ?? 0,
      tmzutc: params.tmzutc,
    }),
    signal,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Device Distribution TroubleList 요청이 실패했습니다. (HTTP ${response.status})`);
  }

  const payload = (await response.json()) as FavoritesTroubleListResponse;
  if (payload.code !== 200) {
    throw new Error(payload.message ?? "Device Distribution TroubleList 데이터를 불러오지 못했습니다.");
  }

  return payload;
}

export async function getDeviceDistributionTroubleDetail(
  params: DeviceDistributionTroubleDetailRequest,
  signal?: AbortSignal,
): Promise<FavoritesTroubleDetailResponse> {
  const response = await fetch(`${API_URL}/widget/DeviceDistribution/TroubleDetail`, {
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
    throw new Error(text || `Device Distribution TroubleDetail 요청이 실패했습니다. (HTTP ${response.status})`);
  }

  const payload = (await response.json()) as FavoritesTroubleDetailResponse;
  if (payload.code !== 200) {
    throw new Error(payload.message ?? "Device Distribution TroubleDetail 데이터를 불러오지 못했습니다.");
  }

  return payload;
}
