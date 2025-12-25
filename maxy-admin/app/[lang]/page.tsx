import LoginClientPage from "./login-client";
import { cookies } from 'next/headers';
import { redirect } from "next/navigation";
import { defaultLocale } from "../../i18n/config";
export const dynamicParams = false;
/** Locale-aware login page that redirects authenticated users to the dashboard. */
export default async function LocaleLoginPage() {
  const cookieStore = await cookies();
    const cookieUserID = cookieStore.get("userId")?.value; // 쿠키에서 UserID 가져오기
    if (cookieUserID) {
      redirect(`/${defaultLocale}/PTotalAnalysis`); // 로그인 성공 시 PTotalAnalysis 페이지로 이동
    } 
    else {
      return <LoginClientPage />;
    }
}
