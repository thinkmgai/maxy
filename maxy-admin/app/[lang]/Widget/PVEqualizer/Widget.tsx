"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type MouseEvent,
} from "react";

import { useUserSettings } from "../../../../components/usersettings/UserSettingsProvider";
import { useTheme } from "../../../../components/theme/ThemeProvider";
import { getPVEqualizerInfoList, type PVEqualizerInfoItem } from "../../../api/Widget/PVEqualizer";

import "./style.css";
import PVEqualizerAllModal from "./PVEqualizerAllModal";
import PVEqualizerDetailModal from "./PVEqualizerDetailModal";

const REFRESH_INTERVAL_MS = 20_000;
const AUTO_SLIDE_INTERVAL_MS = 5_000;
const ITEMS_PER_PAGE = 10;
const FETCH_SIZE = 30;
const STACK_LEVELS = 10;
const TOOLTIP_OFFSET = 12;

const numberFormatter = new Intl.NumberFormat("ko-KR");

function parseNumeric(value: unknown): number {
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

function formatTitle(reqUrl: string): string {
  if (!reqUrl) {
    return "-";
  }
  const trimmed = reqUrl.trim();
  if (!trimmed) {
    return "-";
  }
  const base = trimmed.split("?")[0] ?? trimmed;
  if (base === "/") {
    return "/";
  }
  return base;
}

function computeStackLength(value: number, maxValue: number): number {
  const pv = Number(value);
  const maxPv = Number(maxValue);
  if (!Number.isFinite(pv) || pv <= 0) {
    return 1;
  }
  if (!Number.isFinite(maxPv) || maxPv <= 0) {
    return 1;
  }

  const scaled = Math.ceil((pv / maxPv) * STACK_LEVELS);
  return Math.min(STACK_LEVELS, Math.max(1, scaled));
}

function resolveVariant(logType: PVEqualizerInfoItem["logType"], index: number): "webview" | "native" {
  if (logType != null) {
    const normalized = String(logType).toLowerCase();
    if (normalized.includes("native")) {
      return "native";
    }
    if (normalized.includes("webview") || normalized.includes("web")) {
      return "webview";
    }
  }
  return index % 2 === 0 ? "native" : "webview";
}

type EqualizerViewItem = {
  key: string;
  reqUrl: string;
  displayUrl: string;
  viewCount: number;
  uniqDeviceCount: number;
  stackLength: number;
  variant: "webview" | "native";
};

type EqualizerTooltipAnchor = {
  item: EqualizerViewItem;
  x: number;
  y: number;
};

type EqualizerTooltipPosition = {
  left: number;
  top: number;
  placement: "top" | "bottom";
};

export default function PVEqualizerWidget() {
  const { applicationId: storedApplicationId, osType: storedOsType, tmzutc, hasLoadedSettings } =
    useUserSettings();
  const { theme } = useTheme();

  const widgetRef = useRef<HTMLDivElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const stackSizingFrameRef = useRef<number | null>(null);
  const scheduleStackSizingRef = useRef<(() => void) | null>(null);
  const lastStackSizingRef = useRef<{ height: number; gap: number; width: number } | null>(null);
  const [items, setItems] = useState<PVEqualizerInfoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [isAllModalOpen, setIsAllModalOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<EqualizerViewItem | null>(null);
  const [tooltipAnchor, setTooltipAnchor] = useState<EqualizerTooltipAnchor | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<EqualizerTooltipPosition | null>(null);

  const controllerRef = useRef<AbortController | null>(null);
  const intervalRef = useRef<number | null>(null);
  const slideIntervalRef = useRef<number | null>(null);
  const slideDirectionRef = useRef<1 | -1>(1);

  const applicationId = useMemo(() => {
    const numeric = Number(storedApplicationId);
    if (Number.isFinite(numeric) && numeric > 0) {
      return String(numeric);
    }
    return "";
  }, [storedApplicationId]);

  const normalizedTmzutc = useMemo(() => {
    return Number.isFinite(tmzutc) ? tmzutc : 0;
  }, [tmzutc]);

  const fetchData = useCallback(() => {
    if (!hasLoadedSettings) {
      return;
    }
    if (!applicationId) {
      setError("대상 앱을 선택해 주세요.");
      setItems([]);
      return;
    }

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setLoading(true);
    setError(null);

    getPVEqualizerInfoList(
      {
        applicationId,
        osType: storedOsType,
        size: FETCH_SIZE,
        tmzutc: normalizedTmzutc,
      },
      controller.signal,
    )
      .then((result) => {
        if (controller.signal.aborted) {
          return;
        }
        setItems(Array.isArray(result.items) ? result.items : []);
      })
      .catch((fetchError) => {
        if (controller.signal.aborted) {
          return;
        }
        const message =
          fetchError instanceof Error
            ? fetchError.message
            : "PV Equalizer 데이터를 불러오지 못했습니다.";
        setError(message);
        setItems([]);
      })
      .finally(() => {
        if (controllerRef.current === controller) {
          controllerRef.current = null;
        }
        setLoading(false);
      });
  }, [applicationId, storedOsType, normalizedTmzutc, hasLoadedSettings]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchData();
    }, 0);
    return () => {
      window.clearTimeout(timer);
      controllerRef.current?.abort();
    };
  }, [fetchData]);

  useEffect(() => {
    if (!applicationId || !hasLoadedSettings) {
      return undefined;
    }
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    intervalRef.current = window.setInterval(fetchData, REFRESH_INTERVAL_MS);
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [applicationId, hasLoadedSettings, fetchData]);

  const preparedItems = useMemo<EqualizerViewItem[]>(() => {
    if (!items || items.length === 0) {
      return [];
    }

    const sorted = [...items].sort((a, b) => parseNumeric(b.viewCount) - parseNumeric(a.viewCount));
    const maxView = Math.max(...sorted.map((item) => parseNumeric(item.viewCount)), 0) || 1;

    return sorted.slice(0, FETCH_SIZE).map((item, index) => {
      const viewCount = parseNumeric(item.viewCount);
      const rawUrl = String(item.reqUrl ?? "").trim();
      return {
        key: `${String(item.reqUrl || "item")}-${index}`.replace(/[^a-zA-Z0-9_-]+/g, "_"),
        reqUrl: rawUrl,
        displayUrl: formatTitle(rawUrl),
        viewCount,
        uniqDeviceCount: parseNumeric(item.uniqDeviceCount),
        stackLength: computeStackLength(viewCount, maxView),
        variant: resolveVariant(item.logType, index),
      };
    });
  }, [items]);

  const pages = useMemo(() => {
    if (preparedItems.length === 0) {
      return [] as EqualizerViewItem[][];
    }
    const result: EqualizerViewItem[][] = [];
    for (let idx = 0; idx < preparedItems.length; idx += ITEMS_PER_PAGE) {
      result.push(preparedItems.slice(idx, idx + ITEMS_PER_PAGE));
    }
    return result;
  }, [preparedItems]);

  const hideTooltip = useCallback(() => {
    setTooltipAnchor(null);
    setTooltipPosition(null);
  }, []);

  const setTooltipFromPointer = useCallback(
    (event: MouseEvent<HTMLDivElement>, item: EqualizerViewItem) => {
      setTooltipAnchor({
        item,
        x: event.clientX,
        y: event.clientY,
      });
    },
    [],
  );

  const setTooltipFromTarget = useCallback(
    (event: FocusEvent<HTMLDivElement>, item: EqualizerViewItem) => {
      const rect = event.currentTarget.getBoundingClientRect();
      setTooltipAnchor({
        item,
        x: rect.left + rect.width / 2,
        y: rect.top,
      });
    },
    [],
  );

  useLayoutEffect(() => {
    if (!tooltipAnchor) {
      setTooltipPosition(null);
      return;
    }
    const tooltipEl = tooltipRef.current;
    if (!tooltipEl) {
      return;
    }

    const rect = tooltipEl.getBoundingClientRect();
    const margin = 12;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let left = tooltipAnchor.x + TOOLTIP_OFFSET;
    if (left + rect.width > viewportWidth - margin) {
      left = tooltipAnchor.x - rect.width - TOOLTIP_OFFSET;
    }
    left = Math.max(margin, Math.min(left, viewportWidth - rect.width - margin));

    let top = tooltipAnchor.y - rect.height - TOOLTIP_OFFSET;
    let placement: "top" | "bottom" = "top";
    if (top < margin) {
      top = tooltipAnchor.y + TOOLTIP_OFFSET;
      placement = "bottom";
    }
    if (top + rect.height > viewportHeight - margin) {
      top = Math.max(margin, viewportHeight - rect.height - margin);
    }

    setTooltipPosition({ left, top, placement });
  }, [tooltipAnchor]);

  useEffect(() => {
    hideTooltip();
  }, [currentPage, preparedItems.length, hideTooltip]);

  const stopAutoSlide = useCallback(() => {
    if (slideIntervalRef.current) {
      window.clearInterval(slideIntervalRef.current);
      slideIntervalRef.current = null;
    }
  }, []);

  const startAutoSlide = useCallback(() => {
    stopAutoSlide();
    if (pages.length <= 1) {
      return;
    }
    slideIntervalRef.current = window.setInterval(() => {
      setCurrentPage((prev) => {
        const total = pages.length;
        if (total <= 1) {
          return 0;
        }
        let next = prev + slideDirectionRef.current;
        if (next >= total) {
          slideDirectionRef.current = -1;
          next = Math.max(total - 2, 0);
        } else if (next < 0) {
          slideDirectionRef.current = 1;
          next = Math.min(1, total - 1);
        }
        return next;
      });
    }, AUTO_SLIDE_INTERVAL_MS);
  }, [pages.length, stopAutoSlide]);

  useEffect(() => {
    slideDirectionRef.current = 1;
    const timer = window.setTimeout(() => {
      setCurrentPage(0);
    }, 0);
    startAutoSlide();
    return () => {
      window.clearTimeout(timer);
      stopAutoSlide();
    };
  }, [pages.length, startAutoSlide, stopAutoSlide]);

  useLayoutEffect(() => {
    const container = widgetRef.current;
    if (!container) {
      return undefined;
    }

    const updateSizing = () => {
      const row = container.querySelector<HTMLElement>(".pvequalizer-grid__row");
      const sampleItem = container.querySelector<HTMLElement>(
        ".pvequalizer-item:not(.pvequalizer-item--placeholder)",
      );

      if (!row || !sampleItem) {
        return;
      }

      const rowRect = row.getBoundingClientRect();
      const rowStyles = window.getComputedStyle(row);
      const paddingTop = Number.parseFloat(rowStyles.paddingTop) || 0;
      const paddingBottom = Number.parseFloat(rowStyles.paddingBottom) || 0;
      const rowContentHeight = Math.max(0, rowRect.height - paddingTop - paddingBottom);

      const countEl = sampleItem.querySelector<HTMLElement>(".pvequalizer-item__count");
      const titleEl = sampleItem.querySelector<HTMLElement>(".pvequalizer-item__title");
      const countHeight = countEl?.getBoundingClientRect().height ?? 0;
      const titleHeight = titleEl?.getBoundingClientRect().height ?? 0;

      const itemStyles = window.getComputedStyle(sampleItem);
      const outerGap = Number.parseFloat(itemStyles.rowGap || itemStyles.gap) || 0;
      const availableStackArea = Math.max(
        0,
        rowContentHeight - countHeight - titleHeight - outerGap * 2,
      );

      let stackGap = 2;
      let stackHeight = Math.floor(
        (availableStackArea - (STACK_LEVELS - 1) * stackGap) / STACK_LEVELS,
      );

      if (stackHeight < 4) {
        stackGap = 1;
        stackHeight = Math.floor(
          (availableStackArea - (STACK_LEVELS - 1) * stackGap) / STACK_LEVELS,
        );
      }

      if (stackHeight < 1) {
        stackGap = 0;
        stackHeight = Math.floor(
          (availableStackArea - (STACK_LEVELS - 1) * stackGap) / STACK_LEVELS,
        );
      }

      stackHeight = Math.max(1, Math.min(10, stackHeight));

      const sampleWidth = sampleItem.getBoundingClientRect().width;
      const widthCandidate = Math.round(sampleWidth * 0.82);
      const minWidth = Math.min(40, sampleWidth);
      const maxWidth = Math.min(160, sampleWidth);
      const stackWidth = Math.round(Math.min(maxWidth, Math.max(minWidth, widthCandidate)));

      const prevSizing = lastStackSizingRef.current;
      if (
        prevSizing &&
        prevSizing.height === stackHeight &&
        prevSizing.gap === stackGap &&
        prevSizing.width === stackWidth
      ) {
        return;
      }

      lastStackSizingRef.current = { height: stackHeight, gap: stackGap, width: stackWidth };

      container.style.setProperty("--pve-stack-height", `${stackHeight}px`);
      container.style.setProperty("--pve-stack-gap", `${stackGap}px`);
      container.style.setProperty("--pve-stack-width", `${stackWidth}px`);
    };

    const scheduleUpdate = () => {
      if (stackSizingFrameRef.current != null) {
        window.cancelAnimationFrame(stackSizingFrameRef.current);
      }
      stackSizingFrameRef.current = window.requestAnimationFrame(() => {
        stackSizingFrameRef.current = null;
        updateSizing();
      });
    };

    scheduleStackSizingRef.current = scheduleUpdate;
    scheduleUpdate();

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(scheduleUpdate);
      observer.observe(container);
    }

    return () => {
      scheduleStackSizingRef.current = null;
      if (stackSizingFrameRef.current != null) {
        window.cancelAnimationFrame(stackSizingFrameRef.current);
        stackSizingFrameRef.current = null;
      }
      observer?.disconnect();
      observer = null;
    };
  }, []);

  useLayoutEffect(() => {
    scheduleStackSizingRef.current?.();
  }, [currentPage, pages.length, preparedItems.length]);

  const statusMessage = useMemo(() => {
    if (!hasLoadedSettings) {
      return "데이터를 불러오고 있습니다.";
    }
    if (!applicationId) {
      return "대상 앱을 선택해 주세요.";
    }
    if (error) {
      return error;
    }
    if (loading && preparedItems.length === 0) {
      return "데이터를 불러오고 있습니다.";
    }
    return null;
  }, [applicationId, error, loading, preparedItems.length, hasLoadedSettings]);

  const widgetClassName = `pvequalizer-widget${theme === "dark" ? " is-dark" : ""}`;

  return (
    <div className={widgetClassName} ref={widgetRef}>
      <header className="pvequalizer-widget__header">
        <div className="pvequalizer-widget__title">
          <h4>PV Equalizer</h4>
          <img
            src="/images/maxy/ic-question-grey-blue.svg"
            alt="도움말"
            className="pvequalizer-widget__help"
          />
        </div>
        <div className="pvequalizer-widget__controls">
          <button
            type="button"
            className="pvequalizer-all"
            onClick={() => setIsAllModalOpen(true)}
            disabled={loading || preparedItems.length === 0}
            aria-label="전체 보기"
          >
            ALL
          </button>
        </div>
      </header>

      <div className="pvequalizer-widget__body">
        {statusMessage ? (
          <div className="pvequalizer-widget__status">{statusMessage}</div>
        ) : (
          <div
            className="pvequalizer-slider"
            onMouseEnter={stopAutoSlide}
            onMouseLeave={() => {
              startAutoSlide();
              hideTooltip();
            }}
          >
            <div className="pvequalizer-slider__viewport">
              <div
                className="pvequalizer-slider__track"
                style={{ transform: `translate3d(-${currentPage * 100}%, 0, 0)` }}
              >
                {pages.map((pageItems, pageIndex) => {
                  const filled =
                    pageItems.length >= ITEMS_PER_PAGE
                      ? pageItems
                      : [
                          ...pageItems,
                          ...Array.from({ length: ITEMS_PER_PAGE - pageItems.length }).map((_, idx) => ({
                            key: `placeholder-${pageIndex}-${idx}`,
                            reqUrl: "",
                            displayUrl: "",
                            viewCount: 0,
                            uniqDeviceCount: 0,
                            stackLength: 0,
                            variant: "webview" as const,
                          })),
                        ];

                return (
                  <div className="pvequalizer-slider__slide" key={`slide-${pageIndex}`}>
                      <div className="pvequalizer-grid">
                        <div className="pvequalizer-grid__row pvequalizer-grid__row--top">
                          {filled.slice(0, 5).map((item) => {
                            const isPlaceholder = item.stackLength <= 0 && !item.reqUrl;
                            if (isPlaceholder) {
                              return (
                                <div
                                  key={item.key}
                                  className="pvequalizer-item pvequalizer-item--placeholder"
                                  aria-hidden="true"
                                />
                              );
                            }

                            return (
                              <div
                                key={item.key}
                                className={`pvequalizer-item ${item.variant} pvequalizer-item--clickable`}
                                role="button"
                                tabIndex={0}
                                aria-label={`${item.reqUrl || item.displayUrl} 상세 보기`}
                                onMouseEnter={(event) => setTooltipFromPointer(event, item)}
                                onMouseMove={(event) => setTooltipFromPointer(event, item)}
                                onMouseLeave={hideTooltip}
                                onFocus={(event) => setTooltipFromTarget(event, item)}
                                onBlur={hideTooltip}
                                onClick={() => setDetailItem(item)}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault();
                                    setDetailItem(item);
                                  }
                                }}
                              >
                                <div className="pvequalizer-item__count">
                                  {formatNumber(item.viewCount)}
                                </div>
                                <div className="pvequalizer-item__stack" aria-hidden="true">
                                  {Array.from({ length: item.stackLength }).map((_, idx) => (
                                    <div
                                      key={`${item.key}-stack-${idx}`}
                                      className={`pvequalizer-stack delay-${idx}`}
                                    />
                                  ))}
                                </div>
                                <div className="pvequalizer-item__title">{item.displayUrl}</div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="pvequalizer-grid__row pvequalizer-grid__row--bottom">
                          {filled.slice(5, 10).map((item) => {
                            const isPlaceholder = item.stackLength <= 0 && !item.reqUrl;
                            if (isPlaceholder) {
                              return (
                                <div
                                  key={item.key}
                                  className="pvequalizer-item pvequalizer-item--placeholder"
                                  aria-hidden="true"
                                />
                              );
                            }

                            return (
                              <div
                                key={item.key}
                                className={`pvequalizer-item ${item.variant} pvequalizer-item--clickable`}
                                role="button"
                                tabIndex={0}
                                aria-label={`${item.reqUrl || item.displayUrl} 상세 보기`}
                                onMouseEnter={(event) => setTooltipFromPointer(event, item)}
                                onMouseMove={(event) => setTooltipFromPointer(event, item)}
                                onMouseLeave={hideTooltip}
                                onFocus={(event) => setTooltipFromTarget(event, item)}
                                onBlur={hideTooltip}
                                onClick={() => setDetailItem(item)}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault();
                                    setDetailItem(item);
                                  }
                                }}
                              >
                                <div className="pvequalizer-item__count">
                                  {formatNumber(item.viewCount)}
                                </div>
                                <div className="pvequalizer-item__stack" aria-hidden="true">
                                  {Array.from({ length: item.stackLength }).map((_, idx) => (
                                    <div
                                      key={`${item.key}-stack-${idx}`}
                                      className={`pvequalizer-stack delay-${idx}`}
                                    />
                                  ))}
                                </div>
                                <div className="pvequalizer-item__title">{item.displayUrl}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                );
              })}
              </div>
            </div>
            {tooltipAnchor ? (
              <div
                ref={tooltipRef}
                className="pvequalizer-tooltip"
                data-placement={tooltipPosition?.placement ?? "top"}
                style={{
                  left: `${tooltipPosition?.left ?? 0}px`,
                  top: `${tooltipPosition?.top ?? 0}px`,
                  opacity: tooltipPosition ? 1 : 0,
                }}
                role="tooltip"
              >
                <div className="pvequalizer-tooltip__title">
                  {tooltipAnchor.item.reqUrl || tooltipAnchor.item.displayUrl || "-"}
                </div>
                <div className="pvequalizer-tooltip__row">
                  <span className="pvequalizer-tooltip__label">log_count</span>
                  <span className="pvequalizer-tooltip__value">
                    {formatNumber(tooltipAnchor.item.viewCount)}
                  </span>
                </div>
                <div className="pvequalizer-tooltip__row">
                  <span className="pvequalizer-tooltip__label">Viewer</span>
                  <span className="pvequalizer-tooltip__value">
                    {formatNumber(tooltipAnchor.item.uniqDeviceCount)}
                  </span>
                </div>
              </div>
            ) : null}
            {pages.length > 1 ? (
              <div className="pvequalizer-slider__pagination" role="tablist" aria-label="페이지">
                {pages.map((_, index) => (
                  <button
                    type="button"
                    key={`dot-${index}`}
                    className={`pvequalizer-slider__dot${
                      currentPage === index ? " pvequalizer-slider__dot--active" : ""
                    }`}
                    onClick={() => setCurrentPage(index)}
                    aria-label={`페이지 ${index + 1}`}
                  />
                ))}
              </div>
            ) : null}
          </div>
        )}
      </div>

      <PVEqualizerAllModal
        open={isAllModalOpen}
        applicationId={Number(applicationId) || 0}
        osType={storedOsType || null}
        tmzutc={normalizedTmzutc}
        onClose={() => setIsAllModalOpen(false)}
      />
      <PVEqualizerDetailModal
        open={Boolean(detailItem)}
        applicationId={Number(applicationId) || 0}
        osType={storedOsType || null}
        tmzutc={normalizedTmzutc}
        reqUrl={detailItem?.reqUrl ?? ""}
        displayUrl={detailItem?.displayUrl ?? ""}
        viewCount={detailItem?.viewCount ?? 0}
        viewer={detailItem?.uniqDeviceCount ?? 0}
        onClose={() => setDetailItem(null)}
      />
    </div>
  );
}
