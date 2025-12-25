import tippyBundle from "@/vendor/tippy/tippy-bundle.umd.min.js";

type TippyTarget = HTMLElement | Element | string;

export type TippyInstance = {
  setContent(content: string | Element): void;
  destroy(): void;
  setProps(options: Record<string, unknown>): void;
  reference: Element | null;
};

type TippyFn = (target: TippyTarget, options?: Record<string, unknown>) => TippyInstance;

type TippyPlugin = {
  name: string;
  defaultValue?: unknown;
  fn(instance: TippyInstance): Record<string, (...args: unknown[]) => void>;
};

function resolveBundle(): TippyFn {
  if (typeof tippyBundle === "function") {
    return tippyBundle as TippyFn;
  }
  if (tippyBundle && typeof (tippyBundle as { default?: unknown }).default === "function") {
    return (tippyBundle as { default: TippyFn }).default;
  }
  throw new Error("tippy bundle is not a function");
}

const resolvedTippy = resolveBundle();

export const followCursor: TippyPlugin = {
  name: "followCursor",
  defaultValue: false,
  fn(instance) {
    let cleanup: (() => void) | null = null;
    let lastPoint: { clientX: number; clientY: number } | null = null;

    const updateVirtualReference = (point: { clientX: number; clientY: number }) => {
      lastPoint = point;
      instance.setProps({
        getReferenceClientRect: () => ({
          width: 0,
          height: 0,
          top: point.clientY,
          bottom: point.clientY,
          left: point.clientX,
          right: point.clientX,
        }),
      });
    };

    const handleMove = (event: MouseEvent | Event) => {
      if (!isMouseLikeEvent(event)) {
        return;
      }
      updateVirtualReference({ clientX: event.clientX, clientY: event.clientY });
    };

    const attachListeners = () => {
      if (typeof window === "undefined") {
        return;
      }
      const reference = instance.reference;
      if (!reference || typeof reference.addEventListener !== "function") {
        return;
      }
      reference.addEventListener("mousemove", handleMove as EventListener);
      cleanup = () => reference.removeEventListener("mousemove", handleMove as EventListener);
    };

    return {
      onTrigger(_event, nativeEvent) {
        if (isMouseLikeEvent(nativeEvent)) {
          updateVirtualReference({
            clientX: nativeEvent.clientX,
            clientY: nativeEvent.clientY,
          });
        }
      },
      onMount() {
        if (!cleanup) {
          attachListeners();
        }
        if (lastPoint) {
          updateVirtualReference(lastPoint);
        }
      },
      onHidden() {
        cleanup?.();
        cleanup = null;
        lastPoint = null;
        instance.setProps({ getReferenceClientRect: null });
      },
      onDestroy() {
        cleanup?.();
        cleanup = null;
      },
    };
  },
};

export default function tippy(target: TippyTarget, options?: Record<string, unknown>) {
  return resolvedTippy(target, options);
}

function isMouseLikeEvent(event: unknown): event is { clientX: number; clientY: number } {
  return (
    typeof event === "object" &&
    event !== null &&
    "clientX" in event &&
    "clientY" in event &&
    typeof (event as { clientX: unknown }).clientX === "number" &&
    typeof (event as { clientY: unknown }).clientY === "number"
  );
}
