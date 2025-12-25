"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer as RechartsResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  getFavoritesAllInfoList,
  getFavoritesAllRowInfo,
  type FavoritesDateType,
  type FavoritesInfoListItem,
  type FavoritesRowInfoResponse,
  type FavoritesTroubleType,
} from "../../../api/Widget/Favorites";

const DATE_OPTIONS: { key: FavoritesDateType; label: string }[] = [
  { key: "DAY", label: "Day" },
  { key: "WEEK", label: "1W" },
  { key: "MONTH", label: "1M" },
];

const PAGE_SIZE = 100;
const SCROLL_THRESHOLD_PX = 120;

type ChartSeries = Array<[number, number]>;
type FavoritesTabType = "issue" | "performance";
type FavoritesChartDatum = {
  ts: number;
  label: string;
  count: number;
  error: number;
  crash: number;
  loadingTime: number;
  responseTime: number;
};

type FavoritesAllModalProps = {
  open: boolean;
  applicationId: number;
  osType: string | null;
  onClose(): void;
  tmzutc: number;
  onOpenTroublePopup?: (payload: {
    reqUrl: string;
    troubleType: FavoritesTroubleType;
    hasError: boolean;
    hasCrash: boolean;
    dateType: FavoritesDateType;
  }) => void;
};

const numberFormatter = new Intl.NumberFormat("ko-KR");

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return "-";
  }
  return numberFormatter.format(Math.round(value));
}

