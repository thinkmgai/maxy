'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { AppList, type ApplicationSummary } from "@/app/api/AppList";
import { useUserSettings } from "@/components/usersettings/UserSettingsProvider";

// 컴포넌트 속성 타입 정의
type ContentsHeaderProps = {
  osType?: string;
  onApplicationsChange?: (hasApplications: boolean) => void;
  onPackageChange?: (application: ApplicationSummary | null) => void;
  onOsTypeChange?: (osType: string) => void;
};

// OS 타입 옵션 상수
const OS_TYPE_OPTIONS = [
  { value: "A", label: "전체 OS 유형" },
  { value: "Android", label: "Android" },
  { value: "iOS", label: "iOS" },
];

/**
 * 대시보드의 패키지 및 OS 선택기를 포함하는 헤더 컴포넌트
 * 
 * @param onApplicationsChange - 애플리케이션 목록 유무 변경 시 호출될 콜백
 * @param onPackageChange - 애플리케이션 선택 변경 시 호출될 콜백
 * @param onOsTypeChange - OS 타입 변경 시 호출될 콜백
 */
export default function ContentsHeader({
  osType: osTypeProp = "A",
  onApplicationsChange,
  onPackageChange,
  onOsTypeChange,
}: ContentsHeaderProps = {}) {
  // 사용자 설정에서 프로젝트 ID와 애플리케이션 ID를 가져옴
  const {
    userNo,
    applicationId,
    setApplicationId,
    osType: storedOsType,
    setOsType,
  } = useUserSettings();

  // 상태 관리
  const [applications, setApplications] = useState<ApplicationSummary[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(applicationId);
  const initialOsType = useMemo(
    () => storedOsType ?? osTypeProp,
    [storedOsType, osTypeProp],
  );
  const [selectedOsType, setSelectedOsType] = useState<string>(initialOsType);
  const applicationIdRef = useRef<string | null>(applicationId ?? null);

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

  // 애플리케이션 ID가 변경되면 선택된 앱 ID 업데이트
  useEffect(() => {
    setSelectedAppId(applicationId);
    applicationIdRef.current = applicationId ?? null;
  }, [applicationId]);

  useEffect(() => {
    setSelectedOsType(initialOsType);
  }, [initialOsType]);

  useEffect(() => {
    setOsType((prev) => (prev ?? initialOsType));
  }, [initialOsType, setOsType]);

  // 프로젝트 ID나 OS 타입이 변경되면 애플리케이션 목록 로드
  useEffect(() => {
    let active = true;

    async function loadApplications() {
      if (numericUserNo == null) {
        setApplications([]);
        setSelectedAppId(null);
        applicationIdRef.current = null;
        setApplicationId((prev) => (prev === null ? prev : null));
        onApplicationsChange?.(false);
        onPackageChange?.(null);
        return;
      }

      try {
        onApplicationsChange?.(false);
        onPackageChange?.(null);

        // API를 통해 애플리케이션 목록 가져오기
        const effectiveOsType = selectedOsType === "A" ? "all" : selectedOsType;
        const { applicationList } = await AppList({
          userNo: numericUserNo,
          osType: effectiveOsType,
        });

        if (!active) {
          return;
        }

        setApplications(applicationList);
        onApplicationsChange?.(applicationList.length > 0);

        // 애플리케이션이 없는 경우 처리
        if (applicationList.length === 0) {
          setSelectedAppId(null);
          applicationIdRef.current = null;
          setApplicationId((prev) => (prev === null ? prev : null));
          onPackageChange?.(null);
          return;
        }

        // 이전에 선택된 애플리케이션이 있으면 해당 애플리케이션을, 없으면 첫 번째 애플리케이션을 선택
        const preferredId = applicationIdRef.current;
        const match = applicationList.find(
          (app) => String(app.applicationId) === (preferredId ?? "")
        );
        const fallback = applicationList.find((app) => Number(app.applicationId) > 0) ?? null;

        const next = match ?? fallback;
        if (!next) {
          setSelectedAppId(null);
          applicationIdRef.current = null;
          setApplicationId((prev) => (prev === null ? prev : null));
          onPackageChange?.(null);
          return;
        }

        const nextId = String(next.applicationId);
        setSelectedAppId(nextId);
        applicationIdRef.current = nextId;
        setApplicationId((prev) => {
          if (prev === nextId) {
            return prev;
          }
          onPackageChange?.(next);
          return nextId;
        });
      } catch (error) {
        if (active) {
          setApplications([]);
          setSelectedAppId(null);
          applicationIdRef.current = null;
          setApplicationId((prev) => (prev === null ? prev : null));
          onApplicationsChange?.(false);
          onPackageChange?.(null);
        }
        console.error(error);
      }
    }

    loadApplications();

    return () => {
      active = false;
    };
  }, [numericUserNo, onApplicationsChange, onPackageChange, selectedOsType, setApplicationId]);

  // 애플리케이션 선택 변경 핸들러
  const handlePackageChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      const nextId = event.target.value;
      setSelectedAppId(nextId);
      setApplicationId(nextId);
      applicationIdRef.current = nextId;

      const selected =
        applications.find(
          (app) => String(app.applicationId) === nextId
        ) ?? null;

      if (selected) {
        onPackageChange?.(selected);
      } else {
        onPackageChange?.(null);
      }
    },
    [applications, onPackageChange, setApplicationId]
  );

  // OS 타입 변경 핸들러
  const handleOsTypeChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      const nextOsType = event.target.value;
      setSelectedOsType(nextOsType);
      setOsType(nextOsType);
      if (onOsTypeChange && onOsTypeChange !== setOsType) {
        onOsTypeChange(nextOsType);
      }
    },
    [onOsTypeChange, setOsType]
  );

  return (
    <div className="contents_header">
      <div className="ctts_h_left">
        <h1 data-t="dashboard.bi.title">Basic Information</h1>
        <span className="ic_question" aria-hidden="true">?</span>
      </div>
      <label htmlFor="packageNm" className="sr-only">
        Application
      </label>
      <label htmlFor="osType" className="sr-only">
        OS Type
      </label>
      <div className="ctts_h_right">
        <span className="app_icon">A</span>
        <select
          id="packageNm"
          className="app_info_select"
          value={selectedAppId ?? ""}
          onChange={handlePackageChange}
          disabled={applications.length === 0}
        >
          {applications.length === 0 ? (
            <option value="" disabled>
              애플리케이션이 없습니다
            </option>
          ) : (
            applications.map((app) => (
              <option key={app.applicationId} value={app.applicationId}>
                {app.appName}
                {app.packageId ? ` (${app.packageId})` : ""}
              </option>
            ))
          )}
        </select>
        <span className="app_icon">O</span>
        <select
          id="osType"
          className="app_info_select"
          value={selectedOsType}
          onChange={handleOsTypeChange}
        >
          {OS_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
