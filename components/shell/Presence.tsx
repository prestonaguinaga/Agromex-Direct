"use client";

import { useEffect } from "react";
import { touchLastSeen } from "@/lib/data/team";

/** Stamps profiles.last_seen_at once per page load (shows on the Team sheet). */
export function Presence({ userId }: { userId: string }) {
  useEffect(() => {
    touchLastSeen(userId);
  }, [userId]);
  return null;
}
