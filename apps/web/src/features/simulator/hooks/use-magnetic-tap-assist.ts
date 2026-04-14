import { useCallback, useRef } from "react";
import type { MouseEvent, PointerEvent } from "react";

type TapLock = {
  pointerId: number;
  scope: HTMLElement;
  targetId: string;
  startX: number;
  startY: number;
  cancelled: boolean;
} | null;

type NearestTarget = {
  id: string;
  element: HTMLElement;
  distance: number;
};

type UseMagneticTapAssistOptions = {
  magnetRadiusPx?: number;
  forgivenessRadiusPx?: number;
  dragCancelThresholdPx?: number;
  onAssistTap?: (targetId: string) => void;
};

const DEFAULT_MAGNET_RADIUS_PX = 12;
const DEFAULT_FORGIVENESS_RADIUS_PX = 10;
const PRIORITY_RADIUS_BONUS_PX = 2;
const DEFAULT_DRAG_CANCEL_THRESHOLD_PX = 14;
const NATIVE_CLICK_SUPPRESS_MS = 150;
const HAPTIC_MS = 10;

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
  magnetRadiusPx: number,
  forgivenessRadiusPx: number,
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
    const forgiveness = forgivenessRadiusPx + priorityBonus;
    const magnet = magnetRadiusPx + priorityBonus;

    const rect = el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const distance = Math.hypot(clientX - centerX, clientY - centerY);

    const insideForgivenessBounds =
      clientX >= rect.left - forgiveness &&
      clientX <= rect.right + forgiveness &&
      clientY >= rect.top - forgiveness &&
      clientY <= rect.bottom + forgiveness;
    const insideMagnetRadius = distance <= magnet;
    if (!insideForgivenessBounds && !insideMagnetRadius) continue;

    if (nearest == null || distance < nearest.distance) {
      nearest = { id, element: el, distance };
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
        magnetRadiusPx,
        forgivenessRadiusPx,
      );
      if (!nearest) return;

      // Tap intent lock: lock nearest target from pointer-down until release.
      lockRef.current = {
        pointerId: e.pointerId,
        scope,
        targetId: nearest.id,
        startX: e.clientX,
        startY: e.clientY,
        cancelled: false,
      };
    },
    [forgivenessRadiusPx, magnetRadiusPx],
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
    [onAssistTap],
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

