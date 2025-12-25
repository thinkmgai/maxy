import { API_URL } from "../../../settings";

export type ManagementUserGroupApplication = {
  applicationId: number;
  appName: string;
};

export type ManagementUserGroup = {
  group: number;
  groupName: string;
  applications: ManagementUserGroupApplication[];
};

export type ManagementUser = {
  userNo: number;
  userId: string;
  userName: string;
  email: string;
  level: number;
  status: number;
  createdAt: string;
  updatedAt?: string;
  expiredAt?: string;
  groups?: ManagementUserGroup[];
};

export type ManagementUserListResponse = {
  code: number;
  users: ManagementUser[];
  totalCount: number;
  message?: string;
};

export type ManagementUserListRequest = {
  keyword?: string | null;
  status?: number | null;
};

export type ManagementUserCreateRequest = {
  userId: string;
  userName: string;
  email: string;
  level: number;
  status?: number;
  password: string;
};

export type ManagementUserUpdateRequest = {
  userNo: number;
  userName?: string;
  email?: string;
  level?: number;
  status?: number;
};

export type ManagementUserDeleteRequest = {
  userNos: number[];
};

export type ManagementUserMutationResponse = {
  code: number;
  user?: ManagementUser;
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

export function fetchManagementUsers(
  payload: ManagementUserListRequest = {},
  options?: RequestOptions,
) {
  return postJSON<ManagementUserListRequest, ManagementUserListResponse>(
    "/PManagement/User/list",
    payload,
    options,
  );
}

export function createManagementUser(payload: ManagementUserCreateRequest, options?: RequestOptions) {
  return postJSON<ManagementUserCreateRequest, ManagementUserMutationResponse>(
    "/PManagement/User/create",
    payload,
    options,
  );
}

export function updateManagementUser(payload: ManagementUserUpdateRequest, options?: RequestOptions) {
  return postJSON<ManagementUserUpdateRequest, ManagementUserMutationResponse>(
    "/PManagement/User/update",
    payload,
    options,
  );
}

export function deleteManagementUsers(payload: ManagementUserDeleteRequest, options?: RequestOptions) {
  return postJSON<ManagementUserDeleteRequest, ManagementUserMutationResponse>(
    "/PManagement/User/delete",
    payload,
    options,
  );
}
