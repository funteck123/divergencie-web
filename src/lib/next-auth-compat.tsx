import React, { createContext, useContext, useEffect, useState } from "react";

const SessionContext = createContext<{
  data: any;
  status: "authenticated" | "unauthenticated" | "loading";
  update: () => Promise<any>;
}>({
  data: null,
  status: "loading",
  update: async () => { return null; },
});

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<any>(null);
  const [status, setStatus] = useState<"authenticated" | "unauthenticated" | "loading">("loading");

  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch("/api/auth/session");
        if (res.ok) {
          const session = await res.json();
          if (session?.user) {
            setData(session);
            setStatus("authenticated");
          } else {
            setStatus("unauthenticated");
          }
        } else {
          setStatus("unauthenticated");
        }
      } catch {
        setStatus("unauthenticated");
      }
    }
    fetchSession();
  }, []);

  return (
    <SessionContext.Provider value={{ data, status, update: async () => { return null; } }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}

export async function signOut(options?: { callbackUrl?: string }) {
  await fetch("/api/auth/logout", { method: "POST" });
  window.location.href = options?.callbackUrl || "/auth/login";
}

export async function signIn(provider?: string, options?: any) {
  if (provider === "credentials" && options) {
    const { email, password } = options;
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        if (options.redirect !== false) {
          window.location.href = options.callbackUrl || "/portal";
        }
        return { error: null };
      } else {
        const errData = await res.json();
        return { error: errData.error || "Login failed" };
      }
    } catch (e: any) {
      return { error: e.message || "Login failed" };
    }
  }
  window.location.href = "/auth/login";
  return { error: null };
}

export interface NextAuthConfig {}
