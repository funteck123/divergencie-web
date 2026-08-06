"use client";

import { useState } from "react";
import { api } from "@/lib/client";
import { formatDate } from "@/lib/formatDate";

// Self-service reschedule suggestion for a single ScheduleItem — shown
// wherever that occurrence already appears (schedule tables across every
// portal), never as a separate list. Three states: already rescheduled
// (Management approved, or set it directly) shows a plain badge; a pending
// request awaiting Management's approval shows what was requested; neither
// shows the "Suggest reschedule" button. See app/api/schedule/
// reschedule-requests/route.js for the approval flow.
export default function RescheduleControl({ slot, userId, pendingRequest, onSubmitted }) {
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [error, setError] = useState("");

  if (slot.RescheduledDate) {
    return (
      <span className="badge badge-info">
        Rescheduled → {formatDate(slot.RescheduledDate)} {slot.RescheduledTime}
      </span>
    );
  }

  if (pendingRequest) {
    return (
      <span className="badge badge-pending">
        Requested → {formatDate(pendingRequest.RequestedDate)} {pendingRequest.RequestedTime} (pending)
      </span>
    );
  }

  if (editing) {
    return (
      <div className="flex gap-2 items-center flex-wrap">
        <input className="field" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <input className="field" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        <button
          className="btn-ghost"
          onClick={async () => {
            setError("");
            try {
              await api("/api/schedule/reschedule-requests", {
                method: "POST",
                body: JSON.stringify({ scheduleId: slot.ScheduleID, userId, requestedDate: date, requestedTime: time }),
              });
              setEditing(false);
              onSubmitted?.();
            } catch (e) {
              setError(e.message);
            }
          }}
        >
          Send
        </button>
        <button className="btn-ghost" onClick={() => setEditing(false)}>
          Cancel
        </button>
        {error && <span style={{ color: "var(--bad)" }}>{error}</span>}
      </div>
    );
  }

  return (
    <button className="btn-ghost" onClick={() => setEditing(true)}>
      Suggest reschedule
    </button>
  );
}
