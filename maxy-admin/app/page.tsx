import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { defaultLocale } from "../i18n/config";
import { API_URL } from "../settings";

async function isSessionValid() {
  const headerList = await headers();
  const cookieHeader = headerList.get("cookie") ?? "";

  try {
    const response = await fetch(`${API_URL}/Session/check`, {
      method: "GET",
      credentials: "include",
      headers: {
        Cookie: cookieHeader,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return false;
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const payload = (await response.json().catch(() => null)) as { code?: number } | null;
      return payload?.code === 200;
    }

    return true;
  } catch {
    return false;
  }
}

/** Server entry page that routes users based on server-verified session validity. */
export default async function RootPage() {
  const sessionOk = await isSessionValid();
  if (sessionOk) {
    redirect(`/${defaultLocale}/PTotalAnalysis`);
  }
  redirect(`/${defaultLocale}`);
}
