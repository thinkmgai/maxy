import { API_URL } from "../../../settings";

export type ManagementMenuItem = {
  label: string;
  menuId?: number;
  route?: string | null;
  status?: number | null;
};

export type ManagementMenuSection = {
  label: string;
  items?: ManagementMenuItem[];
};

export type ManagementMenuResponse = {
  code: number;
  menu: ManagementMenuSection[];
  message?: string;
};

export type ManagementMenuRequest = {
  user_id?: string;
  lang?: string;
  level?: number;
};

type RequestOptions = {
  signal?: AbortSignal;
};

export async function fetchManagementMenu(
  payload: ManagementMenuRequest = {},
  options: RequestOptions = {},
): Promise<ManagementMenuResponse> {
  const response = await fetch(`${API_URL}/PManagement/menu`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal: options.signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to load management menu: ${response.status}`);
  }

  return response.json();
}
