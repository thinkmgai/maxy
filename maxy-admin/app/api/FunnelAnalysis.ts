'use client';

import { API_URL } from "../../settings";

export type FunnelListRequest = {
  applicationId: number;
  userId: string;
  type: number;
};

export type FunnelGroup = {
  id?: number | null;
  name?: string | null;
  description?: string | null;
  condition?: string | FunnelGroupConditionGroup[] | null;
};

export type FunnelGroupConditionValue =
  | string
  | number
  | boolean
  | Array<string | number | boolean>
  | null;

export type FunnelGroupConditionItem = {
  order?: number | null;
  field?: string | null;
  id?: number | null;
  operator?: number | null;
  type?: "value" | "count" | null;
  value?: FunnelGroupConditionValue;
  categoryId?: number | null;
  fieldId?: number | null;
  defaults?: Array<string | number | boolean> | null;
};

export type FunnelGroupConditionGroup = {
  order?: number | null;
  conditions?: FunnelGroupConditionItem[] | null;
};

export type ConditionSubOption = {
  order: number;
  id: number;
  name: string;
  default?: Array<string | number | boolean> | null;
};

export type ConditionCategoryOption = {
  order: number;
  id: number;
  name: string;
  enable_step?: boolean | null;
  sub: ConditionSubOption[];
};

export type ConditionCatalog = {
  event?: ConditionCategoryOption | null;
  standard?: ConditionCategoryOption[] | null;
};

export type ConditionCatalogRequest = {
  userId: string;
};

type ConditionCatalogResponse = {
  code: number;
  message?: string | null;
  data: ConditionCatalog;
};

export type FilterOption = {
  order: number;
  id: number;
  name: string;
};

export type FilterCatalog = {
  options: FilterOption[];
};

export type FilterCatalogRequest = {
  userId: string;
};

type FilterCatalogResponse = {
  code: number;
  message?: string | null;
  data: FilterCatalog;
};

export type FunnelPeriodRange = {
  type: "range";
  from: string;
  to: string;
};

export type FunnelPeriodDay = {
  type: "day";
  days: number;
};

export type FunnelPeriodLastWeek = {
  type: "lastweek";
};

export type FunnelPeriodLastWeekWorkday = {
  type: "lastweek-workday";
};

export type FunnelPeriodValue =
  | FunnelPeriodRange
  | FunnelPeriodDay
  | FunnelPeriodLastWeek
  | FunnelPeriodLastWeekWorkday;

export type FunnelPeriod =
  | FunnelPeriodValue
  | {
      from?: string | null;
      to?: string | null;
    }
  | number
  | string
  | null;

export type FunnelListStep = {
  id: number;
  stepnm: string;
  order: number;
  condition?: FunnelGroupConditionGroup[] | string | null;
};

export type FunnelSummary = {
  id: number;
  name: string;
  description?: string | null;
  type?: number | null;
  route?: number | null;
  order?: number | null;
  applicationId?: number | null;
  userId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  group?: FunnelGroup[] | null;
  period?: FunnelPeriod | null;
  chart?: number | number[] | string | string[] | null;
  step?: FunnelListStep[] | null;
};

type FunnelListResponse = {
  code: number;
  message?: string;
  list: FunnelSummary[];
};

const parseFunnelPeriodValue = (
  period: FunnelPeriod | string | number | null | undefined,
): FunnelPeriod | null => {
  if (period === null || period === undefined) {
    return null;
  }
  if (typeof period === "number") {
    return period;
  }
  if (typeof period === "string") {
    const trimmed = period.trim();
    if (!trimmed) {
      return null;
    }
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        return JSON.parse(trimmed) as FunnelPeriod;
      } catch {
        return trimmed;
      }
    }
    const numeric = Number(trimmed);
    return Number.isFinite(numeric) ? numeric : trimmed;
  }
  return period;
};

export type FunnelDetailRequest = {
  id: number;
  group: string;
  period: FunnelPeriodRange;
  route?: number | null;
};

