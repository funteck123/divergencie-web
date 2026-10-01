import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "./client";

/**
 * Query defaults tuned for a fast-feeling admin app:
 *  - data is "fresh" for 30 s, so switching tabs and reopening a record reads from memory instantly;
 *  - stale data is shown at once and refreshed in the background (stale-while-revalidate);
 *  - refetch when the window regains focus (cheap, keeps tabs honest);
 *  - never retry a client error (4xx): retrying a rejected request only delays the message.
 */
export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: true,
        retry: (failureCount, error) => !(error instanceof ApiError && error.status >= 400 && error.status < 500) && failureCount < 2,
      },
      mutations: { retry: false },
    },
  });
}
