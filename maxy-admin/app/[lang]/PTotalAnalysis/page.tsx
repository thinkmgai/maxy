"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type MouseEventHandler,
  type PointerEventHandler,
} from "react";

import tippy, { type TippyInstance } from "@/app/lib/tippy";

import { useUserSettings } from "../../../components/usersettings/UserSettingsProvider";
import type { ApplicationSummary } from "@/app/api/AppList";
import { updateUserInfo } from "../../api/User/updateUserInfo";
import ContentsHeader from "./contents_header";
import DsbRadialWrap from "./dsb_radial_wrap";
import "./main_wrap.css";
import MaxyBiPopupWrap from "./Popup/BiPopup";
import LoadingTimeScatterWidget from "../Widget/LoadingTimeS/Widget";
import LogmeterWidget from "../Widget/Logmeter/Widget";
import AreaDistributionWidget from "../Widget/AreaDistribution/Widget";
import ResourceUsageWidget from "../Widget/ResourceUsage/Widget";
import ResponseTimeScatterWidget from "../Widget/ResponsTimeS/Widget";
import FavoritesWidget from "../Widget/Favorites/Widget";
import DeviceDistributionWidget from "../Widget/DeviceDistribution/Widget";
import VersionComparisonWidget from "../Widget/VersionComparison/Widget";
import PageViewWidget from "../Widget/PageView/Widget";
import AccessibilityWidget from "../Widget/Accessibility/Widget";
import PVEqualizerWidget from "../Widget/PVEqualizer/Widget";

type WidgetDefinition = {
  key: string;
  Component?: ComponentType;
};

const WIDGET_DEFINITIONS: Record<number, WidgetDefinition> = {
  1: { key: "LOGMETER", Component: LogmeterWidget },
  2: { key: "LOADING_TIME_SCATTER", Component: LoadingTimeScatterWidget },
  3: { key: "RESPONSE_TIME_SCATTER", Component: ResponseTimeScatterWidget },
  4: { key: "PV_EQUALIZER", Component: PVEqualizerWidget },
  5: { key: "RESOURCE_USAGE", Component: ResourceUsageWidget },
  6: { key: "DEVICE_DISTRIBUTION", Component: DeviceDistributionWidget },
  7: { key: "ACCESSIBILITY", Component: AccessibilityWidget },
  8: { key: "FAVORITES", Component: FavoritesWidget },
  9: { key: "MARKETING_INSIGHT" },
  10: { key: "VERSION_CONVERSION" },
  11: { key: "CRASHES_BY_VERSION" },
  12: { key: "VERSION_COMPARISON", Component: VersionComparisonWidget },
  13: { key: "RESPONSE_TIME_LINE" },
  14: { key: "LOADING_TIME_LINE" },
  15: { key: "AREA_DISTRIBUTION", Component: AreaDistributionWidget },
  16: { key: "PAGE_VIEW", Component: PageViewWidget },
};

const DEFAULT_WIDGET_ORDER = [1, 2, 3, 5, 8, 12, 15, 7];
const MAX_WIDGET_SLOTS = 8;

const WIDGET_LABELS: Record<number, string> = {
  1: "Logmeter",
  2: "Loading Time (S)",
  3: "Response Time (S)",
  4: "PV Equalizer",
  5: "Resource Usage",
  6: "Device Distribution",
  7: "Accessibility",
  8: "Favorites",
  9: "Marketing Insight",
  10: "Version Conversion",
  11: "Crashes by Version",
  12: "Version Comparison",
  13: "Response Time (L)",
  14: "Loading Time (L)",
  15: "Area Distribution",
  16: "Page View",
};

type LayoutSlot = number | null;

type DragItem = {
  id: number;
  source: "layout" | "palette";
  index?: number;
};

const ALL_WIDGET_IDS = Object.keys(WIDGET_DEFINITIONS)
  .map((id) => Number(id))
  .sort((a, b) => a - b);

