"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type MouseEvent,
} from "react";

import { useUserSettings } from "../../../../components/usersettings/UserSettingsProvider";
import { AppList, type ApplicationSummary } from "../../../api/AppList";
import {
  getLogmeterSnapshot,
  type LogmeterSnapshot,
  type LogmeterTimelinePoint,
} from "../../../api/Widget/Logmeter";
import type { FavoritesDateType, FavoritesTroubleType } from "../../../api/Widget/Favorites";
import { useTheme } from "../../../../components/theme/ThemeProvider";
import FavoritesTroublePopup from "../Favorites/FavoritesTroublePopup";

import "./style.css";
import "../Favorites/style.css";

// const REFRESH_INTERVAL_MS = 3_000; // 스냅샷 재요청 주기 (ms)
// const MISSILE_SPEED_MULTIPLIER = 4; // 캔버스 비행체 속도 배수
// const EVENT_SPREAD_MS = 15_000; // 들어온 count를 분산해 뿌리는 시간 (ms)
// const MAX_LOG_ITEMS = 50; // log-only 아이템 최대 생성 개수 (과부하 방지)


const REFRESH_INTERVAL_MS = 3_000; // 스냅샷 재요청 주기 (ms)
const MISSILE_SPEED_MULTIPLIER = 8; // 캔버스 비행체 속도 배수
const EVENT_SPREAD_MS = 15_000; // 들어온 count를 분산해 뿌리는 시간 (ms)
const MAX_LOG_ITEMS = 50; // log-only 아이템 최대 생성 개수 (과부하 방지)

const timeFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

type StackType = "error" | "crash";
type CircleType = "log" | StackType;

const STACK_LEVELS = 20; // 스택 시각화 단계 수
const DEFAULT_STACK_MAX_VALUES: Record<StackType, number> = {
  error: 100,
  crash: 50,
};
let STACK_MAX_VALUES: Record<StackType, number> = { ...DEFAULT_STACK_MAX_VALUES };

function sanitizeStackMaxValue(type: StackType, value: unknown): number {
  const numeric =
    typeof value === "string" ? Number(value) : typeof value === "number" ? value : Number.NaN;
  const safeValue = Number.isFinite(numeric) ? Math.max(0, numeric) : 0;
  return Math.max(DEFAULT_STACK_MAX_VALUES[type], Math.round(safeValue));
}

function applyStackMaxValues(next?: Partial<Record<StackType, number>> | null): void {
  STACK_MAX_VALUES = {
    error: sanitizeStackMaxValue("error", next?.error),
    crash: sanitizeStackMaxValue("crash", next?.crash),
  };
}

class EventGenerator {
  id: string;
  startAt: number;
  durationMs: number;
  schedule: { at: number; type: CircleType }[];
  constructor(id: string, events: CircleType[], durationMs: number) {
    this.id = id;
    this.startAt = Date.now();
    this.durationMs = durationMs;
    // crash/error는 시작 시점에 즉시 보여주고, log는 duration 동안 균등 분배
    const crashes = events.filter((e) => e === "crash");
    const errors = events.filter((e) => e === "error");
    const logs = events.filter((e) => e === "log").slice(0, MAX_LOG_ITEMS);

    const schedule: { at: number; type: CircleType }[] = [];
    crashes.forEach(() => schedule.push({ at: this.startAt, type: "crash" }));
    errors.forEach(() => schedule.push({ at: this.startAt, type: "error" }));

    if (logs.length > 0) {
      const interval = Math.max(1, durationMs / Math.max(1, logs.length));
      logs.forEach((_, idx) => {
        // 1/N 간격으로 duration 전체에 걸쳐 생성 (마지막 로그는 duration 근처)
        const planned = this.startAt + Math.floor((idx + 1) * interval);
        const clamped = Math.min(planned, this.startAt + durationMs);
        schedule.push({ at: clamped, type: "log" });
      });
    }

    // 시간이 지나도 남은 이벤트는 끝 시점까지 유지
    this.schedule = schedule.sort((a, b) => a.at - b.at);
  }
  takeReady(ts: number): CircleType[] {
    if (this.schedule.length === 0) return [];
    const ready = this.schedule.filter((item) => item.at <= ts).map((item) => item.type);
    this.schedule = this.schedule.filter((item) => item.at > ts);
    return ready;
  }
  isAlive(ts: number): boolean {
    // 생성기는 EVENT_SPREAD_MS 기간까지만 생존한다.
    return ts - this.startAt < this.durationMs;
  }
}

type Circle = {
  type: CircleType;
  x: number;
  y: number;
  radius: number;
  speed: number;
  drift: number;
};

type BoosterSegment = {
  type: CircleType;
  x: number;
  y: number;
  heading: number;
  life: number;
  maxLife: number;
  scale: number;
  phaseOffset: number;
};

type ExplosionParticle = {
  type: CircleType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  life: number;
  maxLife: number;
};

type AnimationState = {
  circles: Circle[];
  lastTimestamp: number | null;
  boosterPhase: number;
  boosters: BoosterSegment[];
  explosions: ExplosionParticle[];
  gauges: {
    error: number;
    crash: number;
  };
};

const HEADER_ICON_COLORS: Record<string, string> = {
  very_good: "#1EC97F",
  good: "#4CBA8F",
  normal: "#FBBF24",
  bad: "#F97316",
  very_bad: "#F87171",
};


const STATUS_ICON_PATHS: Record<string, string> = {
  very_good: "/images/maxy/feeldex-very-good.svg",
  good: "/images/maxy/feeldex-good.svg",
  normal: "/images/maxy/feeldex-normal.svg",
  bad: "/images/maxy/feeldex-bad.svg",
  very_bad: "/images/maxy/feeldex-very-bad.svg",
};

const statusIconCache: Record<string, HTMLImageElement> = {};

