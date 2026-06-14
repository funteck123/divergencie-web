"use client";

import { createBrowserClient } from "@supabase/ssr";
import React, { createContext, useContext, useEffect, useState } from "react";

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface SessionUser {
  id: string;
  email: string;
  role: string;
  dept?: string | null;
  name?: string | null;
  subGroup?: string | null;
  supervisor?: boolean;
}

interface SessionData {
  user: SessionUser;
}

const SessionContext = createContext<{
  data: SessionData | null;
  status: "authenticated" | "unauthenticated" | "loading";
  update: () => Promise<SessionData | null>;
}>({
  data: null,
  status: "loading",
  update: async () => null,
});

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<SessionData | null>(null);
  const [status, setStatus] = useState<"authenticated" | "unauthenticated" | "loading">("loading");

  const fetchSession = async (): Promise<SessionData | null> => {
    try {
      const res = await fetch("/api/auth/session");
      if (res.ok) {
        const session = await res.json();
        if (session?.user) {
          setData(session);
          setStatus("authenticated");
          return session;
        }
      }
      setData(null);
      setStatus("unauthenticated");
    } catch {
      setData(null);
      setStatus("unauthenticated");
    }
    return null;
  };

  useEffect(() => {
    fetchSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        await fetchSession();
      } else if (event === "SIGNED_OUT") {
        setData(null);
        setStatus("unauthenticated");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <SessionContext.Provider value={{ data, status, update: fetchSession }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}

export async function signOut(options?: { callbackUrl?: string }) {
  await fetch("/api/auth/logout", { method: "POST" });
  await supabase.auth.signOut();
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
        // Also sign in browser-side so the client auth state is initialized
        await supabase.auth.signInWithPassword({ email, password });
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
  } else if (provider === "google") {
    const redirectTo = `${window.location.origin}/api/auth/callback${
      options?.callbackUrl ? `?next=${encodeURIComponent(options.callbackUrl)}` : ""
    }`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
      },
    });
    return { error: error?.message || null };
  }
  window.location.href = "/auth/login";
  return { error: null };
}
