import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "../public/css/reset.css";
import "../public/css/common.css";
import "../public/css/dark.css";
// import "../public/css/main.css";
import "./globals.css";
import { UserSettingsProvider } from "../components/usersettings/UserSettingsProvider";
import { ThemeProvider } from "../components/theme/ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MAXY Admin Console",
  description:
    "관리자용 MAXY 애널리틱스 콘솔. 통합 분석과 시스템 관리를 위한 대시보드.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ThemeProvider>
      <UserSettingsProvider>
        <html lang="ko">
          <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
            <Script src="/vendor/maxy.umd.js" strategy="beforeInteractive" />
            {children}
            <Script src="/js/main.js" strategy="afterInteractive" />
          </body>
        </html>
      </UserSettingsProvider>
    </ThemeProvider>
  );
}
