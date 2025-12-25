"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Tooltip,
} from "recharts";

import { useUserSettings } from "../../../../components/usersettings/UserSettingsProvider";
import { AppList, type ApplicationSummary } from "../../../api/AppList";
import {
  getVersionComparisonData,
  type VersionComparisonRow,
  type VersionComparisonTotals,
} from "../../../api/Widget/VersionComparison";
import { useTheme } from "../../../../components/theme/ThemeProvider";
import VersionComparisonAllModal from "./VersionComparisonAllModal";

import "./style.css";

const REFRESH_INTERVAL_MS = 30_000;

type MetricKey =
  | "install"
  | "dau"
  | "error"
  | "crash"
  | "loadingTime"
  | "responseTime";

const METRIC_CONFIG: Array<{
  key: MetricKey;
  label: string;
  unit: "count" | "ms";
}> = [
  { key: "install", label: "Install", unit: "count" },
  { key: "dau", label: "DAU", unit: "count" },
  { key: "error", label: "Error", unit: "count" },
  { key: "crash", label: "Crash", unit: "count" },
  { key: "loadingTime", label: "Loading Time", unit: "ms" },
  { key: "responseTime", label: "Response Time", unit: "ms" },
];

type RadarDatum = {
  metricKey: MetricKey;
  label: string;
  unit: "count" | "ms";
  seriesA: number;
  seriesB: number;
  seriesAValue: number;
  seriesBValue: number;
};