function getStatusIcon(statusKey: string): HTMLImageElement | null {
  const path = STATUS_ICON_PATHS[statusKey] ?? STATUS_ICON_PATHS.normal;
  if (!path) {
    return null;
  }
  if (!statusIconCache[path]) {
    const img = new Image();
    img.src = path;
    statusIconCache[path] = img;
  }
  return statusIconCache[path] ?? null;
}

const STACK_FILL_COLORS = {
  error: ["#FCD34D", "#FACC15", "#EAB308", "#CA8A04"],
  crash: ["#FF6B6B", "#F97373", "#F43F5E", "#E11D48"],
} as const;

const STACK_EMPTY_COLOR = "rgba(226, 232, 240, 0.6)";
const STACK_BORDER_COLOR = "rgba(148, 163, 184, 0.45)";
const TIMELINE_BACKGROUND = "rgba(251, 252, 255, 0.9)";

function getStackMaxValue(type: StackType): number {
  return STACK_MAX_VALUES[type];
}

function clampStackValue(type: StackType, value: number): number {
  const maxValue = getStackMaxValue(type);
  const numeric = Number.isFinite(value) ? value : 0;
  return Math.max(0, Math.min(maxValue, Math.round(numeric)));
}

type StackColumnLayout = {
  type: StackType;
  rect: { x: number; y: number; width: number; height: number };
  value: number;
  avg: number;
};

type StackColumnColors = {
  background: string;
  empty: string;
  highlight: string;
};

type LogmeterCanvasTheme = {
  stack: StackColumnColors & { label: string };
  timelineBackground: string;
};
const BULLET_COLORS: Record<CircleType, string> = {
  log: "#7CB9FF",
  error: "#FFC700",
  crash: "#FF6B6B",
};

const EXPLOSION_COLORS: Record<CircleType, string> = {
  log: "rgba(124, 185, 255, 1)",
  error: "rgba(255, 199, 0, 1)",
  crash: "rgba(255, 107, 107, 1)",
};

const MISSILE_BODY_COLORS: Record<CircleType, [string, string, string]> = {
  log: ["#E2E8F0", "#9CC7FF", "#1D4ED8"],
  error: ["#FFFAE6", "#FFD661", "#EAB308"],
  crash: ["#FFE9E9", "#FF8080", "#B91C1C"],
};

function makeBoosterPaths(prefix: string): string[] {
  return Array.from(
    { length: 10 },
    (_, idx) => `/images/maxy/logmeter/${prefix}-${String(idx + 1).padStart(2, "0")}.svg`,
  );
}

const BOOSTER_FRAME_PATHS_BY_TYPE: Record<CircleType, string[]> = {
  log: makeBoosterPaths("exhaust-log"),
  error: makeBoosterPaths("exhaust-error"),
  crash: makeBoosterPaths("exhaust-crash"),
};

const boosterFrameCacheByType: Record<CircleType, (HTMLImageElement | null)[]> = {
  log: BOOSTER_FRAME_PATHS_BY_TYPE.log.map(() => null),
  error: BOOSTER_FRAME_PATHS_BY_TYPE.error.map(() => null),
  crash: BOOSTER_FRAME_PATHS_BY_TYPE.crash.map(() => null),
};

function getBoosterFrame(type: CircleType, index: number): HTMLImageElement | null {
  const paths = BOOSTER_FRAME_PATHS_BY_TYPE[type];
  const cache = boosterFrameCacheByType[type];
  if (!paths || !cache) {
    return null;
  }
  if (index < 0 || index >= paths.length) {
    return null;
  }
  if (!cache[index]) {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = paths[index];
    cache[index] = image;
  }
  return cache[index];
}

function formatTimestamp(seconds: number | null | undefined): string {
  if (!Number.isFinite(seconds ?? NaN)) {
    return "";
  }
  return timeFormatter.format(new Date((seconds as number) * 1000));
}

function resolveBlockColor(type: "error" | "crash", indexFromBottom: number): string {
  const palette = STACK_FILL_COLORS[type];
  const bucketSize = STACK_LEVELS / palette.length;
  const bucket = Math.min(palette.length - 1, Math.floor(indexFromBottom / bucketSize));
  return palette[bucket];
}

function drawHeader(
  ctx: CanvasRenderingContext2D,
  width: number,
  paddingX: number,
  topOffset: number,
  snapshot: LogmeterSnapshot | null,
): number {
  if (!snapshot) {
    return topOffset;
  }

  const timeText = formatTimestamp(snapshot.lastUpdated);
  if (!timeText) {
    return topOffset;
  }

  ctx.save();
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  ctx.fillStyle = "rgba(100, 116, 139, 0.85)";
  ctx.font = "12px Pretendard, sans-serif";
  ctx.fillText(timeText, width - paddingX, topOffset);
  ctx.restore();

  return topOffset + 18;
}

function resolveStackStatus(type: StackType, count: number): string {
  const maxValue = Math.max(1, getStackMaxValue(type));
  const ratio = Math.max(0, Math.min(1, count / maxValue));
  if (ratio === 0) {
    return "very_good";
  }

  if (type === "error") {
    if (ratio <= 0.25) return "good";
    if (ratio <= 0.5) return "normal";
    if (ratio <= 0.75) return "bad";
    return "very_bad";
  }

  if (ratio <= 0.2) return "good";
  if (ratio <= 0.4) return "normal";
  if (ratio <= 0.6) return "bad";
  return "very_bad";
}