const WIDGET_ICON_SOURCES: Record<number, string> = {
  1: "/images/widgets/widget-1-logmeter.svg",
  2: "/images/widgets/widget-2-loading.svg",
  3: "/images/widgets/widget-3-response.svg",
  4: "/images/widgets/widget-4-pvequalizer.svg",
  5: "/images/widgets/widget-5-resource.svg",
  6: "/images/widgets/widget-6-device.svg",
  7: "/images/widgets/widget-7-accessibility.svg",
  8: "/images/widgets/widget-8-favorites.svg",
  9: "/images/widgets/widget-9-marketing.svg",
  10: "/images/widgets/widget-10-conversion.svg",
  11: "/images/widgets/widget-11-crashes.svg",
  12: "/images/widgets/widget-12-version.svg",
  13: "/images/widgets/widget-13-response-line.svg",
  14: "/images/widgets/widget-14-loading-line.svg",
  15: "/images/widgets/widget-15-area.svg",
  16: "/images/widgets/widget-16-pageview.svg",
};

const LONG_PRESS_MOVE_THRESHOLD = 4;
const OVERLAY_SELECTORS = [
  '[data-content="dimmed"]',
  ".maxy_popup_backdrop",
  ".maxy_popup_common.show",
  ".lt-waterfall__backdrop",
  ".lt-waterfall.is-visible",
  ".pa_waterfall_backdrop.open",
  ".pa_waterfall_panel.open",
  ".popup_panel",
  ".popup_backdrop",
  ".popup_overlay",
  ".modal",
  ".modal-backdrop",
  ".modal-overlay",
];

function getWidgetLabel(widgetId: number): string {
  return WIDGET_LABELS[widgetId] ?? `Widget ${widgetId}`;
}

function sortWidgetList(ids: number[]): number[] {
  return Array.from(new Set(ids)).sort((a, b) => a - b);
}

function deriveAvailableWidgetIds(active: Array<number | null>): number[] {
  const used = new Set<number>();
  active.forEach((slot) => {
    if (typeof slot === "number") {
      used.add(slot);
    }
  });
  return ALL_WIDGET_IDS.filter((id) => !used.has(id));
}

function normalizeWidgetOrder(widgetIds: Array<number | string> | null | undefined): number[] {
  const fallback = [...DEFAULT_WIDGET_ORDER];
  if (!widgetIds || widgetIds.length === 0) {
    return fallback;
  }

  const parsed = widgetIds
    .map((value) => {
      if (typeof value === "number") {
        return value;
      }
      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric : null;
    })
    .filter((value): value is number => {
      if (value == null || value <= 0 || !Number.isInteger(value)) {
        return false;
      }
      return Object.prototype.hasOwnProperty.call(WIDGET_DEFINITIONS, value);
    });

  const deduped = Array.from(new Set(parsed));
  const filled = [...deduped];

  for (const id of DEFAULT_WIDGET_ORDER) {
    if (filled.length >= MAX_WIDGET_SLOTS) {
      break;
    }
    if (!filled.includes(id)) {
      filled.push(id);
    }
  }

  return filled.slice(0, MAX_WIDGET_SLOTS);
}

function isOverlayVisible(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  const hasOverlayBySelector = OVERLAY_SELECTORS.some((selector) => {
    return Array.from(window.document.querySelectorAll<HTMLElement>(selector)).some((el) => {
      const style = window.getComputedStyle(el);
      return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
    });
  });
  if (hasOverlayBySelector) {
    return true;
  }
  const dialogs = Array.from(
    window.document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]')
  );
  return dialogs.some((el) => {
    const style = window.getComputedStyle(el);
    return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
  });
}

type WidgetSlotProps = {
  widgetId: number;
  onPointerDown?: PointerEventHandler<HTMLDivElement>;
  onPointerUp?: PointerEventHandler<HTMLDivElement>;
  onPointerLeave?: PointerEventHandler<HTMLDivElement>;
  onPointerCancel?: PointerEventHandler<HTMLDivElement>;
  onPointerMove?: PointerEventHandler<HTMLDivElement>;
  onDoubleClick?: MouseEventHandler<HTMLDivElement>;
};

