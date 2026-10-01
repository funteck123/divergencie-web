import type { QueryClient, QueryKey } from "@tanstack/react-query";

/**
 * Optimistic update for a small edit: change the cached value now, return a function that puts the old value
 * back if the request fails. Cancels in-flight refetches of the key first so they cannot overwrite the change.
 *
 *   const rollback = await applyOptimistic(qc, keys.users, (rows) => rows.map(...));
 *   try { await save(); } catch (e) { rollback(); throw e; }
 */
export async function applyOptimistic<T>(qc: QueryClient, key: QueryKey, update: (current: T) => T): Promise<() => void> {
  await qc.cancelQueries({ queryKey: key });
  const previous = qc.getQueryData<T>(key);
  if (previous !== undefined) qc.setQueryData<T>(key, update(previous));
  return () => {
    if (previous !== undefined) qc.setQueryData<T>(key, previous);
  };
}
