'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AppList } from '@/app/api/AppList';
import { getLocalTimezoneInfo } from './timezoneTable';

const STORAGE_KEY = 'maxy-admin:user-settings';
const DEFAULT_TMZUTC = getLocalTimezoneInfo().offsetMinutes;

type StoredSettings = {
  userNo: number | string | null;
  userId: string | null;
  applicationId: string | null;
  osType: string | null;
  widgetIds: string[] | null;
  language: string | null;
  level: number | null;
  tmzutc: number;
};

interface UserSettingsContextType extends StoredSettings {
  setUserNo: React.Dispatch<React.SetStateAction<number | string | null>>;
  setUserId: React.Dispatch<React.SetStateAction<string | null>>;
  setApplicationId: React.Dispatch<React.SetStateAction<string | null>>;
  setOsType: React.Dispatch<React.SetStateAction<string | null>>;
  setWidgetIds: React.Dispatch<React.SetStateAction<string[] | null>>;
  setLanguage: React.Dispatch<React.SetStateAction<string | null>>;
  setLevel: React.Dispatch<React.SetStateAction<number | null>>;
  setTmzutc: React.Dispatch<React.SetStateAction<number>>;
  hasLoadedSettings: boolean;
}

const DEFAULT_SETTINGS: StoredSettings = {
  userNo: null,
  userId: null,
  applicationId: null,
  osType: null,
  widgetIds: null,
  language: null,
  level: null,
  tmzutc: DEFAULT_TMZUTC,
};

const UserSettingsContext = createContext<UserSettingsContextType | null>(null);

function coerceTmzutc(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const sign = trimmed.startsWith('-') ? -1 : 1;
    const unsigned = trimmed.replace(/^[+-]/, '');
    if (unsigned.includes(':')) {
      const [hoursPart, minutesPart] = unsigned.split(':');
      const hours = Number(hoursPart);
      const minutes = Number(minutesPart);
      if (Number.isFinite(hours) && Number.isFinite(minutes)) {
        return sign * (hours * 60 + minutes);
      }
    }
    const numeric = Number(unsigned);
    if (Number.isFinite(numeric)) {
      if (Math.abs(numeric) > 24) {
        return sign * Math.trunc(numeric);
      }
      return sign * Math.trunc(numeric * 60);
    }
  }
  return null;
}

function readStoredSettings(): StoredSettings | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<StoredSettings>;
    const legacyComponentIds = (parsed as Record<string, unknown>).componentIds;
    const widgetIds =
      Array.isArray(parsed.widgetIds) && parsed.widgetIds.length > 0
        ? parsed.widgetIds
        : Array.isArray(legacyComponentIds)
          ? legacyComponentIds
          : null;

    return {
      userNo:
        typeof parsed.userNo === 'number' || typeof parsed.userNo === 'string'
          ? parsed.userNo
          : null,
      userId: parsed.userId ?? null,
      applicationId: parsed.applicationId ?? null,
      osType: parsed.osType ?? null,
      widgetIds,
      language: parsed.language ?? null,
      level: typeof parsed.level === 'number' ? parsed.level : null,
      tmzutc: coerceTmzutc(parsed.tmzutc) ?? DEFAULT_TMZUTC,
    };
  } catch (error) {
    console.warn('Failed to read stored user settings.', error);
    return null;
  }
}

function writeStoredSettings(settings: StoredSettings) {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.warn('Failed to persist user settings.', error);
  }
}

export const UserSettingsProvider = ({ children }: { children: ReactNode }) => {
  const [userNo, setUserNo] = useState<number | string | null>(DEFAULT_SETTINGS.userNo);
  const [userId, setUserId] = useState<string | null>(DEFAULT_SETTINGS.userId);
  const [applicationId, setApplicationId] = useState<string | null>(DEFAULT_SETTINGS.applicationId);
  const [osType, setOsType] = useState<string | null>(DEFAULT_SETTINGS.osType);
  const [widgetIds, setWidgetIds] = useState<string[] | null>(DEFAULT_SETTINGS.widgetIds);
  const [language, setLanguage] = useState<string | null>(DEFAULT_SETTINGS.language);
  const [level, setLevel] = useState<number | null>(DEFAULT_SETTINGS.level);
  const [tmzutc, setTmzutc] = useState<number>(DEFAULT_SETTINGS.tmzutc);
  const [isInitializingAppId, setIsInitializingAppId] = useState(false);
  const [hasLoadedSettings, setHasLoadedSettings] = useState(false);

  const numericUserNo = useMemo(() => {
    if (typeof userNo === 'number' && Number.isFinite(userNo)) {
      return userNo;
    }
    if (typeof userNo === 'string' && userNo.trim() !== '') {
      const parsed = Number(userNo);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }, [userNo]);

  useEffect(() => {
    const stored = readStoredSettings();
    const timezoneInfo = getLocalTimezoneInfo();
    if (stored) {
      setUserNo(stored.userNo);
      setUserId(stored.userId);
      setApplicationId(stored.applicationId);
      setOsType(stored.osType);
      setWidgetIds(stored.widgetIds);
      setLanguage(stored.language);
      setLevel(stored.level);
      setTmzutc(stored.tmzutc ?? timezoneInfo.offsetMinutes);
    } else {
      setTmzutc(timezoneInfo.offsetMinutes);
    }
    setHasLoadedSettings(true);
  }, []);

  useEffect(() => {
    if (applicationId || numericUserNo == null || isInitializingAppId) {
      return;
    }
    let cancelled = false;
    setIsInitializingAppId(true);
    AppList({ userNo: numericUserNo, osType: 'all' })
      .then((response) => {
        if (cancelled) {
          return;
        }
        const first = response.applicationList[0];
        if (!first) {
          return;
        }
        setApplicationId((prev) => (prev ? prev : String(first.applicationId)));
      })
      .catch((error) => {
        if (!cancelled) {
          console.error('Failed to initialize applicationId from first application list.', error);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsInitializingAppId(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [applicationId, isInitializingAppId, numericUserNo]);

  useEffect(() => {
    if (!hasLoadedSettings) {
      return;
    }
    writeStoredSettings({
      userNo,
      userId,
      applicationId,
      osType,
      widgetIds,
      language,
      level,
      tmzutc,
    });
  }, [hasLoadedSettings, userNo, userId, applicationId, osType, widgetIds, language, level, tmzutc]);

  const value = useMemo(
    () => ({
      userNo,
      userId,
      applicationId,
      osType,
      widgetIds,
      language,
      level,
      tmzutc,
      setUserNo,
      setUserId,
      setApplicationId,
      setOsType,
      setWidgetIds,
      setLanguage,
      setLevel,
      setTmzutc,
      hasLoadedSettings,
    }),
    [userNo, userId, applicationId, osType, widgetIds, language, level, tmzutc, hasLoadedSettings]
  );

  return (
    <UserSettingsContext.Provider value={value}>
      {children}
    </UserSettingsContext.Provider>
  );
};

export const useUserSettings = () => {
  const ctx = useContext(UserSettingsContext);
  if (!ctx) {
    throw new Error('useUserSettings must be used within a UserSettingsProvider');
  }
  return ctx;
};