export type FunnelDetailStepGroup = {
  id: number;
  order: number;
  active_count: number;
  dropoff_count?: number;
  conversion_rate?: number;
  dropoff_rate?: number;
  entrance_count?: number;
  skipped_count?: number;
  name?: string | null;
  color?: string | null;
};

export type FunnelDetailStep = {
  id: number;
  stepnm: string;
  order: number;
  groups: FunnelDetailStepGroup[];
  condition?: FunnelGroupConditionGroup[] | string | null;
  period?: FunnelPeriod | string | number | null;
};

type FunnelDetailResponse = {
  code: number;
  message?: string;
  list: FunnelDetailStep[];
};

export type FunnelAddEditRequest = {
  id: number;
  name?: string;
  period: FunnelPeriodValue;
  route: number;
  group: FunnelGroup[];
  step: FunnelDetailStep[];
  chart: number;
  userId: string;
};

type FunnelAddEditResponse = {
  code: number;
  msg?: string | null;
  message?: string | null;
};

export type GroupListRequest = {
  userId: string;
};

type GroupListResponse = {
  code: number;
  message?: string;
  list: FunnelGroup[];
};

export type GroupAddEditRequest = {
  id: number;
  name: string;
  description?: string | null;
  condition: FunnelGroupConditionGroup[];
  userId: string;
};

type GroupAddEditResponse = {
  code: number;
  message?: string | null;
  msg?: string | null;
};

export async function getFunnelList(
  params: FunnelListRequest,
  signal?: AbortSignal
): Promise<FunnelSummary[]> {
  const response = await fetch(`${API_URL}/PFunnelAnalysis/FunnelList`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
    signal,
  });

  if (!response.ok) {
    const errorMessage = await response.text().catch(() => "");
    throw new Error(errorMessage || `Failed to fetch funnel list: ${response.status}`);
  }

  const payload = (await response.json()) as FunnelListResponse;

  if (payload.code !== 200) {
    throw new Error(payload.message ?? "퍼널 목록을 불러오지 못했습니다.");
  }

  return payload.list ?? [];
}

export async function getFunnelDetail(
  params: FunnelDetailRequest,
  signal?: AbortSignal
): Promise<FunnelDetailStep[]> {
  const response = await fetch(`${API_URL}/PFunnelAnalysis/FunnelDetail`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
    signal,
  });

  if (!response.ok) {
    const errorMessage = await response.text().catch(() => "");
    throw new Error(errorMessage || `Failed to fetch funnel detail: ${response.status}`);
  }

  const payload = (await response.json()) as FunnelDetailResponse;

  if (payload.code !== 200) {
    throw new Error(payload.message ?? "Unable to load funnel detail.");
  }

  const list = (payload.list ?? []).map((item) => ({
    ...item,
    period: parseFunnelPeriodValue(item.period ?? null),
  }));

  return list;
}

