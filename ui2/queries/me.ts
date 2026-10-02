"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./client";
import type { MeBundle } from "./types";

/** The signed-in person's own bundle (profile, enrollments, schedule, bills, guides). Same cache key the pipeline uses per account. */
export function useMe(userId: string) {
  return useQuery({ queryKey: ["me", userId] as const, queryFn: () => apiFetch<MeBundle>(`/api/me?userId=${userId}`) });
}

/** Reload the bundle after a change that has side effects the page cannot compute (attendance, reschedule, payment). */
export function useReloadMe(userId: string) {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["me", userId] });
}
