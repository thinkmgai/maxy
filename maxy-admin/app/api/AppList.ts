'use client';

import { API_URL } from "../../settings";

type AppListRequest = {
  userNo: number;
  osType: string;
};

export type ApplicationSummary = {
  applicationId: number;
  appName: string;
  packageId: string;
};

type AppListResponse = {
  code: number;
  applicationList: ApplicationSummary[];
  message: string;
};

export async function AppList({
  userNo,
  osType,
}: AppListRequest): Promise<AppListResponse> {
  const response = await fetch(`${API_URL}/AppList`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ userNo, osType }),
  });

  if (!response.ok) {
    throw new Error(`Failed to load application list: ${response.status}`);
  }

  return response.json();
}
