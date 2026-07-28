"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, logout, api } from "@/lib/client";

// Generic "raise an issue" ticket — sender info is always the logged-in
// session (never freeform), so this is the same form/logic for every
// account type. Rendered from DashboardShell so it shows up on every
// portal (including Trial/Interview) without each page needing its own copy.
function ReportIssueButton() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [status, setStatus] = useState(""); // "", "sending", "sent", error message

  async function submit() {
    if (!message.trim()) return;
    setStatus("sending");
    try {
      await api("/api/tickets", { method: "POST", body: JSON.stringify({ message, attachmentUrl }) });
      setStatus("sent");
      setMessage("");
      setAttachmentUrl("");
    } catch (e) {
      setStatus(e.message);
    }
  }

  function close() {
    setOpen(false);
    setStatus("");
  }

  return (
    <>
      <button className="btn-ghost" onClick={() => setOpen(true)}>
        Report an Issue
      </button>
      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
          onClick={close}
        >
          <div
            className="card"
            style={{ width: "min(480px, 90vw)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold mb-3">Report an Issue</h3>
            {status === "sent" ? (
              <div className="space-y-3">
                <p style={{ color: "var(--muted)" }}>Sent — thanks, Management will take a look.</p>
                <button className="btn" onClick={close}>Close</button>
              </div>
            ) : (
              <div className="space-y-3">
                <textarea
                  className="field"
                  rows={4}
                  placeholder="What went wrong?"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
                <input
                  className="field"
                  placeholder="Attachment URL (optional — screenshot, doc, etc.)"
                  value={attachmentUrl}
                  onChange={(e) => setAttachmentUrl(e.target.value)}
                />
                {status && status !== "sending" && <p style={{ color: "var(--bad)" }}>{status}</p>}
                <div className="flex gap-2 justify-end">
                  <button className="btn-ghost" onClick={close}>Cancel</button>
                  <button className="btn" disabled={!message.trim() || status === "sending"} onClick={submit}>
                    {status === "sending" ? "Sending…" : "Send"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default function DashboardShell({ allowedType, children }) {
  const router = useRouter();
  const [user, setUser] = useState(undefined); // undefined = checking, null = none

  useEffect(() => {
    const u = getCurrentUser();
    const allowed = Array.isArray(allowedType) ? allowedType.includes(u?.UserType) : u?.UserType === allowedType;
    if (!u || !allowed) {
      router.replace("/login");
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
        <div className="flex items-center gap-2">
          <ReportIssueButton />
          <button
            className="btn-ghost"
            onClick={() => {
              logout();
              router.push("/login");
            }}
          >
            Sign out
          </button>
        </div>
      </header>
      <div className="p-6 max-w-6xl mx-auto">{children(user)}</div>
    </main>
  );
}
