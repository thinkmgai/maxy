import { API_URL } from "../../settings";

export type BIDetailSeriesEntry = {
  date?: string;
  hour?: string;
  value: number;
};

export type BIDetailResponse = {
  code: number;
  dailyAndroid?: BIDetailSeriesEntry[];
  dailyIOS?: BIDetailSeriesEntry[];
  message?: string;
  unit?: "seconds" | "milliseconds" | "minutes";
};

export type BIDetailTop10Entry = {
  Count: number;
  "Cause Name"?: string;
  "Caused By"?: string;
  "Error Type"?: string;
  Message?: string;
};

export type BIDetailTop10Response = {
  code: number;
  androidTop10?: BIDetailTop10Entry[];
  iosTop10?: BIDetailTop10Entry[];
  message?: string;
};

type RequestWithTimezone = {
  tmzutc: number;
};

export type BIDetailRequest = RequestWithTimezone & {
  applicationId: number;
  startDate: string;
  endDate: string;
};

export type BIDetailCCURequest = RequestWithTimezone & {
  applicationId: number;
  startDate: string;
};

export type BIDetailDateRangeRequest = RequestWithTimezone & {
  applicationId: number;
  startDate: string;
  endDate: string;
};

export type OsType = "all" | "android" | "ios";

export type BIDetailTop10Request = RequestWithTimezone & {
  applicationId: number;
  startDate: string;
  endDate?: string;
  osType: OsType;
};

type RequestOptions = {
  signal?: AbortSignal;
};

function buildPayload<T extends RequestWithTimezone>(params: T): Record<string, unknown> {
  return { ...params };
}

export async function apiBIDetail(
  path: string,
  params: BIDetailRequest,
  options: RequestOptions = {},
): Promise<BIDetailResponse> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildPayload(params)),
    signal: options.signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to load BI detail (${path}): ${response.status}`);
  }

  return response.json();
}

export async function apiBIDetailCrash(
  params: BIDetailRequest,
  options: RequestOptions = {},
): Promise<BIDetailResponse> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/PTotalAnalysis/BIDetailCrash`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildPayload(params)),
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error("Unable to reach BI crash detail endpoint.");
    }
    throw error;
  }

  if (!response.ok) {
    throw new Error(`Failed to load BI crash detail: ${response.status}`);
  }

  return response.json();
}

export async function apiBIDetailError(
  params: BIDetailRequest,
  options: RequestOptions = {},
): Promise<BIDetailResponse> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/PTotalAnalysis/BIDetailError`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildPayload(params)),
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error("Unable to reach BI error detail endpoint.");
    }
    throw error;
  }

  if (!response.ok) {
    throw new Error(`Failed to load BI error detail: ${response.status}`);
  }

  return response.json();
}

export async function apiBIDetailCrashTop10(
  params: BIDetailTop10Request,
  options: RequestOptions = {},
): Promise<BIDetailTop10Response> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/PTotalAnalysis/BIDetailCrashTop10`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildPayload(params)),
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error("Unable to reach BI crash top10 endpoint.");
    }
    throw error;
  }

  if (!response.ok) {
    throw new Error(`Failed to load BI crash top10: ${response.status}`);
  }

  return response.json();
}

export async function apiBIDetailErrorTop10(
  params: BIDetailTop10Request,
  options: RequestOptions = {},
): Promise<BIDetailTop10Response> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/PTotalAnalysis/BIDetailErrorTop10`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildPayload(params)),
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error("Unable to reach BI error top10 endpoint.");
    }
    throw error;
  }

  if (!response.ok) {
    throw new Error(`Failed to load BI error top10: ${response.status}`);
  }

  return response.json();
}

export async function apiBIDetailCCU(
  params: BIDetailCCURequest,
  options: RequestOptions = {},
): Promise<BIDetailResponse> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/PTotalAnalysis/BIDetailCCU`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildPayload(params)),
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error("Unable to reach BI CCU detail endpoint.");
    }
    throw error;
  }

  if (!response.ok) {
    throw new Error(`Failed to load BI CCU detail: ${response.status}`);
  }

  return response.json();
}

export async function apiBIDetailCCUDate(
  params: BIDetailDateRangeRequest,
  options: RequestOptions = {},
): Promise<BIDetailResponse> {
  return apiBIDetail("/PTotalAnalysis/BIDetailCCUDate", params, options);
}
