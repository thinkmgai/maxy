 
"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { ApplicationSummary } from "../../api/AppList";
import { AppList } from "../../api/AppList";
import type { PerformanceQuery } from "../../api/PerformanceAnalysis";
import NetworkAnalysis from "./NetworkAnalysis";
import PageAnalysis from "./PageAnalysis";
import "./main_wrap.css";
import { useUserSettings } from "@/components/usersettings/UserSettingsProvider";

const ONE_HOUR = 60 * 60 * 1000;
const OS_OPTIONS = [
  { value: "전체 OS 유형", label: "전체 OS 유형" },
  { value: "Android", label: "Android" },
  { value: "iOS", label: "iOS" },
];
const OS_LABEL: Record<string, string> = OS_OPTIONS.reduce((acc, option) => {
  acc[option.value] = option.label;
  return acc;
}, {} as Record<string, string>);
function toLocalDateTimeInputValue(timestamp: number) {
  const date = new Date(timestamp);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(timestamp - offset).toISOString().slice(0, 16);
}

/** Performance analysis dashboard shell that mirrors the legacy JSP structure. */
export default function PerformanceAnalysisPage() {
  const now = useMemo(() => Date.now(), []);
  const initialFrom = useMemo(() => now - ONE_HOUR, [now]);
  const { userNo, tmzutc } = useUserSettings();
  const numericUserNo = useMemo(() => {
    if (typeof userNo === "number" && Number.isFinite(userNo)) {
      return userNo;
    }
    if (typeof userNo === "string") {
      const parsed = Number(userNo);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }, [userNo]);

  const [applications, setApplications] = useState<ApplicationSummary[]>([]);
  const [appListError, setAppListError] = useState<string | null>(null);
  const [isAppLoading, setIsAppLoading] = useState(true);

  const [formState, setFormState] = useState({
    applicationId: 0,
    osType: OS_OPTIONS[0].value,
    from: toLocalDateTimeInputValue(initialFrom),
    to: toLocalDateTimeInputValue(now),
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [filters, setFilters] = useState<PerformanceQuery | null>(null);

  const validateFilters = (state: typeof formState): { filters: PerformanceQuery | null; error?: string } => {
    const fromTime = new Date(state.from).getTime();
    const toTime = new Date(state.to).getTime();

    if (Number.isNaN(fromTime) || Number.isNaN(toTime)) {
      return { filters: null, error: "유효한 조회 시간을 입력해주세요." };
    }
    if (fromTime >= toTime) {
      return { filters: null, error: "시작 시간은 종료 시간보다 빨라야 합니다." };
    }

    return {
      filters: {
        applicationId: state.applicationId,
        osType: state.osType,
        from: fromTime,
        to: toTime,
        tmzutc: tmzutc,
      },
    };
  };

  const applyFilters = (state: typeof formState, showError = true) => {
    const result = validateFilters(state);
    if (result.error) {
      if (showError) {
        setFormError(result.error);
      }
      return false;
    }
    setFormError(null);
    setFilters(result.filters);
    return true;
  };

  useEffect(() => {
    if (numericUserNo == null) {
      setApplications([]);
      setFilters(null);
      setAppListError("사용자 정보를 확인할 수 없습니다.");
      setIsAppLoading(false);
      return;
    }
    const userNoForRequest = numericUserNo;

    let cancelled = false;
    async function loadAppList() {
      try {
        setIsAppLoading(true);
        const response = await AppList({ userNo: userNoForRequest, osType: "all" });
        if (cancelled) return;
        setApplications(response.applicationList);
        const defaultId = response.applicationList[0]?.applicationId ?? 0;
        const initialState = {
          applicationId: defaultId,
          osType: OS_OPTIONS[0].value,
          from: toLocalDateTimeInputValue(initialFrom),
          to: toLocalDateTimeInputValue(now),
        };
        setFormState(initialState);
        applyFilters(initialState, false);
        setAppListError(null);
      } catch (error) {
        if (!cancelled) {
          setAppListError(
            error instanceof Error ? error.message : "애플리케이션 목록을 불러오지 못했습니다.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsAppLoading(false);
        }
      }
    }

    loadAppList();
    return () => {
      cancelled = true;
    };
  }, [numericUserNo, initialFrom, now]);

  const appliedRangeLabel = useMemo(() => {
    if (!filters) {
      return "-";
    }
    const fromDate = new Date(filters.from);
    const toDate = new Date(filters.to);
    return `${fromDate.toLocaleString()} ~ ${toDate.toLocaleString()}`;
  }, [filters]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    applyFilters(formState, true);
  };

  return (
    <div className="maxy_pa_wrap">
      <div className="contents_header">
        <div className="ctts_h_left">
          <span className="app_icon">A</span>
          <select
            id="packageNm"
            className="app_info_select"
            value={formState.applicationId}
            onChange={(event) => {
              const nextState = { ...formState, applicationId: Number(event.target.value) };
              setFormState(nextState);
              applyFilters(nextState, false);
            }}
            disabled={isAppLoading || applications.length === 0}
          >
            {applications.map((app) => (
              <option key={app.applicationId} value={app.applicationId}>
                {app.appName}
                {app.packageId ? ` (${app.packageId})` : ""}
              </option>
            ))}
          </select>
          <span className="app_icon">O</span>
          <select
            id="osType"
            className="app_info_select"
            value={formState.osType}
            onChange={(event) => {
              const nextState = { ...formState, osType: event.target.value };
              setFormState(nextState);
              applyFilters(nextState, false);
            }}
          >
            {OS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <form className="ctts_h_right" onSubmit={handleSubmit}>
          <div className="datetime_picker_container">
            <div className="datetime_picker_label">From</div>
            <div className="date_time_wrap improved">
              <div className="calendar_icon" />
              <input
                className="calendar_input"
                type="datetime-local"
                value={formState.from}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, from: event.target.value }))
                }
                aria-label="조회 시작 시간"
              />
            </div>
            <div className="datetime_picker_label">To</div>
            <div className="date_time_wrap improved">
              <div className="calendar_icon" />
              <input
                className="calendar_input"
                type="datetime-local"
                value={formState.to}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, to: event.target.value }))
                }
                aria-label="조회 종료 시간"
              />
            </div>
            <button className="search_button" data-t="common.text.search" type="submit">
              Search
            </button>
          </div>
          {formError && <p className="pa_form_error">{formError}</p>}
        </form>
      </div>

        <div className="pa_filters_summary">
          <span>
            <strong>App:</strong>{" "}
            {(() => {
              const appliedId = filters?.applicationId ?? formState.applicationId;
              const appliedApp = applications.find((app) => app.applicationId === appliedId);
              return appliedApp?.appName ?? "선택";
            })()}
          </span>
          <span>
            <strong>OS:</strong> {OS_LABEL[filters?.osType ?? formState.osType] ?? formState.osType}
          </span>
          <span>
            <strong>Range:</strong> {appliedRangeLabel}
          </span>
        </div>
        {isAppLoading && <p className="pa_state_text">앱 목록을 불러오는 중입니다…</p>}
        {appListError && <p className="pa_state_text pa_state_error">{appListError}</p>}

      <div>
        <div className="pa_contents_wrap">
          {filters ? (
            <>
              <PageAnalysis filters={filters} />
              <NetworkAnalysis filters={filters} />
            </>
          ) : (
            <p className="pa_state_text">앱 정보를 불러오는 중입니다…</p>
          )}
        </div>
      </div>

      <div className="maxy_popup_common_wrap" id="maxyPopupWrap" />
    </div>
  );
}
