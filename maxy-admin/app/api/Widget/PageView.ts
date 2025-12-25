"use client";

import { API_URL } from "../../../settings";

export type PageViewDateType = "DAY" | "WEEK" | "MONTH";

export type PageViewInfoListItem = {
  pageURL: string;
  count: number;
  type: number;
};

type PageViewInfoListEnvelope = {
  code: number;
  message?: string;
  list?: PageViewInfoListItem[];
};

export type PageViewInfoDetailPoint = {
  time: string;
  viewCount: number;
  viewer: number;
};

type PageViewInfoDetailEnvelope = {
  code: number;
  message?: string;
  list?: PageViewInfoDetailPoint[];
};

function normaliseDateType(value?: PageViewDateType | string | null): PageViewDateType {
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
  if (lower === "all" || lower === "전체") {
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

export async function getPageViewInfoList(
  params: {
    applicationId: string;
    osType?: string | null;
    dateType?: PageViewDateType | string | null;
    size?: number;
    tmzutc: number;
  },
  signal?: AbortSignal,
): Promise<PageViewInfoListItem[]> {
  const body = {
    applicationId: params.applicationId,
    osType: normaliseOsType(params.osType),
    dateType: normaliseDateType(params.dateType),
    size: Math.min(Math.max(params.size ?? 10, 1), 60),
    tmzutc: params.tmzutc,
  };

  const response = await fetch(`${API_URL}/widget/PageView/InfoList`, {
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

  const payload = (await response.json()) as PageViewInfoListEnvelope;
  if (payload.code !== 200) {
    throw new Error(payload.message ?? "Page View 목록을 불러오지 못했습니다.");
  }
  if (!Array.isArray(payload.list)) {
    return [];
  }
  return payload.list;
}

export async function getPageViewInfoDetail(
  params: {
    applicationId: string;
    osType?: string | null;
    dateType?: PageViewDateType | string | null;
    reqUrl: string;
    tmzutc: number;
  },
  signal?: AbortSignal,
): Promise<PageViewInfoDetailPoint[]> {
  const body = {
    applicationId: params.applicationId,
    osType: normaliseOsType(params.osType),
    dateType: normaliseDateType(params.dateType),
    reqUrl: params.reqUrl,
    tmzutc: params.tmzutc,
  };

  const response = await fetch(`${API_URL}/widget/PageView/InfoDetail`, {
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

  const payload = (await response.json()) as PageViewInfoDetailEnvelope;
  if (payload.code !== 200) {
    throw new Error(payload.message ?? "상세 데이터를 불러오지 못했습니다.");
  }
  if (!Array.isArray(payload.list)) {
    return [];
  }
  return payload.list;
}
