"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useId } from "react";
import { useI18n } from "../../../components/i18n/TranslationProvider";
import FunnelSideMenu from "./components/FunnelSideMenu";
import FunnelMainContent from "./components/FunnelMainContent";
import FunnelEditorModal from "./components/FunnelEditorModal";
import "./pfunnel.css";
import { useUserSettings } from "../../../components/usersettings/UserSettingsProvider";
import {
  changeFunnelOrder,
  deleteFunnel,
  getFunnelList,
  type FunnelSummary,
  type FunnelDetailStep,
} from "../../api/FunnelAnalysis";

const areFunnelsEqualExceptOrder = (a: FunnelSummary | null, b: FunnelSummary | null) => {
  if (a === b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }
  if (a.id !== b.id) {
    return false;
  }
  const { order: _aOrder, ...restA } = a;
  const { order: _bOrder, ...restB } = b;
  const keysA = Object.keys(restA) as Array<keyof typeof restA>;
  const keysB = Object.keys(restB) as Array<keyof typeof restB>;

  if (keysA.length !== keysB.length) {
    return false;
  }

  for (const key of keysA) {
    if (restA[key] !== restB[key]) {
      return false;
    }
  }

  return true;
};

const normalizeSummarySteps = (steps: FunnelSummary["step"]): FunnelDetailStep[] | null => {
  if (!Array.isArray(steps) || steps.length === 0) {
    return null;
  }
  return steps
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((step) => ({
      id: step.id,
      stepnm: step.stepnm,
      order: step.order,
      groups: [],
      condition: step.condition ?? null,
    }));
};

const hasStepCondition = (step: FunnelDetailStep | null | undefined): boolean => {
  if (!step || step.condition == null) {
    return false;
  }
  if (typeof step.condition === "string") {
    return step.condition.trim().length > 0;
  }
  return Array.isArray(step.condition) && step.condition.length > 0;
};

const mergeStepConditions = (
  primary: FunnelDetailStep[] | null,
  fallback: FunnelDetailStep[] | null,
): FunnelDetailStep[] | null => {
  if (!primary || primary.length === 0) {
    return fallback ? fallback.map((step) => ({ ...step })) : null;
  }
  if (!fallback || fallback.length === 0) {
    return primary;
  }

  const fallbackById = new Map<number, FunnelDetailStep>();
  const fallbackByOrder = new Map<number, FunnelDetailStep>();

  fallback.forEach((step) => {
    if (typeof step?.id === "number") {
      fallbackById.set(step.id, step);
    }
    if (typeof step?.order === "number") {
      fallbackByOrder.set(step.order, step);
    }
  });

  return primary.map((step, index) => {
    if (hasStepCondition(step)) {
      return step;
    }
    const fallbackStep =
      (typeof step.id === "number" ? fallbackById.get(step.id) : undefined) ??
      (typeof step.order === "number"
        ? fallbackByOrder.get(step.order)
        : fallbackByOrder.get(index + 1));

    if (!fallbackStep || !hasStepCondition(fallbackStep)) {
      return step;
    }

    return { ...step, condition: fallbackStep.condition ?? null };
  });
};

