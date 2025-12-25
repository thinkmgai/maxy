"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  getFavoritesTroubleDetail,
  getFavoritesTroubleList,
  type FavoritesDateType,
  type FavoritesTroubleDetailItem,
  type FavoritesTroubleListItem,
  type FavoritesTroubleType,
} from "../../../api/Widget/Favorites";
import {
  getLogmeterTroubleDetail,
  getLogmeterTroubleList,
} from "../../../api/Widget/Logmeter";
import {
  getDeviceDistributionTroubleDetail,
  getDeviceDistributionTroubleList,
} from "../../../api/Widget/DeviceDistribution";

const PAGE_SIZE = 100;
const SCROLL_THRESHOLD_PX = 120;

function getTroubleRowKey(row: FavoritesTroubleListItem): string {
  return `${row.logTm}-${row.deviceId}-${row.memUsage}`;
}

function dedupeTroubleRows(rows: FavoritesTroubleListItem[]): FavoritesTroubleListItem[] {
  if (rows.length <= 1) {
    return rows;
  }

  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = getTroubleRowKey(row);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function mergeTroubleRows(
  prev: FavoritesTroubleListItem[],
  next: FavoritesTroubleListItem[],
): FavoritesTroubleListItem[] {
  if (prev.length === 0) {
    return dedupeTroubleRows(next);
  }

  if (next.length === 0) {
    return prev;
  }

  const seen = new Set(prev.map(getTroubleRowKey));
  const merged = [...prev];
  next.forEach((row) => {
    const key = getTroubleRowKey(row);
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    merged.push(row);
  });
  return merged;
}

type FavoritesTroublePopupProps = {
  open: boolean;
  applicationId: number;
  osType: string | null;
  tmzutc: number;
  dateType: FavoritesDateType;
  reqUrl: string | null;
  deviceModel?: string | null;
  searchTarget?: "reqUrl" | "deviceModel" | "logmeter";
  contextValue?: string | null;
  pageSize?: number;
  popupType?: string;
  initialType: FavoritesTroubleType;
  hasError: boolean;
  hasCrash: boolean;
  onClose(): void;
};

const numberFormatter = new Intl.NumberFormat("ko-KR");

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return "-";
  }
  return numberFormatter.format(Math.round(value));
}

