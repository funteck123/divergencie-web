"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import { api, groupMatches } from "@/lib/client";

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

  async function load() {
    const bundle = await api(`/api/me?userId=${user.UserID}`);
    setData(bundle);
    const { scheduleItems } = await api("/api/schedule");
    const map = {};
    scheduleItems.forEach((s) => (map[s.ScheduleID] = s));
    setScheduleById(map);
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function book(scheduleId) {
    setError("");
    try {
      await api("/api/schedule/pick", {
        method: "POST",
        body: JSON.stringify({ scheduleId, userId: user.UserID, type: bookingTypeFor(user.UserType) }),
      });
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function submitTask(interviewId, link) {
    await api("/api/interview-task", { method: "POST", body: JSON.stringify({ interviewId, link }) });
    load();
  }

  async function acceptOffer(interviewId) {
    await api("/api/interview-offer", { method: "POST", body: JSON.stringify({ interviewId, action: "accept" }) });
    load();
  }

  if (!data) return <p style={{ color: "var(--muted)" }}>Loading…</p>;

  const eligibleServices = data.services.filter((s) => groupMatches(s.Group, INTERVIEW_GROUP[user.UserType] || "Staff"));
  const slotsForService = serviceId ? data.availableInterviewSlots.filter((s) => s.ServiceID === serviceId) : [];

  return (
    <div className="space-y-6">
      {error && <p style={{ color: "var(--bad)" }}>{error}</p>}

      <div className="card">
        <h2 className="font-semibold mb-4">My Interview</h2>
        {data.interviewItems.length === 0 && (
          <p style={{ color: "var(--muted)" }}>No interview booked yet — pick a slot below.</p>
        )}
        {data.interviewItems.map((it) => {
          const slot = scheduleById[it.ScheduleItemID];
          return (
            <div key={it.InterviewID} className="mb-3 pb-3" style={{ borderBottom: "1px solid var(--border)" }}>
              <p>
                {slot ? `${slot.Date} at ${slot.Time} with ${slot.Facilitator}` : it.ScheduleItemID}{" "}
                <span className="badge badge-info">{it.Status}</span>
              </p>

              {it.Status === "Pending" && (
                <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
                  Awaiting Management approval.
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
                  <button className="btn" onClick={() => acceptOffer(it.InterviewID)}>
                    Accept offer
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
        <h2 className="font-semibold mb-4">Available Interview Slots</h2>
        <select className="field mb-3" value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
          <option value="">Select a service…</option>
          {eligibleServices.map((s) => (
            <option key={s.ServiceID} value={s.ServiceID}>
              {s.Code ? `${s.Code} · ${s.Name}` : s.Name}
            </option>
          ))}
        </select>
        {serviceId && (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Instructor</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {slotsForService.map((s) => (
                <tr key={s.ScheduleID}>
                  <td>{s.Date}</td>
                  <td>{s.Time}</td>
                  <td>{s.Facilitator}</td>
                  <td>
                    <button className="btn" onClick={() => book(s.ScheduleID)}>
                      Book
                    </button>
                  </td>
                </tr>
              ))}
              {slotsForService.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ color: "var(--muted)" }}>
                    No open slots for this service right now — check back later.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function TaskForm({ onSubmit }) {
  const [link, setLink] = useState("");
  return (
    <form
      className="flex gap-2 mt-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (link.trim()) onSubmit(link);
      }}
    >
      <input className="field" placeholder="Link to your task submission…" value={link} onChange={(e) => setLink(e.target.value)} />
      <button className="btn" type="submit">
        Submit
      </button>
    </form>
  );
}