function WidgetSlot({
  widgetId,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  onPointerCancel,
  onPointerMove,
  onDoubleClick,
}: WidgetSlotProps) {
  const definition = WIDGET_DEFINITIONS[widgetId];
  if (!definition) {
    return (
      <div
        className="maxy_box"
        data-widget-id={widgetId}
        style={{ height: "100%" }}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerLeave}
        onPointerCancel={onPointerCancel}
        onPointerMove={onPointerMove}
        onDoubleClick={onDoubleClick}
      />
    );
  }

  const { key, Component } = definition;
  const domId = `maxyComponent__${key}`;

  return (
    <div
      id={domId}
      className="maxy_box"
      data-widget-id={widgetId}
      style={{ height: "100%" }}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
      onPointerCancel={onPointerCancel}
      onPointerMove={onPointerMove}
      onDoubleClick={onDoubleClick}
    >
      {Component ? <Component /> : null}
    </div>
  );
}

type WidgetIconOverlayProps = {
  available: number[];
  onClose: () => void;
  onSave: () => void;
  onReset: () => void;
  onPaletteDrop: () => void;
  onPaletteItemClick: (widgetId: number) => void;
  onDragStart: (item: DragItem) => void;
  onDragEnd: () => void;
  isSaving: boolean;
  errorMessage: string | null;
};

function getWidgetIconSource(widgetId: number): string | null {
  return WIDGET_ICON_SOURCES[widgetId] ?? null;
}

function WidgetIconOverlay({
  available,
  onClose,
  onSave,
  onReset,
  onPaletteDrop,
  onPaletteItemClick,
  onDragStart,
  onDragEnd,
  isSaving,
  errorMessage,
}: WidgetIconOverlayProps) {
  const overlayRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = overlayRef.current;
    if (!root) {
      return;
    }

    const targets = Array.from(root.querySelectorAll<HTMLElement>("[data-widget-tooltip]"));
    const instances: TippyInstance[] = [];

    targets.forEach((target) => {
      const content = target.getAttribute("data-widget-tooltip");
      if (!content) {
        return;
      }
      const instance = tippy(target, {
        content,
        allowHTML: false,
        theme: "maxy-tiny-tooltip",
        arrow: false,
        placement: "top",
        delay: [0, 0],
        duration: [90, 70],
        offset: [0, 8],
      });
      instances.push(instance);
    });

    return () => {
      instances.forEach((instance) => instance.destroy());
    };
  }, [available]);

  return (
    <div
      className="widget-icon-overlay"
      ref={overlayRef}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        onPaletteDrop();
      }}
    >
      <div className="widget-overlay-head">
        <div className="widget-overlay-head__titles">
          <span className="widget-edit-pill">Widget Edit Mode</span>
          <div className="widget-overlay-head__title-row">
            <h3>대시보드 위젯 구성</h3>
          </div>
          <p className="widget-overlay-head__desc">
            원하는 슬롯을 클릭한 뒤 위젯을 추가하거나, 직접 끌어다 놓아 배치하세요.
          </p>
        </div>
      </div>
      <div className="widget-icon-panel">
        <div className="widget-icon-row">
          {available.length === 0 ? (
            <p className="widget-icon-placeholder">추가 가능한 위젯이 없습니다.</p>
          ) : (
            available.map((widgetId) => {
              const label = getWidgetLabel(widgetId);
              const iconSrc = getWidgetIconSource(widgetId);
              return (
                <button
                  type="button"
                  key={widgetId}
                  aria-label={label}
                  data-widget-id={widgetId}
                  data-widget-tooltip={label}
                  className="widget-icon-btn"
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer?.setData("text/plain", `${widgetId}`);
                    onDragStart({ source: "palette", id: widgetId });
                  }}
                  onDragEnd={(event) => {
                    event.stopPropagation();
                    onDragEnd();
                  }}
                  onClick={() => onPaletteItemClick(widgetId)}
                >
                  {iconSrc ? (
                    <img src={iconSrc} alt={label} className="widget-icon-img" />
                  ) : (
                    <span className="widget-icon-btn__abbr">{label.slice(0, 2).toUpperCase()}</span>
                  )}
                </button>
              );
            })
          )}
        </div>
        <div className="widget-icon-hint">
          슬롯을 선택한 뒤 클릭하거나, 위젯을 바로 드래그해 배치할 수 있습니다.
        </div>
      </div>
      <div className="widget-icon-actions">
        <div className="widget-icon-action-buttons">
          <button type="button" onClick={onReset} disabled={isSaving}>
            초기화
          </button>
          <button type="button" onClick={onClose} disabled={isSaving}>
            취소
          </button>
          <button type="button" className="widget-icon-save" onClick={onSave} disabled={isSaving}>
            {isSaving ? "저장 중" : "저장"}
          </button>
        </div>
      </div>
      {errorMessage ? <p className="widget-icon-error">{errorMessage}</p> : null}
    </div>
  );
}

