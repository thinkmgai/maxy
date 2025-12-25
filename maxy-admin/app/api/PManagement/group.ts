import { API_URL } from "../../../settings";

export type ManagementGroup = {
  group: number;
  groupName: string;
  groupDescription: string;
};

export type ManagementGroupDetail = {
  group: number;
  groupName: string;
  groupDescription: string;
  userNos: number[];
  applicationIds: number[];
};

export type ManagementGroupListRequest = {
  keyword?: string | null;
  applicationId?: number | null;
};

export type ManagementGroupListResponse = {
  code: number;
  groups: ManagementGroup[];
  totalCount: number;
  message?: string;
};

export type ManagementGroupCreateRequest = {
  groupName: string;
  groupDescription?: string;
  userNos: number[];
  applicationIds: number[];
};

export type ManagementGroupUpdateRequest = {
  group: number;
  groupName?: string;
  groupDescription?: string;
  userNos?: number[];
  applicationIds?: number[];
};

export type ManagementGroupDeleteRequest = {
  groups: number[];
};

export type ManagementGroupMutationResponse = {
  code: number;
  group?: ManagementGroup;
  affected?: number;
  message?: string;
};

export type ManagementGroupDetailResponse = {
  code: number;
  detail?: ManagementGroupDetail;
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

export function fetchManagementGroups(
  payload: ManagementGroupListRequest = {},
  options?: RequestOptions,
) {
  return postJSON<ManagementGroupListRequest, ManagementGroupListResponse>(
    "/PManagement/Group/list",
    payload,
    options,
  );
}

export function createManagementGroup(
  payload: ManagementGroupCreateRequest,
  options?: RequestOptions,
) {
  return postJSON<ManagementGroupCreateRequest, ManagementGroupMutationResponse>(
    "/PManagement/Group/create",
    payload,
    options,
  );
}

export function updateManagementGroup(
  payload: ManagementGroupUpdateRequest,
  options?: RequestOptions,
) {
  return postJSON<ManagementGroupUpdateRequest, ManagementGroupMutationResponse>(
    "/PManagement/Group/update",
    payload,
    options,
  );
}

export function deleteManagementGroups(
  payload: ManagementGroupDeleteRequest,
  options?: RequestOptions,
) {
  return postJSON<ManagementGroupDeleteRequest, ManagementGroupMutationResponse>(
    "/PManagement/Group/delete",
    payload,
    options,
  );
}

export function fetchManagementGroupDetail(
  group: number,
  options?: RequestOptions,
) {
  return postJSON<
    { group: number },
    ManagementGroupDetailResponse
  >("/PManagement/Group/detail", { group }, options);
}
