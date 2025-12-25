"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent as ReactDragEvent,
  type MouseEvent as ReactMouseEvent,
  type TouchEvent as ReactTouchEvent,
  type CSSProperties,
} from "react";
import {
  type CalendarRange,
  formatDateISO,
  isoStringToDate,
} from "../../../../components/calendar/RangeCalendar";
import { FunnelRangeCalendar } from "./FunnelRangeCalendar";
import {
  DEFAULT_PERIOD_VALUE,
  DEFAULT_RANGE,
  FUNNEL_PERIOD_PRESETS,
  clampMonthToPresent,
  type DraftRange,
  type FunnelPeriodPresetId,
  type RequiredCalendarRange,
  calculateInclusiveDays,
  normalizeRange,
  normalisePeriodValueForSave,
  resolvePeriodToRange,
  resolvePeriodValue,
} from "../utils/period";
import {
  getConditionCatalog,
  getFilterCatalog,
  getGroupList,
  deleteFunnelGroup,
  discoverGroup,
  discoverStep,
  saveFunnel,
  saveFunnelGroup,
  type ConditionCatalog,
  type ConditionCategoryOption,
  type ConditionSubOption,
  type FilterCatalog,
  type FilterOption,
  type FunnelDetailStep,
  type FunnelAddEditRequest,
  type FunnelGroup,
  type FunnelGroupConditionGroup,
  type FunnelGroupConditionItem,
  type FunnelGroupConditionValue,
  type FunnelSummary,
  type FunnelPeriodValue,
} from "../../../api/FunnelAnalysis";
import { useUserSettings } from "../../../../components/usersettings/UserSettingsProvider";

type FunnelEditorModalProps = {
  onClose: () => void;
  initialFunnel?: FunnelSummary | null;
  initialSteps?: FunnelDetailStep[] | null;
  onStepsChange?: (steps: FunnelDetailStep[]) => void;
  onSaveSuccess?: (savedFunnelId?: number | null) => void;
};

type EditableGroup = {
  id: number | null;
  name: string;
  color?: string | null;
};

type EditableStage = {
  id: number | null;
  key: string;
  order: number;
  name: string;
  blocks: GroupConditionBlock[];
};

type GroupConditionValue = FunnelGroupConditionValue;

type DiscoveryStats = {
  findCount: number | null;
  totalCount: number | null;
  rate: number | null;
};

const EMPTY_DISCOVERY_STATS: DiscoveryStats = {
  findCount: null,
  totalCount: null,
  rate: null,
};

const normaliseRatePercent = (value: number | null): number | null => {
  if (value == null) {
    return null;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }
  if (numeric <= 1 && numeric >= -1) {
    return numeric * 100;
  }
  return numeric;
};

type GroupConditionRow = {
  order: number;
  field: string;
  operatorId?: number | null;
  operatorName?: string | null;
  value: GroupConditionValue;
  type?: "value" | "count";
  categoryId?: number | null;
  fieldId?: number | null;
  defaults?: Array<string | number | boolean> | null;
};

type GroupConditionBlock = {
  order: number;
  rows: GroupConditionRow[];
};

type ConditionCategoryGroup = {
  key: "event" | "standard";
  label: string;
  options: ConditionCategoryOption[];
};

type ConditionPickerAnchor = {
  top: number;
  left: number;
  width: number;
  height: number;
};

type ConditionPickerState = {
  isOpen: boolean;
  blockIndex: number;
  rowIndex: number;
  stageIndex: number;
  anchor: ConditionPickerAnchor | null;
  activeCategoryId: number | null;
};

type ConditionPickerProps = {
  open: boolean;
  anchor: ConditionPickerAnchor | null;
  groups: ConditionCategoryGroup[];
  activeCategory: ConditionCategoryOption | null;
  activeCategoryId: number | null;
  selectedFieldId: number | null;
  loading: boolean;
  error: string | null;
  onSelectCategory: (category: ConditionCategoryOption) => void;
  onSelectField: (category: ConditionCategoryOption, field: ConditionSubOption) => void;
  onClose: () => void;
};

function createInitialPickerState(): ConditionPickerState {
  return {
    isOpen: false,
    blockIndex: -1,
    rowIndex: -1,
    stageIndex: -1,
    anchor: null,
    activeCategoryId: null,
  };
}

type FilterPickerState = {
  isOpen: boolean;
  blockIndex: number;
  rowIndex: number;
  stageIndex: number;
  anchor: ConditionPickerAnchor | null;
  filterId: number | null;
  value: string;
  valueType: "value" | "count";
};

type FilterPickerProps = {
  open: boolean;
  anchor: ConditionPickerAnchor | null;
  filters: FilterOption[];
  selectedFilterId: number | null;
  defaultValue: string;
  defaultType: "value" | "count";
  defaults: Array<string | number | boolean> | null | undefined;
   allowCountToggle: boolean;
  loading: boolean;
  error: string | null;
  onApply: (
    filterId: number | null,
    filterName: string | null,
    value: string,
    valueType: "value" | "count",
  ) => void;
  onClose: () => void;
};

function createInitialFilterPickerState(): FilterPickerState {
  return {
    isOpen: false,
    blockIndex: -1,
    rowIndex: -1,
    stageIndex: -1,
    anchor: null,
    filterId: null,
    value: "",
    valueType: "value",
  };
}

function generateConditionId(): number {
  return Date.now() + Math.random();
}

function normalizeConditionValueType(type: unknown): "value" | "count" {
  return type === "count" ? "count" : "value";
}

function normalizeNumeric(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }
  return null;
}

function createEmptyConditionRow(): GroupConditionRow {
  return {
    order: generateConditionId(),
    field: "",
    operatorId: null,
    operatorName: null,
    value: null,
    type: "value",
    categoryId: null,
    fieldId: null,
    defaults: [],
  };
}

function createEmptyConditionBlock(): GroupConditionBlock {
  return {
    order: generateConditionId(),
    rows: [createEmptyConditionRow()],
  };
}

function cloneConditionRow(row: GroupConditionRow): GroupConditionRow {
  return {
    ...row,
    type: normalizeConditionValueType(row?.type),
    defaults: Array.isArray(row.defaults) ? [...row.defaults] : row.defaults ?? [],
    operatorId: row.value ? normalizeNumeric(row.operatorId) : null,
    operatorName: row.value ? row.operatorName : null,
  };
}

function cloneConditionBlocks(blocks: GroupConditionBlock[]): GroupConditionBlock[] {
  if (!Array.isArray(blocks) || blocks.length === 0) {
    return [createEmptyConditionBlock()];
  }
  return blocks.map((block) => ({
    ...block,
    rows:
      block.rows.length > 0
        ? block.rows.map((row) => cloneConditionRow(row))
        : [createEmptyConditionRow()],
  }));
}

type ConditionSource = FunnelGroupConditionGroup[] | string | null | undefined;

function parseConditionBlocks(
  conditionData: ConditionSource,
  options?: { context?: string },
): GroupConditionBlock[] {
  let sourceGroups: FunnelGroupConditionGroup[] | null = null;

  if (Array.isArray(conditionData)) {
    sourceGroups = conditionData.filter(
      (group): group is FunnelGroupConditionGroup => group != null,
    );
  } else if (typeof conditionData === "string") {
    const trimmed = conditionData.trim();
    if (trimmed.length > 0) {
      try {
        const parsed = JSON.parse(trimmed) as unknown;
        if (Array.isArray(parsed)) {
          sourceGroups = parsed as FunnelGroupConditionGroup[];
        }
      } catch (error) {
        console.warn(
          `Failed to parse ${options?.context ?? "condition"} JSON`,
          error,
        );
        sourceGroups = null;
      }
    }
  }

  if (!sourceGroups || sourceGroups.length === 0) {
    return [];
  }

  return sourceGroups
    .map((group, groupIndex) => {
      const groupOrder =
        typeof group?.order === "number" && Number.isFinite(group.order)
          ? group.order
          : Number.MAX_SAFE_INTEGER - groupIndex;

      const rawConditions = Array.isArray(group?.conditions) ? group.conditions ?? [] : [];

      const rows = rawConditions
        .map((condition, conditionIndex) => {
          const conditionOrder =
            typeof condition?.order === "number" && Number.isFinite(condition.order)
              ? condition.order
              : Number.MAX_SAFE_INTEGER - conditionIndex;

          const item = condition as FunnelGroupConditionItem;

          const value =
            condition && Object.prototype.hasOwnProperty.call(condition, "value")
              ? item.value
              : null;

          const operatorId = normalizeNumeric(item?.operator);

          const categoryId = normalizeNumeric(item?.categoryId);

          const fallbackFieldId = normalizeNumeric(item?.id);
          const normalizedFieldId = normalizeNumeric(item?.fieldId) ?? fallbackFieldId;

          const defaults =
            Array.isArray(item?.defaults) && item.defaults.length > 0
              ? [...item.defaults]
              : [];
          const type = normalizeConditionValueType((item as FunnelGroupConditionItem | undefined)?.type);

          return {
            order: conditionOrder,
            field: typeof item?.field === "string" ? item.field : "",
            operatorId,
            operatorName: null,
            value: value as GroupConditionValue,
            type,
            categoryId,
            fieldId: normalizedFieldId,
            defaults,
          };
        })
        .sort((a, b) => a.order - b.order);

      return {
        order: groupOrder,
        rows,
      };
    })
    .sort((a, b) => a.order - b.order)
    .map((group, index) => ({
      order: Number.isFinite(group.order) ? group.order : index + 1,
      rows: group.rows,
    }));
}

function hasConditionValue(value: GroupConditionValue | null | undefined): boolean {
  if (value === null || value === undefined) {
    return false;
  }
  if (Array.isArray(value)) {
    return value.some((entry) => hasConditionValue(entry as GroupConditionValue));
  }
  if (typeof value === "string") {
    return value.trim().length > 0;
  }
  return true;
}

function isConditionRowIncomplete(row: GroupConditionRow): boolean {
  if (!row) {
    return true;
  }
  const fieldName = typeof row.field === "string" ? row.field.trim() : "";
  if (!fieldName) {
    return false;
  }
  const hasFieldId = typeof row.fieldId === "number" && Number.isFinite(row.fieldId);
  if (!hasFieldId) {
    return true;
  }
  const isEventCategory = row.categoryId === EVENT_CATEGORY_ID;
  if (isEventCategory) {
    return false;
  }
  const hasOperator = typeof row.operatorId === "number" && Number.isFinite(row.operatorId);
  const hasValue = hasConditionValue(row.value);
  return !(hasOperator && hasValue);
}

function serializeConditionBlocks(
  blocks: GroupConditionBlock[],
  options?: { forceEventCountValue?: boolean },
): FunnelGroupConditionGroup[] {
  return blocks
    .map((block, blockIndex) => {
      const normalizedRows = block.rows
        .map((row, rowIndex) => {
          const fieldName = typeof row.field === "string" ? row.field.trim() : "";
          const operatorId =
            typeof row.operatorId === "number" && Number.isFinite(row.operatorId)
              ? row.operatorId
              : null;
          const fieldId =
            typeof row.fieldId === "number" && Number.isFinite(row.fieldId)
              ? row.fieldId
              : null;
          const type = normalizeConditionValueType(row?.type);
          const isEventCategoryRow = isEventCategory(row.categoryId);
          const derivedOperatorId =
            operatorId ?? (isEventCategoryRow ? EVENT_NAME_EQUALS_FILTER_ID : null);
          const shouldForceEventValue = Boolean(
            isEventCategoryRow && options?.forceEventCountValue && type !== "count",
          );
          const derivedType = shouldForceEventValue ? "value" : type;
          const derivedValue =
            isEventCategoryRow && derivedType === "value" && !hasConditionValue(row.value)
              ? fieldName
              : row.value;

          if (!fieldName || derivedOperatorId == null || fieldId == null || !hasConditionValue(derivedValue)) {
            return null;
          }

          return {
            order: Number.isFinite(row.order) ? row.order : rowIndex + 1,
            field: fieldName,
            operator: derivedOperatorId,
            type: derivedType,
            id: fieldId,
            categoryId:
              typeof row.categoryId === "number" && Number.isFinite(row.categoryId)
                ? row.categoryId
                : null,
            fieldId,
            defaults:
              Array.isArray(row.defaults) && row.defaults.length > 0 ? [...row.defaults] : null,
            ...(hasConditionValue(row.value) ? { value: row.value } : {}),
          } as FunnelGroupConditionItem;
        })
        .filter((row): row is FunnelGroupConditionItem => row !== null);

      if (normalizedRows.length === 0) {
        return null;
      }

      return {
        order: Number.isFinite(block.order) ? block.order : blockIndex + 1,
        conditions: normalizedRows,
      } as FunnelGroupConditionGroup;
    })
    .filter((group): group is FunnelGroupConditionGroup => group !== null);
}

function serializeStageConditionBlocks(blocks: GroupConditionBlock[]): FunnelGroupConditionGroup[] {
  return serializeConditionBlocks(blocks, { forceEventCountValue: true });
}

const STAGE_LABEL = "\uB2E8\uACC4";
const MAX_STAGE_COUNT = 5;
const GROUP_PALETTE = ["#2563eb", "#7c3aed", "#0ea5e9", "#f97316", "#10b981", "#ec4899"];
const EVENT_CATEGORY_ID = 9;
const EVENT_NAME_EQUALS_FILTER_ID = 5;

function isEventCategory(categoryId: unknown): boolean {
  const numeric =
    typeof categoryId === "string" ? Number(categoryId) : (categoryId as number | null | undefined);
  return typeof numeric === "number" && Number.isFinite(numeric) && numeric === EVENT_CATEGORY_ID;
}

