"use client";

import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { FunnelSummary } from "../../../api/FunnelAnalysis";

type FunnelSideMenuProps = {
  onCreateFunnel: () => void;
  funnels: FunnelSummary[];
  loading: boolean;
  error: string | null;
  selectedFunnelId: number | null;
  onSelectFunnel: (funnelId: number | null) => void;
  onReorderFunnels: (payload: { sourceId: number; targetId: number }) => void;
  onEditFunnel: (funnel: FunnelSummary) => void;
  onDeleteFunnel: (funnel: FunnelSummary) => void;
};

const DEFAULT_ICON = {
  handle: "/images/funnel-handle-sky.svg",
  actions: "/images/funnel-actions-sky.svg",
} as const;

/** Vertical navigation shown on the left side of the funnel analysis page. */
export default function FunnelSideMenu({
  onCreateFunnel,
  funnels,
  loading,
  error,
  selectedFunnelId,
  onSelectFunnel,
  onReorderFunnels,
  onEditFunnel,
  onDeleteFunnel,
}: FunnelSideMenuProps) {
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);
  const dragStateRef = useRef<{ activeId: number | null; overId: number | null }>({
    activeId: null,
    overId: null,
  });
  const [dragState, setDragState] = useState(dragStateRef.current);

  useEffect(() => {
    const handleClickAway = (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (!target) {
        return;
      }
      if (target.closest(".funnel-list-actions")) {
        return;
      }
      setActiveMenuId(null);
    };

    if (activeMenuId != null) {
      window.addEventListener("mousedown", handleClickAway);
      window.addEventListener("touchstart", handleClickAway);
    }

    return () => {
      window.removeEventListener("mousedown", handleClickAway);
      window.removeEventListener("touchstart", handleClickAway);
    };
  }, [activeMenuId]);

  const updateDragState = useCallback((nextState: { activeId: number | null; overId: number | null }) => {
    dragStateRef.current = nextState;
    setDragState(nextState);
  }, []);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current != null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLImageElement>, funnelId: number) => {
      event.preventDefault();
      event.stopPropagation();
      clearLongPressTimer();

      if (dragStateRef.current.activeId != null) {
        return;
      }

      pointerIdRef.current = event.pointerId;
      longPressTriggeredRef.current = false;

      longPressTimerRef.current = window.setTimeout(() => {
        longPressTriggeredRef.current = true;
        updateDragState({ activeId: funnelId, overId: funnelId });
      }, 250);
    },
    [clearLongPressTimer, updateDragState],
  );

  const handlePointerUpOnHandle = useCallback(
    (event: ReactPointerEvent<HTMLImageElement>) => {
      if (longPressTriggeredRef.current) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      if (pointerIdRef.current != null && event.pointerId !== pointerIdRef.current) {
        return;
      }
      clearLongPressTimer();
      pointerIdRef.current = null;
    },
    [clearLongPressTimer],
  );

  useEffect(() => {
    if (dragState.activeId == null) {
      return undefined;
    }

    const handleMove = (event: PointerEvent) => {
      const { activeId } = dragStateRef.current;
      if (!longPressTriggeredRef.current || activeId == null) {
        return;
      }
      if (pointerIdRef.current != null && event.pointerId !== pointerIdRef.current) {
        return;
      }
      event.preventDefault();

      const element = document.elementFromPoint(event.clientX, event.clientY);
      const listItem = element?.closest<HTMLElement>("[data-funnel-id]");
      const overId =
        listItem != null ? Number.parseInt(listItem.dataset.funnelId ?? "", 10) : null;

      if (
        Number.isFinite(overId) &&
        typeof overId === "number" &&
        dragStateRef.current.overId !== overId
      ) {
        updateDragState({ activeId, overId });
      }
    };

    const handleUp = (event: PointerEvent) => {
      if (pointerIdRef.current != null && event.pointerId !== pointerIdRef.current) {
        return;
      }

      const { activeId, overId } = dragStateRef.current;
      clearLongPressTimer();

      if (longPressTriggeredRef.current && activeId != null && overId != null && activeId !== overId) {
        onReorderFunnels({ sourceId: activeId, targetId: overId });
      }

      longPressTriggeredRef.current = false;
      pointerIdRef.current = null;
      updateDragState({ activeId: null, overId: null });
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);
    document.body.classList.add("funnel-drag-active");

    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
      document.body.classList.remove("funnel-drag-active");
      longPressTriggeredRef.current = false;
      pointerIdRef.current = null;
      clearLongPressTimer();
    };
  }, [clearLongPressTimer, dragState.activeId, onReorderFunnels, updateDragState]);

  const dragClassLookup = useMemo(() => {
    if (dragState.activeId == null) {
      return {};
    }
    return {
      [dragState.activeId]: "is-dragging",
      ...(dragState.overId != null && dragState.overId !== dragState.activeId
        ? { [dragState.overId]: "is-drag-over" }
        : {}),
    } as Record<number, string>;
  }, [dragState.activeId, dragState.overId]);

  return (
    <aside className="funnel-side-nav">
      <div
        className="funnel-side-inner"
        onWheel={(event) => {
          if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
            event.preventDefault();
          }
        }}
        onTouchMove={(event) => event.preventDefault()}
      >
        <div className="funnel-side-header">
          <h1>퍼널 분석</h1>
          <button
            type="button"
            className="funnel-add-button"
            aria-label="Create funnel analysis"
            onClick={onCreateFunnel}
          >
            +
          </button>
        </div>
        <nav className="funnel-side-links" aria-label="Funnel list">
          {loading ? (
            <span className="funnel-side-status" aria-live="polite">
              Loading funnels...
            </span>
          ) : error ? (
          <span className="funnel-side-status funnel-side-status-error" role="alert">
            {error}
          </span>
        ) : funnels.length === 0 ? (
          <span className="funnel-side-status">No funnels have been created yet.</span>
        ) : (
          <ul className="funnel-list">
            {funnels.map((funnel) => {
              const isActive = funnel.id === selectedFunnelId;
              const { handle, actions } = DEFAULT_ICON;
              const dragClass = dragClassLookup[funnel.id];
              const showMenu = activeMenuId === funnel.id;

              return (
                <li
                  key={funnel.id}
                  data-funnel-id={funnel.id}
                  className={`funnel-list-item${isActive ? " active" : ""}${dragClass ? ` ${dragClass}` : ""}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (dragStateRef.current.activeId != null) {
                      return;
                    }
                    onSelectFunnel(funnel.id);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      if (dragStateRef.current.activeId != null) {
                        return;
                      }
                      onSelectFunnel(funnel.id);
                    }
                  }}
                  aria-pressed={isActive}
                >
                  <img
                    className="funnel-list-icon funnel-list-icon-handle"
                    src={handle}
                    alt="Drag handle icon"
                    draggable={false}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                    onPointerDown={(event) => handlePointerDown(event, funnel.id)}
                    onPointerUp={handlePointerUpOnHandle}
                  />
                  <span className="funnel-list-title">{funnel.name}</span>
                  <div className={`funnel-list-actions${showMenu ? " is-visible" : ""}`}>
                    <button
                      type="button"
                      className="funnel-list-actions-trigger"
                      aria-haspopup="menu"
                      aria-expanded={showMenu}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (showMenu) {
                          setActiveMenuId(null);
                        } else {
                          setActiveMenuId(funnel.id);
                        }
                      }}
                    >
                      <img
                        className="funnel-list-icon funnel-list-icon-actions"
                        src={actions}
                        alt="More actions icon"
                        aria-hidden="true"
                      />
                    </button>
                    <div
                      className="funnel-list-actions-menu"
                      role="menu"
                      aria-hidden={!showMenu}
                    >
                      <button
                        type="button"
                        className="funnel-list-actions-item"
                        role="menuitem"
                        onClick={(event) => {
                          event.stopPropagation();
                          onEditFunnel(funnel);
                          setActiveMenuId(null);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="funnel-list-actions-item is-danger"
                        role="menuitem"
                        onClick={(event) => {
                          event.stopPropagation();
                          onDeleteFunnel(funnel);
                          setActiveMenuId(null);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
            </ul>
          )}
        </nav>
      </div>
    </aside>
  );
}
