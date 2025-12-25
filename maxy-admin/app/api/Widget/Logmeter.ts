"use client";

import { API_URL } from "../../../settings";
import type {
  FavoritesTroubleDetailResponse,
  FavoritesTroubleListResponse,
  FavoritesTroubleType,
} from "./Favorites";

export type LogmeterTimelinePoint = {
  timestamp: number;
  logCount: number;
  errorCount: number;
  crashCount: number;
};

export type LogmeterStackMaxValues = Partial<Record<"error" | "crash", number>>;
export type LogmeterStackAverages = Partial<Record<"error" | "crash", number>>;

export type LogmeterSnapshot = {
  rt: string;
  biInfo: {
    appLogCount: number;
    appErrorCount: number;
    appCrashCount: number;
  };
  todayErrorCount: number;
  todayCrashCount: number;
  updatedAt: string | null;
  logmeterAvg: {
    error: number;
    crash: number;
  };
  timeline: LogmeterTimelinePoint[];
  weights: {
    logWeight: number;
    errorWeight: number;
    crashWeight: number;
  };
  stackMaxValues?: LogmeterStackMaxValues;
  stackMaxAverages?: LogmeterStackAverages;
  windowMinutes: number;
  throttleMs: number;
  lastUpdated: number;
};

export type LogmeterSnapshotRequest = {
  applicationId: number;
  serverType?: number;
  maxLogItems?: number;
};

type LogmeterSnapshotRaw = {
  packageNm: string;
  serverType: string;
  logCount: number;
  errorCount?: number | null;
  jsErrorCount?: number | null;
  crashCount?: number | null;
  todayCrashCount?: number | null;
  todayErrorCount?: number | null;
  lastRegDt?: string | null;
  windowStart?: string | null;
  windowEnd?: string | null;
  updatedAt?: string | null;
  stackMaxError?: number | null;
  stackMaxCrash?: number | null;
  stack_max_error?: number | null;
  stack_max_crash?: number | null;
  stackMax?: {
    error?: number | null;
    crash?: number | null;
    avgError7d?: number | null;
    avgCrash7d?: number | null;
  } | null;
  avgError7d?: number | null;
  avgCrash7d?: number | null;
  stackAvg?: {
    error?: number | null;
    crash?: number | null;
  } | null;
};

type LogmeterSnapshotEnvelope = {
  code: number;
  message?: string;
  data: LogmeterSnapshotRaw;
};

function parseNumeric(value: unknown): number | null {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;
  return Number.isFinite(numeric) ? numeric : null;
}

