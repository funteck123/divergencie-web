"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import GuidesSection from "@/components/GuidesSection";
import { api, groupMatches } from "@/lib/client";
import { formatDate } from "@/lib/formatDate";

const INTERVIEW_ACC_TYPES = ["TeacherInterviewAcc", "StaffInterviewAcc", "AmbassadorInterviewAcc"];

// Each interview track only sees/books services open to its own Group —
// mirrors REQUIRED_GROUP in lib/scheduleGen.js (duplicated here rather than
// imported since that module pulls in lib/db.js's fs usage, which can't be
// bundled into a "use client" page).
const INTERVIEW_GROUP = { TeacherInterviewAcc: "Teacher", StaffInterviewAcc: "Staff", AmbassadorInterviewAcc: "Ambassador" };
function bookingTypeFor(userType) {
  return userType.replace(/Acc$/, "");
}

export default function InterviewDashboard() {
  return <DashboardShell allowedType={INTERVIEW_ACC_TYPES}>{(user) => <Body user={user} />}</DashboardShell>;
}

function Body({ user }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [scheduleById, setScheduleById] = useState({});
  const [serviceId, setServiceId] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [busyInterviewIds, setBusyInterviewIds] = useState(new Set());

  async function load() {
    const [bundle, { scheduleItems }] = await Promise.all([
      api(`/api/me?userId=${user.UserID}`),
      api("/api/schedule"),
    ]);
    setData(bundle);
    const map = {};
    scheduleItems.forEach((s) => (map[s.ScheduleID] = s));
    setScheduleById(map);
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // TKT-0021: no slot picker — this just records the request against a
  // Service. Management assigns the actual slot when approving it.
  async function requestInterview() {
    setError("");
    setRequesting(true);
    try {
      await api("/api/schedule/pick", {
        method: "POST",
        body: JSON.stringify({ serviceId, userId: user.UserID, type: bookingTypeFor(user.UserType) }),
      });
      setServiceId("");
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setRequesting(false);
    }
  }

  async function submitTask(interviewId, link) {
    await api("/api/interview-task", { method: "POST", body: JSON.stringify({ interviewId, link }) });
    load();
  }

  async function acceptOffer(interviewId) {
    setBusyInterviewIds((prev) => new Set(prev).add(interviewId));
    try {
      await api("/api/interview-offer", { method: "POST", body: JSON.stringify({ interviewId, action: "accept" }) });
      load();
    } finally {
      setBusyInterviewIds((prev) => {
        const next = new Set(prev);
        next.delete(interviewId);
        return next;
      });
    }
  }

  if (!data) return <p style={{ color: "var(--muted)" }}>Loading…</p>;

  const eligibleServices = data.services.filter((s) => groupMatches(s.Group, INTERVIEW_GROUP[user.UserType] || "Staff"));
  const requestedServiceIds = new Set(
    data.interviewItems.filter((it) => it.Status !== "Rejected").map((it) => it.ServiceID)
  );

  return (
    <div className="space-y-6">
      {error && <p style={{ color: "var(--bad)" }}>{error}</p>}

      <GuidesSection guides={data.guides} />

      <div className="card">
        <h2 className="font-semibold mb-4">My Interview</h2>
        {data.interviewItems.length === 0 && (
          <p style={{ color: "var(--muted)" }}>No interview requested yet — request one below.</p>
        )}
        {data.interviewItems.map((it) => {
          const slot = scheduleById[it.ScheduleItemID];
          const serviceName = data.services.find((s) => s.ServiceID === it.ServiceID)?.Name || it.ServiceID;
          return (
            <div key={it.InterviewID} className="mb-3 pb-3" style={{ borderBottom: "1px solid var(--border)" }}>
              <p>
                {serviceName}
                {/* TKT-0018: candidate sees the assigned date/time, not who's
                    interviewing them — same reasoning as the removed slot
                    picker (TKT-0021): instructor identity isn't the
                    candidate's decision to make or need to know in advance. */}
                {slot ? ` — ${formatDate(slot.Date)} at ${slot.Time}` : ""}{" "}
                <span className="badge badge-info">{it.Status}</span>
              </p>

              {it.Status === "Pending" && (
                <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
                  Awaiting Management approval — a slot will be assigned when approved.
                </p>
              )}
              {it.Status === "Rejected" && (
                <p className="text-sm mt-1" style={{ color: "var(--bad)" }}>
                  This request was rejected.
                </p>
              )}
              {it.Status === "Waitlisted" && (
                <p className="text-sm mt-1" style={{ color: "var(--warn)" }}>
                  You&apos;ve been added to the waitlist — Management will follow up.
                </p>
              )}
              {it.Status === "Scheduled" && (
                <TaskForm onSubmit={(link) => submitTask(it.InterviewID, link)} />
              )}
              {it.Status === "TaskSubmitted" && (
                <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
                  Task submitted — waiting on Management to send an offer.
                </p>
              )}
              {it.TaskFeedback && ["OfferSent", "OfferAccepted", "Waitlisted", "Rejected"].includes(it.Status) && (
                <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
                  Management feedback on your task: {it.TaskFeedback}
                </p>
              )}
              {it.Status === "OfferSent" && (
                <div className="mt-2 flex gap-2 items-center">
                  {it.OfferLetterLink && (
                    <a className="btn-ghost" href={it.OfferLetterLink} target="_blank" rel="noreferrer">
                      Open offer letter
                    </a>
                  )}
                  <button
                    className="btn"
                    disabled={busyInterviewIds.has(it.InterviewID)}
                    onClick={() => acceptOffer(it.InterviewID)}
                  >
                    {busyInterviewIds.has(it.InterviewID) ? "Accepting…" : "Accept offer"}
                  </button>
                </div>
              )}
              {it.Status === "OfferAccepted" && (
                <div className="mt-1">
                  {it.OfferLetterLink && (
                    <a className="btn-ghost" href={it.OfferLetterLink} target="_blank" rel="noreferrer">
                      Open offer letter
                    </a>
                  )}
                  <p className="text-sm mt-1" style={{ color: "var(--good)" }}>
                    Offer accepted — Management will convert you to a{" "}
                    {user.UserType === "AmbassadorInterviewAcc" ? "n Ambassador" : " Staff"} account shortly.
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="card">
        <h2 className="font-semibold mb-4">Request an Interview</h2>
        <p className="text-sm mb-3" style={{ color: "var(--muted)" }}>
          Pick the service you&apos;re interviewing for. No need to choose a time — Management will assign you a
          slot once your request is approved.
        </p>
        <div className="flex gap-2">
          <select className="field" value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
            <option value="">Select a service…</option>
            {eligibleServices.map((s) => (
              <option key={s.ServiceID} value={s.ServiceID} disabled={requestedServiceIds.has(s.ServiceID)}>
                {s.Code ? `${s.Code} · ${s.Name}` : s.Name}
                {requestedServiceIds.has(s.ServiceID) ? " (already requested)" : ""}
              </option>
            ))}
          </select>
          <button className="btn" disabled={!serviceId || requesting} onClick={requestInterview}>
            {requesting ? "Requesting…" : "Request Interview"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TaskForm({ onSubmit }) {
  const [link, setLink] = useState("");
  const [saving, setSaving] = useState(false);
  return (
    <form
      className="flex gap-2 mt-2"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!link.trim()) return;
        setSaving(true);
        try {
          await onSubmit(link);
        } finally {
          setSaving(false);
        }
      }}
    >
      <input className="field" placeholder="Link to your task submission…" value={link} onChange={(e) => setLink(e.target.value)} />
      <button className="btn" type="submit" disabled={saving}>
        {saving ? "Submitting…" : "Submit"}
      </button>
    </form>
  );
}
