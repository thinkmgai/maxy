"use client";

import { API_URL } from "../../../settings";

export type AccessibilityDateType = "DAY" | "WEEK" | "MONTH";

export type AccessibilityPoint = {
  key: number;
  value: number;
};

export type AccessibilitySeries = {
  login: AccessibilityPoint[];
  noLogin: AccessibilityPoint[];
  dau: AccessibilityPoint[];
  dauAvg: number;
  totals: {
    login: number;
    noLogin: number;
    dau: number;
  };
  lastUpdated: number;
  dateType: AccessibilityDateType;
};

type AccessibilitySeriesEnvelope = {
  code: number;
  message?: string;
  result?: AccessibilitySeries;
};

function normaliseDateType(value?: AccessibilityDateType | string | null): AccessibilityDateType {
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

export async function getAccessibilitySeries(
  params: {
    applicationId: string;
    osType?: string | null;
    dateType?: AccessibilityDateType | string | null;
    tmzutc: number;
  },
  signal?: AbortSignal,
): Promise<AccessibilitySeries> {
  const body = {
    applicationId: params.applicationId,
    osType: normaliseOsType(params.osType),
    dateType: normaliseDateType(params.dateType),
    tmzutc: params.tmzutc,
  };

  const response = await fetch(`${API_URL}/widget/Accessibility/Series`, {
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

  const payload = (await response.json()) as AccessibilitySeriesEnvelope;
  if (payload.code !== 200 || !payload.result) {
    throw new Error(payload.message ?? "Accessibility 데이터를 불러오지 못했습니다.");
  }
  return payload.result;
}
