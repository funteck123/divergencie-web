"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, setCurrentUser } from "@/lib/client";
import { newUiAvailableFor, newUiHome } from "@/lib/uiPreference";

// The one switch for the whole portal (TKT-0322): "New UI (Beta)" in the classic header. Shown only for
// account types the new UI exists for. It saves the choice, then opens the new UI.
export default function UiSwitchButton({ user }) {
  const router = useRouter();
  const [state, setState] = useState("idle"); // idle | busy | failed
  if (!user || !newUiAvailableFor(user.UserType)) return null;

  async function open() {
    setState("busy");
    try {
      await api("/api/me/ui-preference", { method: "PATCH", body: JSON.stringify({ preference: "next" }) });
      setCurrentUser({ ...user, UiPreference: "next" });
      router.push(newUiHome());
    } catch {
      setState("failed");
    }
  }

  return (
    <button className="btn-ghost" onClick={open} disabled={state === "busy"} title="Opens the experimental new UI. You can switch back at any time.">
      {state === "busy" ? "Opening…" : state === "failed" ? "Could not switch, try again" : "New UI (Beta)"}
    </button>
  );
}
