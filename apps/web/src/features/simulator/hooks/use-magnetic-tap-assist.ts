import { useCallback, useEffect, useRef } from "react";
import type { MouseEvent, PointerEvent } from "react";

type TapLock = {
  pointerId: number;
  scope: HTMLElement;
  targetId: string;
  startX: number;
  startY: number;
  nearMiss: boolean;
  maxDriftPx: number;
  cancelled: boolean;
} | null;

type NearestTarget = {
  id: string;
  distance: number;
  nearMiss: boolean;
};

type TapSample = {
  nearMiss: boolean;
  slightDrift: boolean;
  precise: boolean;
};

type UseMagneticTapAssistOptions = {
  magnetRadiusPx?: number;
  forgivenessRadiusPx?: number;
  magnetRadiusMinPx?: number;
  magnetRadiusMaxPx?: number;
  forgivenessRadiusMinPx?: number;
  forgivenessRadiusMaxPx?: number;
  dragCancelThresholdPx?: number;
  onAssistTap?: (targetId: string) => void;
};

const DEFAULT_MAGNET_RADIUS_PX = 10;
const DEFAULT_FORGIVENESS_RADIUS_PX = 8;
const DEFAULT_MAGNET_RADIUS_MIN_PX = 10;
const DEFAULT_MAGNET_RADIUS_MAX_PX = 14;
const DEFAULT_FORGIVENESS_RADIUS_MIN_PX = 8;
const DEFAULT_FORGIVENESS_RADIUS_MAX_PX = 12;
const PRIORITY_RADIUS_BONUS_PX = 2;
const DEFAULT_DRAG_CANCEL_THRESHOLD_PX = 14;
const NATIVE_CLICK_SUPPRESS_MS = 150;
const HAPTIC_MS = 10;
const TAP_SAMPLE_WINDOW = 18;
const ADAPT_MIN_OBSERVATIONS = 6;
const ADAPT_STEP_PX = 1;
const SLIGHT_DRIFT_MIN_PX = 4;
const PRECISE_DRIFT_MAX_PX = 2;
const ADAPT_NEAR_MISS_RATE_UP = 0.32;
const ADAPT_DRIFT_RATE_UP = 0.4;
const ADAPT_PRECISE_RATE_DOWN = 0.72;
const ADAPT_NEAR_MISS_RATE_DOWN = 0.15;
const ADAPT_DRIFT_RATE_DOWN = 0.2;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isDisabledControl(el: HTMLElement): boolean {
  if (el instanceof HTMLButtonElement) return el.disabled;
  return (
    el.getAttribute("aria-disabled") === "true" ||
    el.getAttribute("data-disabled") === "true"
  );
}

function isPriorityGroup(group: string | null): boolean {
  return group === "transport" || group === "stats";
}

function findNearestTarget(
  scope: HTMLElement,
  clientX: number,
  clientY: number,
  effectiveMagnetRadiusPx: number,
  effectiveForgivenessRadiusPx: number,
  magnetRadiusMinPx: number,
  magnetRadiusMaxPx: number,
  forgivenessRadiusMinPx: number,
  forgivenessRadiusMaxPx: number,
): NearestTarget | null {
  const candidates = scope.querySelectorAll<HTMLElement>("[data-tap-target-id]");
  let nearest: NearestTarget | null = null;
  for (const el of candidates) {
    if (isDisabledControl(el)) continue;
    if (el.getClientRects().length === 0) continue;

    const id = el.dataset.tapTargetId;
    if (!id) continue;

    const group = el.dataset.tapTargetGroup ?? null;
    const priorityBonus = isPriorityGroup(group) ? PRIORITY_RADIUS_BONUS_PX : 0;
    const forgiveness = clamp(
      effectiveForgivenessRadiusPx + priorityBonus,
      forgivenessRadiusMinPx,
      forgivenessRadiusMaxPx,
    );
    const magnet = clamp(
      effectiveMagnetRadiusPx + priorityBonus,
      magnetRadiusMinPx,
      magnetRadiusMaxPx,
    );

    const rect = el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const distance = Math.hypot(clientX - centerX, clientY - centerY);

    const insideForgivenessBounds =
      clientX >= rect.left - forgiveness &&
      clientX <= rect.right + forgiveness &&
      clientY >= rect.top - forgiveness &&
      clientY <= rect.bottom + forgiveness;
    const insideExactBounds =
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom;
    const insideMagnetRadius = distance <= magnet;
    if (!insideForgivenessBounds && !insideMagnetRadius) continue;

    if (nearest == null || distance < nearest.distance) {
      nearest = {
        id,
        distance,
        nearMiss: !insideExactBounds,
      };
    }
  }
  return nearest;
}