function drawStackColumn(
  ctx: CanvasRenderingContext2D,
  opts: {
    x: number;
    y: number;
    width: number;
    height: number;
    type: StackType;
    value: number;
  },
  colors: StackColumnColors,
) {
  const { x, y, width, height, type, value } = opts;
  ctx.save();

  ctx.fillStyle = colors.background;
  ctx.strokeStyle = STACK_BORDER_COLOR;
  ctx.lineWidth = 1;
  ctx.fillRect(x, y, width, height);
  ctx.strokeRect(x, y, width, height);

  const blockGap = Math.max(1, Math.min(3, height / (STACK_LEVELS * 14)));
  const blockHeight = (height - blockGap * (STACK_LEVELS - 1)) / STACK_LEVELS;
  const highlightColor = colors.highlight;
  const stackMaxValue = getStackMaxValue(type);
  const clampedValue = Math.max(0, Math.min(stackMaxValue, value));
  const totalBlocks = (clampedValue / stackMaxValue) * STACK_LEVELS;
  const fullBlocks = Math.min(STACK_LEVELS, Math.floor(totalBlocks));
  const partialRatio = Math.min(1, Math.max(0, totalBlocks - fullBlocks));

  for (let index = 0; index < STACK_LEVELS; index += 1) {
    const blockTop = y + height - (index + 1) * blockHeight - index * blockGap;
    const blockBottom = blockTop + blockHeight;
    if (index < fullBlocks) {
      const color = resolveBlockColor(type, index);
      ctx.fillStyle = color;
      ctx.fillRect(x, blockTop, width, blockHeight);
      if (index === fullBlocks - 1 && partialRatio === 0) {
        ctx.strokeStyle = type === "error" ? "rgba(234, 179, 8, 0.9)" : "rgba(248, 113, 113, 0.9)";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x + 0.6, blockTop + 0.6, width - 1.2, blockHeight - 1.2);
      }
    } else if (index === fullBlocks && partialRatio > 0) {
      const color = resolveBlockColor(type, index);
      const partialHeight = blockHeight * partialRatio;
      ctx.fillStyle = color;
      ctx.fillRect(x, blockBottom - partialHeight, width, partialHeight);
      if (partialHeight > 1) {
        ctx.strokeStyle = type === "error" ? "rgba(234, 179, 8, 0.9)" : "rgba(248, 113, 113, 0.9)";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(
          x + 0.6,
          blockBottom - partialHeight + 0.6,
          width - 1.2,
          partialHeight - 1.2,
        );
      }
    } else {
      ctx.fillStyle = colors.empty;
      ctx.fillRect(x, blockTop, width, blockHeight);
    }
  }

  ctx.restore();
}

function drawStacks(
  ctx: CanvasRenderingContext2D,
  rect: { x: number; y: number; width: number; height: number },
  labelBaseline: number,
  gauges: { error: number; crash: number },
  colors: StackColumnColors & { label: string },
  onLayout?: (layout: StackColumnLayout) => void,
  avg?: { error: number; crash: number },
) {
  const columnGap = 5;
  const columnWidth = (rect.width - columnGap) / 2;
  const stackWidth = Math.max(Math.min(columnWidth * 0.8, columnWidth - 8), 32);
  const iconSize = Math.min(stackWidth * 0.35 * 1.5, 30);
  const labelY = labelBaseline;

  const drawColumn = ({
    baseX,
    value,
    type,
    label,
  }: {
    baseX: number;
    value: number;
    type: "error" | "crash";
    label: string;
  }) => {
    const stackX = baseX + (columnWidth - stackWidth) / 2;
    const statusKey = resolveStackStatus(type, value);
    const icon = getStatusIcon(statusKey);
    const iconCenterX = stackX + stackWidth / 2;
    const iconY = rect.y - iconSize;
    onLayout?.({
      type,
      rect: { x: stackX, y: rect.y, width: stackWidth, height: rect.height },
      value,
      avg: type === "error" ? avg?.error ?? 0 : avg?.crash ?? 0,
    });

    if (icon && icon.complete) {
      ctx.drawImage(icon, iconCenterX - iconSize / 2, iconY, iconSize, iconSize);
    } else {
      ctx.fillStyle = HEADER_ICON_COLORS[statusKey] ?? HEADER_ICON_COLORS.normal;
      ctx.beginPath();
      ctx.rect(iconCenterX - iconSize / 2, iconY, iconSize, iconSize);
      ctx.fill();
    }

    drawStackColumn(
      ctx,
      {
        x: stackX,
        y: rect.y,
        width: stackWidth,
        height: rect.height,
        type,
        value,
      },
      colors,
    );

    ctx.fillStyle = colors.label;
    ctx.font = "12px Pretendard, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(label, stackX + stackWidth / 2, labelY);
  };

  drawColumn({ baseX: rect.x, value: gauges.error, type: "error", label: "Error" });
  drawColumn({
    baseX: rect.x + columnWidth + columnGap,
    value: gauges.crash,
    type: "crash",
    label: "Crash",
  });
}

function spawnCircle(
  rect: { x: number; y: number; width: number; height: number },
  type: CircleType,
): Circle {
  const spawnOffset = rect.width * 0.1 + 40; // 화면 오른쪽 밖에서 시작하도록 오프셋
  return {
    type,
    x: rect.x + rect.width + Math.random() * spawnOffset,
    y: rect.y + rect.height * Math.random(),
    radius: 6 + Math.random() * 4, //크기 조절
    speed: rect.width * (0.12 + Math.random() * 0.12) * MISSILE_SPEED_MULTIPLIER,
    drift: (Math.random() - 0.5) * 40,
  };
}

function spawnExplosion(
  circle: Circle,
  at: { x: number; y: number },
): ExplosionParticle[] {
  const shardCount = 12;
  const particles: ExplosionParticle[] = [];
  const baseSpeed = Math.max(140, circle.radius * 32);
  for (let i = 0; i < shardCount; i += 1) {
    const finalAngle = Math.random() * Math.PI * 2;
    const speed = baseSpeed * (0.5 + Math.random() * 0.9);
    particles.push({
      type: circle.type,
      x: at.x,
      y: at.y,
      vx: Math.cos(finalAngle) * speed,
      vy: Math.sin(finalAngle) * speed,
      radius: Math.max(2.5, circle.radius * (0.35 + Math.random() * 0.4)),
      life: 0,
      maxLife: 0.45 + Math.random() * 0.4,
    });
  }
  return particles;
}

