// A fake API for tests: replaces global fetch, answers from a route table, and records every request so a
// journey test can assert exactly what the UI sent (the parity check compares these recordings between UIs).

export interface RecordedRequest {
  method: string;
  url: string;
  body: unknown;
  headers: Record<string, string>;
}

export type Handler = (req: RecordedRequest) => { status?: number; json?: unknown } | unknown;

export interface FakeApi {
  requests: RecordedRequest[];
  restore: () => void;
}

/** routes: keys like "GET /api/users" or "PATCH /api/invoices". Unknown routes answer 404. */
export function installFakeApi(routes: Record<string, Handler | unknown>): FakeApi {
  const original = globalThis.fetch;
  const requests: RecordedRequest[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.pathname + input.search : input.url;
    const method = (init?.method || "GET").toUpperCase();
    const headers = Object.fromEntries(Object.entries((init?.headers as Record<string, string>) || {}));
    let body: unknown = undefined;
    if (typeof init?.body === "string") {
      try {
        body = JSON.parse(init.body);
      } catch {
        body = init.body;
      }
    } else if (init?.body) body = init.body;
    const req: RecordedRequest = { method, url, body, headers };
    requests.push(req);
    const route = routes[`${method} ${url.split("?")[0]}`];
    if (route === undefined) return new Response(JSON.stringify({ error: `No fake route for ${method} ${url}` }), { status: 404 });
    const out = typeof route === "function" ? (route as Handler)(req) : route;
    const isEnvelope = out !== null && typeof out === "object" && ("status" in (out as object) || "json" in (out as object));
    const status = isEnvelope ? (out as { status?: number }).status ?? 200 : 200;
    const json = isEnvelope ? (out as { json?: unknown }).json ?? {} : out;
    return new Response(JSON.stringify(json), { status, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;
  return { requests, restore: () => void (globalThis.fetch = original) };
}
