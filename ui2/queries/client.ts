// Typed fetch wrapper for the new UI. It behaves exactly like the classic `api()` in lib/client.js, so the
// same endpoints, bodies, session cookie and error messages work in both UIs (parity rule).
//   - JSON requests get Content-Type: application/json; a FormData body must NOT (fetch sets the boundary).
//   - 401 (except /api/login) means the session died: forget the stored user, go to /login, never resolve.
//   - A failed request throws an Error whose message is the server's `error` text.

const USER_KEY = "dcp1_user"; // same key as lib/client.js

export class ApiError extends Error {
  readonly status: number;
  readonly path: string;
  constructor(message: string, status: number, path: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.path = path;
  }
}

export interface ApiOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  /** Plain objects are sent as JSON. A FormData body is sent untouched. */
  body?: unknown;
  signal?: AbortSignal;
  /** Retry once when the connection drops. Reads always do; set it on a POST that only reads or processes (never on one that creates something). */
  retry?: boolean;
}

function networkError(e: unknown, path: string): Error {
  if (e instanceof DOMException && e.name === "AbortError") return e;
  return new ApiError("Could not reach the server. Check your connection and try again.", 0, path);
}

export async function apiFetch<T = unknown>(path: string, options: ApiOptions = {}): Promise<T> {
  const { body, method = "GET", signal, retry = method === "GET" } = options;
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const init: RequestInit = { method };
  if (signal) init.signal = signal;
  if (!isFormData) init.headers = { "Content-Type": "application/json" };
  if (body !== undefined) init.body = isFormData ? (body as FormData) : typeof body === "string" ? body : JSON.stringify(body);

  let res: Response;
  try {
    res = await fetch(path, init);
  } catch (e) {
    // A dropped connection ("Failed to fetch") on a read is retried once; writes are never repeated on their own.
    if (!retry || (signal && signal.aborted)) throw networkError(e, path);
    try {
      await new Promise((r) => setTimeout(r, 800));
      res = await fetch(path, init);
    } catch (e2) {
      throw networkError(e2, path);
    }
  }

  if (res.status === 401 && path !== "/api/login" && typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(USER_KEY);
    } catch {
      /* storage can be blocked; the redirect still happens */
    }
    window.location.href = "/login";
    return new Promise<T>(() => {}); // navigation is in flight; never resolve
  }

  const data = (await res.json().catch(() => ({}))) as { error?: string } & Record<string, unknown>;
  if (!res.ok) throw new ApiError(data.error || `Request to ${path} failed`, res.status, path);
  return data as T;
}
