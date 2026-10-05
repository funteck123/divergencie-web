"use client";

import { useState } from "react";
import { formatDateTime } from "@/lib/formatDate";
import { Badge } from "@/ui2/components/Badge";
import { Button, LinkButton } from "@/ui2/components/Button";
import { Field, TextInput } from "@/ui2/components/Field";
import { useLogAttendance, usePatchAttendance, useSessionAttendance } from "@/ui2/queries/schedule";
import { MiniAttendanceForm } from "./MiniAttendanceForm";
import { hasConflict } from "./scheduleLogic";
import "./schedule.css";

/**
 * Attendance of one session. Shared by every role: Management corrects and resolves conflicts, a teacher logs for students
 * (and must give the class topic and recording link every time), a student logs for the teacher and self.
 */
export function SessionAttendance({ scheduleId, duration, viewerUserId, viewerType, isManagement = false, onLogged }: { scheduleId: string; duration: number | string; viewerUserId?: string; viewerType?: string; isManagement?: boolean; onLogged?: () => void }) {
  const { data, error: loadError } = useSessionAttendance(scheduleId);
  const log = useLogAttendance();
  const patch = usePatchAttendance();
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [topicDraft, setTopicName] = useState<string | null>(null);
  const [linkDraft, setRecordingLink] = useState<string | null>(null);
  const isTeacher = viewerType === "Teacher" && !isManagement;

  // Remember the topic and link a teacher already saved for this session, so they are not retyped for each student.
  const saved = data?.attendanceItems.find((a) => a.TopicName && a.RecordingLink);
  const topicName = topicDraft ?? saved?.TopicName ?? "";
  const recordingLink = linkDraft ?? saved?.RecordingLink ?? "";

  if (loadError) return <p role="alert" className="u2-form__error">{loadError.message}</p>;
  if (!data) return <p className="u2-muted">Loading…</p>;
  const { roster, attendanceItems } = data;
  const nameOf = (id: string) => roster.find((r) => r.userId === id)?.name || id;

  const canLog = (targetId: string, targetType: string) => {
    if (isManagement) return false;
    if (targetId === viewerUserId) return true;
    if (viewerType === "Teacher" && targetType === "Student") return true;
    if (viewerType === "Student" && targetType === "Teacher") return true;
    return false;
  };

  async function run(work: () => Promise<unknown>) {
    setError("");
    try {
      await work();
      onLogged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    }
  }

  return (
    <div className="u2-rows u2-att">
      {error && (
        <p role="alert" className="u2-form__error">
          {error}{" "}
          <Button size="sm" variant="ghost" onClick={() => setError("")}>
            Dismiss
          </Button>
        </p>
      )}
      {isTeacher && (
        <div className="u2-box u2-box--inner">
          <strong>Class details (required for every attendance you log)</strong>
          <Field label="Class topic name">
            <TextInput maxLength={200} value={topicName} onChange={(e) => setTopicName(e.target.value)} placeholder="e.g. Quadratic equations, factorising" />
          </Field>
          <Field label="Recording link">
            <TextInput type="url" maxLength={500} value={recordingLink} onChange={(e) => setRecordingLink(e.target.value)} placeholder="https://..." />
          </Field>
        </div>
      )}
      {roster.length === 0 && <p className="u2-muted">No one enrolled in this session.</p>}
      {roster.map((person) => {
        const records = attendanceItems.filter((a) => a.UserID === person.userId);
        const mine = records.some((a) => a.LoggedBy === viewerUserId);
        return (
          <div key={person.userId} className="u2-box u2-box--inner">
            <div className="u2-rowactions">
              <strong className="u2-strong">{person.name}</strong>
              <span className="u2-muted">({person.userType})</span>
              {hasConflict(records) && <Badge kind="warning">⚠ conflict</Badge>}
            </div>
            {records.length === 0 && <p className="u2-muted">Not logged yet.</p>}
            {records.map((r) => (
              <div key={r.AttendanceID} className="u2-att__rec">
                <div className="u2-rowactions">
                  <Badge kind={r.Status === "Present" ? "success" : r.Status === "Late" ? "warning" : "error"}>{r.Status}</Badge>
                  <span>{r.LoggedDuration}h</span>
                  <span className="u2-muted">
                    by {r.LoggedBy === person.userId ? "self" : nameOf(r.LoggedBy)}
                    {isManagement && r.AcceptedForBilling === false ? ", not used for billing" : ""}
                  </span>
                  {r.LoggedAt && <span className="u2-muted">{formatDateTime(r.LoggedAt) as string}</span>}
                  {r.TopicName && <span className="u2-muted">Topic: {r.TopicName}</span>}
                  {r.RecordingLink && /^https?:\/\//i.test(r.RecordingLink) && (
                    <LinkButton href={r.RecordingLink} target="_blank">
                      Recording
                    </LinkButton>
                  )}
                  {isManagement && r.AcceptedForBilling === false && (
                    <Button size="sm" variant="ghost" onClick={() => void run(() => patch.mutateAsync({ attendanceId: r.AttendanceID }))}>
                      Mark correct
                    </Button>
                  )}
                  {isManagement && editingId !== r.AttendanceID && (
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(r.AttendanceID)}>
                      Edit
                    </Button>
                  )}
                </div>
                {isManagement && editingId === r.AttendanceID && (
                  <MiniAttendanceForm
                    defaultHrs={r.LoggedDuration}
                    submitLabel="Save"
                    onSubmit={async (status, hrs) => {
                      await run(() => patch.mutateAsync({ attendanceId: r.AttendanceID, status, loggedDuration: hrs }));
                      setEditingId(null);
                    }}
                  />
                )}
              </div>
            ))}
            {canLog(person.userId, person.userType) && !mine && (
              <MiniAttendanceForm
                defaultHrs={duration}
                onSubmit={async (status, hrs) => {
                  if (isTeacher && (!topicName.trim() || !recordingLink.trim())) {
                    setError("Fill in the class topic and the recording link first, they are required for every attendance you log.");
                    return;
                  }
                  await run(() => log.mutateAsync({ scheduleItemId: scheduleId, userId: person.userId, status, loggedDuration: hrs, ...(isTeacher ? { topicName: topicName.trim(), recordingLink: recordingLink.trim() } : {}) }));
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