function addBoosterSegment(state: AnimationState, circle: Circle) {
  const heading = Math.atan2(circle.drift * 0.5, -circle.speed);
  const scale = Math.max(0.4, Math.min(1.25, circle.radius / 8));
  const offset = circle.radius * (3.6 + scale * 0.8);
  const anchorX = circle.x - Math.cos(heading) * offset;
  const anchorY = circle.y - Math.sin(heading) * offset;
  state.boosters.push({
    type: circle.type,
    x: anchorX,
    y: anchorY,
    heading,
    life: 0,
    maxLife: 0.5,
    scale,
    phaseOffset: Math.random(),
  });
  // if (state.boosters.length > 420) {
  //   state.boosters.splice(0, state.boosters.length - 420);
  // }
  if (state.boosters.length > 10) {
    state.boosters.splice(0, state.boosters.length - 10);
  }
}

function updateBoosters(state: AnimationState, delta: number) {
  state.boosters = state.boosters.filter((segment) => {
    segment.life += delta;
    return segment.life < segment.maxLife;
  });
}

function ensureCircles(
  state: AnimationState,
  rect: { x: number; y: number; width: number; height: number },
  pendingEvents: CircleType[],
) {
  const capacity = Math.max(0, MAX_LOG_ITEMS - state.circles.length);
  const spawnCount = Math.min(capacity, pendingEvents.length);
  for (let i = 0; i < spawnCount; i += 1) {
    const type = pendingEvents.shift() ?? "log";
    state.circles.push(spawnCircle(rect, type));
  }
}

function updateCircles(
  state: AnimationState,
  delta: number,
  rect: { x: number; y: number; width: number; height: number },
) {
  const leftEdge = rect.x;
  const minY = rect.y + 12;
  const maxY = rect.y + rect.height - 12;

  const survivors: Circle[] = [];

  state.circles.forEach((circle) => {
    circle.x -= circle.speed * delta;
    circle.y += circle.drift * delta * 0.5;

    let bounced = false;
    if (circle.y < minY) {
      circle.y = minY;
      circle.drift = Math.abs(circle.drift);
      bounced = true;
    } else if (circle.y > maxY) {
      circle.y = maxY;
      circle.drift = -Math.abs(circle.drift);
      bounced = true;
    }

    addBoosterSegment(state, circle);

    if (circle.x - circle.radius <= leftEdge) {
      if (circle.type === "error" || circle.type === "crash") {
        const gaugeType: StackType = circle.type;
        const maxValue = getStackMaxValue(gaugeType);
        state.gauges[gaugeType] = Math.min(maxValue, state.gauges[gaugeType] + 1);
      }
      const explosionCenter = {
        x: leftEdge,
        y: Math.min(Math.max(circle.y, rect.y), rect.y + rect.height),
      };
      state.explosions.push(...spawnExplosion(circle, explosionCenter));
      // if (state.explosions.length > 240) {
      //   state.explosions.splice(0, state.explosions.length - 240);
      // }
      if (state.explosions.length > 10) {
        state.explosions.splice(0, state.explosions.length - 10);
      }
      return;
    }

    if (bounced && (circle.type === "error" || circle.type === "crash")) {
      // Reserved for future side-effects on bounce
    }
    survivors.push(circle);
  });

  state.circles = survivors;
}

function updateExplosions(state: AnimationState, delta: number) {
  state.explosions = state.explosions.filter((particle) => {
    particle.life += delta;
    const progress = particle.life / particle.maxLife;
    particle.x += particle.vx * delta;
    particle.y += particle.vy * delta;
    particle.vx *= 0.9;
    particle.vy *= 0.9;
    particle.radius *= 0.9;
    return progress < 1;
  });
}


