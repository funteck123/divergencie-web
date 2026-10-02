"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./client";
import { keys } from "./keys";
import { applyOptimistic } from "./optimistic";
import type { Credentials, UserRecord } from "./types";

/** All accounts. One cached list feeds every Accounts view; changes patch it in place (no refetch needed). */
export function useUsers() {
  return useQuery({
    queryKey: keys.users,
    queryFn: async () => (await apiFetch<{ users: UserRecord[] }>("/api/users")).users,
  });
}

export interface PatchResult {
  user: UserRecord;
  credentials?: Credentials;
}

/**
 * PATCH /api/users for one account. The reply is the raw record without the credential join, so the cached
 * Username/Password carry over unless this save touched them (same rule as the classic Accounts tab).
 * `optimistic` shows the change at once and rolls it back if the server refuses.
 */
export function usePatchUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, fields }: { userId: string; fields: Record<string, unknown>; optimistic?: Record<string, unknown> }) =>
      apiFetch<PatchResult>("/api/users", { method: "PATCH", body: { userId, ...fields } }),
    onMutate: async ({ userId, optimistic }) => {
      if (!optimistic) return { rollback: () => {} };
      const rollback = await applyOptimistic<UserRecord[]>(qc, keys.users, (rows) => rows.map((u) => (u.UserID === userId ? { ...u, ...optimistic } : u)));
      return { rollback };
    },
    onError: (_err, _vars, ctx) => ctx?.rollback(),
    onSuccess: (res, { userId, fields }) => {
      qc.setQueryData<UserRecord[]>(keys.users, (rows) =>
        rows?.map((u) =>
          u.UserID === userId
            ? {
                ...res.user,
                Username: fields.username !== undefined ? (fields.username as string) : u.Username,
                Password: fields.password !== undefined ? (fields.password as string) : u.Password,
              }
            : u,
        ),
      );
    },
  });
}
