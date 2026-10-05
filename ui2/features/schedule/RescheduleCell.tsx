"use client";

import { useState } from "react";
import { toast } from "sonner";
import { formatDate } from "@/lib/formatDate";
import { Button } from "@/ui2/components/Button";
import { Field, TextInput } from "@/ui2/components/Field";
import { useDirectReschedule, useReviewReschedule } from "@/ui2/queries/schedule";
import type { RescheduleRequest, ScheduleItem } from "@/ui2/queries/types";

/** The four states of a session's reschedule cell: a request waiting for a decision, being edited, already moved, or untouched. */
export function RescheduleCell({ slot, pending, startEditing = false }: { slot: ScheduleItem; pending?: RescheduleRequest; startEditing?: boolean }) {
  const direct = useDirectReschedule();
  const review = useReviewReschedule();
  const [editing, setEditing] = useState(startEditing);
  const [date, setDate] = useState(slot.RescheduledDate || "");
  const [time, setTime] = useState(slot.RescheduledTime || "");

  const move = async (d: string, t: string, done: string) => {
    try {
      await direct.mutateAsync({ scheduleId: slot.ScheduleID, rescheduledDate: d, rescheduledTime: t });
      toast.success(done);
      setEditing(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not reschedule.");
    }
  };
  const decide = async (action: "approve" | "reject") => {
    try {
      await review.mutateAsync({ requestId: pending!.RescheduleRequestID, action });
      toast.success(action === "approve" ? "Reschedule approved." : "Reschedule rejected.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save the decision.");
    }
  };

  if (pending)
    return (
      <div>
        <div>Requested: {formatDate(pending.RequestedDate) as string} {pending.RequestedTime}</div>
        <div className="u2-muted">by {pending.RequesterName}</div>
        <span className="u2-rowactions">
          <Button size="sm" variant="primary" loading={review.isPending} onClick={() => void decide("approve")}>Approve</Button>
          <Button size="sm" variant="ghost" className="u2-danger-text" disabled={review.isPending} onClick={() => void decide("reject")}>Reject</Button>
        </span>
      </div>
    );
  if (editing)
    return (
      <div className="u2-inline u2-inline--wrap u2-inline--end">
        <Field label="New date"><TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="New time"><TextInput type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
        <Button size="sm" variant="primary" loading={direct.isPending} onClick={() => void move(date, time, "Session moved.")}>Save</Button>
        <Button size="sm" variant="ghost" disabled={direct.isPending} onClick={() => setEditing(false)}>Cancel</Button>
      </div>
    );
  if (slot.RescheduledDate)
    return (
      <div>
        <div>→ {formatDate(slot.RescheduledDate) as string} {slot.RescheduledTime}</div>
        <span className="u2-rowactions">
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>Edit</Button>
          <Button size="sm" variant="ghost" className="u2-danger-text" loading={direct.isPending} onClick={() => void move("", "", "Move cleared.")}>Clear</Button>
        </span>
      </div>
    );
  return (
    <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
      Reschedule
    </Button>
  );
}