function drawTimeline(
  ctx: CanvasRenderingContext2D,
  rect: { x: number; y: number; width: number; height: number },
  state: AnimationState,
  delta: number,
  backgroundColor: string,
  pendingEvents: CircleType[],
) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.width, rect.height);
  ctx.clip();

  if (rect.width <= 20 || rect.height <= 40) {
    ctx.restore();
    return;
  }

  const paddingX = Math.min(20, rect.width * 0.06);
  const paddingY = Math.min(16, rect.height * 0.08);
  const axisHeight = Math.min(rect.height * 0.18, 30);
  const chartHeight = Math.max(rect.height - paddingY * 2 - axisHeight, 60);
  const chartWidth = Math.max(rect.width - paddingX * 2, 40);
  const chartX = rect.x + paddingX;
  const chartY = rect.y + paddingY;

  ctx.fillStyle = backgroundColor;
  ctx.fillRect(chartX, chartY, chartWidth, chartHeight);

  ensureCircles(
    state,
    { x: chartX, y: chartY, width: chartWidth, height: chartHeight },
    pendingEvents,
  );
  updateCircles(
    state,
    delta,
    { x: chartX, y: chartY, width: chartWidth, height: chartHeight },
  );
  updateBoosters(state, delta);
  updateExplosions(state, delta);

  state.boosters.forEach((segment) => {
    const framePaths = BOOSTER_FRAME_PATHS_BY_TYPE[segment.type] ?? [];
    const frameCount = framePaths.length;
    const progress = Math.min(1, segment.life / segment.maxLife);
    const animationPhase = (state.boosterPhase + segment.phaseOffset) % 1;
    const frameIndex =
      frameCount > 0 ? Math.min(frameCount - 1, Math.floor(animationPhase * frameCount)) : 0;
    const frame = frameCount > 0 ? getBoosterFrame(segment.type, frameIndex) : null;
    const alpha = Math.max(0, 1 - progress) * 0.75;
    ctx.save();
    ctx.translate(segment.x, segment.y);
    ctx.rotate(segment.heading);
    ctx.globalAlpha = alpha;
    const baseSize = segment.scale * 30;
    const width = baseSize * 1.4;
    const height = baseSize * 0.7;
    let rendered = false;
    if (frame && frame.complete && frame.naturalWidth > 0 && frame.naturalHeight > 0) {
      try {
        ctx.drawImage(frame, -width / 2, -height / 2, width, height);
        rendered = true;
      } catch (err) {
        rendered = false;
      }
    }
    if (!rendered) {
      const gradient = ctx.createLinearGradient(-width / 2, 0, width / 2, 0);
      const [light, mid, dark] = MISSILE_BODY_COLORS[segment.type] ?? MISSILE_BODY_COLORS.log;
      gradient.addColorStop(0, `${light}22`);
      gradient.addColorStop(0.45, `${mid}aa`);
      gradient.addColorStop(1, `${dark}00`);
      ctx.fillStyle = gradient;
      const radius = height / 2;
      ctx.beginPath();
      ctx.moveTo(width / 2, -radius);
      ctx.lineTo(-width / 2 + radius, -radius);
      ctx.quadraticCurveTo(-width / 2 - radius, 0, -width / 2 + radius, radius);
      ctx.lineTo(width / 2, radius);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  });

  state.explosions.forEach((particle) => {
    const color = EXPLOSION_COLORS[particle.type] ?? "rgba(124, 185, 255, 1)";
    const progress = Math.min(1, particle.life / particle.maxLife);
    const alpha = Math.max(0, 1 - progress) * 0.9;
    ctx.globalAlpha = alpha;
    const gradient = ctx.createRadialGradient(
      particle.x,
      particle.y,
      0,
      particle.x,
      particle.y,
      particle.radius * 2.5,
    );
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, Math.max(3, particle.radius * 1.8), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });

  state.circles.forEach((circle) => {
    const [light, mid, dark] = MISSILE_BODY_COLORS[circle.type];
    const halfHeight = circle.radius * 0.95;
    const noseLength = circle.radius * 1.6;
    const bodyLength = circle.radius * 3.5;
    const finLength = circle.radius * 1.1;
    const tailInset = circle.radius * 1.0;
    const front = (noseLength + bodyLength) / 2;
    const tail = -front;

    ctx.save();
    ctx.translate(circle.x, circle.y);
    const heading = Math.atan2(circle.drift * 0.5, -circle.speed);
    ctx.rotate(heading);
    ctx.globalAlpha = circle.type === "log" ? 0.58 : 0.92;

    const bodyGradient = ctx.createLinearGradient(front, 0, tail, 0);
    bodyGradient.addColorStop(0, light);
    bodyGradient.addColorStop(0.6, mid);
    bodyGradient.addColorStop(1, dark);
    ctx.fillStyle = bodyGradient;

    ctx.beginPath();
    ctx.moveTo(front, 0);
    ctx.quadraticCurveTo(front - noseLength * 0.25, -halfHeight, front - noseLength, -halfHeight);
    ctx.lineTo(tail + tailInset, -halfHeight);
    ctx.lineTo(tail - finLength, -halfHeight * 0.55);
    ctx.lineTo(tail - finLength * 0.2, 0);
    ctx.lineTo(tail - finLength, halfHeight * 0.55);
    ctx.lineTo(tail + tailInset, halfHeight);
    ctx.lineTo(front - noseLength, halfHeight);
    ctx.quadraticCurveTo(front - noseLength * 0.25, halfHeight, front, 0);
    ctx.closePath();
    ctx.fill();

    ctx.lineWidth = Math.max(0.6, circle.radius * 0.12);
    ctx.strokeStyle = "rgba(15, 23, 42, 0.22)";
    ctx.stroke();

    ctx.lineWidth = Math.max(0.4, circle.radius * 0.08);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
    ctx.beginPath();
    ctx.moveTo(front - noseLength * 0.6, -halfHeight * 0.55);
    ctx.quadraticCurveTo((front + tail) / 2, -halfHeight * 0.95, tail + tailInset * 0.4, -halfHeight * 0.2);
    ctx.stroke();

    ctx.restore();
  });

  ctx.restore();
}