function resolveAccessDate(): string {
  const today = new Date();
  today.setDate(today.getDate() - 1);
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

const numberFormatter = new Intl.NumberFormat("ko-KR");
function formatMetricValue(
  value: number,
  unit: "count" | "ms",
): string {
  if (!Number.isFinite(value)) {
    return "-";
  }
  if (unit === "ms") {
    return `${numberFormatter.format(Math.round(value))} ms`;
  }
  return numberFormatter.format(Math.round(value));
}

function normaliseSeriesLabel(row: VersionComparisonRow | null, fallback: string): string {
  if (!row) {
    return fallback;
  }
  const os = (row.osType ?? "").trim();
  const appVer = (row.appVer ?? "").trim();
  if (os && appVer) {
    return `${os} ${appVer}`;
  }
  if (os) {
    return os;
  }
  if (appVer) {
    return appVer;
  }
  return fallback;
}

function buildRadarData(
  rows: VersionComparisonRow[],
  totals: VersionComparisonTotals | null,
): RadarDatum[] {
  const seriesA = rows[0] ?? null;
  const seriesB = rows[1] ?? null;

  return METRIC_CONFIG.map((metric): RadarDatum => {
    const total = totals ? Number(totals[metric.key] ?? 0) : 0;
    const valueA = seriesA ? Number(seriesA[metric.key] ?? 0) : 0;
    const valueB = seriesB ? Number(seriesB[metric.key] ?? 0) : 0;
    const denominator = total > 0 ? total : Math.max(valueA + valueB, 1);

    const percentA = denominator > 0 ? Math.max(0, Math.min(100, (valueA / denominator) * 100)) : 0;
    const percentB = denominator > 0 ? Math.max(0, Math.min(100, (valueB / denominator) * 100)) : 0;

    return {
      metricKey: metric.key,
      label: metric.label,
      unit: metric.unit,
      seriesA: Number.isFinite(percentA) ? Math.round(percentA * 10) / 10 : 0,
      seriesB: Number.isFinite(percentB) ? Math.round(percentB * 10) / 10 : 0,
      seriesAValue: Number.isFinite(valueA) ? valueA : 0,
      seriesBValue: Number.isFinite(valueB) ? valueB : 0,
    };
  });
}

function VersionComparisonTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color?: string;
    dataKey: string;
    payload: RadarDatum;
  }>;
}) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const base = payload[0].payload;
  return (
    <div className="version-comparison-tooltip">
      <div className="version-comparison-tooltip__title">{base.label}</div>
      <div className="version-comparison-tooltip__list">
        {payload.map((entry) => {
          const rawKey = entry.dataKey === "seriesA" ? "seriesAValue" : "seriesBValue";
          const rawValue = base[rawKey as "seriesAValue" | "seriesBValue"] ?? 0;
          const formattedRaw = formatMetricValue(rawValue, base.unit);
          return (
            <div className="version-comparison-tooltip__item" key={entry.name}>
              <span className="version-comparison-tooltip__indicator" style={{ backgroundColor: entry.color }} />
              <span className="version-comparison-tooltip__label">{entry.name}</span>
              <span className="version-comparison-tooltip__value">
                {formattedRaw}
                {" "}
                <span className="version-comparison-tooltip__percent">
                  (
                  {Number.isFinite(entry.value) ? `${entry.value.toFixed(1)}%` : "-"}
                  )
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function VersionComparisonWidget() {
  const {
    applicationId: preferredApplicationId,
    userNo: storedUserNo,
    tmzutc,
  } = useUserSettings();
  const { theme } = useTheme();
  const isDarkMode = theme === "dark";
  const chartAxisColor = useMemo(
    () => (isDarkMode ? "#e2e8f0" : "rgba(30, 41, 59, 0.85)"),
    [isDarkMode],
  );
  const chartAxisSecondaryColor = useMemo(
    () => (isDarkMode ? "rgba(203, 213, 225, 0.8)" : "rgba(100, 116, 139, 0.8)"),
    [isDarkMode],
  );
  const gridStrokeColor = useMemo(
    () => (isDarkMode ? "rgba(148, 163, 184, 0.25)" : "#e2e8f0"),
    [isDarkMode],
  );

  const preferredId = useMemo(() => {
    const numeric = Number(preferredApplicationId);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
  }, [preferredApplicationId]);

  const userNo = useMemo(() => {
    const numeric = Number(storedUserNo);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
  }, [storedUserNo]);

  const [applications, setApplications] = useState<ApplicationSummary[] | null>(null);
  const [resolvedApplicationId, setResolvedApplicationId] = useState<number>(preferredId);
  const [isResolvingApp, setIsResolvingApp] = useState(false);
  const [appResolveError, setAppResolveError] = useState<string | null>(null);

  const [rows, setRows] = useState<VersionComparisonRow[]>([]);
  const [totals, setTotals] = useState<VersionComparisonTotals | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allModalOpen, setAllModalOpen] = useState(false);

  const fetchControllerRef = useRef<AbortController | null>(null);
  const refreshTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (userNo <= 0) {
      setResolvedApplicationId(preferredId);
      setApplications(null);
      setAppResolveError("사용자 정보가 필요합니다.");
      return;
    }

    let cancelled = false;
    async function resolveApplication() {
      setIsResolvingApp(true);
      setAppResolveError(null);
      try {
        const response = await AppList({ userNo, osType: "all" });
        if (cancelled) return;
        const list = response.applicationList ?? [];
        setApplications(list);

        if (preferredId > 0) {
          setResolvedApplicationId(preferredId);
          setAppResolveError(null);
          return;
        }

        const fallback = list.find((item) => Number(item.applicationId) > 0) ?? null;
        if (fallback) {
          setResolvedApplicationId(Number(fallback.applicationId));
          setAppResolveError(null);
        } else {
          setResolvedApplicationId(0);
          setAppResolveError("사용 가능한 애플리케이션이 없습니다.");
        }
      } catch (fetchError) {
        if (!cancelled) {
          setApplications(null);
          setResolvedApplicationId(preferredId > 0 ? preferredId : 0);
          setAppResolveError(
            fetchError instanceof Error
              ? fetchError.message
              : "애플리케이션 목록을 불러오지 못했습니다.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsResolvingApp(false);
        }
      }
    }

    resolveApplication();
    return () => {
      cancelled = true;
    };
  }, [userNo, preferredId]);

  useEffect(() => {
    if (preferredId > 0) {
      setResolvedApplicationId(preferredId);
      setAppResolveError(null);
    }
  }, [preferredId]);

  const activeApplication = useMemo(() => {
    if (!applications || resolvedApplicationId <= 0) {
      return null;
    }
    return (
      applications.find(
        (app) => Number(app.applicationId) === Number(resolvedApplicationId),
      ) ?? null
    );
  }, [applications, resolvedApplicationId]);

  const applicationIdentifier = useMemo(() => {
    const candidate = activeApplication?.applicationId ?? resolvedApplicationId;
    return Number(candidate) > 0 ? String(candidate) : "";
  }, [activeApplication, resolvedApplicationId]);

  useEffect(() => {
    if (resolvedApplicationId <= 0) {
      setAllModalOpen(false);
    }
  }, [resolvedApplicationId]);

  useEffect(() => {
    setAllModalOpen(false);
  }, [applicationIdentifier]);

  const fetchVersionComparison = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (resolvedApplicationId <= 0 || !applicationIdentifier) {
        setRows([]);
        setTotals(null);
        if (mode === "initial") {
          setError("애플리케이션을 선택해주세요.");
        }
        return;
      }

      if (mode === "initial") {
        setLoading(true);
      }

      if (fetchControllerRef.current) {
        fetchControllerRef.current.abort();
      }

      const controller = new AbortController();
      fetchControllerRef.current = controller;

      try {
        const payload = await getVersionComparisonData(
          {
            applicationId: applicationIdentifier,
            accessDate: resolveAccessDate(),
            tmzutc: tmzutc,
          },
          controller.signal,
        );
        if (controller.signal.aborted) {
          return;
        }
        setRows(payload.versionData ?? []);
        setTotals(payload.totalVersionData ?? null);
        setError(null);
      } catch (fetchError) {
        if (controller.signal.aborted) {
          return;
        }
        if (mode === "initial") {
          setRows([]);
          setTotals(null);
        }
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Version Comparison 데이터를 불러오지 못했습니다.",
        );
      } finally {
        if (fetchControllerRef.current === controller) {
          fetchControllerRef.current = null;
        }
        if (mode === "initial") {
          setLoading(false);
        }
      }
    },
    [resolvedApplicationId, applicationIdentifier, tmzutc],
  );

  useEffect(() => {
    if (refreshTimerRef.current != null) {
      window.clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    if (fetchControllerRef.current) {
      fetchControllerRef.current.abort();
      fetchControllerRef.current = null;
    }

    if (resolvedApplicationId <= 0) {
      setRows([]);
      setTotals(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    async function run() {
      await fetchVersionComparison("initial");
      if (cancelled) return;
      refreshTimerRef.current = window.setInterval(() => {
        void fetchVersionComparison("refresh");
      }, REFRESH_INTERVAL_MS);
    }

    run();

    return () => {
      cancelled = true;
      if (refreshTimerRef.current != null) {
        window.clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      if (fetchControllerRef.current) {
        fetchControllerRef.current.abort();
        fetchControllerRef.current = null;
      }
    };
  }, [resolvedApplicationId, fetchVersionComparison]);

  const seriesLabelA = useMemo(
    () => normaliseSeriesLabel(rows[0] ?? null, "Version A"),
    [rows],
  );
  const seriesLabelB = useMemo(
    () => normaliseSeriesLabel(rows[1] ?? null, "Version B"),
    [rows],
  );

  const radarData = useMemo(() => buildRadarData(rows, totals), [rows, totals]);

  const renderStatus = useMemo(() => {
    if (isResolvingApp && rows.length === 0) {
      return "데이터를 불러오고 있습니다.";
    }
    if (loading && rows.length === 0) {
      return "데이터를 불러오고 있습니다.";
    }
    if (appResolveError) {
      return appResolveError;
    }
    if (error && rows.length === 0) {
      return error;
    }
    return null;
  }, [isResolvingApp, loading, rows.length, error, appResolveError]);

  return (
    <>
      <div className={`version-comparison-widget${isDarkMode ? " version-comparison-widget--dark" : ""}`}>
        <div className="version-comparison-widget__header">
          <div className="version-comparison-widget__title">
            <h4>Version Comparison</h4>
            <img
              src="/images/maxy/ic-question-grey-blue.svg"
              alt="도움말"
              className="version-comparison-widget__help"
            />
          </div>
          <div className="version-comparison-widget__actions">
            <button
              type="button"
              className="version-comparison-widget__all-btn"
              title="전체 버전 상세 보기"
              onClick={() => {
                if (resolvedApplicationId > 0) {
                  setAllModalOpen(true);
                }
              }}
              disabled={resolvedApplicationId <= 0 || loading}
            >
              ALL
            </button>
          </div>
        </div>
        <div className="version-comparison-widget__body">
          {renderStatus ? (
            <div className="version-comparison-widget__status">
              {renderStatus}
            </div>
          ) : (
            <>
              <div className="version-comparison-widget__chart">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} margin={{ top: 8, right: 12, bottom: 8, left: 12 }}>
                    <PolarGrid stroke={gridStrokeColor} />
                    <PolarAngleAxis dataKey="label" tick={{ fill: chartAxisColor, fontSize: 12 }} />
                    <PolarRadiusAxis
                      angle={30}
                      domain={[0, 100]}
                      tickFormatter={(value) => `${value}%`}
                      tick={{ fill: chartAxisSecondaryColor, fontSize: 11 }}
                    />
                    <Radar
                      dataKey="seriesA"
                      stroke="#2563eb"
                      fill="rgba(37, 99, 235, 0.35)"
                      fillOpacity={0.45}
                      strokeWidth={2}
                      name={seriesLabelA}
                    />
                    <Radar
                      dataKey="seriesB"
                      stroke="#f97316"
                      fill="rgba(249, 115, 22, 0.35)"
                      fillOpacity={0.45}
                      strokeWidth={2}
                      name={seriesLabelB}
                    />
                    <Tooltip content={<VersionComparisonTooltip />} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            <div className="version-comparison-widget__legend">
              <div className="version-comparison-widget__legend-item version-comparison-widget__legend-item--primary">
                <span className="version-comparison-widget__legend-dot version-comparison-widget__legend-dot--primary" />
                <span className="version-comparison-widget__legend-label">{seriesLabelA}</span>
              </div>
              <div className="version-comparison-widget__legend-item version-comparison-widget__legend-item--secondary">
                <span className="version-comparison-widget__legend-dot version-comparison-widget__legend-dot--secondary" />
                <span className="version-comparison-widget__legend-label">{seriesLabelB}</span>
              </div>
            </div>
            </>
          )}
        </div>
        {error && !renderStatus && (
          <div className="version-comparison-widget__footer-error">
            {error}
          </div>
        )}
      </div>
      <VersionComparisonAllModal
        open={allModalOpen}
        applicationId={applicationIdentifier}
        tmzutc={tmzutc}
        onClose={() => setAllModalOpen(false)}
      />
    </>
  );
}
