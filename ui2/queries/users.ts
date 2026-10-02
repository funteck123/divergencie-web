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

export interface CreateResult {
  user: UserRecord;
  credentials: Credentials;
}

/** POST /api/users. The reply has the credentials apart from the record, so they are joined the way GET /api/users does. */
export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch<CreateResult>("/api/users", { method: "POST", body }),
    onSuccess: (res) => {
      qc.setQueryData<UserRecord[]>(keys.users, (rows) => [...(rows ?? []), { ...res.user, Username: res.credentials.username, Password: res.credentials.password }]);
    },
  });
}

/** DELETE /api/users. Without `force` the server refuses an account that has history; `force` cascades after a backup. */
export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, force }: { userId: string; force: boolean }) => apiFetch<{ backupId?: string }>("/api/users", { method: "DELETE", body: { userId, force } }),
    onSuccess: (_res, { userId }) => {
      qc.setQueryData<UserRecord[]>(keys.users, (rows) => rows?.filter((u) => u.UserID !== userId));
    },
  });
}