function formatDateTime(value: number): string {
  if (!Number.isFinite(value)) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function resolveInitialType(
  initialType: FavoritesTroubleType,
  hasError: boolean,
  hasCrash: boolean,
): FavoritesTroubleType {
  if (hasError && hasCrash) {
    return initialType;
  }
  if (hasCrash) {
    return "crash";
  }
  return "error";
}

type LogTypeDictionaryItem = {
  group: string;
  detail: string;
  category: string;
};

const LOG_TYPE_DICTIONARY: Record<number, LogTypeDictionaryItem> = {
  131076: { group: "WebNavigation", detail: "Error", category: "Web" },
  131077: { group: "WebNavigation", detail: "Script Error", category: "Web" },
  524292: { group: "HttpRequest", detail: "Error", category: "Network" },
  1048579: { group: "NativeAction", detail: "Error", category: "In App" },
  2097152: { group: "Native", detail: "Crash", category: "Crash" },
  4194306: { group: "Custom Tag", detail: "Error", category: "Etc." },
};

function getLogTypeDictionary(logType: number): LogTypeDictionaryItem | null {
  return LOG_TYPE_DICTIONARY[Number(logType)] ?? null;
}

function formatLogGroup(logType: number): string {
  const dict = getLogTypeDictionary(logType);
  return dict ? dict.group : String(logType);
}

function formatLogDetail(logType: number): string {
  const dict = getLogTypeDictionary(logType);
  return dict ? dict.detail : String(logType);
}

function splitCrashLogName(
  logName: string | null | undefined,
): { className: string; causedBy: string } {
  const normalized = (logName ?? "").trim();
  if (!normalized) {
    return { className: "-", causedBy: "-" };
  }
  const idx = normalized.indexOf(":");
  if (idx < 0) {
    return { className: normalized, causedBy: "-" };
  }
  const left = normalized.slice(0, idx).trim();
  const right = normalized.slice(idx + 1).trim();
  return {
    className: left || "-",
    causedBy: right || "-",
  };
}

function firstLine(value: string | null | undefined): string {
  const normalized = normalizeMultiline(value).trim();
  if (!normalized) {
    return "-";
  }
  const line = normalized.split("\n")[0]?.trim();
  return line ? line : "-";
}

function firstSegmentBeforeColon(value: string | null | undefined): string {
  const normalized = normalizeMultiline(value).trim();
  if (!normalized) {
    return "-";
  }
  const line = normalized.split("\n")[0]?.trim() ?? "";
  const segment = line.split(":")[0]?.trim() ?? "";
  return segment || "-";
}

function normalizeMultiline(value: string | null | undefined): string {
  const raw = value ?? "";
  return raw
    .replaceAll("\r\n", "\n")
    .replaceAll("\\r\\n", "\n")
    .replaceAll("\\n", "\n")
    .replaceAll("\r", "\n");
}

function formatStorage(totalMb: number | null | undefined, usageMb: number | null | undefined): string {
  const total = Number(totalMb ?? 0);
  const usage = Number(usageMb ?? 0);
  if (!Number.isFinite(total) || total <= 0) {
    return "-";
  }
  const gb = total / 1024;
  const pct = usage > 0 ? Math.min(100, Math.max(0, Math.round((usage / total) * 100))) : 0;
  return `${gb.toFixed(1)}GB (${pct}%)`;
}

function formatMemKb(valueKb: number | null | undefined): string {
  const kb = Number(valueKb ?? 0);
  if (!Number.isFinite(kb) || kb <= 0) {
    return "-";
  }
  const mb = kb / 1024;
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(1)}GB`;
  }
  return `${mb.toFixed(1)}MB`;
}

function convertComType(value: string | null | undefined): string {
  const v = Number(value);
  switch (v) {
    case 1:
      return "WiFi";
    case 2:
      return "2G";
    case 3:
      return "3G";
    case 4:
      return "LTE";
    case 5:
      return "5G";
    default:
      return "ETC";
  }
}

function convertComSensitivity(value: string | null | undefined): { label: string; klass: string } {
  const v = Number(value);
  if (!Number.isFinite(v) || v < 0) {
    return { label: "Unknown", klass: "unknown" };
  }
  if (v <= 20) return { label: "Too Bad", klass: "too_bad" };
  if (v <= 40) return { label: "Bad", klass: "bad" };
  if (v <= 60) return { label: "Normal", klass: "normal" };
  if (v <= 80) return { label: "Good", klass: "good" };
  return { label: "Very Good", klass: "very_good" };
}

function logTypeToPageType(logType: number | null | undefined): { klass: "native" | "webview" | ""; label: string } {
  const raw = logType == null ? "" : String(logType);
  if (!raw) {
    return { klass: "", label: "-" };
  }
  if (raw.startsWith("10") || raw.startsWith("20")) {
    return { klass: "native", label: "Native" };
  }
  return { klass: "webview", label: "Web View" };
}

function clampPercent(value: number | null | undefined): number {
  const v = Number(value ?? 0);
  if (!Number.isFinite(v)) {
    return 0;
  }
  return Math.min(100, Math.max(0, v));
}

export default function FavoritesTroublePopup({
  open,
  applicationId,
  osType,
  tmzutc,
  dateType,
  reqUrl,
  deviceModel,
  searchTarget = "reqUrl",
  contextValue,
  pageSize,
  popupType,
  initialType,
  hasError,
  hasCrash,
  onClose,
}: FavoritesTroublePopupProps) {
  const [activeType, setActiveType] = useState<FavoritesTroubleType>("error");
  const [hasMore, setHasMore] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSideOpen, setIsSideOpen] = useState(false);
  const [isSideVisible, setIsSideVisible] = useState(false);

  const [list, setList] = useState<FavoritesTroubleListItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [detail, setDetail] = useState<FavoritesTroubleDetailItem | null>(null);

  const [loadingList, setLoadingList] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  const listAbortRef = useRef<AbortController | null>(null);
  const moreAbortRef = useRef<AbortController | null>(null);
  const isLoadingMoreRef = useRef(false);
  const detailAbortRef = useRef<AbortController | null>(null);
  const tableScrollRef = useRef<HTMLDivElement | null>(null);
  const lastDetailKeyRef = useRef<string | null>(null);
  const nextOffsetRef = useRef(0);

  const modalRoot = useMemo(() => {
    if (typeof window === "undefined") return null;
    let el = document.getElementById("favorites-trouble-popup-root");
    if (!el) {
      el = document.createElement("div");
      el.id = "favorites-trouble-popup-root";
      document.body.appendChild(el);
    }
    return el;
  }, []);

  const targetType =
    searchTarget === "deviceModel" ? "deviceModel" : searchTarget === "logmeter" ? "logmeter" : "reqUrl";
  const targetValue = targetType === "deviceModel" ? deviceModel : targetType === "reqUrl" ? reqUrl : null;
  const displayValue = contextValue ?? targetValue;
  const popupTypeLabel = popupType ?? "Favorites";
  const contextLabel = targetType === "deviceModel" ? "Device Model" : "Request URL";
  const resolvedPageSize = Math.max(1, pageSize ?? PAGE_SIZE);
  const canFetch = open && applicationId > 0 && (targetType === "logmeter" || Boolean(targetValue));

  const showTabs = hasError && hasCrash;
  const listCountLabel = list.length ? `(${formatNumber(list.length)}${hasMore ? "+" : ""})` : "";
  const isCrashView = activeType === "crash";
  const selectedRow = selectedIndex != null ? list[selectedIndex] : null;
  const crashLogName = isCrashView ? splitCrashLogName(selectedRow?.logName) : null;
  const crashTypeText = crashLogName?.className ?? "-";
  const crashMessageRawText =
    crashLogName?.causedBy && crashLogName.causedBy !== "-"
      ? normalizeMultiline(crashLogName.causedBy)
      : normalizeMultiline(detail?.resMsg ?? "");
  const crashMessagePreviewText = firstSegmentBeforeColon(crashMessageRawText);
  const crashFullText = normalizeMultiline(detail?.resMsg ?? (detailError ? detailError : ""));

  useEffect(() => {
    if (isExpanded) {
      setIsSideVisible(true);
      const id = requestAnimationFrame(() => setIsSideOpen(true));
      return () => cancelAnimationFrame(id);
    }
    setIsSideOpen(false);
    const timer = window.setTimeout(() => setIsSideVisible(false), 700);
    return () => window.clearTimeout(timer);
  }, [isExpanded]);

  const fetchListPage = useCallback(
    async ({
      troubleType,
      offsetParam,
      append,
    }: {
      troubleType: FavoritesTroubleType;
      offsetParam: number;
      append: boolean;
    }) => {
      if (!canFetch) {
        return;
      }

      setListError(null);
      if (append) {
        if (isLoadingMoreRef.current) {
          return;
        }
        isLoadingMoreRef.current = true;
        setLoadingMore(true);
      } else {
        setLoadingList(true);
        setList([]);
        setHasMore(false);
        nextOffsetRef.current = 0;
        setSelectedIndex(null);
        setDetail(null);
        setDetailError(null);
        lastDetailKeyRef.current = null;
        if (tableScrollRef.current) {
          tableScrollRef.current.scrollTop = 0;
        }
        if (listAbortRef.current) {
          listAbortRef.current.abort();
        }
        if (moreAbortRef.current) {
          moreAbortRef.current.abort();
          moreAbortRef.current = null;
        }
      }

      const controller = new AbortController();
      if (append) {
        if (moreAbortRef.current) {
          moreAbortRef.current.abort();
        }
        moreAbortRef.current = controller;
      } else {
        listAbortRef.current = controller;
      }

      try {
        const payload =
          targetType === "deviceModel"
            ? await getDeviceDistributionTroubleList(
                {
                  applicationId,
                  osType,
                  dateType,
                  deviceModel: targetValue ?? "",
                  troubleType,
                  limit: resolvedPageSize,
                  offset: offsetParam,
                  tmzutc,
                },
                controller.signal,
              )
            : targetType === "logmeter"
              ? await getLogmeterTroubleList(
                  {
                    applicationId,
                    osType,
                    dateType,
                    troubleType,
                    limit: resolvedPageSize,
                    offset: offsetParam,
                    tmzutc,
                  },
                  controller.signal,
                )
              : await getFavoritesTroubleList(
                  {
                    applicationId,
                    osType,
                    dateType,
                    reqUrl: targetValue ?? "",
                    troubleType,
                    limit: resolvedPageSize,
                    offset: offsetParam,
                    tmzutc,
                  },
                  controller.signal,
                );
        const rows = payload.list ?? [];
        setHasMore(Boolean(payload.hasMore));
        nextOffsetRef.current = offsetParam + rows.length;
        if (append) {
          setList((prev) => mergeTroubleRows(prev, rows));
        } else {
          const nextRows = dedupeTroubleRows(rows);
          setList(nextRows);
          if (nextRows.length > 0) {
            setSelectedIndex(0);
          }
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setListError(err instanceof Error ? err.message : "목록을 불러오지 못했습니다.");
        }
      } finally {
        if (append) {
          if (moreAbortRef.current === controller) {
            moreAbortRef.current = null;
          }
          isLoadingMoreRef.current = false;
          setLoadingMore(false);
        } else {
          if (listAbortRef.current === controller) {
            listAbortRef.current = null;
          }
          setLoadingList(false);
        }
      }
    },
    [applicationId, canFetch, dateType, osType, resolvedPageSize, targetType, targetValue, tmzutc],
  );

  useEffect(() => {
    if (!canFetch) {
      return;
    }

    const resolvedType = resolveInitialType(initialType, hasError, hasCrash);
    setActiveType(resolvedType);
    setIsExpanded(false);
    fetchListPage({ troubleType: resolvedType, offsetParam: 0, append: false });
  }, [applicationId, canFetch, dateType, fetchListPage, hasCrash, hasError, initialType, targetValue]);

  const loadMore = useCallback(() => {
    if (!hasMore || loadingList || loadingMore) {
      return;
    }
    fetchListPage({ troubleType: activeType, offsetParam: nextOffsetRef.current, append: true });
  }, [activeType, fetchListPage, hasMore, loadingList, loadingMore]);

  const handleTableScroll = useCallback(() => {
    const target = tableScrollRef.current;
    if (!target || loadingList || loadingMore || !hasMore) {
      return;
    }
    const distanceToBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
    if (distanceToBottom <= SCROLL_THRESHOLD_PX) {
      loadMore();
    }
  }, [hasMore, loadMore, loadingList, loadingMore]);

  const selectedRowKey = useMemo(() => {
    if (selectedIndex == null) {
      return null;
    }
    const row = list[selectedIndex];
    if (!row) {
      return null;
    }
    return `${row.logTm}|${row.deviceId}|${row.memUsage}`;
  }, [list, selectedIndex]);

  const fetchDetail = useCallback(
    async (row: FavoritesTroubleListItem) => {
      if (!open || applicationId <= 0) {
        return;
      }
      setLoadingDetail(true);
      setDetailError(null);
      setDetail(null);

      if (detailAbortRef.current) {
        detailAbortRef.current.abort();
      }
      const controller = new AbortController();
      detailAbortRef.current = controller;

      try {
        const payload =
          targetType === "deviceModel"
            ? await getDeviceDistributionTroubleDetail(
                {
                  applicationId,
                  logTm: row.logTm,
                  deviceId: row.deviceId,
                  memUsage: row.memUsage,
                  tmzutc,
                },
                controller.signal,
              )
            : targetType === "logmeter"
              ? await getLogmeterTroubleDetail(
                  {
                    applicationId,
                    logTm: row.logTm,
                    deviceId: row.deviceId,
                    memUsage: row.memUsage,
                    tmzutc,
                  },
                  controller.signal,
                )
              : await getFavoritesTroubleDetail(
                  {
                    applicationId,
                    logTm: row.logTm,
                    deviceId: row.deviceId,
                    memUsage: row.memUsage,
                    tmzutc,
                  },
                  controller.signal,
                );
        setDetail(payload.item ?? null);
      } catch (err) {
        if (!controller.signal.aborted) {
          setDetailError(err instanceof Error ? err.message : "상세 데이터를 불러오지 못했습니다.");
        }
      } finally {
        if (detailAbortRef.current === controller) {
          detailAbortRef.current = null;
        }
        setLoadingDetail(false);
      }
    },
    [applicationId, open, targetType, tmzutc],
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    if (selectedIndex == null) {
      return;
    }
    const row = list[selectedIndex];
    if (!row) {
      return;
    }
    const rowKey = `${row.logTm}|${row.deviceId}|${row.memUsage}`;
    if (lastDetailKeyRef.current === rowKey) {
      return;
    }
    lastDetailKeyRef.current = rowKey;
    fetchDetail(row);
  }, [fetchDetail, list, open, selectedIndex, selectedRowKey]);

  useEffect(() => {
    if (!open) {
      if (listAbortRef.current) {
        listAbortRef.current.abort();
        listAbortRef.current = null;
      }
      if (moreAbortRef.current) {
        moreAbortRef.current.abort();
        moreAbortRef.current = null;
      }
      if (detailAbortRef.current) {
        detailAbortRef.current.abort();
        detailAbortRef.current = null;
      }
      setList([]);
      setDetail(null);
      setHasMore(false);
      nextOffsetRef.current = 0;
      setSelectedIndex(null);
      lastDetailKeyRef.current = null;
      setIsExpanded(false);
      return;
    }

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (isExpanded) {
          setIsExpanded(false);
          return;
        }
        onClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isExpanded, onClose, open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  if (!open || !modalRoot) {
    return null;
  }

  const handleBackdropClick = () => {
    if (isSideVisible || isExpanded) {
      setIsExpanded(false);
      return;
    }
    onClose();
  };

  return createPortal(
    <>
      <button
        type="button"
        className="favorites-trouble-popup__scrim"
        aria-label={`${popupTypeLabel} Error/Crash 팝업 닫기`}
        onClick={handleBackdropClick}
      />
      <div
        className="maxy_popup_common favorites-trouble-popup"
        style={{ display: "block" }}
        role="dialog"
        aria-modal="true"
        aria-label={`${popupTypeLabel} Error/Crash`}
      >
        <div className="maxy_popup_grid_s_wrap">
          <div className="maxy_popup_title_wrap">
            <div className="maxy_popup_title_left">
              <img className="maxy_popup_analysis_icon" alt="" aria-hidden="true" />
              <span className="popup_title">Analysis/</span>
              <span className="popup_type">{popupTypeLabel}</span>
              {displayValue ? (
                <span className="favorites-trouble-popup__requrl" title={displayValue}>
                  {displayValue} {listCountLabel}
                </span>
              ) : null}
            </div>

            <div className="maxy_popup_title_right">
              {showTabs ? (
                <div className="maxy_component_btn_wrap">
                  <button
                    type="button"
                    className={`maxy_component_btn${activeType === "error" ? " on" : ""}`}
                    onClick={() => {
                      if (activeType === "error") {
                        return;
                      }
                      setActiveType("error");
                      fetchListPage({ troubleType: "error", offsetParam: 0, append: false });
                    }}
                  >
                    Error
                  </button>
                  <button
                    type="button"
                    className={`maxy_component_btn${activeType === "crash" ? " on" : ""}`}
                    onClick={() => {
                      if (activeType === "crash") {
                        return;
                      }
                      setActiveType("crash");
                      fetchListPage({ troubleType: "crash", offsetParam: 0, append: false });
                    }}
                  >
                    Crash
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          <div className="favorites-trouble-popup__table-wrap" role="region" aria-label="Error/Crash log list">
            <div
              className="favorites-trouble-popup__table-scroll"
              ref={tableScrollRef}
              onScroll={handleTableScroll}
            >
              <table className="favorites-trouble-popup__table">
                <colgroup>
                  {isCrashView ? (
                    <>
                      <col style={{ width: "22%" }} />
                      <col style={{ width: "20%" }} />
                      <col style={{ width: "12%" }} />
                      <col style={{ width: "22%" }} />
                      <col style={{ width: "24%" }} />
                    </>
                  ) : (
                    <>
                      <col style={{ width: "22%" }} />
                      <col style={{ width: "18%" }} />
                      <col style={{ width: "14%" }} />
                      <col style={{ width: "16%" }} />
                      <col style={{ width: "14%" }} />
                      <col style={{ width: "6%" }} />
                      <col style={{ width: "10%" }} />
                    </>
                  )}
                </colgroup>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Device ID</th>
                    <th>User ID</th>
                    {isCrashView ? (
                      <>
                        <th>Class Name</th>
                        <th>Caused By</th>
                      </>
                    ) : (
                      <>
                        <th>Log Class</th>
                        <th>Log Type</th>
                      </>
                    )}
                    {!isCrashView ? (
                      <>
                        <th>OS</th>
                        <th>App Ver.</th>
                      </>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {list.map((row, index) => {
                    const isSelected = index === selectedIndex;
                    const osIcon = !isCrashView
                      ? (row.osType ?? "").toLowerCase() === "ios"
                        ? "/images/maxy/icon-ios-small.svg"
                        : "/images/maxy/icon-android-small.svg"
                      : "";
                    const crashLogName = splitCrashLogName(row.logName);
                    return (
                      <tr
                        key={getTroubleRowKey(row)}
                        className={
                          "favorites-trouble-popup__row" +
                          (isSelected ? " favorites-trouble-popup__row--selected" : "")
                        }
                        onClick={() => setSelectedIndex(index)}
                      >
                        <td title={formatDateTime(row.logTm)}>{formatDateTime(row.logTm)}</td>
                        <td title={row.deviceId}>{row.deviceId}</td>
                        <td title={row.userId ?? ""}>{row.userId ?? "-"}</td>
                        {isCrashView ? (
                          <>
                            <td title={crashLogName.className}>{crashLogName.className}</td>
                            <td title={crashLogName.causedBy}>{crashLogName.causedBy}</td>
                          </>
                        ) : (
                          <>
                            <td title={formatLogGroup(row.logType)}>
                              <span className="favorites-trouble-popup__log-class">
                                <span className="favorites-trouble-popup__dot favorites-trouble-popup__dot--error" aria-hidden="true" />
                                {formatLogGroup(row.logType)}
                              </span>
                            </td>
                            <td title={formatLogDetail(row.logType)}>
                              <span className="favorites-trouble-popup__log-type">
                                <span className="favorites-trouble-popup__warn" aria-hidden="true">
                                  !
                                </span>
                                <span className="favorites-trouble-popup__log-type-text">
                                  {formatLogDetail(row.logType)}
                                </span>
                              </span>
                            </td>
                          </>
                        )}
                        {!isCrashView ? (
                          <>
                            <td title={row.osType ?? ""}>
                              <img
                                className="favorites-trouble-popup__os-icon"
                                src={osIcon}
                                alt=""
                                aria-hidden="true"
                              />
                            </td>
                            <td title={row.appVer ?? ""}>{row.appVer ?? "-"}</td>
                          </>
                        ) : null}
                      </tr>
                    );
                  })}
                  {!loadingList && !listError && list.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="favorites-trouble-popup__empty">
                        No data
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            {listError ? <div className="favorites-trouble-popup__error">{listError}</div> : null}

            {loadingList ? (
              <div className="favorites-trouble-popup__loading-cursor" aria-label="Loading">
                <div className="lds-ellipsis" aria-hidden="true">
                  <div />
                  <div />
                  <div />
                  <div />
                </div>
              </div>
            ) : null}
            {loadingMore ? (
              <div className="favorites-trouble-popup__loading-cursor" aria-label="Loading">
                <div className="lds-ellipsis" aria-hidden="true">
                  <div />
                  <div />
                  <div />
                  <div />
                </div>
              </div>
            ) : null}
          </div>

          <div className="maxy_popup_gray_bg_wrap favorites-trouble-popup__detail-wrap">
            <div className="grid_wrap favorites-trouble-popup__detail-grid">
              <div className="icon_info_box dv2 favorites-trouble-popup__device-card">
                <div className="dv2_left_wrap">
                  <div className="icon_head">
                    <i className="icon-device-purple" aria-hidden="true" />
                    <div>
                      <span className="txt device_info" title={detail?.deviceModel ?? ""}>
                        {detail?.deviceModel ?? "-"}
                      </span>
                    </div>
                  </div>

                  <div className="icon_detail">
                    <div className="detail_dv_wrap">
                      <div>
                        <p>Network Type</p>
                        <div className="bg_gray_wrap">
                          <i className="icon_network_type" aria-hidden="true" />
                          <span className="txt">{convertComType(detail?.comType ?? null)}</span>
                        </div>
                      </div>
                      <div>
                        <p>Carrier</p>
                        <div className="bg_gray_wrap">
                          <i className="icon_simoperator" aria-hidden="true" />
                          <span className="txt">{detail?.simOperatorNm ?? "-"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="detail_dv_wrap">
                      <div>
                        <p>
                          Network{" "}
                          {detail?.ip ? (
                            <span className="text_ip_color">&nbsp;({detail.ip})</span>
                          ) : null}
                        </p>
                        <div className="network_status_wrap">
                          <span
                            className={`network_status ${convertComSensitivity(detail?.comSensitivity ?? null).klass}`}
                            aria-hidden="true"
                          />
                          <span className="txt">
                            {convertComSensitivity(detail?.comSensitivity ?? null).label}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p>Location</p>
                        <div className="bg_gray_wrap">
                          <i className="icon_time_zone" aria-hidden="true" />
                          <span className="txt">{detail?.timezone ?? "-"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="detail_dv_wrap">
                      <div>
                        <p>Page Type</p>
                        <div className="bg_gray_wrap">
                          <i
                            className={`icon_log_type ${logTypeToPageType(detail?.logType ?? null).klass}`}
                            aria-hidden="true"
                          />
                          <span className="txt">{logTypeToPageType(detail?.logType ?? null).label}</span>
                        </div>
                      </div>
                      <div>
                        <p>Web View Ver.</p>
                        <span className="txt purple">{detail?.webviewVer ?? "-"}</span>
                      </div>
                    </div>

                    <div className="detail_dv_wrap">
                      <div>
                        <p>OS Version</p>
                        <div className="bg_gray_wrap" id="pOsVerWrap">
                          <i
                            className={`icon on ${
                              (detail?.osType ?? "").toLowerCase() === "ios" ? "ic_sm_ios" : "ic_sm_android"
                            }`}
                            aria-hidden="true"
                          />
                          <span className="txt">{detail?.osVer ?? "-"}</span>
                        </div>
                      </div>
                      <div>
                        <p>App Build No.</p>
                        <span className="txt purple">{detail?.appBuildNum ?? "-"}</span>
                      </div>
                    </div>

                    <div className="detail_dv_wrap">
                      <div>
                        <p>App Version</p>
                        <div className="bg_gray_wrap">
                          <i className="icon_gear" aria-hidden="true" />
                          <span className="txt">{detail?.appVer ?? "-"}</span>
                        </div>
                      </div>
                      <div>
                        <p>User ID</p>
                        <span className="txt purple">{detail?.userId ?? "-"}</span>
                      </div>
                    </div>

                    <div className="detail_dv_wrap">
                      <div>
                        <p>Storage Usage</p>
                        <span className="txt purple">
                          {formatStorage(detail?.storageTotal ?? null, detail?.storageUsage ?? null)}
                        </span>
                      </div>
                      <div>
                        <p>Memory Usage</p>
                        <span className="txt purple">{formatMemKb(detail?.memUsage ?? null)}</span>
                      </div>
                    </div>

                    <div className="detail_dv_wrap">
                      <div>
                        <p>Battery Usage</p>
                        <div className="percentage_wrap">
                          <div className="mini_progress_wrap">
                            <span
                              className="bar"
                              style={{
                                width: `${clampPercent(Number(detail?.batteryLvl ?? 0))}%`,
                                backgroundColor: "#7277FF",
                              }}
                            />
                            <span className="pct_txt">{`${Math.round(clampPercent(Number(detail?.batteryLvl ?? 0)))}%`}</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <p>CPU Usage</p>
                        <div className="percentage_wrap">
                          <div className="mini_progress_wrap">
                            <span
                              className="bar"
                              style={{
                                width: `${clampPercent(detail?.cpuUsage ?? 0)}%`,
                                backgroundColor: "#7277FF",
                              }}
                            />
                            <span className="pct_txt">{`${Math.round(clampPercent(detail?.cpuUsage ?? 0))}%`}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="detail_dv_wrap">
                      <div>
                        <p>Loading Time</p>
                        <span className="txt purple">-</span>
                      </div>
                      <div>
                        <p>Response Time</p>
                        <span className="txt purple">-</span>
                      </div>
                    </div>

                    <div className="detail_dv_wrap">
                      <div>
                        <p>MED</p>
                        <span className="txt purple">-</span>
                      </div>
                      <div>
                        <p>MED</p>
                        <span className="txt purple">-</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grd_dv2_wrap favorites-trouble-popup__message-card">
                <div className="textarea_wrap icon_info_box flex_wrap">
                  <textarea
                    className="enable_scrollbar"
                    readOnly
                    value={
                      targetType === "deviceModel"
                        ? detail?.deviceModel ?? deviceModel ?? ""
                        : detail?.reqUrl ?? reqUrl ?? ""
                    }
                    aria-label={contextLabel}
                  />
                </div>

                <div className="icon_info_box">
                  {isCrashView ? (
                    <div className="popup_log_type_detail_wrap favorites-trouble-popup__log-detail">
                      <div className="log_type_detail_header">
                        <div className="category_wrap" aria-label="Category">
                          <span className="">In App</span>
                          <span className="">Web</span>
                          <span className="">Network</span>
                          <span className="active">Crash</span>
                          <span className="">Etc.</span>
                        </div>
                        <button
                          type="button"
                          className="favorites-trouble-popup__expand-btn"
                          aria-label="Log Detail 확장"
                          onClick={() => setIsExpanded(true)}
                        />
                      </div>

                      <div className="log_detail_contents_wrap">
                        <div className="log_type_details">
                          <div className="bold_purple">Crash Type:</div>
                          <div className="textarea_wrap">
                            <textarea
                              className="enable_scrollbar"
                              readOnly
                              value={crashTypeText}
                              aria-label="Crash Type"
                            />
                          </div>
                        </div>

                        <div className="log_type_details">
                          <div className="bold_purple">Message from OS:</div>
                          <div className="textarea_wrap">
                            <textarea
                              className="red favorites-trouble-popup__no-scroll favorites-trouble-popup__single-line"
                              rows={1}
                              wrap="soft"
                              readOnly
                              value={crashMessagePreviewText}
                              aria-label="Message from OS"
                            />
                          </div>
                        </div>

                        <div className="log_type_details">
                          <div className="bold_purple">Full Text:</div>
                          <div className="textarea_wrap">
                            <textarea
                              className="favorites-trouble-popup__no-scroll"
                              readOnly
                              value={crashFullText}
                              aria-label="Full Text"
                              style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="textarea_wrap log_res_msg_wrap">
                      <textarea
                        className="enable_scrollbar"
                        readOnly
                        value={detail?.resMsg ?? (detailError ? detailError : "")}
                        aria-label="Error/Crash message"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {loadingDetail ? (
              <div className="favorites-trouble-popup__loading-cursor" aria-label="Loading">
                <div className="lds-ellipsis" aria-hidden="true">
                  <div />
                  <div />
                  <div />
                  <div />
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {isSideVisible ? (
          <div className={`favorites-trouble-popup__side-layer ${isSideOpen ? "is-open" : ""}`}>
            <button
              type="button"
              className="favorites-trouble-popup__side-scrim"
              aria-label="Log Detail 확장 닫기"
              onClick={() => setIsExpanded(false)}
            />
            <aside className="favorites-trouble-popup__side-panel" role="dialog" aria-label="Log Detail">
              <div className="favorites-trouble-popup__side-head">
                <div className="favorites-trouble-popup__side-title">Log Detail</div>
              </div>

              <div className="favorites-trouble-popup__side-body">
                <section className="favorites-trouble-popup__side-card">
                  <div className="favorites-trouble-popup__side-label">Crash Type:</div>
                  <pre className="favorites-trouble-popup__side-text">{crashTypeText}</pre>
                </section>
                <section className="favorites-trouble-popup__side-card">
                  <div className="favorites-trouble-popup__side-label">Message from OS:</div>
                  <div
                    className="favorites-trouble-popup__side-text favorites-trouble-popup__side-text--red favorites-trouble-popup__side-single-line"
                    title={crashMessageRawText || undefined}
                  >
                    {crashMessagePreviewText}
                  </div>
                </section>
                <section className="favorites-trouble-popup__side-card favorites-trouble-popup__side-card--fulltext">
                  <div className="favorites-trouble-popup__side-label">Full Text:</div>
                  <pre
                    className="favorites-trouble-popup__side-text favorites-trouble-popup__side-text--scroll"
                    style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                  >
                    {crashFullText}
                  </pre>
                </section>
              </div>
            </aside>
          </div>
        ) : null}
      </div>
    </>,
    modalRoot,
  );
}
