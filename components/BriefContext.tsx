"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

type BriefValue = {
  /** The assembled brief, ready to drop into the contact form. */
  brief: string;
  setBrief: (value: string) => void;
};

const BriefCtx = createContext<BriefValue | null>(null);

/**
 * Carries the finished brief from the builder down to the contact form, so
 * someone who fills in the template doesn't then retype it all.
 */
export function BriefProvider({ children }: { children: React.ReactNode }) {
  const [brief, setBriefState] = useState("");
  const setBrief = useCallback((value: string) => setBriefState(value), []);
  const value = useMemo(() => ({ brief, setBrief }), [brief, setBrief]);

  return <BriefCtx.Provider value={value}>{children}</BriefCtx.Provider>;
}

export function useBrief() {
  const ctx = useContext(BriefCtx);
  if (!ctx) throw new Error("useBrief must be used inside <BriefProvider>");
  return ctx;
}
