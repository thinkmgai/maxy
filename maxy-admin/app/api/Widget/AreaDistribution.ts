"use client";

import { API_URL } from "../../../settings";

export type AreaDistributionMetricKey = "dau" | "error" | "crash";

export type AreaDistributionRegionMetrics = Record<AreaDistributionMetricKey, number>;

export type AreaDistributionSummary = {
  byLocation: Record<string, AreaDistributionRegionMetrics>;
  totals: AreaDistributionRegionMetrics;
  lastUpdated: number;
};

export type AreaDistributionDateType = "DAY" | "WEEK" | "MONTH";

type AreaDistributionSummaryEnvelope = {
  code: number;
  message?: string;
  result: AreaDistributionSummary;
};

export type AreaDistributionDetailRow = {
  logTm: number;
  deviceId: string;
  deviceModel: string;
  userId: string;
  logType: string;
  appVer: string;
  applicationId: string;
  osType: string;
  reqUrl: string;
  pageUrl?: string;
  statusCode: number;
  durationMs: number;
  docId: string;
};

export type AreaDistributionDetailResult = {
  rows: AreaDistributionDetailRow[];
  next: number;
  hasMore: boolean;
};

type AreaDistributionDetailEnvelope = {
  code: number;
  message?: string;
  result: AreaDistributionDetailResult;
};

function normaliseDateType(value?: AreaDistributionDateType | string | null): AreaDistributionDateType {
  if (!value) {
    return "DAY";
  }
  const upper = String(value).toUpperCase();
  if (upper === "WEEK" || upper === "MONTH") {
    return upper;
  }
  return "DAY";
}

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
  if (lower === "android") {
    return "Android";
  }
  if (lower === "ios" || lower === "iphone") {
    return "iOS";
  }
  return trimmed;
}

export async function getAreaDistributionMapData(
  params: {
    applicationId: string;
    osType?: string | null;
    dateType?: AreaDistributionDateType | string | null;
    tmzutc: number;
  },
  signal?: AbortSignal,
): Promise<AreaDistributionSummary> {
  const body = {
    applicationId: params.applicationId,
    osType: normaliseOsType(params.osType),
    dateType: normaliseDateType(params.dateType),
    tmzutc: params.tmzutc,
  };

  const response = await fetch(`${API_URL}/widget/AreaDistribution/MapData`, {
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

  const payload = (await response.json()) as AreaDistributionSummaryEnvelope;
  if (payload.code !== 200 || !payload.result) {
    throw new Error(payload.message ?? "Area Distribution 데이터를 불러오지 못했습니다.");
  }

  return payload.result;
}

export async function getAreaDistributionDetailList(
  params: {
    applicationId: string;
    locationCode: string;
    requestType?: "TOTAL" | "ERROR" | "CRASH";
    osType?: string | null;
    next?: number;
    size?: number;
    tmzutc: number;
  },
  signal?: AbortSignal,
): Promise<AreaDistributionDetailResult> {
  const body = {
    applicationId: params.applicationId,
    locationCode: params.locationCode,
    requestType: params.requestType ?? "TOTAL",
    osType: normaliseOsType(params.osType),
    next: Math.max(0, params.next ?? 0),
    size: Math.min(Math.max(params.size ?? 50, 1), 100),
    tmzutc: params.tmzutc,
  };

  const response = await fetch(`${API_URL}/widget/AreaDistribution/DetailList`, {
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

  const payload = (await response.json()) as AreaDistributionDetailEnvelope;
  if (payload.code !== 200 || !payload.result) {
    throw new Error(payload.message ?? "Area Distribution 상세 데이터를 불러오지 못했습니다.");
  }
  return payload.result;
}
