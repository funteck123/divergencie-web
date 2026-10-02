"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { groupMatches } from "@/lib/client";
import { formatDate } from "@/lib/formatDate";
import { TIMEZONE_GROUPS } from "@/lib/timezones";
import { formatInternationalNumber } from "@/lib/countryCodes";
import { normalizeTimezone, tzAbbrFor } from "@/lib/timezones";
import { Badge } from "@/ui2/components/Badge";
import { Button } from "@/ui2/components/Button";
import { Combobox, type ComboOption } from "@/ui2/components/Combobox";
import { Field, TextInput } from "@/ui2/components/Field";
import type { SessionUser } from "@/ui2/components/RequireUser";
import { apiFetch } from "@/ui2/queries/client";
import { useMe, useReloadMe } from "@/ui2/queries/me";
import { useQuery } from "@tanstack/react-query";
import { useBillActions } from "@/ui2/queries/portalActions";
import type { ScheduleItem, ServiceRecord, UserRecord } from "@/ui2/queries/types";
import { BillsCard } from "./BillsCard";
import { Card, GuidesCard } from "./Cards";
import "@/ui2/features/accounts/accounts.css";

const useSlots = () => useQuery({ queryKey: ["schedule-by-id"] as const, queryFn: async () => new Map((await apiFetch<{ scheduleItems: ScheduleItem[] }>("/api/schedule")).scheduleItems.map((s) => [s.ScheduleID, s] as const)) });

const label = (s: ServiceRecord) => (s.Code ? `${s.Code as string} · ${s.Name}` : s.Name);
const when = (slot: ScheduleItem | undefined, id?: string, tzToo = false, batch = false) =>
  slot ? `${formatDate(slot.Date) as string} at ${slot.Time}${tzToo ? ` ${tzAbbrFor(slot.Date, normalizeTimezone(slot.Timezone))}` : ""}${batch && slot.BatchName ? ` · Batch ${slot.BatchName as string}` : ""}` : id ?? "";

/** One line form: a text field and a submit button (task link, feedback). */
function InlineForm({ label: aria, placeholder, submitLabel, busyLabel, onSubmit }: { label: string; placeholder: string; submitLabel: string; busyLabel: string; onSubmit: (text: string) => Promise<void> }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form className="u2-inline" style={{ alignItems: "center" }} onSubmit={async (e) => { e.preventDefault(); if (!text.trim()) return; setBusy(true); try { await onSubmit(text); setText(""); } catch (err) { toast.error(err instanceof Error ? err.message : "Could not submit."); } finally { setBusy(false); } }}>
      <TextInput aria-label={aria} placeholder={placeholder} value={text} onChange={(e) => setText(e.target.value)} />
      <Button type="submit" variant="primary" loading={busy} aria-label={busy ? busyLabel : undefined}>{submitLabel}</Button>
    </form>
  );
}

function RequestBox({ title, intro, services, requested, ariaLabel, buttonLabel, onRequest }: { title: string; intro: string; services: readonly ServiceRecord[]; requested: ReadonlySet<string>; ariaLabel: string; buttonLabel: string; onRequest: (serviceId: string) => Promise<void> }) {
  const [serviceId, setServiceId] = useState("");
  const [busy, setBusy] = useState(false);
  const options: ComboOption[] = services.map((s) => ({ value: s.ServiceID, label: `${label(s)}${requested.has(s.ServiceID) ? " (already requested)" : ""}`, disabled: requested.has(s.ServiceID) }));
  return (
    <Card title={title}>
      <p className="u2-muted" style={{ margin: 0 }}>{intro}</p>
      <div className="u2-inline" style={{ alignItems: "center" }}>
        <div style={{ flex: 1 }}><Combobox aria-label={ariaLabel} value={serviceId} onChange={setServiceId} placeholder="Select a service…" options={options} /></div>
        <Button variant="primary" loading={busy} disabled={!serviceId} disabledReason="Select a service first." onClick={async () => { setBusy(true); try { await onRequest(serviceId); setServiceId(""); } catch (e) { toast.error(e instanceof Error ? e.message : "Could not request."); } finally { setBusy(false); } }}>{buttonLabel}</Button>
      </div>
    </Card>
  );
}

