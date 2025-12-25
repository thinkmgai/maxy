import { useEffect, useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  type CoreVitalResponse,
  type PageLogDetailItem,
  type PageLogDetailResponse,
  type PerformanceQuery,
  type VitalListItem,
  getCoreVital,
  getPageLogDetail,
  getVitalList,
} from "../../api/PerformanceAnalysis";
import WaterfallPanel from "./Waterfall";

type PageAnalysisProps = {
  filters: PerformanceQuery;
};

type MetricKey = "LCP" | "FCP" | "INP" | "CLS";
type MetricStatus = "good" | "warn" | "bad" | "unknown";

type MetricConfig = {
  label: string;
  description: string;
  thresholds: { good: number; improve: number };
  max: number;
  avgFormatter: (value: number) => string;
  tableFormatter: (value?: number | null) => string;
  chartValueMapper: (value: number) => number;
  chartTickFormatter: (value: number) => string;
  chartTooltipFormatter: (value: number) => string;
  color: string;
  group: string;
};

const METRIC_CONFIG: Record<MetricKey, MetricConfig> = {
  LCP: {
    label: "Largest Contentful Paint",
    description: "Largest Contentful Paint",
    thresholds: { good: 2500, improve: 4000 },
    max: 6000,
    avgFormatter: (value) => `${Math.round(value)} ms`,
    tableFormatter: (value) => (value == null ? "-" : `${(value / 1000).toFixed(3)}s`),
    chartValueMapper: (value) => value / 1000,
    chartTickFormatter: (value) => `${value.toFixed(2)}s`,
    chartTooltipFormatter: (value) => `${value.toFixed(2)} s`,
    color: "#1ec99f",
    group: "Loading",
  },
  FCP: {
    label: "First Contentful Paint",
    description: "First Contentful Paint",
    thresholds: { good: 1800, improve: 3000 },
    max: 5000,
    avgFormatter: (value) => `${Math.round(value)} ms`,
    tableFormatter: (value) => (value == null ? "-" : `${(value / 1000).toFixed(3)}s`),
    chartValueMapper: (value) => value / 1000,
    chartTickFormatter: (value) => `${value.toFixed(2)}s`,
    chartTooltipFormatter: (value) => `${value.toFixed(2)} s`,
    color: "#67d5b5",
    group: "Loading",
  },
  INP: {
    label: "Interaction to Next Paint",
    description: "Interaction to Next Paint",
    thresholds: { good: 200, improve: 500 },
    max: 700,
    avgFormatter: (value) => `${Math.round(value)} ms`,
    tableFormatter: (value) => (value == null ? "-" : `${Math.round(value)}ms`),
    chartValueMapper: (value) => value,
    chartTickFormatter: (value) => `${Math.round(value)}ms`,
    chartTooltipFormatter: (value) => `${Math.round(value)} ms`,
    color: "#f5a623",
    group: "Interactivity",
  },
  CLS: {
    label: "Cumulative Layout Shift",
    description: "Cumulative Layout Shift",
    thresholds: { good: 0.1, improve: 0.25 },
    max: 0.35,
    avgFormatter: (value) => value.toFixed(4),
    tableFormatter: (value) => (value == null ? "-" : value.toFixed(4)),
    chartValueMapper: (value) => value,
    chartTickFormatter: (value) => value.toFixed(3),
    chartTooltipFormatter: (value) => value.toFixed(3),
    color: "#ff6f61",
    group: "Visual Stability",
  },
};

const CORE_METRICS: MetricKey[] = ["LCP", "FCP", "INP", "CLS"];

const statusLegend: Array<{ status: MetricStatus; label: string }> = [
  { status: "good", label: "양호" },
  { status: "warn", label: "개선 필요" },
  { status: "bad", label: "미흡" },
];

const CHART_AREAS: Record<MetricKey, string> = {
  LCP: "pa_chart_lcp",
  FCP: "pa_chart_fcp",
  INP: "pa_chart_inp",
  CLS: "pa_chart_cls",
};


const numberFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

function formatCount(value: number) {
  return numberFormatter.format(value);
}

function formatDuration(value?: number) {
  if (value == null || Number.isNaN(value)) return "-";
  return `${Math.round(value)} ms`;
}

function formatRange(from: number, to: number) {
  const fromDate = new Date(from);
  const toDate = new Date(to);
  return `${fromDate.toLocaleString()} ~ ${toDate.toLocaleString()}`;
}

