"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./client";
import { keys } from "./keys";
import type { ServiceRecord } from "./types";

export function useServices() {
  return useQuery({
    queryKey: keys.services,
    queryFn: async () => (await apiFetch<{ services: ServiceRecord[] }>("/api/services")).services,
  });
}

/** Create (no serviceId) or save (serviceId, wholesale PATCH: the body must carry the whole tree). The reply replaces the cached record. */
export function useSaveService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ serviceId, body }: { serviceId?: string; body: Record<string, unknown> }) =>
      (await apiFetch<{ service: ServiceRecord }>("/api/services", { method: serviceId ? "PATCH" : "POST", body: serviceId ? { serviceId, ...body } : body })).service,
    onSuccess: (service, { serviceId }) => {
      qc.setQueryData<ServiceRecord[]>(keys.services, (rows) => (serviceId ? rows?.map((s) => (s.ServiceID === service.ServiceID ? service : s)) : [...(rows ?? []), service]));
    },
  });
}

/** The server refuses a service that any enrollment ever referenced; its message reaches the caller. */
export function useDeleteService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (serviceId: string) => apiFetch("/api/services", { method: "DELETE", body: { serviceId } }),
    onSuccess: (_r, serviceId) => {
      qc.setQueryData<ServiceRecord[]>(keys.services, (rows) => rows?.filter((s) => s.ServiceID !== serviceId));
    },
  });
}