function TrialList({ trials, slots, services, onFeedback, withTz, emptyText }: { trials: NonNullable<ReturnType<typeof useMe>["data"]>["trialItems"]; slots: Map<string, ScheduleItem> | undefined; services?: readonly ServiceRecord[]; onFeedback: (id: string, fb: string) => Promise<void>; withTz: boolean; emptyText: string }) {
  const list = trials ?? [];
  return (
    <>
      {list.length === 0 && <p className="u2-muted">{emptyText}</p>}
      {list.map((t) => {
        const slot = slots?.get(t.ScheduleItemID ?? "");
        const name = services?.find((s) => s.ServiceID === t.ServiceID)?.Name;
        return (
          <div key={t.TrialID} className="u2-box u2-box--inner">
            <p style={{ margin: 0 }}>{name ? `${name}${slot ? ", " : ""}` : ""}{slot ? when(slot, t.ScheduleItemID, withTz, withTz) : name ? "" : t.ScheduleItemID} <Badge kind="info">{t.Status}</Badge></p>
            {t.Status === "Pending" && <p className="u2-muted">Your booking is being reviewed.</p>}
            {t.Status === "Rejected" && <p className="u2-form__error">This request was rejected.</p>}
            {t.Status === "Scheduled" && <InlineForm label="Trial feedback" placeholder="Leave feedback about your trial…" submitLabel="Submit" busyLabel="Submitting…" onSubmit={(fb) => onFeedback(t.TrialID, fb)} />}
            {t.Status === "FeedbackSubmitted" && <p className="u2-muted">Feedback submitted: {t.Feedback}</p>}
          </div>
        );
      })}
    </>
  );
}

export function TrialPortal({ user }: { user: SessionUser }) {
  const me = useMe(user.UserID);
  const reload = useReloadMe(user.UserID);
  const slots = useSlots();
  const actions = useBillActions(user.UserID);
  const data = me.data;
  if (me.error) return <p role="alert" className="u2-errorbox">Could not load your dashboard: {me.error.message}</p>;
  if (!data) return <div className="u2-skeleton" style={{ height: 240 }} aria-busy="true" />;
  const eligible = (data.services ?? []).filter((s) => (groupMatches(s.Group, "Student") as boolean) && s.Type !== "Book");
  const requested = new Set((data.trialItems ?? []).filter((t) => t.Status !== "Rejected").map((t) => t.ServiceID));
  return (
    <div className="u2-accounts">
      <GuidesCard guides={data.guides} />
      <Card title="My Trial Sessions">
        <TrialList trials={data.trialItems} slots={slots.data} withTz onFeedback={async (id, fb) => { await apiFetch("/api/trial-feedback", { method: "POST", body: { trialId: id, feedback: fb } }); await reload(); }} emptyText="No trial requested yet. Request one below." />
      </Card>
      <RequestBox title="Request a Trial" intro="Pick the service you'd like to trial. No need to choose a time. A slot will be assigned once your request is approved." services={eligible} requested={requested} ariaLabel="Service" buttonLabel="Request Trial" onRequest={async (serviceId) => { await apiFetch("/api/schedule/pick", { method: "POST", body: { serviceId, userId: user.UserID, type: "Trial" } }); await reload(); }} />
      <BillsCard kind="invoice" title="My Invoices" bills={data.invoices} services={data.services ?? []} currency={data.user.Currency || "INR"} compact onMarkUnpaid={actions.markUnpaid} onConfirmPaid={actions.confirmPaid} />
    </div>
  );
}

const INTERVIEW_GROUP: Record<string, string> = { TeacherInterviewAcc: "Teacher", StaffInterviewAcc: "Staff", AmbassadorInterviewAcc: "Ambassador" };
const tzOptions: ComboOption[] = TIMEZONE_GROUPS.flatMap((g: { label: string; options: { value: string; label: string }[] }) => g.options.map((o) => ({ value: o.value, label: o.label, group: g.label })));