export async function saveFunnel(params: FunnelAddEditRequest): Promise<void> {
  const response = await fetch(`${API_URL}/PFunnelAnalysis/FunnelAddEdit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorMessage = await response.text().catch(() => "");
    throw new Error(errorMessage || `Failed to save funnel: ${response.status}`);
  }

  const payload = (await response.json()) as FunnelAddEditResponse;

  if (payload.code !== 200) {
    throw new Error(payload.message ?? payload.msg ?? "Unable to save funnel.");
  }
}

export async function getGroupList(
  params: GroupListRequest,
  signal?: AbortSignal
): Promise<FunnelGroup[]> {
  const response = await fetch(`${API_URL}/PFunnelAnalysis/GroupList`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
    signal,
  });

  if (!response.ok) {
    const errorMessage = await response.text().catch(() => "");
    throw new Error(errorMessage || `Failed to fetch group list: ${response.status}`);
  }

  const payload = (await response.json()) as GroupListResponse;

  if (payload.code !== 200) {
    throw new Error(payload.message ?? "그룹 목록을 불러오지 못했습니다.");
  }

  return payload.list ?? [];
}

export async function getConditionCatalog(
  params: ConditionCatalogRequest,
  signal?: AbortSignal
): Promise<ConditionCatalog> {
  const response = await fetch(`${API_URL}/PFunnelAnalysis/ConditionCatalog`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
    signal,
  });

  if (!response.ok) {
    const errorMessage = await response.text().catch(() => "");
    throw new Error(errorMessage || `Failed to fetch condition catalog: ${response.status}`);
  }

  const payload = (await response.json()) as ConditionCatalogResponse;

  if (payload.code !== 200) {
    throw new Error(payload.message ?? "조건 항목을 불러오지 못했습니다.");
  }

  return payload.data;
}

export async function getFilterCatalog(
  params: FilterCatalogRequest,
  signal?: AbortSignal
): Promise<FilterCatalog> {
  const response = await fetch(`${API_URL}/PFunnelAnalysis/FilterCatalog`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Filter catalog request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as FilterCatalogResponse;

  if (payload.code !== 200) {
    throw new Error(payload.message ?? "필터 조건을 불러오지 못했습니다.");
  }

  return payload.data;
}

export type FunnelOrderChangeRequest = {
  orgId: number;
  orgOrder: number;
  destId: number;
  destOrder: number;
};

type FunnelOrderChangeResponse = {
  code: number;
  message?: string;
};

export async function changeFunnelOrder(params: FunnelOrderChangeRequest): Promise<void> {
  const response = await fetch(`${API_URL}/PFunnelAnalysis/FunnelListChangeOrder`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    if (response.status === 404) {
      return;
    }
    const errorMessage = await response.text().catch(() => "");
    throw new Error(errorMessage || `Failed to update funnel order: ${response.status}`);
  }

  const payload = (await response.json()) as FunnelOrderChangeResponse;

  if (payload.code !== 200) {
    throw new Error(payload.message ?? "Unable to update funnel order.");
  }
}

export async function saveFunnelGroup(params: GroupAddEditRequest): Promise<void> {
  const response = await fetch(`${API_URL}/PFunnelAnalysis/GroupAddEdit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...params,
      description: params.description ?? "",
    }),
  });

  if (!response.ok) {
    const errorMessage = await response.text().catch(() => "");
    throw new Error(errorMessage || `Failed to save funnel group: ${response.status}`);
  }

  const payload = (await response.json()) as GroupAddEditResponse;

  if (payload.code !== 200) {
    throw new Error(payload.message ?? payload.msg ?? "Unable to save funnel group.");
  }
}

export type GroupDeleteRequest = {
  id: number;
};

type GroupDeleteResponse = {
  code: number;
  msg?: string | null;
  message?: string | null;
};