function generateStageKey(): string {
  return `stage-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createEmptyStage(order: number): EditableStage {
  return {
    id: null,
    key: generateStageKey(),
    order,
    name: "",
    blocks: [createEmptyConditionBlock()],
  };
}

function createEditableStageFromDetail(step: FunnelDetailStep | null, fallbackOrder: number): EditableStage {
  const parsedBlocks = parseConditionBlocks(step?.condition ?? null, { context: "stage condition" });
  return {
    id: step?.id ?? null,
    key: generateStageKey(),
    order: Number.isFinite(step?.order) ? (step as FunnelDetailStep).order : fallbackOrder,
    name: step?.stepnm ?? "",
    blocks: parsedBlocks.length > 0 ? parsedBlocks : [createEmptyConditionBlock()],
  };
}

function duplicateStage(stage: EditableStage, overrides?: Partial<EditableStage>): EditableStage {
  return {
    id: stage.id,
    key: generateStageKey(),
    order: overrides?.order ?? stage.order,
    name: overrides?.name ?? stage.name,
    blocks: cloneConditionBlocks(stage.blocks),
  };
}

function normalizeStageOrder(stages: EditableStage[]): EditableStage[] {
  return stages.map((stage, index) => ({ ...stage, order: index + 1 }));
}

function buildStageCollection(steps?: FunnelDetailStep[] | null): EditableStage[] {
  if (!Array.isArray(steps) || steps.length === 0) {
    return [];
  }
  const normalized = steps
    .slice()
    .sort((a, b) => a.order - b.order)
    .slice(0, MAX_STAGE_COUNT);
  return normalized.map((step, index) => createEditableStageFromDetail(step, index + 1));
}

function serializeEditableStages(stages: EditableStage[]): FunnelDetailStep[] {
  return stages.map((stage, index) => {
    const order = Number.isFinite(stage.order) ? stage.order : index + 1;
    const trimmedName = stage.name.trim();
    const stageName = trimmedName.length > 0 ? trimmedName : `${STAGE_LABEL} ${order}`;
    const serializedConditions = serializeStageConditionBlocks(stage.blocks);
    return {
      id: typeof stage.id === "number" ? stage.id : -(index + 1),
      stepnm: stageName,
      order,
      groups: [],
      condition: serializedConditions.length > 0 ? serializedConditions : null,
    };
  });
}

type DisplayDate = {
  iso: string;
  main: string;
  long: string;
};

type PeriodDisplay = {
  isSingle: boolean;
  start: DisplayDate;
  end: DisplayDate;
};

function formatDisplayDate(date: Date): DisplayDate {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const main = `${year}.${String(month).padStart(2, "0")}.${String(day).padStart(2, "0")}`;
  const long = date.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });

  return {
    iso: formatDateISO(date),
    main,
    long,
  };
}

function formatConditionValueLabel(value: GroupConditionValue | null | undefined): string {
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  if (value === null || value === undefined) {
    return "-";
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "-";
    }
    return value.map((entry) => formatConditionValueLabel(entry as GroupConditionValue)).join(", ");
  }
  if (typeof value === "number") {
    if (Number.isNaN(value)) {
      return "-";
    }
    return value.toString();
  }
  return String(value);
}

function formatFilterValueLabel(
  filterName: string | null | undefined,
  value: GroupConditionValue | null | undefined,
  valueType: "value" | "count" = "value",
): string {
  const trimmedName = typeof filterName === "string" ? filterName.trim() : "";
  const hasOperator = trimmedName.length > 0;
  const hasValue =
    value !== null &&
    value !== undefined &&
    !(typeof value === "string" && value.trim().length === 0);

  if (!hasValue) {
    return "필터 추가";
  }

  const valueLabel = formatConditionValueLabel(value);
  const label = `${valueLabel} ${trimmedName}`.trim();
  return label.length > 0 ? label : "필터 추가";
}

function stringifyConditionValue(value: GroupConditionValue | null | undefined): string {
  if (value == null) {
    return "";
  }
  if (Array.isArray(value)) {
    return value.map((entry) => stringifyConditionValue(entry as GroupConditionValue)).join(", ");
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  return String(value);
}

function normalizeInputValue(value: string): GroupConditionValue | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  return trimmed;
}

function normalizeConditionInput(value: string, valueType: "value" | "count"): GroupConditionValue | null {
  if (valueType === "count") {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return null;
    }
    const numeric = Number(trimmed);
    return Number.isFinite(numeric) ? numeric : null;
  }
  return normalizeInputValue(value);
}

function ConditionPicker({
  open,
  anchor,
  groups,
  activeCategory,
  activeCategoryId,
  selectedFieldId,
  loading,
  error,
  onSelectCategory,
  onSelectField,
  onClose,
}: ConditionPickerProps) {
  useEffect(() => {
    if (!open) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  const sortedGroups = useMemo(() => {
    const normalizeOrder = (order: number | undefined) =>
      Number.isFinite(order) ? (order as number) : Number.MAX_SAFE_INTEGER;
    return groups.map((group) => ({
      ...group,
      options: [...group.options].sort(
        (a, b) => normalizeOrder(a?.order ?? undefined) - normalizeOrder(b?.order ?? undefined),
      ),
    }));
  }, [groups]);

  const sortedSubOptions = useMemo(() => {
    if (!activeCategory || !Array.isArray(activeCategory.sub)) {
      return [];
    }
    const normalizeOrder = (order: number | undefined) =>
      Number.isFinite(order) ? (order as number) : Number.MAX_SAFE_INTEGER;
    return [...activeCategory.sub].sort(
      (a, b) => normalizeOrder(a?.order ?? undefined) - normalizeOrder(b?.order ?? undefined),
    );
  }, [activeCategory]);

  const pickerWidth = 420;

  const pickerPosition = useMemo(() => {
    if (typeof window === "undefined") {
      return { left: 0, top: 0 };
    }
    const viewportPadding = 16;
    const estimatedHeight = 320;
    const anchorLeft = anchor?.left ?? window.innerWidth / 2 - pickerWidth / 2;
    const anchorTop = anchor ? anchor.top + anchor.height + 8 : window.innerHeight / 2 - estimatedHeight / 2;
    const maxLeft = Math.max(viewportPadding, window.innerWidth - viewportPadding - pickerWidth);
    const maxTop = Math.max(viewportPadding, window.innerHeight - viewportPadding - estimatedHeight);
    return {
      left: Math.min(Math.max(anchorLeft, viewportPadding), maxLeft),
      top: Math.min(Math.max(anchorTop, viewportPadding), maxTop),
    };
  }, [anchor, pickerWidth]);

  const { left, top } = pickerPosition;

  if (!open) {
    return null;
  }

  const handleOverlayPointerDown = () => {
    onClose();
  };

  const stopPropagation = (
    event: ReactMouseEvent<HTMLElement> | ReactTouchEvent<HTMLElement>,
  ) => {
    event.stopPropagation();
  };

  return (
    <div
      className="funnel-condition-picker-overlay"
      onMouseDown={handleOverlayPointerDown}
      onTouchStart={handleOverlayPointerDown}
    >
      <div
        className="funnel-condition-picker"
        role="dialog"
        aria-modal="true"
        style={{ top: `${top}px`, left: `${left}px`, width: `${pickerWidth}px` }}
        onMouseDown={stopPropagation}
        onTouchStart={stopPropagation}
      >
        <div className="funnel-condition-picker-columns">
          <div className="funnel-condition-picker-column funnel-condition-picker-column--categories">
            {sortedGroups.map((group) => (
              <div key={group.key} className="funnel-condition-picker-segment">
                <p className="funnel-condition-picker-segment-label">{group.label}</p>
                <ul className="funnel-condition-picker-list" role="listbox" aria-label={`${group.label} 목록`}>
                  {group.options.map((option) => {
                    const isActive = activeCategoryId === option.id;
                    return (
                      <li key={option.id}>
                        <button
                          type="button"
                          className={`funnel-condition-picker-item${isActive ? " is-active" : ""}`}
                          onClick={() => onSelectCategory(option)}
                        >
                          {option.name}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
          <div className="funnel-condition-picker-column funnel-condition-picker-column--fields">
            {loading ? (
              <div className="funnel-condition-picker-status" aria-live="polite">
                조건 항목을 불러오는 중입니다...
              </div>
            ) : error ? (
              <div className="funnel-condition-picker-status is-error" role="alert">
                {error}
              </div>
            ) : !activeCategory ? (
              <div className="funnel-condition-picker-status">왼쪽 목록에서 항목을 선택하세요.</div>
            ) : sortedSubOptions.length === 0 ? (
              <div className="funnel-condition-picker-status">선택 가능한 항목이 없습니다.</div>
            ) : (
              <ul
                className="funnel-condition-picker-list"
                role="listbox"
                aria-label={`${activeCategory.name} 세부 항목`}
              >
                {sortedSubOptions.map((option) => {
                  const isSelected = selectedFieldId === option.id;
                  return (
                    <li key={option.id}>
                      <button
                        type="button"
                        className={`funnel-condition-picker-item${isSelected ? " is-selected" : ""}`}
                        onClick={() => onSelectField(activeCategory, option)}
                      >
                        {option.name}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterPicker({
  open,
  anchor,
  filters,
  selectedFilterId,
  defaultValue,
  defaultType,
  defaults,
  allowCountToggle,
  loading,
  error,
  onApply,
  onClose,
}: FilterPickerProps) {
  const defaultFilterId = useMemo(() => {
    const preferred = filters.find((filter) => filter.id === 5)?.id ?? null;
    if (preferred != null) {
      return preferred;
    }
    return filters.length > 0 ? filters[0]?.id ?? null : null;
  }, [filters]);
  const [localFilterId, setLocalFilterId] = useState<number | null>(selectedFilterId ?? null);
  const [localValue, setLocalValue] = useState<string>(defaultValue ?? "");
  const [localType, setLocalType] = useState<"value" | "count">(defaultType ?? "value");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionListRef = useRef<HTMLDivElement | null>(null);
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const [pickerHeight, setPickerHeight] = useState(0);

  const sortedFilters = useMemo(() => {
    const normalizeOrder = (order: number | undefined) =>
      Number.isFinite(order) ? (order as number) : Number.MAX_SAFE_INTEGER;
    return [...filters].sort(
      (a, b) => normalizeOrder(a?.order ?? undefined) - normalizeOrder(b?.order ?? undefined),
    );
  }, [filters]);

  const filteredFilters = useMemo(() => {
    if (localType === "value") {
      return sortedFilters;
    }
    const blockedKeywords = [
      "정규식",
      "다음 정규 표현식과 일치함",
      "시작값",
      "종료값",
      "값포함",
      "값 포함",
      "포함",
    ];
    return sortedFilters.filter((filter) => {
      const name = typeof filter?.name === "string" ? filter.name : "";
      return !blockedKeywords.some((keyword) => name.includes(keyword));
    });
  }, [localType, sortedFilters]);

  const availableFilters = useMemo(
    () => (filteredFilters.length > 0 ? filteredFilters : sortedFilters),
    [filteredFilters, sortedFilters],
  );
  useLayoutEffect(() => {
    if (!open) {
      setPickerHeight(0);
      return;
    }
    const element = pickerRef.current;
    if (!element) {
      return;
    }
    const updateSize = () => {
      setPickerHeight(element.offsetHeight);
    };
    updateSize();
    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => updateSize());
      observer.observe(element);
      return () => observer.disconnect();
    }
    if (typeof requestAnimationFrame === "function" && typeof cancelAnimationFrame === "function") {
      const animationFrameId = requestAnimationFrame(updateSize);
      return () => cancelAnimationFrame(animationFrameId);
    }
    if (typeof window !== "undefined") {
      const timeoutId = window.setTimeout(updateSize, 16);
      return () => window.clearTimeout(timeoutId);
    }
    return undefined;
  }, [open, filters, defaults, showSuggestions, localValue, localType]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const nextType = allowCountToggle && defaultType === "count" ? "count" : "value";
    setLocalType(nextType);
  }, [allowCountToggle, defaultType, open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const availableFilters = (localType === "value" ? sortedFilters : filteredFilters).filter(
      (item): item is FilterOption => Boolean(item?.id),
    );
    const fallbackId = selectedFilterId ?? defaultFilterId;
    const normalizedId =
      availableFilters.find((item) => item.id === fallbackId)?.id ?? availableFilters[0]?.id ?? null;
    setLocalFilterId(normalizedId);
    setLocalValue(defaultValue ?? "");
    setShowSuggestions(false);
  }, [defaultFilterId, defaultValue, filteredFilters, localType, open, selectedFilterId, sortedFilters]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !showSuggestions) {
      return;
    }
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) {
        return;
      }
      if (suggestionListRef.current && suggestionListRef.current.contains(target)) {
        return;
      }
      setShowSuggestions(false);
    };
    window.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [open, showSuggestions]);

  useEffect(() => {
    if (!open || localType !== "count") {
      return;
    }
    setLocalValue((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) {
        return "";
      }
      return /^-?\d*(\.\d*)?$/.test(trimmed) && Number.isFinite(Number(trimmed)) ? trimmed : "";
    });
    setShowSuggestions(false);
  }, [localType, open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    if (!allowCountToggle && localType === "count") {
      setLocalType("value");
    }
  }, [allowCountToggle, localType, open]);

  const pickerWidth = 380;
  const suggestionExtraHeight = showSuggestions ? 260 : 0;
  const effectivePickerHeight = (pickerHeight > 0 ? pickerHeight : 320) + suggestionExtraHeight;
  const pickerPosition = useMemo(() => {
    if (typeof window === "undefined") {
      return { left: 0, top: 0 };
    }
    const viewportPadding = 16;
    const anchorLeft = anchor?.left ?? window.innerWidth / 2 - pickerWidth / 2;
    const anchorBottom = anchor ? anchor.top + anchor.height : window.innerHeight / 2;
    const offset = 8;
    const baseTop = anchor ? anchorBottom + offset : window.innerHeight / 2 - effectivePickerHeight / 2;
    let computedTop = baseTop;
    const fitsBelow =
      computedTop + effectivePickerHeight + viewportPadding <= window.innerHeight ||
      (anchor == null && computedTop >= viewportPadding);
    if (anchor && !fitsBelow) {
      const flippedTop = anchor.top - effectivePickerHeight - offset;
      if (flippedTop >= viewportPadding) {
        computedTop = flippedTop;
      }
    }
    const maxLeft = Math.max(viewportPadding, window.innerWidth - viewportPadding - pickerWidth);
    const minTop = viewportPadding;
    const maxTop = Math.max(viewportPadding, window.innerHeight - viewportPadding - effectivePickerHeight);
    return {
      left: Math.min(Math.max(anchorLeft, viewportPadding), maxLeft),
      top: Math.min(Math.max(computedTop, minTop), maxTop),
    };
  }, [anchor, effectivePickerHeight, pickerWidth]);

  const { left, top } = pickerPosition;

  const suggestionItems = useMemo(() => {
    if (!defaults || !Array.isArray(defaults)) {
      return [];
    }
    return defaults
      .map((item) => (item == null ? "" : String(item)))
      .filter((item) => {
        const trimmed = item.trim();
        if (trimmed.length === 0) {
          return false;
        }
        if (localType === "count") {
          const numeric = Number(trimmed);
          return Number.isFinite(numeric);
        }
        return true;
      });
  }, [defaults, localType]);

  if (!open) {
    return null;
  }

  const handleOverlayPointerDown = () => {
    onClose();
  };

  return (
    <div
      className="funnel-filter-picker-overlay"
      onMouseDown={handleOverlayPointerDown}
      onTouchStart={handleOverlayPointerDown}
    >
      <div
        className="funnel-filter-picker"
        role="dialog"
        aria-modal="true"
        style={{ top: `${top}px`, left: `${left}px`, width: `${pickerWidth}px` }}
        onMouseDown={(event) => event.stopPropagation()}
        onTouchStart={(event) => event.stopPropagation()}
      >
        <header className="funnel-filter-picker-header">
          <h4 className="funnel-filter-picker-title">필터 조건</h4>
          <div className="funnel-filter-picker-option-list" role="listbox" aria-label="필터 조건 선택">
            {availableFilters.map((filter) => {
              const isActive = localFilterId === filter.id;
              return (
                <button
                  key={filter.id}
                  type="button"
                  className={`funnel-filter-picker-option${isActive ? " is-active" : ""}`}
                  aria-pressed={isActive}
                  onClick={() => {
                    setLocalFilterId(filter.id);
                    setShowSuggestions(false);
                  }}
                >
                  {filter.name}
                </button>
              );
            })}
          </div>
        </header>
        <section className="funnel-filter-picker-body">
          <div className="funnel-filter-picker-type-row">
            <span className="funnel-filter-picker-type-title">값</span>
          </div>
          <div className="funnel-filter-picker-input-wrapper">
            <input
              id="funnel-filter-picker-value"
              className="funnel-filter-picker-input"
              value={localValue}
              autoComplete={suggestionItems.length > 0 ? "off" : undefined}
              onChange={(event) => {
                const nextValue = event.target.value;
                if (localType === "count") {
                  if (nextValue.trim().length === 0 || /^-?\d*(\.\d*)?$/.test(nextValue)) {
                    setLocalValue(nextValue);
                  }
                  return;
                }
                setLocalValue(nextValue);
              }}
              onFocus={() => {
                if (localValue.trim().length === 0 && suggestionItems.length > 0) {
                  setShowSuggestions(true);
                }
              }}
              onMouseDown={() => {
                if (localValue.trim().length === 0 && suggestionItems.length > 0) {
                  setShowSuggestions(true);
                }
              }}
              onBlur={() => {
                window.setTimeout(() => {
                  setShowSuggestions(false);
                }, 120);
              }}
              inputMode={localType === "count" ? "numeric" : undefined}
              pattern={localType === "count" ? "-?\\d*(\\.\\d*)?" : undefined}
              placeholder={localType === "count" ? "숫자만 입력하세요" : "값을 입력하세요"}
            />
            <button
              type="button"
              className="funnel-filter-picker-clear"
              disabled={localValue.length === 0}
              onClick={() => {
                setLocalValue("");
                setShowSuggestions(suggestionItems.length > 0);
              }}
              aria-label="값 지우기"
            >
              ×
            </button>
          </div>
          {allowCountToggle ? (
            <div className="funnel-filter-picker-count-row">
              <label className="funnel-filter-picker-count-label" htmlFor="funnel-filter-picker-count-toggle">
                <input
                  id="funnel-filter-picker-count-toggle"
                  type="checkbox"
                  checked={localType === "count"}
                  onChange={(event) => setLocalType(event.target.checked ? "count" : "value")}
                />
                <span>입력값을 count로 조회</span>
              </label>
            </div>
          ) : null}
          {showSuggestions && suggestionItems.length > 0 ? (
            <div className="funnel-filter-picker-suggestions" ref={suggestionListRef}>
              <p className="funnel-filter-picker-suggestions-title">기본값</p>
              <ul>
                {suggestionItems.map((item) => (
                  <li key={item}>
                    <button
                      type="button"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        setLocalValue(item);
                        setShowSuggestions(false);
                      }}
                    >
                      {item}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {loading ? (
            <p className="funnel-filter-picker-status" aria-live="polite">
              필터 항목을 불러오는 중입니다...
            </p>
          ) : error ? (
            <p className="funnel-filter-picker-status is-error" role="alert">
              {error}
            </p>
          ) : null}
        </section>
        <footer className="funnel-filter-picker-footer">
          <button type="button" className="funnel-filter-picker-cancel" onClick={onClose}>
            취소
          </button>
          <button
            type="button"
            className="funnel-filter-picker-apply"
            onClick={() => {
              const filter =
                availableFilters.find((item) => item.id === localFilterId) ??
                sortedFilters.find((item) => item.id === localFilterId) ??
                null;
              onApply(localFilterId, filter?.name ?? null, localValue, localType);
            }}
            disabled={localFilterId == null}
          >
            적용
          </button>
        </footer>
      </div>
    </div>
  );
}

/** Modal for creating or editing a funnel analysis definition. */
export default function FunnelEditorModal({
  onClose,
  initialFunnel = null,
  initialSteps = null,
  onStepsChange,
  onSaveSuccess,
}: FunnelEditorModalProps) {
  const [funnelName, setFunnelName] = useState("");
  const [periodValue, setPeriodValue] = useState<FunnelPeriodValue>(DEFAULT_PERIOD_VALUE);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [draftPeriodValue, setDraftPeriodValue] = useState<FunnelPeriodValue>(DEFAULT_PERIOD_VALUE);
  const [draftRange, setDraftRange] = useState<DraftRange>(DEFAULT_RANGE);
  const [calendarMonth, setCalendarMonth] = useState(
    () => clampMonthToPresent(isoStringToDate(DEFAULT_RANGE.startDate) ?? new Date()),
  );
  const [pathType, setPathType] = useState<"closed" | "open">("closed");
  const [chartType, setChartType] = useState<"funnel" | "vertical" | "horizontal">("funnel");
  const [stageSteps, setStageSteps] = useState<EditableStage[]>(() => buildStageCollection(initialSteps));
  const [stageDraftSteps, setStageDraftSteps] = useState<EditableStage[]>([]);
  const [isStageManagerOpen, setStageManagerOpen] = useState(false);
  const [stageConditionPickerState, setStageConditionPickerState] = useState<ConditionPickerState>(
    createInitialPickerState(),
  );
  const [stageFilterPickerState, setStageFilterPickerState] = useState<FilterPickerState>(
    createInitialFilterPickerState(),
  );
  const [stageDiscoveryStats, setStageDiscoveryStats] = useState<DiscoveryStats>(EMPTY_DISCOVERY_STATS);
  const [stageDiscoveryLoading, setStageDiscoveryLoading] = useState(false);
  const [stageDiscoveryError, setStageDiscoveryError] = useState<string | null>(null);
  const [stageDiscoveryRetryCount, setStageDiscoveryRetryCount] = useState(0);
  const [stageDragSourceIndex, setStageDragSourceIndex] = useState<number | null>(null);
  const [groups, setGroups] = useState<EditableGroup[]>([]);
  const { userId } = useUserSettings();
  const [isGroupManagerOpen, setGroupManagerOpen] = useState(false);
  const [availableGroups, setAvailableGroups] = useState<FunnelGroup[]>([]);
  const [groupManagerLoading, setGroupManagerLoading] = useState(false);
  const [groupManagerError, setGroupManagerError] = useState<string | null>(null);
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<number>>(() => new Set());
  const [isGroupEditorOpen, setGroupEditorOpen] = useState(false);
  const [groupEditorBlocks, setGroupEditorBlocks] = useState<GroupConditionBlock[]>([]);
  const [groupEditorSource, setGroupEditorSource] = useState<FunnelGroup | null>(null);
  const [groupEditorName, setGroupEditorName] = useState("");
  const [groupEditorDescription, setGroupEditorDescription] = useState("");
  const [groupEditorSaving, setGroupEditorSaving] = useState(false);
  const [groupEditorError, setGroupEditorError] = useState<string | null>(null);
  const [conditionCatalog, setConditionCatalog] = useState<ConditionCatalog | null>(null);
  const [conditionCatalogLoading, setConditionCatalogLoading] = useState(false);
  const [conditionCatalogError, setConditionCatalogError] = useState<string | null>(null);
  const [conditionPickerState, setConditionPickerState] = useState<ConditionPickerState>(
    createInitialPickerState(),
  );
  const [filterCatalog, setFilterCatalog] = useState<FilterCatalog | null>(null);
  const [filterCatalogLoading, setFilterCatalogLoading] = useState(false);
  const [filterCatalogError, setFilterCatalogError] = useState<string | null>(null);
  const [filterPickerState, setFilterPickerState] = useState<FilterPickerState>(
    createInitialFilterPickerState(),
  );
  const [discoveryStats, setDiscoveryStats] = useState<DiscoveryStats>(EMPTY_DISCOVERY_STATS);
  const [discoveryLoading, setDiscoveryLoading] = useState(false);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);
  const [discoveryRetryCount, setDiscoveryRetryCount] = useState(0);
  const [groupManagerMenuId, setGroupManagerMenuId] = useState<number | null>(null);
  const [groupDeleteTarget, setGroupDeleteTarget] = useState<FunnelGroup | null>(null);
  const [groupDeleteLoading, setGroupDeleteLoading] = useState(false);
  const [groupDeleteError, setGroupDeleteError] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const stageManagerTitleId = useId();
  const stageManagerPanelId = `${stageManagerTitleId}-panel`;
  const groupManagerTitleId = useId();
  const groupDeleteTitleId = useId();
  const groupDeleteDescriptionId = useId();
  const shouldLoadConditionCatalog = isGroupEditorOpen || isStageManagerOpen;
  const shouldLoadFilterCatalog = shouldLoadConditionCatalog;
  const canApplyStageChanges = useMemo(() => {
    if (stageDraftSteps.length < 2) {
      return false;
    }
    const hasIncomplete = stageDraftSteps.some((stage) =>
      stage.blocks?.some((block) => block.rows.some((row) => isConditionRowIncomplete(row))) ?? false,
    );
    if (hasIncomplete) {
      return false;
    }
    return stageDraftSteps.every((stage) => {
      const hasName = stage.name.trim().length > 0;
      if (!hasName) {
        return false;
      }
      const serializedConditions = serializeStageConditionBlocks(stage.blocks);
      return serializedConditions.length > 0;
    });
  }, [stageDraftSteps]);
  const hasValidStages = useMemo(() => {
    if (stageSteps.length < 2) {
      return false;
    }
    return stageSteps.every((stage) => {
      const hasName = stage.name.trim().length > 0;
      if (!hasName) {
        return false;
      }
      const serializedConditions = serializeStageConditionBlocks(stage.blocks);
      return serializedConditions.length > 0;
    });
  }, [stageSteps]);
  const resolvedRange = useMemo(
    () => normalizeRange(resolvePeriodToRange(periodValue), DEFAULT_RANGE),
    [periodValue],
  );
  const periodPresetLabel = useMemo(() => {
    if (periodValue?.type === "day") {
      return null;
    }
    const preset = FUNNEL_PERIOD_PRESETS.find((presetOption) => presetOption.match(periodValue));
    return preset?.label ?? null;
  }, [periodValue]);
  const hasSelectedGroups = groups.length > 0;
  const hasValidName = funnelName.trim().length > 0;
  const hasValidPeriod = Boolean(resolvedRange.startDate && resolvedRange.endDate);
  const canSubmitFunnel = hasValidName && hasValidPeriod && hasSelectedGroups && hasValidStages;
  const calendarTriggerRef = useRef<HTMLButtonElement | null>(null);
  const calendarPopoverRef = useRef<HTMLDivElement | null>(null);
  const conditionCatalogAbortRef = useRef<AbortController | null>(null);
  const filterCatalogAbortRef = useRef<AbortController | null>(null);
  const discoveryAbortRef = useRef<AbortController | null>(null);
  const discoveryDebounceRef = useRef<number | null>(null);
  const stageDiscoveryAbortRef = useRef<AbortController | null>(null);
  const stageDiscoveryDebounceRef = useRef<number | null>(null);
  const groupDeleteConfirmButtonRef = useRef<HTMLButtonElement | null>(null);
  const normalizedRouteValue = initialFunnel?.route ?? initialFunnel?.type ?? null;
  const trimmedGroupEditorName = groupEditorName.trim();
  const serializedGroupEditorConditions = useMemo(
    () => serializeConditionBlocks(groupEditorBlocks),
    [groupEditorBlocks],
  );
  const hasGroupConditions = serializedGroupEditorConditions.length > 0;
  const groupEditorHasIncomplete = useMemo(
    () =>
      groupEditorBlocks.some((block) =>
        block.rows.some((row) => isConditionRowIncomplete(row))
      ),
    [groupEditorBlocks],
  );
  const canApplyGroupEditor =
    trimmedGroupEditorName.length > 0 && hasGroupConditions && !groupEditorHasIncomplete;
  const discoveryNumberFormatter = useMemo(() => new Intl.NumberFormat("ko-KR"), []);

  const closeGroupEditorPanel = useCallback(
    (options?: { preserveSaving?: boolean; preserveError?: boolean }) => {
      setGroupEditorOpen(false);
      setGroupEditorSource(null);
      setGroupEditorBlocks([]);
      setGroupManagerMenuId(null);
      setGroupEditorName("");
      setGroupEditorDescription("");
      if (!options?.preserveError) {
        setGroupEditorError(null);
      }
      if (!options?.preserveSaving) {
        setGroupEditorSaving(false);
      }
    },
    [],
  );

  const normalizedUserId = useMemo(() => {
    if (typeof userId !== "string") {
      return null;
    }
    const trimmed = userId.trim();
    return trimmed.length > 0 ? trimmed : null;
  }, [userId]);

  useEffect(() => {
    setStageSteps(buildStageCollection(initialSteps));
  }, [initialSteps]);

  useEffect(() => {
    return () => {
      discoveryAbortRef.current?.abort();
      if (discoveryDebounceRef.current != null) {
        window.clearTimeout(discoveryDebounceRef.current);
        discoveryDebounceRef.current = null;
      }
      stageDiscoveryAbortRef.current?.abort();
      if (stageDiscoveryDebounceRef.current != null) {
        window.clearTimeout(stageDiscoveryDebounceRef.current);
        stageDiscoveryDebounceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!groupDeleteTarget) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !groupDeleteLoading) {
        setGroupDeleteTarget(null);
        setGroupDeleteError(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [groupDeleteTarget, groupDeleteLoading]);

  useEffect(() => {
    if (groupDeleteTarget && groupDeleteConfirmButtonRef.current) {
      groupDeleteConfirmButtonRef.current.focus();
    }
  }, [groupDeleteTarget]);

  useEffect(() => {
    if (!isGroupManagerOpen && !groupDeleteLoading) {
      setGroupDeleteTarget(null);
      setGroupDeleteError(null);
    }
  }, [isGroupManagerOpen, groupDeleteLoading]);

  const orderedStageSteps = useMemo(
    () => stageSteps.slice().sort((a, b) => a.order - b.order),
    [stageSteps],
  );

  const stageSlots = useMemo(
    () => Array.from({ length: MAX_STAGE_COUNT }, (_, index) => orderedStageSteps[index] ?? null),
    [orderedStageSteps],
  );

  const extraStageCount = Math.max(orderedStageSteps.length - MAX_STAGE_COUNT, 0);
  const currentFunnelId = typeof initialFunnel?.id === "number" ? initialFunnel.id : null;

  const serializedStageConditions = useMemo(
    () =>
      stageDraftSteps.map((stage) => ({
        id: stage.id ?? null,
        order: stage.order,
        stepnm: stage.name,
        condition: serializeStageConditionBlocks(stage.blocks),
      })),
    [stageDraftSteps],
  );
  const stageStepsWithConditions = useMemo(
    () => serializedStageConditions.filter((stage) => stage.condition.length > 0),
    [serializedStageConditions],
  );
  const hasStageConditions = stageStepsWithConditions.length > 0;
  const savedStageConditions = useMemo(
    () =>
      stageSteps
        .map((stage) => ({
          id: stage.id ?? null,
          order: stage.order,
          stepnm: stage.name,
          condition: serializeStageConditionBlocks(stage.blocks),
        }))
        .filter((stage) => stage.condition.length > 0),
    [stageSteps],
  );

  const dayCount = useMemo(
    () => calculateInclusiveDays(resolvedRange),
    [resolvedRange],
  );

  const periodDisplay = useMemo<PeriodDisplay | null>(() => {
    const startDate = isoStringToDate(resolvedRange.startDate);
    const endDate = isoStringToDate(resolvedRange.endDate);
    if (!startDate || !endDate) {
      return null;
    }
    const start = formatDisplayDate(startDate);
    const end = formatDisplayDate(endDate);
    const isSingle = start.iso === end.iso;
    return { isSingle, start, end };
  }, [resolvedRange]);

  const periodAccessibleLabel = useMemo(() => {
    if (!periodDisplay) {
      return "기간을 선택하세요";
    }
    if (periodDisplay.isSingle) {
      return `${periodDisplay.start.long}`;
    }
    return `${periodDisplay.start.long} ~ ${periodDisplay.end.long}`;
  }, [periodDisplay]);

  const visibleCalendarRange = useMemo<CalendarRange | null>(() => {
    if (!draftRange) {
      return null;
    }
    const { startDate, endDate } = draftRange;
    if (!startDate) {
      return null;
    }
    if (!endDate) {
      return {
        startDate,
        endDate: startDate,
      };
    }
    return normalizeRange(draftRange, resolvedRange);
  }, [draftRange, resolvedRange]);

  const activePresetId = useMemo<FunnelPeriodPresetId | null>(() => {
    const preset = FUNNEL_PERIOD_PRESETS.find((option) => option.match(draftPeriodValue));
    return preset?.id ?? null;
  }, [draftPeriodValue]);

  const previousCalendarMonth = useMemo(() => {
    const prev = new Date(calendarMonth);
    prev.setMonth(prev.getMonth() - 1);
    return clampMonthToPresent(prev);
  }, [calendarMonth]);

  const discoveryRatePercent = useMemo(
    () => normaliseRatePercent(discoveryStats.rate),
    [discoveryStats.rate],
  );
  const discoveryProgressPercent =
    discoveryRatePercent == null ? 0 : Math.max(0, Math.min(100, discoveryRatePercent));
  const discoveryPercentLabel =
    discoveryRatePercent != null
      ? `${discoveryRatePercent.toFixed(discoveryRatePercent >= 10 ? 0 : 1)}%`
      : "--";
  const discoveryCountLabel =
    discoveryStats.findCount != null
      ? discoveryNumberFormatter.format(Math.max(0, Math.round(discoveryStats.findCount)))
      : "--";
  const discoveryTotalLabel =
    discoveryStats.totalCount != null
      ? discoveryNumberFormatter.format(Math.max(0, Math.round(discoveryStats.totalCount)))
      : null;
  const discoveryStatusLabel = (() => {
    if (!hasGroupConditions) {
      return "조건을 추가하면 결과가 계산됩니다.";
    }
    if (discoveryLoading) {
      return "조건을 분석하는 중...";
    }
    if ((discoveryStats.findCount ?? 0) === 0) {
      return "조건과 일치하는 사용자가 없습니다.";
    }
    return "조건과 일치하는 사용자";
  })();
  const discoveryHasResult =
    hasGroupConditions &&
    !discoveryError &&
    (discoveryStats.findCount != null || discoveryRatePercent != null || discoveryStats.totalCount != null);

  const stageDiscoveryRatePercent = useMemo(
    () => normaliseRatePercent(stageDiscoveryStats.rate),
    [stageDiscoveryStats.rate],
  );
  const stageDiscoveryProgressPercent =
    stageDiscoveryRatePercent == null ? 0 : Math.max(0, Math.min(100, stageDiscoveryRatePercent));
  const stageDiscoveryPercentLabel =
    stageDiscoveryRatePercent != null
      ? `${stageDiscoveryRatePercent.toFixed(stageDiscoveryRatePercent >= 10 ? 0 : 1)}%`
      : "--";
  const stageDiscoveryCountLabel =
    stageDiscoveryStats.findCount != null
      ? discoveryNumberFormatter.format(Math.max(0, Math.round(stageDiscoveryStats.findCount)))
      : "--";
  const stageDiscoveryTotalLabel =
    stageDiscoveryStats.totalCount != null
      ? discoveryNumberFormatter.format(Math.max(0, Math.round(stageDiscoveryStats.totalCount)))
      : null;
  const stageDiscoveryStatusLabel = (() => {
    if (!hasStageConditions) {
      return "단계 조건을 추가하면 결과가 계산됩니다.";
    }
    if (stageDiscoveryLoading) {
      return "단계 조건을 분석하는 중...";
    }
    if ((stageDiscoveryStats.findCount ?? 0) === 0) {
      return "조건과 일치하는 단계가 없습니다.";
    }
    return "조건과 일치하는 사용자";
  })();
  const stageDiscoveryHasResult =
    hasStageConditions &&
    !stageDiscoveryError &&
    (
      stageDiscoveryStats.findCount != null ||
      stageDiscoveryRatePercent != null ||
      stageDiscoveryStats.totalCount != null
    );

  useEffect(() => {
    const useDraftConditions = isStageManagerOpen;
    const allowPrefetch = Boolean(initialFunnel?.id);
    const activeConditions = useDraftConditions ? stageStepsWithConditions : savedStageConditions;
    const hasActiveConditions = activeConditions.length > 0;

    if (!useDraftConditions && !allowPrefetch) {
      return;
    }

    if (!hasActiveConditions || normalizedUserId == null) {
      if (useDraftConditions) {
        stageDiscoveryAbortRef.current?.abort();
        if (stageDiscoveryDebounceRef.current != null) {
          window.clearTimeout(stageDiscoveryDebounceRef.current);
          stageDiscoveryDebounceRef.current = null;
        }
        setStageDiscoveryLoading(false);
        setStageDiscoveryError(null);
        setStageDiscoveryStats(EMPTY_DISCOVERY_STATS);
      }
      return;
    }

    stageDiscoveryAbortRef.current?.abort();
    const controller = new AbortController();
    stageDiscoveryAbortRef.current = controller;

    const triggerFetch = () => {
      setStageDiscoveryLoading(true);
      setStageDiscoveryError(null);
      void discoverStep(
        {
          userId: normalizedUserId,
          condition: activeConditions,
          period:
            resolvedRange.startDate && resolvedRange.endDate
              ? { from: resolvedRange.startDate, to: resolvedRange.endDate }
              : null,
        },
        controller.signal,
      )
        .then((result) => {
          if (controller.signal.aborted) {
            return;
          }
          setStageDiscoveryStats({
            findCount: result.findCount,
            totalCount: result.totalCount,
            rate: result.rate,
          });
          setStageDiscoveryLoading(false);
        })
        .catch((error) => {
          if (controller.signal.aborted) {
            return;
          }
          console.warn("Failed to discover funnel step", error);
          setStageDiscoveryStats(EMPTY_DISCOVERY_STATS);
          setStageDiscoveryError(error instanceof Error ? error.message : "단계 분석 중 오류가 발생했습니다.");
          setStageDiscoveryLoading(false);
        });
    };

    if (useDraftConditions) {
      if (stageDiscoveryDebounceRef.current != null) {
        window.clearTimeout(stageDiscoveryDebounceRef.current);
      }
      stageDiscoveryDebounceRef.current = window.setTimeout(triggerFetch, 400);
      return () => {
        controller.abort();
        if (stageDiscoveryDebounceRef.current != null) {
          window.clearTimeout(stageDiscoveryDebounceRef.current);
          stageDiscoveryDebounceRef.current = null;
        }
      };
    }

    triggerFetch();
    return () => {
      controller.abort();
    };
  }, [
    discoverStep,
    hasStageConditions,
    initialFunnel?.id,
    isStageManagerOpen,
    normalizedUserId,
    savedStageConditions,
    stageDiscoveryRetryCount,
    stageStepsWithConditions,
  ]);

  const handleCalendarToggle = useCallback(() => {
    if (isCalendarOpen) {
      setIsCalendarOpen(false);
      setDraftRange(resolvedRange);
      setDraftPeriodValue(periodValue);
      return;
    }
    setDraftRange(resolvedRange);
    setDraftPeriodValue(periodValue);
    const focusDate =
      isoStringToDate(resolvedRange.startDate) ?? isoStringToDate(resolvedRange.endDate) ?? new Date();
    setCalendarMonth(clampMonthToPresent(focusDate));
    setIsCalendarOpen(true);
  }, [isCalendarOpen, periodValue, resolvedRange]);

  const handleCalendarCancel = useCallback(() => {
    setDraftRange(resolvedRange);
    setDraftPeriodValue(periodValue);
    setIsCalendarOpen(false);
  }, [periodValue, resolvedRange]);

  const handleSelectDate = useCallback((date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const candidate = new Date(date);
    candidate.setHours(0, 0, 0, 0);
    const effectiveDate = candidate.getTime() > today.getTime() ? today : candidate;
    const iso = formatDateISO(effectiveDate);
    setDraftRange((prev) => {
      let nextRange: DraftRange;
      if (!prev || !prev.startDate || (prev.startDate && prev.endDate)) {
        nextRange = { startDate: iso };
      } else if (!prev.endDate) {
        if (iso < prev.startDate) {
          nextRange = { startDate: iso, endDate: prev.startDate };
        } else {
          nextRange = { startDate: prev.startDate, endDate: iso };
        }
      } else {
        nextRange = { startDate: iso };
      }
      if (nextRange?.startDate) {
        const finalEnd = nextRange.endDate ?? nextRange.startDate;
        setDraftPeriodValue({
          type: "range",
          from: nextRange.startDate,
          to: finalEnd,
        });
      }
      return nextRange;
    });
  }, []);

  const handleCalendarApply = useCallback(() => {
    const normalizedRange = normalizeRange(draftRange, resolvedRange);
    if (draftPeriodValue.type === "range") {
      setDraftPeriodValue({
        type: "range",
        from: normalizedRange.startDate,
        to: normalizedRange.endDate,
      });
    }
    const normalizedValue = normalisePeriodValueForSave(draftPeriodValue, normalizedRange);
    setPeriodValue(normalizedValue);
    setDraftRange(normalizedRange);
    setIsCalendarOpen(false);
  }, [draftPeriodValue, draftRange, resolvedRange]);

  const handlePresetSelect = useCallback((presetId: FunnelPeriodPresetId) => {
    const preset = FUNNEL_PERIOD_PRESETS.find((option) => option.id === presetId);
    if (!preset) {
      return;
    }
    const selection = preset.resolve();
    setDraftPeriodValue(selection.period);
    setDraftRange(selection.range);
    const currentMonth = new Date();
    currentMonth.setDate(1);
    setCalendarMonth(clampMonthToPresent(currentMonth));
  }, []);

  const handlePrimaryMonthChange = useCallback((date: Date) => {
    setCalendarMonth(clampMonthToPresent(date));
  }, []);

  const handleSecondaryMonthChange = useCallback((date: Date) => {
    const next = new Date(date);
    next.setMonth(next.getMonth() + 1);
    setCalendarMonth(clampMonthToPresent(next));
  }, []);

  const canApplyCalendar = draftRange !== null && !!draftRange.startDate;

  const handleOpenGroupEditor = useCallback(
    (group: FunnelGroup | null) => {
      setGroupManagerMenuId(null);
      setGroupEditorSource(group);
      setGroupEditorName(typeof group?.name === "string" ? group.name : "");
      setGroupEditorDescription(typeof group?.description === "string" ? group.description ?? "" : "");
      setGroupEditorError(null);
      setGroupEditorSaving(false);
      const normalizedBlocks = parseConditionBlocks(group?.condition ?? null, {
        context: "segment condition",
      });
      setGroupEditorBlocks(normalizedBlocks.length > 0 ? normalizedBlocks : [createEmptyConditionBlock()]);
      setGroupEditorOpen(true);
    },
    [],
  );

  const handleGroupManagerOpen = useCallback(() => {
    setGroupEditorOpen(false);
    setGroupManagerMenuId(null);
    setGroupManagerOpen(true);
  }, []);

  const handleGroupManagerClose = useCallback(() => {
    setGroupManagerOpen(false);
    closeGroupEditorPanel();
  }, [closeGroupEditorPanel]);

  const handleStartCreateGroup = useCallback(() => {
    handleOpenGroupEditor(null);
  }, [handleOpenGroupEditor]);

  const handleEditGroup = useCallback(
    (group: FunnelGroup) => {
      if (!group) {
        return;
      }
      handleOpenGroupEditor(group);
    },
    [handleOpenGroupEditor],
  );

  const handleRequestDeleteGroup = useCallback(
    (group: FunnelGroup) => {
      if (groupDeleteLoading || !group || typeof group.id !== "number") {
        return;
      }
      setGroupDeleteError(null);
      setGroupDeleteTarget(group);
    },
    [groupDeleteLoading],
  );

  const handleCancelDeleteGroup = useCallback(() => {
    if (groupDeleteLoading) {
      return;
    }
    setGroupDeleteTarget(null);
    setGroupDeleteError(null);
  }, [groupDeleteLoading]);

  const handleConfirmDeleteGroup = useCallback(() => {
    if (!groupDeleteTarget || typeof groupDeleteTarget.id !== "number") {
      return;
    }
    const targetId = groupDeleteTarget.id;
    setGroupDeleteLoading(true);
    setGroupDeleteError(null);

    void deleteFunnelGroup({ id: targetId })
      .then(() => {
        setAvailableGroups((prev) => prev.filter((group) => group.id !== targetId));
        setSelectedGroupIds((prev) => {
          if (!prev.has(targetId)) {
            return prev;
          }
          const next = new Set(prev);
          next.delete(targetId);
          return next;
        });
        setGroups((prev) => prev.filter((group) => group.id !== targetId));
        if (groupEditorSource?.id === targetId) {
          closeGroupEditorPanel();
        }
        setGroupManagerError(null);
        setGroupDeleteTarget(null);
      })
      .catch((error) => {
        console.error("Failed to delete funnel segment", error);
        setGroupDeleteError(error instanceof Error ? error.message : "Failed to delete segment.");
      })
      .finally(() => {
        setGroupDeleteLoading(false);
      });
  }, [groupDeleteTarget, groupEditorSource?.id, closeGroupEditorPanel]);

  const handleDiscoveryRetry = useCallback(() => {
    if (discoveryLoading) {
      return;
    }
    setDiscoveryRetryCount((value) => value + 1);
  }, [discoveryLoading]);

  const handleStageDiscoveryRetry = useCallback(() => {
    if (stageDiscoveryLoading) {
      return;
    }
    setStageDiscoveryRetryCount((value) => value + 1);
  }, [stageDiscoveryLoading]);

  const handleGroupEditorBack = useCallback(() => {
    closeGroupEditorPanel();
  }, [closeGroupEditorPanel]);

  const handleGroupEditorNameChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (groupEditorError) {
        setGroupEditorError(null);
      }
      setGroupEditorName(event.target.value);
    },
    [groupEditorError],
  );

  const handleGroupEditorDescriptionChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      if (groupEditorError) {
        setGroupEditorError(null);
      }
      setGroupEditorDescription(event.target.value);
    },
    [groupEditorError],
  );

  const updateStageDraft = useCallback(
    (updater: (stages: EditableStage[]) => EditableStage[]) => {
      setStageDraftSteps((prev) => {
        const next = updater(prev);
        if (!next || next.length === 0) {
          return normalizeStageOrder([createEmptyStage(1)]);
        }
        return normalizeStageOrder(next);
      });
    },
    [],
  );

  const updateStageDraftBlocks = useCallback(
    (stageIndex: number, updater: (blocks: GroupConditionBlock[]) => GroupConditionBlock[]) => {
      updateStageDraft((prev) => {
        if (stageIndex < 0 || stageIndex >= prev.length) {
          return prev;
        }
        return prev.map((stage, index) =>
          index === stageIndex ? { ...stage, blocks: updater(stage.blocks) } : stage,
        );
      });
    },
    [updateStageDraft],
  );

  const handleStageManagerOpen = useCallback(() => {
    if (stageSteps.length === 0) {
      setStageDraftSteps([createEmptyStage(1)]);
    } else {
      setStageDraftSteps(stageSteps.map((stage, index) => duplicateStage(stage, { order: index + 1 })));
    }
    setStageManagerOpen(true);
  }, [stageSteps]);

  const handleStageManagerClose = useCallback(() => {
    setStageManagerOpen(false);
    setStageDraftSteps([]);
    setStageConditionPickerState(createInitialPickerState());
    setStageFilterPickerState(createInitialFilterPickerState());
    setStageDragSourceIndex(null);
  }, []);

  const handleStageManagerApply = useCallback(() => {
    if (!canApplyStageChanges) {
      return;
    }
    const normalized = normalizeStageOrder(
      (stageDraftSteps.length === 0 ? [createEmptyStage(1)] : stageDraftSteps).map((stage, index) =>
        duplicateStage(stage, { order: index + 1 }),
      ),
    );
    setStageSteps(normalized);
    const serialized = serializeEditableStages(normalized);
    if (onStepsChange) {
      onStepsChange(serialized);
    }
    setStageManagerOpen(false);
    setStageDraftSteps([]);
    setStageConditionPickerState(createInitialPickerState());
    setStageFilterPickerState(createInitialFilterPickerState());
    setStageDragSourceIndex(null);
  }, [canApplyStageChanges, onStepsChange, stageDraftSteps]);

  const handleFunnelApply = useCallback(async () => {
    if (submitLoading || !canSubmitFunnel) {
      return;
    }
    if (normalizedUserId == null) {
      setSubmitError("애플리케이션 정보를 확인할 수 없어 퍼널을 저장할 수 없습니다.");
      return;
    }
    const trimmedName = funnelName.trim();
    const stagePayload = serializeEditableStages(stageSteps).map((stage) => ({
      ...stage,
      id: typeof stage.id === "number" && stage.id > 0 ? stage.id : 0,
      condition: Array.isArray(stage.condition) ? stage.condition : [],
    }));
    if (stagePayload.length < 2) {
      setSubmitError("최소 두 개 이상의 단계를 구성해주세요.");
      return;
    }
    const groupPayload = groups
      .map((group) => {
        if (typeof group.id !== "number" || !Number.isFinite(group.id)) {
          return null;
        }
        return {
          id: group.id,
          name: group.name ?? null,
        } as FunnelGroup;
      })
      .filter((group): group is FunnelGroup => group !== null);
    if (groupPayload.length === 0 || groupPayload.length !== groups.length) {
      setSubmitError("선택한 세그먼트 정보를 확인할 수 없습니다.");
      return;
    }
    const normalizedPeriod = normalisePeriodValueForSave(periodValue, resolvedRange);

    const payload: FunnelAddEditRequest = {
      id: currentFunnelId && currentFunnelId > 0 ? currentFunnelId : 0,
      name: trimmedName,
      period: normalizedPeriod,
      route: pathType === "open" ? 2 : 1,
      group: groupPayload,
      step: stagePayload,
      chart: chartType === "vertical" ? 2 : chartType === "horizontal" ? 3 : 1,
      userId: normalizedUserId,
    };

    setSubmitLoading(true);
    setSubmitError(null);
    try {
      await saveFunnel(payload);
      onSaveSuccess?.(payload.id ?? null);
      onClose();
    } catch (error) {
      console.error("Failed to save funnel", error);
      setSubmitError(error instanceof Error ? error.message : "퍼널을 저장하지 못했습니다.");
    } finally {
      setSubmitLoading(false);
    }
  }, [
    canSubmitFunnel,
    chartType,
    currentFunnelId,
    funnelName,
    groups,
    onClose,
    onSaveSuccess,
    normalizedUserId,
    pathType,
    periodValue,
    resolvedRange,
    stageSteps,
    submitLoading,
  ]);

  const handleStageDraftAdd = useCallback(() => {
    updateStageDraft((prev) => {
      if (prev.length >= MAX_STAGE_COUNT) {
        return prev;
      }
      return [...prev, createEmptyStage(prev.length + 1)];
    });
  }, [updateStageDraft]);

  const handleStageDraftRemove = useCallback(
    (stageIndex: number) => {
      updateStageDraft((prev) => {
        if (prev.length <= 1) {
          return prev;
        }
        return prev.filter((_, index) => index !== stageIndex);
      });
    },
    [updateStageDraft],
  );

  const handleStageDraftNameChange = useCallback(
    (stageIndex: number, value: string) => {
      updateStageDraft((prev) =>
        prev.map((stage, index) => (index === stageIndex ? { ...stage, name: value } : stage)),
      );
    },
    [updateStageDraft],
  );

  const handleStageDraftReorder = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex) {
        return;
      }
      updateStageDraft((prev) => {
        if (
          fromIndex < 0 ||
          fromIndex >= prev.length ||
          toIndex < 0 ||
          toIndex >= prev.length
        ) {
          return prev;
        }
        const next = [...prev];
        const [moved] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, moved);
        return next;
      });
    },
    [updateStageDraft],
  );

  const handleStageDragStart = useCallback(
    (event: ReactDragEvent<HTMLButtonElement>, index: number) => {
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", String(index));
      }
      setStageDragSourceIndex(index);
    },
    [],
  );

  const handleStageDragEnd = useCallback(() => {
    setStageDragSourceIndex(null);
  }, []);

  const handleStageDragOver = useCallback((event: ReactDragEvent<HTMLElement>) => {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }
  }, []);

  const handleStageDrop = useCallback(
    (event: ReactDragEvent<HTMLElement>, targetIndex: number) => {
      event.preventDefault();
      const data = event.dataTransfer?.getData("text/plain");
      const sourceIndex = stageDragSourceIndex ?? Number.parseInt(data ?? "", 10);
      if (Number.isNaN(sourceIndex)) {
        setStageDragSourceIndex(null);
        return;
      }
      handleStageDraftReorder(sourceIndex, targetIndex);
      setStageDragSourceIndex(null);
    },
    [handleStageDraftReorder, stageDragSourceIndex],
  );

  const handleStageAddConditionGroup = useCallback(
    (stageIndex: number) => {
      updateStageDraftBlocks(stageIndex, (blocks) => [...blocks, createEmptyConditionBlock()]);
    },
    [updateStageDraftBlocks],
  );

  const handleStageAddConditionRow = useCallback(
    (stageIndex: number, blockIndex: number) => {
      updateStageDraftBlocks(stageIndex, (blocks) =>
        blocks.map((block, index) =>
          index === blockIndex ? { ...block, rows: [...block.rows, createEmptyConditionRow()] } : block,
        ),
      );
    },
    [updateStageDraftBlocks],
  );

  const handleStageRemoveConditionRow = useCallback(
    (stageIndex: number, blockIndex: number, conditionIndex: number) => {
      updateStageDraftBlocks(stageIndex, (blocks) => {
        const next: GroupConditionBlock[] = [];
        blocks.forEach((block, currentIndex) => {
          if (currentIndex !== blockIndex) {
            next.push(block);
            return;
          }
          if (block.rows.length <= 1) {
            if (blocks.length === 1) {
              next.push(block);
            }
            return;
          }
          const rows = block.rows.filter((_, rowIdx) => rowIdx !== conditionIndex);
          if (rows.length === 0) {
            if (blocks.length === 1) {
              next.push(block);
            }
            return;
          }
          next.push({ ...block, rows });
        });
        return next.length === 0 ? [createEmptyConditionBlock()] : next;
      });
    },
    [updateStageDraftBlocks],
  );

  const handleStageConditionPickerClose = useCallback(() => {
    setStageConditionPickerState(createInitialPickerState());
  }, []);

  const handleStageConditionFieldButtonClick = useCallback(
    (
      event: ReactMouseEvent<HTMLButtonElement>,
      stageIndex: number,
      blockIndex: number,
      rowIndex: number,
    ) => {
      event.preventDefault();
      event.stopPropagation();
      const stage = stageDraftSteps[stageIndex];
      const block = stage?.blocks?.[blockIndex];
      const row = block?.rows?.[rowIndex] ?? null;
      const rect = event.currentTarget.getBoundingClientRect();

      setStageConditionPickerState({
        isOpen: true,
        stageIndex,
        blockIndex,
        rowIndex,
        anchor: {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        },
        activeCategoryId: row && typeof row.categoryId === "number" ? row.categoryId : null,
      });
    },
    [stageDraftSteps],
  );

  const handleStageConditionCategorySelect = useCallback((category: ConditionCategoryOption) => {
    if (typeof category?.id !== "number") {
      return;
    }
    setStageConditionPickerState((prev) => {
      if (!prev.isOpen) {
        return prev;
      }
      return { ...prev, activeCategoryId: category.id };
    });
  }, []);

  const handleStageConditionFieldSelect = useCallback(
    (category: ConditionCategoryOption, option: ConditionSubOption) => {
      if (stageConditionPickerState.stageIndex < 0) {
        return;
      }
      updateStageDraftBlocks(stageConditionPickerState.stageIndex, (blocks) =>
        blocks.map((block, blockIndex) => {
          if (blockIndex !== stageConditionPickerState.blockIndex) {
            return block;
          }
          const rows = block.rows.map((row, rowIndex) => {
            if (rowIndex !== stageConditionPickerState.rowIndex) {
              return row;
            }
            const categoryId = typeof category?.id === "number" ? category.id : null;
            const fieldId = typeof option?.id === "number" ? option.id : null;
            const defaults =
              Array.isArray(option?.default) && option.default.length > 0
                ? [...option.default]
                : [];
            return {
              ...row,
              field: option?.name ?? "",
              operatorId: null,
              operatorName: null,
              value: null,
              type: normalizeConditionValueType(row.type),
              categoryId,
              fieldId,
              defaults,
            };
          });
          return { ...block, rows };
        }),
      );
      setStageConditionPickerState(createInitialPickerState());
    },
    [
      stageConditionPickerState.blockIndex,
      stageConditionPickerState.rowIndex,
      stageConditionPickerState.stageIndex,
      updateStageDraftBlocks,
    ],
  );

  const handleStageFilterPickerClose = useCallback(() => {
    setStageFilterPickerState(createInitialFilterPickerState());
  }, []);

  const handleStageFilterButtonClick = useCallback(
    (
      event: ReactMouseEvent<HTMLButtonElement>,
      stageIndex: number,
      blockIndex: number,
      rowIndex: number,
    ) => {
      event.preventDefault();
      event.stopPropagation();
      const stage = stageDraftSteps[stageIndex];
      const block = stage?.blocks?.[blockIndex];
      const row = block?.rows?.[rowIndex] ?? null;
      if (!row) {
        return;
      }
      const rect = event.currentTarget.getBoundingClientRect();
      setStageFilterPickerState({
        isOpen: true,
        stageIndex,
        blockIndex,
        rowIndex,
        anchor: {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        },
        filterId: row.operatorId ?? null,
        value: stringifyConditionValue(row.value),
        valueType: normalizeConditionValueType(row.type),
      });
    },
    [stageDraftSteps],
  );

  const handleStageFilterApply = useCallback(
    (
      filterId: number | null,
      filterName: string | null,
      value: string,
      valueType: "value" | "count",
    ) => {
      const normalizedValue = normalizeConditionInput(value, valueType);
      const hasValue = normalizedValue !== null && normalizedValue !== undefined;
      const nextOperatorId = hasValue ? filterId : 5;
      const nextOperatorName = hasValue ? filterName : null;
      if (stageFilterPickerState.stageIndex < 0) {
        return;
      }
      updateStageDraftBlocks(stageFilterPickerState.stageIndex, (blocks) => {
        if (
          stageFilterPickerState.blockIndex < 0 ||
          stageFilterPickerState.blockIndex >= blocks.length
        ) {
          return blocks;
        }
        return blocks.map((block, blockIndex) => {
          if (blockIndex !== stageFilterPickerState.blockIndex) {
            return block;
          }
          const rows = block.rows.map((row, rowIndex) => {
            if (rowIndex !== stageFilterPickerState.rowIndex) {
              return row;
            }
            return {
              ...row,
              operatorId: nextOperatorId,
              operatorName: nextOperatorName,
              value: normalizedValue,
              type: valueType,
            };
          });
          return { ...block, rows };
        });
      });
      setStageFilterPickerState(createInitialFilterPickerState());
    },
    [
      stageFilterPickerState.blockIndex,
      stageFilterPickerState.rowIndex,
      stageFilterPickerState.stageIndex,
      updateStageDraftBlocks,
    ],
  );

  const renderStageConditionEditor = (stage: EditableStage, stageIndex: number) => {
    const blocks = stage.blocks ?? [];
    return (
      <section className="funnel-segment-editor-section funnel-stage-editor-conditions">
        {blocks.length === 0 ? (
          <div className="funnel-segment-editor-condition-toolbar">
            <div className="funnel-segment-editor-combo-row">
              <div className="funnel-segment-editor-condition-main">
                <button
                  type="button"
                  className="funnel-segment-editor-criterion"
                  onClick={() => handleStageAddConditionGroup(stageIndex)}
                >
                  조건 추가
                </button>
              </div>
              <div className="funnel-segment-editor-combo-actions">
                <button
                  type="button"
                  className="funnel-segment-editor-or"
                  onClick={() => handleStageAddConditionGroup(stageIndex)}
                  aria-label="Add OR condition"
                >
                  + OR
                </button>
              </div>
            </div>
          </div>
        ) : (
          blocks.map((block, blockIndex) => (
            <Fragment key={`stage-${stage.key}-block-${block.order}-${blockIndex}`}>
              <div className="funnel-segment-editor-condition-toolbar">
                {block.rows.length > 0 ? (
                  block.rows.map((condition, conditionIndex) => {
                    const fieldLabel =
                      condition.field.trim().length > 0 ? condition.field : "조건 추가";
                    const hasField = condition.field.trim().length > 0;
                    const resolvedFilterName =
                      typeof condition.operatorName === "string" && condition.operatorName.trim().length > 0
                        ? condition.operatorName
                        : condition.operatorId != null
                        ? filterNameById.get(condition.operatorId) ?? ""
                        : "";
                    const operatorLabel = formatFilterValueLabel(
                      resolvedFilterName,
                      condition.value,
                      normalizeConditionValueType(condition.type),
                    );
                    const isLastRow = conditionIndex === block.rows.length - 1;
                    const canRemoveCondition = !(blocks.length === 1 && block.rows.length === 1);

                    return (
                      <div
                        key={`stage-condition-${block.order}-${condition.order}-${conditionIndex}`}
                        className="funnel-segment-editor-combo-row"
                      >
                        <div className="funnel-segment-editor-condition-main">
                          <button
                            type="button"
                            className="funnel-segment-editor-criterion"
                            onClick={(event) =>
                              handleStageConditionFieldButtonClick(event, stageIndex, blockIndex, conditionIndex)
                            }
                          >
                            {fieldLabel}
                          </button>
                          {hasField ? (
                            <button
                              type="button"
                              className="funnel-segment-editor-filter-add"
                              onClick={(event) =>
                                handleStageFilterButtonClick(event, stageIndex, blockIndex, conditionIndex)
                              }
                            >
                              {operatorLabel}
                            </button>
                          ) : null}
                        </div>
                        <div className="funnel-segment-editor-combo-actions">
                          {isLastRow ? (
                            <button
                              type="button"
                              className="funnel-segment-editor-or"
                              onClick={() => handleStageAddConditionRow(stageIndex, blockIndex)}
                              aria-label="Add OR condition"
                            >
                              + OR
                            </button>
                          ) : null}
                          {canRemoveCondition ? (
                            <button
                              type="button"
                              className="funnel-segment-editor-remove"
                              onClick={() => handleStageRemoveConditionRow(stageIndex, blockIndex, conditionIndex)}
                              aria-label="Remove condition"
                            >
                              ×
                            </button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="funnel-segment-editor-combo-row">
                    <div className="funnel-segment-editor-condition-main">
                      <button
                        type="button"
                        className="funnel-segment-editor-criterion"
                        onClick={(event) => handleStageConditionFieldButtonClick(event, stageIndex, blockIndex, 0)}
                      >
                        조건 추가
                      </button>
                    </div>
                    <div className="funnel-segment-editor-combo-actions">
                      <button
                        type="button"
                        className="funnel-segment-editor-or"
                        onClick={() => handleStageAddConditionRow(stageIndex, blockIndex)}
                        aria-label="Add OR condition"
                      >
                        + OR
                      </button>
                      {blocks.length > 1 ? (
                        <button
                          type="button"
                          className="funnel-segment-editor-remove"
                          onClick={() => handleStageRemoveConditionRow(stageIndex, blockIndex, 0)}
                          aria-label="Remove condition"
                        >
                          ×
                        </button>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
              {blockIndex < blocks.length - 1 ? (
                <div className="funnel-segment-editor-and-divider" role="separator" aria-label="AND">
                  and
                </div>
              ) : null}
            </Fragment>
          ))
        )}
        <button
          type="button"
          className="funnel-segment-editor-and"
          onClick={() => handleStageAddConditionGroup(stageIndex)}
          aria-label="Add AND condition"
        >
          + AND
        </button>
      </section>
    );
  };

  const handleAddConditionGroup = useCallback(() => {
    setGroupEditorBlocks((prev) => [...prev, createEmptyConditionBlock()]);
  }, []);

  const handleAddConditionRow = useCallback((blockIndex: number) => {
    setGroupEditorBlocks((prev) =>
      prev.map((block, index) =>
        index === blockIndex ? { ...block, rows: [...block.rows, createEmptyConditionRow()] } : block,
      ),
    );
  }, []);

  const handleRemoveConditionRow = useCallback((blockIndex: number, conditionIndex: number) => {
    setGroupEditorBlocks((prev) => {
      const next: GroupConditionBlock[] = [];
      prev.forEach((block, index) => {
        if (index !== blockIndex) {
          next.push(block);
          return;
        }
        if (block.rows.length <= 1) {
          if (prev.length === 1) {
            next.push(block);
          }
          return;
        }
        const rows = block.rows.filter((_, rowIdx) => rowIdx !== conditionIndex);
        if (rows.length === 0) {
          if (prev.length === 1) {
            next.push(block);
          }
          return;
        }
        next.push({ ...block, rows });
      });
      return next.length === 0 ? [createEmptyConditionBlock()] : next;
    });
  }, []);

  const handleConditionPickerClose = useCallback(() => {
    setConditionPickerState(createInitialPickerState());
  }, []);

  const handleConditionFieldButtonClick = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>, blockIndex: number, rowIndex: number) => {
      event.preventDefault();
      event.stopPropagation();
      const block = groupEditorBlocks[blockIndex];
      const row = block?.rows?.[rowIndex] ?? null;
      const rect = event.currentTarget.getBoundingClientRect();

      setConditionPickerState({
        isOpen: true,
        blockIndex,
        rowIndex,
        stageIndex: -1,
        anchor: {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        },
        activeCategoryId: row && typeof row.categoryId === "number" ? row.categoryId : null,
      });
    },
    [groupEditorBlocks],
  );

  const handleConditionCategorySelect = useCallback((category: ConditionCategoryOption) => {
    if (typeof category?.id !== "number") {
      return;
    }
    setConditionPickerState((prev) => {
      if (!prev.isOpen) {
        return prev;
      }
      return { ...prev, activeCategoryId: category.id };
    });
  }, []);

  const handleConditionFieldSelect = useCallback(
    (category: ConditionCategoryOption, option: ConditionSubOption) => {
      setGroupEditorBlocks((prev) => {
        if (
          conditionPickerState.blockIndex < 0 ||
          conditionPickerState.blockIndex >= prev.length
        ) {
          return prev;
        }

        return prev.map((block, blockIndex) => {
          if (blockIndex !== conditionPickerState.blockIndex) {
            return block;
          }
          const rows = block.rows.map((row, rowIndex) => {
            if (rowIndex !== conditionPickerState.rowIndex) {
              return row;
            }
            const categoryId =
              typeof category?.id === "number" ? category.id : null;
            const fieldId = typeof option?.id === "number" ? option.id : null;
            const defaults =
              Array.isArray(option?.default) && option.default.length > 0
                ? [...option.default]
                : [];
            return {
              ...row,
              field: option?.name ?? "",
              operatorId: null,
              operatorName: null,
              value: null,
              type: normalizeConditionValueType(row.type),
              categoryId,
              fieldId,
              defaults,
            };
          });
          return { ...block, rows };
        });
      });
      setConditionPickerState(createInitialPickerState());
    },
    [
      conditionPickerState.blockIndex,
      conditionPickerState.rowIndex,
      setGroupEditorBlocks,
    ],
  );

  const handleFilterPickerClose = useCallback(() => {
    setFilterPickerState(createInitialFilterPickerState());
  }, []);

  const handleFilterButtonClick = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>, blockIndex: number, rowIndex: number) => {
      event.preventDefault();
      event.stopPropagation();
      const block = groupEditorBlocks[blockIndex];
      const row = block?.rows?.[rowIndex] ?? null;
      if (!row) {
        return;
      }
      const rect = event.currentTarget.getBoundingClientRect();
      setFilterPickerState({
        isOpen: true,
        blockIndex,
        rowIndex,
        stageIndex: -1,
        anchor: {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        },
        filterId: row.operatorId ?? null,
        value: stringifyConditionValue(row.value),
        valueType: normalizeConditionValueType(row.type),
      });
    },
    [groupEditorBlocks],
  );

  const handleFilterApply = useCallback(
    (
      filterId: number | null,
      filterName: string | null,
      value: string,
      valueType: "value" | "count",
    ) => {
      const normalizedValue = normalizeConditionInput(value, valueType);
      const hasValue = normalizedValue !== null && normalizedValue !== undefined;
      const nextOperatorId = hasValue ? filterId : 5;
      const nextOperatorName = hasValue ? filterName : null;
      setGroupEditorBlocks((prev) => {
        if (
          filterPickerState.blockIndex < 0 ||
          filterPickerState.blockIndex >= prev.length
        ) {
          return prev;
        }
        return prev.map((block, blockIndex) => {
          if (blockIndex !== filterPickerState.blockIndex) {
            return block;
          }
          const rows = block.rows.map((row, rowIndex) => {
            if (rowIndex !== filterPickerState.rowIndex) {
              return row;
            }
            return {
              ...row,
              operatorId: nextOperatorId,
              operatorName: nextOperatorName,
              value: normalizedValue,
              type: valueType,
            };
          });
          return { ...block, rows };
        });
      });
      setFilterPickerState(createInitialFilterPickerState());
    },
    [filterPickerState.blockIndex, filterPickerState.rowIndex, setGroupEditorBlocks],
  );

  const refreshGroupList = useCallback(
    async (signal?: AbortSignal) => {
      if (normalizedUserId == null) {
        setGroupManagerLoading(false);
        setGroupManagerError("애플리케이션 ID가 없어 세그먼트 목록을 불러올 수 없습니다.");
        setAvailableGroups([]);
        return;
      }

      if (signal?.aborted) {
        return;
      }

      setGroupManagerLoading(true);
      setGroupManagerError(null);

      try {
        const list = await getGroupList({ userId: normalizedUserId }, signal);
        if (signal?.aborted) {
          return;
        }
        setAvailableGroups(list ?? []);
      } catch (error: unknown) {
        if (signal?.aborted) {
          return;
        }
        console.warn("Failed to fetch funnel segment list", error);
        setGroupManagerError(
          error instanceof Error ? error.message : "세그먼트 목록을 불러오지 못했습니다.",
        );
        setAvailableGroups([]);
      } finally {
        if (!signal?.aborted) {
          setGroupManagerLoading(false);
        }
      }
    },
    [normalizedUserId],
  );

  useEffect(() => {
    if (!isGroupManagerOpen) {
      return;
    }

    const availableIdSet = new Set<number>();
    availableGroups.forEach((group) => {
      if (group?.id == null) {
        return;
      }
      const parsed = Number(group.id);
      if (!Number.isNaN(parsed)) {
        availableIdSet.add(parsed);
      }
    });

    setSelectedGroupIds(() => {
      const next = new Set<number>();
      groups.forEach((group) => {
        if (group.id == null) {
          return;
        }
        const parsed = Number(group.id);
        if (Number.isNaN(parsed)) {
          return;
        }
        if (availableIdSet.size === 0 || availableIdSet.has(parsed)) {
          next.add(parsed);
        }
      });
      return next;
    });
  }, [availableGroups, groups, isGroupManagerOpen]);

  useEffect(() => {
    if (!isGroupManagerOpen) {
      return;
    }

    const abortController = new AbortController();
    void refreshGroupList(abortController.signal);

    return () => {
      abortController.abort();
    };
  }, [isGroupManagerOpen, refreshGroupList]);


  useEffect(() => {
    if (!isGroupManagerOpen) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setGroupManagerOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isGroupManagerOpen]);

  useEffect(() => {
    if (groupManagerMenuId == null) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) {
        return;
      }
      if (target.closest(".funnel-segment-manager-action-menu")) {
        return;
      }
      setGroupManagerMenuId(null);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setGroupManagerMenuId(null);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [groupManagerMenuId]);

  useEffect(() => {
    conditionCatalogAbortRef.current?.abort();
    conditionCatalogAbortRef.current = null;
    setConditionCatalog(null);
    setConditionCatalogError(null);
    setConditionCatalogLoading(false);
    filterCatalogAbortRef.current?.abort();
    filterCatalogAbortRef.current = null;
    setFilterCatalog(null);
    setFilterCatalogError(null);
    setFilterCatalogLoading(false);
  }, [normalizedUserId]);

  useEffect(() => {
    if (!shouldLoadConditionCatalog) {
      conditionCatalogAbortRef.current?.abort();
      conditionCatalogAbortRef.current = null;
      setConditionCatalogLoading(false);
      return;
    }

    if (conditionCatalog || conditionCatalogAbortRef.current) {
      return;
    }

    if (normalizedUserId == null) {
      setConditionCatalogError("애플리케이션 ID가 없어 조건 항목을 불러올 수 없습니다.");
      return;
    }

    const controller = new AbortController();
    conditionCatalogAbortRef.current = controller;
    setConditionCatalogLoading(true);
    setConditionCatalogError(null);

    getConditionCatalog({ userId: normalizedUserId }, controller.signal)
      .then((catalog) => {
        setConditionCatalog(catalog);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        console.warn("Failed to fetch condition catalog", error);
        setConditionCatalogError(
          error instanceof Error ? error.message : "조건 항목을 불러오지 못했습니다.",
        );
        setConditionCatalog(null);
      })
      .finally(() => {
        if (conditionCatalogAbortRef.current === controller) {
          conditionCatalogAbortRef.current = null;
        }
        if (!controller.signal.aborted) {
          setConditionCatalogLoading(false);
        }
      });

    return () => {
      controller.abort();
      if (conditionCatalogAbortRef.current === controller) {
        conditionCatalogAbortRef.current = null;
      }
    };
  }, [conditionCatalog, normalizedUserId, shouldLoadConditionCatalog]);

  useEffect(() => {
    if (!shouldLoadFilterCatalog) {
      filterCatalogAbortRef.current?.abort();
      filterCatalogAbortRef.current = null;
      setFilterCatalogLoading(false);
      return;
    }

    if (filterCatalog || filterCatalogAbortRef.current) {
      return;
    }

    if (normalizedUserId == null) {
      setFilterCatalogError("애플리케이션 ID가 없어 필터 조건을 불러올 수 없습니다.");
      return;
    }

    const controller = new AbortController();
    filterCatalogAbortRef.current = controller;
    setFilterCatalogLoading(true);
    setFilterCatalogError(null);

    getFilterCatalog({ userId: normalizedUserId }, controller.signal)
      .then((catalog) => {
        setFilterCatalog(catalog);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        console.warn("Failed to fetch filter catalog", error);
        setFilterCatalogError(
          error instanceof Error ? error.message : "필터 조건을 불러오지 못했습니다.",
        );
        setFilterCatalog(null);
      })
      .finally(() => {
        if (filterCatalogAbortRef.current === controller) {
          filterCatalogAbortRef.current = null;
        }
        if (!controller.signal.aborted) {
          setFilterCatalogLoading(false);
        }
      });

    return () => {
      controller.abort();
      if (filterCatalogAbortRef.current === controller) {
        filterCatalogAbortRef.current = null;
      }
    };
  }, [filterCatalog, normalizedUserId, shouldLoadFilterCatalog]);

  useEffect(() => {
    if (!isGroupEditorOpen) {
      setConditionPickerState(createInitialPickerState());
    }
  }, [isGroupEditorOpen]);

  useEffect(() => {
    if (!isGroupEditorOpen) {
      setFilterPickerState(createInitialFilterPickerState());
    }
  }, [isGroupEditorOpen]);

  const conditionPickerTargetRow = useMemo(() => {
    if (!conditionPickerState.isOpen) {
      return null;
    }
    const block = groupEditorBlocks[conditionPickerState.blockIndex];
    if (!block) {
      return null;
    }
    return block.rows[conditionPickerState.rowIndex] ?? null;
  }, [
    conditionPickerState.blockIndex,
    conditionPickerState.isOpen,
    conditionPickerState.rowIndex,
    groupEditorBlocks,
  ]);

  useEffect(() => {
    if (!conditionPickerState.isOpen) {
      return;
    }
    if (conditionPickerTargetRow) {
      return;
    }
    setConditionPickerState(createInitialPickerState());
  }, [conditionPickerState.isOpen, conditionPickerTargetRow]);

  const stageConditionPickerTargetRow = useMemo(() => {
    if (!stageConditionPickerState.isOpen) {
      return null;
    }
    const stage = stageDraftSteps[stageConditionPickerState.stageIndex];
    if (!stage) {
      return null;
    }
    const block = stage.blocks[stageConditionPickerState.blockIndex];
    if (!block) {
      return null;
    }
    return block.rows[stageConditionPickerState.rowIndex] ?? null;
  }, [
    stageConditionPickerState.blockIndex,
    stageConditionPickerState.isOpen,
    stageConditionPickerState.rowIndex,
    stageConditionPickerState.stageIndex,
    stageDraftSteps,
  ]);

  useEffect(() => {
    if (!stageConditionPickerState.isOpen) {
      return;
    }
    if (stageConditionPickerTargetRow) {
      return;
    }
    setStageConditionPickerState(createInitialPickerState());
  }, [stageConditionPickerState.isOpen, stageConditionPickerTargetRow]);

  const conditionCategoryGroups = useMemo<ConditionCategoryGroup[]>(() => {
    if (!conditionCatalog) {
      return [];
    }
    const groups: ConditionCategoryGroup[] = [];
    if (conditionCatalog.event) {
      groups.push({
        key: "event",
        label: "이벤트",
        options: [conditionCatalog.event],
      });
    }
    if (Array.isArray(conditionCatalog.standard) && conditionCatalog.standard.length > 0) {
      const standardOptions = conditionCatalog.standard.filter(
        (option): option is ConditionCategoryOption => option != null,
      );
      if (standardOptions.length > 0) {
        groups.push({
          key: "standard",
          label: "기준 항목",
          options: standardOptions,
        });
      }
    }
    return groups;
  }, [conditionCatalog]);

  const stageConditionCategoryGroups = useMemo<ConditionCategoryGroup[]>(() => {
    if (!conditionCatalog) {
      return [];
    }
    const groups: ConditionCategoryGroup[] = [];
    if (conditionCatalog.event && conditionCatalog.event.enable_step !== false) {
      groups.push({
        key: "event",
        label: "이벤트",
        options: [conditionCatalog.event],
      });
    }
    if (Array.isArray(conditionCatalog.standard) && conditionCatalog.standard.length > 0) {
      const standardOptions = conditionCatalog.standard.filter(
        (option): option is ConditionCategoryOption =>
          option != null && option.enable_step !== false,
      );
      if (standardOptions.length > 0) {
        groups.push({
          key: "standard",
          label: "기본 항목",
          options: standardOptions,
        });
      }
    }
    return groups;
  }, [conditionCatalog]);

  const fallbackCategoryId = useMemo(() => {
    const firstGroup = conditionCategoryGroups[0];
    const firstOption = firstGroup?.options?.[0];
    return typeof firstOption?.id === "number" ? firstOption.id : null;
  }, [conditionCategoryGroups]);

  const stageFallbackCategoryId = useMemo(() => {
    const firstGroup = stageConditionCategoryGroups[0];
    const firstOption = firstGroup?.options?.[0];
    return typeof firstOption?.id === "number" ? firstOption.id : null;
  }, [stageConditionCategoryGroups]);

  useEffect(() => {
    if (!conditionPickerState.isOpen) {
      return;
    }
    if (conditionPickerState.activeCategoryId != null) {
      return;
    }
    const candidateId =
      typeof conditionPickerTargetRow?.categoryId === "number"
        ? conditionPickerTargetRow.categoryId
        : fallbackCategoryId;
    if (candidateId == null) {
      return;
    }
    const exists = conditionCategoryGroups.some((group) =>
      group.options.some((option) => option.id === candidateId),
    );
    if (!exists) {
      return;
    }
    setConditionPickerState((prev) => {
      if (!prev.isOpen || prev.activeCategoryId != null) {
        return prev;
      }
      return { ...prev, activeCategoryId: candidateId };
    });
  }, [
    conditionCategoryGroups,
    conditionPickerState.activeCategoryId,
    conditionPickerState.isOpen,
    conditionPickerTargetRow,
    fallbackCategoryId,
  ]);

  useEffect(() => {
    if (!stageConditionPickerState.isOpen) {
      return;
    }
    if (stageConditionPickerState.activeCategoryId != null) {
      return;
    }
    const candidateId =
      typeof stageConditionPickerTargetRow?.categoryId === "number"
        ? stageConditionPickerTargetRow.categoryId
        : stageFallbackCategoryId;
    if (candidateId == null) {
      return;
    }
    const exists = stageConditionCategoryGroups.some((group) =>
      group.options.some((option) => option.id === candidateId),
    );
    if (!exists) {
      return;
    }
    setStageConditionPickerState((prev) => {
      if (!prev.isOpen || prev.activeCategoryId != null) {
        return prev;
      }
      return { ...prev, activeCategoryId: candidateId };
    });
  }, [
    stageConditionCategoryGroups,
    stageConditionPickerState.activeCategoryId,
    stageConditionPickerState.isOpen,
    stageConditionPickerTargetRow,
    stageFallbackCategoryId,
  ]);

  const activeConditionCategory = useMemo(() => {
    if (conditionPickerState.activeCategoryId == null) {
      return null;
    }
    for (const group of conditionCategoryGroups) {
      const match = group.options.find((option) => option.id === conditionPickerState.activeCategoryId);
      if (match) {
        return match;
      }
    }
    return null;
  }, [conditionCategoryGroups, conditionPickerState.activeCategoryId]);

  const selectedConditionFieldId = conditionPickerTargetRow?.fieldId ?? null;

  const stageActiveConditionCategory = useMemo(() => {
    if (stageConditionPickerState.activeCategoryId == null) {
      return null;
    }
    for (const group of stageConditionCategoryGroups) {
      const match = group.options.find((option) => option.id === stageConditionPickerState.activeCategoryId);
      if (match) {
        return match;
      }
    }
    return null;
  }, [stageConditionPickerState.activeCategoryId, stageConditionCategoryGroups]);

  const stageSelectedConditionFieldId = stageConditionPickerTargetRow?.fieldId ?? null;

  const filterOptions = filterCatalog?.options ?? [];

  const filterNameById = useMemo(() => {
    const map = new Map<number, string>();
    filterOptions.forEach((option) => {
      if (option?.id != null) {
        map.set(option.id, option.name);
      }
    });
    return map;
  }, [filterOptions]);

  const filterPickerTargetRow = useMemo(() => {
    if (!filterPickerState.isOpen) {
      return null;
    }
    const block = groupEditorBlocks[filterPickerState.blockIndex];
    if (!block) {
      return null;
    }
    return block.rows[filterPickerState.rowIndex] ?? null;
  }, [
    filterPickerState.blockIndex,
    filterPickerState.isOpen,
    filterPickerState.rowIndex,
    groupEditorBlocks,
  ]);

  const filterPickerAllowsCount = filterPickerTargetRow?.categoryId === 9;

  useEffect(() => {
    if (!filterPickerState.isOpen) {
      return;
    }
    if (filterPickerTargetRow) {
      return;
    }
    setFilterPickerState(createInitialFilterPickerState());
  }, [filterPickerState.isOpen, filterPickerTargetRow]);

  const stageFilterPickerTargetRow = useMemo(() => {
    if (!stageFilterPickerState.isOpen) {
      return null;
    }
    const stage = stageDraftSteps[stageFilterPickerState.stageIndex];
    if (!stage) {
      return null;
    }
    const block = stage.blocks[stageFilterPickerState.blockIndex];
    if (!block) {
      return null;
    }
    return block.rows[stageFilterPickerState.rowIndex] ?? null;
  }, [
    stageDraftSteps,
    stageFilterPickerState.blockIndex,
    stageFilterPickerState.isOpen,
    stageFilterPickerState.rowIndex,
    stageFilterPickerState.stageIndex,
  ]);

  const stageFilterPickerAllowsCount = stageFilterPickerTargetRow?.categoryId === 9;

  useEffect(() => {
    if (!stageFilterPickerState.isOpen) {
      return;
    }
    if (stageFilterPickerTargetRow) {
      return;
    }
    setStageFilterPickerState(createInitialFilterPickerState());
  }, [stageFilterPickerState.isOpen, stageFilterPickerTargetRow]);

  const handleToggleGroupSelection = useCallback((groupId: number | null | undefined) => {
    if (groupId == null) {
      return;
    }
    setSelectedGroupIds((current) => {
      const next = new Set(current);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }, []);

  const selectedGroups = useMemo(() => {
    if (!isGroupManagerOpen || selectedGroupIds.size === 0) {
      return [] as Array<FunnelGroup & { id: number }>;
    }
    return availableGroups.filter(
      (group): group is FunnelGroup & { id: number } =>
        group.id != null && selectedGroupIds.has(group.id),
    );
  }, [availableGroups, isGroupManagerOpen, selectedGroupIds]);

  const handleApplyGroupSelection = useCallback(() => {
    setGroups((currentGroups) => {
      if (selectedGroups.length === 0) {
        return [];
      }

      const preservedColors = new Map<number, string | null | undefined>();
      currentGroups.forEach((group) => {
        if (group.id != null && group.color) {
          preservedColors.set(group.id, group.color);
        }
      });

      return selectedGroups.map((group, index) => {
        const groupId = group.id ?? null;
        const fallbackName = `Segment ${index + 1}`;
        const preservedColor = groupId != null ? preservedColors.get(groupId) : null;
        return {
          id: groupId,
          name: group.name ?? fallbackName,
          color: preservedColor ?? GROUP_PALETTE[index % GROUP_PALETTE.length],
        };
      });
    });
    handleGroupManagerClose();
  }, [handleGroupManagerClose, selectedGroups]);

  const handleGroupEditorApply = useCallback(async () => {
    if (groupEditorSaving) {
      return;
    }
    if (normalizedUserId == null) {
      setGroupEditorError("애플리케이션 ID가 없어 세그먼트를 저장할 수 없습니다.");
      return;
    }
    if (trimmedGroupEditorName.length === 0) {
      setGroupEditorError("세그먼트명을 입력하세요.");
      return;
    }

    const serializedConditions = serializedGroupEditorConditions;
    if (serializedConditions.length === 0) {
      setGroupEditorError("조건을 최소 1개 이상 추가하세요.");
      return;
    }

    const resolvedGroupId =
      typeof groupEditorSource?.id === "number" && Number.isFinite(groupEditorSource.id)
        ? groupEditorSource.id
        : 0;
    const payload = {
      id: resolvedGroupId,
      name: trimmedGroupEditorName,
      description: groupEditorDescription.trim(),
      condition: serializedConditions,
      userId: normalizedUserId,
    };

    setGroupEditorSaving(true);
    setGroupEditorError(null);
    closeGroupEditorPanel({ preserveSaving: true, preserveError: true });

    try {
      await saveFunnelGroup(payload);
      await refreshGroupList();
    } catch (error: unknown) {
      console.warn("Failed to save funnel segment", error);
      setGroupManagerError(
        error instanceof Error ? error.message : "세그먼트를 저장하지 못했습니다.",
      );
    } finally {
      setGroupEditorSaving(false);
    }
  }, [
    closeGroupEditorPanel,
    groupEditorDescription,
    groupEditorSaving,
    groupEditorSource,
    normalizedUserId,
    serializedGroupEditorConditions,
    trimmedGroupEditorName,
    refreshGroupList,
  ]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    const { body, documentElement } = document;
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - documentElement.clientWidth;

    body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
    };
  }, []);

  useEffect(() => {
    if (initialFunnel) {
      setFunnelName(initialFunnel.name ?? "");

      const resolvedPeriod = resolvePeriodValue(initialFunnel.period) ?? DEFAULT_PERIOD_VALUE;
      setPeriodValue(resolvedPeriod);
      setDraftPeriodValue(resolvedPeriod);
      const initialRange = normalizeRange(resolvePeriodToRange(resolvedPeriod), DEFAULT_RANGE);
      setDraftRange(initialRange);
      setCalendarMonth(
        clampMonthToPresent(isoStringToDate(initialRange.startDate) ?? new Date()),
      );

      const chartValue = Array.isArray(initialFunnel.chart)
        ? initialFunnel.chart[0]
        : initialFunnel.chart;
      const chartNumber =
        typeof chartValue === "string" ? Number.parseInt(chartValue, 10) : (chartValue as number | null);

      if (chartNumber === 2) {
        setChartType("vertical");
      } else if (chartNumber === 3) {
        setChartType("horizontal");
      } else {
        setChartType("funnel");
      }

      const resolvedRouteRaw = normalizedRouteValue;
      const resolvedRoute =
        typeof resolvedRouteRaw === "string"
          ? Number.parseInt(resolvedRouteRaw, 10)
          : resolvedRouteRaw;
      setPathType(resolvedRoute === 2 ? "open" : "closed");

      const mappedGroups: EditableGroup[] =
        initialFunnel.group?.map((group, index) => ({
          id: group?.id ?? null,
          name: group?.name ?? `Segment ${index + 1}`,
          color: GROUP_PALETTE[index % GROUP_PALETTE.length],
        })) ?? [];
      setGroups(mappedGroups);
    } else {
      setFunnelName("");
      setPeriodValue(DEFAULT_PERIOD_VALUE);
      setDraftPeriodValue(DEFAULT_PERIOD_VALUE);
      setDraftRange(DEFAULT_RANGE);
      setCalendarMonth(
        clampMonthToPresent(isoStringToDate(DEFAULT_RANGE.startDate) ?? new Date()),
      );
      setChartType("funnel");
      setPathType("closed");
      setGroups([]);
    }
    setSubmitError(null);
    setSubmitLoading(false);
  }, [initialFunnel, normalizedRouteValue]);

  useEffect(() => {
    if (!isGroupEditorOpen) {
      discoveryAbortRef.current?.abort();
      if (discoveryDebounceRef.current != null) {
        window.clearTimeout(discoveryDebounceRef.current);
        discoveryDebounceRef.current = null;
      }
      setDiscoveryLoading(false);
      setDiscoveryError(null);
      setDiscoveryStats(EMPTY_DISCOVERY_STATS);
      return;
    }

    if (normalizedUserId == null || !hasGroupConditions) {
      discoveryAbortRef.current?.abort();
      if (discoveryDebounceRef.current != null) {
        window.clearTimeout(discoveryDebounceRef.current);
        discoveryDebounceRef.current = null;
      }
      setDiscoveryLoading(false);
      setDiscoveryStats(EMPTY_DISCOVERY_STATS);
      setDiscoveryError(
        normalizedUserId == null ? "사용자 정보를 확인할 수 없어 세그먼트를 탐색할 수 없습니다." : null
      );
      return;
    }

    if (discoveryDebounceRef.current != null) {
      window.clearTimeout(discoveryDebounceRef.current);
    }

    discoveryDebounceRef.current = window.setTimeout(() => {
      discoveryAbortRef.current?.abort();
      const controller = new AbortController();
      discoveryAbortRef.current = controller;
      setDiscoveryLoading(true);
      setDiscoveryError(null);

      void discoverGroup(
        {
          userId: normalizedUserId,
          condition: serializedGroupEditorConditions,
          period:
            resolvedRange.startDate && resolvedRange.endDate
              ? { from: resolvedRange.startDate, to: resolvedRange.endDate }
              : null,
        },
        controller.signal,
      )
        .then((result) => {
          if (controller.signal.aborted) {
            return;
          }
          setDiscoveryStats({
            findCount: result.findCount,
            totalCount: result.totalCount,
            rate: result.rate,
          });
          setDiscoveryLoading(false);
        })
        .catch((error) => {
          if (controller.signal.aborted) {
            return;
          }
          console.warn("Failed to discover funnel segment", error);
          setDiscoveryStats(EMPTY_DISCOVERY_STATS);
          setDiscoveryError(error instanceof Error ? error.message : "세그먼트를 탐색하지 못했습니다.");
          setDiscoveryLoading(false);
        });
    }, 400);

    return () => {
      if (discoveryDebounceRef.current != null) {
        window.clearTimeout(discoveryDebounceRef.current);
        discoveryDebounceRef.current = null;
      }
    };
  }, [hasGroupConditions, isGroupEditorOpen, normalizedUserId, serializedGroupEditorConditions, discoveryRetryCount]);

  useEffect(() => {
    if (!isCalendarOpen) {
      return;
    }

    const handleDocumentClick = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) {
        return;
      }

      const triggerEl = calendarTriggerRef.current;
      const popoverEl = calendarPopoverRef.current;
      const clickedInsidePopover = popoverEl?.contains(target) ?? false;
      const clickedTrigger = triggerEl?.contains(target) ?? false;

      if (!clickedInsidePopover && !clickedTrigger) {
        setIsCalendarOpen(false);
        setDraftRange(resolvedRange);
        setDraftPeriodValue(periodValue);
      }
    };

    document.addEventListener("mousedown", handleDocumentClick);
    document.addEventListener("touchstart", handleDocumentClick);

    return () => {
      document.removeEventListener("mousedown", handleDocumentClick);
      document.removeEventListener("touchstart", handleDocumentClick);
    };
  }, [isCalendarOpen, periodValue, resolvedRange]);

  const handleRemoveGroup = useCallback((index: number) => {
    setGroups((current) => current.filter((_, groupIndex) => groupIndex !== index));
  }, []);

  return (
    <div className="funnel-modal-overlay">
      <div
        className="funnel-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="funnel-name-input"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="funnel-modal-header">
          <button
            type="button"
            className="funnel-modal-close"
            onClick={onClose}
            aria-label="퍼널 등록/수정 닫기"
          >
            <span aria-hidden="true">×</span>
          </button>
          <div className="funnel-modal-name">
            <label htmlFor="funnel-name-input" className="funnel-sr-only">
              퍼널 분석 이름
            </label>
            <input
              id="funnel-name-input"
              className="funnel-modal-name-input"
              value={funnelName}
              onChange={(event) => setFunnelName(event.target.value)}
              placeholder="퍼널 분석 이름을 입력하세요"
            />
          </div>
          <div className="funnel-modal-actions">
            <button
              type="button"
              className="funnel-modal-apply"
              onClick={handleFunnelApply}
              disabled={!canSubmitFunnel || submitLoading}
              aria-disabled={!canSubmitFunnel || submitLoading}
              aria-busy={submitLoading}
            >
              {submitLoading ? "적용 중..." : "적용"}
            </button>
          </div>
        </header>
        {submitError ? (
          <p className="funnel-modal-status is-error" role="alert">
            {submitError}
          </p>
        ) : null}

        <div className="funnel-modal-body">
          <section className="funnel-field-segment">
            <div className="funnel-field-heading-with-action">
              <h3 className="funnel-field-heading">기간</h3>
            </div>
            <div className="funnel-period">
              <button
                type="button"
                className="funnel-select-trigger"
                onClick={handleCalendarToggle}
                aria-haspopup="dialog"
                aria-expanded={isCalendarOpen}
                ref={calendarTriggerRef}
                aria-label={periodAccessibleLabel}
                title={periodAccessibleLabel}
              >
                <span className="funnel-period-display">
                  <span className="funnel-period-heading">
                    {dayCount !== null && periodPresetLabel ? (
                        <span className="funnel-period-count">{`${dayCount}일 - ${periodPresetLabel}`}</span>
                      ) : dayCount !== null ? (
                        <span className="funnel-period-count">{`${dayCount}일`}</span>
                      ) : (
                        <span className="funnel-period-count">기간 선택</span>
                      )}
                  </span>
                  {periodDisplay ? (
                    <span className="funnel-period-value">
                      <span className="funnel-period-line">
                        <time className="funnel-period-date" dateTime={periodDisplay.start.iso}>
                          {periodDisplay.start.main}
                        </time>
                        {periodDisplay.isSingle ? null : (
                          <>
                            <span className="funnel-period-between">~</span>
                            <time className="funnel-period-date" dateTime={periodDisplay.end.iso}>
                              {periodDisplay.end.main}
                            </time>
                          </>
                        )}
                      </span>
                      <span className="funnel-period-meta">
                        {periodDisplay.isSingle
                          ? periodDisplay.start.long
                          : `${periodDisplay.start.long} ~ ${periodDisplay.end.long}`}
                      </span>
                    </span>
                  ) : (
                    <span className="funnel-period-placeholder">기간을 선택하세요</span>
                  )}
                </span>
              </button>
            </div>
            {isCalendarOpen ? (
              <div className="funnel-calendar-popover" ref={calendarPopoverRef}>
                <div className="funnel-period-panel">
                  <div className="funnel-period-presets">
                    <h4 className="funnel-period-presets-title">빠른 선택</h4>
                    <ul className="funnel-period-preset-list">
                      {FUNNEL_PERIOD_PRESETS.map((preset) => (
                        <li key={preset.id}>
                          <button
                            type="button"
                            className={`funnel-period-preset-button${
                              activePresetId === preset.id ? " is-active" : ""
                            }`}
                            onClick={() => handlePresetSelect(preset.id)}
                          >
                            {preset.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                    <div className="funnel-period-calendar">
                      <div className="funnel-period-calendar-month">
                        <FunnelRangeCalendar
                          month={previousCalendarMonth}
                          range={visibleCalendarRange ?? resolvedRange}
                          onSelectDate={handleSelectDate}
                          onChangeMonth={handleSecondaryMonthChange}
                          hideNextMonthButton
                          disableFutureDates
                        />
                      </div>
                      <div className="funnel-period-calendar-month">
                        <FunnelRangeCalendar
                          month={calendarMonth}
                          range={visibleCalendarRange ?? resolvedRange}
                          onSelectDate={handleSelectDate}
                          onChangeMonth={handlePrimaryMonthChange}
                  disableFutureDates
                      />
                    </div>
                  </div>
                </div>
                <div className="funnel-calendar-actions">
                  <button
                    type="button"
                    className="funnel-calendar-cancel"
                    onClick={handleCalendarCancel}
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    className="funnel-calendar-apply"
                    onClick={handleCalendarApply}
                    disabled={!canApplyCalendar}
                  >
                    적용
                  </button>
                </div>
              </div>
            ) : null}
          </section>

          <section className="funnel-field-segment">
            <div className="funnel-field-heading-with-action">
              <h3 className="funnel-field-heading">유입경로</h3>
            </div>
            <div className="funnel-segmented">
              <button
                type="button"
                className={`funnel-segmented-button${pathType === "closed" ? " is-active" : ""}`}
                onClick={() => setPathType("closed")}
                aria-pressed={pathType === "closed"}
              >
                폐쇄형
              </button>
              <button
                type="button"
                className={`funnel-segmented-button${pathType === "open" ? " is-active" : ""}`}
                onClick={() => setPathType("open")}
                aria-pressed={pathType === "open"}
              >
                개방형
              </button>
            </div>
          </section>

          <section className="funnel-field-segment">
            <div className="funnel-field-heading-with-action">
              <h3 className="funnel-field-heading">세그먼트</h3>
              <button
                type="button"
                className="funnel-inline-action"
                aria-label="세그먼트 추가"
                onClick={handleGroupManagerOpen}
                aria-haspopup="dialog"
                aria-expanded={isGroupManagerOpen}
              >
                +
              </button>
            </div>
            {groups.length > 0 ? (
              <ul className="funnel-detail-segment-list funnel-editor-segment-list">
                {groups.map((group, index) => {
                  const label = group.name ?? `Segment ${index + 1}`;
                  const color = group.color ?? GROUP_PALETTE[index % GROUP_PALETTE.length];
                  const chipStyle: CSSProperties = { borderColor: color };
                  const boxStyle: CSSProperties = { backgroundColor: color, borderColor: color };

                  return (
                    <li key={`${group.id ?? index}`} className="funnel-detail-segment-item">
                      <span
                        className="funnel-detail-checkbox funnel-editor-segment-chip"
                        style={chipStyle}
                      >
                        <span
                          className="funnel-detail-checkbox-box"
                          aria-hidden="true"
                          style={boxStyle}
                        />
                        <span className="funnel-detail-checkbox-label">{label}</span>
                        <button
                          type="button"
                          className="funnel-editor-segment-remove"
                          aria-label={`${label} 세그먼트 제거`}
                          onClick={() => handleRemoveGroup(index)}
                        >
                          ×
                        </button>
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="funnel-placeholder" aria-hidden="true">
                세그먼트가 아직 없습니다. 추가 버튼으로 세그먼트를 구성하세요.
              </div>
            )}
          </section>

          <section className="funnel-field-segment">
            <div className="funnel-field-heading-with-action">
              <h3 className="funnel-field-heading">단계</h3>
              <button
                type="button"
                className="funnel-inline-action"
                aria-label="단계 추가"
                onClick={handleStageManagerOpen}
                aria-haspopup="dialog"
                aria-expanded={isStageManagerOpen}
                aria-controls={stageManagerPanelId}
              >
                +
              </button>
            </div>
            <div className="funnel-editor-stage-wrapper">
              <div className="funnel-editor-stage-row" aria-label="현재 단계 순서">
                {stageSlots.map((step, index) => {
                  const nextStep = index < stageSlots.length - 1 ? stageSlots[index + 1] : null;
                  const stageName = step
                    ? step.name && step.name.trim().length > 0
                      ? step.name
                      : `${STAGE_LABEL} ${step.order}`
                    : "\u00A0";
                  const stageIndexLabel = step ? `${step.order}${STAGE_LABEL}` : "\u00A0";
                  return (
                    <Fragment key={step?.key ?? step?.id ?? `stage-slot-${index}`}>
                      <div className={`funnel-editor-stage-item${step ? "" : " is-empty"}`}>
                        <span className="funnel-editor-stage-index">{stageIndexLabel}</span>
                        <span className="funnel-editor-stage-name">{stageName}</span>
                      </div>
                      {index < stageSlots.length - 1 ? (
                        <span
                          className={`funnel-editor-stage-arrow${!step || !nextStep ? " is-faded" : ""}`}
                          aria-hidden="true"
                        >
                          →
                        </span>
                      ) : null}
                    </Fragment>
                  );
                })}
              </div>
              {extraStageCount > 0 ? (
                <div className="funnel-editor-stage-more" aria-label={`추가 단계 ${extraStageCount}개`}>
                  +{extraStageCount}
                </div>
              ) : null}
            </div>
          </section>

          <section className="funnel-field-segment">
            <h3 className="funnel-field-heading">차트</h3>
            <div className="funnel-chart-grid">
              <button
                type="button"
                className={`funnel-chart-card${chartType === "funnel" ? " is-selected" : ""}`}
                aria-label="퍼널 그래프 선택"
                onClick={() => setChartType("funnel")}
                aria-pressed={chartType === "funnel"}
              >
                <svg className="funnel-chart-icon" viewBox="0 0 120 90" role="presentation" aria-hidden="true">
                  <defs>
                    <linearGradient id="funnelGradient" x1="0%" x2="0%" y1="0%" y2="100%">
                      <stop offset="0%" stopColor="#60a5fa" />
                      <stop offset="100%" stopColor="#2563eb" />
                    </linearGradient>
                    <linearGradient id="funnelBase" x1="0%" x2="100%" y1="0%" y2="0%">
                      <stop offset="0%" stopColor="#38bdf8" />
                      <stop offset="100%" stopColor="#6366f1" />
                    </linearGradient>
                  </defs>
                  <rect x="14" y="16" width="92" height="30" rx="8" fill="url(#funnelGradient)" />
                  <path
                    d="M18 50h84l-30 22v12c0 3.3-2.7 6-6 6h-12c-3.3 0-6-2.7-6-6V72L18 50Z"
                    fill="url(#funnelBase)"
                  />
                  <circle cx="36" cy="28" r="4" fill="#e0f2fe" />
                  <circle cx="60" cy="28" r="4" fill="#dbeafe" />
                  <circle cx="84" cy="28" r="4" fill="#e0f2fe" />
                </svg>
                <span className="funnel-chart-label">
                  <span className="funnel-chart-title">퍼널차트</span>
                  <span className="funnel-chart-subtitle">Funnel</span>
                </span>
              </button>
              <button
                type="button"
                className={`funnel-chart-card${chartType === "vertical" ? " is-selected" : ""}`}
                aria-label="세로막대 그래프 선택"
                onClick={() => setChartType("vertical")}
                aria-pressed={chartType === "vertical"}
              >
                <svg className="funnel-chart-icon" viewBox="0 0 120 90" role="presentation" aria-hidden="true">
                  <defs>
                    <linearGradient id="barGradientA" x1="0%" x2="0%" y1="0%" y2="100%">
                      <stop offset="0%" stopColor="#a855f7" />
                      <stop offset="100%" stopColor="#6366f1" />
                    </linearGradient>
                    <linearGradient id="barGradientB" x1="0%" x2="0%" y1="0%" y2="100%">
                      <stop offset="0%" stopColor="#f59e0b" />
                      <stop offset="100%" stopColor="#f97316" />
                    </linearGradient>
                    <linearGradient id="barGradientC" x1="0%" x2="0%" y1="0%" y2="100%">
                      <stop offset="0%" stopColor="#22d3ee" />
                      <stop offset="100%" stopColor="#0ea5e9" />
                    </linearGradient>
                  </defs>
                  <rect x="20" y="34" width="18" height="36" rx="6" fill="url(#barGradientA)" />
                  <rect x="50" y="20" width="18" height="50" rx="6" fill="url(#barGradientB)" />
                  <rect x="80" y="10" width="18" height="60" rx="6" fill="url(#barGradientC)" />
                  <line x1="18" y1="72" x2="102" y2="72" stroke="#cbd5f5" strokeWidth="2" strokeLinecap="round" />
                  <line x1="18" y1="50" x2="102" y2="50" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4" />
                </svg>
                <span className="funnel-chart-label">
                  <span className="funnel-chart-title">세로막대</span>
                  <span className="funnel-chart-subtitle">Vertical</span>
                </span>
              </button>
              <button
                type="button"
                className={`funnel-chart-card${chartType === "horizontal" ? " is-selected" : ""}`}
                aria-label="가로막대 그래프 선택"
                onClick={() => setChartType("horizontal")}
                aria-pressed={chartType === "horizontal"}
              >
                <svg className="funnel-chart-icon" viewBox="0 0 120 90" role="presentation" aria-hidden="true">
                  <defs>
                    <linearGradient id="hBarGradientA" x1="0%" x2="100%" y1="0%" y2="0%">
                      <stop offset="0%" stopColor="#fb7185" />
                      <stop offset="100%" stopColor="#f97316" />
                    </linearGradient>
                    <linearGradient id="hBarGradientB" x1="0%" x2="100%" y1="0%" y2="0%">
                      <stop offset="0%" stopColor="#38bdf8" />
                      <stop offset="100%" stopColor="#2563eb" />
                    </linearGradient>
                    <linearGradient id="hBarGradientC" x1="0%" x2="100%" y1="0%" y2="0%">
                      <stop offset="0%" stopColor="#a855f7" />
                      <stop offset="100%" stopColor="#6366f1" />
                    </linearGradient>
                  </defs>
                  <rect x="20" y="18" width="76" height="14" rx="7" fill="url(#hBarGradientA)" />
                  <rect x="20" y="40" width="60" height="14" rx="7" fill="url(#hBarGradientB)" />
                  <rect x="20" y="62" width="44" height="14" rx="7" fill="url(#hBarGradientC)" />
                  <line x1="20" y1="15" x2="20" y2="80" stroke="#cbd5f5" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="20" cy="18" r="3" fill="#cbd5f5" />
                  <circle cx="20" cy="40" r="3" fill="#cbd5f5" />
                  <circle cx="20" cy="62" r="3" fill="#cbd5f5" />
                </svg>
                <span className="funnel-chart-label">
                  <span className="funnel-chart-title">가로막대</span>
                  <span className="funnel-chart-subtitle">Horizontal</span>
                </span>
              </button>
            </div>
          </section>
        </div>
        <div className={`funnel-stage-manager${isStageManagerOpen ? " is-open" : ""}`}>
          <button
            type="button"
            className="funnel-stage-manager-backdrop"
            onClick={handleStageManagerClose}
            aria-label="단계 관리 닫기"
            tabIndex={-1}
          />
          <aside
            id={stageManagerPanelId}
            className="funnel-stage-manager-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby={stageManagerTitleId}
            aria-hidden={!isStageManagerOpen}
          >
            <header className="funnel-modal-header funnel-stage-manager-header">
              <div className="funnel-stage-manager-heading">
                <button
                  type="button"
                  className="funnel-modal-close funnel-stage-manager-close"
                  onClick={handleStageManagerClose}
                  aria-label="단계 관리 닫기"
                >
                  <span aria-hidden="true">×</span>
                </button>
                <h2 id={stageManagerTitleId} className="funnel-stage-manager-title">
                  단계 관리
                </h2>
              </div>
              <button
                type="button"
                className="funnel-modal-apply funnel-stage-manager-apply"
                onClick={handleStageManagerApply}
                disabled={!canApplyStageChanges}
                aria-disabled={!canApplyStageChanges}
              >
                적용
              </button>
            </header>
            <div className="funnel-modal-body funnel-stage-manager-body">
              <section className="funnel-stage-manager-section funnel-stage-manager-section--main">
                <h3 className="funnel-stage-manager-subheading">단계</h3>
                <ol className="funnel-stage-editor-list">
                  {stageDraftSteps.length === 0 ? (
                    <li className="funnel-stage-editor-placeholder" aria-live="polite">
                      단계를 추가하려면 오른쪽 + 버튼을 눌러주세요.
                    </li>
                  ) : (
                    stageDraftSteps.map((stage, index) => {
                      const stageLabel = `${index + 1}${STAGE_LABEL}`;
                      return (
                        <li
                          key={stage.key}
                          className="funnel-stage-editor-item"
                          onDragOver={handleStageDragOver}
                          onDrop={(event) => handleStageDrop(event, index)}
                        >
                          <div className="funnel-stage-editor-row">
                            <button
                              type="button"
                              className="funnel-stage-editor-handle"
                              draggable
                              onDragStart={(event) => handleStageDragStart(event, index)}
                              onDragEnd={handleStageDragEnd}
                              aria-label={`${stageLabel} 위치 이동`}
                            >
                              <img
                                src="/images/funnel-handle-slate.svg"
                                alt=""
                                className="funnel-stage-editor-handle-icon"
                                draggable={false}
                                aria-hidden="true"
                              />
                            </button>
                            <span className="funnel-stage-editor-label">{stageLabel}</span>
                            <input
                              type="text"
                              className="funnel-stage-editor-input"
                              placeholder={`${stageLabel} 이름`}
                              value={stage.name}
                              onChange={(event) => handleStageDraftNameChange(index, event.target.value)}
                              aria-label={`${stageLabel} 이름 입력`}
                            />
                            <button
                              type="button"
                              className="funnel-stage-editor-remove"
                              onClick={() => handleStageDraftRemove(index)}
                              disabled={stageDraftSteps.length <= 1}
                              aria-label={`${stageLabel} 삭제`}
                            >
                              ×
                            </button>
                          </div>
                          {renderStageConditionEditor(stage, index)}
                        </li>
                      );
                    })
                  )}
                </ol>
                <button
                  type="button"
                  className="funnel-stage-add"
                  onClick={handleStageDraftAdd}
                  disabled={stageDraftSteps.length >= MAX_STAGE_COUNT}
                  aria-disabled={stageDraftSteps.length >= MAX_STAGE_COUNT}
                >
                  단계 추가
                </button>
              </section>
              <aside className="funnel-stage-manager-section funnel-stage-manager-section--discovery">
                <h3 className="funnel-stage-manager-subheading">발견</h3>
                <div
                  className={`funnel-segment-discovery-card${stageDiscoveryLoading ? " is-loading" : ""}`}
                  role="status"
                  aria-live="polite"
                  aria-busy={stageDiscoveryLoading}
                >
                  <div className="funnel-segment-discovery-header">
                    <span className="funnel-segment-discovery-chip">실시간 탐색</span>
                    <span className="funnel-segment-discovery-meta">
                      {stageDiscoveryLoading ? "계산 중..." : "현재 단계 조건 기준"}
                    </span>
                  </div>
                  {stageDiscoveryError ? (
                    <div className="funnel-segment-discovery-error" role="alert">
                      <p>{stageDiscoveryError}</p>
                      <button type="button" onClick={handleStageDiscoveryRetry} disabled={stageDiscoveryLoading}>
                        다시 시도
                      </button>
                    </div>
                  ) : stageDiscoveryHasResult ? (
                    <>
                      <div className="funnel-segment-discovery-count-row">
                        <span className="funnel-segment-discovery-count">{stageDiscoveryCountLabel}</span>
                        <span className="funnel-segment-discovery-label">명의 사용자가 조건과 일치합니다.</span>
                      </div>
                      {stageDiscoveryTotalLabel ? (
                        <div className="funnel-segment-discovery-meta">
                          전체 사용자 {stageDiscoveryTotalLabel}명 기준
                        </div>
                      ) : null}
                      <div
                        className="funnel-segment-discovery-progress"
                        aria-label={`전체 대비 ${stageDiscoveryPercentLabel}`}
                      >
                        <div className="funnel-segment-discovery-progress-bar" role="img">
                          <span style={{ width: `${stageDiscoveryProgressPercent}%` }} />
                        </div>
                        <div className="funnel-segment-discovery-progress-meta">
                          <span className="funnel-segment-discovery-percent">{stageDiscoveryPercentLabel}</span>
                          <span className="funnel-segment-discovery-total">전체 대비 비율</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="funnel-segment-discovery-placeholder">
                      <p>{stageDiscoveryStatusLabel}</p>
                    </div>
                  )}
                </div>
              </aside>
            </div>
          </aside>
        </div>
        <div className={`funnel-segment-manager${isGroupManagerOpen ? " is-open" : ""}`}>
          <button
            type="button"
            className="funnel-segment-manager-backdrop"
            onClick={handleGroupManagerClose}
            aria-label="세그먼트 관리 닫기"
            tabIndex={-1}
          />
          <aside
            className="funnel-segment-manager-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby={groupManagerTitleId}
            aria-hidden={!isGroupManagerOpen}
          >
            {isGroupEditorOpen ? (
              <div className="funnel-segment-editor">
                <header className="funnel-modal-header funnel-segment-editor-header">
                  <h2 id={groupManagerTitleId} className="funnel-sr-only">
                    세그먼트 추가/수정
                  </h2>
                    <button
                      type="button"
                      className="funnel-modal-close funnel-segment-editor-close"
                      onClick={handleGroupEditorBack}
                      aria-label="세그먼트 관리로 돌아가기"
                    >
                      <span aria-hidden="true">←</span>
                      <span className="funnel-sr-only">이전</span>
                    </button>
                  <div className="funnel-segment-editor-name">
                    <label htmlFor="segment-editor-name" className="funnel-sr-only">
                      세그먼트명
                    </label>
                    <input
                      id="segment-editor-name"
                      className="funnel-segment-editor-name-input"
                      type="text"
                      placeholder="세그먼트명을 입력하세요"
                      value={groupEditorName}
                      onChange={handleGroupEditorNameChange}
                    />
                  </div>
                  <button
                    type="button"
                    className="funnel-modal-apply funnel-segment-editor-apply"
                    onClick={handleGroupEditorApply}
                    disabled={groupEditorSaving || !canApplyGroupEditor}
                    aria-busy={groupEditorSaving}
                  >
                    적용
                  </button>
                </header>
                {groupEditorError ? (
                  <p className="funnel-segment-editor-status is-error" role="alert">
                    {groupEditorError}
                  </p>
                ) : null}
        <div className="funnel-modal-body funnel-segment-editor-body">
          <div className="funnel-editor-split-layout">
            <div className="funnel-editor-main-column">
          <section className="funnel-segment-editor-field">
            <div className="funnel-segment-editor-field-card">
              <label htmlFor="segment-editor-description" className="funnel-segment-editor-label">
                설명
              </label>
              <textarea
                id="segment-editor-description"
                className="funnel-segment-editor-textarea"
                placeholder="세그먼트 설명을 입력하세요"
                value={groupEditorDescription}
                onChange={handleGroupEditorDescriptionChange}
              />
            </div>
          </section>
          <section className="funnel-segment-editor-section">
                    <h3 className="funnel-segment-editor-subheading">조건</h3>
                    {groupEditorBlocks.length === 0 ? (
                      <div className="funnel-segment-editor-condition-toolbar">
                        <div className="funnel-segment-editor-combo-row">
                          <div className="funnel-segment-editor-condition-main">
                            <button
                              type="button"
                              className="funnel-segment-editor-criterion"
                              onClick={handleAddConditionGroup}
                            >
                              새 조건 추가
                            </button>
                          </div>
                          <div className="funnel-segment-editor-combo-actions">
                            <button
                              type="button"
                              className="funnel-segment-editor-or"
                              onClick={handleAddConditionGroup}
                              aria-label="Add OR condition"
                            >
                              + OR
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      groupEditorBlocks.map((block, blockIndex) => (
                        <Fragment key={`segment-condition-${block.order}-${blockIndex}`}>
                          <div className="funnel-segment-editor-condition-toolbar">
                            {block.rows.length > 0 ? (
                                block.rows.map((condition, conditionIndex) => {
                                  const fieldLabel =
                                    condition.field.trim().length > 0 ? condition.field : "새 조건 추가";
                                  const hasField = condition.field.trim().length > 0;
                                  const resolvedFilterName =
                                    typeof condition.operatorName === "string" && condition.operatorName.trim().length > 0
                                      ? condition.operatorName
                                      : condition.operatorId != null
                                      ? filterNameById.get(condition.operatorId) ?? ""
                                      : "";
                    const operatorLabel = formatFilterValueLabel(
                      resolvedFilterName,
                      condition.value,
                      normalizeConditionValueType(condition.type),
                    );
                                  const isLastRow = conditionIndex === block.rows.length - 1;
                                  const canRemoveCondition = !(
                                    groupEditorBlocks.length === 1 && block.rows.length === 1
                                  );

                                return (
                                  <div
                                    key={`condition-${block.order}-${condition.order}-${conditionIndex}`}
                                    className="funnel-segment-editor-combo-row"
                                  >
                                    <div className="funnel-segment-editor-condition-main">
                                      <button
                                        type="button"
                                        className="funnel-segment-editor-criterion"
                                        onClick={(event) =>
                                          handleConditionFieldButtonClick(event, blockIndex, conditionIndex)
                                        }
                                      >
                                        {fieldLabel}
                                      </button>
                                      {hasField ? (
                                        <button
                                          type="button"
                                          className="funnel-segment-editor-filter-add"
                                          onClick={(event) => handleFilterButtonClick(event, blockIndex, conditionIndex)}
                                        >
                                          {operatorLabel}
                                        </button>
                                      ) : null}
                                    </div>
                                    <div className="funnel-segment-editor-combo-actions">
                                      {isLastRow ? (
                                        <button
                                          type="button"
                                          className="funnel-segment-editor-or"
                                          onClick={() => handleAddConditionRow(blockIndex)}
                                          aria-label="Add OR condition"
                                        >
                                          + OR
                                        </button>
                                      ) : null}
                                      {canRemoveCondition ? (
                                        <button
                                          type="button"
                                          className="funnel-segment-editor-remove"
                                          onClick={() => handleRemoveConditionRow(blockIndex, conditionIndex)}
                                          aria-label="Remove condition"
                                        >
                                          ×
                                        </button>
                                      ) : null}
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="funnel-segment-editor-combo-row">
                                <div className="funnel-segment-editor-condition-main">
                                  <button
                                    type="button"
                                    className="funnel-segment-editor-criterion"
                                    onClick={(event) => handleConditionFieldButtonClick(event, blockIndex, 0)}
                                  >
                                    새 조건 추가
                                  </button>
                                </div>
                                <div className="funnel-segment-editor-combo-actions">
                                  <button
                                    type="button"
                                    className="funnel-segment-editor-or"
                                    onClick={() => handleAddConditionRow(blockIndex)}
                                    aria-label="Add OR condition"
                                  >
                                    + OR
                                  </button>
                                  {groupEditorBlocks.length > 1 ? (
                                    <button
                                      type="button"
                                      className="funnel-segment-editor-remove"
                                      onClick={() => handleRemoveConditionRow(blockIndex, 0)}
                                      aria-label="Remove condition"
                                    >
                                      ×
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                            )}
                          </div>
                          {blockIndex < groupEditorBlocks.length - 1 ? (
                            <div className="funnel-segment-editor-and-divider" role="separator" aria-label="AND">
                              and
                            </div>
                          ) : null}
                        </Fragment>
                      ))
                    )}
                    <button
                      type="button"
                      className="funnel-segment-editor-and"
                      onClick={handleAddConditionGroup}
                      aria-label="Add AND condition"
                    >
                      + AND
                    </button>
                  </section>




            </div>
            <aside className="funnel-editor-discovery-column">
              <div className="funnel-segment-editor-field-card">
                <h3 className="funnel-segment-editor-subheading">발견</h3>
                <div
                  className={`funnel-segment-discovery-card${discoveryLoading ? " is-loading" : ""}`}
                  role="status"
                  aria-live="polite"
                  aria-busy={discoveryLoading}
                >
                  <div className="funnel-segment-discovery-header">
                    <span className="funnel-segment-discovery-chip">실시간 탐색</span>
                    <span className="funnel-segment-discovery-meta">
                      {discoveryLoading ? "계산 중..." : "현재 단계 조건 기준"}
                    </span>
                  </div>
                  {discoveryError ? (
                    <div className="funnel-segment-discovery-error" role="alert">
                      <p>{discoveryError}</p>
                      <button type="button" onClick={handleDiscoveryRetry} disabled={discoveryLoading}>
                        다시 시도
                      </button>
                    </div>
                  ) : discoveryHasResult ? (
                    <>
                      <div className="funnel-segment-discovery-count-row">
                        <span className="funnel-segment-discovery-count">{discoveryCountLabel}</span>
                        <span className="funnel-segment-discovery-label">명의 사용자가 조건과 일치합니다.</span>
                      </div>
                      {discoveryTotalLabel ? (
                        <div className="funnel-segment-discovery-meta">
                          전체 사용자 {discoveryTotalLabel}명 기준
                        </div>
                      ) : null}
                      <div
                        className="funnel-segment-discovery-progress"
                        aria-label={`전체 대비 ${discoveryPercentLabel}`}
                      >
                        <div className="funnel-segment-discovery-progress-bar" role="img">
                          <span style={{ width: `${discoveryProgressPercent}%` }} />
                        </div>
                        <div className="funnel-segment-discovery-progress-meta">
                          <span className="funnel-segment-discovery-percent">{discoveryPercentLabel}</span>
                          <span className="funnel-segment-discovery-total">전체 대비 비율</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="funnel-segment-discovery-placeholder">
                      <p>{discoveryStatusLabel}</p>
                    </div>
                  )}
                </div>
              </div>
            </aside>
          </div>
                </div>
              </div>
            ) : (
              <>
                <header className="funnel-modal-header funnel-segment-manager-header">
                  <div className="funnel-segment-manager-heading">
                    <button
                      type="button"
                      className="funnel-modal-close funnel-segment-manager-close"
                      onClick={handleGroupManagerClose}
                      aria-label="세그먼트 관리 닫기"
                    >
                      <span aria-hidden="true">×</span>
                    </button>
                    <h2 id={groupManagerTitleId} className="funnel-segment-manager-title">
                      세그먼트 관리
                    </h2>
                  </div>
                  <div className="funnel-segment-manager-actions">
                    <button
                      type="button"
                      className="funnel-segment-manager-add"
                      onClick={handleStartCreateGroup}
                    >
                      새 세그먼트 추가
                    </button>
                    <button
                      type="button"
                      className="funnel-modal-apply funnel-segment-manager-apply"
                      onClick={handleApplyGroupSelection}
                      disabled={groupManagerLoading}
                    >
                      적용
                    </button>
                  </div>
                </header>
                <div className="funnel-modal-body funnel-segment-manager-body">
                  {groupManagerLoading ? (
                    <div className="funnel-segment-manager-empty" aria-live="polite">
                      세그먼트 목록을 불러오는 중입니다...
                    </div>
                  ) : groupManagerError ? (
                    <div className="funnel-segment-manager-empty" role="alert">
                      {groupManagerError}
                    </div>
                  ) : availableGroups.length === 0 ? (
                    <div className="funnel-segment-manager-empty" aria-live="polite">
                      등록된 세그먼트가 없습니다.
                    </div>
                  ) : (
                    <div className="funnel-segment-manager-table-wrapper">
                      <table className="funnel-segment-manager-table">
                      <thead>
                        <tr>
                          <th scope="col" className="funnel-segment-manager-col-checkbox">
                            선택
                          </th>
                          <th scope="col">세그먼트 이름</th>
                          <th scope="col">설명</th>
                          <th scope="col" className="funnel-segment-manager-col-actions">조건</th>
                        </tr>
                      </thead>
                      <tbody>
                        {availableGroups.map((group, index) => {
                          const groupId = group.id ?? null;
                          const checkboxId = `${groupManagerTitleId}-segment-${groupId ?? index}`;
                          const isChecked = groupId != null && selectedGroupIds.has(groupId);
                          const key = groupId ?? group.name ?? `segment-${index}`;
                          const hasConditions = (() => {
                            const conditionData = group.condition;
                            if (typeof conditionData === "string") {
                              return conditionData.trim().length > 0;
                            }
                            if (Array.isArray(conditionData)) {
                              return conditionData.length > 0;
                            }
                            return false;
                          })();
                          const rowMenuKey = groupId ?? -(index + 1);
                          const isMenuOpen = groupManagerMenuId === rowMenuKey;
                          const isMenuDisabled = groupId == null && !hasConditions;
                          return (
                            <tr key={key} className={groupId == null ? "is-disabled" : undefined}>
                              <td className="funnel-segment-manager-cell-checkbox">
                                <input
                                  type="checkbox"
                                  id={checkboxId}
                                  className="funnel-segment-manager-checkbox"
                                  checked={isChecked}
                                  onChange={() => handleToggleGroupSelection(groupId)}
                                  disabled={groupId == null}
                                />
                              </td>
                              <td className="funnel-segment-manager-cell-name">
                                <label htmlFor={checkboxId}>{group.name ?? "이름 없음"}</label>
                              </td>
                              <td className="funnel-segment-manager-cell-description">
                                <label htmlFor={checkboxId}>{group.description ?? "-"}</label>
                              </td>
                              <td className="funnel-segment-manager-cell-actions">
                                <div className={`funnel-segment-manager-action-menu funnel-list-actions${isMenuOpen ? " is-visible" : ""}`}>
                                  <button
                                    type="button"
                                    className="funnel-list-actions-trigger"
                                    aria-haspopup="menu"
                                    aria-expanded={isMenuOpen}
                                  onClick={(event) => {
                                      event.stopPropagation();
                                      if (isMenuOpen) {
                                        setGroupManagerMenuId(null);
                                        return;
                                      }
                                      setGroupManagerMenuId(rowMenuKey);
                                    }}
                                    disabled={isMenuDisabled}
                                  >
                                    <img
                                      className="funnel-list-icon funnel-list-icon-actions"
                                      src="/images/funnel-actions-slate.svg"
                                      alt="More actions icon"
                                      aria-hidden="true"
                                    />
                                    <span className="funnel-sr-only">세그먼트 작업</span>
                                  </button>
                                  <div
                                    className="funnel-list-actions-menu"
                                    role="menu"
                                    aria-hidden={!isMenuOpen}
                                  >
                                    <button
                                      type="button"
                                      className="funnel-list-actions-item"
                                      role="menuitem"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        if (!isMenuDisabled) {
                                          handleEditGroup(group);
                                        }
                                        setGroupManagerMenuId(null);
                                      }}
                                      disabled={isMenuDisabled}
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      className="funnel-list-actions-item is-danger"
                                      role="menuitem"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        setGroupManagerMenuId(null);
                                        if (groupId != null) {
                                          handleRequestDeleteGroup(group);
                                        }
                                      }}
                                      disabled={groupId == null}
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  )}
                </div>
              </>
            )}
          </aside>
        </div>
      </div>
      <ConditionPicker
        open={conditionPickerState.isOpen}
        anchor={conditionPickerState.anchor}
        groups={conditionCategoryGroups}
        activeCategory={activeConditionCategory}
        activeCategoryId={conditionPickerState.activeCategoryId}
        selectedFieldId={selectedConditionFieldId}
        loading={conditionCatalogLoading}
        error={conditionCatalogError}
        onSelectCategory={handleConditionCategorySelect}
        onSelectField={handleConditionFieldSelect}
        onClose={handleConditionPickerClose}
      />
      <FilterPicker
        open={filterPickerState.isOpen}
        anchor={filterPickerState.anchor}
        filters={filterOptions}
        selectedFilterId={filterPickerTargetRow?.operatorId ?? filterPickerState.filterId}
        defaultValue={
          filterPickerTargetRow ? stringifyConditionValue(filterPickerTargetRow.value) : filterPickerState.value
        }
        defaultType={
          filterPickerTargetRow
            ? normalizeConditionValueType(filterPickerTargetRow.type)
            : filterPickerState.valueType
        }
        defaults={filterPickerTargetRow?.defaults}
        allowCountToggle={filterPickerAllowsCount}
        loading={filterCatalogLoading}
        error={filterCatalogError}
        onApply={handleFilterApply}
        onClose={handleFilterPickerClose}
      />
      <ConditionPicker
        open={stageConditionPickerState.isOpen}
        anchor={stageConditionPickerState.anchor}
        groups={stageConditionCategoryGroups}
        activeCategory={stageActiveConditionCategory}
        activeCategoryId={stageConditionPickerState.activeCategoryId}
        selectedFieldId={stageSelectedConditionFieldId}
        loading={conditionCatalogLoading}
        error={conditionCatalogError}
        onSelectCategory={handleStageConditionCategorySelect}
        onSelectField={handleStageConditionFieldSelect}
        onClose={handleStageConditionPickerClose}
      />
      <FilterPicker
        open={stageFilterPickerState.isOpen}
        anchor={stageFilterPickerState.anchor}
        filters={filterOptions}
        selectedFilterId={
          stageFilterPickerTargetRow?.operatorId ?? stageFilterPickerState.filterId
        }
        defaultValue={
          stageFilterPickerTargetRow
            ? stringifyConditionValue(stageFilterPickerTargetRow.value)
            : stageFilterPickerState.value
        }
        defaultType={
          stageFilterPickerTargetRow
            ? normalizeConditionValueType(stageFilterPickerTargetRow.type)
            : stageFilterPickerState.valueType
        }
        defaults={stageFilterPickerTargetRow?.defaults}
        allowCountToggle={stageFilterPickerAllowsCount}
        loading={filterCatalogLoading}
        error={filterCatalogError}
        onApply={handleStageFilterApply}
        onClose={handleStageFilterPickerClose}
      />
      {groupDeleteTarget ? (
        <div className="funnel-dialog-overlay" role="presentation">
          <div
            className="funnel-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={groupDeleteTitleId}
            aria-describedby={groupDeleteDescriptionId}
          >
            <div className="funnel-dialog-icon" aria-hidden="true">
              <span className="funnel-dialog-icon-ring" />
              <span className="funnel-dialog-icon-mark">!</span>
            </div>
            <div className="funnel-dialog-body">
              <h2 id={groupDeleteTitleId} className="funnel-dialog-title">
                Delete segment?
              </h2>
              <p id={groupDeleteDescriptionId} className="funnel-dialog-description">
                <strong>{groupDeleteTarget.name ?? "Untitled segment"}</strong> will be removed
                permanently. This action cannot be undone.
              </p>
              {groupDeleteError ? (
                <p className="funnel-dialog-error" role="alert">
                  {groupDeleteError}
                </p>
              ) : null}
            </div>
            <div className="funnel-dialog-actions">
              <button
                type="button"
                className="funnel-button is-ghost"
                onClick={handleCancelDeleteGroup}
                disabled={groupDeleteLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="funnel-button is-danger"
                onClick={handleConfirmDeleteGroup}
                ref={groupDeleteConfirmButtonRef}
                disabled={groupDeleteLoading}
              >
                {groupDeleteLoading ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
