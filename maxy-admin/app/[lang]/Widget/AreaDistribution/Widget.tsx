"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { useUserSettings } from "../../../../components/usersettings/UserSettingsProvider";
import { AppList, type ApplicationSummary } from "../../../api/AppList";
import {
  getAreaDistributionMapData,
  getAreaDistributionDetailList,
  type AreaDistributionDateType,
  type AreaDistributionMetricKey,
  type AreaDistributionSummary,
  type AreaDistributionDetailRow,
} from "../../../api/Widget/AreaDistribution";
import { useTheme } from "../../../../components/theme/ThemeProvider";

import "./style.css";

const REFRESH_INTERVAL_MS = 30_000;
const VIEWBOX_WIDTH = 800;
const VIEWBOX_HEIGHT = 620;

type MetricOption = {
  key: AreaDistributionMetricKey;
  label: string;
  minColor: string;
  maxColor: string;
  accent: string;
};

const LIGHT_METRIC_OPTIONS: MetricOption[] = [
  {
    key: "dau",
    label: "User",
    minColor: "#E0E4FF",
    maxColor: "#0829FF",
    accent: "#1f3fff",
  },
  {
    key: "error",
    label: "Error",
    minColor: "#F0ECDF",
    maxColor: "#FFAE00",
    accent: "#d97706",
  },
  {
    key: "crash",
    label: "Crash",
    minColor: "#EDE0E0",
    maxColor: "#FF4646",
    accent: "#ef4444",
  },
];

const DARK_METRIC_OPTIONS: MetricOption[] = [
  {
    key: "dau",
    label: "User",
    minColor: "#1e293b",
    maxColor: "#38bdf8",
    accent: "#60a5fa",
  },
  {
    key: "error",
    label: "Error",
    minColor: "#312714",
    maxColor: "#facc15",
    accent: "#eab308",
  },
  {
    key: "crash",
    label: "Crash",
    minColor: "#3b1c1f",
    maxColor: "#f87171",
    accent: "#fb7185",
  },
];

const numberFormatter = new Intl.NumberFormat("ko-KR");
const detailDateTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

const DETAIL_TYPE_LABELS: Record<"TOTAL" | "ERROR" | "CRASH", string> = {
  TOTAL: "전체",
  ERROR: "오류",
  CRASH: "크래시",
};

const DETAIL_TYPE_DESCRIPTIONS: Record<"TOTAL" | "ERROR" | "CRASH", string> = {
  TOTAL: "전체 사용자 로그에 대한 요약입니다.",
  ERROR: "오류 로그를 중심으로 한 상세 내역입니다.",
  CRASH: "크래시 로그에 대한 상세 내역입니다.",
};

const REGION_NAME_OVERRIDES: Record<string, string> = {
  "kr-so": "서울특별시",
  "kr-kg": "경기도",
  "kr-in": "인천광역시",
  "kr-pu": "부산광역시",
  "kr-tg": "대구광역시",
  "kr-ul": "울산광역시",
  "kr-tj": "대전광역시",
  "kr-kj": "광주광역시",
  "kr-sj": "세종특별자치시",
  "kr-kw": "강원특별자치도",
  "kr-gb": "충청북도",
  "kr-gn": "충청남도",
  "kr-cb": "전라북도",
  "kr-2685": "전라남도",
  "kr-2688": "경상북도",
  "kr-kn": "경상남도",
  "kr-cj": "제주특별자치도",
};

function formatDetailTimestamp(timestamp: number): string {
  if (!Number.isFinite(timestamp)) {
    return "-";
  }
  return detailDateTimeFormatter.format(new Date(timestamp));
}
type HoverInfo = {
  code: string;
  name: string;
  metrics: {
    dau: number;
    error: number;
    crash: number;
  };
  value: number;
  x: number;
  y: number;
  containerWidth: number;
  containerHeight: number;
};

type Bounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

type RawPolygon = {
  rings: Array<Array<[number, number]>>;
};

type RawShape = {
  code: string;
  name: string;
  polygons: RawPolygon[];
};

type MapGeometry = {
  shapes: RawShape[];
  bounds: Bounds;
};

type DetailState = {
  rows: AreaDistributionDetailRow[];
  next: number;
  hasMore: boolean;
  requestType: "TOTAL" | "ERROR" | "CRASH";
};