function drawCenteredText(ctx: CanvasRenderingContext2D, message: string, width: number, height: number) {
  ctx.fillStyle = "rgba(71, 85, 105, 0.86)";
  ctx.font = "13px Pretendard, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(message, width / 2, height / 2);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

type DrawMeta = {
  loading: boolean;
  resolving: boolean;
  errorMessage: string | null;
};

function drawFrame(
  canvas: HTMLCanvasElement,
  snapshot: LogmeterSnapshot | null,
  animationState: AnimationState,
  timestamp: number,
  meta: DrawMeta,
  theme: LogmeterCanvasTheme,
  pendingEventsRef: MutableRefObject<CircleType[]>,
  layoutRef: MutableRefObject<{ stackColumns: StackColumnLayout[] } | null>,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }

  const parent = canvas.parentElement as HTMLElement | null;
  const width = Math.max(parent?.clientWidth ?? canvas.clientWidth ?? 1, 1);
  const height = Math.max(parent?.clientHeight ?? canvas.clientHeight ?? 1, 1);
  const dpr = window.devicePixelRatio ?? 1;

  if (canvas.style.width !== `${width}px`) {
    canvas.style.width = `${width}px`;
  }
  if (canvas.style.height !== `${height}px`) {
    canvas.style.height = `${height}px`;
  }
  if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
  }

  const previousTimestamp = animationState.lastTimestamp;
  animationState.lastTimestamp = timestamp;
  const delta = previousTimestamp === null ? 0 : Math.min(0.35, (timestamp - previousTimestamp) / 1000);

  animationState.boosterPhase = (animationState.boosterPhase + delta * 3.2) % 1;

  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(252, 211, 77, 0.45)";
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, width - 1, height - 1);

  const horizontalPadding = Math.min(24, width * 0.04);
  const topPadding = 10;
  const bottomPadding = 0;

  if (!snapshot) {
    animationState.circles = [];
    layoutRef.current = null;
    const msg =
      meta.errorMessage ??
      (meta.resolving || meta.loading ? "데이터를 불러오고 있습니다." : "");
    if (msg) {
      drawCenteredText(ctx, msg, width, height);
    }
    ctx.restore();
    return;
  }

  const todayErrorGauge = clampStackValue("error", snapshot.todayErrorCount ?? 0);
  const todayCrashGauge = clampStackValue("crash", snapshot.todayCrashCount ?? 0);
  animationState.gauges.error = todayErrorGauge;
  animationState.gauges.crash = todayCrashGauge;

  const headerBottom = drawHeader(ctx, width, horizontalPadding, topPadding, snapshot);
  const leftWidth = Math.min(width * 0.18, 120);
  const gap = Math.min(24, width * 0.03);
  const labelSpacing = 14;
  const labelMargin = 4;
  const columnWidth = leftWidth / 2;
  const stackWidth = Math.max(Math.min(columnWidth * 0.8, columnWidth - 8), 32);
  const iconSize = Math.min(stackWidth * 0.35 * 1.5, 30);
  const iconTop = topPadding;
  const stackTop = iconTop + iconSize;
  const contentTop = Math.max(stackTop, headerBottom + topPadding * 0.5);
  const contentHeight = Math.max(height - contentTop - bottomPadding, 100);
  const contentBottom = height - bottomPadding;
  const maxStackHeight = Math.max(contentBottom - stackTop, 0);
  const stackHeight = Math.min(
    maxStackHeight,
    Math.max(maxStackHeight - (labelSpacing + labelMargin), 48),
  );
  const stackRect = { x: horizontalPadding, y: stackTop, width: leftWidth, height: stackHeight };
  const labelBaseline = Math.min(stackTop + stackHeight + labelSpacing, contentBottom - 2);
  const timelineRect = {
    x: horizontalPadding + leftWidth + gap,
    y: contentTop,
    width: Math.max(width - (horizontalPadding * 2 + leftWidth + gap), 80),
    height: contentHeight,
  };

  const layouts: StackColumnLayout[] = [];
  const avgSourceRaw =
    snapshot.stackMaxAverages ??
    snapshot.stackMaxValues ??
    snapshot.logmeterAvg;
  const avgSource = {
    error: Math.max(0, avgSourceRaw?.error ?? 0),
    crash: Math.max(0, avgSourceRaw?.crash ?? 0),
  };
  drawStacks(
    ctx,
    stackRect,
    labelBaseline,
    animationState.gauges,
    theme.stack,
    (layout) => {
      const tooltipValue =
        layout.type === "error"
          ? Math.max(0, Math.round(snapshot.todayErrorCount ?? 0))
          : layout.value;
      const avgValue =
        layout.type === "error"
          ? avgSource.error
          : avgSource.crash;
      layouts.push({ ...layout, value: tooltipValue, avg: avgValue });
    },
    avgSource,
  );
  layoutRef.current = { stackColumns: layouts };

  drawTimeline(
    ctx,
    timelineRect,
    animationState,
    delta,
    theme.timelineBackground,
    pendingEventsRef.current,
  );

  ctx.restore();
}