export async function deleteFunnelGroup(params: GroupDeleteRequest): Promise<void> {
  const response = await fetch(`${API_URL}/PFunnelAnalysis/GroupDelete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    if (response.status === 404) {
      return;
    }
    const errorMessage = await response.text().catch(() => "");
    throw new Error(errorMessage || `Failed to delete funnel group: ${response.status}`);
  }

  const payload = (await response.json()) as GroupDeleteResponse;

  if (payload.code !== 200) {
    throw new Error(payload.message ?? payload.msg ?? "Unable to delete funnel group.");
  }
}

export type DiscoverGroupRequest = {
  userId: string;
  condition: FunnelGroupConditionGroup[];
  period?: { from: string; to: string } | null;
};

type DiscoverGroupResponse = {
  code: number;
  data?:
    | {
        findCount?: number | string | null;
        totalCount?: number | string | null;
        rate?: number | string | null;
        sql?: string | null;
        params?: unknown;
        preview?: string | null;
        message?: string | null;
        msg?: string | null;
        data?: {
          findCount?: number | string | null;
          totalCount?: number | string | null;
          rate?: number | string | null;
          sql?: string | null;
          params?: unknown;
          preview?: string | null;
          message?: string | null;
          msg?: string | null;
        } | null;
      }
    | null;
  message?: string | null;
  msg?: string | null;
};

export type DiscoverGroupResult = {
  findCount: number;
  totalCount: number | null;
  rate: number;
};

const parseDiscoverGroupPayload = (payload: DiscoverGroupResponse["data"]) => {
  if (!payload) {
    return null;
  }
  const nested = typeof payload.data === "object" && payload.data !== null ? payload.data : null;
  return nested ?? payload;
};

const parseNumberSafe = (value: unknown, fallback = 0): number => {
  const numeric = typeof value === "string" ? Number.parseFloat(value) : Number(value ?? fallback);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const parseNumberOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined) {
    return null;
  }
  const numeric = typeof value === "string" ? Number.parseFloat(value) : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

export async function discoverGroup(
  params: DiscoverGroupRequest,
  signal?: AbortSignal,
): Promise<DiscoverGroupResult> {
  const response = await fetch(`${API_URL}/PFunnelAnalysis/DiscoverGroupPreview`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userId: params.userId,
      condition: params.condition ?? [],
      period: params.period ?? null,
    }),
    signal,
  });

  if (!response.ok) {
    const errorMessage = await response.text().catch(() => "");
    throw new Error(errorMessage || `Failed to discover funnel group: ${response.status}`);
  }

  const payload = (await response.json()) as DiscoverGroupResponse;
  const parsed = parseDiscoverGroupPayload(payload.data);
  if (payload.code !== 200) {
    const dataMessage = parsed?.message ?? parsed?.msg;
    throw new Error(payload.message ?? payload.msg ?? dataMessage ?? "Unable to discover funnel group.");
  }

  const findCount = parseNumberSafe(parsed?.findCount, 0);
  const totalCount = parseNumberOrNull(parsed?.totalCount);
  const rateValue = parseNumberSafe(parsed?.rate, 0);

  return {
    findCount,
    totalCount,
    rate: rateValue,
  };
}

export type DiscoverStepRequest = {
  userId: string;
  condition: Array<{
    id: number | null;
    stepnm: string;
    order: number;
    condition: FunnelGroupConditionGroup[];
  }>;
  period?: { from: string; to: string } | null;
};

type DiscoverStepResponse = {
  code: number;
  data?:
    | {
        findCount?: number | string | null;
        totalCount?: number | string | null;
        rate?: number | string | null;
        data?: {
          findCount?: number | string | null;
          totalCount?: number | string | null;
          rate?: number | string | null;
        } | null;
      }
    | null;
  message?: string | null;
  msg?: string | null;
};

export async function discoverStep(
  params: DiscoverStepRequest,
  signal?: AbortSignal,
): Promise<DiscoverGroupResult> {
  const response = await fetch(`${API_URL}/PFunnelAnalysis/DiscoverStep`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
    signal,
  });

  if (!response.ok) {
    const errorMessage = await response.text().catch(() => "");
    throw new Error(errorMessage || `Failed to discover funnel step: ${response.status}`);
  }

  const payload = (await response.json()) as DiscoverStepResponse;
  const parsed = parseDiscoverGroupPayload(payload.data);
  if (payload.code !== 200) {
    const dataMessage = parsed?.message ?? parsed?.msg;
    throw new Error(payload.message ?? payload.msg ?? dataMessage ?? "Unable to discover funnel step.");
  }

  const findCount = parseNumberSafe(parsed?.findCount, 0);
  const totalCount = parseNumberOrNull(parsed?.totalCount);
  const rateValue = parseNumberSafe(parsed?.rate, 0);

  return {
    findCount,
    totalCount,
    rate: rateValue,
  };
}

export type FunnelDeleteRequest = {
  id: number;
};

type FunnelDeleteResponse = {
  code: number;
  msg?: string | null;
  message?: string | null;
};

export async function deleteFunnel(params: FunnelDeleteRequest): Promise<void> {
  const response = await fetch(`${API_URL}/PFunnelAnalysis/FunnelDelete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    if (response.status === 404) {
      return;
    }
    const errorMessage = await response.text().catch(() => "");
    throw new Error(errorMessage || `Failed to delete funnel: ${response.status}`);
  }

  const payload = (await response.json()) as FunnelDeleteResponse;

  if (payload.code !== 200) {
    throw new Error(payload.message ?? payload.msg ?? "Unable to delete funnel.");
  }
}
