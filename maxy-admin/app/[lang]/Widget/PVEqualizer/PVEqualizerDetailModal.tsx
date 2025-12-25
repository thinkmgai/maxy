"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer as RechartsResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useTheme } from "../../../../components/theme/ThemeProvider";
import {
  getPVEqualizerDetail,
  type PVEqualizerDetailChartItem,
  type PVEqualizerDetailListItem,
} from "../../../api/Widget/PVEqualizer";

const numberFormatter = new Intl.NumberFormat("ko-KR");
const PAGE_SIZE = 100;

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return "-";
  }
  return numberFormatter.format(Math.round(value));
}

function parseNumeric(value: unknown): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function getDetailLabel(time: string): string {
  if (!time) {
    return "-";
  }
  return time.length >= 16 ? time.slice(11, 16) : time;
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

function formatDurationMs(value: number): string {
  if (!Number.isFinite(value)) {
    return "-";
  }
  if (value >= 1000) {
    const seconds = value / 1000;
    return `${seconds.toFixed(1)}s`;
  }
  return `${Math.round(value)}ms`;
}

type PVEqualizerDetailModalProps = {
  open: boolean;
  applicationId: number;
  osType: string | null;
  tmzutc: number;
  reqUrl: string;
  displayUrl: string;
  viewCount: number;
  viewer: number;
  onClose(): void;
};

export default function PVEqualizerDetailModal({
  open,
  applicationId,
  osType,
  tmzutc,
  reqUrl,
  displayUrl,
  viewCount,
  viewer,
  onClose,
}: PVEqualizerDetailModalProps) {
  const { theme } = useTheme();
  const isDarkMode = theme === "dark";
  const chartAxisColor = isDarkMode ? "#dbeafe" : "#475569";
  const chartGridColor = isDarkMode ? "rgba(148, 163, 184, 0.2)" : "#e2e8f0";

  const [list, setList] = useState<PVEqualizerDetailListItem[]>([]);
  const [chart, setChart] = useState<PVEqualizerDetailChartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const abortRef = useRef<AbortController | null>(null);
  const offsetRef = useRef(0);
  const listRef = useRef<HTMLDivElement | null>(null);

  const modalRoot = useMemo(() => {
    if (typeof window === "undefined") return null;
    let el = document.getElementById("pvequalizer-detail-modal-root");
    if (!el) {
      el = document.createElement("div");
      el.id = "pvequalizer-detail-modal-root";
      document.body.appendChild(el);
    }
    return el;
  }, []);

  const handleClose = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setList([]);
    setChart([]);
    setError(null);
    setLoadMoreError(null);
    setLoading(false);
    setLoadingMore(false);
    setHasMore(true);
    offsetRef.current = 0;
    onClose();
  }, [onClose]);

  const fetchDetailPage = useCallback(
    (offset: number, append: boolean) => {
      const targetUrl = displayUrl && displayUrl !== "-" ? displayUrl : reqUrl;
      if (!open || applicationId <= 0 || !targetUrl) {
        if (!append) {
          setList([]);
          setChart([]);
        }
        return;
      }

      if (append) {
        setLoadingMore(true);
        setLoadMoreError(null);
      } else {
        abortRef.current?.abort();
        setLoading(true);
        setError(null);
        setLoadMoreError(null);
        setHasMore(true);
        offsetRef.current = 0;
        setList([]);
        setChart([]);
      }

      const controller = new AbortController();
      abortRef.current = controller;

      getPVEqualizerDetail(
        {
          applicationId: String(applicationId),
          osType,
          dateType: "DAY",
          reqUrl: targetUrl,
          limit: PAGE_SIZE,
          offset,
          includeChart: !append,
          tmzutc,
        },
        controller.signal,
      )
        .then((payload) => {
          if (controller.signal.aborted) {
            return;
          }
          const nextList = Array.isArray(payload.list) ? payload.list : [];
          if (append) {
            setList((prev) => [...prev, ...nextList]);
          } else {
            setList(nextList);
            setChart(Array.isArray(payload.chart) ? payload.chart : []);
          }
          offsetRef.current = offset + nextList.length;
          if (nextList.length < PAGE_SIZE) {
            setHasMore(false);
          }
        })
        .catch((fetchError) => {
          if (controller.signal.aborted) {
            return;
          }
          const message =
            fetchError instanceof Error
              ? fetchError.message
              : "상세 데이터를 불러오지 못했습니다.";
          if (append) {
            setLoadMoreError(message);
          } else {
            setError(message);
          }
        })
        .finally(() => {
          if (abortRef.current === controller) {
            abortRef.current = null;
          }
          if (append) {
            setLoadingMore(false);
          } else {
            setLoading(false);
          }
        });
    },
    [applicationId, displayUrl, open, osType, reqUrl, tmzutc],
  );

  const fetchDetail = useCallback(() => {
    const targetUrl = displayUrl && displayUrl !== "-" ? displayUrl : reqUrl;
    if (!open || applicationId <= 0 || !targetUrl) {
      setList([]);
      setChart([]);
      return;
    }

    fetchDetailPage(0, false);
  }, [applicationId, displayUrl, fetchDetailPage, open, reqUrl]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const timer = window.setTimeout(() => {
      fetchDetail();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchDetail, open]);

  useEffect(() => {
    if (open) {
      return;
    }
    abortRef.current?.abort();
    abortRef.current = null;
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleClose, open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const detailChartData = useMemo(
    () =>
      chart.map((item, index) => ({
        id: `${item.time}-${index}`,
        label: getDetailLabel(item.time),
        rawTime: item.time,
        stayTime: parseNumeric(item.stayTime),
        loadingTime: parseNumeric(item.loadingTime),
      })),
    [chart],
  );

  const isListLoading = loading && list.length === 0;
  const isListEmpty = !loading && !error && list.length === 0;
  const listStatus =
    error && list.length === 0 ? error : null;

  const loadMoreStatus = loadingMore
    ? "추가 데이터를 불러오는 중입니다…"
    : loadMoreError
      ? loadMoreError
      : null;

  const isChartLoading = loading && detailChartData.length === 0;
  const isChartEmpty = !loading && !error && detailChartData.length === 0;
  const chartStatus = error ? error : null;

  const handleListScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      const target = event.currentTarget;
      if (!hasMore || loading || loadingMore || list.length === 0) {
        return;
      }
      const remaining = target.scrollHeight - target.scrollTop - target.clientHeight;
      if (remaining < 64) {
        fetchDetailPage(offsetRef.current, true);
      }
    },
    [fetchDetailPage, hasMore, list.length, loading, loadingMore],
  );

  const handleLoadMore = useCallback(() => {
    if (!hasMore || loading || loadingMore) {
      return;
    }
    fetchDetailPage(offsetRef.current, true);
  }, [fetchDetailPage, hasMore, loading, loadingMore]);

  const tooltipFormatter = useCallback((value: number, name: string) => {
    const label = name === "stayTime" ? "Stay Time" : "Loading Time";
    return [formatDurationMs(parseNumeric(value)), label];
  }, []);

  if (!open || !modalRoot) {
    return null;
  }

  const countLabel = list.length ? `(${formatNumber(list.length)})` : "";
  const showUrlDetail = Boolean(displayUrl && reqUrl && displayUrl !== reqUrl);
  const titleText = displayUrl || reqUrl || "-";

  return createPortal(
    <div
      className="pvequalizer-detail-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          handleClose();
        }
      }}
    >
      <div
        id="pageView__popup"
        className="maxy_popup_common pvequalizer-detail-popup"
        role="dialog"
        aria-modal="true"
        aria-label="Page View Detail"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="maxy_popup_grid_s_wrap">
          <div className="maxy_popup_title_wrap">
            <div className="maxy_popup_title_left">
              <img className="maxy_popup_analysis_icon" alt="" aria-hidden="true" />
              <span className="popup_title">Analysis/</span>
              <span className="popup_type">Page View</span>
              {countLabel ? (
                <span id="count" className="popup_count">
                  {countLabel}
                </span>
              ) : null}
            </div>
            <div className="maxy_popup_title_right" />
          </div>

          <div className="summary_dv_wrap">
            <div>
              <span
                id="title"
                className="pvequalizer-detail-popup__title"
                title={titleText}
              >
                {titleText}
              </span>
              {showUrlDetail ? (
                <span id="reqUrl" className="url">
                  {reqUrl}
                </span>
              ) : null}
              <button className="btn_alias" type="button" aria-hidden="true" tabIndex={-1} />
            </div>
            <div className="dv_count">
              <div>
                <h4>PV</h4>
                <div>{formatNumber(parseNumeric(viewCount))}</div>
              </div>
              <div>
                <h4>Viewer</h4>
                <div>{formatNumber(parseNumeric(viewer))}</div>
              </div>
            </div>
          </div>

          <div
            className={`pvequalizer-detail-popup__list list${
              isListEmpty ? " is-empty" : ""
            }`}
            role="region"
            aria-label="페이지 상세 목록"
            ref={listRef}
            onScroll={handleListScroll}
          >
            {isListLoading ? (
              <div className="pvequalizer-detail-popup__status pvequalizer-detail-popup__status--loading">
                
                  데이터를 불러오는 중입니다…
                
              </div>
            ) : listStatus ? (
              <div
                className={`pvequalizer-detail-popup__status${
                  error ? " pvequalizer-detail-popup__status--error" : ""
                }`}
              >
                {listStatus}
              </div>
            ) : (
              <>
                <table className="pvequalizer-detail-popup__table">
                  <thead>
                    <tr>
                      <th>시간</th>
                      <th>Device ID</th>
                      <th>User ID</th>
                      <th>Stay Time</th>
                      <th>Loading Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((row, index) => (
                      <tr key={`${row.logTm}-${row.deviceId}-${index}`}>
                        <td title={formatDateTime(row.logTm)}>{formatDateTime(row.logTm)}</td>
                        <td title={row.deviceId}>{row.deviceId}</td>
                        <td title={row.userId ?? ""}>{row.userId ?? "-"}</td>
                        <td>{formatDurationMs(parseNumeric(row.stayTime))}</td>
                        <td>{formatDurationMs(parseNumeric(row.loadingTime))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {loadMoreStatus ? (
                  <div
                    className={`pvequalizer-detail-popup__load-more${
                      loadMoreError ? " pvequalizer-detail-popup__status--error" : ""
                    }`}
                  >
                    {loadMoreStatus}
                  </div>
                ) : hasMore ? (
                  <button
                    type="button"
                    className="pvequalizer-detail-popup__load-more-btn"
                    onClick={handleLoadMore}
                  >
                    더보기
                  </button>
                ) : null}
              </>
            )}
          </div>

          <div
            className={`pvequalizer-detail-popup__chart chart${
              isChartEmpty ? " is-empty" : ""
            }`}
          >
            {isChartLoading ? (
              <div className="pvequalizer-detail-popup__status pvequalizer-detail-popup__status--loading">
                <p className="pvequalizer-detail-popup__loading-text">
                  데이터를 불러오는 중입니다…
                </p>
              </div>
            ) : chartStatus ? (
              <div
                className={`pvequalizer-detail-popup__status${
                  error ? " pvequalizer-detail-popup__status--error" : ""
                }`}
              >
                {chartStatus}
              </div>
            ) : (
              <RechartsResponsiveContainer width="100%" height="100%">
                <LineChart data={detailChartData} margin={{ top: 12, right: 16, bottom: 16, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: chartAxisColor }}
                    height={36}
                    axisLine={{ stroke: chartAxisColor }}
                    tickLine={{ stroke: chartAxisColor }}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 11, fill: chartAxisColor }}
                    width={60}
                    allowDecimals={false}
                    axisLine={{ stroke: chartAxisColor }}
                    tickLine={{ stroke: chartAxisColor }}
                    tickFormatter={(value) => formatDurationMs(parseNumeric(value))}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 11, fill: chartAxisColor }}
                    width={60}
                    allowDecimals={false}
                    axisLine={{ stroke: chartAxisColor }}
                    tickLine={{ stroke: chartAxisColor }}
                    tickFormatter={(value) => formatDurationMs(parseNumeric(value))}
                  />
                  <RechartsTooltip
                    formatter={tooltipFormatter}
                    labelFormatter={(label, payload) =>
                      payload?.[0]?.payload?.rawTime ?? label
                    }
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line
                    type="monotone"
                    dataKey="stayTime"
                    name="Stay Time"
                    yAxisId="right"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={{ r: 2, fill: "#2563eb", strokeWidth: 0 }}
                    activeDot={{ r: 3, fill: "#2563eb", strokeWidth: 0 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="loadingTime"
                    name="Loading Time"
                    yAxisId="left"
                    stroke="#ec4899"
                    strokeWidth={2}
                    dot={{ r: 2, fill: "#ec4899", strokeWidth: 0 }}
                    activeDot={{ r: 3, fill: "#ec4899", strokeWidth: 0 }}
                  />
                </LineChart>
              </RechartsResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>,
    modalRoot,
  );
}
