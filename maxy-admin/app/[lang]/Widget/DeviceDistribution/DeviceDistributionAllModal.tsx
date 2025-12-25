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
  getDeviceDistributionAllInfoList,
  getDeviceDistributionAllRowInfo,
  type DeviceDistributionAllInfoListItem,
  type DeviceDistributionAllInfoTotals,
  type DeviceDistributionAllRowInfoResponse,
} from "../../../api/Widget/DeviceDistribution";
import { type FavoritesDateType, type FavoritesTroubleType } from "../../../api/Widget/Favorites";

import "../Favorites/style.css";
import "./device-distribution-modal.css";

const DATE_OPTIONS: { key: FavoritesDateType; label: string }[] = [
  { key: "DAY", label: "Day" },
  { key: "WEEK", label: "1W" },
  { key: "MONTH", label: "1M" },
];

const PAGE_SIZE = 100;
const SCROLL_THRESHOLD_PX = 120;

type DeviceDistributionChartDatum = {
  ts: number;
  label: string;
  user: number;
  error: number;
  crash: number;
};

type DeviceDistributionAllModalProps = {
  open: boolean;
  applicationId: number;
  osType: string | null;
  tmzutc: number;
  onClose(): void;
  onOpenTroublePopup?: (payload: {
    deviceModel: string;
    troubleType: FavoritesTroubleType;
    hasError: boolean;
    hasCrash: boolean;
    dateType: FavoritesDateType;
  }) => void;
};

const numberFormatter = new Intl.NumberFormat("ko-KR");
const percentFormatter = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 2 });

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return "-";
  }
  return numberFormatter.format(Math.round(value));
}

function formatPercent(value: number): string {
  if (!Number.isFinite(value)) {
    return "-";
  }
  return `${percentFormatter.format(value)}%`;
}

