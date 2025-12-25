"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useUserSettings } from "../../../../components/usersettings/UserSettingsProvider";
import { AppList, type ApplicationSummary } from "../../../api/AppList";
import {
  getFavoritesInfoList,
  type FavoritesDateType,
  type FavoritesInfoListItem,
  type FavoritesTroubleType,
} from "../../../api/Widget/Favorites";
import { useTheme } from "../../../../components/theme/ThemeProvider";

import "./style.css";
import FavoritesAllModal from "./FavoritesAllModal";
import FavoritesTroublePopup from "./FavoritesTroublePopup";

const REFRESH_INTERVAL_MS = 15_000;
const LAYOUT_BREAKPOINT_PX = 430;

type CardVariant = "webview" | "native";

const numberFormatter = new Intl.NumberFormat("ko-KR");

const timestampFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

function parseNumeric(value: string | number | null | undefined): number {
  if (value == null) {
    return 0;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return "-";
  }
  return numberFormatter.format(Math.round(value));
}

function formatDuration(value: number): string {
  if (!Number.isFinite(value) || value < 0) {
    return "-";
  }
  if (value >= 60 * 1000) {
    const minutes = Math.floor(value / (60 * 1000));
    const seconds = Math.round((value % (60 * 1000)) / 1000);
    const paddedSeconds = seconds.toString().padStart(2, "0");
    return `${minutes}m ${paddedSeconds}s`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}s`;
  }
  return `${Math.round(value)}ms`;
}

function resolveVariant(logType?: string | null): CardVariant {
  const normalized = (logType ?? "").toLowerCase();
  if (normalized.includes("native") || normalized.includes("android") || normalized.includes("ios")) {
    return "native";
  }
  return "webview";
}

function resolveIcon(variant: CardVariant): string {
  return variant === "native"
    ? "/images/maxy/icon-check-purple.svg"
    : "/images/maxy/icon-check-blue.svg";
}

function chunkCards<T>(items: T[], size: number): T[][] {
  if (size <= 0) {
    return [items];
  }
  const pages: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    pages.push(items.slice(index, index + size));
  }
  return pages;
}

type CardMetric = {
  key: string;
  label: string;
  value: string;
  rawValue?: number;
  type: "error" | "crash" | null;
  priority: number;
  category: "performance" | "count";
};

type CardView = {
  key: string;
  title: string;
  count: string;
  variant: CardVariant;
  metrics: CardMetric[];
  errorCount: number;
  crashCount: number;
};

function FavoritesCardMetrics({
  metrics,
  layoutKey,
  onTroubleClick,
}: {
  metrics: CardMetric[];
  layoutKey: "wide" | "narrow";
  onTroubleClick?: (type: FavoritesTroubleType) => void;
}) {
  const [visibleMetrics, setVisibleMetrics] = useState<CardMetric[]>(metrics);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setVisibleMetrics(metrics);
  }, [metrics, layoutKey]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    if (container.scrollHeight <= container.clientHeight + 1) {
      return;
    }

    if (layoutKey === "narrow") {
      const perfCandidate = visibleMetrics
        .map((metric, index) => ({ metric, index }))
        .filter(({ metric }) => metric.category === "performance")
        .sort((a, b) => a.metric.priority - b.metric.priority)[0];

      if (perfCandidate?.index != null) {
        setVisibleMetrics((prev) => prev.filter((_, idx) => idx !== perfCandidate.index));
        return;
      }
    }

    const fallbackCandidate = visibleMetrics
      .map((metric, index) => ({ metric, index }))
      .filter(({ metric }) => metric.priority < 3)
      .sort((a, b) => a.metric.priority - b.metric.priority)[0];

    if (fallbackCandidate?.index != null) {
      setVisibleMetrics((prev) => prev.filter((_, idx) => idx !== fallbackCandidate.index));
    }
  }, [visibleMetrics, layoutKey]);
  return (
    <div className="favorites-card__metrics" ref={containerRef}>
      {visibleMetrics.map((metric) => {
        const troubleType = metric.type;
        return (
          <div
            key={metric.key}
            className={`favorites-card__metric${
              metric.type ? ` favorites-card__metric--${metric.type}` : ""
            }`}
          >
            <div className="favorites-card__metric-label">{metric.label}</div>
            {troubleType && onTroubleClick && (metric.rawValue ?? 0) > 0 ? (
              <button
                type="button"
                className={`favorites-card__metric-value favorites-card__metric-value-btn ${troubleType}`}
                onClick={() => onTroubleClick(troubleType)}
              >
                {metric.value}
              </button>
            ) : (
              <div
                className={`favorites-card__metric-value${metric.type ? ` ${metric.type}` : ""}`}
              >
                {metric.value}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function FavoritesWidget() {
  const {
    applicationId: storedApplicationId,
    userNo: storedUserNo,
    osType: storedOsType,
    tmzutc,
  } = useUserSettings();
  const { theme } = useTheme();
  const isDarkMode = theme === "dark";

  const userNo = useMemo(() => parseNumeric(storedUserNo), [storedUserNo]);
  const preferredApplicationId = useMemo(
    () => parseNumeric(storedApplicationId),
    [storedApplicationId],
  );

  const [resolvedApplicationId, setResolvedApplicationId] = useState<number>(
    preferredApplicationId > 0 ? preferredApplicationId : 0,
  );
  const resolvedOsType = useMemo(() => storedOsType ?? "A", [storedOsType]);
  const [appResolveError, setAppResolveError] = useState<string | null>(null);
  const [isResolvingApp, setIsResolvingApp] = useState(false);
  const [records, setRecords] = useState<FavoritesInfoListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [isWideLayout, setIsWideLayout] = useState<boolean>(() => {
    if (typeof window === "undefined") {
      return true;
    }
    return window.innerWidth >= LAYOUT_BREAKPOINT_PX;
  });
  const [currentPage, setCurrentPage] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [troublePopup, setTroublePopup] = useState<{
    reqUrl: string;
    dateType: FavoritesDateType;
    initialType: FavoritesTroubleType;
    hasError: boolean;
    hasCrash: boolean;
  } | null>(null);
  const autoSlideTimerRef = useRef<number | null>(null);

  const applicationCacheRef = useRef<{ userNo: number; list: ApplicationSummary[] } | null>(null);
  const refreshTimerRef = useRef<number | null>(null);
  const activeFetchControllerRef = useRef<AbortController | null>(null);
  const layoutRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const target = layoutRef.current;
    if (!target || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setIsWideLayout(entry.contentRect.width >= LAYOUT_BREAKPOINT_PX);
      }
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const numericPreferred = preferredApplicationId;
    if (numericPreferred > 0) {
      if (numericPreferred !== resolvedApplicationId) {
        setRecords([]);
        setLastUpdated(null);
        setResolvedApplicationId(numericPreferred);
      }
      setAppResolveError(null);
      return;
    }

    if (userNo <= 0) {
      if (resolvedApplicationId !== 0) {
        setResolvedApplicationId(0);
      }
      setRecords([]);
      setLastUpdated(null);
      if (numericPreferred <= 0) {
        setAppResolveError("사용자 정보가 필요합니다.");
      }
      return;
    }

    let cancelled = false;
    async function resolveApplication() {
      setIsResolvingApp(true);
      setAppResolveError(null);

      try {
        let apps: ApplicationSummary[] | null = null;
        const cached = applicationCacheRef.current;
        if (cached && cached.userNo === userNo) {
          apps = cached.list;
        }

        if (!apps) {
          const response = await AppList({ userNo, osType: "all" });
          if (cancelled) return;
          apps = response.applicationList ?? [];
          applicationCacheRef.current = { userNo, list: apps };
        }

        if (cancelled) return;

        const fallbackEntry = apps?.find((item) => Number(item.applicationId) > 0) ?? null;
        const fallbackId = fallbackEntry?.applicationId ?? 0;
        if (fallbackId > 0) {
          if (fallbackId !== resolvedApplicationId) {
            setRecords([]);
            setLastUpdated(null);
            setResolvedApplicationId(fallbackId);
          }
          setAppResolveError(null);
        } else {
          if (resolvedApplicationId !== 0) {
            setResolvedApplicationId(0);
          }
          setRecords([]);
          setLastUpdated(null);
          setAppResolveError("사용 가능한 애플리케이션이 없습니다.");
        }
      } catch (fetchError) {
        if (!cancelled) {
          if (resolvedApplicationId !== 0) {
            setResolvedApplicationId(0);
          }
          setRecords([]);
          setLastUpdated(null);
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
  }, [preferredApplicationId, userNo, resolvedApplicationId]);

  const fetchFavorites = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (resolvedApplicationId <= 0) {
        setRecords([]);
        setLastUpdated(null);
        return;
      }

      if (mode === "initial") {
        setLoading(true);
      }

      if (activeFetchControllerRef.current) {
        activeFetchControllerRef.current.abort();
      }

      const controller = new AbortController();
      activeFetchControllerRef.current = controller;

      try {
        const list = await getFavoritesInfoList(
          {
            applicationId: resolvedApplicationId,
            osType: resolvedOsType,
            dateType: "DAY",
            size: 30,
            tmzutc: tmzutc,
          },
          controller.signal,
        );

        if (controller.signal.aborted) {
          return;
        }

        setRecords(list);
        setError(null);
        setLastUpdated(Date.now());
        setCurrentPage(0);
      } catch (fetchError) {
        if (controller.signal.aborted) {
          return;
        }
        if (mode === "initial") {
          setRecords([]);
          setLastUpdated(null);
        }
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Favorites 데이터를 불러오지 못했습니다.",
        );
      } finally {
        if (activeFetchControllerRef.current === controller) {
          activeFetchControllerRef.current = null;
        }
        if (mode === "initial") {
          setLoading(false);
        }
      }
    },
    [resolvedApplicationId, resolvedOsType, tmzutc],
  );

  useEffect(() => {
    const stopTimer = () => {
      if (refreshTimerRef.current != null) {
        window.clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };

    stopTimer();

    if (activeFetchControllerRef.current) {
      activeFetchControllerRef.current.abort();
      activeFetchControllerRef.current = null;
    }

    if (resolvedApplicationId <= 0) {
      setRecords([]);
      setLoading(false);
      return () => {
        stopTimer();
      };
    }

    let cancelled = false;

    async function runInitial() {
      await fetchFavorites("initial");
      if (cancelled) return;
      refreshTimerRef.current = window.setTimeout(async function schedule() {
        await fetchFavorites("refresh");
        if (!cancelled) {
          refreshTimerRef.current = window.setTimeout(schedule, REFRESH_INTERVAL_MS);
        }
      }, REFRESH_INTERVAL_MS);
    }

    runInitial();

    return () => {
      cancelled = true;
      stopTimer();
      if (activeFetchControllerRef.current) {
        activeFetchControllerRef.current.abort();
        activeFetchControllerRef.current = null;
      }
    };
  }, [fetchFavorites, resolvedApplicationId]);

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current != null) {
        window.clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      if (activeFetchControllerRef.current) {
        activeFetchControllerRef.current.abort();
        activeFetchControllerRef.current = null;
      }
      if (autoSlideTimerRef.current != null) {
        window.clearInterval(autoSlideTimerRef.current);
        autoSlideTimerRef.current = null;
      }
    };
  }, []);

  const cards: CardView[] = useMemo(() => {
    return records.map((item) => {
      const variant = resolveVariant(item.logType);
      const metrics: CardMetric[] = [
        {
          key: "loadingTime",
          label: "Loading Time",
          value: formatDuration(item.loadingTime),
          type: null,
          priority: 2,
          category: "performance",
        },
        {
          key: "responseTime",
          label: "Response Time",
          value: formatDuration(item.responseTime),
          type: null,
          priority: 2,
          category: "performance",
        },
        {
          key: "stayTime",
          label: "Stay Time",
          value: formatDuration(item.intervaltime),
          type: null,
          priority: 1,
          category: "performance",
        },
        {
          key: "error",
          label: "Error",
          value: formatNumber(item.errorCount),
          rawValue: item.errorCount,
          type: "error",
          priority: 3,
          category: "count",
        },
        {
          key: "crash",
          label: "Crash",
          value: formatNumber(item.crashCount),
          rawValue: item.crashCount,
          type: "crash",
          priority: 3,
          category: "count",
        },
      ];

      return {
        key: item.reqUrl,
        title: item.reqUrl,
        count: formatNumber(item.count),
        variant,
        metrics,
        errorCount: item.errorCount,
        crashCount: item.crashCount,
      };
    });
  }, [records]);

  const cardsPerPage = isWideLayout ? 6 : 4;
  const columns = isWideLayout ? 3 : 2;
  const rows = Math.max(1, Math.ceil(cardsPerPage / columns));

  const pages = useMemo(() => chunkCards(cards, cardsPerPage), [cards, cardsPerPage]);

  useEffect(() => {
    setCurrentPage((prev) => {
      if (prev >= pages.length) {
        return Math.max(0, pages.length - 1);
      }
      return prev;
    });
  }, [pages.length]);

  const resolvedStateMessage = useMemo(() => {
    if (error) {
      return error;
    }
    if (isResolvingApp) {
      return "데이터를 불러오고 있습니다.";
    }
    if (appResolveError) {
      return appResolveError;
    }
    if (loading) {
      return "데이터를 불러오고 있습니다.";
    }
    if (cards.length === 0) {
      return "데이터를 불러오고 있습니다.";
    }
    return null;
  }, [appResolveError, cards.length, error, isResolvingApp, loading]);

  const gridStyle = useMemo(
    () => ({
      gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
      gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
    }),
    [columns, rows],
  );

  useEffect(() => {
    if (autoSlideTimerRef.current != null) {
      window.clearInterval(autoSlideTimerRef.current);
      autoSlideTimerRef.current = null;
    }

    if (pages.length <= 1) {
      return;
    }

    autoSlideTimerRef.current = window.setInterval(() => {
      setCurrentPage((prev) => {
        if (prev >= pages.length - 1) {
          return 0;
        }
        return prev + 1;
      });
    }, 5000);

    return () => {
      if (autoSlideTimerRef.current != null) {
        window.clearInterval(autoSlideTimerRef.current);
        autoSlideTimerRef.current = null;
      }
    };
  }, [pages.length]);

  const layoutClass = isWideLayout ? "favorites-widget--wide" : "favorites-widget--narrow";
  const layoutKey: "wide" | "narrow" = isWideLayout ? "wide" : "narrow";

  const openTroublePopup = useCallback(
    (payload: {
      reqUrl: string;
      troubleType: FavoritesTroubleType;
      hasError: boolean;
      hasCrash: boolean;
      dateType: FavoritesDateType;
    }) => {
      setTroublePopup({
        reqUrl: payload.reqUrl,
        initialType: payload.troubleType,
        hasError: payload.hasError,
        hasCrash: payload.hasCrash,
        dateType: payload.dateType,
      });
    },
    [],
  );

  return (
    <div className={`favorites-widget ${layoutClass}${isDarkMode ? " favorites-widget--dark" : ""}`}>
      <header className="favorites-widget__header">
        <div className="favorites-widget__title">
          <h4>Favorites</h4>
          <img
            src="/images/maxy/ic-question-grey-blue.svg"
            alt="도움말"
            className="favorites-widget__help"
          />
        </div>
        <div className="favorites-widget__actions">
          <button
            type="button"
            className="favorites-widget__all-btn"
            onClick={() => setIsModalOpen(true)}
          >
            ALL
          </button>
        </div>
      </header>
      <div className="favorites-widget__body" ref={layoutRef}>
        {resolvedStateMessage ? (
          <div className="favorites-widget__status">{resolvedStateMessage}</div>
        ) : (
          <div className="favorites-widget__swiper">
            <div
              className="favorites-widget__slides"
              style={{ transform: `translate3d(-${currentPage * 100}%, 0, 0)` }}
            >
              {pages.map((pageCards, pageIndex) => (
                <div className="favorites-widget__slide" key={`slide-${pageIndex}`}>
                  <div className="favorites-widget__grid" style={gridStyle}>
                    {pageCards.map((card) => (
                      <article key={card.key} className={`favorites-card ${card.variant}`}>
                        <div className={`favorites-card__header ${card.variant}`}>
                          <div className="favorites-card__header-main">
                            <i
                              className={`favorites-card__icon ${card.variant}`}
                              aria-hidden="true"
                              style={{ backgroundImage: `url(${resolveIcon(card.variant)})` }}
                            />
                            <div className="favorites-card__title" title={card.title}>
                              {card.title}
                            </div>
                          </div>
                          <div className="favorites-card__count">{card.count}</div>
                        </div>
                        <FavoritesCardMetrics
                          metrics={card.metrics}
                          layoutKey={layoutKey}
                          onTroubleClick={(type) => {
                            if (!card.title) {
                              return;
                            }
                            openTroublePopup({
                              reqUrl: card.title,
                              troubleType: type,
                              hasError: card.errorCount > 0,
                              hasCrash: card.crashCount > 0,
                              dateType: "DAY",
                            });
                          }}
                        />
                      </article>
                    ))}
                    {pageCards.length < cardsPerPage
                      ? Array.from({ length: cardsPerPage - pageCards.length }).map((_, idx) => (
                          <div
                            className="favorites-card favorites-card--placeholder"
                            key={`placeholder-${pageIndex}-${idx}`}
                            aria-hidden="true"
                          />
                        ))
                      : null}
                  </div>
                </div>
              ))}
            </div>
            {pages.length > 1 ? (
              <>
                <div className="favorites-widget__pagination">
                  {pages.map((_, index) => (
                    <button
                      type="button"
                      key={`dot-${index}`}
                      className={`favorites-widget__dot${
                        currentPage === index ? " favorites-widget__dot--active" : ""
                      }`}
                      onClick={() => setCurrentPage(index)}
                      aria-label={`페이지 ${index + 1}`}
                    />
                  ))}
                </div>
              </>
            ) : null}
          </div>
        )}
      </div>
      <FavoritesAllModal
        open={isModalOpen}
        applicationId={resolvedApplicationId}
        osType={resolvedOsType}
        tmzutc={tmzutc}
        onClose={() => setIsModalOpen(false)}
        onOpenTroublePopup={openTroublePopup}
      />
      <FavoritesTroublePopup
        open={Boolean(troublePopup)}
        applicationId={resolvedApplicationId}
        osType={resolvedOsType}
        tmzutc={tmzutc}
        dateType={troublePopup?.dateType ?? "DAY"}
        reqUrl={troublePopup?.reqUrl ?? null}
        initialType={troublePopup?.initialType ?? "error"}
        hasError={Boolean(troublePopup?.hasError)}
        hasCrash={Boolean(troublePopup?.hasCrash)}
        onClose={() => setTroublePopup(null)}
      />
    </div>
  );
}