export function InterviewPortal({ user }: { user: SessionUser }) {
  const me = useMe(user.UserID);
  const reload = useReloadMe(user.UserID);
  const slots = useSlots();
  const [busy, setBusy] = useState<string | null>(null);
  const data = me.data;
  const teacherTrack = user.UserType === "TeacherInterviewAcc";
  if (me.error) return <p role="alert" className="u2-errorbox">Could not load your dashboard: {me.error.message}</p>;
  if (!data) return <div className="u2-skeleton" style={{ height: 240 }} aria-busy="true" />;
  const services = data.services ?? [];
  const eligible = services.filter((s) => groupMatches(s.Group, INTERVIEW_GROUP[user.UserType] || "Staff") as boolean);
  const requested = new Set((data.interviewItems ?? []).filter((i) => i.Status !== "Rejected").map((i) => i.ServiceID));
  const trialServices = teacherTrack ? services.filter((s) => (groupMatches(s.Group, "Student") as boolean) && s.Type !== "Book") : [];
  const trialRequested = new Set((data.trialItems ?? []).filter((t) => t.Status !== "Rejected").map((t) => t.ServiceID));
  const save = async (fields: Record<string, unknown>) => { await apiFetch("/api/interview-profile", { method: "PATCH", body: { userId: user.UserID, ...fields } }); await reload(); toast.success("Saved."); };
  const accept = async (id: string) => { setBusy(id); try { await apiFetch("/api/interview-offer", { method: "POST", body: { interviewId: id, action: "accept" } }); await reload(); } catch (e) { toast.error(e instanceof Error ? e.message : "Could not accept."); } finally { setBusy(null); } };

  return (
    <div className="u2-accounts">
      <GuidesCard guides={data.guides} />
      <Card title="My Interview">
        {(data.interviewItems ?? []).length === 0 && <p className="u2-muted">No interview requested yet, request one below.</p>}
        {(data.interviewItems ?? []).map((it) => {
          const slot = slots.data?.get(it.ScheduleItemID ?? "");
          const name = services.find((s) => s.ServiceID === it.ServiceID)?.Name || it.ServiceID;
          return (
            <div key={it.InterviewID} className="u2-box u2-box--inner">
              <p style={{ margin: 0 }}>{name}{slot ? `, ${formatDate(slot.Date) as string} at ${slot.Time}` : ""} <Badge kind="info">{it.Status}</Badge></p>
              {it.Status === "Pending" && <p className="u2-muted">Your request is being reviewed. A slot will be assigned once approved.</p>}
              {it.Status === "Rejected" && <p className="u2-form__error">This request was rejected.</p>}
              {it.Status === "Waitlisted" && <p className="u2-warnbox">You&apos;ve been added to the waitlist. We&apos;ll follow up soon.</p>}
              {it.Status === "Scheduled" && it.TaskSentAt && <InlineForm label="Task submission link" placeholder="Link to your task submission…" submitLabel="Submit" busyLabel="Submitting…" onSubmit={async (link) => { await apiFetch("/api/interview-task", { method: "POST", body: { interviewId: it.InterviewID, link } }); await reload(); }} />}
              {it.Status === "Scheduled" && !it.TaskSentAt && <p className="u2-muted">Your interview is scheduled. We&apos;ll send your task soon.</p>}
              {it.Status === "TaskSubmitted" && <p className="u2-muted">Task submitted. We&apos;ll be in touch soon with next steps.</p>}
              {it.TaskFeedback && ["OfferSent", "OfferAccepted", "Waitlisted", "Rejected"].includes(it.Status) && <p className="u2-muted">Feedback on your task: {it.TaskFeedback}</p>}
              {it.Status === "OfferSent" && (
                <div className="u2-rowactions">
                  {it.OfferLetterLink && <a className="u2-pill" href={it.OfferLetterLink} target="_blank" rel="noreferrer">Open offer letter</a>}
                  <Button variant="primary" loading={busy === it.InterviewID} onClick={() => void accept(it.InterviewID)}>Accept offer</Button>
                </div>
              )}
              {it.Status === "OfferAccepted" && (
                <>
                  {it.OfferLetterLink && <a className="u2-pill" href={it.OfferLetterLink} target="_blank" rel="noreferrer">Open offer letter</a>}
                  <p className="u2-sub--good">Offer accepted. You&apos;ll be set up with {user.UserType === "AmbassadorInterviewAcc" ? "an Ambassador" : "a Staff"} account shortly.</p>
                </>
              )}
            </div>
          );
        })}
      </Card>
      {teacherTrack && (
        <Card title="My Trial Sessions">
          <TrialList trials={data.trialItems} slots={slots.data} services={services} withTz={false} onFeedback={async (id, fb) => { await apiFetch("/api/trial-feedback", { method: "POST", body: { trialId: id, feedback: fb } }); await reload(); }} emptyText="No trial requested yet, request one below." />
        </Card>
      )}
      <PersonalInfo user={data.user} onSave={save} />
      <Documents user={data.user} onSave={save} />
      <Card title="Request an Interview">
        <p className="u2-muted" style={{ margin: 0 }}>Pick the service you&apos;re interviewing for. No need to choose a time. A slot will be assigned once your request is approved.</p>
        {!data.user.ResumeURL ? (
          <p className="u2-form__error">Upload a Resume in Documents above before requesting an interview.</p>
        ) : (
          <RequestInline services={eligible} requested={requested} ariaLabel="Service" buttonLabel="Request Interview" onRequest={async (serviceId) => { await apiFetch("/api/schedule/pick", { method: "POST", body: { serviceId, userId: user.UserID, type: user.UserType.replace(/Acc$/, "") } }); await reload(); }} />
        )}
      </Card>
      {teacherTrack && (
        <RequestBox title="Request a Trial" intro="Pick a Student service you'd like to demo-teach. No need to choose a time. A slot will be assigned once your request is approved." services={trialServices} requested={trialRequested} ariaLabel="Trial service" buttonLabel="Request Trial" onRequest={async (serviceId) => { await apiFetch("/api/schedule/pick", { method: "POST", body: { serviceId, userId: user.UserID, type: "Trial" } }); await reload(); }} />
      )}
    </div>
  );
}

