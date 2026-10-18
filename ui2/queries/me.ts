"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./client";
import type { MeBundle } from "./types";

/** The signed-in person's own bundle (profile, enrollments, schedule, bills, guides). Same cache key the pipeline uses per account. */
export function useMe(userId: string) {
  return useQuery({
    queryKey: ["me", userId] as const,
    queryFn: async () => {
      const bundle = await apiFetch<MeBundle>(`/api/me?userId=${userId}`);
      // A reply without the person in it (a server hiccup, an old cache) must show as a load error, not crash every card that reads user.
      if (!bundle || typeof bundle !== "object" || !bundle.user) throw new Error("The server sent an incomplete reply. Reload the page.");
      return bundle;
    },
  });
}

/** Reload the bundle after a change that has side effects the page cannot compute (attendance, reschedule, payment). */
export function useReloadMe(userId: string) {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["me", userId] });
}