function resolveOsLabel(osType: string | null | undefined): string {
  if (!osType || osType === "A" || osType.toLowerCase() === "all") {
    return "전체";
  }
  return osType;
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

function buildDeviceDistributionChartData(
  detail: DeviceDistributionAllRowInfoResponse,
  dateType: FavoritesDateType,
): DeviceDistributionChartDatum[] {
  const byTs = new Map<number, DeviceDistributionChartDatum>();

  const ensure = (ts: number) => {
    const tsKey = Number(ts);
    const existing = byTs.get(tsKey);
    if (existing) {
      return existing;
    }
    const created: DeviceDistributionChartDatum = {
      ts: tsKey,
      label: formatBucketLabel(tsKey, dateType),
      user: 0,
      error: 0,
      crash: 0,
    };
    byTs.set(tsKey, created);
    return created;
  };

  const applySeries = (
    series: Array<[number, number]>,
    key: keyof Omit<DeviceDistributionChartDatum, "ts" | "label">,
  ) => {
    for (const [ts, rawValue] of series ?? []) {
      const datum = ensure(ts);
      const numeric = Number(rawValue);
      datum[key] = Number.isFinite(numeric) ? numeric : 0;
    }
  };

  applySeries(detail.user ?? [], "user");
  applySeries(detail.error ?? [], "error");
  applySeries(detail.crash ?? [], "crash");

  return Array.from(byTs.values()).sort((a, b) => a.ts - b.ts);
}

export default function DeviceDistributionAllModal({
  open,
  applicationId,
  osType,
  tmzutc,
  onClose,
  onOpenTroublePopup,
}: DeviceDistributionAllModalProps) {
  const [dateType, setDateType] = useState<FavoritesDateType>("DAY");
  const [list, setList] = useState<DeviceDistributionAllInfoListItem[]>([]);
  const [totals, setTotals] = useState<DeviceDistributionAllInfoTotals>({
    totalUsers: 0,
    totalErrors: 0,
    totalCrashes: 0,
  });
  const [hasMore, setHasMore] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [detail, setDetail] = useState<DeviceDistributionAllRowInfoResponse | null>(null);
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
    let el = document.getElementById("device-distribution-all-modal-root");
    if (!el) {
      el = document.createElement("div");
      el.id = "device-distribution-all-modal-root";
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
        const payload = await getDeviceDistributionAllInfoList(
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
        setTotals(payload.totals ?? { totalUsers: 0, totalErrors: 0, totalCrashes: 0 });
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

  const selectedModel = useMemo(() => {
    if (focusedIndex == null) {
      return null;
    }
    return list[focusedIndex]?.deviceModel ?? null;
  }, [focusedIndex, list]);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (!selectedModel) {
      return;
    }

    setLoadingDetail(true);
    setDetailError(null);

    if (detailAbortRef.current) {
      detailAbortRef.current.abort();
    }
    const controller = new AbortController();
    detailAbortRef.current = controller;

    getDeviceDistributionAllRowInfo(
      {
        applicationId,
        osType,
        dateType,
        deviceModel: selectedModel,
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
  }, [applicationId, dateType, open, osType, selectedModel, tmzutc]);

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
    return buildDeviceDistributionChartData(detail, dateType);
  }, [dateType, detail]);

  const listWithRates = useMemo(() => {
    const totalUsers = totals.totalUsers || 0;
    const totalErrors = totals.totalErrors || 0;
    const totalCrashes = totals.totalCrashes || 0;
    return list.map((item) => ({
      ...item,
      userRate: totalUsers > 0 ? (item.userCount / totalUsers) * 100 : 0,
      errorRate: totalErrors > 0 ? (item.errorCount / totalErrors) * 100 : 0,
      crashRate: totalCrashes > 0 ? (item.crashCount / totalCrashes) * 100 : 0,
    }));
  }, [list, totals]);

  if (!open || !modalRoot) {
    return null;
  }

  const selected = focusedIndex != null ? listWithRates[focusedIndex] : null;
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
        aria-label="Device Distribution All"
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
                <table className="favorites-modal__table device-distribution-modal__table">
                  <thead>
                    <tr>
                      <th className="device-distribution-modal__col--os">OS</th>
                      <th className="device-distribution-modal__col--model">Device Model</th>
                      <th>User</th>
                      <th>User Rate</th>
                      <th>Error</th>
                      <th>Error Rate</th>
                      <th>Crash</th>
                      <th>Crash Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listWithRates.map((item, index) => {
                      const isActive = index === focusedIndex;
                      return (
                        <tr
                          key={`${item.deviceModel}-${item.osType}-${index}`}
                          className={isActive ? "favorites-modal__row--active" : undefined}
                          onClick={() => setFocusedIndex(index)}
                        >
                          <td className="device-distribution-modal__col--os">
                            {resolveOsLabel(item.osType)}
                          </td>
                          <td
                            className="device-distribution-modal__col--model favorites-modal__col--page"
                            title={item.deviceModel}
                          >
                            {item.deviceModel}
                          </td>
                          <td>{formatNumber(item.userCount)}</td>
                          <td>{formatPercent(item.userRate)}</td>
                          <td>
                            {item.errorCount > 0 && onOpenTroublePopup ? (
                              <button
                                type="button"
                                className="favorites-modal__trouble-link favorites-modal__trouble-link--error"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onOpenTroublePopup({
                                    deviceModel: item.deviceModel,
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
                          <td>{formatPercent(item.errorRate)}</td>
                          <td>
                            {item.crashCount > 0 && onOpenTroublePopup ? (
                              <button
                                type="button"
                                className="favorites-modal__trouble-link favorites-modal__trouble-link--crash"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onOpenTroublePopup({
                                    deviceModel: item.deviceModel,
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
                          <td>{formatPercent(item.crashRate)}</td>
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
            <div className="favorites-modal__chart-area">
              {detailError ? (
                <div className="favorites-modal__status favorites-modal__status--error">{detailError}</div>
              ) : detail ? (
                <DeviceDistributionIssueChart data={chartData} dateType={dateType} />
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

function DeviceDistributionIssueChart({
  data,
  dateType,
}: {
  data: DeviceDistributionChartDatum[];
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
            value: "User",
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
        <Bar dataKey="user" yAxisId="left" name="User" fill="#1d4ed8" radius={[6, 6, 0, 0]} maxBarSize={28} />
        <Bar dataKey="error" yAxisId="right" name="Error" fill="#FFC700" radius={[6, 6, 0, 0]} maxBarSize={18} />
        <Bar dataKey="crash" yAxisId="right" name="Crash" fill="#FF6969" radius={[6, 6, 0, 0]} maxBarSize={18} />
      </BarChart>
    </RechartsResponsiveContainer>
  );
}