function triggerVisualFeedback(target: HTMLElement): void {
  try {
    target.animate(
      [
        { transform: "scale(1)", filter: "brightness(1)" },
        { transform: "scale(0.985)", filter: "brightness(1.18)" },
        { transform: "scale(1)", filter: "brightness(1)" },
      ],
      { duration: 86, easing: "ease-out" },
    );
  } catch {
    /* ignore unsupported animation */
  }
}

function triggerHapticFeedback(): void {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(HAPTIC_MS);
    }
  } catch {
    /* ignore unsupported haptics */
  }
}

export function useMagneticTapAssist({
  magnetRadiusPx = DEFAULT_MAGNET_RADIUS_PX,
  forgivenessRadiusPx = DEFAULT_FORGIVENESS_RADIUS_PX,
  magnetRadiusMinPx = DEFAULT_MAGNET_RADIUS_MIN_PX,
  magnetRadiusMaxPx = DEFAULT_MAGNET_RADIUS_MAX_PX,
  forgivenessRadiusMinPx = DEFAULT_FORGIVENESS_RADIUS_MIN_PX,
  forgivenessRadiusMaxPx = DEFAULT_FORGIVENESS_RADIUS_MAX_PX,
  dragCancelThresholdPx = DEFAULT_DRAG_CANCEL_THRESHOLD_PX,
  onAssistTap,
}: UseMagneticTapAssistOptions) {
  const lockRef = useRef<TapLock>(null);
  const suppressClickRef = useRef<{
    until: number;
    target: HTMLElement | null;
  }>({
    until: 0,
    target: null,
  });
  const adaptiveRadiusRef = useRef({
    magnetPx: clamp(magnetRadiusPx, magnetRadiusMinPx, magnetRadiusMaxPx),
    forgivenessPx: clamp(
      forgivenessRadiusPx,
      forgivenessRadiusMinPx,
      forgivenessRadiusMaxPx,
    ),
  });
  const sampleWindowRef = useRef<TapSample[]>([]);

  useEffect(() => {
    adaptiveRadiusRef.current = {
      magnetPx: clamp(magnetRadiusPx, magnetRadiusMinPx, magnetRadiusMaxPx),
      forgivenessPx: clamp(
        forgivenessRadiusPx,
        forgivenessRadiusMinPx,
        forgivenessRadiusMaxPx,
      ),
    };
    sampleWindowRef.current = [];
  }, [
    forgivenessRadiusMaxPx,
    forgivenessRadiusMinPx,
    forgivenessRadiusPx,
    magnetRadiusMaxPx,
    magnetRadiusMinPx,
    magnetRadiusPx,
  ]);

  const adaptAssistStrength = useCallback(
    (sample: TapSample) => {
      const window = sampleWindowRef.current;
      window.push(sample);
      if (window.length > TAP_SAMPLE_WINDOW) {
        window.splice(0, window.length - TAP_SAMPLE_WINDOW);
      }
      if (window.length < ADAPT_MIN_OBSERVATIONS) return;

      let nearMissCount = 0;
      let slightDriftCount = 0;
      let preciseCount = 0;
      for (const item of window) {
        if (item.nearMiss) nearMissCount += 1;
        if (item.slightDrift) slightDriftCount += 1;
        if (item.precise) preciseCount += 1;
      }

      const sampleCount = window.length;
      const nearMissRate = nearMissCount / sampleCount;
      const slightDriftRate = slightDriftCount / sampleCount;
      const preciseRate = preciseCount / sampleCount;

      const shouldIncreaseAssist =
        nearMissRate >= ADAPT_NEAR_MISS_RATE_UP ||
        slightDriftRate >= ADAPT_DRIFT_RATE_UP;
      const shouldReduceAssist =
        preciseRate >= ADAPT_PRECISE_RATE_DOWN &&
        nearMissRate <= ADAPT_NEAR_MISS_RATE_DOWN &&
        slightDriftRate <= ADAPT_DRIFT_RATE_DOWN;

      let nextMagnet = adaptiveRadiusRef.current.magnetPx;
      let nextForgiveness = adaptiveRadiusRef.current.forgivenessPx;
      if (shouldIncreaseAssist) {
        nextMagnet += ADAPT_STEP_PX;
        nextForgiveness += ADAPT_STEP_PX;
      } else if (shouldReduceAssist) {
        nextMagnet -= ADAPT_STEP_PX;
        nextForgiveness -= ADAPT_STEP_PX;
      }

      adaptiveRadiusRef.current = {
        magnetPx: clamp(nextMagnet, magnetRadiusMinPx, magnetRadiusMaxPx),
        forgivenessPx: clamp(
          nextForgiveness,
          forgivenessRadiusMinPx,
          forgivenessRadiusMaxPx,
        ),
      };
    },
    [
      forgivenessRadiusMaxPx,
      forgivenessRadiusMinPx,
      magnetRadiusMaxPx,
      magnetRadiusMinPx,
    ],
  );

  const onPointerDownCapture = useCallback(
    (e: PointerEvent<HTMLElement>) => {
      if (e.pointerType === "mouse") return;
      if (e.button !== 0) return;

      const scope = (e.target as HTMLElement).closest<HTMLElement>(
        "[data-sim-control-scope]",
      );
      if (!scope) return;

      const nearest = findNearestTarget(
        scope,
        e.clientX,
        e.clientY,
        adaptiveRadiusRef.current.magnetPx,
        adaptiveRadiusRef.current.forgivenessPx,
        magnetRadiusMinPx,
        magnetRadiusMaxPx,
        forgivenessRadiusMinPx,
        forgivenessRadiusMaxPx,
      );
      if (!nearest) return;

      // Tap intent lock: lock nearest target from pointer-down until release.
      lockRef.current = {
        pointerId: e.pointerId,
        scope,
        targetId: nearest.id,
        startX: e.clientX,
        startY: e.clientY,
        nearMiss: nearest.nearMiss,
        maxDriftPx: 0,
        cancelled: false,
      };
    },
    [
      forgivenessRadiusMaxPx,
      forgivenessRadiusMinPx,
      magnetRadiusMaxPx,
      magnetRadiusMinPx,
    ],
  );

  const onPointerMoveCapture = useCallback(
    (e: PointerEvent<HTMLElement>) => {
      const lock = lockRef.current;
      if (!lock) return;
      if (lock.pointerId !== e.pointerId) return;
      if (lock.cancelled) return;
      const distanceMoved = Math.hypot(
        e.clientX - lock.startX,
        e.clientY - lock.startY,
      );
      lock.maxDriftPx = Math.max(lock.maxDriftPx, distanceMoved);
      if (distanceMoved > dragCancelThresholdPx) {
        lock.cancelled = true;
      }
    },
    [dragCancelThresholdPx],
  );

  const onPointerUpCapture = useCallback(
    (e: PointerEvent<HTMLElement>) => {
      const lock = lockRef.current;
      if (!lock) return;
      if (lock.pointerId !== e.pointerId) return;

      lockRef.current = null;
      if (lock.cancelled) return;

      const finalDriftPx = Math.max(
        lock.maxDriftPx,
        Math.hypot(e.clientX - lock.startX, e.clientY - lock.startY),
      );
      adaptAssistStrength({
        nearMiss: lock.nearMiss,
        slightDrift:
          finalDriftPx >= SLIGHT_DRIFT_MIN_PX &&
          finalDriftPx <= dragCancelThresholdPx,
        precise: !lock.nearMiss && finalDriftPx <= PRECISE_DRIFT_MAX_PX,
      });

      const target = lock.scope.querySelector<HTMLElement>(
        `[data-tap-target-id="${CSS.escape(lock.targetId)}"]`,
      );
      if (!target || isDisabledControl(target)) return;

      e.preventDefault();
      e.stopPropagation();

      triggerVisualFeedback(target);
      triggerHapticFeedback();
      onAssistTap?.(lock.targetId);

      suppressClickRef.current = {
        until: performance.now() + NATIVE_CLICK_SUPPRESS_MS,
        target,
      };
      target.click();
    },
    [adaptAssistStrength, dragCancelThresholdPx, onAssistTap],
  );

  const onPointerCancelCapture = useCallback((e: PointerEvent<HTMLElement>) => {
    if (lockRef.current?.pointerId === e.pointerId) {
      lockRef.current = null;
    }
  }, []);

  const onClickCapture = useCallback((e: MouseEvent<HTMLElement>) => {
    if (!e.isTrusted) return;
    const suppress = suppressClickRef.current;
    if (performance.now() > suppress.until || !suppress.target) return;

    const clickTarget = e.target as Node;
    if (suppress.target === clickTarget || suppress.target.contains(clickTarget)) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, []);

  return {
    onPointerDownCapture,
    onPointerMoveCapture,
    onPointerUpCapture,
    onPointerCancelCapture,
    onClickCapture,
  };
}

