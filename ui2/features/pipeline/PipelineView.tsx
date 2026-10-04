"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { formatInternationalNumber } from "@/lib/countryCodes";
import { formatDate } from "@/lib/formatDate";
import { Badge } from "@/ui2/components/Badge";
import { Button, LinkButton } from "@/ui2/components/Button";
import { Combobox } from "@/ui2/components/Combobox";
import { DataTable, type Column } from "@/ui2/components/DataTable";
import { Sheet } from "@/ui2/components/Sheet";
import { copyToClipboard } from "@/ui2/lib/clipboard";
import { useInvoicesForPipeline } from "./usePipelineData";
import { useSchedule } from "@/ui2/queries/schedule";
import { useServices } from "@/ui2/queries/services";
import { useAddTrialService, useActOnRequest, useCreateSlot, useInterviewOffer, useLeads, usePendingRequests, usePipelineItems, useSendInterviewTask } from "@/ui2/queries/pipeline";
import type { PendingRequest, ScheduleItem, UserRecord } from "@/ui2/queries/types";
import { useUsers } from "@/ui2/queries/users";
import { useIssued } from "@/ui2/features/management/IssuedCredentials";
import { CONVERT_LABEL, INTERVIEW_ACC_LABEL } from "@/ui2/features/accounts/groups";
import { apiFetch } from "@/ui2/queries/client";
import { useQueryClient } from "@tanstack/react-query";
import { keys } from "@/ui2/queries/keys";
import type { Credentials } from "@/ui2/queries/types";
import "@/ui2/features/accounts/accounts.css";
import { OfferSentControls, OutcomeForm, SlotAssign, StepIndicator } from "./PipelineParts";
import {
  INTERVIEW_STATUS_FILTER_LABEL, INTERVIEW_STEPS, TRIAL_STATUS_FILTER_LABEL, TRIAL_STEPS, bookingTypeOfInterview, buildTrialMessage, conversionEligible, interviewDeadEnd, interviewMatches, interviewStepIndex,
  trialDeadEnd, trialMatches, trialStepIndex, type InterviewItem, type TrialItem,
} from "./pipelineLogic";
import "./pipeline.css";

type Mode = "table" | "lanes";