function normalizeStackMaxValues(raw: LogmeterSnapshotRaw): LogmeterStackMaxValues | undefined {
  const anyRaw = raw as Record<string, unknown>;
  const stackMaxObj =
    (anyRaw.stackMax as { error?: unknown; crash?: unknown; stackMaxError?: unknown; stackMaxCrash?: unknown } | undefined) ??
    (anyRaw.stack_max as { error?: unknown; crash?: unknown; stackMaxError?: unknown; stackMaxCrash?: unknown } | undefined);

  const errorCandidate =
    anyRaw.stackMaxError ??
    anyRaw.stack_max_error ??
    stackMaxObj?.error ??
    stackMaxObj?.stackMaxError;
  const crashCandidate =
    anyRaw.stackMaxCrash ??
    anyRaw.stack_max_crash ??
    stackMaxObj?.crash ??
    stackMaxObj?.stackMaxCrash;

  const parsedError = parseNumeric(errorCandidate);
  const parsedCrash = parseNumeric(crashCandidate);

  const result: LogmeterStackMaxValues = {};
  if (parsedError !== null) {
    result.error = parsedError;
  }
  if (parsedCrash !== null) {
    result.crash = parsedCrash;
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

function normalizeStackAverages(raw: LogmeterSnapshotRaw): LogmeterStackAverages | undefined {
  const anyRaw = raw as Record<string, unknown>;
  const stackAvgObj =
    (anyRaw.stackAvg as { error?: unknown; crash?: unknown; avgError7d?: unknown; avgCrash7d?: unknown } | undefined) ??
    (anyRaw.stack_avg as { error?: unknown; crash?: unknown; avgError7d?: unknown; avgCrash7d?: unknown } | undefined);
  const stackMaxObj =
    (anyRaw.stackMax as { avgError7d?: unknown; avgCrash7d?: unknown } | undefined) ??
    (anyRaw.stack_max as { avgError7d?: unknown; avgCrash7d?: unknown } | undefined);

  const errorCandidate =
    anyRaw.avgError7d ??
    stackAvgObj?.error ??
    stackAvgObj?.avgError7d ??
    stackMaxObj?.avgError7d;
  const crashCandidate =
    anyRaw.avgCrash7d ??
    stackAvgObj?.crash ??
    stackAvgObj?.avgCrash7d ??
    stackMaxObj?.avgCrash7d;

  const parsedError = parseNumeric(errorCandidate);
  const parsedCrash = parseNumeric(crashCandidate);

  const result: LogmeterStackAverages = {};
  if (parsedError !== null) {
    result.error = parsedError;
  }
  if (parsedCrash !== null) {
    result.crash = parsedCrash;
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

function buildLegacySnapshot(raw: LogmeterSnapshotRaw, maxLogItems: number = 0): LogmeterSnapshot {
  const buckets = 10;
  const updatedAtStr = raw.updatedAt || raw.lastRegDt || null;
  const updatedAtMs = updatedAtStr ? Date.parse(updatedAtStr) : NaN;
  const nowSec = Math.floor(Date.now() / 1000);
  const lastUpdated = Number.isFinite(updatedAtMs) ? Math.floor(updatedAtMs / 1000) : nowSec;
  const totalLog = Math.max(0, raw.logCount || 0);
  const totalError = Math.max(0, (raw.errorCount || 0) + (raw.jsErrorCount || 0));
  const totalCrash = Math.max(0, raw.crashCount || 0);
  const todayCrash = Math.max(0, raw.todayCrashCount || 0);
  const todayError = Math.max(0, raw.todayErrorCount || 0);
  const allowedLogOnly = Math.max(0, totalLog - totalError - totalCrash);
  const logOnly =
    maxLogItems && maxLogItems > 0 ? Math.min(allowedLogOnly, maxLogItems) : allowedLogOnly;

  // spread counts across timeline buckets (skip when all zero)
  const timeline: LogmeterTimelinePoint[] = [];
  if (totalLog + totalError + totalCrash > 0) {
    for (let i = 0; i < buckets; i += 1) {
      const logPortion = Math.floor(totalLog / buckets) + (i < totalLog % buckets ? 1 : 0);
      const errPortion = Math.floor(totalError / buckets) + (i < totalError % buckets ? 1 : 0);
      const crashPortion = Math.floor(totalCrash / buckets) + (i < totalCrash % buckets ? 1 : 0);
      timeline.push({
        timestamp: nowSec - (buckets - i) + 1,
        logCount: logPortion,
        errorCount: errPortion,
        crashCount: crashPortion,
      });
    }
  }

  // build realtime events; keep counts exact (no synthetic logs)
  const events: string[] = [];
  for (let i = 0; i < totalCrash; i += 1) events.push("2");
  for (let i = 0; i < totalError; i += 1) events.push("1");
  for (let i = 0; i < logOnly; i += 1) events.push("0");
  // total cap with priority: crash > error > log
  if (maxLogItems && maxLogItems > 0 && events.length > maxLogItems) {
    const crashes = events.filter((e) => e === "2");
    const errors = events.filter((e) => e === "1");
    const logs = events.filter((e) => e === "0");
    const remaining = Math.max(0, maxLogItems - (crashes.length + errors.length));
    const trimmedLogs = logs.slice(0, remaining);
    events.length = 0;
    events.push(...crashes.slice(0, maxLogItems));
    const spaceAfterCrash = Math.max(0, maxLogItems - events.length);
    events.push(...errors.slice(0, spaceAfterCrash));
    const spaceAfterError = Math.max(0, maxLogItems - events.length);
    events.push(...trimmedLogs.slice(0, spaceAfterError));
  }
  // no events when nothing arrived
  if (events.length === 0 && totalLog + totalError + totalCrash > 0) events.push("0");

  return {
    rt: events.join(""),
    biInfo: {
      appLogCount: totalLog,
      appErrorCount: totalError,
      appCrashCount: totalCrash,
    },
    todayErrorCount: todayError,
    todayCrashCount: todayCrash,
    updatedAt: updatedAtStr,
    logmeterAvg: {
      error: Math.floor(totalError / Math.max(1, buckets)),
      crash: Math.floor(totalCrash / Math.max(1, buckets)),
    },
    stackMaxValues: normalizeStackMaxValues(raw),
    stackMaxAverages: normalizeStackAverages(raw),
    timeline,
    weights: {
      logWeight: 2,
      errorWeight: 10_000,
      crashWeight: 50,
    },
    windowMinutes: 10,
    throttleMs: 10,
    lastUpdated,
  };
}

export async function getLogmeterSnapshot(
  params: LogmeterSnapshotRequest,
  signal?: AbortSignal,
): Promise<LogmeterSnapshot> {
  const body = {
    applicationId: params.applicationId,
    serverType: params.serverType ?? null,
  };

  const response = await fetch(`${API_URL}/widget/Logmeter/Snapshot`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `Request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as LogmeterSnapshotEnvelope;
  if (payload.code !== 200 || !payload.data) {
    throw new Error(payload.message ?? "로그미터 데이터를 불러오지 못했습니다.");
  }

  return buildLegacySnapshot(payload.data, params.maxLogItems);
}

export type LogmeterTroubleListRequest = {
  applicationId: number;
  osType?: string | null;
  dateType?: "DAY" | "WEEK" | "MONTH";
  troubleType: FavoritesTroubleType;
  limit?: number;
  offset?: number;
  tmzutc: number;
};

export type LogmeterTroubleDetailRequest = {
  applicationId: number;
  logTm: number;
  deviceId: string;
  memUsage: number;
  tmzutc: number;
};

export async function getLogmeterTroubleList(
  params: LogmeterTroubleListRequest,
  signal?: AbortSignal,
): Promise<FavoritesTroubleListResponse> {
  const body = {
    applicationId: params.applicationId,
    osType: params.osType ?? null,
    dateType: params.dateType ?? "DAY",
    troubleType: params.troubleType,
    limit: params.limit ?? 200,
    offset: params.offset ?? 0,
    tmzutc: params.tmzutc,
  };

  const response = await fetch(`${API_URL}/widget/Logmeter/TroubleList`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `Logmeter TroubleList 요청이 실패했습니다. (HTTP ${response.status})`);
  }

  const payload = (await response.json()) as FavoritesTroubleListResponse;
  if (payload.code !== 200) {
    throw new Error(payload.message ?? "Logmeter TroubleList 데이터를 불러오지 못했습니다.");
  }

  return payload;
}

export async function getLogmeterTroubleDetail(
  params: LogmeterTroubleDetailRequest,
  signal?: AbortSignal,
): Promise<FavoritesTroubleDetailResponse> {
  const body = {
    applicationId: params.applicationId,
    logTm: params.logTm,
    deviceId: params.deviceId,
    memUsage: params.memUsage,
    tmzutc: params.tmzutc,
  };

  const response = await fetch(`${API_URL}/widget/Logmeter/TroubleDetail`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `Logmeter TroubleDetail 요청이 실패했습니다. (HTTP ${response.status})`);
  }

  const payload = (await response.json()) as FavoritesTroubleDetailResponse;
  if (payload.code !== 200) {
    throw new Error(payload.message ?? "Logmeter TroubleDetail 데이터를 불러오지 못했습니다.");
  }

  return payload;
}
