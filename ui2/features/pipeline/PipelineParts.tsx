"use client";

import { useState } from "react";
import { formatDate } from "@/lib/formatDate";
import { normalizeTimezone, tzAbbrFor } from "@/lib/timezones";
import { Badge } from "@/ui2/components/Badge";
import { Button } from "@/ui2/components/Button";
import { Combobox } from "@/ui2/components/Combobox";
import { Field, TextInput } from "@/ui2/components/Field";
import type { InterviewItem } from "./pipelineLogic";
import type { ScheduleItem } from "@/ui2/queries/types";
import "./pipeline.css";

/** The line of steps with the current one in bold and finished ones in green. A dead end (rejected, waitlisted) replaces the line. */
export function StepIndicator({ steps, currentIndex, deadEnd }: { steps: readonly string[]; currentIndex: number; deadEnd?: string | null }) {
  if (deadEnd) return <Badge kind="error">{deadEnd}</Badge>;
  return (
    <ol className="u2-steps" aria-label={`Step ${currentIndex + 1} of ${steps.length}: ${steps[currentIndex]}`}>
      {steps.map((label, i) => (
        <li key={label} className={i < currentIndex ? "u2-steps__done" : i === currentIndex ? "u2-steps__now" : "u2-steps__next"} aria-current={i === currentIndex ? "step" : undefined}>
          {label}
        </li>
      ))}
    </ol>
  );
}

/** Pick an open slot for the service, or make a new one, and approve the request in the same step. */
export function SlotAssign({ serviceId, openSlots, onApprove, onCreateAndApprove }: { serviceId: string; openSlots: readonly ScheduleItem[]; onApprove: (scheduleId: string) => Promise<void>; onCreateAndApprove: (date: string, time: string, duration: number | string, facilitator: string) => Promise<void> }) {
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [scheduleId, setScheduleId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState<number | string>(1);
  const [facilitator, setFacilitator] = useState("");
  const [saving, setSaving] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const candidates = openSlots.filter((s) => s.ServiceID === serviceId && s.Date >= today);
  const run = async (work: () => Promise<void>) => {
    setSaving(true);
    try {
      await work();
    } finally {
      setSaving(false);
    }
  };

  if (mode === "existing")
    return (
      <div className="u2-inline" style={{ flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ minWidth: 230, flex: 1 }}>
          <Combobox aria-label="Open slot" value={scheduleId} onChange={setScheduleId} placeholder="Select an open slot…" options={candidates.map((s) => ({ value: s.ScheduleID, label: `${formatDate(s.Date) as string} at ${s.Time} ${tzAbbrFor(s.Date, normalizeTimezone(s.Timezone))}${s.BatchName ? ` · ${s.BatchName as string}` : ""} (${s.Facilitator || "no instructor set"})` }))} />
        </div>
        <Button size="sm" variant="primary" loading={saving} disabled={!scheduleId} disabledReason="Select a slot first." onClick={() => void run(() => onApprove(scheduleId))}>Approve</Button>
        <Button size="sm" variant="ghost" onClick={() => setMode("new")}>+ New slot instead</Button>
        {candidates.length === 0 && <span className="u2-muted">No open slots for this service yet.</span>}
      </div>
    );
  return (
    <div className="u2-inline" style={{ flexWrap: "wrap", alignItems: "end" }}>
      <Field label="Date"><TextInput type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      <Field label="Time"><TextInput type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
      <Field label="Hours"><TextInput type="number" step="0.5" min="0.5" value={duration} onChange={(e) => setDuration(e.target.value)} /></Field>
      <Field label="Instructor"><TextInput value={facilitator} onChange={(e) => setFacilitator(e.target.value)} /></Field>
      <Button size="sm" variant="primary" loading={saving} disabled={!date || !time} disabledReason="Choose a date and a time first." onClick={() => void run(() => onCreateAndApprove(date, time, duration, facilitator))}>Create &amp; Approve</Button>
      {candidates.length > 0 && <Button size="sm" variant="ghost" onClick={() => setMode("existing")}>Use existing slot instead</Button>}
    </div>
  );
}

/** After the task is submitted: feedback, the offer letter link, then send the offer, waitlist or reject. */
export function OutcomeForm({ initialFeedback, initialLink, onSendOffer, onWaitlist, onReject }: { initialFeedback?: string; initialLink?: string; onSendOffer: (feedback: string, link: string) => Promise<void>; onWaitlist: (feedback: string) => Promise<void>; onReject: (feedback: string) => Promise<void> }) {
  const [feedback, setFeedback] = useState(initialFeedback || "");
  const [link, setLink] = useState(initialLink || "");
  const [saving, setSaving] = useState(false);
  const run = async (work: () => Promise<void>) => {
    setSaving(true);
    try {
      await work();
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="u2-rows">
      <Field label="Feedback on task"><TextInput value={feedback} onChange={(e) => setFeedback(e.target.value)} /></Field>
      <Field label="Offer letter link"><TextInput value={link} onChange={(e) => setLink(e.target.value)} /></Field>
      <div className="u2-rowactions">
        <Button size="sm" variant="primary" loading={saving} disabled={!link.trim()} disabledReason="Add the offer letter link first." onClick={() => void run(() => onSendOffer(feedback, link))}>Send offer</Button>
        <Button size="sm" variant="ghost" disabled={saving} onClick={() => void run(() => onWaitlist(feedback))}>Waitlist</Button>
        <Button size="sm" variant="ghost" className="u2-danger-text" disabled={saving} onClick={() => void run(() => onReject(feedback))}>Reject</Button>
      </div>
    </div>
  );
}

/** An offer already sent: edit feedback or the letter link, or take the offer back. */
export function OfferSentControls({ item, onSave, onUnsend }: { item: InterviewItem; onSave: (feedback: string, link: string) => Promise<void>; onUnsend: () => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [feedback, setFeedback] = useState(item.TaskFeedback || "");
  const [link, setLink] = useState(item.OfferLetterLink || "");
  const [saving, setSaving] = useState(false);
  const run = async (work: () => Promise<void>) => {
    setSaving(true);
    try {
      await work();
    } finally {
      setSaving(false);
    }
  };
  if (editing)
    return (
      <div className="u2-rows">
        <Field label="Feedback on task"><TextInput value={feedback} onChange={(e) => setFeedback(e.target.value)} /></Field>
        <Field label="Offer letter link"><TextInput value={link} onChange={(e) => setLink(e.target.value)} /></Field>
        <div className="u2-rowactions">
          <Button size="sm" variant="primary" loading={saving} disabled={!link.trim()} disabledReason="Add the offer letter link first." onClick={async () => { await run(() => onSave(feedback, link)); setEditing(false); }}>Save</Button>
          <Button size="sm" variant="ghost" disabled={saving} onClick={() => { setFeedback(item.TaskFeedback || ""); setLink(item.OfferLetterLink || ""); setEditing(false); }}>Cancel</Button>
        </div>
      </div>
    );
  return (
    <span className="u2-rowactions">
      <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>Edit</Button>
      <Button size="sm" variant="ghost" loading={saving} onClick={() => void run(onUnsend)}>Unsend</Button>
    </span>
  );
}