export function PipelineView() {
  const users = useUsers();
  const services = useServices();
  const sched = useSchedule();
  const invoices = useInvoicesForPipeline();
  const leads = useLeads();
  const pending = usePendingRequests();
  const userList = useMemo<UserRecord[]>(() => users.data ?? [], [users.data]);
  const { trialItems, interviewItems } = usePipelineItems(userList);
  const { issued, remember } = useIssued();
  const qc = useQueryClient();
  const addService = useAddTrialService();
  const offer = useInterviewOffer();
  const sendTask = useSendInterviewTask();
  const act = useActOnRequest();
  const createSlot = useCreateSlot();
  const [busy, setBusy] = useState<ReadonlySet<string>>(new Set());
  const [modeTrial, setModeTrial] = useState<Mode>("table");
  const [modeInterview, setModeInterview] = useState<Mode>("table");
  const [tSearch, setTSearch] = useState("");
  const [tStatus, setTStatus] = useState("all");
  const [iSearch, setISearch] = useState("");
  const [iStatus, setIStatus] = useState("all");
  const [decideId, setDecideId] = useState<string | null>(null);

  const nameOf = (id: string) => userList.find((u) => u.UserID === id)?.Name || id;
  const serviceName = (id: string) => services.data?.find((s) => s.ServiceID === id)?.Name || id;
  const items = useMemo(() => sched.data?.scheduleItems ?? [], [sched.data]);
  const slotOf = (id?: string) => (id ? items.find((s) => s.ScheduleID === id) ?? null : null);
  const openSlots = useMemo<ScheduleItem[]>(() => { const ids = new Set(sched.data?.openPoolSlotIds ?? []); return items.filter((s) => ids.has(s.ScheduleID)); }, [items, sched.data]);

  const withBusy = async (id: string, work: () => Promise<unknown>, done?: string) => {
    setBusy((p) => new Set(p).add(id));
    try {
      await work();
      if (done) toast.success(done);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy((p) => { const n = new Set(p); n.delete(id); return n; });
    }
  };

  const convert = (accountId: string) =>
    withBusy(accountId, async () => {
      const res = await apiFetch<{ credentials: Credentials }>("/api/convert", { method: "POST", body: { accountId } });
      remember(accountId, res.credentials);
      await Promise.all([qc.invalidateQueries({ queryKey: keys.users }), qc.invalidateQueries({ queryKey: ["me"] })]);
    }, "Converted. Copy the credentials from the Accounts tab or the box here.");

  const accountCell = (accountId: string) => {
    const account = userList.find((u) => u.UserID === accountId);
    if (!account) return <>—</>;
    const c = issued[accountId];
    if (c)
      return (
        <span className="u2-rowactions">
          <span className="u2-muted">{c.username} / {c.password}</span>
          <Button size="sm" variant="ghost" onClick={async () => { await copyToClipboard(`${c.username} / ${c.password}`); toast.success("Copied."); }}>Copy</Button>
        </span>
      );
    if (account.Status === "Converted" && account.ConvertedToUserID) return <span className="u2-muted">→ {account.ConvertedToUserID}</span>;
    if (!conversionEligible(accountId, interviewItems, trialItems)) return <span className="u2-muted">Not yet accepted</span>;
    return (
      <Button size="sm" variant="ghost" loading={busy.has(accountId)} onClick={() => void convert(accountId)}>
        Convert{CONVERT_LABEL[account.UserType] ? ` to ${CONVERT_LABEL[account.UserType]}` : ""}
      </Button>
    );
  };

  // ---- trials
  interface TRow extends TrialItem { _name: string; _service: string; _at: string }
  const trialRows = useMemo<TRow[]>(
    () =>
      trialItems
        .map((t) => { const slot = slotOf(t.ScheduleItemID); return { ...t, _name: nameOf(t.TrialAccID), _service: serviceName(t.ServiceID), _at: slot ? `${slot.Date} ${slot.Time}` : "" }; })
        .filter((t) => { const q = tSearch.trim().toLowerCase(); return (!q || t._name.toLowerCase().includes(q) || t._service.toLowerCase().includes(q)) && trialMatches(t, tStatus); }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [trialItems, userList, services.data, items, tSearch, tStatus],
  );
  const invoiceFor = (t: TrialItem) => {
    const account = userList.find((u) => u.UserID === t.TrialAccID);
    const studentId = account?.ConvertedToUserID || t.TrialAccID;
    return (invoices.data ?? []).find((inv) => inv.StudentID === studentId && inv.ServiceID === t.ServiceID);
  };
  const copyTrial = async (t: TRow, slot: ScheduleItem) => {
    await copyToClipboard(buildTrialMessage({ studentName: t._name, serviceName: t._service, slot: { Date: slot.Date, Time: slot.Time, Timezone: slot.Timezone, Duration: slot.Duration } }));
    toast.success("Trial message copied.");
  };
  const trialCols: Column<TRow>[] = [
    { id: "name", header: "Name", width: 150, sortValue: (t) => t._name, tip: (t) => t._name, cell: (t) => <strong className="u2-strong">{t._name}</strong> },
    { id: "service", header: "Service", sortValue: (t) => t._service, tip: (t) => t._service, cell: (t) => t._service },
    { id: "progress", header: "Progress", width: 290, sortValue: (t) => t.Status, cell: (t) => <StepIndicator steps={TRIAL_STEPS} currentIndex={trialStepIndex(t)} deadEnd={trialDeadEnd(t)} /> },
    { id: "when", header: "Scheduled", width: 170, sortValue: (t) => t._at, tip: (t) => { const s = slotOf(t.ScheduleItemID); return s ? `${formatDate(s.Date) as string} at ${s.Time}, ${s.Facilitator || "no instructor set"}` : undefined; }, cell: (t) => { const s = slotOf(t.ScheduleItemID); return s ? `${formatDate(s.Date) as string} at ${s.Time}` : "—"; } },
    { id: "feedback", header: "Feedback", width: 140, tip: (t) => t.Feedback, cell: (t) => t.Feedback || "—" },
    { id: "invoice", header: "Invoice", width: 76, cell: (t) => { const inv = invoiceFor(t); return inv ? <Badge kind={inv.Status === "Sent" || inv.Status === "Paid" ? "success" : "neutral"}>{inv.Status}</Badge> : "—"; } },
    { id: "account", header: "Account", width: 190, cell: (t) => accountCell(t.TrialAccID) },
    {
      id: "actions", header: "", title: "Actions", width: 200,
      cell: (t) => { const slot = slotOf(t.ScheduleItemID); return (
        <span className="u2-rowactions">
          {slot && <Button size="sm" variant="ghost" onClick={() => void copyTrial(t, slot)}>Copy Trial Message</Button>}
          {t.Status === "FeedbackSubmitted" && !t.ServiceAdded && <Button size="sm" variant="primary" loading={busy.has(t.TrialID)} onClick={() => void withBusy(t.TrialID, () => addService.mutateAsync(t.TrialID), "Service added.")}>Add Service</Button>}
          {t.ServiceAdded && <span className="u2-sub--good">Added ✓</span>}
        </span>
      ); },
    },
  ];

  // ---- interviews
  interface IRow extends InterviewItem { _name: string; _service: string; _at: string }
  const interviewRows = useMemo<IRow[]>(
    () =>
      interviewItems
        .map((i) => { const slot = slotOf(i.ScheduleItemID); return { ...i, _name: nameOf(i.InterviewAccID), _service: serviceName(i.ServiceID), _at: slot ? `${slot.Date} ${slot.Time}` : "" }; })
        .filter((i) => { const q = iSearch.trim().toLowerCase(); return (!q || i._name.toLowerCase().includes(q) || i._service.toLowerCase().includes(q)) && interviewMatches(i, iStatus); }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [interviewItems, userList, services.data, items, iSearch, iStatus],
  );
  const send = (interviewId: string, feedback: string, link: string) => offer.mutateAsync({ interviewId, action: "send", feedback, offerLetterLink: link });
  const outcome = (interviewId: string, action: "waitlist" | "reject" | "unsend", feedback?: string) => offer.mutateAsync({ interviewId, action, feedback });
  const interviewCols: Column<IRow>[] = [
    { id: "name", header: "Name", width: 150, sortValue: (i) => i._name, tip: (i) => i._name, cell: (i) => <strong className="u2-strong">{i._name}</strong> },
    { id: "service", header: "Service", sortValue: (i) => i._service, tip: (i) => i._service, cell: (i) => i._service },
    {
      id: "progress", header: "Progress", width: 330, sortValue: (i) => i.Status,
      cell: (i) => (
        <>
          <StepIndicator steps={INTERVIEW_STEPS} currentIndex={interviewStepIndex(i)} deadEnd={interviewDeadEnd(i)} />
          {i.OfferSentAt && <span className="u2-sub">Sent {formatDate(i.OfferSentAt) as string}</span>}
          {i.OfferAcceptedAt && <span className="u2-sub">Accepted {formatDate(i.OfferAcceptedAt) as string}</span>}
        </>
      ),
    },
    { id: "when", header: "Scheduled", width: 170, sortValue: (i) => i._at, tip: (i) => { const s = slotOf(i.ScheduleItemID); return s ? `${formatDate(s.Date) as string} at ${s.Time}, ${s.Facilitator || "no instructor set"}` : undefined; }, cell: (i) => { const s = slotOf(i.ScheduleItemID); return s ? `${formatDate(s.Date) as string} at ${s.Time}` : "—"; } },
    { id: "task", header: "Task", width: 84, cell: (i) => (i.TaskSubmissionLink ? <LinkButton href={i.TaskSubmissionLink} target="_blank">Open</LinkButton> : "—") },
    { id: "offerlink", header: "Offer", width: 84, cell: (i) => (i.OfferLetterLink ? <LinkButton href={i.OfferLetterLink} target="_blank">Open</LinkButton> : "—") },
    { id: "account", header: "Account", width: 190, cell: (i) => accountCell(i.InterviewAccID) },
    {
      id: "actions", header: "", title: "Actions", width: 130,
      cell: (i) => (
        <span className="u2-rowactions">
          {i.Status === "Scheduled" && !i.TaskSentAt && <Button size="sm" variant="primary" loading={busy.has(i.InterviewID)} onClick={() => void withBusy(i.InterviewID, () => sendTask.mutateAsync(i.InterviewID), "Task sent.")}>Send Task</Button>}
          {(i.Status === "TaskSubmitted" || i.Status === "OfferSent") && <Button size="sm" variant="primary" onClick={() => setDecideId(i.InterviewID)}>{i.Status === "OfferSent" ? "Offer…" : "Decide…"}</Button>}
        </span>
      ),
    },
  ];

  // ---- pending requests
  interface PRow extends PendingRequest { _id: string; _type: string; _booking: string }
  const pendingRows: PRow[] = [
    ...(pending.data?.pendingTrials ?? []).map((t) => ({ ...t, _id: t.TrialID as string, _type: "Trial", _booking: "Trial" })),
    ...(pending.data?.pendingInterviews ?? []).map((i) => ({ ...i, _id: i.InterviewID as string, _type: INTERVIEW_ACC_LABEL[i.RequesterType ?? ""] || "Interview", _booking: bookingTypeOfInterview(i.RequesterType) })),
  ];
  const decide = (row: PRow, action: "approve" | "reject", scheduleId?: string) => act.mutateAsync({ type: row._booking, id: row._id, action, scheduleId });
  const decideItem = interviewItems.find((i) => i.InterviewID === decideId) ?? null;

  return (
    <section className="u2-accounts">
      <h1>Pipeline</h1>

      <section className="u2-box">
        <div className="u2-toolbar"><h2 style={{ margin: 0, fontSize: "var(--u2-text-xl)" }}>Trial Pipeline</h2><ModeSwitch mode={modeTrial} onChange={setModeTrial} /></div>
        <div className="u2-toolbar">
          <input type="search" className="u2-search" placeholder="Search name or service…" aria-label="Search trials" value={tSearch} onChange={(e) => setTSearch(e.target.value)} />
          <div style={{ minWidth: 200 }}><Combobox aria-label="Trial status" value={tStatus} onChange={setTStatus} options={Object.entries(TRIAL_STATUS_FILTER_LABEL).map(([value, label]) => ({ value, label }))} /></div>
        </div>
        {modeTrial === "lanes" ? <Lanes<TRow> rows={trialRows} steps={TRIAL_STEPS} indexOf={trialStepIndex} keyOf={(t) => t.TrialID} deadEnd={trialDeadEnd} /> : <DataTable caption="Trial pipeline" rows={trialRows} columns={trialCols} rowKey={(t) => t.TrialID} initialSort={{ id: "name", dir: "asc" }} emptyText={trialItems.length === 0 ? "No trial bookings yet." : "No matches."} />}
      </section>

      <section className="u2-box">
        <div className="u2-toolbar"><h2 style={{ margin: 0, fontSize: "var(--u2-text-xl)" }}>Interview Pipeline</h2><ModeSwitch mode={modeInterview} onChange={setModeInterview} /></div>
        <div className="u2-toolbar">
          <input type="search" className="u2-search" placeholder="Search name or service…" aria-label="Search interviews" value={iSearch} onChange={(e) => setISearch(e.target.value)} />
          <div style={{ minWidth: 200 }}><Combobox aria-label="Interview status" value={iStatus} onChange={setIStatus} options={Object.entries(INTERVIEW_STATUS_FILTER_LABEL).map(([value, label]) => ({ value, label }))} /></div>
        </div>
        {modeInterview === "lanes" ? <Lanes<IRow> rows={interviewRows} steps={INTERVIEW_STEPS} indexOf={interviewStepIndex} keyOf={(i) => i.InterviewID} deadEnd={interviewDeadEnd} /> : <DataTable caption="Interview pipeline" rows={interviewRows} columns={interviewCols} rowKey={(i) => i.InterviewID} initialSort={{ id: "name", dir: "asc" }} emptyText={interviewItems.length === 0 ? "No interview bookings yet." : "No matches."} />}
      </section>

      <section className="u2-box">
        <h2 style={{ margin: 0, fontSize: "var(--u2-text-xl)" }}>Pending Requests</h2>
        {pendingRows.length === 0 && <p className="u2-muted">No pending requests.</p>}
        <div className="u2-rows">
          {pendingRows.map((row) => (
            <div key={row._id} className="u2-box u2-box--inner">
              <div className="u2-rowactions" style={{ flexWrap: "wrap" }}>
                <Badge kind="info">{row._type}</Badge>
                <strong className="u2-strong">{row.RequesterName}</strong>
                <span className="u2-muted">{serviceName(row.ServiceID)}</span>
                <Button size="sm" variant="ghost" className="u2-danger-text" style={{ marginLeft: "auto" }} loading={busy.has(row._id)} onClick={() => void withBusy(row._id, () => decide(row, "reject"), "Rejected.")}>Reject</Button>
              </div>
              <SlotAssign
                serviceId={row.ServiceID}
                openSlots={openSlots}
                onApprove={async (scheduleId) => { await withBusy(row._id, () => decide(row, "approve", scheduleId), "Approved."); }}
                onCreateAndApprove={async (date, time, duration, facilitator) => {
                  await withBusy(row._id, async () => {
                    const slot = await createSlot.mutateAsync({ serviceType: row._booking, serviceId: row.ServiceID, date, time, duration, facilitator });
                    await decide(row, "approve", slot.ScheduleID);
                  }, "Slot created and approved.");
                }}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="u2-box">
        <h2 style={{ margin: 0, fontSize: "var(--u2-text-xl)" }}>Inquiries</h2>
        <DataTable
          caption="Inquiries" rows={[...(leads.data ?? [])].reverse()} rowKey={(l) => l.LeadID} loading={leads.isPending} emptyText="No inquiries yet."
          columns={[
            { id: "name", header: "Name", width: 150, cell: (l) => l.Name },
            { id: "email", header: "Email", width: 200, tip: (l) => l.Email, cell: (l) => l.Email },
            { id: "wa", header: "WhatsApp", width: 140, cell: (l) => formatInternationalNumber(l.WhatsAppNumber) || "—" },
            { id: "country", header: "Country", width: 100, cell: (l) => l.Country || "—" },
            { id: "notes", header: "Notes", tip: (l) => l.Notes, cell: (l) => l.Notes || "—" },
            { id: "at", header: "Received", width: 100, cell: (l) => formatDate(l.CreatedAt) as string },
          ]}
        />
      </section>

      <Sheet open={!!decideItem} onOpenChange={(o) => !o && setDecideId(null)} title={decideItem ? `Interview: ${nameOf(decideItem.InterviewAccID)}` : "Interview"} subtitle={decideItem ? serviceName(decideItem.ServiceID) : undefined}>
        {decideItem && (decideItem.Status === "OfferSent" ? (
          <OfferSentControls key={decideItem.InterviewID} item={decideItem} onSave={async (f, l) => { await send(decideItem.InterviewID, f, l); toast.success("Offer updated."); setDecideId(null); }} onUnsend={async () => { await outcome(decideItem.InterviewID, "unsend"); toast.success("Offer taken back."); setDecideId(null); }} />
        ) : (
          <OutcomeForm key={decideItem.InterviewID} initialFeedback={decideItem.TaskFeedback} initialLink={decideItem.OfferLetterLink} onSendOffer={async (f, l) => { await send(decideItem.InterviewID, f, l); toast.success("Offer sent."); setDecideId(null); }} onWaitlist={async (f) => { await outcome(decideItem.InterviewID, "waitlist", f); toast.success("Waitlisted."); setDecideId(null); }} onReject={async (f) => { await outcome(decideItem.InterviewID, "reject", f); toast.success("Rejected."); setDecideId(null); }} />
        ))}
      </Sheet>
    </section>
  );
}

function Lanes<T extends { _name: string; _service: string }>({ rows, steps, indexOf, keyOf, deadEnd }: { rows: T[]; steps: readonly string[]; indexOf: (r: T) => number; keyOf: (r: T) => string; deadEnd: (r: T) => string | null | undefined }) {
  return (
    <div className="u2-pipeline-lanes" tabIndex={0} role="region" aria-label="Pipeline lanes">
      {[...steps, "Rejected / waitlisted"].map((label, li) => {
        const inLane = rows.filter((r) => (li === steps.length ? !!deadEnd(r) : !deadEnd(r) && indexOf(r) === li));
        return (
          <section key={label} className="u2-lane" aria-label={label}>
            <div className="u2-lane__title"><span>{label}</span><span className="u2-seg__count">{inLane.length}</span></div>
            {inLane.length === 0 && <span className="u2-muted">None</span>}
            {inLane.map((r) => <div key={keyOf(r)} className="u2-card"><strong className="u2-strong">{r._name}</strong><span className="u2-muted">{r._service}</span></div>)}
          </section>
        );
      })}
    </div>
  );
}

function ModeSwitch({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div className="u2-seg" role="group" aria-label="View">
      {(["table", "lanes"] as const).map((m) => (
        <button key={m} type="button" className="u2-seg__btn" aria-pressed={mode === m} data-on={mode === m} onClick={() => onChange(m)}>{m === "table" ? "Table" : "By step"}</button>
      ))}
    </div>
  );
}
