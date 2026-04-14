"use client";

import { useState } from "react";

import { MatchPeriod } from "@pitchside/data-access";

import { MatchMode } from "@/components/match/MatchMode";

export function MobileMatchControls() {
  const [mode, setMode] = useState<MatchPeriod>(MatchPeriod.WARMUP);

  return (
    <MatchMode
      value={mode}
      onChange={setMode}
      className="mb-4 lg:hidden"
    />
  );
}
