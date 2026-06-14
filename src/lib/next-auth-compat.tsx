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

export async function signOut() {
  await fetch("/api/auth/logout", { method: "POST" });
  window.location.href = "/auth/login";
}

export async function signIn() {
  window.location.href = "/auth/login";
}

export interface NextAuthConfig {}