function formatDuration(value: number): string {
  if (!Number.isFinite(value)) {
    return "-";
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}s`;
  }
  return `${Math.round(value)}ms`;
}

function formatBucketLabel(ts: number, dateType: FavoritesDateType): string {
  const date = new Date(ts);
  if (dateType === "DAY") {
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  }
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildFavoritesChartData(
  detail: FavoritesRowInfoResponse,
  dateType: FavoritesDateType,
): FavoritesChartDatum[] {
  const byTs = new Map<number, FavoritesChartDatum>();

  const ensure = (ts: number) => {
    const tsKey = Number(ts);
    const existing = byTs.get(tsKey);
    if (existing) {
      return existing;
    }
    const created: FavoritesChartDatum = {
      ts: tsKey,
      label: formatBucketLabel(tsKey, dateType),
      count: 0,
      error: 0,
      crash: 0,
      loadingTime: 0,
      responseTime: 0,
    };
    byTs.set(tsKey, created);
    return created;
  };

  const applySeries = (series: ChartSeries, key: keyof Omit<FavoritesChartDatum, "ts" | "label">) => {
    for (const [ts, rawValue] of series ?? []) {
      const datum = ensure(ts);
      const numeric = Number(rawValue);
      datum[key] = Number.isFinite(numeric) ? numeric : 0;
    }
  };

  applySeries(detail.count, "count");
  applySeries(detail.error, "error");
  applySeries(detail.crash, "crash");
  applySeries(detail.loadingTime, "loadingTime");
  applySeries(detail.responseTime, "responseTime");

  return Array.from(byTs.values()).sort((a, b) => a.ts - b.ts);
}

export default function FavoritesAllModal({
  open,
  applicationId,
  osType,
  onClose,
  tmzutc,
  onOpenTroublePopup,
}: FavoritesAllModalProps) {
  const [dateType, setDateType] = useState<FavoritesDateType>("DAY");
  const [activeTab, setActiveTab] = useState<FavoritesTabType>("issue");
  const [list, setList] = useState<FavoritesInfoListItem[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [detail, setDetail] = useState<FavoritesRowInfoResponse | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const listAbortRef = useRef<AbortController | null>(null);
  const moreAbortRef = useRef<AbortController | null>(null);
  const isLoadingMoreRef = useRef(false);
  const detailAbortRef = useRef<AbortController | null>(null);
  const tableWrapperRef = useRef<HTMLDivElement | null>(null);
  const modalRoot = useMemo(() => {
    if (typeof window === "undefined") return null;
    let el = document.getElementById("favorites-all-modal-root");
    if (!el) {
      el = document.createElement("div");
      el.id = "favorites-all-modal-root";
      document.body.appendChild(el);
    }
    return el;
  }, []);

  const fetchListPage = useCallback(
    async ({ offset, append }: { offset: number; append: boolean }) => {
    if (!open || applicationId <= 0) {
      return;
    }
    setError(null);
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
      setFocusedIndex(null);
      setDetail(null);
      setDetailError(null);
      if (tableWrapperRef.current) {
        tableWrapperRef.current.scrollTop = 0;
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
      const payload = await getFavoritesAllInfoList(
        {
          applicationId,
          osType,
          dateType,
          limit: PAGE_SIZE,
          offset,
          tmzutc,
        },
        controller.signal,
      );

      const rows = payload.list ?? [];
      setHasMore(Boolean(payload.hasMore));
      if (append) {
        setList((prev) => [...prev, ...rows]);
      } else {
        setList(rows);
        if (rows.length > 0) {
          setFocusedIndex(0);
        }
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        setError(err instanceof Error ? err.message : "목록을 불러오지 못했습니다.");
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
    [open, applicationId, osType, dateType, tmzutc],
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    fetchListPage({ offset: 0, append: false });
  }, [fetchListPage, open]);

  const loadMore = useCallback(() => {
    if (!hasMore || loadingList) {
      return;
    }
    fetchListPage({ offset: list.length, append: true });
  }, [fetchListPage, hasMore, list.length, loadingList]);

  const handleTableScroll = useCallback(() => {
    const target = tableWrapperRef.current;
    if (!target || loadingList || loadingMore || !hasMore) {
      return;
    }
    const distanceToBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
    if (distanceToBottom <= SCROLL_THRESHOLD_PX) {
      loadMore();
    }
  }, [hasMore, loadMore, loadingList, loadingMore]);

  const selectedReqUrl = useMemo(() => {
    if (focusedIndex == null) {
      return null;
    }
    return list[focusedIndex]?.reqUrl ?? null;
  }, [focusedIndex, list]);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (!selectedReqUrl) {
      return;
    }

    setLoadingDetail(true);
    setDetailError(null);

    if (detailAbortRef.current) {
      detailAbortRef.current.abort();
    }
    const controller = new AbortController();
    detailAbortRef.current = controller;

    getFavoritesAllRowInfo(
      {
        applicationId,
        osType,
        dateType,
        reqUrl: selectedReqUrl,
        tmzutc,
      },
      controller.signal,
    )
      .then((payload) => {
        setDetail(payload);
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setDetailError(err instanceof Error ? err.message : "상세 데이터를 불러오지 못했습니다.");
        }
      })
      .finally(() => {
        if (detailAbortRef.current === controller) {
          detailAbortRef.current = null;
        }
        setLoadingDetail(false);
      });
  }, [applicationId, dateType, open, osType, selectedReqUrl, tmzutc]);

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
      setFocusedIndex(null);
      setHasMore(false);
      return;
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, open]);

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

  const chartData = useMemo(() => {
    if (!detail) {
      return [];
    }
    return buildFavoritesChartData(detail, dateType);
  }, [dateType, detail]);

  if (!open || !modalRoot) {
    return null;
  }

  const selected = focusedIndex != null ? list[focusedIndex] : null;
  const listCountLabel = list.length
    ? `(${formatNumber(list.length)}${hasMore ? "+" : ""})`
    : "";

  return createPortal(
    <div
      className="favorites-modal__backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="favorites-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Favorites All"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="favorites-modal__header">
          <div className="favorites-modal__title-group">
            <Image
              src="/images/maxy/icon-analysis.svg"
              alt=""
              width={22}
              height={22}
              className="favorites-modal__title-icon"
            />
            <h3 className="favorites-modal__title">
              Analysis {listCountLabel ? <span className="favorites-modal__count">{listCountLabel}</span> : null}
            </h3>
          </div>

          <div className="favorites-modal__header-actions">
            <div className="favorites-modal__date-toggle" aria-label="날짜 범위 선택">
              {DATE_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  className={`favorites-modal__date-button${
                    dateType === option.key ? " favorites-modal__date-button--active" : ""
                  }`}
                  onClick={() => setDateType(option.key)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        <div className="favorites-modal__body">
          <section className="favorites-modal__table-section">
            {loadingList ? (
              <div className="favorites-modal__status">목록을 불러오는 중입니다…</div>
            ) : error ? (
              <div className="favorites-modal__status favorites-modal__status--error">{error}</div>
            ) : (
              <div
                className="favorites-modal__table-wrapper"
                ref={tableWrapperRef}
                onScroll={handleTableScroll}
              >
                <table className="favorites-modal__table">
                  <thead>
                    <tr>
                      <th className="favorites-modal__col--page">Page</th>
                      <th>Count</th>
                      <th>Stay</th>
                      <th>Loading</th>
                      <th>Response</th>
                      <th>Error</th>
                      <th>Crash</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((item, index) => {
                      const isActive = index === focusedIndex;
                      return (
                        <tr
                          key={`${item.reqUrl}-${index}`}
                          className={isActive ? "favorites-modal__row--active" : undefined}
                          onClick={() => setFocusedIndex(index)}
                        >
                          <td className="favorites-modal__col--page" title={item.reqUrl}>
                            {item.reqUrl}
                          </td>
                          <td>{formatNumber(item.count)}</td>
                          <td>{formatDuration(item.intervaltime)}</td>
                          <td>{formatDuration(item.loadingTime)}</td>
                          <td>{formatDuration(item.responseTime)}</td>
                          <td>
                            {item.errorCount > 0 && onOpenTroublePopup ? (
                              <button
                                type="button"
                                className="favorites-modal__trouble-link favorites-modal__trouble-link--error"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onOpenTroublePopup({
                                    reqUrl: item.reqUrl,
                                    troubleType: "error",
                                    hasError: item.errorCount > 0,
                                    hasCrash: item.crashCount > 0,
                                    dateType,
                                  });
                                }}
                              >
                                {formatNumber(item.errorCount)}
                              </button>
                            ) : (
                              formatNumber(item.errorCount)
                            )}
                          </td>
                          <td>
                            {item.crashCount > 0 && onOpenTroublePopup ? (
                              <button
                                type="button"
                                className="favorites-modal__trouble-link favorites-modal__trouble-link--crash"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onOpenTroublePopup({
                                    reqUrl: item.reqUrl,
                                    troubleType: "crash",
                                    hasError: item.errorCount > 0,
                                    hasCrash: item.crashCount > 0,
                                    dateType,
                                  });
                                }}
                              >
                                {formatNumber(item.crashCount)}
                              </button>
                            ) : (
                              formatNumber(item.crashCount)
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {loadingMore ? (
                  <div className="favorites-modal__load-more">추가 데이터를 불러오는 중입니다…</div>
                ) : null}
              </div>
            )}
          </section>

          <section className="favorites-modal__chart-wrap">
            <div className="favorites-modal__tabs" role="tablist" aria-label="Favorites tabs">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "issue"}
                className={`favorites-modal__tab${activeTab === "issue" ? " favorites-modal__tab--active" : ""}`}
                onClick={() => setActiveTab("issue")}
              >
                Issue
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "performance"}
                className={`favorites-modal__tab${
                  activeTab === "performance" ? " favorites-modal__tab--active" : ""
                }`}
                onClick={() => setActiveTab("performance")}
              >
                Performance
              </button>
            </div>

            <div className="favorites-modal__chart-area">
              {detailError ? (
                <div className="favorites-modal__status favorites-modal__status--error">{detailError}</div>
              ) : detail ? (
                activeTab === "issue" ? (
                  <FavoritesIssueChart data={chartData} dateType={dateType} />
                ) : (
                  <FavoritesPerformanceChart data={chartData} dateType={dateType} />
                )
              ) : selected ? null : (
                <div className="favorites-modal__status">행을 선택하면 상세 데이터를 확인할 수 있습니다.</div>
              )}

              {loadingDetail ? (
                <div className="favorites-modal__loading-cursor" aria-label="Loading">
                  <div className="lds-ellipsis" aria-hidden="true">
                    <div />
                    <div />
                    <div />
                    <div />
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </div>,
    modalRoot,
  );
}

function FavoritesIssueChart({
  data,
  dateType,
}: {
  data: FavoritesChartDatum[];
  dateType: FavoritesDateType;
}) {
  return (
    <RechartsResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 18, right: 20, bottom: 14, left: 12 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--favorites-chart-grid, rgba(148, 163, 184, 0.35))" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "var(--favorites-chart-axis, #64748b)" }}
          height={34}
          axisLine={{ stroke: "var(--favorites-chart-axis, #64748b)" }}
          tickLine={{ stroke: "var(--favorites-chart-axis, #64748b)" }}
          interval="preserveStartEnd"
          minTickGap={12}
        />
        <YAxis
          yAxisId="left"
          tick={{ fontSize: 11, fill: "var(--favorites-chart-axis, #64748b)" }}
          width={64}
          allowDecimals={false}
          axisLine={{ stroke: "var(--favorites-chart-axis, #64748b)" }}
          tickLine={{ stroke: "var(--favorites-chart-axis, #64748b)" }}
          tickFormatter={(value) => formatNumber(Number(value))}
          label={{
            value: "Count",
            angle: -90,
            position: "insideLeft",
            style: { fill: "var(--favorites-chart-axis, #64748b)", fontSize: 11 },
          }}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          tick={{ fontSize: 11, fill: "var(--favorites-chart-axis, #64748b)" }}
          width={64}
          allowDecimals={false}
          axisLine={{ stroke: "var(--favorites-chart-axis, #64748b)" }}
          tickLine={{ stroke: "var(--favorites-chart-axis, #64748b)" }}
          tickFormatter={(value) => formatNumber(Number(value))}
          label={{
            value: "Error / Crash",
            angle: 90,
            position: "insideRight",
            style: { fill: "var(--favorites-chart-axis, #64748b)", fontSize: 11 },
          }}
        />
        <RechartsTooltip
          formatter={(value, name) => [formatNumber(Number(value)), name]}
          labelFormatter={(label) => {
            if (typeof label !== "string") {
              return label;
            }
            return dateType === "DAY" ? label : label;
          }}
          contentStyle={{
            background: "var(--favorites-chart-tooltip-bg, rgba(255, 255, 255, 0.95))",
            borderColor: "var(--favorites-chart-tooltip-border, rgba(148, 163, 184, 0.25))",
            borderRadius: 10,
            fontSize: 12,
          }}
          cursor={{ fill: "rgba(2, 132, 199, 0.08)" }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar
          dataKey="count"
          yAxisId="left"
          name="Count"
          fill="#1d4ed8"
          radius={[6, 6, 0, 0]}
          maxBarSize={28}
        />
        <Bar
          dataKey="error"
          yAxisId="right"
          name="Error"
          fill="#FFC700"
          radius={[6, 6, 0, 0]}
          maxBarSize={18}
        />
        <Bar
          dataKey="crash"
          yAxisId="right"
          name="Crash"
          fill="#FF6969"
          radius={[6, 6, 0, 0]}
          maxBarSize={18}
        />
      </BarChart>
    </RechartsResponsiveContainer>
  );
}

function FavoritesPerformanceChart({
  data,
  dateType,
}: {
  data: FavoritesChartDatum[];
  dateType: FavoritesDateType;
}) {
  return (
    <RechartsResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 18, right: 20, bottom: 14, left: 12 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--favorites-chart-grid, rgba(148, 163, 184, 0.35))" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "var(--favorites-chart-axis, #64748b)" }}
          height={34}
          axisLine={{ stroke: "var(--favorites-chart-axis, #64748b)" }}
          tickLine={{ stroke: "var(--favorites-chart-axis, #64748b)" }}
          interval="preserveStartEnd"
          minTickGap={12}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "var(--favorites-chart-axis, #64748b)" }}
          width={72}
          allowDecimals={false}
          axisLine={{ stroke: "var(--favorites-chart-axis, #64748b)" }}
          tickLine={{ stroke: "var(--favorites-chart-axis, #64748b)" }}
          tickFormatter={(value) => formatDuration(Number(value))}
        />
        <RechartsTooltip
          formatter={(value, name) => [formatDuration(Number(value)), name]}
          labelFormatter={(label) => {
            if (typeof label !== "string") {
              return label;
            }
            return dateType === "DAY" ? label : label;
          }}
          contentStyle={{
            background: "var(--favorites-chart-tooltip-bg, rgba(255, 255, 255, 0.95))",
            borderColor: "var(--favorites-chart-tooltip-border, rgba(148, 163, 184, 0.25))",
            borderRadius: 10,
            fontSize: 12,
          }}
          cursor={{ fill: "rgba(2, 132, 199, 0.08)" }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="loadingTime" name="Loading Time (MED)" fill="#0ea5e9" radius={[6, 6, 0, 0]} maxBarSize={28} />
        <Bar dataKey="responseTime" name="Response Time (Avg.)" fill="#8b5cf6" radius={[6, 6, 0, 0]} maxBarSize={28} />
      </BarChart>
    </RechartsResponsiveContainer>
  );
}