/** Wraps the total analysis dashboard with layout and dimmed overlays. */
export default function TotalAnalysisPage() {
  const {
    widgetIds,
    osType: storedOsType,
    setOsType,
    userNo,
    setWidgetIds: updateStoredWidgetIds,
  } = useUserSettings();
  const resolvedOsType = storedOsType ?? "A";

  const orderedWidgetIds = useMemo(() => normalizeWidgetOrder(widgetIds), [widgetIds]);
  const half = Math.floor(MAX_WIDGET_SLOTS / 2);

  const [isEditMode, setIsEditMode] = useState(false);
  const [editingLayout, setEditingLayout] = useState<LayoutSlot[]>([]);
  const [availableWidgetIds, setAvailableWidgetIds] = useState<number[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [activeSlotIndex, setActiveSlotIndex] = useState<number | null>(null);
  const [hasAvailableApp, setHasAvailableApp] = useState(false);
  const dragItemRef = useRef<DragItem | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);

  const numericUserNo = useMemo(() => {
    if (typeof userNo === "number" && Number.isFinite(userNo)) {
      return userNo;
    }
    if (typeof userNo === "string" && userNo.trim() !== "") {
      const parsed = Number(userNo);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }, [userNo]);

  const handleApplicationsChange = useCallback((hasApplications: boolean) => {
    setHasAvailableApp(hasApplications);
  }, []);

  const handlePackageChange = useCallback((application: ApplicationSummary | null) => {
    setHasAvailableApp(Boolean(application));
  }, []);

  const isNoApp = !hasAvailableApp;

  const displayLayout: LayoutSlot[] = (isEditMode ? editingLayout : orderedWidgetIds) as LayoutSlot[];

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("maxy:layout-resize"));
    }
  }, [isEditMode]);

  const openEditMode = useCallback(() => {
    if (isEditMode) {
      return;
    }
    setEditingLayout(orderedWidgetIds);
    setAvailableWidgetIds(deriveAvailableWidgetIds(orderedWidgetIds));
    setActiveSlotIndex(null);
    setSaveError(null);
    setIsEditMode(true);
  }, [isEditMode, orderedWidgetIds]);

  const handleCancelEdit = useCallback(() => {
    //$$ 임시: 로그인 버튼 클릭 시 의도적으로 오류를 발생시킵니다.
    // throw new Error("useCallback error");
    
    setIsEditMode(false);
    setEditingLayout([]);
    setAvailableWidgetIds([]);
    setActiveSlotIndex(null);
    setSaveError(null);
    dragItemRef.current = null;
  }, []);

  useEffect(() => {
    if (!isEditMode) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleCancelEdit();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleCancelEdit, isEditMode]);

  const handleResetLayout = useCallback(() => {
    setEditingLayout(orderedWidgetIds);
    setAvailableWidgetIds(deriveAvailableWidgetIds(orderedWidgetIds));
    setActiveSlotIndex(null);
    setSaveError(null);
  }, [orderedWidgetIds]);

  const cancelLongPress = useCallback(() => {
    if (longPressTimerRef.current != null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    pointerStartRef.current = null;
  }, []);

  useEffect(() => {
    return () => cancelLongPress();
  }, [cancelLongPress]);

  const handleLongPressStart = useCallback<PointerEventHandler<HTMLDivElement>>((event) => {
    if (event.button !== 0) {
      cancelLongPress();
      return;
    }
    if (isEditMode) {
      return;
    }
    if (isOverlayVisible()) {
      return;
    }
    cancelLongPress();
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
    longPressTimerRef.current = window.setTimeout(() => {
      longPressTimerRef.current = null;
      pointerStartRef.current = null;
      openEditMode();
    }, 700);
  }, [cancelLongPress, isEditMode, openEditMode]);

  const handleLongPressEnd = useCallback<PointerEventHandler<HTMLDivElement>>(() => {
    cancelLongPress();
  }, [cancelLongPress]);

  const handleLongPressMove = useCallback<PointerEventHandler<HTMLDivElement>>(
    (event) => {
      if (isEditMode) {
        return;
      }
      if (pointerStartRef.current == null || longPressTimerRef.current == null) {
        return;
      }
      const dx = Math.abs(event.clientX - pointerStartRef.current.x);
      const dy = Math.abs(event.clientY - pointerStartRef.current.y);
      if (dx > LONG_PRESS_MOVE_THRESHOLD || dy > LONG_PRESS_MOVE_THRESHOLD) {
        cancelLongPress();
      }
    },
    [cancelLongPress, isEditMode]
  );

  const startDrag = useCallback((item: DragItem) => {
    dragItemRef.current = item;
  }, []);

  const endDrag = useCallback(() => {
    dragItemRef.current = null;
  }, []);

  const handleSlotDrop = useCallback(
    (targetIndex: number) => {
      const dragged = dragItemRef.current;
      if (!dragged) {
        return;
      }
      if (dragged.source === "layout") {
        if (dragged.index == null || dragged.index === targetIndex) {
          dragItemRef.current = null;
          return;
        }
        setEditingLayout((prevLayout) => {
          const next = [...prevLayout];
          const sourceWidget = next[dragged.index!];
          if (sourceWidget == null) {
            return prevLayout;
          }
          const targetWidget = next[targetIndex];
          next[dragged.index!] = targetWidget ?? null;
          next[targetIndex] = sourceWidget;
          return next;
        });
        dragItemRef.current = null;
        setActiveSlotIndex(null);
        setSaveError(null);
        return;
      }

      if (dragged.source === "palette") {
        const newWidgetId = dragged.id;
        if (newWidgetId == null) {
          dragItemRef.current = null;
          return;
        }
        setEditingLayout((prevLayout) => {
          const next = [...prevLayout];
          const targetWidget = next[targetIndex];
          next[targetIndex] = newWidgetId;
          setAvailableWidgetIds((prevAvailable) => {
            const filtered = prevAvailable.filter((id) => id !== newWidgetId);
            if (targetWidget != null && !filtered.includes(targetWidget)) {
              return sortWidgetList([...filtered, targetWidget]);
            }
            return sortWidgetList(filtered);
          });
          return next;
        });
        dragItemRef.current = null;
        setActiveSlotIndex(null);
        setSaveError(null);
      }
    },
    [setEditingLayout, setAvailableWidgetIds]
  );

  const handlePaletteDrop = useCallback(() => {
    const dragged = dragItemRef.current;
    if (!dragged || dragged.source !== "layout" || dragged.index == null) {
      dragItemRef.current = null;
      return;
    }
    setEditingLayout((prevLayout) => {
      const next = [...prevLayout];
      const removed = next[dragged.index!];
      if (removed == null) {
        return prevLayout;
      }
      next[dragged.index!] = null;
      setAvailableWidgetIds((prevAvailable) => {
        if (prevAvailable.includes(removed)) {
          return prevAvailable;
        }
        return sortWidgetList([...prevAvailable, removed]);
      });
      return next;
    });
    const removedIndex = dragged.index;
    dragItemRef.current = null;
    setActiveSlotIndex((prev) => (prev === removedIndex ? null : prev));
    setSaveError(null);
  }, []);

  const handleRemoveSlot = useCallback(
    (index: number) => {
      setEditingLayout((prevLayout) => {
        const next = [...prevLayout];
        const removed = next[index];
        if (removed == null) {
          return prevLayout;
        }
        next[index] = null;
        setAvailableWidgetIds((prevAvailable) => {
          if (prevAvailable.includes(removed)) {
            return prevAvailable;
          }
          return sortWidgetList([...prevAvailable, removed]);
        });
        return next;
      });
      setActiveSlotIndex(index);
      setSaveError(null);
    },
    []
  );

  const handleSelectSlot = useCallback((index: number) => {
    if (!isEditMode) {
      return;
    }
    setActiveSlotIndex(index);
    setSaveError(null);
  }, [isEditMode]);

  const handlePaletteItemClick = useCallback(
    (widgetId: number) => {
      setEditingLayout((prevLayout) => {
        const targetIndex =
          activeSlotIndex != null ? activeSlotIndex : prevLayout.findIndex((slot) => slot == null);
        if (targetIndex === -1) {
          return prevLayout;
        }
        const next = [...prevLayout];
        const replaced = next[targetIndex];
        next[targetIndex] = widgetId;
        setAvailableWidgetIds((prevAvailable) => {
          const filtered = prevAvailable.filter((id) => id !== widgetId);
          const nextAvailable = [...filtered];
          if (replaced != null && replaced !== widgetId && !nextAvailable.includes(replaced)) {
            nextAvailable.push(replaced);
          }
          return sortWidgetList(nextAvailable);
        });
        setActiveSlotIndex(null);
        setSaveError(null);
        return next;
      });
    },
    [activeSlotIndex]
  );

  const handleSaveLayout = useCallback(async () => {
    if (!isEditMode) {
      return;
    }
    const hasEmptySlot = editingLayout.some((slot) => slot == null);
    if (hasEmptySlot) {
      setSaveError("모든 영역에 위젯을 배치해주세요.");
      return;
    }
    if (numericUserNo == null) {
      setSaveError("사용자 정보를 찾을 수 없습니다. 다시 로그인해주세요.");
      return;
    }
    const widgetOrder = editingLayout.filter((slot): slot is number => typeof slot === "number");
    setIsSaving(true);
    setSaveError(null);
    try {
      const savedOrder = await updateUserInfo({ userNo: numericUserNo, widgets: widgetOrder });
      const normalized = normalizeWidgetOrder(savedOrder);
      updateStoredWidgetIds(normalized.map((id) => String(id)));
      handleCancelEdit();
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "위젯 구성을 저장하지 못했습니다. 잠시 후 다시 시도해주세요."
      );
    } finally {
      setIsSaving(false);
    }
  }, [editingLayout, handleCancelEdit, isEditMode, numericUserNo, updateStoredWidgetIds]);

  const widgetInteractionProps: Partial<WidgetSlotProps> = !isEditMode
    ? {
        onPointerDown: handleLongPressStart,
        onPointerUp: handleLongPressEnd,
        onPointerLeave: handleLongPressEnd,
        onPointerCancel: handleLongPressEnd,
        onPointerMove: handleLongPressMove,
      }
    : {};

  const renderSlot = (slotIndex: number) => {
    const storedWidgetId = (displayLayout[slotIndex] ?? null) as number | null;
    const widgetId = isNoApp ? null : storedWidgetId;
    const isActive = activeSlotIndex === slotIndex;
    const containerClass = [
      "widget-slot-container",
      isEditMode ? "widget-slot-container--editing" : "",
      isActive ? "widget-slot-container--active" : "",
      widgetId == null ? "widget-slot-container--empty" : "",
    ]
      .filter(Boolean)
      .join(" ");
    const slotKey = `widget-slot-${slotIndex}-${widgetId ?? "empty"}`;

    const content = widgetId != null ? (
      <WidgetSlot key={slotKey} widgetId={widgetId} {...widgetInteractionProps} />
    ) : (
      <span key={slotKey} className="widget-slot-placeholder" aria-hidden={isNoApp}>
        {isNoApp ? "" : "빈 슬롯"}
      </span>
    );

    return (
      <div
        key={slotKey}
        className={containerClass}
        draggable={isEditMode && widgetId != null}
        onDragStart={(event) => {
          if (!isEditMode || widgetId == null) {
            return;
          }
          event.dataTransfer?.setData("text/plain", `${widgetId}`);
          startDrag({ source: "layout", id: widgetId, index: slotIndex });
        }}
        onDragEnd={(event) => {
          if (!isEditMode) {
            return;
          }
          event.stopPropagation();
          endDrag();
        }}
        onDragOver={(event) => {
          if (!isEditMode) {
            return;
          }
          event.preventDefault();
        }}
        onDrop={(event) => {
          if (!isEditMode) {
            return;
          }
          event.preventDefault();
          handleSlotDrop(slotIndex);
        }}
      >
        {content}
        {isEditMode ? (
          <div
            className="widget-slot-overlay"
            onClick={(event) => {
              event.stopPropagation();
              handleSelectSlot(slotIndex);
            }}
          >
            <button
              type="button"
              className="widget-slot-remove"
              onClick={(event) => {
                event.stopPropagation();
                handleRemoveSlot(slotIndex);
              }}
              disabled={widgetId == null}
            >
              <span className="sr-only">위젯 제거</span>
            </button>
          </div>
        ) : null}
      </div>
    );
  };

  const topSlots = Array.from({ length: half }, (_, idx) => renderSlot(idx));
  const bottomSlots = Array.from({ length: MAX_WIDGET_SLOTS - half }, (_, idx) => renderSlot(idx + half));
  const dashboardClassName = [
    "dashboard",
    isEditMode ? "dashboard--editing" : "",
    isNoApp ? "dashboard--no-app" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className="main_wrap">
      <article className="contents_wrap">
        <div className={dashboardClassName}>
          <div className="basic-info-wrapper">
            <ContentsHeader
              onApplicationsChange={handleApplicationsChange}
              onPackageChange={handlePackageChange}
              onOsTypeChange={setOsType}
              osType={resolvedOsType}
            />
            {isEditMode ? (
              <WidgetIconOverlay
                available={availableWidgetIds}
                onClose={handleCancelEdit}
                onSave={handleSaveLayout}
                onReset={handleResetLayout}
                onPaletteDrop={handlePaletteDrop}
                onPaletteItemClick={handlePaletteItemClick}
                onDragStart={startDrag}
                onDragEnd={endDrag}
                isSaving={isSaving}
                errorMessage={saveError}
              />
            ) : null}
            <DsbRadialWrap osType={resolvedOsType} isNoApp={isNoApp} />
          </div>
          <MaxyBiPopupWrap osType={resolvedOsType} />
            <div className="dash_grid">
              {isNoApp ? (
                <div className="dashboard-waiting" role="status" aria-label="Loading">
                  <div className="dashboard-waiting__spinner" aria-hidden="true" />
                </div>
              ) : null}
              <div className="dash_top">{topSlots}</div>
              <div className="dash_bottom">{bottomSlots}</div>
            </div>
            <div className="alarm_msg_container2" />
            <div className="maxy_aibot" id="maxyAibotWrap">
              <button className="btn_aibot" id="btnAibot" />
            </div>
            <div className="aibot_icon" id="iconAibot" />
        </div>
      </article>
      <div className="dimmed" data-content="dimmed" style={{ display: "none" }} />
      <div className="search_dimmed" data-content="dimmed" style={{ display: "none" }} />
      <div className="account_dimmed" data-content="dimmed" style={{ display: "none" }} />
      <div className="calendar_dimmed" data-content="dimmed" style={{ display: "none" }} />
      <div className="aibot_dimmed" data-content="dimmed" />
      <div className="toast_msg" id="maxyToastMsg" />
    </section>
  );
}
