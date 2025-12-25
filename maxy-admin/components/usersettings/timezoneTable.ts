type TimezoneTableEntry = {
  ids: string[];
  offsetMinutes: number;
};

const TIMEZONE_TABLE: TimezoneTableEntry[] = [
  { ids: ["UTC", "Etc/UTC", "GMT", "Etc/GMT", "Zulu"], offsetMinutes: 0 },
  { ids: ["Asia/Seoul", "Asia/Pyongyang", "Korea Standard Time", "KST"], offsetMinutes: 9 * 60 },
  { ids: ["Asia/Tokyo", "Japan Standard Time", "JST"], offsetMinutes: 9 * 60 },
  { ids: ["Asia/Shanghai", "Asia/Beijing", "China Standard Time", "CSTChina"], offsetMinutes: 8 * 60 },
  { ids: ["Asia/Hong_Kong", "Hong Kong Standard Time", "HKT"], offsetMinutes: 8 * 60 },
  { ids: ["Asia/Taipei", "Taiwan Standard Time"], offsetMinutes: 8 * 60 },
  { ids: ["Asia/Singapore", "Asia/Kuala_Lumpur", "Singapore Standard Time"], offsetMinutes: 8 * 60 },
  { ids: ["Asia/Manila", "Philippine Standard Time", "PSTAsia"], offsetMinutes: 8 * 60 },
  { ids: ["Asia/Bangkok", "Indochina Time", "ICT"], offsetMinutes: 7 * 60 },
  { ids: ["Asia/Jakarta", "Western Indonesia Time", "WIB"], offsetMinutes: 7 * 60 },
  { ids: ["Asia/Dubai", "Gulf Standard Time", "GST"], offsetMinutes: 4 * 60 },
  { ids: ["Asia/Kolkata", "India Standard Time", "IST"], offsetMinutes: 5 * 60 + 30 },
  { ids: ["Asia/Kathmandu", "Nepal Time", "NPT"], offsetMinutes: 5 * 60 + 45 },
  { ids: ["Australia/Sydney", "AEST", "Australian Eastern Standard Time"], offsetMinutes: 10 * 60 },
  { ids: ["Australia/Adelaide", "Australian Central Standard Time", "ACST"], offsetMinutes: 9 * 60 + 30 },
  { ids: ["Pacific/Auckland", "New Zealand Standard Time", "NZST"], offsetMinutes: 12 * 60 },
  { ids: ["Europe/London", "GMT0", "British Winter Time"], offsetMinutes: 0 },
  { ids: ["Europe/Paris", "Europe/Berlin", "Central European Time", "CET"], offsetMinutes: 60 },
  { ids: ["Europe/Moscow", "Moscow Standard Time", "MSK"], offsetMinutes: 3 * 60 },
  { ids: ["America/Sao_Paulo", "Brasilia Standard Time", "BRT"], offsetMinutes: -3 * 60 },
  { ids: ["America/New_York", "Eastern Standard Time", "EST"], offsetMinutes: -5 * 60 },
  { ids: ["America/Chicago", "Central Standard Time", "CST"], offsetMinutes: -6 * 60 },
  { ids: ["America/Denver", "Mountain Standard Time", "MST"], offsetMinutes: -7 * 60 },
  { ids: ["America/Los_Angeles", "Pacific Standard Time", "PST"], offsetMinutes: -8 * 60 },
];

const TIMEZONE_LOOKUP = new Map<string, number>();

for (const entry of TIMEZONE_TABLE) {
  entry.ids.forEach((id) => {
    const normalized = normalizeTimeZoneId(id);
    if (!TIMEZONE_LOOKUP.has(normalized)) {
      TIMEZONE_LOOKUP.set(normalized, entry.offsetMinutes);
    }
  });
}

function normalizeTimeZoneId(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_:/-]/g, "");
}

function lookupOffsetMinutes(timeZone?: string | null): number | null {
  if (!timeZone) {
    return null;
  }
  const normalized = normalizeTimeZoneId(timeZone);
  if (TIMEZONE_LOOKUP.has(normalized)) {
    return TIMEZONE_LOOKUP.get(normalized)!;
  }
  return null;
}

function parseOffsetMinutesFromIntl(timeZone: string): number | null {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
    const parts = formatter.formatToParts(new Date());
    const tzName = parts.find((part) => part.type === "timeZoneName")?.value;
    if (!tzName) {
      return null;
    }
    const match =
      tzName.match(/GMT([+-]\d{1,2})(?::(\d{2}))?/i) ??
      tzName.match(/UTC([+-]\d{1,2})(?::(\d{2}))?/i) ??
      tzName.match(/([+-]\d{1,2})(?::(\d{2}))?/);
    if (!match) {
      if (/UTC/i.test(tzName) || /GMT/i.test(tzName)) {
        return 0;
      }
      return null;
    }
    const sign = match[1].startsWith("-") ? -1 : 1;
    const hours = Math.abs(parseInt(match[1], 10));
    const minutes = match[2] ? parseInt(match[2], 10) : 0;
    return sign * (hours * 60 + minutes);
  } catch {
    return null;
  }
}

export function formatOffsetMinutes(offsetMinutes: number): string {
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absolute = Math.abs(offsetMinutes);
  const hours = Math.floor(absolute / 60);
  const minutes = absolute % 60;
  if (minutes === 0) {
    return `${sign}${hours}`;
  }
  return `${sign}${hours}:${minutes.toString().padStart(2, "0")}`;
}

function resolveUtcOffsetMinutes(timeZone?: string | null): number {
  const fromTable = lookupOffsetMinutes(timeZone);
  if (fromTable != null) {
    return fromTable;
  }
  if (timeZone) {
    const parsed = parseOffsetMinutesFromIntl(timeZone);
    if (parsed != null) {
      return parsed;
    }
  }
  return -new Date().getTimezoneOffset();
}

export function resolveUtcOffsetLabel(timeZone?: string | null): string {
  return formatOffsetMinutes(resolveUtcOffsetMinutes(timeZone));
}

export function getLocalTimezoneInfo(): {
  timeZone: string | null;
  offsetMinutes: number;
  offsetLabel: string;
} {
  const timeZone =
    typeof Intl !== "undefined" && typeof Intl.DateTimeFormat === "function"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone ?? null
      : null;
  const offsetMinutes = resolveUtcOffsetMinutes(timeZone);
  return {
    timeZone,
    offsetMinutes,
    offsetLabel: formatOffsetMinutes(offsetMinutes),
  };
}

export function getUtcOffsetMinutes(timeZone?: string | null): number {
  return resolveUtcOffsetMinutes(timeZone);
}
