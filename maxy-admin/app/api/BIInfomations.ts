import { API_URL } from "../../settings";

export type BiInfomation = {
  ID: number;
  Name: string;
  Today: number;
  Yesterday: number;
};

export type BiInfomationsRequest = {
  applicationId: number;
  osType: string;
  tmzutc: number;
};

export type BiInfomationsResponse = {
  code: number;
  biInfomations: BiInfomation[];
  message: string;
};

type RequestOptions = {
  signal?: AbortSignal;
};

export async function apiBIInfomations(
  params: BiInfomationsRequest,
  options: RequestOptions = {}
): Promise<BiInfomationsResponse> {
  const payload: Record<string, unknown> = {
    applicationId: params.applicationId,
    osType: params.osType,
    tmzutc: params.tmzutc,
  };

  const response = await fetch(`${API_URL}/PTotalAnalysis/BIInfomations`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal: options.signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to load BI informations: ${response.status}`);
  }

  return response.json();
}
