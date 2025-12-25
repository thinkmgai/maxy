'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { defaultLocale, isLocale } from '@/i18n/config';
import { useUserSettings } from '@/components/usersettings/UserSettingsProvider';

function resolveLoginPath(pathname: string) {
  const segments = pathname.split('/').filter(Boolean);
  const locale = segments[0] && isLocale(segments[0]) ? segments[0] : defaultLocale;
  return `/${locale}`;
}

/** Redirects to login when essential user settings are missing (e.g., lost after OTP). */
export function SessionGuard() {
  const { userId, userNo, applicationId, hasLoadedSettings } = useUserSettings();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!hasLoadedSettings) {
      return;
    }

    const segments = pathname.split('/').filter(Boolean);
    // Login page (/{lang}) or root.
    if (segments.length <= 1) {
      return;
    }

    const hasUserId = Boolean(userId && String(userId).trim());
    const numericUserNo = typeof userNo === 'number' ? userNo : Number(userNo);
    const hasUserNo = Number.isFinite(numericUserNo) && numericUserNo > 0;
    const hasApplication = Boolean(applicationId && String(applicationId).trim());

    if (hasUserId && hasUserNo && hasApplication) {
      return;
    }

    const loginPath = resolveLoginPath(pathname);
    router.replace(loginPath);
  }, [applicationId, hasLoadedSettings, pathname, router, userId, userNo]);

  return null;
}
