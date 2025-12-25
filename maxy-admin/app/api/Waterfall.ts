"use client";

import { API_URL } from "../../settings";

export type WaterfallPerformanceSpan = {
  label: string;
  start: number;
  duration: number;
};

export type WaterfallPerformanceData = {
  resource: WaterfallPerformanceSpan[];
  longTask: WaterfallPerformanceSpan[];
  clickAction: WaterfallPerformanceSpan[];
};

export type WaterfallTimingEntry = {
  key: string;
  label: string;
  value: number;
  unit: string;
};

export type WaterfallResourceEntry = {
  id: string;
  name: string;
  entryType: string;
  initiatorType: string;
  startTime: number;
  duration: number;
  transferSize: number;
  encodedBodySize: number;
  decodedBodySize: number;
  status: number;
  domain: string;
  resourceType: string;
  sizeLabel: string;
  timelineLabel: string;
  markers: string[];
};

export type WaterfallErrorEntry = {
  id: string;
  logTm: number;
  waterfallTm: number;
  name: string;
  message: string;
  status: number;
  initiatorType: string;
};

export type WaterfallDetailResponse = {
  code: number;
  message: string;
  resourceInfoData: WaterfallResourceEntry[];
  performanceData: WaterfallPerformanceData;
  timingData: WaterfallTimingEntry[];
  errorData: WaterfallErrorEntry[];
};

export type WaterfallDetailRequest = {
  applicationId: string | number;
  deviceId?: string | null;
  osType?: string | null;
  reqUrl?: string | null;
  mxPageId?: string | null;
  logTm?: number | null;
  pageStartTm?: number | null;
  pageEndTm?: number | null;
  limit?: number;
};

type WaterfallDetailEnvelope = {
  code: number;
  message?: string;
  resourceInfoData: WaterfallResourceEntry[];
  performanceData: WaterfallPerformanceData;
  timingData: WaterfallTimingEntry[];
  errorData: WaterfallErrorEntry[];
};

export async function getWaterfallDetail(
  request: WaterfallDetailRequest,
  signal?: AbortSignal,
): Promise<WaterfallDetailResponse> {
  const payload = {
    packageNm: String(request.applicationId),
    deviceId: request.deviceId ?? null,
    osType: request.osType ?? null,
    reqUrl: request.reqUrl ?? null,
    mxPageId: request.mxPageId ?? null,
    logTm: request.logTm ?? null,
    pageStartTm: request.pageStartTm ?? null,
    pageEndTm: request.pageEndTm ?? null,
    limit: request.limit ?? 80,
  };

  const response = await fetch(`${API_URL}/Waterfall/Detail`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `Request failed with status ${response.status}`);
  }

  const envelope = (await response.json()) as WaterfallDetailEnvelope;
  if (envelope.code !== 200) {
    throw new Error(envelope.message ?? "Waterfall 데이터를 가져오지 못했습니다.");
  }

  return {
    code: envelope.code,
    message: envelope.message ?? "Success",
    resourceInfoData: envelope.resourceInfoData ?? [],
    performanceData: envelope.performanceData ?? {
      resource: [],
      longTask: [],
      clickAction: [],
    },
    timingData: envelope.timingData ?? [],
    errorData: envelope.errorData ?? [],
  };
}