type ProjectedPolygon = {
  rings: Array<Array<[number, number]>>;
  path: string;
};

type ProjectedShape = {
  code: string;
  name: string;
  polygons: ProjectedPolygon[];
};

type ProjectedGeometry = {
  shapes: ProjectedShape[];
  width: number;
  height: number;
};

type Topology = {
  arcs: number[][][];
  transform?: {
    scale: [number, number];
    translate: [number, number];
  };
  objects: {
    [key: string]: {
      type: "GeometryCollection";
      geometries: Array<{
        type: "Polygon" | "MultiPolygon";
        arcs: number[][] | number[][][];
        id?: string;
        properties?: Record<string, unknown>;
      }>;
    };
  };
};

function parseNumeric(value: string | number | null | undefined): number {
  if (value == null) {
    return 0;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function normaliseOsTypeForApi(value: string | null | undefined): "all" | "Android" | "iOS" {
  if (!value || value === "A") {
    return "all";
  }
  const lower = value.toLowerCase();
  if (lower === "all") {
    return "all";
  }
  if (lower.startsWith("android")) {
    return "Android";
  }
  if (lower.startsWith("ios")) {
    return "iOS";
  }
  return value as "Android" | "iOS";
}

function hexToRgb(hex: string): [number, number, number] {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!match) {
    return [0, 0, 0];
  }
  const value = parseInt(match[1], 16);
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  const clamp = (component: number) => Math.max(0, Math.min(255, Math.round(component)));
  return `#${((1 << 24) + (clamp(r) << 16) + (clamp(g) << 8) + clamp(b)).toString(16).slice(1)}`;
}

function interpolateColor(minColor: string, maxColor: string, ratio: number): string {
  const safeRatio = Number.isFinite(ratio) ? Math.max(0, Math.min(1, ratio)) : 0;
  const start = hexToRgb(minColor);
  const end = hexToRgb(maxColor);
  const blended: [number, number, number] = [
    start[0] + (end[0] - start[0]) * safeRatio,
    start[1] + (end[1] - start[1]) * safeRatio,
    start[2] + (end[2] - start[2]) * safeRatio,
  ];
  return rgbToHex(blended);
}

function computeBoundsFallback(): Bounds {
  return {
    minX: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
  };
}

function decodeArcs(topology: Topology): Array<Array<[number, number]>> {
  const { arcs } = topology;
  const scale = topology.transform?.scale ?? [1, 1];
  const translate = topology.transform?.translate ?? [0, 0];

  return arcs.map((arc) => {
    let x = 0;
    let y = 0;
    return arc.map(([dx, dy]) => {
      x += dx;
      y += dy;
      return [x * scale[0] + translate[0], y * scale[1] + translate[1]] as [number, number];
    });
  });
}

function extractArc(coordinates: Array<Array<[number, number]>>, index: number): Array<[number, number]> {
  const arcIndex = index >= 0 ? index : ~index;
  const arc = coordinates[arcIndex];
  if (!arc) {
    return [];
  }
  const points = arc.map(([x, y]) => [x, y] as [number, number]);
  if (index >= 0) {
    return points;
  }
  return points.reverse();
}

function topologyToGeometry(topology: Topology): MapGeometry {
  const decodedArcs = decodeArcs(topology);
  const shapes: RawShape[] = [];
  const bounds = computeBoundsFallback();

  const collection =
    topology.objects?.default ??
    Object.values(topology.objects ?? {}).find((candidate) => candidate?.type === "GeometryCollection");

  if (!collection) {
    throw new Error("Unexpected topology structure");
  }

  collection.geometries.forEach((geometry) => {
    const properties = geometry.properties ?? {};
    const rawCode = (properties["hc-key"] ?? geometry.id ?? "").toString();
    if (!rawCode) {
      return;
    }
    const code = rawCode.toLowerCase();
    const defaultName =
      (properties.name ?? properties["woe-name"] ?? properties["hc-key"] ?? geometry.id ?? "Unknown") as string;
    const name = REGION_NAME_OVERRIDES[code] ?? defaultName;

    const polygonSets =
      geometry.type === "Polygon" ? [geometry.arcs as number[][]] : (geometry.arcs as number[][][]);

    const polygons: RawPolygon[] = polygonSets.map((polygonArcs) => {
      const rings = polygonArcs.map((ringArcs) => {
        const ring: Array<[number, number]> = [];
        ringArcs.forEach((arcIndex, arcPosition) => {
          const arcPoints = extractArc(decodedArcs, arcIndex);
          if (arcPosition > 0 && ring.length > 0) {
            ring.push(...arcPoints.slice(1));
          } else {
            ring.push(...arcPoints);
          }
        });
        ring.forEach(([x, y]) => {
          bounds.minX = Math.min(bounds.minX, x);
          bounds.maxX = Math.max(bounds.maxX, x);
          bounds.minY = Math.min(bounds.minY, y);
          bounds.maxY = Math.max(bounds.maxY, y);
        });
        return ring;
      });
      return { rings };
    });

    shapes.push({ code, name, polygons });
  });

  if (!Number.isFinite(bounds.minX)) {
    return { shapes: [], bounds: { minX: 0, maxX: 1, minY: 0, maxY: 1 } };
  }

  return { shapes, bounds };
}

function ringsToPath(rings: Array<Array<[number, number]>>): string {
  return rings
    .filter((ring) => ring.length > 0)
    .map((ring) => {
      const commands = ring.map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`);
      return `${commands.join(" ")} Z`;
    })
    .join(" ");
}

function computeCentroid(rings: Array<Array<[number, number]>>, fallback: [number, number]): [number, number] {
  if (!rings.length || !rings[0]?.length) {
    return fallback;
  }
  const ring = rings[0];
  const [sumX, sumY] = ring.reduce<[number, number]>(
    (acc, [x, y]) => [acc[0] + x, acc[1] + y],
    [0, 0],
  );
  const count = ring.length || 1;
  return [sumX / count, sumY / count];
}

function projectGeometry(geometry: MapGeometry, width: number, height: number): ProjectedGeometry {
  const spanX = geometry.bounds.maxX - geometry.bounds.minX || 1;
  const spanY = geometry.bounds.maxY - geometry.bounds.minY || 1;
  const scale = Math.min(width / spanX, height / spanY);
  const offsetX = (width - spanX * scale) / 2;
  const offsetY = (height - spanY * scale) / 2;

  const shapes: ProjectedShape[] = geometry.shapes.map((shape) => {
    const polygons: ProjectedPolygon[] = shape.polygons.map((polygon) => {
      const projectedRings = polygon.rings.map((ring) =>
        ring.map(([lon, lat]) => {
          const x = (lon - geometry.bounds.minX) * scale + offsetX;
          const y = height - ((lat - geometry.bounds.minY) * scale + offsetY);
          return [x, y] as [number, number];
        }),
      );
      return {
        rings: projectedRings,
        path: ringsToPath(projectedRings),
      };
    });

    return {
      code: shape.code,
      name: shape.name,
      polygons,
    };
  });

  return {
    shapes,
    width,
    height,
  };
}

function computeFillColor(
  value: number,
  maxValue: number,
  option: MetricOption,
): string {
  if (!Number.isFinite(value) || value <= 0 || maxValue <= 0) {
    return "rgba(148, 163, 184, 0.35)";
  }
  const ratio = Math.pow(Math.max(0, Math.min(1, value / maxValue)), 0.6);
  return interpolateColor(option.minColor, option.maxColor, ratio);
}

export default function AreaDistributionWidget() {
  const {
    applicationId: storedApplicationId,
    userNo: storedUserNo,
    osType: storedOsType,
    tmzutc,
  } = useUserSettings();
  const { theme } = useTheme();
  const isDarkMode = theme === "dark";
  const metricOptions = useMemo(
    () => (isDarkMode ? DARK_METRIC_OPTIONS : LIGHT_METRIC_OPTIONS),
    [isDarkMode],
  );

  const preferredApplicationId = useMemo(
    () => parseNumeric(storedApplicationId),
    [storedApplicationId],
  );
  const userNo = useMemo(() => parseNumeric(storedUserNo), [storedUserNo]);

  const [applications, setApplications] = useState<ApplicationSummary[] | null>(null);
  const [resolvedApplicationId, setResolvedApplicationId] = useState<number>(
    preferredApplicationId > 0 ? preferredApplicationId : 0,
  );
  const [isResolvingApp, setIsResolvingApp] = useState(false);
  const [appResolveError, setAppResolveError] = useState<string | null>(null);

  const [dateType] = useState<AreaDistributionDateType>("DAY");
  const [activeMetric, setActiveMetric] = useState<AreaDistributionMetricKey>("dau");

  const [mapData, setMapData] = useState<AreaDistributionSummary | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [geometry, setGeometry] = useState<ProjectedGeometry | null>(null);
  const [geometryLoading, setGeometryLoading] = useState(true);
  const [geometryError, setGeometryError] = useState<string | null>(null);
  const [, setLastUpdated] = useState<number | null>(null);

  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);
  const [zoom, setZoom] = useState(1);
  const [detailState, setDetailState] = useState<DetailState | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const detailControllerRef = useRef<AbortController | null>(null);

  const [selectedRegion, setSelectedRegion] = useState<{
    code: string;
    name: string;
    metrics: { dau: number; error: number; crash: number };
    value: number;
  } | null>(null);

  useEffect(() => {
    if (!selectedRegion) {
      return undefined;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedRegion]);

  const appCacheRef = useRef<{ userNo: number; list: ApplicationSummary[] } | null>(null);
  const fetchControllerRef = useRef<AbortController | null>(null);
  const refreshTimerRef = useRef<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const activeApplication = useMemo(() => {
    if (!applications || resolvedApplicationId <= 0) {
      return null;
    }
    return (
      applications.find(
        (app) => Number(app.applicationId) === Number(resolvedApplicationId),
      ) ?? null
    );
  }, [applications, resolvedApplicationId]);

  const applicationIdentifier = useMemo(() => {
    const candidate = activeApplication?.applicationId ?? resolvedApplicationId;
    return Number(candidate) > 0 ? String(candidate) : "";
  }, [activeApplication, resolvedApplicationId]);

  const apiOsType = useMemo(() => normaliseOsTypeForApi(storedOsType), [storedOsType]);

  useEffect(() => {
    setSelectedRegion(null);
    setDetailState(null);
  }, [applicationIdentifier, apiOsType]);

  const currentDetailType: "TOTAL" | "ERROR" | "CRASH" = detailState?.requestType ?? "TOTAL";
  const currentRows = detailState?.rows ?? [];
  const hasMoreRows = detailState?.hasMore ?? false;

  const loadDetailList = useCallback(
    async (
      region: {
        code: string;
        name: string;
        metrics: { dau: number; error: number; crash: number };
        value: number;
      },
      requestType: "TOTAL" | "ERROR" | "CRASH",
      mode: "initial" | "more" = "initial",
    ) => {
      if (!region) {
        return;
      }
      if (detailControllerRef.current) {
        detailControllerRef.current.abort();
      }
      const controller = new AbortController();
      detailControllerRef.current = controller;
      if (mode === "initial") {
        setDetailLoading(true);
        setDetailError(null);
      }

      try {
        const result = await getAreaDistributionDetailList(
          {
            applicationId: applicationIdentifier,
            osType: apiOsType === "all" ? null : apiOsType,
            locationCode: region.code,
            requestType,
            next: mode === "more" ? detailState?.next ?? 0 : 0,
            size: 20,
            tmzutc: tmzutc,
          },
          controller.signal,
        );

        if (controller.signal.aborted) {
          return;
        }

        setDetailState((prev) => {
          if (mode === "more" && prev && prev.requestType === requestType && prev.rows.length > 0) {
            return {
              rows: [...prev.rows, ...result.rows],
              next: result.next,
              hasMore: result.hasMore,
              requestType,
            };
          }
          return {
            rows: result.rows,
            next: result.next,
            hasMore: result.hasMore,
            requestType,
          };
        });
        setDetailError(null);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        setDetailError(error instanceof Error ? error.message : "상세 데이터를 불러오지 못했습니다.");
      } finally {
        if (detailControllerRef.current === controller) {
          detailControllerRef.current = null;
        }
        if (mode === "initial") {
          setDetailLoading(false);
        }
      }
    },
    [applicationIdentifier, apiOsType, detailState, tmzutc],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadTopology() {
      setGeometryLoading(true);
      setGeometryError(null);
      try {
        const response = await fetch("/maps/kr-all.topo.json", { cache: "force-cache" });
        if (!response.ok) {
          throw new Error(`Topology request failed with status ${response.status}`);
        }
        const topology = (await response.json()) as Topology;
        if (cancelled) {
          return;
        }
        const parsed = projectGeometry(topologyToGeometry(topology), VIEWBOX_WIDTH, VIEWBOX_HEIGHT);
        setGeometry(parsed);
      } catch (error) {
        if (!cancelled) {
          setGeometry(null);
          setGeometryError(
            error instanceof Error ? error.message : "지도 리소스를 불러오지 못했습니다.",
          );
        }
      } finally {
        if (!cancelled) {
          setGeometryLoading(false);
        }
      }
    }

    loadTopology();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (userNo <= 0) {
      setApplications(null);
      setResolvedApplicationId(preferredApplicationId > 0 ? preferredApplicationId : 0);
      setAppResolveError("사용자 정보가 필요합니다.");
      return;
    }

    let cancelled = false;
    async function resolveApplications() {
      setIsResolvingApp(true);
      setAppResolveError(null);
      try {
        let list: ApplicationSummary[] | null = null;
        if (appCacheRef.current && appCacheRef.current.userNo === userNo) {
          list = appCacheRef.current.list;
        }
        if (!list) {
          const response = await AppList({ userNo, osType: "all" });
          if (cancelled) return;
          list = response.applicationList ?? [];
          appCacheRef.current = { userNo, list };
        }
        if (cancelled) return;
        setApplications(list);

        if (preferredApplicationId > 0) {
          setResolvedApplicationId(preferredApplicationId);
          setAppResolveError(null);
          return;
        }

        const fallback = list.find((item) => Number(item.applicationId) > 0) ?? null;
        if (fallback) {
          setResolvedApplicationId(Number(fallback.applicationId));
          setAppResolveError(null);
        } else {
          setResolvedApplicationId(0);
          setAppResolveError("사용 가능한 애플리케이션이 없습니다.");
        }
      } catch (err) {
        if (!cancelled) {
          setApplications(null);
          setResolvedApplicationId(preferredApplicationId > 0 ? preferredApplicationId : 0);
          setAppResolveError(
            err instanceof Error ? err.message : "애플리케이션 목록을 불러오지 못했습니다.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsResolvingApp(false);
        }
      }
    }

    resolveApplications();
    return () => {
      cancelled = true;
    };
  }, [userNo, preferredApplicationId]);

  useEffect(() => {
    if (preferredApplicationId > 0) {
      setResolvedApplicationId(preferredApplicationId);
      setAppResolveError(null);
    }
  }, [preferredApplicationId]);

  const fetchMapData = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (resolvedApplicationId <= 0 || !applicationIdentifier) {
        setMapData(null);
        setDataError("애플리케이션을 선택해주세요.");
        setLastUpdated(null);
        return;
      }

      if (mode === "initial") {
        setDataLoading(true);
      }
      setDataError(null);

      if (fetchControllerRef.current) {
        fetchControllerRef.current.abort();
      }
      const controller = new AbortController();
      fetchControllerRef.current = controller;

      try {
        const result = await getAreaDistributionMapData(
          {
            applicationId: applicationIdentifier,
            osType: apiOsType === "all" ? null : apiOsType,
            dateType,
            tmzutc: tmzutc,
          },
          controller.signal,
        );

        if (controller.signal.aborted) {
          return;
        }
        setMapData(result);
        setDataError(null);
        setLastUpdated(Date.now());
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        setMapData(null);
        setLastUpdated(null);
        setDataError(
          error instanceof Error ? error.message : "Area Distribution 데이터를 불러오지 못했습니다.",
        );
      } finally {
        if (fetchControllerRef.current === controller) {
          fetchControllerRef.current = null;
        }
        if (mode === "initial") {
          setDataLoading(false);
        }
      }
    },
    [resolvedApplicationId, applicationIdentifier, apiOsType, dateType, tmzutc],
  );

  useEffect(() => {
    fetchMapData("initial");
    return () => {
      if (fetchControllerRef.current) {
        fetchControllerRef.current.abort();
        fetchControllerRef.current = null;
      }
    };
  }, [fetchMapData]);

  useEffect(() => {
    if (refreshTimerRef.current != null) {
      window.clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    if (resolvedApplicationId <= 0 || !applicationIdentifier) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      void fetchMapData("refresh");
    }, REFRESH_INTERVAL_MS);
    refreshTimerRef.current = timer;
    return () => {
      window.clearInterval(timer);
      refreshTimerRef.current = null;
    };
  }, [fetchMapData, resolvedApplicationId]);

  const activeMetricOption = useMemo(
    () => metricOptions.find((option) => option.key === activeMetric) ?? metricOptions[0],
    [metricOptions, activeMetric],
  );

  const metricsByLocation = mapData?.byLocation ?? {};

  const maxMetricValue = useMemo(() => {
    let max = 0;
    Object.values(metricsByLocation).forEach((metrics) => {
      const value = Number((metrics as Record<AreaDistributionMetricKey, number>)[activeMetric] ?? 0);
      if (value > max) {
        max = value;
      }
    });
    return max;
  }, [metricsByLocation, activeMetric]);

  const shapesWithMetrics = useMemo(() => {
    if (!geometry) {
      return [];
    }
    return geometry.shapes.map((shape) => {
      const metrics = metricsByLocation[shape.code] as Record<AreaDistributionMetricKey, number> | undefined;
      const dau = Number(metrics?.dau ?? 0);
      const error = Number(metrics?.error ?? 0);
      const crash = Number(metrics?.crash ?? 0);
      const value = Number(metrics?.[activeMetric] ?? 0);

      return {
        code: shape.code,
        name: shape.name,
        polygons: shape.polygons,
        fill: computeFillColor(value, maxMetricValue, activeMetricOption),
        metrics: { dau, error, crash },
        value,
      };
    });
  }, [geometry, metricsByLocation, activeMetric, activeMetricOption, maxMetricValue]);

  const statusMessage = useMemo(() => {
    if (geometryLoading || dataLoading || isResolvingApp) {
      return "데이터를 불러오고 있습니다.";
    }
    if (appResolveError) {
      return appResolveError;
    }
    if (geometryError) {
      return geometryError;
    }
    if (dataError) {
      return dataError;
    }
    return null;
  }, [
    geometryLoading,
    dataLoading,
    isResolvingApp,
    appResolveError,
    geometryError,
    dataError,
    geometry,
    shapesWithMetrics.length,
  ]);

  const handlePointerLeave = useCallback(() => {
    setHoverInfo(null);
  }, []);

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<SVGGElement>, shapeCode: string, shapeName: string, metrics: HoverInfo["metrics"], value: number) => {
      if (!svgRef.current) {
        return;
      }
      const rect = svgRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      setHoverInfo({
        code: shapeCode,
        name: shapeName,
        metrics,
        value,
        x,
        y,
        containerWidth: rect.width,
        containerHeight: rect.height,
      });
    },
    [],
  );

  useEffect(() => {
    setHoverInfo(null);
    setZoom(1);
    if (detailControllerRef.current) {
      detailControllerRef.current.abort();
      detailControllerRef.current = null;
    }
    setSelectedRegion(null);
    setDetailState(null);
    setDetailError(null);
    setDetailLoading(false);
  }, [mapData, activeMetric]);

  return (
    <div className={`area-distribution-widget${isDarkMode ? " area-distribution-widget--dark" : ""}`}>
      <header className="area-distribution-widget__header">
        <div className="area-distribution-widget__title">
          <h4>Area Distribution</h4>
          <img
            src="/images/maxy/ic-question-grey-blue.svg"
            alt="도움말"
            className="area-distribution-widget__help"
          />
        </div>
      </header>

      <div className="area-distribution-widget__metric-toggle">
        {metricOptions.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => setActiveMetric(option.key)}
            className={`area-distribution-widget__metric-button${activeMetric === option.key ? " is-active" : ""}`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <section className="area-distribution-widget__map-panel">
        {statusMessage && (!geometry || shapesWithMetrics.length === 0) ? (
          <div className="area-distribution-widget__status">{statusMessage}</div>
        ) : (
          <>
            <div className="area-distribution-widget__map-wrapper">
              <svg
                ref={svgRef}
                className="area-distribution-widget__svg"
                viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
                role="img"
                aria-label="대한민국 지도"
              >
                <g
                  transform={`translate(${(geometry?.width ?? VIEWBOX_WIDTH) / 2}, ${(geometry?.height ?? VIEWBOX_HEIGHT) / 2}) scale(${zoom}) translate(-${(geometry?.width ?? VIEWBOX_WIDTH) / 2}, -${(geometry?.height ?? VIEWBOX_HEIGHT) / 2})`}
                >
                  {shapesWithMetrics.map((shape) => {
                    const isActive = hoverInfo?.code === shape.code;
                    const strokeColor = isActive ? activeMetricOption.accent : "rgba(15, 23, 42, 0.28)";
                    const strokeWidth = isActive ? 2.1 : 1.05;
                    return (
                      <g
                        key={shape.code}
                        className="area-distribution-widget__region"
                        onPointerMove={(event) =>
                          handlePointerMove(event, shape.code, shape.name, shape.metrics, shape.value)}
                        onPointerLeave={handlePointerLeave}
                        onClick={() => {
                          const region = {
                            code: shape.code,
                            name: shape.name,
                            metrics: shape.metrics,
                            value: shape.value,
                          };
                          setSelectedRegion(region);
                          setDetailState(null);
                          void loadDetailList(region, "TOTAL", "initial");
                        }}
                      >
                        {shape.polygons.map((polygon, index) => (
                          <path
                            key={`${shape.code}-${index}`}
                            d={polygon.path}
                            fill={shape.fill}
                            stroke={strokeColor}
                            strokeWidth={strokeWidth}
                            vectorEffect="non-scaling-stroke"
                          />
                        ))}
                      </g>
                    );
                  })}
                </g>
              </svg>
              {hoverInfo && (
                <div
                  className="area-distribution-widget__tooltip"
                  style={{
                    left: Math.min(
                      hoverInfo.containerWidth - 10,
                      Math.max(0, hoverInfo.x + 14),
                    ),
                    top: Math.min(
                      hoverInfo.containerHeight - 10,
                      Math.max(0, hoverInfo.y + 14),
                    ),
                  }}
                >
                  <div className="area-distribution-widget__tooltip-title">{hoverInfo.name}</div>
                  <div className="area-distribution-widget__tooltip-row">
                    <span className="area-distribution-widget__tooltip-key">User</span>
                    <span className="area-distribution-widget__tooltip-value">
                      {numberFormatter.format(Math.round(hoverInfo.metrics.dau))}
                    </span>
                  </div>
                  <div className="area-distribution-widget__tooltip-row">
                    <span className="area-distribution-widget__tooltip-key">Error</span>
                    <span className="area-distribution-widget__tooltip-value">
                      {numberFormatter.format(Math.round(hoverInfo.metrics.error))}
                    </span>
                  </div>
                  <div className="area-distribution-widget__tooltip-row">
                    <span className="area-distribution-widget__tooltip-key">Crash</span>
                    <span className="area-distribution-widget__tooltip-value">
                      {numberFormatter.format(Math.round(hoverInfo.metrics.crash))}
                    </span>
                  </div>
                </div>
              )}
              <div className="area-distribution-widget__zoom">
                <button
                  type="button"
                  onClick={() => setZoom((value) => Math.min(2.4, Math.round((value + 0.2) * 100) / 100))}
                  disabled={zoom >= 2.4}
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => setZoom((value) => Math.max(0.8, Math.round((value - 0.2) * 100) / 100))}
                  disabled={zoom <= 0.8}
                >
                  −
                </button>
              </div>
              {selectedRegion && (
                <>
                  <button
                    type="button"
                    className="area-distribution-widget__overlay"
                    onClick={() => {
                      if (detailControllerRef.current) {
                        detailControllerRef.current.abort();
                        detailControllerRef.current = null;
                      }
                      setSelectedRegion(null);
                      setDetailState(null);
                      setDetailError(null);
                      setDetailLoading(false);
                    }}
                    aria-label="상세 팝업 닫기"
                  />
                  <div
                    className="area-distribution-widget__modal"
                    role="dialog"
                    aria-modal="true"
                    aria-label={`${selectedRegion.name} 상세 정보`}
                  >
                    <div className="area-distribution-widget__modal-header">
                      <div className="area-distribution-widget__modal-heading">
                        <span className="area-distribution-widget__modal-code">{selectedRegion.code.toUpperCase()}</span>
                        <h5>{selectedRegion.name}</h5>
                        <p>{DETAIL_TYPE_DESCRIPTIONS[currentDetailType]}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (detailControllerRef.current) {
                            detailControllerRef.current.abort();
                            detailControllerRef.current = null;
                          }
                          setSelectedRegion(null);
                          setDetailState(null);
                          setDetailError(null);
                          setDetailLoading(false);
                        }}
                        aria-label="닫기"
                      >
                        ×
                      </button>
                    </div>
                    <div className="area-distribution-widget__modal-metrics">
                      {[
                        {
                          key: "user",
                          label: "User",
                          value: selectedRegion.metrics.dau,
                          sub: "전체 사용자 수",
                          tone: "user",
                        },
                        {
                          key: "error",
                          label: "Error",
                          value: selectedRegion.metrics.error,
                          sub: "오류 발생 수",
                          tone: "error",
                        },
                        {
                          key: "crash",
                          label: "Crash",
                          value: selectedRegion.metrics.crash,
                          sub: "크래시 발생 수",
                          tone: "crash",
                        },
                      ].map((metric) => (
                        <div
                          key={metric.key}
                          className={`area-distribution-widget__modal-metric-card area-distribution-widget__modal-metric-card--${metric.tone}`}
                        >
                          <span className="area-distribution-widget__modal-metric-label">{metric.label}</span>
                          <strong className="area-distribution-widget__modal-metric-value">
                            {numberFormatter.format(metric.value)}
                          </strong>
                          <span className="area-distribution-widget__modal-metric-sub">{metric.sub}</span>
                        </div>
                      ))}
                    </div>
                    <div className="area-distribution-widget__modal-tabs">
                      {(["TOTAL", "ERROR", "CRASH"] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => {
                            setDetailState((prev) =>
                              prev && prev.requestType === type
                                ? prev
                                : {
                                    rows: [],
                                    next: 0,
                                    hasMore: false,
                                    requestType: type,
                                  },
                            );
                            void loadDetailList(selectedRegion, type, "initial");
                          }}
                          className={`area-distribution-widget__modal-tab${
                            currentDetailType === type ? " is-active" : ""
                          }`}
                        >
                          {DETAIL_TYPE_LABELS[type]}
                        </button>
                      ))}
                    </div>
                    <div className="area-distribution-widget__modal-table">
                      {detailLoading ? (
                        <div className="area-distribution-widget__modal-status">데이터를 불러오는 중입니다...</div>
                      ) : detailError ? (
                        <div className="area-distribution-widget__modal-status">{detailError}</div>
                      ) : (
                        <div className="area-distribution-widget__modal-scroll">
                          <table>
                            <thead>
                              <tr>
                                <th>시간</th>
                                <th>Device ID</th>
                                <th>User</th>
                                <th>Type</th>
                                <th>Version</th>
                              </tr>
                            </thead>
                            <tbody>
                              {currentRows.map((row) => (
                                <tr key={row.docId}>
                                  <td>{formatDetailTimestamp(row.logTm)}</td>
                                  <td>{row.deviceId}</td>
                                  <td>{row.userId}</td>
                                  <td>{row.logType}</td>
                                  <td>{row.appVer}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                    <div className="area-distribution-widget__modal-footer">
                      <span className="area-distribution-widget__modal-footnote">
                        {DETAIL_TYPE_LABELS[currentDetailType]}
                        {" "}
                        로그
                        {currentRows.length > 0 ? ` ${currentRows.length.toLocaleString()}건` : ""}
                        을(를) 표시합니다.
                      </span>
                      {detailLoading ? (
                        <span className="area-distribution-widget__modal-footnote area-distribution-widget__modal-footnote--muted">
                          데이터를 불러오는 중입니다...
                        </span>
                      ) : hasMoreRows ? (
                        <button
                          type="button"
                          className="area-distribution-widget__modal-more"
                          onClick={() => void loadDetailList(selectedRegion, currentDetailType, "more")}
                          disabled={detailLoading}
                        >
                          더보기
                        </button>
                      ) : (
                        <span className="area-distribution-widget__modal-footnote area-distribution-widget__modal-footnote--muted">
                          마지막 페이지입니다.
                        </span>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