function formatThresholdValue(metric: MetricKey, value: number) {
  if (metric === "CLS") {
    return value.toFixed(2);
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}s`;
  }
  return `${Math.round(value)}ms`;
}

function getMetricStatus(metric: MetricKey, value?: number | null): MetricStatus {
  if (value == null || Number.isNaN(value)) {
    return "unknown";
  }
  const { thresholds } = METRIC_CONFIG[metric];
  if (value <= thresholds.good) return "good";
  if (value <= thresholds.improve) return "warn";
  return "bad";
}

function getMetricValueFromItem(metric: MetricKey, item: VitalListItem): number | undefined {
  switch (metric) {
    case "LCP":
      return item.lcp ?? undefined;
    case "FCP":
      return item.fcp ?? undefined;
    case "INP":
      return item.inp ?? undefined;
    case "CLS":
      return item.cls ?? undefined;
    default:
      return undefined;
  }
}

function renderFeeldex(value?: number | null) {
  if (value == null || value < 0) {
    return <span className="feeldex-icon empty" aria-label="Feeldex 없음">-</span>;
  }

  let status: "very_good" | "good" | "normal" | "bad" | "very_bad";
  if (value === 0) {
    status = "very_good";
  } else if (value === 1) {
    status = "good";
  } else if (value === 2 || value === 3) {
    status = "normal";
  } else if (value === 4) {
    status = "bad";
  } else {
    status = "very_bad";
  }

  const labelMap: Record<typeof status, string> = {
    very_good: "Feeldex Very Good",
    good: "Feeldex Good",
    normal: "Feeldex Normal",
    bad: "Feeldex Bad",
    very_bad: "Feeldex Very Bad",
  };

  return (
    <span
      className={`feeldex-icon ${status}`}
      aria-label={labelMap[status]}
      title={labelMap[status]}
      role="img"
    />
  );
}

function formatDetailDuration(value?: number | null) {
  if (value == null || Number.isNaN(value)) {
    return "-";
  }
  if (value >= 1000) {
    const seconds = value / 1000;
    return Number.isInteger(seconds) ? `${seconds.toFixed(0)}초` : `${seconds.toFixed(2)}초`;
  }
  return `${Math.round(value)}ms`;
}

function formatDetailTimestamp(value?: number | null) {
  if (value == null || Number.isNaN(value)) {
    return "-";
  }
  return new Date(value).toLocaleString();
}

function formatWaterfallAxisLabel(value: number) {
  if (value >= 1000) {
    const seconds = value / 1000;
    return Number.isInteger(seconds) ? `${seconds.toFixed(0)}s` : `${seconds.toFixed(1)}s`;
  }
  return `${Math.round(value)}ms`;
}

function determineWaterfallTickSize(maxValue: number) {
  const scales = [100, 200, 500, 1000, 2000, 5000, 10000, 20000];
  for (const scale of scales) {
    if (maxValue / scale <= 8) {
      return scale;
    }
  }
  return scales[scales.length - 1];
}

export default function PageAnalysis({ filters }: PageAnalysisProps) {
  const [coreVital, setCoreVital] = useState<CoreVitalResponse | null>(null);
  const [vitalList, setVitalList] = useState<VitalListItem[]>([]);
  const [sortState, setSortState] = useState<{ key: keyof VitalListItem | "loadingAvg"; direction: "asc" | "desc" }>({
    key: "loadingAvg",
    direction: "desc",
  });
  const [detailTarget, setDetailTarget] = useState<VitalListItem | null>(null);
  const [detailData, setDetailData] = useState<PageLogDetailResponse | null>(null);
  const [selectedDetailRow, setSelectedDetailRow] = useState<PageLogDetailItem | null>(null);
  const [detailSortState, setDetailSortState] = useState<{
    key: "loadingTime" | "feeldex" | "deviceId" | "userId" | "timestamp" | "networkStatus" | "lcp" | "fcp" | "inp" | "cls";
    direction: "asc" | "desc";
  }>({
    key: "timestamp",
    direction: "desc",
  });
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [isWaterfallOpen, setIsWaterfallOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    Promise.all([
      getCoreVital(filters, controller.signal),
      getVitalList(filters, controller.signal),
    ])
      .then(([core, vitalItems]) => {
        setCoreVital(core);
        setVitalList(vitalItems);
        setDetailTarget(null);
        setDetailData(null);
        setDetailError(null);
        setSelectedDetailRow(null);
        setDetailSortState({ key: "timestamp", direction: "desc" });
        setIsWaterfallOpen(false);
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : "데이터를 불러오지 못했습니다.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [filters]);

  useEffect(() => {
    if (!detailTarget) {
      return undefined;
    }

    const controller = new AbortController();
    setDetailLoading(true);
    setDetailError(null);
    setDetailData(null);
    setSelectedDetailRow(null);
    setDetailSortState({ key: "timestamp", direction: "desc" });

    getPageLogDetail(
      {
        ...filters,
        mxPageId: detailTarget.mxPageId,
        reqUrl: detailTarget.reqUrl,
      },
      controller.signal
    )
      .then((data) => {
        setDetailData(data);
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setDetailError(err instanceof Error ? err.message : "상세 정보를 불러오지 못했습니다.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setDetailLoading(false);
        }
      });

    return () => controller.abort();
  }, [detailTarget, filters]);

  useEffect(() => {
    if (!detailTarget) {
      return undefined;
    }
    const { style } = document.body;
    const previousOverflow = style.overflow;
    style.overflow = 'hidden';
    return () => {
      style.overflow = previousOverflow;
    };
  }, [detailTarget]);

  function closeDetail() {
    setDetailTarget(null);
    setDetailData(null);
    setDetailError(null);
    setDetailLoading(false);
    setSelectedDetailRow(null);
    setDetailSortState({ key: "timestamp", direction: "desc" });
    setIsWaterfallOpen(false);
  }

  useEffect(() => {
    if (!detailTarget) {
      return undefined;
    }
    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDetail();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [detailTarget]);

  useEffect(() => {
    if (!detailTarget) {
      return undefined;
    }
    const frame = window.requestAnimationFrame(() => {
      const dialog = document.getElementById("logDetail__popup");
      dialog?.focus();
    });
    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [detailTarget]);

  const rangeText = useMemo(() => formatRange(filters.from, filters.to), [filters]);

  const coreMetricSummaries = useMemo(() => {
    if (!coreVital) return [];

    return CORE_METRICS.map((metric) => {
      const config = METRIC_CONFIG[metric];
      const value = coreVital.core[metric];
      const status = getMetricStatus(metric, value);

      const labels = {
        good: `≤ ${formatThresholdValue(metric, config.thresholds.good)}`,
        range: `${formatThresholdValue(metric, config.thresholds.good)} ~ ${formatThresholdValue(
          metric,
          config.thresholds.improve,
        )}`,
        poor: `> ${formatThresholdValue(metric, config.thresholds.improve)}`,
      };

      const goodWidth = Math.min((config.thresholds.good / config.max) * 100, 100);
      const improveWidth = Math.min(
        ((config.thresholds.improve - config.thresholds.good) / config.max) * 100,
        Math.max(0, 100 - goodWidth),
      );
      const poorWidth = Math.max(0, 100 - goodWidth - improveWidth);

      const markerPercent =
        value == null
          ? null
          : Math.max(0, Math.min((value / config.max) * 100, 100));

      return {
        metric,
        value,
        status,
        config,
        labels,
        segments: [
          { className: "good", width: goodWidth, label: labels.good },
          { className: "warn", width: improveWidth, label: labels.range },
          { className: "bad", width: poorWidth, label: labels.poor },
        ],
        markerPercent,
      };
    });
  }, [coreVital]);

  const lineSeries = useMemo(() => {
    const result: Record<MetricKey, Array<{ timestamp: number; value: number }>> = {
      LCP: [],
      FCP: [],
      INP: [],
      CLS: [],
    };

    if (!coreVital) {
      return result;
    }

    CORE_METRICS.forEach((metric) => {
      const chartKey = metric.toLowerCase() as keyof CoreVitalResponse["chart"];
      const rawSeries = (coreVital.chart?.[chartKey] ?? []) as Array<[number, number]>;
      const mapper = METRIC_CONFIG[metric].chartValueMapper;
      result[metric] = rawSeries.map(([timestamp, value]) => ({
        timestamp,
        value: mapper(value),
      }));
    });

    return result;
  }, [coreVital]);

  const formatAverageValue = (metric: MetricKey, value?: number | null) =>
    value == null ? "-" : METRIC_CONFIG[metric].avgFormatter(value);

  const formatTableValue = (metric: MetricKey, value?: number | null) =>
    METRIC_CONFIG[metric].tableFormatter(value);

  const handleSort = (key: keyof VitalListItem | "loadingAvg") => {
    setSortState((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "desc" };
    });
  };

  const handleHeaderKeyDown = (key: keyof VitalListItem | "loadingAvg", event: KeyboardEvent<HTMLTableCellElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleSort(key);
    }
  };

  const getAriaSort = (key: keyof VitalListItem | "loadingAvg") =>
    sortState.key === key ? (sortState.direction === "asc" ? "ascending" : "descending") : "none";

  const getSortValue = (item: VitalListItem, key: keyof VitalListItem | "loadingAvg") => {
    if (key === "loadingAvg") return item.loadingAvg ?? 0;
    if (key === "reqUrl") return item.reqUrl ?? "";
    const value = item[key];
    if (value == null) return Number.NEGATIVE_INFINITY;
    return value;
  };

  const sortedVitalList = useMemo(() => {
    return [...vitalList].sort((a, b) => {
      if (sortState.key === "reqUrl") {
        const aValue = getSortValue(a, "reqUrl") as string;
        const bValue = getSortValue(b, "reqUrl") as string;
        return sortState.direction === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }

      const aValue = getSortValue(a, sortState.key) as number;
      const bValue = getSortValue(b, sortState.key) as number;
      if (aValue === bValue) {
        return (a.reqUrl ?? "").localeCompare(b.reqUrl ?? "");
      }
      return sortState.direction === "asc" ? aValue - bValue : bValue - aValue;
    });
  }, [vitalList, sortState]);

  const detailRows = useMemo(() => detailData?.list ?? [], [detailData]);

  const handleSelectDetailRow = (row: PageLogDetailItem) => {
    setSelectedDetailRow(row);
    setIsWaterfallOpen(true);
  };

  const sortedDetailRows = useMemo(() => {
    if (!detailRows || detailRows.length === 0) return [];
    const multiplier = detailSortState.direction === "asc" ? 1 : -1;

    const getValue = (row: PageLogDetailItem) => {
      switch (detailSortState.key) {
        case "loadingTime":
          return row.loadingTime ?? 0;
        case "feeldex":
          return row.feeldex ?? Number.NEGATIVE_INFINITY;
        case "deviceId":
          return row.deviceId ?? "";
        case "userId":
          return row.userId ?? "";
        case "timestamp":
          return row.timestamp ?? 0;
        case "networkStatus":
          return row.networkStatus ?? "";
        case "lcp":
          return row.lcp ?? Number.NEGATIVE_INFINITY;
        case "fcp":
          return row.fcp ?? Number.NEGATIVE_INFINITY;
        case "inp":
          return row.inp ?? Number.NEGATIVE_INFINITY;
        case "cls":
          return row.cls ?? Number.NEGATIVE_INFINITY;
        default:
          return 0;
      }
    };

    return [...detailRows].sort((a, b) => {
      const aValue = getValue(a);
      const bValue = getValue(b);

      if (typeof aValue === "number" && typeof bValue === "number") {
        if (aValue === bValue) {
          return (a.deviceId ?? "").localeCompare(b.deviceId ?? "");
        }
        return (aValue - bValue) * multiplier;
      }

      const aString = String(aValue);
      const bString = String(bValue);
      if (aString === bString) {
        return (a.deviceId ?? "").localeCompare(b.deviceId ?? "");
      }
      return aString.localeCompare(bString) * multiplier;
    });
  }, [detailRows, detailSortState]);

  useEffect(() => {
    if (sortedDetailRows.length === 0) {
      if (selectedDetailRow) {
        setSelectedDetailRow(null);
      }
      setIsWaterfallOpen(false);
      return;
    }

    if (!selectedDetailRow) {
      setSelectedDetailRow(sortedDetailRows[0]);
      setIsWaterfallOpen(false);
      return;
    }

    const selectedExists = sortedDetailRows.some((row) => row.id === selectedDetailRow.id);
    if (!selectedExists) {
      setSelectedDetailRow(sortedDetailRows[0]);
      setIsWaterfallOpen(false);
    }
  }, [sortedDetailRows, selectedDetailRow]);

  const handleDetailSort = (key: typeof detailSortState.key) => {
    setDetailSortState((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: key === "timestamp" ? "desc" : "asc" };
    });
  };

  const handleDetailHeaderKeyDown = (
    key: typeof detailSortState.key,
    event: KeyboardEvent<HTMLTableCellElement>
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleDetailSort(key);
    }
  };

  const renderDetailPopup = () => {
    if (!detailTarget) {
      return null;
    }

    const summary = detailData?.summary;
    const vitals = detailData?.vitals ?? [];
    const waterfallSteps = detailData?.waterfall ?? [];
    const timeline = detailData?.timeline ?? [];
    const totalCount = summary?.count ?? detailTarget.count;
    const aliasText = summary?.alias ?? null;
    const reqUrlText = summary?.reqUrl ?? detailTarget.reqUrl ?? "-";
    const averageLoading = summary?.averageLoading ?? detailTarget.loadingAvg;
    const activeRow = selectedDetailRow;

    const determineOsIcon = (osVersion?: string | null) => {
      if (!osVersion) return undefined;
      const lower = osVersion.toLowerCase();
      if (lower.includes("ios")) return "icon_os ios";
      if (lower.includes("android")) return "icon_os android";
      return "icon_os";
    };

    const determineLogTypeIcon = (logType?: string | null) => {
      if (!logType) return undefined;
      return logType.toLowerCase().includes("native") ? "icon_log_type native" : "icon_log_type webview";
    };

    const metaChipsCandidates: Array<{ key: string; icon?: string; value: string | number | null } | null> = [
      { key: "device", icon: "icon_device", value: activeRow?.deviceId ?? summary?.deviceName ?? null },
      { key: "appVersion", icon: "icon_app_ver", value: summary?.appVersion ?? null },
      { key: "os", icon: determineOsIcon(summary?.osVersion), value: summary?.osVersion ?? null },
      { key: "network", icon: "icon_network", value: activeRow?.networkStatus ?? summary?.networkType ?? null },
      { key: "carrier", icon: "icon_simoperator", value: summary?.simOperator ?? null },
      { key: "logType", icon: determineLogTypeIcon(summary?.logType), value: summary?.logType ?? null },
      { key: "user", icon: "icon_user", value: activeRow?.userId ?? summary?.userId ?? null },
      (activeRow?.loadingTime ?? averageLoading)
        ? {
            key: "avg",
            icon: "icon_time_zone",
            value: formatDuration(activeRow?.loadingTime ?? averageLoading),
          }
        : null,
    ];

    const metaChips = metaChipsCandidates.reduce<Array<{ key: string; icon?: string; value: string | number }>>(
      (acc, item) => {
        if (!item) {
          return acc;
        }
        const { value } = item;
        if (value == null || `${value}`.length === 0) {
          return acc;
        }
        acc.push({ key: item.key, icon: item.icon, value });
        return acc;
      },
      [],
    );

    const profileCandidates: Array<{ key: string; label: string; value: ReactNode }> = [
      {
        key: "loading",
        label: "Loading Time",
        value: formatDetailDuration(activeRow?.loadingTime ?? averageLoading ?? null),
      },
      { key: "feeldex", label: "Feeldex", value: renderFeeldex(activeRow?.feeldex) },
      {
        key: "network",
        label: "Network",
        value: activeRow?.networkStatus ?? summary?.networkType ?? null,
      },
      {
        key: "timestamp",
        label: "Timestamp",
        value: formatDetailTimestamp(activeRow?.timestamp),
      },
      { key: "userId", label: "User ID", value: activeRow?.userId ?? summary?.userId ?? null },
      { key: "deviceId", label: "Device ID", value: activeRow?.deviceId ?? summary?.deviceName ?? null },
      { key: "appVersion", label: "App Version", value: summary?.appVersion ?? null },
      { key: "osVersion", label: "OS Version", value: summary?.osVersion ?? null },
      { key: "carrier", label: "Carrier", value: summary?.simOperator ?? null },
      { key: "logType", label: "Log Type", value: summary?.logType ?? null },
    ];

    const profileItems = profileCandidates.filter((item) => {
      const { value } = item;
      if (value == null) {
        return false;
      }
      if (typeof value === "string") {
        return value.length > 0 && value !== "-";
      }
      return true;
    });

    const waterfallMax = waterfallSteps.reduce(
      (acc, item) => Math.max(acc, item.start + item.duration),
      0,
    );
    const waterfallAxisMarks: number[] = [];
    if (waterfallMax > 0) {
      const tickSize = determineWaterfallTickSize(waterfallMax);
      for (let value = 0; value <= waterfallMax; value += tickSize) {
        waterfallAxisMarks.push(Math.min(value, waterfallMax));
      }
      if (waterfallAxisMarks[waterfallAxisMarks.length - 1] !== waterfallMax) {
        waterfallAxisMarks.push(waterfallMax);
      }
    }
    const waterfallMaxSafe = waterfallMax > 0 ? waterfallMax : 1;

    const hasRightPane =
      profileItems.length > 0 || vitals.length > 0 || waterfallSteps.length > 0 || timeline.length > 0 || detailLoading;

    const renderVitalValue = (metric: MetricKey, value: number) => {
      if (metric === "CLS") {
        return value.toFixed(3);
      }
      return `${Math.round(value)} ms`;
    };

    return (
      <div className="pa_modal_backdrop" role="presentation" onClick={closeDetail}>
        <div
          className="pa_popup_container maxy_popup_common"
          id="logDetail__popup"
          aria-labelledby="pa_popup_title"
          aria-modal="true"
          role="dialog"
          tabIndex={-1}
          onClick={(event) => event.stopPropagation()}
        >
          <div className={`pa_popup_layout ${hasRightPane ? "" : "single-column"}`}>
            <div className="maxy_popup_grid_s_wrap">
              <div className="maxy_popup_title_wrap">
                <div className="maxy_popup_title_left">
                  <span className="title" id="pa_popup_title">
                    {summary?.title ?? "Profiling"}
                  </span>
                  <span className="popup_count">({formatCount(totalCount)})</span>
                  <div className="sub_title_wrap">
                    {metaChips.map(({ key, value, icon }) => (
                      <span key={key} className="sub_title">
                        {icon && <i className={icon} />}
                        <span>{value}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="maxy_popup_sub_title">
                <div className="sub_title_left">
                  <span className="desc" id="pAliasValue">
                    {aliasText ?? "공지사항 상세"}
                  </span>
                  <span className="url" id="pReqUrl">
                    {reqUrlText}
                  </span>
                  <button type="button" className="btn_alias" aria-label="페이지 별칭 변경" />
                </div>
              </div>
              <div className="pa_popup_table_wrap">
                {detailLoading ? (
                  <p className="pa_state_text">상세 정보를 불러오는 중입니다…</p>
                ) : detailError ? (
                  <p className="pa_state_text pa_state_error">{detailError}</p>
                ) : (
                  <table className="pa_popup_table pa_table_sortable">
                    <thead>
                      <tr>
                        {(
                          [
                            { key: "loadingTime", label: "Loading Time" },
                            { key: "feeldex", label: "Feeldex" },
                            { key: "deviceId", label: "Device ID" },
                            { key: "userId", label: "User ID" },
                            { key: "timestamp", label: "Timestamp" },
                            { key: "networkStatus", label: "Network" },
                            { key: "lcp", label: "LCP" },
                            { key: "fcp", label: "FCP" },
                            { key: "inp", label: "INP" },
                            { key: "cls", label: "CLS" },
                          ] as const
                        ).map((column) => (
                          <th
                            key={column.key}
                            className={`sortable ${detailSortState.key === column.key ? "active" : ""}`}
                            data-sort-direction={detailSortState.key === column.key ? detailSortState.direction : undefined}
                            role="button"
                            tabIndex={0}
                            onClick={() => handleDetailSort(column.key)}
                            onKeyDown={(event) => handleDetailHeaderKeyDown(column.key, event)}
                            aria-sort={
                              detailSortState.key === column.key
                                ? detailSortState.direction === "asc"
                                  ? "ascending"
                                  : "descending"
                                : "none"
                            }
                          >
                            {column.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedDetailRows.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="pa_table_empty">
                            상세 데이터가 없습니다.
                          </td>
                        </tr>
                      ) : (
                        sortedDetailRows.map((row) => (
                          <tr
                            key={row.id}
                            className={`pa_popup_table_row ${
                              row.wtfFlag === false && selectedDetailRow?.id !== row.id ? "row-muted" : ""
                            } ${selectedDetailRow?.id === row.id ? "selected" : ""}`}
                            onClick={() => handleSelectDetailRow(row)}
                            tabIndex={0}
                            role="button"
                            aria-selected={selectedDetailRow?.id === row.id}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                handleSelectDetailRow(row);
                              }
                            }}
                          >
                            <td>{formatDuration(row.loadingTime)}</td>
                            <td>{renderFeeldex(row.feeldex)}</td>
                            <td>{row.deviceId ?? "-"}</td>
                            <td>{row.userId ?? "-"}</td>
                            <td>{new Date(row.timestamp).toLocaleString()}</td>
                            <td>{row.networkStatus ?? "-"}</td>
                            {(["LCP", "FCP", "INP", "CLS"] as const).map((metric) => {
                              let rawValue: number | undefined;
                              switch (metric) {
                                case "LCP":
                                  rawValue = row.lcp ?? undefined;
                                  break;
                                case "FCP":
                                  rawValue = row.fcp ?? undefined;
                                  break;
                                case "INP":
                                  rawValue = row.inp ?? undefined;
                                  break;
                                case "CLS":
                                  rawValue = row.cls ?? undefined;
                                  break;
                                default:
                                  rawValue = undefined;
                              }
                              const status = getMetricStatus(metric, rawValue);
                              const displayValue =
                                rawValue == null ? "-" : renderVitalValue(metric, rawValue);
                              return (
                                <td key={`${row.id}-${metric}`}>
                                  <span className={`pa_chip status-${status}`}>{displayValue}</span>
                                </td>
                              );
                            })}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
            {hasRightPane ? (
              <aside className="maxy_popup_gray_bg_wrap popup_right_side_wrap" aria-label="상세 인사이트 패널">
                <section className="popup_panel popup_profile_panel">
                  <h3>Profile</h3>
                  {detailLoading && profileItems.length === 0 ? (
                    <p className="pa_state_text">프로필 정보를 불러오는 중입니다…</p>
                  ) : profileItems.length === 0 ? (
                    <p className="pa_state_text">표시할 프로필 정보가 없습니다.</p>
                  ) : (
                    <dl className="popup_profile_list">
                      {profileItems.map((item) => (
                        <div key={item.key} className="popup_profile_item">
                          <dt>{item.label}</dt>
                          <dd>{item.value}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </section>

                <section className="popup_panel popup_vital_panel">
                  <h3>Core Web Vitals</h3>
                  {detailLoading ? (
                    <p className="pa_state_text">지표를 불러오는 중입니다…</p>
                  ) : vitals.length === 0 ? (
                    <p className="pa_state_text">지표 데이터가 없습니다.</p>
                  ) : (
                    <ul className="popup_vital_list">
                      {vitals.map((entry) => {
                        const metricKey = entry.metric as MetricKey;
                        return (
                          <li key={entry.metric}>
                            <span className="metric">{entry.metric}</span>
                            <span className={`value status-${entry.status}`}>
                              {entry.metric === "CLS"
                                ? entry.value.toFixed(3)
                                : `${Math.round(entry.value)} ${entry.unit || "ms"}`}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>

                <section className="popup_panel popup_waterfall_panel">
                  <h3>Waterfall</h3>
                  {detailLoading ? (
                    <p className="pa_state_text">워터폴을 불러오는 중입니다…</p>
                  ) : waterfallSteps.length === 0 ? (
                    <p className="pa_state_text">워터폴 데이터가 없습니다.</p>
                  ) : (
                    <div className="pa_waterfall_inline">
                      <div className="pa_waterfall_inline_inner">
                        <div className="pa_waterfall_summary">
                          <span className="pa_waterfall_summary_item">
                            <span>요청 URL</span>
                            <strong title={reqUrlText}>{reqUrlText}</strong>
                          </span>
                          <span className="pa_waterfall_summary_item">
                            <span>수집 로그</span>
                            <strong>{formatCount(totalCount)}</strong>
                          </span>
                        </div>
                        <div className="pa_waterfall_timeline">
                          <div className="pa_waterfall_axis">
                            {waterfallAxisMarks.map((mark) => (
                              <span
                                key={mark}
                                className="pa_waterfall_axis_mark"
                                data-label={formatWaterfallAxisLabel(mark)}
                                style={{ left: `${(mark / waterfallMaxSafe) * 100}%` }}
                              />
                            ))}
                          </div>
                          <ul className="pa_waterfall_rows">
                            {waterfallSteps.map((step) => {
                              const startPercent = Math.max(0, Math.min((step.start / waterfallMaxSafe) * 100, 100));
                              const widthPercent = Math.max(
                                1.5,
                                Math.min((step.duration / waterfallMaxSafe) * 100, 100 - startPercent),
                              );
                              return (
                                <li key={`${step.name}-${step.start}`} className="pa_waterfall_row">
                                  <div className="pa_waterfall_row_info">
                                    <strong>{step.name}</strong>
                                    <span>{`+${formatDetailDuration(step.start)} • ${formatDetailDuration(step.duration)}`}</span>
                                  </div>
                                  <div className="pa_waterfall_row_bar">
                                    <span
                                      className="pa_waterfall_row_fill"
                                      style={{ left: `${startPercent}%`, width: `${widthPercent}%` }}
                                    />
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </section>

                <section className="popup_panel popup_timeline_panel">
                  <h3>Event Timeline</h3>
                  {detailLoading ? (
                    <p className="pa_state_text">타임라인을 불러오는 중입니다…</p>
                  ) : timeline.length === 0 ? (
                    <p className="pa_state_text">타임라인 정보가 없습니다.</p>
                  ) : (
                    <ul className="popup_timeline_list">
                      {timeline.map((event) => (
                        <li key={`${event.label}-${event.timestamp}`}>
                          <div className="time">{new Date(event.timestamp).toLocaleString()}</div>
                          <div className="label">{event.label}</div>
                          <div className="detail">{event.detail}</div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </aside>
            ) : null}
            <WaterfallPanel
              open={isWaterfallOpen && Boolean(selectedDetailRow)}
              onOpen={() => setIsWaterfallOpen(true)}
              onClose={() => setIsWaterfallOpen(false)}
              row={selectedDetailRow}
              steps={detailData?.waterfall ?? []}
              loading={detailLoading}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderMetricChart = (metric: MetricKey) => {
    const config = METRIC_CONFIG[metric];
    const data = lineSeries[metric];
    const areaClass = CHART_AREAS[metric];
    const groupTitle = METRIC_CONFIG[metric].group;
    return (
      <div key={metric} className={`pa_small_chart pa_chart_cell ${areaClass}`}>
        <div className="pa_small_chart_header">
          <div className="pa_small_header_left">
            <span className="metric-name">{metric}</span>
            <span className="metric-desc">{config.description}</span>
          </div>
          <span className="pa_chart_group_title">{groupTitle}</span>
        </div>
        {data.length === 0 ? (
          <p className="pa_state_text">데이터가 없습니다.</p>
        ) : (
          <div className="pa_small_chart_body">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="timestamp"
                  type="number"
                  domain={["dataMin", "dataMax"]}
                  tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                />
                <YAxis tickFormatter={config.chartTickFormatter} />
                <Tooltip
                  labelFormatter={(value) => new Date(value as number).toLocaleString()}
                  formatter={(value: number) => [config.chartTooltipFormatter(value), metric]}
                />
                <Line type="monotone" dataKey="value" stroke={config.color} dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    );
  };

  return (
    <section>
      <div className="top_title" data-t="common.text.pageAnalysis">
        Page 분석
      </div>

      <div className="pa_core_container">
        <div className="pa_core_grid">
          <section className="pa_section pa_core_summary">
            <header className="pa_core_header">
              <div>
                <h2 className="pa_core_title">Core Vital</h2>
                <p className="pa_core_subtitle">페이지 품질 핵심 지표</p>
              </div>
              <div className="pa_core_meta">
                <div className="pa_core_legend">
                  {statusLegend.map(({ status, label }) => (
                    <span key={status}>
                      <span className={`status-dot ${status}`} />
                      {label}
                    </span>
                  ))}
                </div>
                <span className="pa_section_range">{rangeText}</span>
              </div>
            </header>

            {loading && <p className="pa_state_text">Loading metrics…</p>}
            {error && <p className="pa_state_text pa_state_error">{error}</p>}

            {coreVital && (
              <ul className="pa_metric_list">
                {coreMetricSummaries.map(({ metric, value, status, config, segments, markerPercent }) => (
                  <li key={metric} className="pa_metric_item">
                    <div className="pa_metric_top">
                      <div className="pa_metric_text">
                        <span className={`pa_metric_badge status-${status}`}>{metric}</span>
                        <div className="pa_metric_labels">
                          <div className="pa_metric_label">{config.label}</div>
                          <div className="pa_metric_desc">{config.description}</div>
                        </div>
                      </div>
                      <div className="pa_metric_avg">
                        <span>Avg.</span>
                        <strong>{formatAverageValue(metric, value)}</strong>
                      </div>
                    </div>
                    <div className="pa_metric_bar">
                      {segments.map((segment, index) => (
                        <div
                          key={`${metric}-${segment.className}-${index}`}
                          className={`pa_metric_segment ${segment.className}`}
                          style={{ width: `${segment.width}%` }}
                        >
                          {segment.label}
                        </div>
                      ))}
                      {markerPercent !== null && (
                        <span className={`pa_metric_marker status-${status}`} style={{ left: `${markerPercent}%` }} />
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {(["LCP", "FCP", "INP", "CLS"] as MetricKey[]).map(renderMetricChart)}
        </div>

        <section className="pa_section pa_core_table">
          <header className="pa_core_table_header">
            <h3 className="pa_core_table_title">Page Vital List</h3>
            <span className="pa_section_range">{rangeText}</span>
          </header>

          {loading && <p className="pa_state_text">Loading page vitals…</p>}
          {error && <p className="pa_state_text pa_state_error">{error}</p>}

          <div className="pa_table_scroll">
            <table className="pa_table pa_table_sortable">
              <thead>
                <tr>
                  <th
                    className={`sortable ${sortState.key === "reqUrl" ? "active" : ""}`}
                    data-sort-direction={sortState.key === "reqUrl" ? sortState.direction : undefined}
                    role="button"
                    onClick={() => handleSort("reqUrl")}
                    aria-sort={getAriaSort("reqUrl")}
                    tabIndex={0}
                    onKeyDown={(event) => handleHeaderKeyDown("reqUrl", event)}
                  >
                    Page URL
                  </th>
                  <th
                    className={`sortable ${sortState.key === "count" ? "active" : ""}`}
                    data-sort-direction={sortState.key === "count" ? sortState.direction : undefined}
                    role="button"
                    onClick={() => handleSort("count")}
                    aria-sort={getAriaSort("count")}
                    tabIndex={0}
                    onKeyDown={(event) => handleHeaderKeyDown("count", event)}
                  >
                    Count
                  </th>
                  <th
                    className={`sortable ${sortState.key === "loadingAvg" ? "active" : ""}`}
                    data-sort-direction={sortState.key === "loadingAvg" ? sortState.direction : undefined}
                    role="button"
                    onClick={() => handleSort("loadingAvg")}
                    aria-sort={getAriaSort("loadingAvg")}
                    tabIndex={0}
                    onKeyDown={(event) => handleHeaderKeyDown("loadingAvg", event)}
                  >
                    Loading (Avg.)
                  </th>
                  <th
                    className={`sortable ${sortState.key === "lcp" ? "active" : ""}`}
                    data-sort-direction={sortState.key === "lcp" ? sortState.direction : undefined}
                    role="button"
                    onClick={() => handleSort("lcp")}
                    aria-sort={getAriaSort("lcp")}
                    tabIndex={0}
                    onKeyDown={(event) => handleHeaderKeyDown("lcp", event)}
                  >
                    LCP
                  </th>
                  <th
                    className={`sortable ${sortState.key === "fcp" ? "active" : ""}`}
                    data-sort-direction={sortState.key === "fcp" ? sortState.direction : undefined}
                    role="button"
                    onClick={() => handleSort("fcp")}
                    aria-sort={getAriaSort("fcp")}
                    tabIndex={0}
                    onKeyDown={(event) => handleHeaderKeyDown("fcp", event)}
                  >
                    FCP
                  </th>
                  <th
                    className={`sortable ${sortState.key === "inp" ? "active" : ""}`}
                    data-sort-direction={sortState.key === "inp" ? sortState.direction : undefined}
                    role="button"
                    onClick={() => handleSort("inp")}
                    aria-sort={getAriaSort("inp")}
                    tabIndex={0}
                    onKeyDown={(event) => handleHeaderKeyDown("inp", event)}
                  >
                    INP
                  </th>
                  <th
                    className={`sortable ${sortState.key === "cls" ? "active" : ""}`}
                    data-sort-direction={sortState.key === "cls" ? sortState.direction : undefined}
                    role="button"
                    onClick={() => handleSort("cls")}
                    aria-sort={getAriaSort("cls")}
                    tabIndex={0}
                    onKeyDown={(event) => handleHeaderKeyDown("cls", event)}
                  >
                    CLS
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedVitalList.map((item) => (
                  <tr
                    key={item.mxPageId}
                    className={`pa_table_row ${detailTarget?.mxPageId === item.mxPageId ? "active" : ""}`}
                    onClick={() => setDetailTarget(item)}
                  >
                    <td className="pa_table_url">{item.reqUrl ?? "-"}</td>
                    <td>{formatCount(item.count)}</td>
                    <td>{formatDuration(item.loadingAvg)}</td>
                    {CORE_METRICS.map((metric) => {
                      const rawValue = getMetricValueFromItem(metric, item);
                      const status = getMetricStatus(metric, rawValue);
                      return (
                        <td key={metric}>
                          <span className={`pa_chip status-${status}`}>{formatTableValue(metric, rawValue)}</span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {vitalList.length === 0 && !loading && (
                  <tr>
                    <td colSpan={7} className="pa_table_empty">
                      데이터가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      {renderDetailPopup()}
    </section>
  );
}
