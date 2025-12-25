import { API_URL } from "../../../settings";

export type AppSetting = {
  applicationId: number;
  appName: string;
  packageId: string;
  serverType: string;
  fullMsg: boolean;
  pageLogPeriod: number;
  loggingRate: number;
  order: number;
};

export type AppSettingListResponse = {
  code: number;
  appSettings: AppSetting[];
  message?: string;
};

export type AppSettingCreateRequest = {
  appName: string;
  packageId: string;
  serverType: string;
  fullMsg: boolean;
  pageLogPeriod: number;
  loggingRate: number;
  order: number;
};

export type AppSettingUpdateRequest = {
  applicationId: number;
  appName?: string;
  packageId?: string;
  serverType?: string;
  fullMsg?: boolean;
  pageLogPeriod?: number;
  loggingRate?: number;
  order?: number;
};

export type AppSettingDeleteRequest = {
  applicationIds: number[];
};

export type AppSettingMutationResponse = {
  code: number;
  appSetting?: AppSetting;
  affected?: number;
  message?: string;
};

type RequestOptions = {
  signal?: AbortSignal;
};

async function postJSON<TRequest, TResponse>(
  path: string,
  payload: TRequest,
  options: RequestOptions = {},
): Promise<TResponse> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal: options.signal,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed: ${response.status}`);
  }

  return response.json();
}

export async function fetchAppSettings(options: RequestOptions = {}) {
  const response = await fetch(`${API_URL}/PManagement/AppSettings/list`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    signal: options.signal,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed: ${response.status}`);
  }

  return response.json() as Promise<AppSettingListResponse>;
}

export function createAppSetting(payload: AppSettingCreateRequest, options?: RequestOptions) {
  return postJSON<AppSettingCreateRequest, AppSettingMutationResponse>(
    "/PManagement/AppSettings/create",
    payload,
    options,
  );
}

export function deleteAppSettings(payload: AppSettingDeleteRequest, options?: RequestOptions) {
  return postJSON<AppSettingDeleteRequest, AppSettingMutationResponse>(
    "/PManagement/AppSettings/delete",
    payload,
    options,
  );
}

export function updateAppSetting(payload: AppSettingUpdateRequest, options?: RequestOptions) {
  return postJSON<AppSettingUpdateRequest, AppSettingMutationResponse>(
    "/PManagement/AppSettings/update",
    payload,
    options,
  );
}
