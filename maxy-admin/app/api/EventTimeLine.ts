"use client";

import { API_URL } from "../../settings";

export type EventTimeLineLog = {
  logType: number;
  logTm: number;
  intervaltime: number;
  aliasValue: string;
  resMsg: string;
};

export type EventTimeLineResponse = {
  code: number;
  message: string;
  logList: EventTimeLineLog[];
};

export type EventTimeLineRequest = {
  applicationId: string | number;
  deviceId: string;
  mxPageId?: string | null;
  from: number;
  to: number;
  limit?: number;
};

type EventTimeLineEnvelope = {
  code: number;
  message?: string;
  logList?: EventTimeLineLog[];
};

export async function getEventTimeLine(
  request: EventTimeLineRequest,
  signal?: AbortSignal,
): Promise<EventTimeLineResponse> {
  const payload = {
    packageNm: String(request.applicationId),
    deviceId: request.deviceId,
    mxPageId: request.mxPageId ?? null,
    from: request.from,
    to: request.to,
    limit: request.limit ?? 800,
  };

  const response = await fetch(`${API_URL}/Waterfall/EventTimeLine`, {
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

  const envelope = (await response.json()) as EventTimeLineEnvelope;
  if (envelope.code !== 200) {
    throw new Error(envelope.message ?? "Event Time Line 데이터를 가져오지 못했습니다.");
  }

  return {
    code: envelope.code,
    message: envelope.message ?? "Success",
    logList: envelope.logList ?? [],
  };
}

