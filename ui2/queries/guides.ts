"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./client";
import type { GuideRecord } from "./types";

const GUIDES = ["guides"] as const;
const TOGGLES = ["resource-toggles"] as const;
const MCQ = ["mcq-config"] as const;

export function useGuides() {
  return useQuery({ queryKey: GUIDES, queryFn: async () => (await apiFetch<{ guides: GuideRecord[] }>("/api/guides")).guides });
}
export function useCreateGuide() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { name: string; url: string; userTypes: string[] }) => (await apiFetch<{ guide: GuideRecord }>("/api/guides", { method: "POST", body })).guide,
    onSuccess: (g) => qc.setQueryData<GuideRecord[]>(GUIDES, (rows) => [...(rows ?? []), g]),
  });
}
export function useUpdateGuide() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ guideId, patch }: { guideId: string; patch: { name: string; url: string; userTypes: string[] } }) => (await apiFetch<{ guide: GuideRecord }>("/api/guides", { method: "PATCH", body: { guideId, ...patch } })).guide,
    onSuccess: (g) => qc.setQueryData<GuideRecord[]>(GUIDES, (rows) => rows?.map((x) => (x.GuideID === g.GuideID ? g : x))),
  });
}
export function useDeleteGuide() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (guideId: string) => apiFetch("/api/guides", { method: "DELETE", body: { guideId } }),
    onSuccess: (_r, id) => qc.setQueryData<GuideRecord[]>(GUIDES, (rows) => rows?.filter((x) => x.GuideID !== id)),
  });
}

export type Toggles = Record<string, boolean>;
export function useResourceToggles() {
  return useQuery({ queryKey: TOGGLES, queryFn: async () => (await apiFetch<{ toggles: Toggles }>("/api/resource-toggles")).toggles });
}
/** Flip one Resources button for every student. Optimistic: the switch moves at once and snaps back if the server refuses. */
export function useFlipToggle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: boolean }) => (await apiFetch<{ toggles: Toggles }>("/api/resource-toggles", { method: "PATCH", body: { [key]: value } })).toggles,
    onMutate: async ({ key, value }) => {
      await qc.cancelQueries({ queryKey: TOGGLES });
      const prev = qc.getQueryData<Toggles>(TOGGLES);
      qc.setQueryData<Toggles>(TOGGLES, (t) => ({ ...(t ?? {}), [key]: value }));
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(TOGGLES, ctx.prev),
    onSuccess: (toggles) => qc.setQueryData(TOGGLES, toggles),
  });
}

export function useMcqConfig() {
  return useQuery({ queryKey: MCQ, queryFn: async () => (await apiFetch<{ url?: string }>("/api/mcq-config")).url ?? "" });
}
export function useSaveMcqConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (url: string) => (await apiFetch<{ url: string }>("/api/mcq-config", { method: "PATCH", body: { url } })).url,
    onSuccess: (url) => qc.setQueryData(MCQ, url),
  });
}
