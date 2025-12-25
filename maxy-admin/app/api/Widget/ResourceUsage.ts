"use client";

import { API_URL } from "../../../settings";

export type ResourceUsageDateType = "DAY" | "WEEK" | "MONTH";

export type ResourceUsagePopupRow = {
  deviceModel: string;
  count: number;
  usageCount: number;
  cpuUsage: number;
  memUsage: number;
  osType: string;
};

export type ResourceUsagePopupTotals = {
  totalCount: number;
  totalLogCount: number;
};

type ResourceUsagePopupEnvelope = {
  code: number;
  message?: string;
  result: {
    popupData: ResourceUsagePopupRow[];
    totalData: ResourceUsagePopupTotals;
    totalRows?: number;
    nextOffset?: number | null;
    hasMore?: boolean;
  };
};

export type ResourceUsageModelSeries = {
  deviceModel: string;
  osType: string;
  cpu: Array<[number, number]>;
  memory: Array<[number, number]>;
};

export type ResourceUsageDataSeries = ResourceUsageModelSeries[];

type ResourceUsageLegacySeries = {
  deviceModel?: string;
  osType?: string;
  user?: Array<[number, number]>;
  cpu?: Array<[number, number]>;
  memory?: Array<[number, number]>;
};

type ResourceUsageDataEnvelope = {
  code: number;
  message?: string;
  result: ResourceUsageDataSeries | ResourceUsageLegacySeries;
};

function normaliseDateType(value?: ResourceUsageDateType | string | null): ResourceUsageDateType {
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
  if (lower === "all" || lower === "a") {
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

function toFiniteNumber(value: unknown): number | null {
  if (value == null) {
    return null;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function normalisePoints(raw: unknown): Array<[number, number]> {
  if (!Array.isArray(raw)) {
    return [];
  }

  const points: Array<[number, number]> = [];
  for (const entry of raw) {
    if (Array.isArray(entry)) {
      const ts = toFiniteNumber(entry[0]);
      const value = toFiniteNumber(entry[1]);
      if (ts != null && value != null) {
        points.push([ts, value]);
      }
      continue;
    }

    if (entry && typeof entry === "object") {
      const record = entry as Record<string, unknown>;
      const ts = toFiniteNumber(record.ts ?? record.timestamp ?? record.time ?? record[0]);
      const value = toFiniteNumber(record.value ?? record.val ?? record[1]);
      if (ts != null && value != null) {
        points.push([ts, value]);
      }
    }
  }

  points.sort((a, b) => a[0] - b[0]);
  return points;
}

function normaliseSeries(
  series: ResourceUsageModelSeries,
  fallbackDeviceModel: string,
  fallbackOsType: string,
): ResourceUsageModelSeries {
  const cpu = normalisePoints(series.cpu);
  const memory = normalisePoints(series.memory);
  return {
    deviceModel: series.deviceModel || fallbackDeviceModel,
    osType: series.osType || fallbackOsType,
    cpu,
    memory,
  };
}

export async function getResourceUsagePopupData(
  params: {
    applicationId: string;
    osType?: string | null;
    dateType?: ResourceUsageDateType | string | null;
    size?: number;
    offset?: number;
    tmzutc: number;
  },
  signal?: AbortSignal,
): Promise<ResourceUsagePopupEnvelope["result"]> {
  const body = {
    applicationId: params.applicationId,
    osType: normaliseOsType(params.osType),
    dateType: normaliseDateType(params.dateType),
    size: Math.min(Math.max(params.size ?? 6, 1), 30),
    offset: Math.max(params.offset ?? 0, 0),
    tmzutc: params.tmzutc,
  };

  const response = await fetch(`${API_URL}/widget/ResourceUsage/PopupData`, {
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

  const payload = (await response.json()) as ResourceUsagePopupEnvelope;
  if (payload.code !== 200 || !payload.result?.popupData || !payload.result?.totalData) {
    throw new Error(payload.message ?? "Resource Usage 목록을 불러오지 못했습니다.");
  }

  return payload.result;
}

export async function getResourceUsageData(
  params: {
    applicationId: string;
    deviceModel?: string;
    osType?: string | null;
    dateType?: ResourceUsageDateType | string | null;
    tmzutc: number;
  },
  signal?: AbortSignal,
): Promise<ResourceUsageDataSeries> {
  const body: Record<string, unknown> = {
    applicationId: params.applicationId,
    osType: normaliseOsType(params.osType),
    dateType: normaliseDateType(params.dateType),
    tmzutc: params.tmzutc,
  };
  if (params.deviceModel) {
    body.deviceModel = params.deviceModel;
  }

  const response = await fetch(`${API_URL}/widget/ResourceUsage/Data`, {
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

  const payload = (await response.json()) as ResourceUsageDataEnvelope;
  if (payload.code !== 200 || !payload.result) {
    throw new Error(payload.message ?? "Resource Usage 시계열을 불러오지 못했습니다.");
  }

  const fallbackDeviceModel = params.deviceModel ?? "";
  const fallbackOsType = normaliseOsType(params.osType) ?? "";

  if (Array.isArray(payload.result)) {
    return payload.result
      .map((series) => normaliseSeries(series, fallbackDeviceModel, fallbackOsType))
      .filter((series) => series.cpu.length > 0 || series.memory.length > 0);
  }

  const legacy = payload.result as ResourceUsageLegacySeries;
  const legacySeries = normaliseSeries(
    {
      deviceModel: legacy.deviceModel ?? "",
      osType: legacy.osType ?? "",
      cpu: legacy.cpu ?? [],
      memory: legacy.memory ?? [],
    },
    fallbackDeviceModel,
    fallbackOsType,
  );

  if (legacySeries.cpu.length === 0 && legacySeries.memory.length === 0) {
    return [];
  }

  return [legacySeries];
}