function RequestInline(props: { services: readonly ServiceRecord[]; requested: ReadonlySet<string>; ariaLabel: string; buttonLabel: string; onRequest: (id: string) => Promise<void> }) {
  const [serviceId, setServiceId] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="u2-inline" style={{ alignItems: "center" }}>
      <div style={{ flex: 1 }}><Combobox aria-label={props.ariaLabel} value={serviceId} onChange={setServiceId} placeholder="Select a service…" options={props.services.map((s) => ({ value: s.ServiceID, label: `${label(s)}${props.requested.has(s.ServiceID) ? " (already requested)" : ""}`, disabled: props.requested.has(s.ServiceID) }))} /></div>
      <Button variant="primary" loading={busy} disabled={!serviceId} disabledReason="Select a service first." onClick={async () => { setBusy(true); try { await props.onRequest(serviceId); setServiceId(""); } catch (e) { toast.error(e instanceof Error ? e.message : "Could not request."); } finally { setBusy(false); } }}>{props.buttonLabel}</Button>
    </div>
  );
}

function PersonalInfo({ user, onSave }: { user: UserRecord; onSave: (f: Record<string, unknown>) => Promise<void> }) {
  const [email, setEmail] = useState(user.Email || "");
  const [wa, setWa] = useState(formatInternationalNumber(user.WhatsAppNumber) || "");
  const [tz, setTz] = useState(user.Timezone || "Asia/Kolkata");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <Card title="Personal Info">
      <form className="u2-form" onSubmit={async (e) => { e.preventDefault(); setBusy(true); setError(""); try { await onSave({ email, whatsappNumber: wa, timezone: tz }); } catch (err) { setError(err instanceof Error ? err.message : "Could not save."); } finally { setBusy(false); } }}>
        <Field label="Name"><TextInput value={user.Name} disabled readOnly /></Field>
        <Field label="Email"><TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="WhatsApp Number"><TextInput value={wa} onChange={(e) => setWa(e.target.value)} /></Field>
        <Field label="Country (Timezone)"><Combobox value={tz} onChange={setTz} options={tzOptions} /></Field>
        {error && <p role="alert" className="u2-form__error">{error}</p>}
        <div className="u2-form__actions"><Button type="submit" variant="primary" loading={busy}>Save</Button></div>
      </form>
    </Card>
  );
}

function Documents({ user, onSave }: { user: UserRecord; onSave: (f: Record<string, unknown>) => Promise<void> }) {
  const [resume, setResume] = useState((user.ResumeURL as string) || "");
  const [cover, setCover] = useState((user.CoverLetterURL as string) || "");
  const initial = useMemo(() => ((user.PortfolioLinks as string[] | undefined)?.length ? (user.PortfolioLinks as string[]) : [""]), [user.PortfolioLinks]);
  const [links, setLinks] = useState<string[]>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <Card title="Documents">
      <form className="u2-form" onSubmit={async (e) => { e.preventDefault(); setBusy(true); setError(""); try { await onSave({ resumeUrl: resume, coverLetterUrl: cover, portfolioLinks: links }); } catch (err) { setError(err instanceof Error ? err.message : "Could not save."); } finally { setBusy(false); } }}>
        <Field label="Resume (required, Google Drive link)"><TextInput placeholder="https://drive.google.com/…" value={resume} onChange={(e) => setResume(e.target.value)} required /></Field>
        <Field label="Cover Letter (optional, Google Drive link)"><TextInput placeholder="https://drive.google.com/…" value={cover} onChange={(e) => setCover(e.target.value)} /></Field>
        <fieldset className="u2-fieldgroup">
          <legend className="u2-fieldgroup__legend">Portfolio (optional, up to 5 Google Drive links)</legend>
          {links.map((l, i) => (
            <TextInput key={i} aria-label={`Portfolio link ${i + 1}`} placeholder="https://drive.google.com/…" value={l} onChange={(e) => setLinks((p) => p.map((x, j) => (j === i ? e.target.value : x)))} />
          ))}
          {links.length < 5 && <Button variant="ghost" size="sm" onClick={() => setLinks((p) => [...p, ""])}>+ Add another link</Button>}
        </fieldset>
        {error && <p role="alert" className="u2-form__error">{error}</p>}
        <div className="u2-form__actions"><Button type="submit" variant="primary" loading={busy}>Save</Button></div>
      </form>
    </Card>
  );
}