const resolveRouteValue = (route: FunnelSummary["route"], fallbackType: FunnelSummary["type"]) => {
  const rawValue = route ?? fallbackType ?? null;
  if (typeof rawValue === "string") {
    const parsed = Number.parseInt(rawValue, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return typeof rawValue === "number" ? rawValue : null;
};

const normalizeFunnelSummary = (funnel: FunnelSummary): FunnelSummary => {
  const resolvedRoute = resolveRouteValue(funnel.route, funnel.type);
  if (resolvedRoute === funnel.route) {
    return funnel;
  }
  return { ...funnel, route: resolvedRoute };
};

/** Entry point for the funnel analysis home experience. */
export default function PFunnelAnalysis() {
  const { dictionary } = useI18n();
  const { applicationId, userId } = useUserSettings();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [funnels, setFunnels] = useState<FunnelSummary[]>([]);
  const [selectedFunnelId, setSelectedFunnelId] = useState<number | null>(null);
  const [loadingFunnels, setLoadingFunnels] = useState(false);
  const [funnelError, setFunnelError] = useState<string | null>(null);
  const [selectedFunnelSnapshot, setSelectedFunnelSnapshot] = useState<FunnelSummary | null>(null);
  const [editorContext, setEditorContext] = useState<FunnelSummary | null>(null);
  const [detailStepMap, setDetailStepMap] = useState<Map<number, FunnelDetailStep[]>>(() => new Map());
  const [pendingDelete, setPendingDelete] = useState<FunnelSummary | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const mainColumnRef = useRef<HTMLDivElement | null>(null);
  const deleteConfirmButtonRef = useRef<HTMLButtonElement | null>(null);
  const deleteTitleId = useId();
  const deleteDescriptionId = useId();

  const openEditor = useCallback(() => {
    setEditorContext(null);
    setIsEditorOpen(true);
  }, []);

  const closeEditor = useCallback(() => {
    setIsEditorOpen(false);
    setEditorContext(null);
  }, []);

  const fetchFunnels = useCallback(
    async (signal?: AbortSignal) => {
      const parsedApplicationId =
        applicationId == null ? Number.NaN : Number.parseInt(applicationId, 10);

      if (!userId) {
        setFunnels([]);
        setSelectedFunnelId(null);
        setFunnelError("사용자 정보를 확인할 수 없어 퍼널을 불러오지 못했습니다.");
        setLoadingFunnels(false);
        return;
      }

      if (Number.isNaN(parsedApplicationId) || parsedApplicationId == null) {
        setFunnels([]);
        setSelectedFunnelId(null);
        setFunnelError("애플리케이션이 선택되지 않았습니다.");
        setLoadingFunnels(false);
        return;
      }

      setLoadingFunnels(true);
      setFunnelError(null);

      try {
        const list = await getFunnelList(
          {
            applicationId: parsedApplicationId,
            userId,
            type: 1,
          },
          signal
        );
        if (signal?.aborted) {
          return;
        }
        const normalizedList = list.map(normalizeFunnelSummary);
        setFunnels(normalizedList);
        setDetailStepMap((prev) => {
          const next = new Map(prev);
          const validIds = new Set<number>();
          normalizedList.forEach((item) => {
            validIds.add(item.id);
            const normalizedSteps = normalizeSummarySteps(item.step);
            if (normalizedSteps) {
              next.set(item.id, normalizedSteps);
            }
          });
          Array.from(next.keys()).forEach((key) => {
            if (!validIds.has(key)) {
              next.delete(key);
            }
          });
          return next;
        });
        setSelectedFunnelId((current) => {
          if (!normalizedList.length) {
            return null;
          }
          if (current && normalizedList.some((item) => item.id === current)) {
            return current;
          }
          const first = normalizedList[0];
          return typeof first?.id === "number" ? first.id : null;
        });
      } catch (error) {
        if (signal?.aborted) {
          return;
        }
        setFunnels([]);
        setSelectedFunnelId(null);
        setFunnelError(error instanceof Error ? error.message : "퍼널을 불러오지 못했습니다.");
      } finally {
        if (!signal?.aborted) {
          setLoadingFunnels(false);
        }
      }
    },
    [applicationId, userId],
  );

  useEffect(() => {
    document.title = dictionary.menu.funnelAnalysis;
  }, [dictionary.menu.funnelAnalysis]);

  useEffect(() => {
    const abortController = new AbortController();
    void fetchFunnels(abortController.signal);
    return () => abortController.abort();
  }, [fetchFunnels]);

  const handleFunnelSaved = useCallback(
    (savedFunnelId?: number | null) => {
      void fetchFunnels().then(() => {
        if (savedFunnelId != null) {
          setSelectedFunnelId(savedFunnelId);
        }
      });
    },
    [fetchFunnels],
  );

  const selectedFunnel = useMemo(
    () => funnels.find((item) => item.id === selectedFunnelId) ?? null,
    [funnels, selectedFunnelId]
  );

  const handleEditFunnel = useCallback((funnel: FunnelSummary) => {
    const normalizedFunnel = normalizeFunnelSummary(funnel);
    if (Array.isArray(normalizedFunnel.step) && normalizedFunnel.step.length > 0) {
      setDetailStepMap((prev) => {
        const next = new Map(prev);
        const normalizedSteps = normalizeSummarySteps(normalizedFunnel.step);
        if (normalizedSteps) {
          next.set(normalizedFunnel.id, normalizedSteps);
        } else {
          next.delete(normalizedFunnel.id);
        }
        return next;
      });
    }
    setEditorContext(normalizedFunnel);
    setIsEditorOpen(true);
  }, []);

  const handleDetailStepsChange = useCallback(
    (steps: FunnelDetailStep[] | null) => {
      if (selectedFunnelId == null) {
        return;
      }
      setDetailStepMap((prev) => {
        const next = new Map(prev);
        if (!steps || steps.length === 0) {
          next.delete(selectedFunnelId);
        } else {
          next.set(selectedFunnelId, steps);
        }
        return next;
      });
      const container = mainColumnRef.current;
      if (container) {
        container.scrollTo({ top: 0, left: 0, behavior: "auto" });
      }
    },
    [selectedFunnelId],
  );

  useEffect(() => {
    setSelectedFunnelSnapshot((current) => {
      if (!selectedFunnel) {
        return null;
      }
      if (areFunnelsEqualExceptOrder(current, selectedFunnel)) {
        return current;
      }
      return selectedFunnel;
    });
  }, [selectedFunnel]);

  useEffect(() => {
    const container = mainColumnRef.current;
    if (!container) {
      return;
    }
    container.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [selectedFunnelSnapshot?.id]);

  const editorInitialSteps = useMemo(() => {
    if (!editorContext) {
      return null;
    }
    const fromSummary = normalizeSummarySteps(editorContext.step);
    const fromDetail = detailStepMap.get(editorContext.id) ?? null;
    const merged = mergeStepConditions(fromSummary, fromDetail);
    if (merged) {
      return merged;
    }
    return fromDetail;
  }, [detailStepMap, editorContext]);

  const activeEditorId = editorContext?.id ?? null;

  const handleEditorStepsChange = useCallback(
    (steps: FunnelDetailStep[]) => {
      const targetId = activeEditorId ?? selectedFunnelId ?? null;
      if (targetId != null) {
        setDetailStepMap((prev) => {
          const next = new Map(prev);
          next.set(targetId, steps);
          return next;
        });
      }
      setEditorContext((prev) => {
        if (!prev) {
          return prev;
        }
        return { ...prev, step: steps };
      });
    },
    [activeEditorId, selectedFunnelId],
  );

  const handleReorderFunnels = useCallback(
    ({ sourceId, targetId }: { sourceId: number; targetId: number }) => {
      setFunnels((previousList) => {
        const sourceIndex = previousList.findIndex((item) => item.id === sourceId);
        const targetIndex = previousList.findIndex((item) => item.id === targetId);

        if (sourceIndex < 0 || targetIndex < 0) {
          return previousList;
        }

        const sourceItem = previousList[sourceIndex];
        const targetItem = previousList[targetIndex];

        if (!sourceItem || !targetItem || sourceItem.id === targetItem.id) {
          return previousList;
        }

        const sourceOrder =
          typeof sourceItem.order === "number" ? sourceItem.order : sourceIndex;
        const targetOrder =
          typeof targetItem.order === "number" ? targetItem.order : targetIndex;

        const updatedList = [...previousList];
        updatedList[sourceIndex] = { ...targetItem, order: sourceOrder };
        updatedList[targetIndex] = { ...sourceItem, order: targetOrder };

        void changeFunnelOrder({
          orgId: sourceItem.id,
          orgOrder: targetOrder,
          destId: targetItem.id,
          destOrder: sourceOrder,
        }).catch((error) => {
          console.warn("Failed to update funnel order", error);
          setFunnels([...previousList]);
        });

        return updatedList;
      });
    },
    [setFunnels],
  );

  const handleDeleteFunnel = useCallback((funnel: FunnelSummary) => {
    setPendingDelete(funnel);
    setFunnelError(null);
  }, []);

  const cancelDeleteFunnel = useCallback(() => {
    if (deleteSubmitting) {
      return;
    }
    setPendingDelete(null);
  }, [deleteSubmitting]);

  const confirmDeleteFunnel = useCallback(() => {
    if (!pendingDelete) {
      return;
    }
    const target = pendingDelete;
    setDeleteSubmitting(true);

    void deleteFunnel({ id: target.id })
      .then(() => {
        setFunnels((previousList) => {
          const nextList = previousList.filter((item) => item.id !== target.id);
          setSelectedFunnelId((current) => {
            if (current === target.id) {
              return nextList[0]?.id ?? null;
            }
            return current;
          });
          return nextList;
        });
        setDetailStepMap((prev) => {
          if (!prev.has(target.id)) {
            return prev;
          }
          const next = new Map(prev);
          next.delete(target.id);
          return next;
        });
        setSelectedFunnelSnapshot((current) => (current?.id === target.id ? null : current));
        setFunnelError(null);
        if (editorContext?.id === target.id) {
          closeEditor();
        }
        setPendingDelete(null);
      })
      .catch((error) => {
        console.error("Failed to delete funnel", error);
        setFunnelError(error instanceof Error ? error.message : "Failed to delete funnel.");
      })
      .finally(() => {
        setDeleteSubmitting(false);
      });
  }, [closeEditor, editorContext?.id, pendingDelete]);

  useEffect(() => {
    if (!pendingDelete) {
      return;
    }
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !deleteSubmitting) {
        setPendingDelete(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [pendingDelete, deleteSubmitting]);

  useEffect(() => {
    if (pendingDelete && deleteConfirmButtonRef.current) {
      deleteConfirmButtonRef.current.focus();
    }
  }, [pendingDelete]);

  return (
    <div className="funnel-container">
      <FunnelSideMenu
        onCreateFunnel={openEditor}
        funnels={funnels}
        loading={loadingFunnels}
        error={funnelError}
        selectedFunnelId={selectedFunnelId}
        onSelectFunnel={setSelectedFunnelId}
        onReorderFunnels={handleReorderFunnels}
        onEditFunnel={handleEditFunnel}
        onDeleteFunnel={handleDeleteFunnel}
      />
      <div className="funnel-main-column" ref={mainColumnRef}>
        <FunnelMainContent
          onStart={openEditor}
          selectedFunnel={selectedFunnelSnapshot}
          loading={loadingFunnels}
          error={funnelError}
          hasData={funnels.length > 0}
          onDetailStepsChange={handleDetailStepsChange}
        />
      </div>
      {isEditorOpen ? (
        <FunnelEditorModal
          onClose={closeEditor}
          initialFunnel={editorContext}
          initialSteps={editorInitialSteps}
          onStepsChange={handleEditorStepsChange}
          onSaveSuccess={handleFunnelSaved}
        />
      ) : null}
      {pendingDelete ? (
        <div className="funnel-dialog-overlay" role="presentation">
          <div
            className="funnel-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={deleteTitleId}
            aria-describedby={deleteDescriptionId}
          >
            <div className="funnel-dialog-icon" aria-hidden="true">
              <span className="funnel-dialog-icon-ring" />
              <span className="funnel-dialog-icon-mark">!</span>
            </div>
            <div className="funnel-dialog-body">
              <h2 id={deleteTitleId} className="funnel-dialog-title">
                퍼널을 삭제하시겠습니까?
              </h2>
              <p id={deleteDescriptionId} className="funnel-dialog-description">
                <strong>{pendingDelete.name}</strong>의 설정과 데이터가 영구적으로 삭제됩니다.
                이 작업은 되돌릴 수 없습니다.
              </p>
            </div>
            <div className="funnel-dialog-actions">
              <button
                type="button"
                className="funnel-button is-ghost"
                onClick={cancelDeleteFunnel}
                disabled={deleteSubmitting}
              >
                취소
              </button>
              <button
                type="button"
                className="funnel-button is-danger"
                onClick={confirmDeleteFunnel}
                ref={deleteConfirmButtonRef}
                disabled={deleteSubmitting}
              >
                {deleteSubmitting ? "삭제 중..." : "삭제"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}




