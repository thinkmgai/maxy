"use client";

import { API_URL } from "../../../settings";

export type VersionComparisonRow = {
  applicationId: string;
  osType: string;
  appVer: string;
  install: number;
  dau: number;
  error: number;
  crash: number;
  loadingTime: number;
  responseTime: number;
};

export type VersionComparisonTotals = {
  install: number;
  dau: number;
  error: number;
  crash: number;
  loadingTime: number;
  responseTime: number;
};

export type VersionComparisonAllItem = VersionComparisonRow;

export type VersionComparisonDateType = "DAY" | "WEEK" | "MONTH";

export type VersionComparisonRequest = {
  applicationId: string;
  accessDate?: string;
  osType1?: string | null;
  appVer1?: string | null;
  osType2?: string | null;
  appVer2?: string | null;
  tmzutc: number;
};

type VersionComparisonEnvelope = {
  code: number;
  message?: string;
  versionData: VersionComparisonRow[];
  totalVersionData: VersionComparisonTotals;
};

type VersionComparisonAllEnvelope = {
  code: number;
  message?: string;
  allVersionData: VersionComparisonAllItem[];
};

export type VersionComparisonRowSeries = {
  install: Array<[number, number]>;
  dau: Array<[number, number]>;
  error: Array<[number, number]>;
  crash: Array<[number, number]>;
  loadingTime: Array<[number, number]>;
  responseTime: Array<[number, number]>;
};

export type VersionComparisonRowSeriesResponse = {
  code: number;
  message?: string;
  series: VersionComparisonRowSeries;
};

function normalizeAccessDate(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }
  const sanitized = value.replace(/[^0-9]/g, "");
  if (sanitized.length !== 8) {
    return undefined;
  }
  return sanitized;
}

export async function getVersionComparisonData(
  params: VersionComparisonRequest,
  signal?: AbortSignal,
): Promise<VersionComparisonEnvelope> {
  const body = {
    applicationId: params.applicationId,
    accessDate: normalizeAccessDate(params.accessDate),
    osType1: params.osType1 ?? null,
    appVer1: params.appVer1 ?? null,
    osType2: params.osType2 ?? null,
    appVer2: params.appVer2 ?? null,
    tmzutc: params.tmzutc,
  };

  const response = await fetch(`${API_URL}/widget/VersionComparison/Data`, {
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

  const payload = (await response.json()) as VersionComparisonEnvelope;
  if (payload.code !== 200 || !payload.versionData || !payload.totalVersionData) {
    throw new Error(payload.message ?? "Version Comparison 데이터를 불러오지 못했습니다.");
  }

  return payload;
}

function normaliseDateType(value?: VersionComparisonDateType | string | null): VersionComparisonDateType {
  if (!value) {
    return "DAY";
  }
  const upper = String(value).toUpperCase();
  if (upper === "WEEK" || upper === "MONTH") {
    return upper;
  }
  return "DAY";
}

export async function getVersionComparisonAllData(
  params: {
    applicationId: string;
    dateType?: VersionComparisonDateType | string | null;
    size?: number;
    tmzutc: number;
  },
  signal?: AbortSignal,
): Promise<VersionComparisonAllItem[]> {
  const body = {
    applicationId: params.applicationId,
    dateType: normaliseDateType(params.dateType),
    size: Math.min(Math.max(params.size ?? 12, 2), 40),
    tmzutc: params.tmzutc,
  };

  const response = await fetch(`${API_URL}/widget/VersionComparison/AllData`, {
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

  const payload = (await response.json()) as VersionComparisonAllEnvelope;
  if (payload.code !== 200 || !payload.allVersionData) {
    throw new Error(payload.message ?? "Version Comparison 전체 데이터를 불러오지 못했습니다.");
  }

  return payload.allVersionData;
}

export async function getVersionComparisonRowData(
  params: {
    applicationId: string;
    osType: string;
    appVer: string;
    dateType?: VersionComparisonDateType | string | null;
    tmzutc: number;
  },
  signal?: AbortSignal,
): Promise<VersionComparisonRowSeriesResponse> {
  const body = {
    applicationId: params.applicationId,
    osType: params.osType,
    appVer: params.appVer,
    dateType: normaliseDateType(params.dateType),
    tmzutc: params.tmzutc,
  };

  const response = await fetch(`${API_URL}/widget/VersionComparison/RowData`, {
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

  const payload = (await response.json()) as VersionComparisonRowSeriesResponse;
  if (payload.code !== 200 || !payload.series) {
    throw new Error(payload.message ?? "Version Comparison 상세 데이터를 불러오지 못했습니다.");
  }

  return payload;
}
