"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, logout } from "@/lib/client";

export default function DashboardShell({ allowedType, children }) {
  const router = useRouter();
  const [user, setUser] = useState(undefined); // undefined = checking, null = none

  useEffect(() => {
    const u = getCurrentUser();
    const allowed = Array.isArray(allowedType) ? allowedType.includes(u?.UserType) : u?.UserType === allowedType;
    if (!u || !allowed) {
      router.replace("/");
      return;
    }
    setUser(u);
  }, [allowedType, router]);

  if (user === undefined) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p style={{ color: "var(--muted)" }}>Loading…</p>
      </main>
    );
  }
  if (!user) return null;

  return (
    <main className="min-h-screen">
      <header
        className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div>
          <div className="text-xs tracking-widest uppercase" style={{ color: "var(--muted)" }}>
            DCP1 · {user.UserType}
          </div>
          <div className="font-semibold">{user.Name}</div>
        </div>
        <button
          className="btn-ghost"
          onClick={() => {
            logout();
            router.push("/");
          }}
        >
          Sign out
        </button>
      </header>
      <div className="p-6 max-w-6xl mx-auto">{children(user)}</div>
    </main>
  );
}
