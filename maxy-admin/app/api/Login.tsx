'use client';

import { API_URL } from "../../settings";

type TimezonePayload = {
  timezone?: string | null;
};

/**
 * API 로그인 함수
 * @param userId 사용자 ID
 * @param password 사용자 비밀번호
 * @returns 
 {
    "code": 200,
    "language": "ko",
    "level": 0,
    "projectId": 0,
    "message": "Success"
}
 */
export async function Login(userId: string, password: string, timezonePayload?: TimezonePayload) {
    const body: Record<string, unknown> = {
      userId,
      password,
    };
    if (timezonePayload?.timezone) {
      body.timezone = timezonePayload.timezone;
    }
    
    const response = await fetch(`${API_URL}/Login`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return data;
}

/**
 * API OTP 로그인 함수
 * @param otp OTP 코드
 * @returns 
 {
    "code": 200,
    "userId": "userId",
    "userNo": 1,
    "language": "ko",
    "level": 0,
    "projectId": 0,
    "applicationId": 0,
    "widgetIds": [1,2,3,4,5,6,7,8],
    "message": "success"
}
*/
export async function OTPLogin(otp: string, timezonePayload?: TimezonePayload) {
    const body: Record<string, unknown> = {
      otp,
    };
    if (timezonePayload?.timezone) {
      body.timezone = timezonePayload.timezone;
    }
    const response = await fetch(`${API_URL}/OTPLogin`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return data;
}
