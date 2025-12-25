"use client";

import { API_URL } from "../../../settings";

export type UpdateUserInfoPayload = {
  userNo: number;
  widgets: number[];
};

type UpdateUserInfoResult = {
  code: number;
  userNo?: number;
  widgets?: number[];
  message?: string;
};

export async function updateUserInfo(payload: UpdateUserInfoPayload): Promise<number[]> {
  const bases = new Set<string>();
  if (API_URL) {
    bases.add(API_URL);
  }
  if (typeof window !== "undefined") {
    bases.add(window.location.origin);
  }

  let lastError: unknown;
  for (const base of bases) {
    const url = `${base}/UpdateUserInfo`;
    try {
      const response = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        if (response.status === 401) {
          lastError = new Error("로그인 세션이 만료되었습니다. 다시 로그인한 후 저장해주세요.");
          continue;
        }
        const fallback = await response.text().catch(() => "");
        lastError = new Error(fallback || `UpdateUserInfo failed with status ${response.status}`);
        continue;
      }

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        const text = await response.text().catch(() => "");
        lastError = new Error(text || "응답 형식이 올바르지 않습니다.");
        continue;
      }

      const data = (await response.json().catch(() => null)) as UpdateUserInfoResult | null;
      if (data && data.code === 200) {
        if (Array.isArray(data.widgets) && data.widgets.length > 0) {
          return data.widgets
            .map((value) => Number(value))
            .filter((value) => Number.isFinite(value) && value > 0);
        }
        return payload.widgets;
      }

      lastError = new Error(data?.message ?? "위젯 설정을 저장하지 못했습니다.");
    } catch (error) {
      lastError = error;
      continue;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("위젯 설정을 저장하지 못했습니다.");
}
