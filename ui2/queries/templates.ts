"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./client";
import type { TemplateRecord } from "./types";

const TEMPLATES = ["templates"] as const;
const byName = (rows: TemplateRecord[]) => [...rows].sort((a, b) => a.Name.localeCompare(b.Name, undefined, { sensitivity: "base" }));

/** Management, Staff and Teachers may read. Anyone else gets a 403, which shows as the error. */
export function useTemplates() {
  return useQuery({ queryKey: TEMPLATES, retry: false, queryFn: async () => (await apiFetch<{ templates: TemplateRecord[] }>("/api/templates")).templates });
}
export function useSaveTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ templateId, name, body }: { templateId?: string; name: string; body: string }) =>
      (await apiFetch<{ template: TemplateRecord }>("/api/templates", { method: templateId ? "PATCH" : "POST", body: { templateId, name, body } })).template,
    onSuccess: (t) =>
      qc.setQueryData<TemplateRecord[]>(TEMPLATES, (rows) => byName([...(rows ?? []).filter((x) => x.TemplateID !== t.TemplateID), t])),
  });
}
export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (templateId: string) => apiFetch("/api/templates", { method: "DELETE", body: { templateId } }),
    onSuccess: (_r, id) => qc.setQueryData<TemplateRecord[]>(TEMPLATES, (rows) => rows?.filter((x) => x.TemplateID !== id)),
  });
}
