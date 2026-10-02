"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiFetch } from "./client";

export interface AuditEntry {
  AuditID: string;
  Timestamp: string;
  ActorUserID?: string;
  Action: string;
  EntityType: string;
  EntityID?: string;
  Summary: string;
}

/** One page of the audit log. The previous page stays on screen while the next loads, so paging never blanks the table. */
export function useAuditLog(limit: number, offset: number, entityType: string, actorUserId: string) {
  return useQuery({
    queryKey: ["auditlog", limit, offset, entityType, actorUserId] as const,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const p = new URLSearchParams({ limit: String(limit), offset: String(offset) });
      if (entityType) p.set("entityType", entityType);
      if (actorUserId) p.set("actorUserId", actorUserId);
      return apiFetch<{ entries: AuditEntry[]; total: number }>(`/api/auditlog?${p}`);
    },
  });
}