/** Logmeter widget rendered inside the dashboard grid. */
/** Logmeter widget rendered inside the dashboard grid. */
export default function LogmeterWidget() {
  const {
    applicationId: storedApplicationId,
    userNo: storedUserNo,
    osType: storedOsType,
    tmzutc,
  } = useUserSettings();
  const { theme } = useTheme();
  const isDarkMode = theme === "dark";
  const canvasStyle = useMemo<LogmeterCanvasTheme>(
    () => ({
      stack: {
        background: isDarkMode ? "rgba(17, 24, 39, 0.88)" : "rgba(241, 245, 249, 0.9)",
        empty: isDarkMode ? "rgba(30, 41, 59, 0.68)" : STACK_EMPTY_COLOR,
        highlight: isDarkMode ? "rgba(148, 163, 184, 0.45)" : "rgba(255, 255, 255, 0.85)",
        label: isDarkMode ? "#f8fafc" : "rgba(71, 85, 105, 0.95)",
      },
      timelineBackground: isDarkMode ? "rgba(13, 20, 34, 0.88)" : TIMELINE_BACKGROUND,
    }),
    [isDarkMode],
  );
  const applicationId = useMemo(() => {
    const numeric = Number(storedApplicationId);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
  }, [storedApplicationId]);
  const userNo = useMemo(() => {
    const numeric = Number(storedUserNo);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
  }, [storedUserNo]);
  const resolvedOsType = useMemo(() => storedOsType ?? "A", [storedOsType]);
  const resolvedTmzutc = useMemo(() => {
    if (typeof tmzutc === "number" && Number.isFinite(tmzutc)) {
      return tmzutc;
    }
    return 0;
  }, [tmzutc]);

  const [resolvedApplicationId, setResolvedApplicationId] = useState<number>(
    applicationId > 0 ? applicationId : 0,
  );
  const [isResolvingApp, setIsResolvingApp] = useState(false);
  const [appResolveError, setAppResolveError] = useState<string | null>(null);
  const [appCache, setAppCache] = useState<ApplicationSummary[] | null>(null);
  const [cachedUserNo, setCachedUserNo] = useState<number | null>(null);

  const [latestSnapshot, setLatestSnapshot] = useState<LogmeterSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [troublePopup, setTroublePopup] = useState<{
    open: boolean;
    initialType: FavoritesTroubleType;
  }>({
    open: false,
    initialType: "error",
  });
  const [isTabActive, setIsTabActive] = useState<boolean>(() => {
    if (typeof document === "undefined") {
      return true;
    }
    return document.visibilityState !== "hidden";
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const timerRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pendingEventsRef = useRef<CircleType[]>([]);
  const generatorsRef = useRef<EventGenerator[]>([]);
  const dispatchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const latestSnapshotRef = useRef<LogmeterSnapshot | null>(null);
  const lastGeneratorTokenRef = useRef<string | null>(null);
  const layoutRef = useRef<{ stackColumns: StackColumnLayout[] } | null>(null);
  const widgetRef = useRef<HTMLDivElement | null>(null);
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    type?: StackType;
    count?: number;
    avg?: number;
  }>({
    visible: false,
    x: 0,
    y: 0,
  });

  useEffect(() => {
    setLatestSnapshot(null);
    latestSnapshotRef.current = null;
    lastGeneratorTokenRef.current = null;
    generatorsRef.current = [];
    pendingEventsRef.current = [];
  }, [resolvedApplicationId]);

  // Sync explicit user selection.
  useEffect(() => {
    if (applicationId > 0) {
      setLatestSnapshot(null);
      setError(null);
      setResolvedApplicationId(applicationId);
      setAppResolveError(null);
      return;
    }

    setLatestSnapshot(null);
    setError(null);
    setResolvedApplicationId(0);
    setAppResolveError(null);
  }, [applicationId]);

  // Resolve application when user preference is missing.
  useEffect(() => {
    if (applicationId > 0) {
      return;
    }

    if (userNo <= 0) {
      setAppResolveError("사용자 정보를 확인할 수 없습니다.");
      setResolvedApplicationId(0);
      setCachedUserNo(null);
      return;
    }

    if (cachedUserNo !== userNo) {
      setCachedUserNo(userNo);
      setAppCache(null);
      setResolvedApplicationId(0);
    }

    if (resolvedApplicationId > 0) {
      return;
    }

    let cancelled = false;

    async function resolveApplication() {
      setIsResolvingApp(true);
      setAppResolveError(null);
      try {
        let cached = appCache;
        if (!cached) {
          const response = await AppList({ userNo, osType: "all" });
          cached = response.applicationList ?? [];
          if (!cancelled) {
            setAppCache(cached);
          }
        }
        if (cancelled) return;
        const list = cached ?? [];
        const fallbackEntry = list.find((item) => Number(item.applicationId) > 0);
        const fallback = fallbackEntry?.applicationId ?? 0;
        if (fallback > 0) {
          setResolvedApplicationId(fallback);
          setAppResolveError(null);
        } else {
          setAppResolveError("사용 가능한 애플리케이션이 없습니다.");
        }
      } catch (err) {
        if (!cancelled) {
          setAppResolveError(
            err instanceof Error ? err.message : "애플리케이션 정보를 불러오지 못했습니다.",
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
  }, [applicationId, userNo, cachedUserNo, resolvedApplicationId, appCache]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabActive(document.visibilityState !== "hidden");
    };

    handleVisibilityChange();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const fetchSnapshot = useCallback(async () => {
    if (resolvedApplicationId <= 0) {
      return false;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setLoading(true);

    try {
      const data = await getLogmeterSnapshot(
        {
          applicationId: resolvedApplicationId,
          maxLogItems: MAX_LOG_ITEMS,
        },
        controller.signal,
      );
      setLatestSnapshot(data);
      latestSnapshotRef.current = data;
      setError(null);
      return true;
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        return false;
      }
      setError(err instanceof Error ? err.message : "로그미터 데이터를 불러오지 못했습니다.");
      return false;
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      setLoading(false);
    }
  }, [resolvedApplicationId]);

  useEffect(() => {
    if (resolvedApplicationId <= 0 || !isTabActive) {
      return;
    }

    fetchSnapshot();
    timerRef.current = window.setInterval(fetchSnapshot, REFRESH_INTERVAL_MS);

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [resolvedApplicationId, fetchSnapshot, isTabActive]);

  const animationStateRef = useRef<AnimationState>({
    circles: [],
    lastTimestamp: null,
    boosterPhase: 0,
    boosters: [],
    explosions: [],
    gauges: {
      error: 0,
      crash: 0,
    },
  });
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    applyStackMaxValues(latestSnapshot?.stackMaxValues);
  }, [latestSnapshot]);

  const hideTooltip = useCallback(() => {
    setTooltip((prev) => (prev.visible ? { ...prev, visible: false } : prev));
  }, []);

  const handleMouseMove = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      const container = widgetRef.current;
      const layout = layoutRef.current;
      if (!container || !layout || layout.stackColumns.length === 0) {
        hideTooltip();
        if (container) {
          container.style.cursor = "default";
        }
        return;
      }
      const rect = container.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const hit = layout.stackColumns.find(
        (col) =>
          x >= col.rect.x &&
          x <= col.rect.x + col.rect.width &&
          y >= col.rect.y &&
          y <= col.rect.y + col.rect.height,
      );
      if (!hit) {
        hideTooltip();
        container.style.cursor = "default";
        return;
      }
      container.style.cursor = "pointer";
      setTooltip({
        visible: true,
        x: x + 12,
        y: y + 12,
        type: hit.type,
        count: hit.value,
        avg: hit.avg,
      });
    },
    [hideTooltip],
  );

  const handleMouseLeave = useCallback(() => {
    hideTooltip();
    if (widgetRef.current) {
      widgetRef.current.style.cursor = "default";
    }
  }, [hideTooltip]);

  const handleStackClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      const container = widgetRef.current;
      const layout = layoutRef.current;
      if (!container || !layout || layout.stackColumns.length === 0) {
        return;
      }
      const rect = container.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const hit = layout.stackColumns.find(
        (col) =>
          x >= col.rect.x &&
          x <= col.rect.x + col.rect.width &&
          y >= col.rect.y &&
          y <= col.rect.y + col.rect.height,
      );
      if (!hit || resolvedApplicationId <= 0) {
        return;
      }
      setTroublePopup({ open: true, initialType: hit.type });
    },
    [resolvedApplicationId],
  );

  useEffect(() => {
    const state = animationStateRef.current;
    const latest = latestSnapshot;
    latestSnapshotRef.current = latest;

    if (latest) {
      const token = latest.updatedAt ?? `${latest.lastUpdated ?? ""}`;
      const alreadyHandled = token && token === lastGeneratorTokenRef.current;

      const err = Math.max(0, latest.biInfo?.appErrorCount ?? 0);
      const crash = Math.max(0, latest.biInfo?.appCrashCount ?? 0);
      const logOnly = Math.max(0, latest.biInfo?.appLogCount ?? 0) - err - crash;

      const crashEvents = Array.from({ length: crash }, () => "crash" as const);
      const errorEvents = Array.from({ length: err }, () => "error" as const);
      const remainingSlots = Math.max(0, MAX_LOG_ITEMS - (crashEvents.length + errorEvents.length));
      const logEvents = Array.from({ length: Math.max(0, Math.min(logOnly, remainingSlots)) }, () => "log" as const);
      const combined: CircleType[] = [...crashEvents, ...errorEvents, ...logEvents];
      if (!alreadyHandled && combined.length > 0) {
        const now = Date.now();
        const generatorId = token || `${now}`;
        generatorsRef.current.push(new EventGenerator(generatorId, combined, EVENT_SPREAD_MS));
        lastGeneratorTokenRef.current = generatorId;
        // 디스패처는 별도 효과에서 계속 실행
      }
    } else {
      state.circles = [];
      state.lastTimestamp = null;
    }

    if (latest) {
      const errorBase = clampStackValue("error", latest.todayErrorCount ?? 0);
      const crashBase = clampStackValue("crash", latest.todayCrashCount ?? 0);
      state.gauges.error = errorBase;
      state.gauges.crash = crashBase;
    } else {
      state.gauges.error = 0;
      state.gauges.crash = 0;
    }
  }, [latestSnapshot]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const state = animationStateRef.current;
    state.lastTimestamp = null;

    const meta: DrawMeta = {
      loading,
      resolving: isResolvingApp,
      errorMessage: error ?? appResolveError,
    };

    const render = (timestamp: number) => {
      drawFrame(
        canvas,
        latestSnapshotRef.current,
        state,
        timestamp,
        meta,
        canvasStyle,
        pendingEventsRef,
        layoutRef,
      );
      frameRef.current = window.requestAnimationFrame(render);
    };

    frameRef.current = window.requestAnimationFrame(render);

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => {
        state.lastTimestamp = null;
      });
      observer.observe(canvas.parentElement ?? canvas);
    }

    return () => {
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      if (observer) {
        observer.disconnect();
      }
    };
  }, [loading, isResolvingApp, error, appResolveError, canvasStyle]);

  // 중앙 디스패처: 생성기들이 쌓여도 계속 50ms 간격으로 배출
  useEffect(() => {
    if (dispatchTimerRef.current) return;
    dispatchTimerRef.current = setInterval(() => {
      const ts = Date.now();
      const nextGenerators: EventGenerator[] = [];
      generatorsRef.current.forEach((gen) => {
        const ready = gen.takeReady(ts);
        if (ready.length > 0) {
          pendingEventsRef.current.push(...ready);
        }
        if (gen.isAlive(ts)) {
          nextGenerators.push(gen);
        }
      });
      generatorsRef.current = nextGenerators;
    }, 50);
    return () => {
      if (dispatchTimerRef.current) {
        clearInterval(dispatchTimerRef.current);
        dispatchTimerRef.current = null;
      }
    };
  }, []);

  const hasError = (latestSnapshot?.todayErrorCount ?? 0) > 0;
  const hasCrash = (latestSnapshot?.todayCrashCount ?? 0) > 0;

  return (
    <>
      <div
        ref={widgetRef}
        className={`logmeter-widget${isDarkMode ? " logmeter-widget--dark" : ""}`}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleStackClick}
      >
        <canvas ref={canvasRef} className="logmeter-canvas" />
        {tooltip.visible ? (
          <div
            className="logmeter-tooltip"
            style={{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }}
          >
            <div className="logmeter-tooltip__title">
              {tooltip.type === "crash" ? "Crash" : "Error"}
            </div>
            <div className="logmeter-tooltip__row">
              <span>Count</span>
              <span>{tooltip.count ?? 0}</span>
            </div>
            <div className="logmeter-tooltip__row">
              <span>Avg</span>
              <span>{tooltip.avg ?? 0}</span>
            </div>
          </div>
        ) : null}
      </div>
      <FavoritesTroublePopup
        open={troublePopup.open}
        applicationId={resolvedApplicationId}
        osType={resolvedOsType}
        tmzutc={resolvedTmzutc}
        dateType={"DAY" as FavoritesDateType}
        reqUrl={null}
        searchTarget="logmeter"
        contextValue="Today"
        pageSize={200}
        popupType="Logmeter"
        initialType={troublePopup.initialType}
        hasError={hasError}
        hasCrash={hasCrash}
        onClose={() => setTroublePopup((prev) => ({ ...prev, open: false }))}
      />
    </>
  );
}
