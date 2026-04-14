"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { FloatingUtilityStrip } from "@/components/ui/FloatingUtilityStrip";
import { SimulatorBoardShell } from "@src/features/simulator/simulator-board-shell";

/** Same heuristic as `POST /api/events` `matchId` (CUID). */
function isPersistableMatchId(raw: string | null): raw is string {
  if (raw == null || raw.length < 20) return false;
  return /^c[a-z0-9]{20,}$/i.test(raw);
}

type UtilityPitchType = "soccer" | "gaelic" | "hurling";

export default function SimulatorPageClient() {
  const sp = useSearchParams();
  const mode = sp.get("mode");
  const matchIdRaw = sp.get("matchId");
  const initialSurfaceMode = mode === "stats" ? "STATS" : "SIMULATOR";
  const linkedMatchId = isPersistableMatchId(matchIdRaw) ? matchIdRaw : null;
  const [surfaceMode, setSurfaceMode] = useState<"SIMULATOR" | "STATS">(
    initialSurfaceMode,
  );
  const [pitchType, setPitchType] = useState<UtilityPitchType>("gaelic");
  const [eventFilterEnabled, setEventFilterEnabled] = useState(false);
  const [reviewModeLabel, setReviewModeLabel] = useState<"HT" | "FT">("HT");
  const [voicePulse, setVoicePulse] = useState(false);
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    document.documentElement.classList.add("simulator-route");
    document.body.classList.add("simulator-route");
    return () => {
      document.documentElement.classList.remove("simulator-route");
      document.body.classList.remove("simulator-route");
    };
  }, []);

  const clickShellButton = useCallback((label: string): boolean => {
    const shell = hostRef.current?.querySelector(".simulator-shell");
    if (!shell) return false;
    const normalizedTarget = label.trim().toLowerCase();
    const buttons = Array.from(shell.querySelectorAll<HTMLButtonElement>("button"));
    const exact = buttons.find(
      (btn) => btn.textContent?.trim().toLowerCase() === normalizedTarget,
    );
    if (exact) {
      exact.click();
      return true;
    }
    const contains = buttons.find((btn) =>
      btn.textContent?.trim().toLowerCase().includes(normalizedTarget),
    );
    if (contains) {
      contains.click();
      return true;
    }
    return false;
  }, []);

  const onModeChange = useCallback(
    (nextMode: "SIMULATOR" | "STATS") => {
      setSurfaceMode(nextMode);
      if (!clickShellButton(nextMode === "SIMULATOR" ? "sim" : "stats")) {
        clickShellButton(nextMode === "SIMULATOR" ? "simulator" : "stats");
      }
    },
    [clickShellButton],
  );

  const onPitchTypeChange = useCallback(
    (nextPitch: UtilityPitchType) => {
      setPitchType(nextPitch);
      const label =
        nextPitch === "soccer"
          ? "soccer"
          : nextPitch === "gaelic"
            ? "gaelic"
            : "hurling";
      clickShellButton(label);
    },
    [clickShellButton],
  );

  const onToggleRecordPath = useCallback(() => {
    if (!clickShellButton("path")) {
      clickShellButton("record path");
    }
  }, [clickShellButton]);

  const onToggleShadowLine = useCallback(() => {
    if (!clickShellButton("shadow")) {
      clickShellButton("shadow line");
    }
  }, [clickShellButton]);

  const onToggleEventFilter = useCallback(() => {
    setEventFilterEnabled((prev) => {
      const next = !prev;
      clickShellButton(next ? "shot" : "all");
      return next;
    });
  }, [clickShellButton]);

  const onToggleReviewMode = useCallback(() => {
    setReviewModeLabel((prev) => {
      const next = prev === "HT" ? "FT" : "HT";
      clickShellButton(next === "HT" ? "review · ht" : "review · ft");
      return next;
    });
  }, [clickShellButton]);

  const onVoiceNoteTrigger = useCallback(() => {
    setVoicePulse(true);
    window.setTimeout(() => setVoicePulse(false), 180);
  }, []);

  return (
    <div
      ref={hostRef}
      className="floating-utility-layout relative h-[100dvh] min-h-0 w-full overflow-hidden"
    >
      <SimulatorBoardShell
        initialSurfaceMode={initialSurfaceMode}
        linkedMatchId={linkedMatchId}
      />
      <FloatingUtilityStrip
        mode={surfaceMode}
        pitchType={pitchType}
        eventFilterEnabled={eventFilterEnabled}
        reviewModeLabel={reviewModeLabel}
        voicePulse={voicePulse}
        onPlay={() => clickShellButton("play")}
        onPause={() => clickShellButton("pause")}
        onReset={() => clickShellButton("reset")}
        onModeChange={onModeChange}
        onPitchTypeChange={onPitchTypeChange}
        onToggleRecordPath={onToggleRecordPath}
        onToggleShadowLine={onToggleShadowLine}
        onExportPng={() => clickShellButton("export")}
        onToggleEventFilter={onToggleEventFilter}
        onToggleReviewMode={onToggleReviewMode}
        onVoiceNoteTrigger={onVoiceNoteTrigger}
      />
      <style jsx global>{`
        .floating-utility-layout .simulator-shell {
          height: 100dvh !important;
          overflow: hidden !important;
        }

        .floating-utility-layout .simulator-shell > header {
          display: none !important;
        }

        .floating-utility-layout .simulator-shell-main {
          height: 100dvh !important;
          padding: 0.35rem !important;
          gap: 0.35rem !important;
          overflow: hidden !important;
        }

        .floating-utility-layout .simulator-shell-main > aside {
          display: none !important;
        }

        .floating-utility-layout .simulator-pitch-stack {
          flex: 1 1 auto !important;
          justify-content: center !important;
        }

        .floating-utility-layout .simulator-pitch-stack > p {
          display: none !important;
        }

        .floating-utility-layout .simulator-pitch-stage {
          height: 100% !important;
        }

        .floating-utility-layout .simulator-pitch-frame {
          padding: 0.25rem !important;
        }

        .floating-utility-layout .simulator-pitch-frame-inner {
          padding: 0 !important;
        }

        .floating-utility-layout .simulator-pitch-wrapper {
          padding: 0.25rem !important;
        }

        .floating-utility-layout .simulator-pitch-host {
          min-height: 70dvh !important;
          max-height: 84dvh !important;
        }
      `}</style>
    </div>
  );
}
