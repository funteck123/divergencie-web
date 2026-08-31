"use client";

import { Fragment, useEffect, useState } from "react";
import Image from "next/image";
import DashboardShell from "@/components/DashboardShell";
import SortableTh from "@/components/SortableTh";
import ScheduleCalendar from "@/components/ScheduleCalendar";
import SessionAttendance from "@/components/SessionAttendance";
import { api, formatRate, groupMatches, normalizeGroup, roleGroupOf, useSort, groupGradient, todayDateStr } from "@/lib/client";
import { ratesOf, rateById, batchesOf, batchById, batchScheduleLabel, BILLING_TYPES, amountDueInOwnCurrency, lineItemName } from "@/lib/billing";
import { TIMEZONE_GROUPS, normalizeTimezone, timezoneLabel } from "@/lib/timezones";
import { DEPARTMENTS, ROLE_ELIGIBLE, FIXED_DEPARTMENT, CURRENCIES_FULL, GUIDE_AUDIENCES } from "@/lib/accountTypes";
import { formatDate, formatDateTime } from "@/lib/formatDate";

const TABS = ["Applications", "Pipeline", "Accounts", "Services", "Schedule", "Enrollments", "Billing", "Guides", "Tickets", "Audit Log"];
// The three pending Interview tracks — each converts to its own final
// account type (see CONVERT_MAP in api/convert/route.js).
const INTERVIEW_ACC_TYPES = ["TeacherInterviewAcc", "StaffInterviewAcc", "AmbassadorInterviewAcc"];
const INTERVIEW_ACC_LABEL = {
  TeacherInterviewAcc: "Teacher Interview",
  StaffInterviewAcc: "Staff Interview",
  AmbassadorInterviewAcc: "Ambassador Interview",
};
const CONVERT_LABEL = {
  TrialAcc: "Student",
  TeacherInterviewAcc: "Teacher",
  StaffInterviewAcc: "Staff",
  AmbassadorInterviewAcc: "Ambassador",
};
// Booking type (sent to /api/schedule + /api/schedule/pick) -> the Group a
// Service must be open to for that booking type — mirrors REQUIRED_GROUP in
// lib/scheduleGen.js (duplicated here since that module can't be imported
// into a "use client" file — it pulls in lib/db.js's fs usage).
const BOOKING_TYPES = ["Trial", "TeacherInterview", "StaffInterview", "AmbassadorInterview"];
const REQUIRED_GROUP_FOR_BOOKING_TYPE = {
  Trial: "Student",
  TeacherInterview: "Teacher",
  StaffInterview: "Staff",
  AmbassadorInterview: "Ambassador",
};
const BOOKING_TYPE_LABEL = {
  Trial: "Trial",
  TeacherInterview: "Interview — Teacher",
  StaffInterview: "Interview — Staff",
  AmbassadorInterview: "Interview — Ambassador",
};
export default function ManagementDashboard() {
  return <DashboardShell allowedType="Management">{(user) => <Body user={user} />}</DashboardShell>;
}

// Visual-refinement pass: replaces window.confirm() at every delete call
// site (Service, Enrollment, Invoice, Paycheck) with an inline two-step
// confirm matching this app's own existing pattern (RebuildDrafts,
// ApprovePaymentControl) instead of an unstyled native dialog that blocks
// the JS thread and breaks visual continuity with the rest of the page.
// Also used to add a confirm step to Guide deletion, which previously had
// none at all.
function ConfirmButton({ label, confirmText, confirmLabel = "Yes, delete", busyLabel = "Deleting…", onConfirm, className = "btn-ghost", style, disabled }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  if (confirming) {
    return (
      <span className="flex items-center gap-1 flex-wrap">
        {confirmText && (
          <span className="text-xs" style={{ color: "var(--bad)" }}>
            {confirmText}
          </span>
        )}
        <button
          className="btn"
          style={{ background: "var(--bad)" }}
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onConfirm();
            } finally {
              setBusy(false);
              setConfirming(false);
            }
          }}
        >
          {busy ? busyLabel : confirmLabel}
        </button>
        <button className="btn-ghost" disabled={busy} onClick={() => setConfirming(false)}>
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button className={className} style={style} disabled={disabled} onClick={() => setConfirming(true)}>
      {label}
    </button>
  );
}

function Body() {
  const [tab, setTab] = useState("Applications");
  return (
    <div>
      {/* Mobile UI fix: this used to be flex-wrap, which on a narrow phone
          screen wraps 10 tabs into a ragged, hard-to-scan grid (reported
          live from a real phone). A horizontal scroll strip is the
          standard mobile pattern for a tab row that doesn't fit (e.g. iOS
          Settings sub-tabs) -- one row, swipe to see the rest, buttons
          keep their full desktop size instead of getting cramped. Desktop
          is unaffected: all 10 tabs already fit on one row at typical
          desktop widths, so there's nothing to scroll there in practice. */}
      {/* position:relative wrapper + absolutely-positioned fade sibling
          (not a child of the scrolling <nav> itself) so the hint stays
          fixed to the right edge of the viewport as the nav scrolls
          underneath it, instead of scrolling away with the tabs. */}
      <div style={{ position: "relative", marginBottom: "1.5rem" }}>
        <nav className="flex gap-2 overflow-x-auto" style={{ flexWrap: "nowrap", WebkitOverflowScrolling: "touch" }}>
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={tab === t ? "btn" : "btn-ghost"}
              style={{ flexShrink: 0, whiteSpace: "nowrap" }}
            >
              {t}
            </button>
          ))}
        </nav>
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            right: 0,
            width: 28,
            background: "linear-gradient(to right, transparent, var(--bg))",
            pointerEvents: "none",
          }}
        />
      </div>
      {tab === "Applications" && <Applications />}
      {tab === "Pipeline" && <Pipeline />}
      {tab === "Accounts" && <Accounts />}
      {tab === "Services" && <Services />}
      {tab === "Schedule" && <SchedulePool />}
      {tab === "Enrollments" && <Enrollments />}
      {tab === "Billing" && <Billing />}
      {tab === "Guides" && <Guides />}
      {tab === "Tickets" && <Tickets />}
      {tab === "Audit Log" && <AuditLog />}
    </div>
  );
}

function TimezoneSelect({ value, onChange }) {
  return (
    <select className="field" value={value} onChange={(e) => onChange(e.target.value)}>
      {TIMEZONE_GROUPS.map((group) => (
        <optgroup key={group.label} label={group.label}>
          {group.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

// TKT-0028: an Occurrence's Facilitator either links to a real account
// (dropdown, display name auto-syncs on save, can never drift stale
// again) or stays plain free text (guest/placeholder instructor with no
// account, the field's original, still fully-supported behavior).
// Selecting "Type a name instead…" clears the link and falls back to a
// plain text input pre-filled with whatever name was last shown.
// TKT-0117: candidateUsers is scoped by the caller to whichever account
// type actually fits the context (Teacher for a cohort class, or the
// Service's own role group -- e.g. Staff -- for a role-based service).
function FacilitatorInput({ facilitator, facilitatorUserId, teacherUsers: candidateUsers, onChange }) {
  const isLinked = !!facilitatorUserId;
  if (isLinked) {
    return (
      <select
        className="field"
        value={facilitatorUserId}
        onChange={(e) => {
          const picked = candidateUsers.find((u) => u.UserID === e.target.value);
          onChange({ facilitator: picked?.Name || "", facilitatorUserId: picked?.UserID || "" });
        }}
      >
        {candidateUsers.map((u) => (
          <option key={u.UserID} value={u.UserID}>
            {u.Name}
          </option>
        ))}
        <option value="">Type a name instead…</option>
      </select>
    );
  }
  return (
    <span className="flex gap-1">
      <input
        className="field"
        placeholder="Instructor"
        value={facilitator}
        onChange={(e) => onChange({ facilitator: e.target.value, facilitatorUserId: "" })}
      />
      {candidateUsers.length > 0 && (
        <select
          className="field"
          style={{ maxWidth: 40 }}
          value=""
          title="Link to an account instead"
          onChange={(e) => {
            const picked = candidateUsers.find((u) => u.UserID === e.target.value);
            if (picked) onChange({ facilitator: picked.Name, facilitatorUserId: picked.UserID });
          }}
        >
          <option value="">🔗</option>
          {candidateUsers.map((u) => (
            <option key={u.UserID} value={u.UserID}>
              {u.Name}
            </option>
          ))}
        </select>
      )}
    </span>
  );
}

function Badge({ children, kind = "info" }) {
  return <span className={`badge badge-${kind}`}>{children}</span>;
}

// TKT-0131: Pipeline used to show only the current Status string
// ("FeedbackSubmitted", "OfferSent"...), leaving admins to hold the full
// ordered sequence in their head to tell what's next or whether something's
// stuck. This renders the whole sequence at once with the current step
// called out, so the next required action is visible without leaving the
// row. Not a regression fix (git history confirmed no such view ever
// existed) -- new functionality against the confirmed sequences: Trial is
// Pending -> Scheduled -> Feedback -> Service Added (app/api/schedule/
// requests/route.js sets Scheduled, app/api/trial-feedback/route.js sets
// FeedbackSubmitted, app/api/trial-enroll/route.js sets ServiceAdded);
// Interview is Pending -> Scheduled -> Task Submitted -> Offer Sent ->
// Accepted (app/api/interview-task/route.js, app/api/interview-offer/
// route.js). Rejected/Waitlisted are dead ends off that line, not a step
// on it, so they render as a plain badge instead of a stepper position.
const TRIAL_STEPS = ["Pending", "Scheduled", "Feedback", "Service Added"];
function trialStepIndex(t) {
  if (t.ServiceAdded) return 3;
  if (t.Status === "FeedbackSubmitted") return 2;
  if (t.Status === "Scheduled") return 1;
  return 0;
}

const INTERVIEW_STEPS = ["Pending", "Scheduled", "Task Submitted", "Offer Sent", "Accepted"];
function interviewStepIndex(i) {
  if (i.Status === "OfferAccepted") return 4;
  if (i.Status === "OfferSent") return 3;
  if (i.Status === "TaskSubmitted") return 2;
  if (i.Status === "Scheduled") return 1;
  return 0;
}

function StepIndicator({ steps, currentIndex, deadEnd }) {
  if (deadEnd) return <Badge kind="bad">{deadEnd}</Badge>;
  return (
    <span className="flex items-center gap-1 flex-wrap text-xs" style={{ whiteSpace: "nowrap" }}>
      {steps.map((label, i) => (
        <span key={label} className="flex items-center gap-1">
          {i > 0 && <span style={{ color: "var(--muted)" }}>→</span>}
          <span
            style={{
              color: i < currentIndex ? "var(--good)" : i === currentIndex ? "var(--text)" : "var(--muted)",
              fontWeight: i === currentIndex ? 600 : 400,
              opacity: i > currentIndex ? 0.5 : 1,
            }}
          >
            {label}
          </span>
        </span>
      ))}
    </span>
  );
}

// TKT-0149: Pipeline's Trial/Interview tables only ever had a search box
// behind the "Filter" toggle -- Billing's tables already have a real
// status dropdown alongside search (BillingFilterBar's statusOptions),
// Pipeline never got the same treatment. Reusing that exact mechanism
// instead of building a second one.
const TRIAL_STATUS_FILTER_LABEL = {
  all: "All statuses",
  pending: "Pending",
  scheduled: "Scheduled",
  feedback: "Feedback submitted",
  "service-added": "Service added",
  rejected: "Rejected",
};
function trialRowMatchesStatusFilter(t, statusFilter) {
  switch (statusFilter) {
    case "pending":
      return t.Status === "Pending";
    case "scheduled":
      return t.Status === "Scheduled";
    case "feedback":
      return t.Status === "FeedbackSubmitted" && !t.ServiceAdded;
    case "service-added":
      return !!t.ServiceAdded;
    case "rejected":
      return t.Status === "Rejected";
    default:
      return true;
  }
}

const INTERVIEW_STATUS_FILTER_LABEL = {
  all: "All statuses",
  pending: "Pending",
  scheduled: "Scheduled",
  "task-submitted": "Task submitted",
  "offer-sent": "Offer sent",
  accepted: "Accepted",
  waitlisted: "Waitlisted",
  rejected: "Rejected",
};
function interviewRowMatchesStatusFilter(i, statusFilter) {
  switch (statusFilter) {
    case "pending":
      return i.Status === "Pending";
    case "scheduled":
      return i.Status === "Scheduled";
    case "task-submitted":
      return i.Status === "TaskSubmitted";
    case "offer-sent":
      return i.Status === "OfferSent";
    case "accepted":
      return i.Status === "OfferAccepted";
    case "waitlisted":
      return i.Status === "Waitlisted";
    case "rejected":
      return i.Status === "Rejected";
    default:
      return true;
  }
}

/* ---------------- Applications ---------------- */
function Applications() {
  const [regForms, setRegForms] = useState([]);
  const [issued, setIssued] = useState({}); // regFormId -> {username,password}
  const [error, setError] = useState("");
  const [busyIds, setBusyIds] = useState(new Set());
  const [search, setSearch] = useState("");
  const searchLower = search.trim().toLowerCase();
  const filtered = regForms.filter((r) => !searchLower || r.Name.toLowerCase().includes(searchLower));
  const { sorted, sortKey, sortDir, toggleSort } = useSort(filtered, "RegFormID");

  async function load() {
    const { regForms } = await api("/api/regforms");
    setRegForms(regForms);
  }
  useEffect(() => {
  // eslint-disable-next-line react-hooks/set-state-in-effect -- setState happens after an await inside load(), not synchronously; standard mount-time data-fetch pattern.
    load();
  }, []);

  async function act(regFormId, action) {
    setError("");
    setBusyIds((prev) => new Set(prev).add(regFormId));
    try {
      const res = await api("/api/regforms", {
        method: "PATCH",
        body: JSON.stringify({ regFormId, action }),
      });
      if (res.credentials) setIssued((prev) => ({ ...prev, [regFormId]: res.credentials }));
      // PATCH /api/regforms returns the full updated regForm on both
      // approve and reject branches. Applications only tracks `regForms`,
      // so a local merge is enough; no need to refetch the whole list.
      setRegForms((prev) => prev.map((r) => (r.RegFormID === regFormId ? res.regForm : r)));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(regFormId);
        return next;
      });
    }
  }

  return (
    <div className="card">
      <h2 className="font-semibold mb-4">RegForm Applications</h2>
      {error && <p style={{ color: "var(--bad)" }}>{error}</p>}
      <BillingFilterBar search={search} onSearch={setSearch} searchPlaceholder="Search applicant name…" />
      {/* TKT-0134: same maxHeight+overflowY cap as Enrollments/Pipeline. */}
      <div className="scroll-fade overflow-x-auto" style={{ maxHeight: 480, overflowY: "auto" }}>
      <table>
        <thead>
          <tr>
            <SortableTh label="ID" sortKeyName="RegFormID" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
            <SortableTh label="Name" sortKeyName="Name" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
            <SortableTh label="Type" sortKeyName="RequestedType" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
            <SortableTh label="Status" sortKeyName="Status" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
            <th>Credentials</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.RegFormID}>
              <td>{r.RegFormID}</td>
              <td>{r.Name}</td>
              <td>{BOOKING_TYPE_LABEL[r.RequestedType] || r.RequestedType}</td>
              <td>
                <Badge kind={r.Status === "Pending" ? "pending" : r.Status === "Approved" ? "good" : "bad"}>
                  {r.Status}
                </Badge>
              </td>
              <td>
                {(() => {
                  // Password is hashed server-side (lib/passwords.js) --
                  // r.Password no longer comes back from GET /api/regforms.
                  // `issued[r.RegFormID]` (this session's own just-approved
                  // reveal) is the only source left for a visible password.
                  if (issued[r.RegFormID]) {
                    const cred = issued[r.RegFormID];
                    return (
                      <span className="flex items-center gap-1 flex-wrap">
                        <span style={{ color: "var(--muted)" }}>
                          {cred.username} / {cred.password}
                        </span>
                        <CopyCredentialsButton credentials={cred} />
                      </span>
                    );
                  }
                  return r.Username ? (
                    <span style={{ color: "var(--muted)" }}>{r.Username} (Reset password in Accounts to view)</span>
                  ) : (
                    "—"
                  );
                })()}
              </td>
              <td className="space-x-2">
                {r.Status === "Pending" && (
                  <>
                    <button className="btn" disabled={busyIds.has(r.RegFormID)} onClick={() => act(r.RegFormID, "approve")}>
                      {busyIds.has(r.RegFormID) ? "Working…" : "Approve"}
                    </button>
                    <button className="btn-ghost" disabled={busyIds.has(r.RegFormID)} onClick={() => act(r.RegFormID, "reject")}>
                      {busyIds.has(r.RegFormID) ? "Working…" : "Reject"}
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
          {regForms.length === 0 && (
            <tr>
              <td colSpan={6} style={{ color: "var(--muted)" }}>
                No applications yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}

/* ---------------- Pipeline ---------------- */
function Pipeline() {
  const [trialItems, setTrialItems] = useState([]);
  const [interviewItems, setInterviewItems] = useState([]);
  const [leads, setLeads] = useState([]);
  const [users, setUsers] = useState([]);
  const [services, setServices] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [issued, setIssued] = useState({});
  const [pendingTrials, setPendingTrials] = useState([]);
  const [pendingInterviews, setPendingInterviews] = useState([]);
  const [openPoolSlots, setOpenPoolSlots] = useState([]);
  const [scheduleItems, setScheduleItems] = useState([]);
  const [error, setError] = useState("");
  const [busyTrialIds, setBusyTrialIds] = useState(new Set());
  const [busyAccountIds, setBusyAccountIds] = useState(new Set());
  const [busyRequestIds, setBusyRequestIds] = useState(new Set());

  async function load() {
    const [{ users }, { services }, { invoices }, { pendingTrials, pendingInterviews }, { openPoolSlotIds, scheduleItems }, { leads }] = await Promise.all([
      api("/api/users"),
      api("/api/services"),
      api("/api/invoices"),
      api("/api/schedule/requests"),
      api("/api/schedule"),
      api("/api/leads"),
    ]);
    setUsers(users);
    setServices(services);
    setInvoices(invoices);
    setPendingTrials(pendingTrials);
    setPendingInterviews(pendingInterviews);
    setLeads(leads);
    // /api/schedule now sends open-pool IDs only (not full duplicate
    // objects, see its own comment) — reconstitute from scheduleItems,
    // which we already have in full.
    const openPoolIdSet = new Set(openPoolSlotIds);
    setOpenPoolSlots(scheduleItems.filter((s) => openPoolIdSet.has(s.ScheduleID)));
    setScheduleItems(scheduleItems);
    // trial/interview items aren't exposed as a top-level list endpoint;
    // derive them from each pending account's /api/me bundle instead — run
    // every account's fetch concurrently rather than one at a time (this was
    // a real N+1: sequential /api/me calls, one per pending account).
    // TKT-0133: a TeacherInterviewAcc can now ALSO request a Trial
    // (demo-teach a Student service) alongside their own Interview — its
    // bundle needs fetching here too, or its Trial request would be
    // created successfully but never actually appear in the Trial
    // Pipeline table for Management to approve. Fetched twice for a
    // TeacherInterviewAcc (once here, once via interviewAccs below) —
    // redundant, not incorrect, and this whole path already exists purely
    // to avoid a real top-level list endpoint.
    const trialAccs = users.filter((u) => u.UserType === "TrialAcc" || u.UserType === "TeacherInterviewAcc");
    const interviewAccs = users.filter((u) => INTERVIEW_ACC_TYPES.includes(u.UserType));
    const [trialBundles, interviewBundles] = await Promise.all([
      Promise.all(trialAccs.map((acc) => api(`/api/me?userId=${acc.UserID}`))),
      Promise.all(interviewAccs.map((acc) => api(`/api/me?userId=${acc.UserID}`))),
    ]);
    setTrialItems(trialBundles.flatMap((b) => b.trialItems));
    setInterviewItems(interviewBundles.flatMap((b) => b.interviewItems));
  }
  useEffect(() => {
  // eslint-disable-next-line react-hooks/set-state-in-effect -- setState happens after an await inside load(), not synchronously; standard mount-time data-fetch pattern.
    load();
  }, []);

  function nameOf(id) {
    return users.find((u) => u.UserID === id)?.Name || id;
  }
  function serviceNameOf(id) {
    const s = services.find((s) => s.ServiceID === id);
    return s ? s.Name : id;
  }
  function accountOf(id) {
    return users.find((u) => u.UserID === id);
  }
  // TKT-0111: the Pipeline table only ever showed Name/Service/Status --
  // once a Trial/Interview is approved and assigned a slot, there was no
  // way to see the scheduled date/time or instructor from this table at
  // all (not even a blank cell, the columns just didn't exist), which is
  // why "no instructor" kept showing even for slots that had one set.
  function slotOf(scheduleId) {
    return scheduleItems.find((s) => s.ScheduleID === scheduleId) || null;
  }
  function invoiceFor(trial) {
    // Invoices are billed to the converted Student's own ID, not the TrialAcc
    // ID — a Trial produces no invoice until Management adds the Service.
    const account = accountOf(trial.TrialAccID);
    const studentId = account?.ConvertedToUserID || trial.TrialAccID;
    return invoices.find((inv) => inv.StudentID === studentId && inv.ServiceID === trial.ServiceID);
  }

  async function addService(trialId) {
    setError("");
    setBusyTrialIds((prev) => new Set(prev).add(trialId));
    try {
      // POST /api/trial-enroll returns only { enrollment, invoice }. It
      // does NOT return the updated trialItem, whose ServiceAdded flag
      // flips to true server-side, and Pipeline has no enrollments state
      // to merge into either. Left on load() because the response doesn't
      // cover what this component renders: the trial row's ServiceAdded
      // check mark badge.
      await api("/api/trial-enroll", { method: "POST", body: JSON.stringify({ trialId }) });
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyTrialIds((prev) => {
        const next = new Set(prev);
        next.delete(trialId);
        return next;
      });
    }
  }

  async function sendOffer(interviewId, feedback, offerLetterLink) {
    // POST /api/interview-offer returns { interviewItem }, the full record
    // in the same shape as what's in interviewItems (both come straight
    // off db.interviewItems). Safe to merge locally instead of a full reload.
    const { interviewItem } = await api("/api/interview-offer", { method: "POST", body: JSON.stringify({ interviewId, action: "send", feedback, offerLetterLink }) });
    setInterviewItems((prev) => prev.map((i) => (i.InterviewID === interviewId ? interviewItem : i)));
  }

  async function setInterviewOutcome(interviewId, action, feedback) {
    const { interviewItem } = await api("/api/interview-offer", { method: "POST", body: JSON.stringify({ interviewId, action, feedback }) });
    setInterviewItems((prev) => prev.map((i) => (i.InterviewID === interviewId ? interviewItem : i)));
  }

  async function sendTask(interviewId) {
    const { interviewItem } = await api("/api/interview-task", { method: "PATCH", body: JSON.stringify({ interviewId }) });
    setInterviewItems((prev) => prev.map((i) => (i.InterviewID === interviewId ? interviewItem : i)));
  }

  async function convert(accountId) {
    setError("");
    setBusyAccountIds((prev) => new Set(prev).add(accountId));
    try {
      // POST /api/convert returns { oldUser, newUser, credentials }, enough
      // to merge `users`. But when newUser.UserType === "Student" the route
      // also reassigns every existing invoice's StudentID from the old
      // TrialAcc id to the new Student id (see app/api/convert/route.js),
      // and that updated invoices array isn't in the response. invoiceFor()
      // here keys off StudentID, so a users-only merge would make paid/sent
      // invoices vanish from the Trial Pipeline table until the next reload.
      // Left on load() rather than risk a wrong billing-status display.
      const res = await api("/api/convert", { method: "POST", body: JSON.stringify({ accountId }) });
      setIssued((prev) => ({ ...prev, [accountId]: res.credentials }));
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyAccountIds((prev) => {
        const next = new Set(prev);
        next.delete(accountId);
        return next;
      });
    }
  }

  async function actOnRequest(type, id, action, scheduleId) {
    setError("");
    setBusyRequestIds((prev) => new Set(prev).add(id));
    try {
      // PATCH /api/schedule/requests returns { trialItem } for type==="Trial"
      // and { interviewItem } otherwise, the full record in both cases,
      // matching the shape trialItems/interviewItems already hold. GET's
      // own pendingTrials/pendingInterviews are filtered server-side to
      // Status==="Pending", so once approved or rejected the item stops
      // qualifying. Dropping it from the pending list locally matches
      // what a refetch would return.
      const res = await api("/api/schedule/requests", { method: "PATCH", body: JSON.stringify({ type, id, action, scheduleId }) });
      if (type === "Trial") {
        setPendingTrials((prev) => prev.filter((t) => t.TrialID !== id));
        setTrialItems((prev) => prev.map((t) => (t.TrialID === id ? res.trialItem : t)));
      } else {
        setPendingInterviews((prev) => prev.filter((i) => i.InterviewID !== id));
        setInterviewItems((prev) => prev.map((i) => (i.InterviewID === id ? res.interviewItem : i)));
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyRequestIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  // TKT-0021: approving an Interview request with a brand-new slot (rather
  // than an existing open-pool one) — create the slot first via the same
  // endpoint Management's Schedule tab already uses, then approve with it.
  async function createSlotAndApprove(bookingType, interviewId, serviceId, date, time, duration, facilitator) {
    setError("");
    setBusyRequestIds((prev) => new Set(prev).add(interviewId));
    try {
      const { scheduleItem } = await api("/api/schedule", {
        method: "POST",
        body: JSON.stringify({ serviceType: bookingType, serviceId, date, time, duration, facilitator }),
      });
      await actOnRequest(bookingType, interviewId, "approve", scheduleItem.ScheduleID);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyRequestIds((prev) => {
        const next = new Set(prev);
        next.delete(interviewId);
        return next;
      });
    }
  }

  // TKT-0113: Convert used to be clickable the moment a Trial/Interview
  // account existed, before the candidate had actually accepted anything.
  // Interview's readiness signal is its own item reaching OfferAccepted.
  // Trial has no literal "offer" -- its equivalent commitment point is
  // Feedback being submitted, NOT ServiceAdded (that flag only gets set
  // AFTER conversion, by app/api/trial-enroll/route.js, which itself
  // requires the account already be Converted -- gating on it here would
  // make Convert and Add Service deadlock each other).
  // TKT-0124: `.find()` picked whichever item happened to sit first for
  // this account, silently assuming exactly one trial/interview item ever
  // exists per account. A real account can accumulate several across
  // different service applications (re-interviewing, retrying a trial for
  // another subject); the button then judged eligibility off a stale
  // earlier application instead of the one that actually reached the
  // eligible status, hiding Convert even when a real qualifying item
  // existed. `.some()` checks every item for this account, not just the
  // first one found.
  function conversionEligible(accountId) {
    const interviews = interviewItems.filter((i) => i.InterviewAccID === accountId);
    if (interviews.length) return interviews.some((i) => i.Status === "OfferAccepted");
    const trials = trialItems.filter((t) => t.TrialAccID === accountId);
    if (trials.length) return trials.some((t) => t.Status === "FeedbackSubmitted");
    return true;
  }

  function AccountCell({ accountId }) {
    const account = accountOf(accountId);
    if (!account) return "—";
    if (issued[accountId]) {
      return (
        <span className="flex items-center gap-1 flex-wrap">
          <span style={{ color: "var(--muted)" }}>
            {issued[accountId].username} / {issued[accountId].password}
          </span>
          <CopyCredentialsButton credentials={issued[accountId]} />
        </span>
      );
    }
    // A record can have Status "Converted" with no ConvertedToUserID (seen
    // live on TIN-0001) -- stale seed data, not a real conversion, and the
    // account is otherwise permanently stuck with no linked record and no
    // way to fix it. Treat that combination as not really converted.
    if (account.Status === "Converted" && account.ConvertedToUserID) {
      return <span style={{ color: "var(--muted)" }}>→ {account.ConvertedToUserID}</span>;
    }
    if (!conversionEligible(accountId)) {
      return <span style={{ color: "var(--muted)" }}>Not yet accepted</span>;
    }
    return (
      <button className="btn-ghost" disabled={busyAccountIds.has(accountId)} onClick={() => convert(accountId)}>
        {busyAccountIds.has(accountId) ? "Converting…" : "Convert"}
      </button>
    );
  }

  const [trialSearch, setTrialSearch] = useState("");
  const [trialStatusFilter, setTrialStatusFilter] = useState("all");
  const [interviewSearch, setInterviewSearch] = useState("");
  const [interviewStatusFilter, setInterviewStatusFilter] = useState("all");
  // TKT-0148: "Scheduled" had no sort at all -- _scheduledAt gives it a
  // plain sortable string (slot's own Date+Time, blank for not-yet-
  // scheduled rows, which sorts first).
  const trialRows = trialItems
    .map((t) => {
      const slot = t.ScheduleItemID ? slotOf(t.ScheduleItemID) : null;
      return { ...t, _name: nameOf(t.TrialAccID), _service: serviceNameOf(t.ServiceID), _scheduledAt: slot ? `${slot.Date} ${slot.Time}` : "" };
    })
    .filter((t) => {
      const q = trialSearch.trim().toLowerCase();
      return (!q || t._name.toLowerCase().includes(q) || t._service.toLowerCase().includes(q)) && trialRowMatchesStatusFilter(t, trialStatusFilter);
    });
  const trialSort = useSort(trialRows, "_name");
  const interviewRows = interviewItems
    .map((i) => {
      const slot = i.ScheduleItemID ? slotOf(i.ScheduleItemID) : null;
      return { ...i, _name: nameOf(i.InterviewAccID), _service: serviceNameOf(i.ServiceID), _scheduledAt: slot ? `${slot.Date} ${slot.Time}` : "" };
    })
    .filter((i) => {
      const q = interviewSearch.trim().toLowerCase();
      return (!q || i._name.toLowerCase().includes(q) || i._service.toLowerCase().includes(q)) && interviewRowMatchesStatusFilter(i, interviewStatusFilter);
    });
  const interviewSort = useSort(interviewRows, "_name");
  // TKT-0080/TKT-0021: neither a Trial nor an Interview request has a Slot
  // yet at the pending stage anymore — Management assigns one on approval,
  // via the same InterviewSlotAssign control for both — so _service comes
  // from the request's own ServiceID, and _date/_time are always empty here.
  const pendingRows = [
    ...pendingTrials.map((t) => ({
      ...t,
      _type: "Trial",
      _requester: t.RequesterName,
      _service: serviceNameOf(t.ServiceID),
      _date: "",
      _time: "",
      _bookingType: "Trial",
    })),
    ...pendingInterviews.map((i) => ({
      ...i,
      _type: INTERVIEW_ACC_LABEL[i.RequesterType] || "Interview",
      _requester: i.RequesterName,
      _service: serviceNameOf(i.ServiceID),
      _date: "",
      _time: "",
      _bookingType: i.RequesterType ? i.RequesterType.replace(/Acc$/, "") : "StaffInterview",
    })),
  ];
  // TKT-0080: neither Trial nor Interview requests carry a real date at the
  // pending stage anymore (both are request-only now) — sort by type
  // instead of the always-empty _date this defaulted to before.
  const pendingSort = useSort(pendingRows, "_type");

  return (
    <div className="grid gap-6">
      {error && <p style={{ color: "var(--bad)" }}>{error}</p>}
      <div className="card">
        <h2 className="font-semibold mb-4">Trial Pipeline</h2>
        <BillingFilterBar
          search={trialSearch}
          onSearch={setTrialSearch}
          searchPlaceholder="Search name or service…"
          statusFilter={trialStatusFilter}
          onStatusFilter={setTrialStatusFilter}
          statusOptions={TRIAL_STATUS_FILTER_LABEL}
        />
        {/* TKT-0134: same maxHeight+overflowY cap as Enrollments (TKT-0114)
            — Pipeline tables grow unbounded with real bookings and were
            called out by name as needing this. */}
        <div className="scroll-fade overflow-x-auto" style={{ maxHeight: 480, overflowY: "auto" }}>
        <table>
          <thead>
            <tr>
              <SortableTh label="Name" sortKeyName="_name" sortKey={trialSort.sortKey} sortDir={trialSort.sortDir} onSort={trialSort.toggleSort} />
              <SortableTh label="Service" sortKeyName="_service" sortKey={trialSort.sortKey} sortDir={trialSort.sortDir} onSort={trialSort.toggleSort} />
              <SortableTh label="Progress" sortKeyName="Status" sortKey={trialSort.sortKey} sortDir={trialSort.sortDir} onSort={trialSort.toggleSort} />
              <SortableTh label="Scheduled" sortKeyName="_scheduledAt" sortKey={trialSort.sortKey} sortDir={trialSort.sortDir} onSort={trialSort.toggleSort} />
              <th>Instructor</th>
              <th>Feedback</th>
              <th></th>
              <th>Invoice</th>
              <th>Account</th>
            </tr>
          </thead>
          <tbody>
            {trialSort.sorted.map((t) => {
              const invoice = invoiceFor(t);
              const slot = t.ScheduleItemID ? slotOf(t.ScheduleItemID) : null;
              return (
                <tr key={t.TrialID}>
                  <td>{t._name}</td>
                  <td>
                    <span className="subject-truncate" title={t._service}>{t._service}</span>
                  </td>
                  <td>
                    <StepIndicator steps={TRIAL_STEPS} currentIndex={trialStepIndex(t)} deadEnd={t.Status === "Rejected" ? "Rejected" : null} />
                  </td>
                  <td style={{ color: "var(--muted)" }}>{slot ? `${formatDate(slot.Date)} at ${slot.Time}` : "—"}</td>
                  <td style={{ color: "var(--muted)" }}>{slot ? slot.Facilitator || "no instructor set" : "—"}</td>
                  <td style={{ color: "var(--muted)" }}>{t.Feedback || "—"}</td>
                  <td>
                    {t.Status === "FeedbackSubmitted" && !t.ServiceAdded && (
                      <button className="btn" disabled={busyTrialIds.has(t.TrialID)} onClick={() => addService(t.TrialID)}>
                        {busyTrialIds.has(t.TrialID) ? "Adding…" : "Add Service"}
                      </button>
                    )}
                    {t.ServiceAdded && <span style={{ color: "var(--good)" }}>Added ✓</span>}
                  </td>
                  <td>
                    {invoice ? (
                      <span className={`badge ${invoice.Status === "Sent" || invoice.Status === "Paid" ? "badge-good" : "badge-pending"}`}>
                        {invoice.Status}
                      </span>
                    ) : (
                      <span style={{ color: "var(--muted)" }}>—</span>
                    )}
                  </td>
                  <td><AccountCell accountId={t.TrialAccID} /></td>
                </tr>
              );
            })}
            {trialRows.length === 0 && (
              <tr><td colSpan={9} style={{ color: "var(--muted)" }}>{trialItems.length === 0 ? "No trial bookings yet." : "No matches."}</td></tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      <div className="card">
        <h2 className="font-semibold mb-4">Interview Pipeline</h2>
        <BillingFilterBar
          search={interviewSearch}
          onSearch={setInterviewSearch}
          searchPlaceholder="Search name or service…"
          statusFilter={interviewStatusFilter}
          onStatusFilter={setInterviewStatusFilter}
          statusOptions={INTERVIEW_STATUS_FILTER_LABEL}
        />
        {/* TKT-0134: same cap as Trial Pipeline above. */}
        <div className="scroll-fade overflow-x-auto" style={{ maxHeight: 480, overflowY: "auto" }}>
        <table>
          <thead>
            <tr>
              <SortableTh label="Name" sortKeyName="_name" sortKey={interviewSort.sortKey} sortDir={interviewSort.sortDir} onSort={interviewSort.toggleSort} />
              <SortableTh label="Service" sortKeyName="_service" sortKey={interviewSort.sortKey} sortDir={interviewSort.sortDir} onSort={interviewSort.toggleSort} />
              <SortableTh label="Progress" sortKeyName="Status" sortKey={interviewSort.sortKey} sortDir={interviewSort.sortDir} onSort={interviewSort.toggleSort} />
              <SortableTh label="Scheduled" sortKeyName="_scheduledAt" sortKey={interviewSort.sortKey} sortDir={interviewSort.sortDir} onSort={interviewSort.toggleSort} />
              <th>Instructor</th>
              <th>Task</th>
              <th>Offer</th>
              <th></th>
              <th>Account</th>
            </tr>
          </thead>
          <tbody>
            {interviewSort.sorted.map((i) => {
              const slot = i.ScheduleItemID ? slotOf(i.ScheduleItemID) : null;
              return (
              <tr key={i.InterviewID}>
                <td>{i._name}</td>
                <td>
                  <span className="subject-truncate" title={i._service}>{i._service}</span>
                </td>
                <td>
                  <StepIndicator
                    steps={INTERVIEW_STEPS}
                    currentIndex={interviewStepIndex(i)}
                    deadEnd={i.Status === "Rejected" ? "Rejected" : i.Status === "Waitlisted" ? "Waitlisted" : null}
                  />
                  {/* TKT-0033 */}
                  {i.OfferSentAt && (
                    <div className="text-xs" style={{ color: "var(--muted)" }}>
                      Sent {formatDate(i.OfferSentAt)}
                    </div>
                  )}
                  {i.OfferAcceptedAt && (
                    <div className="text-xs" style={{ color: "var(--muted)" }}>
                      Accepted {formatDate(i.OfferAcceptedAt)}
                    </div>
                  )}
                </td>
                <td style={{ color: "var(--muted)" }}>{slot ? `${formatDate(slot.Date)} at ${slot.Time}` : "—"}</td>
                <td style={{ color: "var(--muted)" }}>{slot ? slot.Facilitator || "no instructor set" : "—"}</td>
                <td style={{ color: "var(--muted)" }}>
                  {i.TaskSubmissionLink ? (
                    <a href={i.TaskSubmissionLink} target="_blank" rel="noreferrer" className="underline">
                      link
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td style={{ color: "var(--muted)" }}>
                  {i.OfferLetterLink ? (
                    <a href={i.OfferLetterLink} target="_blank" rel="noreferrer" className="underline">
                      link
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td>
                  {i.Status === "Scheduled" && !i.TaskSentAt && (
                    <button className="btn" onClick={() => sendTask(i.InterviewID)}>
                      Send Task
                    </button>
                  )}
                  {i.Status === "TaskSubmitted" && (
                    <InterviewOutcomeForm
                      initialFeedback={i.TaskFeedback}
                      initialLink={i.OfferLetterLink}
                      onSendOffer={(feedback, link) => sendOffer(i.InterviewID, feedback, link)}
                      onWaitlist={(feedback) => setInterviewOutcome(i.InterviewID, "waitlist", feedback)}
                      onReject={(feedback) => setInterviewOutcome(i.InterviewID, "reject", feedback)}
                    />
                  )}
                  {i.Status === "OfferSent" && (
                    <OfferSentControls
                      item={i}
                      onSave={(feedback, link) => sendOffer(i.InterviewID, feedback, link)}
                      onUnsend={() => setInterviewOutcome(i.InterviewID, "unsend")}
                    />
                  )}
                </td>
                <td><AccountCell accountId={i.InterviewAccID} /></td>
              </tr>
              );
            })}
            {interviewRows.length === 0 && (
              <tr><td colSpan={9} style={{ color: "var(--muted)" }}>{interviewItems.length === 0 ? "No interview bookings yet." : "No matches."}</td></tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* TKT-0169: website contact-form submissions -- read-only, no
          approve/convert workflow like Trial/Interview since a lead isn't
          an account, just an inquiry someone reviews and follows up on
          manually (by email/WhatsApp). */}
      <div className="card">
        <h2 className="font-semibold mb-4">Inquiries</h2>
        <div className="scroll-fade overflow-x-auto" style={{ maxHeight: 480, overflowY: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>WhatsApp</th>
              <th>Country</th>
              <th>Notes</th>
              <th>Received</th>
            </tr>
          </thead>
          <tbody>
            {[...leads].reverse().map((l) => (
              <tr key={l.LeadID}>
                <td>{l.Name}</td>
                <td>{l.Email}</td>
                <td style={{ color: "var(--muted)" }}>{l.WhatsAppNumber || "—"}</td>
                <td style={{ color: "var(--muted)" }}>{l.Country || "—"}</td>
                <td style={{ color: "var(--muted)" }}>
                  <span className="subject-truncate" title={l.Notes}>{l.Notes || "—"}</span>
                </td>
                <td style={{ color: "var(--muted)" }}>{formatDate(l.CreatedAt)}</td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr><td colSpan={6} style={{ color: "var(--muted)" }}>No inquiries yet.</td></tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      <div className="card">
        <h2 className="font-semibold mb-4">Pending Requests</h2>
        {/* TKT-0134: same cap as the two Pipeline tables above. */}
        <div className="scroll-fade overflow-x-auto" style={{ maxHeight: 480, overflowY: "auto" }}>
        <table>
          <thead>
            <tr>
              <SortableTh label="Type" sortKeyName="_type" sortKey={pendingSort.sortKey} sortDir={pendingSort.sortDir} onSort={pendingSort.toggleSort} />
              <SortableTh label="Requester" sortKeyName="_requester" sortKey={pendingSort.sortKey} sortDir={pendingSort.sortDir} onSort={pendingSort.toggleSort} />
              <SortableTh label="Service" sortKeyName="_service" sortKey={pendingSort.sortKey} sortDir={pendingSort.sortDir} onSort={pendingSort.toggleSort} />
              <th colSpan={2}>Assign slot</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pendingSort.sorted.map((row) => {
              // TKT-0080: Trial requests now go through the exact same
              // slot-assignment flow Interview requests already used
              // (TKT-0021) — neither has a Slot at the pending stage
              // anymore, so both share this one render path.
              const id = row.TrialID || row.InterviewID;
              return (
                <tr key={id}>
                  <td>{row._type}</td>
                  <td>{row._requester}</td>
                  <td>
                    <span className="subject-truncate" title={row._service}>{row._service}</span>
                  </td>
                  <td colSpan={2}>
                    <InterviewSlotAssign
                      row={row}
                      openPoolSlots={openPoolSlots}
                      onApproveWithSlot={(scheduleId) => actOnRequest(row._bookingType, id, "approve", scheduleId)}
                      onCreateAndApprove={(date, time, duration, facilitator) =>
                        createSlotAndApprove(row._bookingType, id, row.ServiceID, date, time, duration, facilitator)
                      }
                    />
                  </td>
                  <td>
                    <button
                      className="btn-ghost"
                      disabled={busyRequestIds.has(id)}
                      onClick={() => actOnRequest(row._bookingType, id, "reject")}
                    >
                      {busyRequestIds.has(id) ? "Working…" : "Reject"}
                    </button>
                  </td>
                </tr>
              );
            })}
            {pendingTrials.length === 0 && pendingInterviews.length === 0 && (
              <tr>
                <td colSpan={6} style={{ color: "var(--muted)" }}>
                  No pending requests.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

// TKT-0021/TKT-0016: the requester never picked a slot -- Management assigns
// one right here when approving. Either pick an existing open-pool slot for
// this same Service (future dates only), or create a brand-new one on the
// spot via the same fields Schedule Pool's own "Offer a Slot" form uses.
// TKT-0112: "existing open slot" includes every unbooked ScheduleItem for
// the Service, not just manually-offered Trial/Interview slots -- a
// regular recurring class occurrence counts too (assigning a Trial
// student into a real ongoing class is a legitimate choice). Two
// different Batches can genuinely meet at the same day/time, which used
// to render as two identical-looking options with no way to tell them
// apart -- BatchName is now shown so they're distinguishable.
function InterviewSlotAssign({ row, openPoolSlots, onApproveWithSlot, onCreateAndApprove }) {
  const [mode, setMode] = useState("existing");
  const [scheduleId, setScheduleId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(1);
  const [facilitator, setFacilitator] = useState("");
  const [saving, setSaving] = useState(false);

  async function runApprove(fn, ...args) {
    setSaving(true);
    try {
      await fn(...args);
    } finally {
      setSaving(false);
    }
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const candidateSlots = openPoolSlots.filter((s) => s.ServiceID === row.ServiceID && s.Date >= todayStr);

  if (mode === "existing") {
    return (
      <div className="flex gap-2 items-center flex-wrap">
        <select className="field" style={{ width: 220 }} value={scheduleId} onChange={(e) => setScheduleId(e.target.value)}>
          <option value="">Select an open slot…</option>
          {candidateSlots.map((s) => (
            <option key={s.ScheduleID} value={s.ScheduleID}>
              {formatDate(s.Date)} at {s.Time}
              {s.BatchName ? ` · ${s.BatchName}` : ""} ({s.Facilitator || "no instructor set"})
            </option>
          ))}
        </select>
        <button
          className="btn"
          type="button"
          disabled={!scheduleId || saving}
          onClick={() => runApprove(onApproveWithSlot, scheduleId)}
        >
          {saving ? "Approving…" : "Approve"}
        </button>
        <button className="btn-ghost" type="button" onClick={() => setMode("new")}>
          + New slot instead
        </button>
        {candidateSlots.length === 0 && (
          <span className="text-sm" style={{ color: "var(--muted)" }}>
            No open slots for this service yet.
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex gap-2 items-end flex-wrap">
      <label className="text-xs" style={{ color: "var(--muted)" }}>
        Date
        <input className="field" style={{ width: 130, display: "block" }} type="date" min={todayStr} value={date} onChange={(e) => setDate(e.target.value)} />
      </label>
      <label className="text-xs" style={{ color: "var(--muted)" }}>
        Time
        <input className="field" style={{ width: 100, display: "block" }} type="time" value={time} onChange={(e) => setTime(e.target.value)} />
      </label>
      <input
        className="field"
        style={{ width: 70 }}
        type="number"
        step="0.5"
        min="0.5"
        placeholder="Hrs"
        value={duration}
        onChange={(e) => setDuration(e.target.value)}
      />
      <input
        className="field"
        style={{ width: 130 }}
        placeholder="Instructor"
        value={facilitator}
        onChange={(e) => setFacilitator(e.target.value)}
      />
      <button
        className="btn"
        type="button"
        disabled={!date || !time || saving}
        onClick={() => runApprove(onCreateAndApprove, date, time, duration, facilitator)}
      >
        {saving ? "Creating…" : "Create & Approve"}
      </button>
      {candidateSlots.length > 0 && (
        <button className="btn-ghost" type="button" onClick={() => setMode("existing")}>
          Use existing slot instead
        </button>
      )}
    </div>
  );
}

function InterviewOutcomeForm({ initialFeedback, initialLink, onSendOffer, onWaitlist, onReject }) {
  const [feedback, setFeedback] = useState(initialFeedback || "");
  const [offerLetterLink, setOfferLetterLink] = useState(initialLink || "");
  const [saving, setSaving] = useState(false);

  async function run(fn, ...args) {
    setSaving(true);
    try {
      await fn(...args);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      <input
        className="field"
        style={{ width: 160 }}
        placeholder="Feedback on task…"
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
      />
      <input
        className="field"
        style={{ width: 160 }}
        placeholder="Offer letter link…"
        value={offerLetterLink}
        onChange={(e) => setOfferLetterLink(e.target.value)}
      />
      <div className="flex gap-2">
        <button
          className="btn"
          type="button"
          disabled={!offerLetterLink.trim() || saving}
          onClick={() => run(onSendOffer, feedback, offerLetterLink)}
        >
          {saving ? "Sending…" : "Send offer"}
        </button>
        <button className="btn-ghost" type="button" disabled={saving} onClick={() => run(onWaitlist, feedback)}>
          Waitlist
        </button>
        <button className="btn-ghost" style={{ color: "var(--bad)" }} type="button" disabled={saving} onClick={() => run(onReject, feedback)}>
          Reject
        </button>
      </div>
    </div>
  );
}

function OfferSentControls({ item, onSave, onUnsend }) {
  const [editing, setEditing] = useState(false);
  const [feedback, setFeedback] = useState(item.TaskFeedback || "");
  const [offerLetterLink, setOfferLetterLink] = useState(item.OfferLetterLink || "");
  const [saving, setSaving] = useState(false);

  async function run(fn, ...args) {
    setSaving(true);
    try {
      await fn(...args);
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="space-y-2">
        <input
          className="field"
          style={{ width: 160 }}
          placeholder="Feedback on task…"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
        />
        <input
          className="field"
          style={{ width: 160 }}
          placeholder="Offer letter link…"
          value={offerLetterLink}
          onChange={(e) => setOfferLetterLink(e.target.value)}
        />
        <div className="flex gap-2">
          <button
            className="btn"
            type="button"
            disabled={!offerLetterLink.trim() || saving}
            onClick={async () => {
              await run(onSave, feedback, offerLetterLink);
              setEditing(false);
            }}
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            className="btn-ghost"
            type="button"
            disabled={saving}
            onClick={() => {
              setFeedback(item.TaskFeedback || "");
              setOfferLetterLink(item.OfferLetterLink || "");
              setEditing(false);
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <button className="btn-ghost" type="button" onClick={() => setEditing(true)}>
        Edit
      </button>
      <button className="btn-ghost" type="button" disabled={saving} onClick={() => run(onUnsend)}>
        {saving ? "Unsending…" : "Unsend"}
      </button>
    </div>
  );
}

/* ---------------- Accounts ---------------- */
function Accounts() {
  const [users, setUsers] = useState([]);
  const [issued, setIssued] = useState({});
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [busyAccountIds, setBusyAccountIds] = useState(new Set());
  const [busySaveIds, setBusySaveIds] = useState(new Set());
  // TKT-0113: Convert needs to know whether the account has actually
  // reached the accepted/committed point (Interview: OfferAccepted;
  // Trial: Feedback submitted -- not ServiceAdded, which only gets set
  // AFTER conversion), mirroring the same check now applied in
  // Pipeline's own Convert control.
  // TKT-0124: same `.find()`-picks-the-wrong-item bug as Pipeline's own
  // conversionEligible -- an account with more than one trial/interview
  // item (a real, supported case: re-interviewing, retrying a trial for a
  // different service) had its eligibility judged off whichever item
  // happened to load first, not the one that actually reached the
  // eligible status. `.some()` checks every item for this account.
  const [convertEligible, setConvertEligible] = useState({});

  async function load() {
    const { users } = await api("/api/users");
    setUsers(users);
    const pendingAccs = users.filter((u) => u.UserType === "TrialAcc" || INTERVIEW_ACC_TYPES.includes(u.UserType));
    const bundles = await Promise.all(pendingAccs.map((acc) => api(`/api/me?userId=${acc.UserID}`)));
    const eligible = {};
    bundles.forEach((b, i) => {
      const acc = pendingAccs[i];
      const interviews = b.interviewItems?.filter((it) => it.InterviewAccID === acc.UserID) || [];
      const trials = b.trialItems?.filter((t) => t.TrialAccID === acc.UserID) || [];
      eligible[acc.UserID] = interviews.length
        ? interviews.some((it) => it.Status === "OfferAccepted")
        : trials.length
        ? trials.some((t) => t.Status === "FeedbackSubmitted")
        : true;
    });
    setConvertEligible(eligible);
  }
  useEffect(() => {
  // eslint-disable-next-line react-hooks/set-state-in-effect -- setState happens after an await inside load(), not synchronously; standard mount-time data-fetch pattern.
    load();
  }, []);

  async function convert(accountId) {
    setError("");
    setBusyAccountIds((prev) => new Set(prev).add(accountId));
    try {
      const res = await api("/api/convert", {
        method: "POST",
        body: JSON.stringify({ accountId }),
      });
      setIssued((prev) => ({ ...prev, [accountId]: res.credentials }));
      // /api/convert returns the raw oldUser/newUser records, with no
      // Username/Password join like GET /api/users does. Reconstruct the
      // same join GET performs so newUser's credentials render inline
      // instead of falling back to "—" until the next full refetch.
      const newUserWithCreds = { ...res.newUser, Username: res.credentials.username, Password: res.credentials.password };
      setUsers((prev) => [...prev.map((u) => (u.UserID === accountId ? res.oldUser : u)), newUserWithCreds]);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyAccountIds((prev) => {
        const next = new Set(prev);
        next.delete(accountId);
        return next;
      });
    }
  }

  async function saveEdit(userId, fields) {
    setError("");
    setBusySaveIds((prev) => new Set(prev).add(userId));
    try {
      const res = await api("/api/users", { method: "PATCH", body: JSON.stringify({ userId, ...fields }) });
      setEditingId(null);
      // PATCH returns only the raw user record, with no Username/Password
      // join like GET /api/users performs. Carry over the existing
      // credential fields unless this save actually touched them (matches
      // the route's own `if (username !== undefined) cred.Username =
      // username` logic).
      setUsers((prev) =>
        prev.map((u) =>
          u.UserID === userId
            ? {
                ...res.user,
                Username: fields.username !== undefined ? fields.username : u.Username,
                Password: fields.password !== undefined ? fields.password : u.Password,
              }
            : u
        )
      );
      // TKT-0125: resetting a password here silently succeeded but never
      // actually showed the admin the new plaintext -- the row's own
      // credential cell reads `issued[userId]` (the same local-echo state
      // `convert()` and account-creation populate), never the `Password`
      // field this merge sets on `users`. Password is one-way hashed
      // server-side (lib/passwords.js) and never sent back by any read, so
      // this local echo -- of what the admin just typed, not a server
      // read-back -- is the only place a reset password can ever be shown
      // at all. Without it, "reset to view password" reset the password
      // but never actually let anyone view it.
      // TKT-0137: a resetPassword:true call never sends a plaintext password
      // in `fields` (the whole point is the admin never types one) -- the
      // server generates it and this is the one place it's ever disclosed,
      // via res.credentials, same reveal-once model as account creation.
      if (res.credentials) {
        setIssued((prev) => ({ ...prev, [userId]: res.credentials }));
      } else if (fields.password) {
        setIssued((prev) => ({
          ...prev,
          [userId]: { username: fields.username !== undefined ? fields.username : users.find((u) => u.UserID === userId)?.Username, password: fields.password },
        }));
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusySaveIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  }

  const studentUsers = users.filter((u) => u.UserType === "Student");
  const teacherUsers = users.filter((u) => u.UserType === "Teacher");
  const otherStaffUsers = users.filter((u) => u.UserType === "Staff");
  const managementUsers = users.filter((u) => u.UserType === "Management");
  const parentUsers = users.filter((u) => u.UserType === "Parent");
  const ambassadorUsers = users.filter((u) => u.UserType === "Ambassador");
  const trialPendingUsers = users.filter((u) => u.UserType === "TrialAcc");

  function studentNamesOf(studentIds) {
    if (!studentIds || studentIds.length === 0) return "—";
    return studentIds.map((id) => users.find((u) => u.UserID === id)?.Name || id).join(", ");
  }

  const sharedProps = { users, issued, editingId, setEditingId, convert, saveEdit, busyAccountIds, busySaveIds, convertEligible };

  return (
    <div className="space-y-6">
      <CreateAccount onCreated={(newUser) => setUsers((prev) => [...prev, newUser])} users={users} />
      {error && <p style={{ color: "var(--bad)" }}>{error}</p>}

      <AccountGroupTable
        title="Student Accounts"
        rows={studentUsers}
        columns={[
          { header: "Course", render: (u) => u.Course || "—", sortValue: (u) => u.Course || "" },
          { header: "Batch", render: (u) => u.Batch || "—", sortValue: (u) => u.Batch || "" },
          { header: "Timezone", render: (u) => timezoneLabel(u.Timezone), sortValue: (u) => timezoneLabel(u.Timezone) },
          { header: "Currency", render: (u) => u.Currency || "INR", sortValue: (u) => u.Currency || "INR" },
          { header: "WhatsApp #", render: (u) => u.WhatsAppNumber || "—", sortValue: (u) => u.WhatsAppNumber || "" },
          { header: "Parent WhatsApp #", render: (u) => u.ParentWhatsAppNumber || "—", sortValue: (u) => u.ParentWhatsAppNumber || "" },
          { header: "Parent Email", render: (u) => u.ParentEmail || "—", sortValue: (u) => u.ParentEmail || "" },
          { header: "Email", render: (u) => u.Email || "—", sortValue: (u) => u.Email || "" },
          { header: "School", render: (u) => u.School || "—", sortValue: (u) => u.School || "" },
          { header: "Location", render: (u) => u.Location || "—", sortValue: (u) => u.Location || "" },
          {
            header: "Notes",
            render: (u) => (u.Notes ? <span title={u.Notes}>{u.Notes.length > 24 ? `${u.Notes.slice(0, 24)}…` : u.Notes}</span> : "—"),
            sortValue: (u) => u.Notes || "",
          },
          {
            header: "Timesheet",
            render: (u) =>
              u.TimesheetURL ? (
                <a href={u.TimesheetURL} target="_blank" rel="noreferrer">
                  Open
                </a>
              ) : (
                "—"
              ),
            sortValue: (u) => (u.TimesheetURL ? 1 : 0),
          },
          {
            header: "Progress Tracker",
            render: (u) =>
              u.ProgressTrackerURL ? (
                <a href={u.ProgressTrackerURL} target="_blank" rel="noreferrer">
                  Open
                </a>
              ) : (
                "—"
              ),
            sortValue: (u) => (u.ProgressTrackerURL ? 1 : 0),
          },
          { header: "Group Sent", render: (u) => (u.GroupSent ? "✓" : "—"), sortValue: (u) => (u.GroupSent ? 1 : 0) },
          { header: "GCR Sent", render: (u) => (u.GCRSent ? "✓" : "—"), sortValue: (u) => (u.GCRSent ? 1 : 0) },
          { header: "Schedule Sent", render: (u) => (u.ScheduleSent ? "✓" : "—"), sortValue: (u) => (u.ScheduleSent ? 1 : 0) },
        ]}
        showSchedule
        {...sharedProps}
      />

      <AccountGroupTable
        title="Teacher Accounts"
        rows={teacherUsers}
        columns={[
          { header: "Role", render: (u) => u.Role || "—", sortValue: (u) => u.Role || "" },
          { header: "Department", render: (u) => u.Department || "—", sortValue: (u) => u.Department || "" },
          { header: "Passport #", render: (u) => u.PassportNumber || "—", sortValue: (u) => u.PassportNumber || "" },
          { header: "Batch", render: (u) => u.Batch || "—", sortValue: (u) => u.Batch || "" },
          { header: "Timezone", render: (u) => timezoneLabel(u.Timezone), sortValue: (u) => timezoneLabel(u.Timezone) },
          { header: "Currency", render: (u) => u.Currency || "INR", sortValue: (u) => u.Currency || "INR" },
        ]}
        showSchedule
        {...sharedProps}
      />

      <AccountGroupTable
        title="Staff Accounts"
        rows={otherStaffUsers}
        columns={[
          { header: "Role", render: (u) => u.Role || "—", sortValue: (u) => u.Role || "" },
          { header: "Department", render: (u) => u.Department || "—", sortValue: (u) => u.Department || "" },
          { header: "Passport #", render: (u) => u.PassportNumber || "—", sortValue: (u) => u.PassportNumber || "" },
          { header: "Timezone", render: (u) => timezoneLabel(u.Timezone), sortValue: (u) => timezoneLabel(u.Timezone) },
          { header: "Currency", render: (u) => u.Currency || "INR", sortValue: (u) => u.Currency || "INR" },
          {
            header: "Work Folder",
            render: (u) =>
              u.WorkFolderURL ? (
                <a href={u.WorkFolderURL} target="_blank" rel="noreferrer">
                  Open
                </a>
              ) : (
                "—"
              ),
            sortValue: (u) => (u.WorkFolderURL ? 1 : 0),
          },
          {
            header: "Timesheet",
            render: (u) =>
              u.TimesheetURL ? (
                <a href={u.TimesheetURL} target="_blank" rel="noreferrer">
                  Open
                </a>
              ) : (
                "—"
              ),
            sortValue: (u) => (u.TimesheetURL ? 1 : 0),
          },
        ]}
        showSchedule
        {...sharedProps}
      />

      <AccountGroupTable
        title="Management Accounts"
        rows={managementUsers}
        columns={[{ header: "Currency", render: (u) => u.Currency || "INR", sortValue: (u) => u.Currency || "INR" }]}
        {...sharedProps}
      />

      <AccountGroupTable
        title="Parent Accounts"
        rows={parentUsers}
        columns={[
          { header: "Linked Student(s)", render: (u) => studentNamesOf(u.StudentIDs), sortValue: (u) => studentNamesOf(u.StudentIDs) },
          { header: "Currency", render: (u) => u.Currency || "INR", sortValue: (u) => u.Currency || "INR" },
        ]}
        {...sharedProps}
      />

      <AccountGroupTable
        title="Ambassador Accounts"
        rows={ambassadorUsers}
        columns={[
          { header: "Role", render: (u) => u.Role || "—", sortValue: (u) => u.Role || "" },
          { header: "Department", render: (u) => u.Department || "—", sortValue: (u) => u.Department || "" },
          { header: "Passport #", render: (u) => u.PassportNumber || "—", sortValue: (u) => u.PassportNumber || "" },
          { header: "Timezone", render: (u) => timezoneLabel(u.Timezone), sortValue: (u) => timezoneLabel(u.Timezone) },
          { header: "Currency", render: (u) => u.Currency || "INR", sortValue: (u) => u.Currency || "INR" },
        ]}
        {...sharedProps}
      />

      <AccountGroupTable title="Pending Trial Accounts" rows={trialPendingUsers} columns={[]} showConvert {...sharedProps} />

      {INTERVIEW_ACC_TYPES.map((t) => (
        <AccountGroupTable
          key={t}
          title={`Pending ${INTERVIEW_ACC_LABEL[t]} Accounts`}
          rows={users.filter((u) => u.UserType === t)}
          columns={[]}
          showConvert
          {...sharedProps}
        />
      ))}
    </div>
  );
}

// Shared table renderer for one account group — the four groups (Student,
// Teacher, other Staff, everything else) have genuinely different
// attributes (Course+Batch vs Batch vs Role+Department vs just Type), so
// each passes its own `columns` def instead of one table trying to show
// every possible field for every account type.
function AccountGroupTable({ title, rows, columns, users, issued, editingId, setEditingId, convert, saveEdit, showSchedule, showConvert, busyAccountIds, busySaveIds, convertEligible }) {
  const colSpan = 3 + columns.length + (showSchedule ? 1 : 0) + 2;
  const [search, setSearch] = useState("");
  const searchLower = search.trim().toLowerCase();
  const searchedRows = rows.filter((u) => !searchLower || u.Name.toLowerCase().includes(searchLower) || u.UserID.toLowerCase().includes(searchLower));

  // Columns that render plain text/values can be sorted directly off their
  // own `render(u)` output; ones that render JSX (links, badges, truncated
  // Notes) instead provide a `sortValue(u)` accessor returning the
  // underlying primitive — copied onto each row under a synthetic __colN
  // key so useSort's plain a[sortKey] lookup works the same way for every
  // column, dynamic or fixed.
  const sortableRows = searchedRows.map((u) => {
    const extra = {};
    columns.forEach((c, i) => {
      if (c.sortValue) extra[`__col${i}`] = c.sortValue(u);
    });
    return { ...u, ...extra };
  });
  const { sorted, sortKey, sortDir, toggleSort } = useSort(sortableRows, "Name");

  return (
    <div className="card">
      <h2 className="font-semibold mb-4">{title}</h2>
      <BillingFilterBar search={search} onSearch={setSearch} searchPlaceholder={`Search ${title.toLowerCase()}…`} />
      {/* TKT-0134: same maxHeight+overflowY cap as Enrollments/Pipeline —
          this shared component backs every account-group table (Accounts
          tab's Students/Teachers/Staff/etc groups and the Pending
          Trial/Interview Accounts tables), so this one change covers all
          of them. */}
      <div className="scroll-fade" style={{ maxHeight: 480, overflowY: "auto", overflowX: "auto" }}>
        <table style={{ width: "max-content", minWidth: "100%" }}>
          <thead>
            <tr>
              <SortableTh label="ID" sortKeyName="UserID" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortableTh label="Name" sortKeyName="Name" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortableTh label="Status" sortKeyName="Status" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              {columns.map((c, i) =>
                c.sortValue ? (
                  <SortableTh key={c.header} label={c.header} sortKeyName={`__col${i}`} sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                ) : (
                  <th key={c.header}>{c.header}</th>
                )
              )}
              <th>New credentials</th>
              {showSchedule && <th>Schedule</th>}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((u) => (
              <Fragment key={u.UserID}>
                <tr>
                  <td>{u.UserID}</td>
                  <td>{u.Name}</td>
                  <td>
                    <Badge kind={u.Status === "Converted" ? "info" : u.Status === "Inactive" ? "bad" : "good"}>{u.Status}</Badge>
                  </td>
                  {columns.map((c) => (
                    <td key={c.header}>{c.render(u)}</td>
                  ))}
                  <td>
                    {issued[u.UserID] ? (
                      <span className="flex items-center gap-1 flex-wrap">
                        <span style={{ color: "var(--muted)" }}>
                          {issued[u.UserID].username} / {issued[u.UserID].password}
                        </span>
                        <CopyCredentialsButton credentials={issued[u.UserID]} />
                      </span>
                    ) : u.ConvertedToUserID ? (
                      <span style={{ color: "var(--muted)" }}>→ {u.ConvertedToUserID}</span>
                    ) : u.Username ? (
                      // TKT-0137: password is hashed server-side
                      // (lib/passwords.js) and never sent back by GET
                      // /api/users -- it can only be reset, never read back.
                      // "Reset password" (row action below) generates+shows
                      // a new one in one click; this cell just shows the
                      // stored username until that happens.
                      <span style={{ color: "var(--muted)" }}>{u.Username}</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  {showSchedule && (
                    <td>
                      <a
                        className="btn-ghost"
                        style={{ whiteSpace: "nowrap" }}
                        href={`/api/schedule/image?userId=${u.UserID}&download=1`}
                        download={`DC_Schedule_${u.Name}.png`}
                      >
                        Download PNG
                      </a>
                    </td>
                  )}
                  <td className="flex gap-2">
                    {showConvert && CONVERT_LABEL[u.UserType] && (u.Status !== "Converted" || !u.ConvertedToUserID) && (
                      convertEligible?.[u.UserID] === false ? (
                        <span style={{ color: "var(--muted)" }}>Not yet accepted</span>
                      ) : (
                        <button className="btn" disabled={busyAccountIds?.has(u.UserID)} onClick={() => convert(u.UserID)}>
                          {busyAccountIds?.has(u.UserID) ? "Converting…" : `Convert to ${CONVERT_LABEL[u.UserType]}`}
                        </button>
                      )
                    )}
                    {(u.Status === "Active" || u.Status === "Inactive") && (
                      <button
                        className="btn-ghost"
                        disabled={busySaveIds?.has(u.UserID)}
                        onClick={() => saveEdit(u.UserID, { status: u.Status === "Active" ? "Inactive" : "Active" })}
                      >
                        {busySaveIds?.has(u.UserID) ? "Working…" : u.Status === "Active" ? "Deactivate" : "Activate"}
                      </button>
                    )}
                    {u.Username && !u.ConvertedToUserID && (
                      <button
                        className="btn-ghost"
                        disabled={busySaveIds?.has(u.UserID)}
                        onClick={() => saveEdit(u.UserID, { resetPassword: true })}
                      >
                        {busySaveIds?.has(u.UserID) ? "Resetting…" : "Reset password"}
                      </button>
                    )}
                    <button className="btn-ghost" onClick={() => setEditingId(editingId === u.UserID ? null : u.UserID)}>
                      {editingId === u.UserID ? "Close" : "Edit"}
                    </button>
                  </td>
                </tr>
                {editingId === u.UserID && (
                  <tr>
                    <td colSpan={colSpan}>
                      <EditAccountForm user={u} users={users} onSave={(fields) => saveEdit(u.UserID, fields)} onCancel={() => setEditingId(null)} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={colSpan} style={{ color: "var(--muted)" }}>
                  {rows.length === 0 ? "None yet." : "No matches."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// TKT-0137: credentials are only ever shown for the few seconds after a
// reset/create, so a quick copy beats hand-selecting "user / pass" text.
function CopyCredentialsButton({ credentials }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn-ghost"
      style={{ padding: "0 6px" }}
      onClick={async () => {
        await navigator.clipboard.writeText(`${credentials.username} / ${credentials.password}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

// Every account gets Name + credentials editing; Staff also gets Role +
// Department + Timezone, Teacher gets Batch + Timezone (same cohort concept
// as Student), Student also gets Course + Batch + Timezone, Parent also
// gets which Students are linked. Type is never editable here — conversion
// between types only happens through /api/convert, which handles ID
// reassignment and invoice carry-over that a raw type swap would skip.
// Status is limited to Active/Inactive; "Converted" is a terminal state
// stamped by /api/convert alongside ConvertedToUserID, so the Status field
// is hidden once an account has already converted.
function EditAccountForm({ user, users, onSave, onCancel }) {
  const [name, setName] = useState(user.Name);
  const [status, setStatus] = useState(user.Status === "Converted" ? "Active" : user.Status || "Active");
  const [role, setRole] = useState(user.Role || "");
  const [passportNumber, setPassportNumber] = useState(user.PassportNumber || "");
  const [course, setCourse] = useState(user.Course || "");
  const [batch, setBatch] = useState(user.Batch || "");
  const [department, setDepartment] = useState(user.Department || "");
  const [currency, setCurrency] = useState(user.Currency || "INR");
  const [timezone, setTimezone] = useState(normalizeTimezone(user.Timezone));
  const [studentIds, setStudentIds] = useState(user.StudentIDs || []);
  const [username, setUsername] = useState(user.Username || "");
  const [password, setPassword] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState(user.WhatsAppNumber || "");
  const [parentWhatsappNumber, setParentWhatsappNumber] = useState(user.ParentWhatsAppNumber || "");
  const [parentEmail, setParentEmail] = useState(user.ParentEmail || "");
  const [email, setEmail] = useState(user.Email || "");
  const [school, setSchool] = useState(user.School || "");
  const [location, setLocation] = useState(user.Location || "");
  const [notes, setNotes] = useState(user.Notes || "");
  const [timesheetUrl, setTimesheetUrl] = useState(user.TimesheetURL || "");
  const [workFolderUrl, setWorkFolderUrl] = useState(user.WorkFolderURL || "");
  const [progressTrackerUrl, setProgressTrackerUrl] = useState(user.ProgressTrackerURL || "");
  const [groupSent, setGroupSent] = useState(Boolean(user.GroupSent));
  const [gcrSent, setGcrSent] = useState(Boolean(user.GCRSent));
  const [scheduleSent, setScheduleSent] = useState(Boolean(user.ScheduleSent));
  const [saving, setSaving] = useState(false);
  const [generatingTimesheet, setGeneratingTimesheet] = useState(false);
  const [timesheetGenError, setTimesheetGenError] = useState("");
  const [timesheetGenNote, setTimesheetGenNote] = useState("");
  const [generatingProgressTracker, setGeneratingProgressTracker] = useState(false);
  const [progressTrackerGenError, setProgressTrackerGenError] = useState("");
  const [progressTrackerGenNote, setProgressTrackerGenNote] = useState("");

  // TKT-0158: duplicates the real Drive template and fills in whatever this
  // form already knows (Name/Batch/Currency/Course) -- only fills the input
  // client-side, does not save the account. Admin still reviews and clicks
  // the form's own Save afterward, same as typing a link in by hand.
  async function generateTimesheet() {
    setTimesheetGenError("");
    setTimesheetGenNote("");
    setGeneratingTimesheet(true);
    try {
      // accountId lets the automator recognize this exact account already
      // has a real Timesheet (stamped as hidden Drive metadata on the file
      // itself, not read from this form) and hand back that same file
      // instead of creating a duplicate -- e.g. a second click, or Generate
      // clicked again after Cancel without Saving the first result.
      const result = await api("/api/timesheet-automator", {
        method: "POST",
        body: JSON.stringify({ name, batch, currency, course, accountId: user.UserID }),
      });
      setTimesheetUrl(result.url);
      if (result.alreadyExisted) setTimesheetGenNote("This account already had a Timesheet — reused the existing one instead of creating a new one.");
    } catch (e) {
      setTimesheetGenError(e.message);
    } finally {
      setGeneratingTimesheet(false);
    }
  }

  // Mirrors generateTimesheet above -- same idempotent-by-accountId pattern.
  async function generateProgressTracker() {
    setProgressTrackerGenError("");
    setProgressTrackerGenNote("");
    setGeneratingProgressTracker(true);
    try {
      const result = await api("/api/progress-tracker-automator", {
        method: "POST",
        body: JSON.stringify({ name, batch, accountId: user.UserID }),
      });
      setProgressTrackerUrl(result.url);
      if (result.alreadyExisted) setProgressTrackerGenNote("This account already had a Progress Tracker — reused the existing one instead of creating a new one.");
    } catch (e) {
      setProgressTrackerGenError(e.message);
    } finally {
      setGeneratingProgressTracker(false);
    }
  }

  const students = users.filter((u) => u.UserType === "Student");

  function toggleStudent(id) {
    setStudentIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function submit(e) {
    e.preventDefault();
    const fields = { name, username, currency };
    if (user.Status !== "Converted") fields.status = status;
    if (ROLE_ELIGIBLE.includes(user.UserType)) {
      fields.role = role;
      fields.passportNumber = passportNumber;
      fields.whatsappNumber = whatsappNumber;
      fields.email = email;
    }
    if (user.UserType === "Staff") {
      fields.department = department;
      fields.workFolderUrl = workFolderUrl;
      fields.timesheetUrl = timesheetUrl;
    }
    if (user.UserType === "Teacher") fields.batch = batch;
    if (user.UserType === "Student") {
      fields.course = course;
      fields.batch = batch;
      fields.whatsappNumber = whatsappNumber;
      fields.parentWhatsappNumber = parentWhatsappNumber;
      fields.parentEmail = parentEmail;
      fields.email = email;
      fields.school = school;
      fields.location = location;
      fields.notes = notes;
      fields.timesheetUrl = timesheetUrl;
      fields.progressTrackerUrl = progressTrackerUrl;
      fields.groupSent = groupSent;
      fields.gcrSent = gcrSent;
      fields.scheduleSent = scheduleSent;
    }
    if (["Student", "Teacher", "Staff", "Ambassador"].includes(user.UserType)) fields.timezone = timezone;
    if (user.UserType === "Parent") fields.studentIds = studentIds;
    if (password.trim()) fields.password = password;
    setSaving(true);
    try {
      await onSave(fields);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 p-3" style={{ background: "var(--panel-2)", borderRadius: 8, maxWidth: 640 }}>
      <div>
        <label className="text-sm block mb-1" style={{ color: "var(--muted)" }}>
          Name
        </label>
        <input className="field" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>

      {user.Status === "Converted" ? (
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Status: Converted (locked — set by the Convert action)
        </p>
      ) : (
        <div>
          <label className="text-sm block mb-1" style={{ color: "var(--muted)" }}>
            Status
          </label>
          <select className="field" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      )}

      <div>
        <label className="text-sm block mb-1" style={{ color: "var(--muted)" }}>
          Username
        </label>
        <input className="field" value={username} onChange={(e) => setUsername(e.target.value)} required />
      </div>

      <div>
        <label className="text-sm block mb-1" style={{ color: "var(--muted)" }}>
          New password (leave blank to keep current)
        </label>
        <input className="field" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>

      <div>
        <label className="text-sm block mb-1" style={{ color: "var(--muted)" }}>
          Currency (invoice/paycheck totals are shown in this account&apos;s Currency)
        </label>
        <select className="field" style={{ maxWidth: 260 }} value={currency} onChange={(e) => setCurrency(e.target.value)}>
          {CURRENCIES_FULL.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code} — {c.name}
            </option>
          ))}
        </select>
      </div>

      {ROLE_ELIGIBLE.includes(user.UserType) && (
        <div>
          <label className="text-sm block mb-1" style={{ color: "var(--muted)" }}>
            Role
          </label>
          <input className="field" value={role} onChange={(e) => setRole(e.target.value)} />
        </div>
      )}

      {ROLE_ELIGIBLE.includes(user.UserType) && (
        <div>
          <label className="text-sm block mb-1" style={{ color: "var(--muted)" }}>
            Passport / IC Number
          </label>
          <input className="field" value={passportNumber} onChange={(e) => setPassportNumber(e.target.value)} />
        </div>
      )}

      {ROLE_ELIGIBLE.includes(user.UserType) && (
        <div>
          <label className="text-sm block mb-1" style={{ color: "var(--muted)" }}>
            WhatsApp Number
          </label>
          <input className="field" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} />
        </div>
      )}

      {ROLE_ELIGIBLE.includes(user.UserType) && (
        <div>
          <label className="text-sm block mb-1" style={{ color: "var(--muted)" }}>
            Email
          </label>
          <input className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
      )}

      {user.UserType === "Staff" && (
        <div>
          <label className="text-sm block mb-1" style={{ color: "var(--muted)" }}>
            Department
          </label>
          <select className="field" value={department} onChange={(e) => setDepartment(e.target.value)}>
            <option value="">Select department…</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      )}

      {FIXED_DEPARTMENT[user.UserType] && (
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Department: {FIXED_DEPARTMENT[user.UserType]} (fixed for this account type)
        </p>
      )}

      {user.UserType === "Staff" && (
        <>
          <div>
            <label className="text-sm block mb-1" style={{ color: "var(--muted)" }}>
              Work Folder URL (Google Drive)
            </label>
            <input className="field" value={workFolderUrl} onChange={(e) => setWorkFolderUrl(e.target.value)} />
          </div>
          <div>
            <label className="text-sm block mb-1" style={{ color: "var(--muted)" }}>
              Timesheet URL
            </label>
            <input className="field" value={timesheetUrl} onChange={(e) => setTimesheetUrl(e.target.value)} />
          </div>
        </>
      )}

      {user.UserType === "Student" && (
        <div>
          <label className="text-sm block mb-1" style={{ color: "var(--muted)" }}>
            Course
          </label>
          <input className="field" value={course} onChange={(e) => setCourse(e.target.value)} />
        </div>
      )}

      {user.UserType === "Student" && (
        <>
          <div>
            <label className="text-sm block mb-1" style={{ color: "var(--muted)" }}>
              WhatsApp Number
            </label>
            <input className="field" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} />
          </div>
          <div>
            <label className="text-sm block mb-1" style={{ color: "var(--muted)" }}>
              Parent WhatsApp Number
            </label>
            <input
              className="field"
              value={parentWhatsappNumber}
              onChange={(e) => setParentWhatsappNumber(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm block mb-1" style={{ color: "var(--muted)" }}>
              Parent Email
            </label>
            <input className="field" type="email" value={parentEmail} onChange={(e) => setParentEmail(e.target.value)} />
          </div>
          <div>
            <label className="text-sm block mb-1" style={{ color: "var(--muted)" }}>
              Email
            </label>
            <input className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="text-sm block mb-1" style={{ color: "var(--muted)" }}>
              School
            </label>
            <input className="field" value={school} onChange={(e) => setSchool(e.target.value)} />
          </div>
          <div>
            <label className="text-sm block mb-1" style={{ color: "var(--muted)" }}>
              Location
            </label>
            <input className="field" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <div>
            <label className="text-sm block mb-1" style={{ color: "var(--muted)" }}>
              Notes
            </label>
            <textarea className="field" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div>
            <label className="text-sm block mb-1" style={{ color: "var(--muted)" }}>
              Timesheet URL
            </label>
            <div className="flex gap-2">
              <input className="field" style={{ flex: 1, minWidth: 0 }} value={timesheetUrl} onChange={(e) => setTimesheetUrl(e.target.value)} />
              <button type="button" className="btn-ghost" onClick={generateTimesheet} disabled={generatingTimesheet} style={{ whiteSpace: "nowrap" }}>
                {generatingTimesheet ? "Generating…" : "Generate Timesheet URL"}
              </button>
            </div>
            {timesheetGenError && <p className="text-sm mt-1" style={{ color: "var(--bad)" }}>{timesheetGenError}</p>}
            {timesheetGenNote && <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>{timesheetGenNote}</p>}
          </div>
          <div>
            <label className="text-sm block mb-1" style={{ color: "var(--muted)" }}>
              Progress Tracker URL
            </label>
            <div className="flex gap-2">
              <input
                className="field"
                style={{ flex: 1, minWidth: 0 }}
                value={progressTrackerUrl}
                onChange={(e) => setProgressTrackerUrl(e.target.value)}
              />
              <button type="button" className="btn-ghost" onClick={generateProgressTracker} disabled={generatingProgressTracker} style={{ whiteSpace: "nowrap" }}>
                {generatingProgressTracker ? "Generating…" : "Generate Progress Tracker URL"}
              </button>
            </div>
            {progressTrackerGenError && <p className="text-sm mt-1" style={{ color: "var(--bad)" }}>{progressTrackerGenError}</p>}
            {progressTrackerGenNote && <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>{progressTrackerGenNote}</p>}
          </div>
          <div>
            <label className="text-sm block mb-1" style={{ color: "var(--muted)" }}>
              Onboarding tracker (private — not shown to the student)
            </label>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-1">
                <input type="checkbox" checked={groupSent} onChange={(e) => setGroupSent(e.target.checked)} />
                Group sent
              </label>
              <label className="flex items-center gap-1">
                <input type="checkbox" checked={gcrSent} onChange={(e) => setGcrSent(e.target.checked)} />
                GCR sent
              </label>
              <label className="flex items-center gap-1">
                <input type="checkbox" checked={scheduleSent} onChange={(e) => setScheduleSent(e.target.checked)} />
                Schedule sent
              </label>
            </div>
          </div>
        </>
      )}

      {["Student", "Teacher"].includes(user.UserType) && (
        <div>
          <label className="text-sm block mb-1" style={{ color: "var(--muted)" }}>
            Batch
          </label>
          <input className="field" value={batch} onChange={(e) => setBatch(e.target.value)} />
        </div>
      )}

      {["Student", "Teacher", "Staff", "Ambassador"].includes(user.UserType) && (
        <div>
          <label className="text-sm block mb-1" style={{ color: "var(--muted)" }}>
            Timezone
          </label>
          <TimezoneSelect value={timezone} onChange={setTimezone} />
        </div>
      )}

      {user.UserType === "Parent" && (
        <div>
          <label className="text-sm block mb-1" style={{ color: "var(--muted)" }}>
            Linked student(s)
          </label>
          <div className="flex flex-wrap gap-2">
            {students.map((s) => (
              <label key={s.UserID} className="flex items-center gap-1 text-sm">
                <input type="checkbox" checked={studentIds.includes(s.UserID)} onChange={() => toggleStudent(s.UserID)} />
                {s.Name}
              </label>
            ))}
            {students.length === 0 && <p style={{ color: "var(--muted)" }}>No students yet.</p>}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button className="btn" type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </button>
        <button className="btn-ghost" type="button" disabled={saving} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

const CREATABLE_TYPES = [
  "Parent",
  "Student",
  "Teacher",
  "Staff",
  "TrialAcc",
  "TeacherInterviewAcc",
  "StaffInterviewAcc",
  "AmbassadorInterviewAcc",
  "Management",
  "Ambassador",
];

function CreateAccount({ onCreated, users }) {
  const [userType, setUserType] = useState("Parent");
  const [name, setName] = useState("");
  const [studentIds, setStudentIds] = useState([]);
  const [role, setRole] = useState("");
  const [passportNumber, setPassportNumber] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [email, setEmail] = useState("");
  const [course, setCourse] = useState("");
  const [batch, setBatch] = useState("");
  const [department, setDepartment] = useState("");
  const [workFolderUrl, setWorkFolderUrl] = useState("");
  const [timesheetUrl, setTimesheetUrl] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [issued, setIssued] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const students = users.filter((u) => u.UserType === "Student");

  function toggleStudent(id) {
    setStudentIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function reset() {
    setName("");
    setStudentIds([]);
    setRole("");
    setPassportNumber("");
    setWhatsappNumber("");
    setEmail("");
    setCourse("");
    setBatch("");
    setDepartment("");
    setWorkFolderUrl("");
    setTimesheetUrl("");
    setCurrency("INR");
    setTimezone("Asia/Kolkata");
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const body = { userType, name, currency };
      if (userType === "Parent") body.studentIds = studentIds;
      if (ROLE_ELIGIBLE.includes(userType)) {
        body.role = role;
        body.passportNumber = passportNumber;
        body.whatsappNumber = whatsappNumber;
        body.email = email;
      }
      if (userType === "Staff") {
        body.department = department;
        body.timezone = timezone;
        body.workFolderUrl = workFolderUrl;
        body.timesheetUrl = timesheetUrl;
      }
      if (userType === "Teacher") {
        body.batch = batch;
        body.timezone = timezone;
      }
      if (userType === "Student") {
        body.course = course;
        body.batch = batch;
        body.timezone = timezone;
      }
      if (userType === "Ambassador") body.timezone = timezone;
      const res = await api("/api/users", { method: "POST", body: JSON.stringify(body) });
      setIssued(res.credentials);
      reset();
      // POST returns the raw user record plus separate credentials. Join
      // them the same way GET /api/users does, Username/Password merged
      // in, so the parent's local list matches what a refetch would produce.
      onCreated({ ...res.user, Username: res.credentials.username, Password: res.credentials.password });
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card">
      <h2 className="font-semibold mb-4">Create Account</h2>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="text-sm block mb-1" style={{ color: "var(--muted)" }}>
            Account type
          </label>
          <select className="field" value={userType} onChange={(e) => setUserType(e.target.value)}>
            {CREATABLE_TYPES.map((t) => (
              <option key={t} value={t}>
                {INTERVIEW_ACC_LABEL[t] || t}
              </option>
            ))}
          </select>
        </div>

        <input className="field" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />

        <div>
          <label className="text-xs block mb-1" style={{ color: "var(--muted)" }}>
            Currency
          </label>
          <select className="field" style={{ maxWidth: 260 }} value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {CURRENCIES_FULL.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} — {c.name}
              </option>
            ))}
          </select>
        </div>

        {userType === "Parent" && (
          <div>
            <label className="text-sm block mb-1" style={{ color: "var(--muted)" }}>
              Linked student(s)
            </label>
            <div className="flex flex-wrap gap-2">
              {students.map((s) => (
                <label key={s.UserID} className="flex items-center gap-1 text-sm">
                  <input type="checkbox" checked={studentIds.includes(s.UserID)} onChange={() => toggleStudent(s.UserID)} />
                  {s.Name}
                </label>
              ))}
              {students.length === 0 && <p style={{ color: "var(--muted)" }}>No students yet.</p>}
            </div>
          </div>
        )}

        {ROLE_ELIGIBLE.includes(userType) && (
          <>
            <input className="field" placeholder="Role (e.g. SM Assistant)" value={role} onChange={(e) => setRole(e.target.value)} />
            <input
              className="field"
              placeholder="WhatsApp Number"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
            />
            <input
              className="field"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              className="field"
              placeholder="Passport / IC Number"
              value={passportNumber}
              onChange={(e) => setPassportNumber(e.target.value)}
            />
          </>
        )}

        {userType === "Staff" && (
          <>
            <select className="field" value={department} onChange={(e) => setDepartment(e.target.value)}>
              <option value="">Select department…</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <input
              className="field"
              placeholder="Work Folder URL (Google Drive)"
              value={workFolderUrl}
              onChange={(e) => setWorkFolderUrl(e.target.value)}
            />
            <input
              className="field"
              placeholder="Timesheet URL"
              value={timesheetUrl}
              onChange={(e) => setTimesheetUrl(e.target.value)}
            />
          </>
        )}

        {userType === "Teacher" && (
          <input className="field" placeholder="Batch" value={batch} onChange={(e) => setBatch(e.target.value)} />
        )}

        {userType === "Student" && (
          <>
            <input className="field" placeholder="Course" value={course} onChange={(e) => setCourse(e.target.value)} />
            <input className="field" placeholder="Batch" value={batch} onChange={(e) => setBatch(e.target.value)} />
          </>
        )}

        {["Student", "Teacher", "Staff", "Ambassador"].includes(userType) && (
          <div>
            <label className="text-sm block mb-1" style={{ color: "var(--muted)" }}>
              Timezone
            </label>
            <TimezoneSelect value={timezone} onChange={setTimezone} />
          </div>
        )}

        {error && <p style={{ color: "var(--bad)" }}>{error}</p>}
        <button className="btn" type="submit" disabled={saving}>
          {saving ? "Creating…" : "Create account"}
        </button>
      </form>
      {issued && (
        <p className="mt-3 text-sm" style={{ color: "var(--muted)" }}>
          Credentials: {issued.username} / {issued.password}
        </p>
      )}
    </div>
  );
}

/* ---------------- Services ---------------- */
const EMPTY_OCC = { day: "Monday", time: "16:00", duration: 1, facilitator: "", facilitatorUserId: "", timezone: "Asia/Kolkata" };
const EMPTY_LINK = { name: "", url: "" };
const EMPTY_RATE = { currency: "INR", rate: "", description: "", billingType: "Monthly", group: "" };
const ALL_GROUPS = ["Student", "Teacher", "Staff", "Management", "Parent", "Ambassador"];
// Type is free text (no enum enforced server-side) — these are just the
// dropdown suggestions offered, based on which Group(s) are selected. A
// Service open to several Groups at once offers the UNION of each group's
// options (not just one), so e.g. Teacher+Staff offers both sets — fixes
// the earlier bug where a non-Staff-only combination silently dropped the
// Staff-flavored options entirely.
const TYPE_OPTIONS_BY_GROUP = {
  Student: ["Book", "Course", "Counselling", "Admissions"],
  Teacher: ["Teacher"],
  Parent: ["Parent"],
  Ambassador: ["Ambassador"],
  Management: ["Management"],
  Staff: ["Staff"],
};
function typeOptionsFor(group) {
  const seen = new Set();
  const options = [];
  for (const g of group) {
    for (const t of TYPE_OPTIONS_BY_GROUP[g] || []) {
      if (!seen.has(t)) {
        seen.add(t);
        options.push(t);
      }
    }
  }
  return options;
}

// A styled replacement for <input list=...>/<datalist> — the native
// datalist popup renders with the browser's own (often jarring, e.g. plain
// black) styling that ignores the app's theme. This is a plain editable
// text input with its own app-styled dropdown panel: pick a suggestion, or
// just type any custom value — nothing is enforced.
function EditableCombobox({ value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input
        className="field"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && options.length > 0 && (
        <div
          style={{
            position: "absolute",
            zIndex: 20,
            top: "100%",
            left: 0,
            right: 0,
            marginTop: 4,
            maxHeight: 220,
            overflowY: "auto",
            background: "var(--panel)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
          }}
        >
          {options.map((o) => (
            <div
              key={o}
              onMouseDown={() => {
                onChange(o);
                setOpen(false);
              }}
              style={{ padding: "0.5rem 0.75rem", cursor: "pointer" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--panel-2)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {o}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function emptyBatch() {
  return { batchName: "", rates: [{ ...EMPTY_RATE }], occurrences: [{ ...EMPTY_OCC }] };
}
function emptyComponent() {
  return { componentName: "", batches: [emptyBatch()] };
}

function Services() {
  const [services, setServices] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState("");
  const [type, setType] = useState("Course");
  const [group, setGroup] = useState(["Student"]);
  const [board, setBoard] = useState("");
  const [course, setCourse] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [recordingsLink, setRecordingsLink] = useState("");
  const [syllabusLink, setSyllabusLink] = useState("");
  const [worksheetsLink, setWorksheetsLink] = useState("");
  const [gcrLink, setGcrLink] = useState("");
  const [components, setComponents] = useState([emptyComponent()]);
  const [role, setRole] = useState("");
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [flatRates, setFlatRates] = useState([{ ...EMPTY_RATE }]);
  const [flatOccurrences, setFlatOccurrences] = useState([{ ...EMPTY_OCC }]);
  const [university, setUniversity] = useState("");
  const [country, setCountry] = useState("");
  const [links, setLinks] = useState([{ ...EMPTY_LINK }]);
  const [nameManuallyEdited, setNameManuallyEdited] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyServiceIds, setBusyServiceIds] = useState(new Set());

  const cohortEligible = group.includes("Student") || group.includes("Teacher");
  // A role-based Service (an internal role like "Associate Project Manager",
  // or any simple administrative service open to exactly one non-Student
  // group) has no batch/cohort concept (there's no "class" of students) —
  // Role(/Department for Staff only) + flat Rates/Occurrences instead of
  // the nested Component/Batch editor.
  const isRoleBasedService = group.length === 1 && ["Staff", "Teacher", "Ambassador", "Parent", "Management"].includes(group[0]);
  const isStaffRole = isRoleBasedService && group[0] === "Staff";
  const isAdmissions = type === "Admissions";
  const typeOptions = typeOptionsFor(group);
  // Academic-session suggestions for an Admissions Batch's name — current
  // year forward, Fall/Spring pairs — same freeform-combobox pattern as
  // Type, so any custom value can still be typed.
  const sessionOptions = (() => {
    const y = new Date().getFullYear();
    return [0, 1, 2].flatMap((i) => [`Fall ${y + i}`, `Spring ${y + i + 1}`]);
  })();

  // Auto-generated Name suggestion, per Type — Course/Book use the same
  // Board/Course/Subject fields but NOT Batch (Name is one value per
  // Service, while a Service can have several differently-named Batches,
  // so baking one batch's name into it would be wrong/stale the moment a
  // second batch exists — see lib/billing.js's per-Batch FullName for the
  // batch-specific version used on invoices instead).
  function computeSuggestedName() {
    const firstBatchName = components[0]?.batches?.[0]?.batchName || "";
    if (isRoleBasedService) {
      return [`DC ${group[0]}`, role].filter(Boolean).join(" - ");
    }
    if (type === "Admissions") {
      const head = [country, "Admissions Consulting"].filter(Boolean).join(" ");
      return [head, university, firstBatchName].filter(Boolean).join(" - ");
    }
    if (type === "Counselling") {
      return ["DC Counselling", firstBatchName].filter(Boolean).join(" - ");
    }
    if (type === "Book") {
      return [board, course, subjectCode, subjectName, "Booklet"].filter(Boolean).join(" ");
    }
    return [board, course, subjectCode, subjectName].filter(Boolean).join(" ");
  }
  const suggestedName = computeSuggestedName();
  // Was an effect syncing `name` from `suggestedName` whenever the user
  // hadn't manually edited it -- classic "state derived from other state"
  // case (react-hooks/set-state-in-effect correctly flagged it). No effect
  // needed: the shown/submitted name is just suggestedName until the user
  // types their own, computed at render time instead of stored.
  const effectiveName = nameManuallyEdited ? name : suggestedName;

  // TKT-0116: switching Group never reset Type, so e.g. toggling from
  // Student to Staff left the Type combobox showing "Course" (typeOptions
  // for Staff is just ["Staff"], nothing else valid for it). Reset Type to
  // the new group's own first option whenever the current value falls
  // outside it, right here where the group change actually originates.
  function toggleGroup(g) {
    setGroup((prev) => {
      const next = prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g];
      const nextTypeOptions = typeOptionsFor(next);
      if (nextTypeOptions.length > 0 && !nextTypeOptions.includes(type)) setType(nextTypeOptions[0]);
      return next;
    });
  }

  const [teacherUsers, setTeacherUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  async function load() {
    const [{ services }, { users }] = await Promise.all([api("/api/services"), api("/api/users")]);
    setServices(services);
    // TKT-0028: Occurrence's optional Facilitator-account link picks from
    // real Teacher accounts only, for the cohort (Student/Teacher) editor
    // below -- the class instructor is always a Teacher there. Staff/
    // Ambassador etc. can still be typed as free text (the field's
    // original, still-supported behavior).
    setTeacherUsers(users.filter((u) => u.UserType === "Teacher"));
    setAllUsers(users);
  }
  useEffect(() => {
  // eslint-disable-next-line react-hooks/set-state-in-effect -- setState happens after an await inside load(), not synchronously; standard mount-time data-fetch pattern.
    load();
  }, []);
  // TKT-0117: the role-based flat editor's Instructor field should offer
  // accounts of the Service's own role group (a Staff service picks a
  // Staff member, not a Teacher) -- unlike the cohort editor above, which
  // always means a Teacher.
  const roleUsers = allUsers.filter((u) => u.UserType === group[0]);

  function resetForm() {
    setEditingId(null);
    setName("");
    setType("Course");
    setGroup(["Student"]);
    setBoard("");
    setCourse("");
    setSubjectCode("");
    setSubjectName("");
    setRecordingsLink("");
    setSyllabusLink("");
    setWorksheetsLink("");
    setGcrLink("");
    setComponents([emptyComponent()]);
    setRole("");
    setDepartment(DEPARTMENTS[0]);
    setFlatRates([{ ...EMPTY_RATE }]);
    setFlatOccurrences([{ ...EMPTY_OCC }]);
    setUniversity("");
    setCountry("");
    setLinks([{ ...EMPTY_LINK }]);
    setNameManuallyEdited(false);
  }

  function startEdit(s) {
    setEditingId(s.ServiceID);
    setName(s.Name);
    // Editing an existing Service should never silently overwrite its real
    // stored Name with a freshly auto-generated suggestion — treat the
    // loaded value as if it were already manually set.
    setNameManuallyEdited(true);
    setType(s.Type);
    setGroup(normalizeGroup(s.Group));
    setBoard(s.Board || "");
    setCourse(s.Course || "");
    setSubjectCode(s.SubjectCode || "");
    setSubjectName(s.SubjectName || "");
    setRecordingsLink(s.RecordingsLink || "");
    setSyllabusLink(s.SyllabusLink || "");
    setWorksheetsLink(s.WorksheetsLink || "");
    setGcrLink(s.GCRLink || "");
    setComponents(
      (s.OptionalComponents || []).length > 0
        ? s.OptionalComponents.map((c) => ({
          componentId: c.ComponentID,
          componentName: c.ComponentName || "",
          batches: (c.Batches || []).map((b) => ({
            batchId: b.BatchID,
            batchName: b.BatchName || "",
            rates: (b.Rates || []).map((r) => ({
              rateId: r.RateID,
              currency: r.Currency,
              rate: r.Rate,
              description: r.Description || "",
              billingType: r.BillingType || "Monthly",
              group: r.Group || "",
            })),
            occurrences: (b.OccuranceList || []).map((o) => ({
              occuranceId: o.OccuranceID,
              day: o.Day,
              time: o.Time,
              duration: o.Duration,
              facilitator: o.Facilitator,
              facilitatorUserId: o.FacilitatorUserID || "",
              timezone: o.Timezone || "Asia/Kolkata",
            })),
          })),
        }))
        : [emptyComponent()]
    );
    setRole(s.Role || "");
    setDepartment(DEPARTMENTS.includes(s.Department) ? s.Department : DEPARTMENTS[0]);
    setFlatRates(
      Array.isArray(s.Rates) && s.Rates.length > 0
        ? s.Rates.map((r) => ({ rateId: r.RateID, currency: r.Currency, rate: r.Rate, description: r.Description || "", billingType: r.BillingType || "Monthly", group: r.Group || "" }))
        : [{ ...EMPTY_RATE }]
    );
    setFlatOccurrences(
      Array.isArray(s.OccuranceList) && s.OccuranceList.length > 0
        ? s.OccuranceList.map((o) => ({
            occuranceId: o.OccuranceID,
            day: o.Day,
            time: o.Time,
            duration: o.Duration,
            facilitator: o.Facilitator,
            facilitatorUserId: o.FacilitatorUserID || "",
            timezone: o.Timezone || "Asia/Kolkata",
          }))
        : [{ ...EMPTY_OCC }]
    );
    setUniversity(s.University || "");
    setCountry(s.Country || "");
    setLinks(
      Array.isArray(s.Links) && s.Links.length > 0
        ? s.Links.map((l) => ({ linkId: l.LinkID, name: l.Name, url: l.Url }))
        : [{ ...EMPTY_LINK }]
    );
  }

  // Flat Rates/Occurrences editing (Staff-role services only) — same
  // update-one-leaf-immutably pattern as the nested component/batch helpers.
  function updateFlatRate(ri, field, value) {
    setFlatRates((prev) => prev.map((r, i) => (i === ri ? { ...r, [field]: value } : r)));
  }
  function addFlatRate() {
    setFlatRates((prev) => [...prev, { ...EMPTY_RATE }]);
  }
  function removeFlatRate(ri) {
    setFlatRates((prev) => prev.filter((_, i) => i !== ri));
  }
  function updateFlatOcc(oi, field, value) {
    setFlatOccurrences((prev) => prev.map((o, i) => (i === oi ? { ...o, [field]: value } : o)));
  }
  function addFlatOcc() {
    setFlatOccurrences((prev) => [...prev, { ...EMPTY_OCC }]);
  }
  function removeFlatOcc(oi) {
    setFlatOccurrences((prev) => prev.filter((_, i) => i !== oi));
  }

  // Resource Links — a freeform, named link list any Service can carry
  // regardless of Type (see toStoredLinks in app/api/services/route.js).
  function updateLink(li, field, value) {
    setLinks((prev) => prev.map((l, i) => (i === li ? { ...l, [field]: value } : l)));
  }
  function addLink() {
    setLinks((prev) => [...prev, { ...EMPTY_LINK }]);
  }
  function removeLink(li) {
    setLinks((prev) => prev.filter((_, i) => i !== li));
  }

  // Nested-array update helpers: components[ci].batches[bi].rates[ri] /
  // .occurrences[oi] — each setter replaces just the one leaf being edited,
  // rebuilding the arrays above it immutably.
  function updateComponent(ci, field, value) {
    setComponents((prev) => prev.map((c, i) => (i === ci ? { ...c, [field]: value } : c)));
  }
  function addComponent() {
    setComponents((prev) => [...prev, emptyComponent()]);
  }
  function removeComponent(ci) {
    setComponents((prev) => prev.filter((_, i) => i !== ci));
  }

  function updateBatch(ci, bi, field, value) {
    setComponents((prev) =>
      prev.map((c, i) => (i !== ci ? c : { ...c, batches: c.batches.map((b, j) => (j === bi ? { ...b, [field]: value } : b)) }))
    );
  }
  function addBatch(ci) {
    setComponents((prev) => prev.map((c, i) => (i !== ci ? c : { ...c, batches: [...c.batches, emptyBatch()] })));
  }
  function removeBatch(ci, bi) {
    setComponents((prev) => prev.map((c, i) => (i !== ci ? c : { ...c, batches: c.batches.filter((_, j) => j !== bi) })));
  }

  function updateRate(ci, bi, ri, field, value) {
    setComponents((prev) =>
      prev.map((c, i) =>
        i !== ci
          ? c
          : {
            ...c,
            batches: c.batches.map((b, j) =>
              j !== bi ? b : { ...b, rates: b.rates.map((r, k) => (k === ri ? { ...r, [field]: value } : r)) }
            ),
          }
      )
    );
  }
  function addRate(ci, bi) {
    setComponents((prev) =>
      prev.map((c, i) => (i !== ci ? c : { ...c, batches: c.batches.map((b, j) => (j !== bi ? b : { ...b, rates: [...b.rates, { ...EMPTY_RATE }] })) }))
    );
  }
  function removeRate(ci, bi, ri) {
    setComponents((prev) =>
      prev.map((c, i) => (i !== ci ? c : { ...c, batches: c.batches.map((b, j) => (j !== bi ? b : { ...b, rates: b.rates.filter((_, k) => k !== ri) })) }))
    );
  }

  function updateOcc(ci, bi, oi, field, value) {
    setComponents((prev) =>
      prev.map((c, i) =>
        i !== ci
          ? c
          : {
            ...c,
            batches: c.batches.map((b, j) =>
              j !== bi ? b : { ...b, occurrences: b.occurrences.map((o, k) => (k === oi ? { ...o, [field]: value } : o)) }
            ),
          }
      )
    );
  }
  function addOcc(ci, bi) {
    setComponents((prev) =>
      prev.map((c, i) => (i !== ci ? c : { ...c, batches: c.batches.map((b, j) => (j !== bi ? b : { ...b, occurrences: [...b.occurrences, { ...EMPTY_OCC }] })) }))
    );
  }
  function removeOcc(ci, bi, oi) {
    setComponents((prev) =>
      prev.map((c, i) => (i !== ci ? c : { ...c, batches: c.batches.map((b, j) => (j !== bi ? b : { ...b, occurrences: b.occurrences.filter((_, k) => k !== oi) })) }))
    );
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (group.length === 0) {
      setError("Select at least one group this service is open to.");
      return;
    }
    if (isRoleBasedService) {
      if (flatRates.length === 0 || flatOccurrences.length === 0) {
        setError("At least one rate and one occurrence are required.");
        return;
      }
    } else if (components.length === 0 || components.some((c) => c.batches.length === 0)) {
      setError("At least one batch (with a rate and an occurrence) is required per component.");
      return;
    }
    const body = isRoleBasedService
      ? { name: effectiveName, type, group, role, department, rates: flatRates, occurrences: flatOccurrences, links }
      : {
        name: effectiveName,
        type,
        group,
        board,
        course,
        subjectCode,
        subjectName,
        recordingsLink,
        syllabusLink,
        worksheetsLink,
        gcrLink,
        university,
        country,
        components,
        links,
      };
    setSaving(true);
    try {
      if (editingId) {
        const { service } = await api("/api/services", { method: "PATCH", body: JSON.stringify({ serviceId: editingId, ...body }) });
        setServices((prev) => prev.map((s) => (s.ServiceID === service.ServiceID ? service : s)));
      } else {
        const { service } = await api("/api/services", { method: "POST", body: JSON.stringify(body) });
        setServices((prev) => [...prev, service]);
      }
      resetForm();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteService(serviceId) {
    setError("");
    setBusyServiceIds((prev) => new Set(prev).add(serviceId));
    try {
      await api("/api/services", { method: "DELETE", body: JSON.stringify({ serviceId }) });
      setServices((prev) => prev.filter((s) => s.ServiceID !== serviceId));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyServiceIds((prev) => {
        const next = new Set(prev);
        next.delete(serviceId);
        return next;
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="font-semibold mb-4">{editingId ? `Edit Service (${editingId})` : "Create Service"}</h2>
        <form onSubmit={submit} className="space-y-3">
          <div className="flex gap-2 items-center">
            <input
              className="field"
              placeholder="Service name"
              value={effectiveName}
              onChange={(e) => {
                setName(e.target.value);
                setNameManuallyEdited(true);
              }}
              required
            />
            {/* Mobile UI fix: this row (input + button, both flex-shrinking
                by default) let the button lose the fight for space on a
                narrow screen, wrapping its own "↺ Suggest" text onto two
                lines instead of shrinking the input next to it. */}
            <button
              type="button"
              className="btn-ghost"
              title="Fill from the fields below"
              onClick={() => setNameManuallyEdited(false)}
              style={{ flexShrink: 0, whiteSpace: "nowrap" }}
            >
              ↺ Suggest
            </button>
          </div>
          <div>
            <label className="text-sm block mb-1" style={{ color: "var(--muted)" }}>
              Open to (Trial books Student-open services; each Interview track books its own matching group — Teacher/Staff/Ambassador)
            </label>
            <div className="flex flex-wrap gap-3">
              {ALL_GROUPS.map((g) => (
                <label key={g} className="flex items-center gap-1 text-sm">
                  <input type="checkbox" checked={group.includes(g)} onChange={() => toggleGroup(g)} />
                  {g}
                </label>
              ))}
            </div>
          </div>
          <EditableCombobox value={type} onChange={setType} options={typeOptions} placeholder="Type" />
          {isRoleBasedService && (
            <>
              <input className="field" placeholder="Role (job title)" value={role} onChange={(e) => setRole(e.target.value)} />
              {isStaffRole && (
                <div>
                  <label className="text-xs block mb-1" style={{ color: "var(--muted)" }}>
                    Department
                  </label>
                  <select className="field" value={department} onChange={(e) => setDepartment(e.target.value)}>
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}
          {isAdmissions && (
            <>
              <input className="field" placeholder="Country (e.g. UK)" value={country} onChange={(e) => setCountry(e.target.value)} />
              <input className="field" placeholder="University" value={university} onChange={(e) => setUniversity(e.target.value)} />
            </>
          )}
          {cohortEligible && (
            <>
              <input className="field" placeholder="Curriculum / Board (e.g. Cambridge)" value={board} onChange={(e) => setBoard(e.target.value)} />
              <input
                className="field"
                placeholder="Course (e.g. IGCSE, A-Level, SAT)"
                value={course}
                onChange={(e) => setCourse(e.target.value)}
              />
              <input
                className="field"
                placeholder="Subject Code"
                value={subjectCode}
                onChange={(e) => setSubjectCode(e.target.value)}
              />
              <input
                className="field"
                placeholder="Subject Name"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
              />
            </>
          )}
          {cohortEligible && (
            <>
              <label className="text-sm block" style={{ color: "var(--muted)" }}>
                Resource links (shown on the Student&apos;s and Teacher&apos;s own Resources section for this service)
              </label>
              <input
                className="field"
                placeholder="Recordings link"
                value={recordingsLink}
                onChange={(e) => setRecordingsLink(e.target.value)}
              />
              <input
                className="field"
                placeholder="Syllabus link"
                value={syllabusLink}
                onChange={(e) => setSyllabusLink(e.target.value)}
              />
              <input
                className="field"
                placeholder="Worksheets link"
                value={worksheetsLink}
                onChange={(e) => setWorksheetsLink(e.target.value)}
              />
              <input
                className="field"
                placeholder="Google Classroom link"
                value={gcrLink}
                onChange={(e) => setGcrLink(e.target.value)}
              />
            </>
          )}

          <div className="space-y-2">
            <label className="text-sm" style={{ color: "var(--muted)" }}>
              Resource Links (freeform, named — e.g. a Book service with a &quot;Questions&quot; link and an &quot;Answers&quot; link)
            </label>
            {links.map((l, li) => (
              <div key={li} className="flex gap-2 items-center">
                <input className="field" style={{ maxWidth: 160 }} placeholder="Link name (e.g. Answers)" value={l.name} onChange={(e) => updateLink(li, "name", e.target.value)} />
                <input className="field" placeholder="URL" value={l.url} onChange={(e) => updateLink(li, "url", e.target.value)} />
                {links.length > 1 && (
                  <button type="button" className="btn-ghost" onClick={() => removeLink(li)}>
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button type="button" className="btn-ghost" onClick={addLink}>
              + Add link
            </button>
          </div>

          {isRoleBasedService && (
            <div className="space-y-2">
              <label className="text-sm" style={{ color: "var(--muted)" }}>
                Rates
              </label>
              {flatRates.map((r, ri) => (
                <div key={ri} className="flex gap-2 items-end">
                  <label className="text-xs" style={{ color: "var(--muted)" }}>
                    Currency
                    <select className="field" style={{ maxWidth: 130, display: "block" }} value={r.currency} onChange={(e) => updateFlatRate(ri, "currency", e.target.value)}>
                      {CURRENCIES_FULL.map((cur) => (
                        <option key={cur.code} value={cur.code}>
                          {cur.code}
                        </option>
                      ))}
                    </select>
                  </label>
                  <input className="field" type="number" placeholder="Rate" value={r.rate} onChange={(e) => updateFlatRate(ri, "rate", e.target.value)} />
                  <input
                    className="field"
                    style={{ maxWidth: 120 }}
                    placeholder="Description"
                    maxLength={40}
                    value={r.description}
                    onChange={(e) => updateFlatRate(ri, "description", e.target.value)}
                  />
                  <label className="text-xs" style={{ color: "var(--muted)" }}>
                    Billing type
                    <select className="field" style={{ maxWidth: 110, display: "block" }} value={r.billingType} onChange={(e) => updateFlatRate(ri, "billingType", e.target.value)}>
                      {BILLING_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </label>
                  {flatRates.length > 1 && (
                    <button type="button" className="btn-ghost" onClick={() => removeFlatRate(ri)}>
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button type="button" className="btn-ghost" onClick={addFlatRate}>
                + Add rate
              </button>

              <label className="text-sm block" style={{ color: "var(--muted)" }}>
                Recurring occurrences
              </label>
              {flatOccurrences.map((o, oi) => (
                <div key={oi} className="flex gap-2 items-end">
                  <label className="text-xs" style={{ color: "var(--muted)" }}>
                    Day
                    <select className="field" style={{ display: "block" }} value={o.day} onChange={(e) => updateFlatOcc(oi, "day", e.target.value)}>
                      {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((d) => (
                        <option key={d}>{d}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs" style={{ color: "var(--muted)" }}>
                    Time
                    <input className="field" style={{ display: "block" }} type="time" value={o.time} onChange={(e) => updateFlatOcc(oi, "time", e.target.value)} />
                  </label>
                  <input
                    className="field"
                    type="number"
                    step="0.5"
                    placeholder="Hrs"
                    value={o.duration}
                    onChange={(e) => updateFlatOcc(oi, "duration", e.target.value)}
                  />
                  <FacilitatorInput
                    facilitator={o.facilitator}
                    facilitatorUserId={o.facilitatorUserId}
                    teacherUsers={roleUsers}
                    onChange={({ facilitator, facilitatorUserId }) => {
                      updateFlatOcc(oi, "facilitator", facilitator);
                      updateFlatOcc(oi, "facilitatorUserId", facilitatorUserId);
                    }}
                  />
                  <div>
                    <label className="text-xs block" style={{ color: "var(--muted)" }}>
                      Timezone
                    </label>
                    <TimezoneSelect value={o.timezone} onChange={(v) => updateFlatOcc(oi, "timezone", v)} />
                  </div>
                  {flatOccurrences.length > 1 && (
                    <button type="button" className="btn-ghost" onClick={() => removeFlatOcc(oi)}>
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button type="button" className="btn-ghost" onClick={addFlatOcc}>
                + Add occurrence
              </button>
            </div>
          )}

          {!isRoleBasedService && (
            <div className="space-y-3">
              <label className="text-sm" style={{ color: "var(--muted)" }}>
                Optional Components (e.g. distinct exam papers within one subject — most subjects just need one, left unnamed)
              </label>
              {components.map((c, ci) => (
                <div key={ci} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "0.6rem" }} className="space-y-2">
                  <div className="flex gap-2 items-center">
                    <input
                      className="field"
                      placeholder="Component name (optional — e.g. Pure Mathematics 1)"
                      value={c.componentName}
                      onChange={(e) => updateComponent(ci, "componentName", e.target.value)}
                    />
                    {components.length > 1 && (
                      <button type="button" className="btn-ghost" onClick={() => removeComponent(ci)}>
                        ✕ Component
                      </button>
                    )}
                  </div>

                  {c.batches.map((b, bi) => (
                    <div key={bi} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "0.5rem", background: "var(--panel-2)" }} className="space-y-2">
                      <div className="flex gap-2 items-center" style={{ flex: 1 }}>
                        {isAdmissions ? (
                          <div style={{ flex: 1 }}>
                            <EditableCombobox
                              value={b.batchName}
                              onChange={(v) => updateBatch(ci, bi, "batchName", v)}
                              options={sessionOptions}
                              placeholder="Academic Session (e.g. Fall 2026)"
                            />
                          </div>
                        ) : (
                          <input
                            className="field"
                            placeholder="Batch name (e.g. B14)"
                            value={b.batchName}
                            onChange={(e) => updateBatch(ci, bi, "batchName", e.target.value)}
                          />
                        )}
                        {c.batches.length > 1 && (
                          <button type="button" className="btn-ghost" onClick={() => removeBatch(ci, bi)}>
                            ✕ Batch
                          </button>
                        )}
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs" style={{ color: "var(--muted)" }}>
                          Rates (whoever enrolls in this batch picks one — a rate can optionally be reserved for one Group)
                        </label>
                        {b.rates.map((r, ri) => (
                          <div key={ri} className="flex gap-2 items-end">
                            <label className="text-xs" style={{ color: "var(--muted)" }}>
                              Currency
                              <select className="field" style={{ maxWidth: 130, display: "block" }} value={r.currency} onChange={(e) => updateRate(ci, bi, ri, "currency", e.target.value)}>
                                {CURRENCIES_FULL.map((cur) => (
                                  <option key={cur.code} value={cur.code}>
                                    {cur.code}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <input className="field" type="number" placeholder="Rate" value={r.rate} onChange={(e) => updateRate(ci, bi, ri, "rate", e.target.value)} />
                            <input
                              className="field"
                              style={{ maxWidth: 120 }}
                              placeholder="Description"
                              maxLength={40}
                              value={r.description}
                              onChange={(e) => updateRate(ci, bi, ri, "description", e.target.value)}
                            />
                            <label className="text-xs" style={{ color: "var(--muted)" }}>
                              Billing type
                              <select className="field" style={{ maxWidth: 110, display: "block" }} value={r.billingType} onChange={(e) => updateRate(ci, bi, ri, "billingType", e.target.value)}>
                                {BILLING_TYPES.map((t) => (
                                  <option key={t} value={t}>
                                    {t}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="text-xs" style={{ color: "var(--muted)" }}>
                              Restrict to
                              <select className="field" style={{ width: 160, display: "block" }} value={r.group} onChange={(e) => updateRate(ci, bi, ri, "group", e.target.value)}>
                                <option value="">Any of the above</option>
                                {group.map((g) => (
                                  <option key={g} value={g}>
                                    {g} only
                                  </option>
                                ))}
                              </select>
                            </label>
                            {b.rates.length > 1 && (
                              <button type="button" className="btn-ghost" onClick={() => removeRate(ci, bi, ri)}>
                                ✕
                              </button>
                            )}
                          </div>
                        ))}
                        <button type="button" className="btn-ghost" onClick={() => addRate(ci, bi)}>
                          + Add rate
                        </button>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs" style={{ color: "var(--muted)" }}>
                          Recurring occurrences
                        </label>
                        {b.occurrences.map((o, oi) => (
                          <div key={oi} className="flex gap-2 items-end">
                            <label className="text-xs" style={{ color: "var(--muted)" }}>
                              Day
                              <select className="field" style={{ display: "block" }} value={o.day} onChange={(e) => updateOcc(ci, bi, oi, "day", e.target.value)}>
                                {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((d) => (
                                  <option key={d}>{d}</option>
                                ))}
                              </select>
                            </label>
                            <label className="text-xs" style={{ color: "var(--muted)" }}>
                              Time
                              <input className="field" style={{ display: "block" }} type="time" value={o.time} onChange={(e) => updateOcc(ci, bi, oi, "time", e.target.value)} />
                            </label>
                            <input
                              className="field"
                              type="number"
                              step="0.5"
                              placeholder="Hrs"
                              value={o.duration}
                              onChange={(e) => updateOcc(ci, bi, oi, "duration", e.target.value)}
                            />
                            <FacilitatorInput
                              facilitator={o.facilitator}
                              facilitatorUserId={o.facilitatorUserId}
                              teacherUsers={teacherUsers}
                              onChange={({ facilitator, facilitatorUserId }) => {
                                updateOcc(ci, bi, oi, "facilitator", facilitator);
                                updateOcc(ci, bi, oi, "facilitatorUserId", facilitatorUserId);
                              }}
                            />
                            <div>
                              <label className="text-xs block" style={{ color: "var(--muted)" }}>
                                Timezone
                              </label>
                              <TimezoneSelect value={o.timezone} onChange={(v) => updateOcc(ci, bi, oi, "timezone", v)} />
                            </div>
                            {b.occurrences.length > 1 && (
                              <button type="button" className="btn-ghost" onClick={() => removeOcc(ci, bi, oi)}>
                                ✕
                              </button>
                            )}
                          </div>
                        ))}
                        <button type="button" className="btn-ghost" onClick={() => addOcc(ci, bi)}>
                          + Add occurrence
                        </button>
                      </div>
                    </div>
                  ))}
                  <button type="button" className="btn-ghost" onClick={() => addBatch(ci)}>
                    + Add batch
                  </button>
                </div>
              ))}
              <button type="button" className="btn-ghost" onClick={addComponent}>
                + Add optional component
              </button>
            </div>
          )}

          {error && <p style={{ color: "var(--bad)" }}>{error}</p>}
          <div className="space-x-2">
            <button className="btn" type="submit" disabled={saving}>
              {saving ? "Saving…" : editingId ? "Save changes" : "Create service"}
            </button>
            {editingId && (
              <button type="button" className="btn-ghost" disabled={saving} onClick={resetForm}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="card">
        <label className="text-sm block mb-1" style={{ color: "var(--muted)" }}>
          Search services
        </label>
        <input
          className="field"
          placeholder="Search by name…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {ALL_GROUPS.map((g) => (
        <ServiceGroupTable
          key={g}
          groupName={g}
          services={services
            .filter((s) => groupMatches(s.Group, g))
            .filter((s) => (s.Name || "").toLowerCase().includes(searchQuery.trim().toLowerCase()))}
          onEdit={startEdit}
          onDelete={deleteService}
          busyServiceIds={busyServiceIds}
        />
      ))}
    </div>
  );
}

// A single cell that shows one item plainly, or (when there's more than
// one) a collapsed "N rates"/"N occurrences" summary with its own expand
// toggle — same progressive-disclosure idea as the Service/Component/Batch
// rows above it, just scoped to one cell instead of a whole row since Rates
// and Occurrences have no ID/Name of their own to repeat.
function renderOccurrence(o) {
  return `${o.Day} ${o.Time} (${o.Duration}h)`;
}
function RatesCell({ rates }) {
  return <ExpandableCell items={rates} renderItem={(r) => formatRate(r, { showDescription: true })} label="rates" />;
}
function OccurrencesCell({ occurrences }) {
  return <ExpandableCell items={occurrences} renderItem={renderOccurrence} label="occurrences" />;
}

function ExpandableCell({ items, renderItem, label }) {
  const [open, setOpen] = useState(false);
  if (!items || items.length === 0) return "—";
  if (items.length === 1) return renderItem(items[0]);
  return (
    <div>
      <button type="button" className="btn-ghost" style={{ padding: "0 0.3rem" }} onClick={() => setOpen((o) => !o)}>
        {open ? "▾" : "▸"} {items.length} {label}
      </button>
      {open && (
        <div className="space-y-1" style={{ marginTop: 4 }}>
          {items.map((it, i) => (
            <div key={i}>{renderItem(it)}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function groupKeepOrder(list, keyFn) {
  const map = new Map();
  for (const item of list) {
    const k = keyFn(item);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(item);
  }
  return map;
}

// A pure-navigation row: no Rate/Occurrence/Actions of its own (there could
// be several different services underneath), so everything after its own
// label column is always blank. `atCol` is the 0-based column index the
// label itself lives in; `totalCols` is this table's full column count.
function GroupRow({ label, isOpen, onToggle, atCol, totalCols }) {
  const lead = atCol - 1; // cols 1..atCol-1 (ID/Name/... already decided by an ancestor group)
  const trail = totalCols - atCol - 1; // cols atCol+1..end
  return (
    <tr style={{ background: "var(--panel-2)" }}>
      <td></td>
      {lead > 0 && <td colSpan={lead} />}
      <td>
        <button type="button" className="btn-ghost" style={{ padding: "0 0.4rem" }} onClick={onToggle}>
          {isOpen ? "▾" : "▸"} {label}
        </button>
      </td>
      {trail > 0 && <td colSpan={trail} />}
    </tr>
  );
}

// One row per Service, drilling down Type -> (Student/Teacher only) Board ->
// Subject -> OptionalComponents -> Batches. Any level collapses away
// entirely when there's only one distinct value underneath it — no expand
// click needed for the common single-value case, all the way down:
//   - 1 component, 1 batch: everything shown inline on the Service row.
//   - 1 component, N batches: skip straight to Batch rows.
//   - N components: a Component with only 1 batch shows it inline, one
//     with N batches gets its own expand toggle down to Batch rows.
// The ID column is the only identifier shown; the Service's own Name field
// is never displayed here (its long descriptive text duplicates what the
// Type/Board/Subject/Component/Batch path already conveys — that auto-
// generated long name is for invoice/paycheck line items only, see
// lib/billing.js's lineItemName). A Staff-role Service (Role/Department, no
// Batches) has nothing to drill into below its own row, so it's shown flat
// with no expand at all.
function ServiceGroupTable({ groupName, services, onEdit, onDelete, busyServiceIds }) {
  const isCohort = groupName === "Student" || groupName === "Teacher";
  // Role/Department show for any group whose services can be the flat
  // "no Batch, just Role" shape (see isRoleBasedService in
  // app/api/services/route.js) — every group except Student. Department
  // is Staff-only. Teacher is the one group that can genuinely have BOTH
  // real cohort Batch services (shared with Student) AND its own Teacher-
  // only Role services, so it keeps Component/Batch too; the other
  // role-only groups (Staff/Ambassador/Parent/Management) never have a
  // real Batch use case and drop those columns entirely.
  const showRole = groupName !== "Student";
  const showDepartment = groupName === "Staff";
  const showComponentBatch = isCohort;
  const leadCols = 4 + (isCohort ? 3 : 0) + (showRole ? 1 : 0) + (showDepartment ? 1 : 0); // toggle+ID+Group+Type + cohort/role/department extras (cols before Component)
  const colSpan = leadCols + (showComponentBatch ? 2 : 0) + 4; // + Component/Batch + Rate + Occurrences + Name + Actions
  const [expandedTypes, setExpandedTypes] = useState(new Set());
  const [expandedBoards, setExpandedBoards] = useState(new Set());
  const [expandedCourses, setExpandedCourses] = useState(new Set());
  const [expandedSubjects, setExpandedSubjects] = useState(new Set());
  const [expandedServices, setExpandedServices] = useState(new Set());
  const [expandedComponents, setExpandedComponents] = useState(new Set());

  function toggleIn(setFn, key) {
    setFn((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function batchLeaf(b) {
    return { name: b.BatchName || "—", rates: b.Rates, occurrences: b.OccuranceList, key: b.BatchID };
  }

  // A Staff-role Service (Role/Department, no Batches) is modeled as one
  // pseudo-component holding one pseudo-batch pulled straight off itself.
  const rows = services.map((s) => {
    const components = (s.OptionalComponents || []).map((c) => ({
      name: c.ComponentName || "—",
      key: c.ComponentID,
      batches: (c.Batches || []).map(batchLeaf),
    }));
    if (components.length === 0) {
      components.push({
        name: "—",
        key: s.ServiceID,
        batches: [{ name: "—", rates: s.Rates || [], occurrences: s.OccuranceList || [], key: s.ServiceID }],
      });
    }
    return {
      service: s,
      components,
      ServiceID: s.ServiceID,
      Name: s.Name,
      Type: s.Type,
      _group: normalizeGroup(s.Group).join(", "),
    };
  });
  const { sorted, sortKey, sortDir, toggleSort } = useSort(rows, "ServiceID");

  function renderServiceLeaf(row) {
    const isServiceOpen = expandedServices.has(row.ServiceID);
    const singleComponent = row.components.length === 1 ? row.components[0] : null;
    const singleLeaf = singleComponent && singleComponent.batches.length === 1 ? singleComponent.batches[0] : null;
    // A Staff-role Service has exactly one pseudo-component/pseudo-batch —
    // singleLeaf is always set for it, same as the single-batch shortcut
    // below, so it always shows Rate/Occurrences inline with no expand.
    const serviceExpandable = !singleLeaf;

    return (
      <Fragment key={row.ServiceID}>
        <tr>
          <td></td>
          <td>{row.ServiceID}</td>
          <td>{row._group}</td>
          <td>{row.Type}</td>
          {isCohort && (
            <>
              <td>{row.service.Board || "—"}</td>
              <td>{row.service.Course || "—"}</td>
              <td>{row.service.SubjectName || "—"}</td>
            </>
          )}
          {showRole && <td>{row.service.Role || "—"}</td>}
          {showDepartment && <td>{row.service.Department || "—"}</td>}
          {showComponentBatch && (
            <>
              <td>
                {!singleComponent && serviceExpandable && (
                  <button type="button" className="btn-ghost" style={{ padding: "0 0.4rem" }} onClick={() => toggleIn(setExpandedServices, row.ServiceID)}>
                    {isServiceOpen ? "▾" : "▸"}
                  </button>
                )}
                {singleComponent ? singleComponent.name : `${row.components.length} components`}
              </td>
              <td>
                {singleComponent && serviceExpandable && (
                  <button type="button" className="btn-ghost" style={{ padding: "0 0.4rem" }} onClick={() => toggleIn(setExpandedServices, row.ServiceID)}>
                    {isServiceOpen ? "▾" : "▸"}
                  </button>
                )}
                {singleLeaf ? singleLeaf.name : singleComponent ? `${singleComponent.batches.length} batches` : "—"}
              </td>
            </>
          )}
          <td>{singleLeaf ? <RatesCell rates={singleLeaf.rates} /> : "—"}</td>
          <td style={{ color: "var(--muted)" }}>{singleLeaf ? <OccurrencesCell occurrences={singleLeaf.occurrences} /> : "—"}</td>
          <td>
            <span className="subject-truncate" title={row.Name}>{row.Name}</span>
          </td>
          <td>
            <button className="btn-ghost" onClick={() => onEdit(row.service)}>
              Edit
            </button>
            <ConfirmButton
              label="Delete"
              confirmText="Delete this Service? Only possible if no enrollment has ever referenced it."
              style={{ color: "var(--bad)" }}
              disabled={busyServiceIds?.has(row.ServiceID)}
              onConfirm={() => onDelete(row.ServiceID)}
            />
          </td>
        </tr>

        {isServiceOpen && singleComponent &&
          // Only one Component — skip straight to its Batch rows.
          singleComponent.batches.map((b) => (
            <tr key={b.key} style={{ background: "var(--panel-2)" }}>
              <td></td>
              <td colSpan={leadCols - 1} />
              {showComponentBatch && (
                <>
                  <td>{singleComponent.name}</td>
                  <td>{b.name}</td>
                </>
              )}
              <td><RatesCell rates={b.rates} /></td>
              <td style={{ color: "var(--muted)" }}><OccurrencesCell occurrences={b.occurrences} /></td>
              <td></td>
              <td></td>
            </tr>
          ))}

        {isServiceOpen && !singleComponent &&
          row.components.map((c) => {
            const isComponentOpen = expandedComponents.has(c.key);
            const componentSingleLeaf = c.batches.length === 1 ? c.batches[0] : null;
            return (
              <Fragment key={c.key}>
                <tr style={{ background: "var(--panel-2)" }}>
                  <td></td>
                  <td colSpan={leadCols - 1} />
                  <td>{c.name}</td>
                  {showComponentBatch && (
                    <td>
                      {!componentSingleLeaf && (
                        <button type="button" className="btn-ghost" style={{ padding: "0 0.4rem" }} onClick={() => toggleIn(setExpandedComponents, c.key)}>
                          {isComponentOpen ? "▾" : "▸"}
                        </button>
                      )}
                      {componentSingleLeaf ? componentSingleLeaf.name : `${c.batches.length} batches`}
                    </td>
                  )}
                  <td>{componentSingleLeaf ? <RatesCell rates={componentSingleLeaf.rates} /> : "—"}</td>
                  <td style={{ color: "var(--muted)" }}>
                    {componentSingleLeaf ? <OccurrencesCell occurrences={componentSingleLeaf.occurrences} /> : "—"}
                  </td>
                  <td></td>
                  <td></td>
                </tr>
                {isComponentOpen &&
                  !componentSingleLeaf &&
                  c.batches.map((b) => (
                    <tr key={b.key} style={{ background: "var(--panel-2)" }}>
                      <td></td>
                      <td colSpan={leadCols - 1} />
                      {showComponentBatch && (
                        <>
                          <td></td>
                          <td>{b.name}</td>
                        </>
                      )}
                      <td><RatesCell rates={b.rates} /></td>
                      <td style={{ color: "var(--muted)" }}><OccurrencesCell occurrences={b.occurrences} /></td>
                      <td></td>
                      <td></td>
                    </tr>
                  ))}
              </Fragment>
            );
          })}
      </Fragment>
    );
  }

  // Catalog levels — Type, and (cohort-only) Board -> Course -> Subject —
  // are stable categories, not just a count-based grouping: each ALWAYS
  // gets its own row and always requires a click to expand, even when
  // there's only one value underneath it (unlike Component/Batch below,
  // which are per-Service internal structure and collapse away when
  // trivial). Type additionally shows every category this Group's Type
  // taxonomy defines (see TYPE_OPTIONS_BY_GROUP), including ones with zero
  // services, so e.g. "Admissions"/"Counselling" are visible even when
  // empty — that placeholder behavior is Type-only, not repeated deeper.
  function renderBoardCourseSubject(typeRows) {
    if (!isCohort) return typeRows.map(renderServiceLeaf);

    const withSubject = typeRows.filter((r) => r.service.Board || r.service.SubjectName);
    const withoutSubject = typeRows.filter((r) => !(r.service.Board || r.service.SubjectName));

    const byBoard = groupKeepOrder(withSubject, (r) => r.service.Board || "—");

    const boardNodes = [...byBoard.entries()].map(([boardKey, boardRows]) => {
      const boardToggleKey = `${groupName}::${boardKey}`;
      const boardOpen = expandedBoards.has(boardToggleKey);
      const byCourse = groupKeepOrder(boardRows, (r) => r.service.Course || "—");

      return (
        <Fragment key={boardToggleKey}>
          <GroupRow label={boardKey} isOpen={boardOpen} onToggle={() => toggleIn(setExpandedBoards, boardToggleKey)} atCol={4} totalCols={colSpan} />
          {boardOpen &&
            [...byCourse.entries()].map(([courseKey, courseRows]) => {
              const courseToggleKey = `${boardToggleKey}::${courseKey}`;
              const courseOpen = expandedCourses.has(courseToggleKey);
              const bySubject = groupKeepOrder(courseRows, (r) => `${r.service.SubjectCode || ""}::${r.service.SubjectName || "—"}`);

              return (
                <Fragment key={courseToggleKey}>
                  <GroupRow label={courseKey} isOpen={courseOpen} onToggle={() => toggleIn(setExpandedCourses, courseToggleKey)} atCol={5} totalCols={colSpan} />
                  {courseOpen &&
                    [...bySubject.entries()].map(([, subjectRows]) => {
                      const subjectLabel = subjectRows[0].service.SubjectName || "—";
                      const subjectToggleKey = `${courseToggleKey}::${subjectLabel}`;
                      const subjectOpen = expandedSubjects.has(subjectToggleKey);
                      return (
                        <Fragment key={subjectToggleKey}>
                          <GroupRow
                            label={subjectLabel}
                            isOpen={subjectOpen}
                            onToggle={() => toggleIn(setExpandedSubjects, subjectToggleKey)}
                            atCol={6}
                            totalCols={colSpan}
                          />
                          {subjectOpen && subjectRows.map(renderServiceLeaf)}
                        </Fragment>
                      );
                    })}
                </Fragment>
              );
            })}
        </Fragment>
      );
    });

    return [...boardNodes, ...withoutSubject.map(renderServiceLeaf)];
  }

  const byType = groupKeepOrder(sorted, (r) => r.Type || "—");
  // Union of Types actually present in the data with every category this
  // Group's Type taxonomy defines — a category with zero services still
  // gets its own (empty) row.
  const allTypeKeys = [...new Set([...byType.keys(), ...(TYPE_OPTIONS_BY_GROUP[groupName] || [])])];

  const body = allTypeKeys.flatMap((typeKey) => {
    const typeRows = byType.get(typeKey) || [];
    const isTypeOpen = expandedTypes.has(typeKey);
    return (
      <Fragment key={typeKey}>
        <GroupRow label={typeKey} isOpen={isTypeOpen} onToggle={() => toggleIn(setExpandedTypes, typeKey)} atCol={3} totalCols={colSpan} />
        {isTypeOpen && (typeRows.length > 0 ? renderBoardCourseSubject(typeRows) : (
          <tr style={{ background: "var(--panel-2)" }}>
            <td colSpan={colSpan} style={{ color: "var(--muted)" }}>
              No services yet.
            </td>
          </tr>
        ))}
      </Fragment>
    );
  });

  return (
    <div className="card">
      <h2 className="font-semibold mb-4">{groupName} Services</h2>
      {/* TKT-0134: same maxHeight+overflowY cap as Enrollments/Pipeline. */}
      <div className="scroll-fade" style={{ maxHeight: 480, overflowY: "auto", overflowX: "auto" }}>
        <table style={{ width: "max-content", minWidth: "100%" }}>
          <thead>
            <tr>
              <th></th>
              <SortableTh label="ID" sortKeyName="ServiceID" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortableTh label="Group" sortKeyName="_group" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortableTh label="Type" sortKeyName="Type" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              {isCohort && (
                <>
                  <SortableTh label="Board" sortKeyName="Board" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortableTh label="Course" sortKeyName="Course" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortableTh label="Subject" sortKeyName="SubjectName" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                </>
              )}
              {showRole && <SortableTh label="Role" sortKeyName="Role" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />}
              {showDepartment && <SortableTh label="Department" sortKeyName="Department" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />}
              {showComponentBatch && (
                <>
                  <th>Component</th>
                  <th>Batch</th>
                </>
              )}
              <th>Rate</th>
              <th>Occurrences</th>
              <SortableTh label="Name" sortKeyName="Name" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <th></th>
            </tr>
          </thead>
          <tbody>{body}</tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- Schedule Pool ---------------- */
function SchedulePool() {
  const [items, setItems] = useState([]);
  const [openPoolSlots, setOpenPoolSlots] = useState([]);
  const [rescheduleRequests, setRescheduleRequests] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [attendanceItems, setAttendanceItems] = useState([]);
  const [poolView, setPoolView] = useState("calendar");
  const [serviceView, setServiceView] = useState("calendar");
  const [services, setServices] = useState([]);
  const [serviceType, setServiceType] = useState("Trial");
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(1);
  const [facilitator, setFacilitator] = useState("");
  const [error, setError] = useState("");
  const [expandedAttendance, setExpandedAttendance] = useState(null);
  const [expandedConflict, setExpandedConflict] = useState(null);
  const [openPoolSearch, setOpenPoolSearch] = useState("");
  const [serviceSlotsSearch, setServiceSlotsSearch] = useState("");
  const [conflictsSearch, setConflictsSearch] = useState("");
  const [rescheduleSearch, setRescheduleSearch] = useState("");
  // TKT-0027: hide past sessions by default in the Service Schedule list
  // view (today's own sessions still show).
  const [showPastSchedule, setShowPastSchedule] = useState(false);
  // TKT-0108: the "Mark correct" control already worked once a conflicting
  // session's row was expanded -- the real gap was finding which of
  // potentially hundreds of rows had one at all, with no indicator on the
  // collapsed row and no session/person named in Billing's "Can't send"
  // error. This flag drives both a per-row badge and a list filter.
  const [conflictsOnly, setConflictsOnly] = useState(false);
  const [busyRequestIds, setBusyRequestIds] = useState(new Set());
  const [busyRescheduleIds, setBusyRescheduleIds] = useState(new Set());
  const [creatingSlot, setCreatingSlot] = useState(false);

  async function load() {
    const [{ scheduleItems, openPoolSlotIds }, { services }, { rescheduleRequests }, { enrollments }, { attendanceItems }] = await Promise.all([
      api("/api/schedule"),
      api("/api/services"),
      api("/api/schedule/reschedule-requests"),
      api("/api/enrollments"),
      api("/api/attendance"),
    ]);
    setItems(scheduleItems);
    // /api/schedule now sends open-pool IDs only, see its own comment —
    // reconstitute from scheduleItems, which we already have in full.
    const openPoolIdSet = new Set(openPoolSlotIds);
    setOpenPoolSlots(scheduleItems.filter((s) => openPoolIdSet.has(s.ScheduleID)));
    setServices(services);
    setRescheduleRequests(rescheduleRequests);
    setEnrollments(enrollments);
    setAttendanceItems(attendanceItems);
  }
  useEffect(() => {
  // eslint-disable-next-line react-hooks/set-state-in-effect -- setState happens after an await inside load(), not synchronously; standard mount-time data-fetch pattern.
    load();
  }, []);

  async function directReschedule(scheduleId, rescheduledDate, rescheduledTime) {
    setError("");
    setBusyRescheduleIds((prev) => new Set(prev).add(scheduleId));
    try {
      const { scheduleItem } = await api("/api/schedule", { method: "PATCH", body: JSON.stringify({ scheduleId, rescheduledDate, rescheduledTime }) });
      setItems((prev) => prev.map((i) => (i.ScheduleID === scheduleItem.ScheduleID ? scheduleItem : i)));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyRescheduleIds((prev) => {
        const next = new Set(prev);
        next.delete(scheduleId);
        return next;
      });
    }
  }

  async function reviewRescheduleRequest(requestId, action) {
    setError("");
    setBusyRequestIds((prev) => new Set(prev).add(requestId));
    try {
      const res = await api("/api/schedule/reschedule-requests", { method: "PATCH", body: JSON.stringify({ requestId, action }) });
      setRescheduleRequests((prev) => prev.filter((r) => r.RescheduleRequestID !== res.rescheduleRequest.RescheduleRequestID));
      if (res.scheduleItem) {
        setItems((prev) => prev.map((i) => (i.ScheduleID === res.scheduleItem.ScheduleID ? res.scheduleItem : i)));
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyRequestIds((prev) => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
    }
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    setCreatingSlot(true);
    try {
      const { scheduleItem } = await api("/api/schedule", {
        method: "POST",
        body: JSON.stringify({ serviceType, serviceId, date, time, duration, facilitator }),
      });
      setItems((prev) => [...prev, scheduleItem]);
      setOpenPoolSlots((prev) => [...prev, scheduleItem]);
      setDate("");
      setTime("");
      setFacilitator("");
    } catch (e) {
      setError(e.message);
    } finally {
      setCreatingSlot(false);
    }
  }

  // Only occurrences of a Service someone's actually enrolled in — an
  // auto-generated occurrence for a Service with zero enrollments (e.g.
  // set up but never staffed/assigned) is noise here, not a real class.
  const enrolledServiceIds = new Set(enrollments.map((e) => e.ServiceID));
  const serviceSlots = items.filter((i) => i.OccuranceID !== null && enrolledServiceIds.has(i.ServiceID));
  const requiredGroup = REQUIRED_GROUP_FOR_BOOKING_TYPE[serviceType] || "Staff";
  const eligibleServices = services.filter((s) => groupMatches(s.Group, requiredGroup));

  // TKT-0027: only the List view is filtered — Calendar already scopes to
  // one month at a time via its own navigation, a different (and already
  // reasonable) way of bounding what's shown.
  const todayStr = todayDateStr();
  const pastFiltered = showPastSchedule ? serviceSlots : serviceSlots.filter((s) => s.Date >= todayStr);

  // TKT-0108: a session "has a conflict" the same way SessionAttendance's
  // own per-person badge computes it -- 2+ records for the same
  // (session, subject) that disagree on Status or LoggedDuration. Grouped
  // here by ScheduleItemID+UserID once, up front, so every row's badge is
  // a cheap Set lookup instead of re-scanning attendanceItems per row.
  const conflictingScheduleIds = (() => {
    const bySessionSubject = new Map();
    for (const a of attendanceItems) {
      const key = `${a.ScheduleItemID}::${a.UserID}`;
      (bySessionSubject.get(key) || bySessionSubject.set(key, []).get(key)).push(a);
    }
    const ids = new Set();
    for (const records of bySessionSubject.values()) {
      if (records.length < 2) continue;
      if (records.some((a, i) => records.some((b, j) => i !== j && (a.Status !== b.Status || Number(a.LoggedDuration) !== Number(b.LoggedDuration))))) {
        ids.add(records[0].ScheduleItemID);
      }
    }
    return ids;
  })();
  // TKT-0132: conflictingScheduleIds already covers every conflict in the
  // system (it's built off the full attendanceItems, not the Service
  // Schedule list's own scoped/date-filtered view) -- but the only way to
  // ever SEE one was the "conflicts only" checkbox buried inside Service
  // Schedule's List view, which is itself scoped to enrolled-service
  // occurrences and hides anything past unless "Show past" is also
  // checked. A conflict needing resolution doesn't stop needing it just
  // because its date has passed or nobody happened to have that specific
  // filter combination open. Built off the full `items` (every schedule
  // item, not just serviceSlots) so nothing is missed on that account
  // either.
  const conflictItems = items.filter((i) => conflictingScheduleIds.has(i.ScheduleID));
  const serviceSlotsForList = (conflictsOnly ? pastFiltered.filter((s) => conflictingScheduleIds.has(s.ScheduleID)) : pastFiltered);

  const openPoolFiltered = openPoolSlots.filter((s) => {
    const q = openPoolSearch.trim().toLowerCase();
    return !q || (s.ServiceName || "").toLowerCase().includes(q) || (s.Facilitator || "").toLowerCase().includes(q);
  });
  const serviceSlotsFiltered = serviceSlotsForList.filter((s) => {
    const q = serviceSlotsSearch.trim().toLowerCase();
    return !q || (s.ServiceName || "").toLowerCase().includes(q) || (s.Facilitator || "").toLowerCase().includes(q);
  });
  const openPoolSort = useSort(openPoolFiltered, "Date");
  const serviceSlotsSort = useSort(serviceSlotsFiltered, "Date");
  // Both previously had zero search/sort -- Attendance Conflicts always
  // sorted itself internally (fixed Date+Time ascending, no user control),
  // Pending Reschedule Requests had neither at all. Same pattern as
  // openPool/serviceSlots above.
  const conflictItemsFiltered = conflictItems.filter((s) => {
    const q = conflictsSearch.trim().toLowerCase();
    return !q || (s.ServiceName || "").toLowerCase().includes(q) || (s.Facilitator || "").toLowerCase().includes(q);
  });
  const conflictsSort = useSort(conflictItemsFiltered, "Date");
  const rescheduleFiltered = rescheduleRequests.filter((r) => {
    const q = rescheduleSearch.trim().toLowerCase();
    return !q || (r.Slot?.ServiceName || "").toLowerCase().includes(q) || (r.RequesterName || "").toLowerCase().includes(q);
  });
  const rescheduleSort = useSort(
    rescheduleFiltered.map((r) => ({
      ...r,
      _service: r.Slot?.ServiceName || "",
      _current: r.Slot ? `${r.Slot.RescheduledDate || r.Slot.Date} ${r.Slot.RescheduledTime || r.Slot.Time}` : "",
      _requested: `${r.RequestedDate} ${r.RequestedTime}`,
    })),
    "_requested"
  );

  return (
    <div className="space-y-6">
      {/* TKT-0132: conflictingScheduleIds already covered every conflict
          in the system, but the only way to see one was a checkbox buried
          inside Service Schedule's List view, itself scoped to
          enrolled-service occurrences and hiding anything past unless
          "Show past" was also checked. This surfaces every conflict, past
          or future, in one place — same "cross-cutting summary at the top"
          pattern as Pending Reschedule Requests (TKT-0029) below. Each row
          expands into the exact same SessionAttendance panel (isManagement)
          used everywhere else attendance is resolved, wired to the same
          onLogged={load} so resolving one refreshes conflictingScheduleIds
          and this list drops it immediately. */}
      {conflictItems.length > 0 && (
        <div className="card">
          <h2 className="font-semibold mb-4">Attendance Conflicts ({conflictItems.length})</h2>
          <BillingFilterBar search={conflictsSearch} onSearch={setConflictsSearch} searchPlaceholder="Search service or instructor…" />
          {/* TKT-0134: same maxHeight+overflowY cap as Enrollments/Pipeline. */}
          <div className="scroll-fade overflow-x-auto" style={{ maxHeight: 480, overflowY: "auto" }}>
          <table>
            <thead>
              <tr>
                <SortableTh label="Service" sortKeyName="ServiceName" sortKey={conflictsSort.sortKey} sortDir={conflictsSort.sortDir} onSort={conflictsSort.toggleSort} />
                <SortableTh label="Date" sortKeyName="Date" sortKey={conflictsSort.sortKey} sortDir={conflictsSort.sortDir} onSort={conflictsSort.toggleSort} />
                <SortableTh label="Time" sortKeyName="Time" sortKey={conflictsSort.sortKey} sortDir={conflictsSort.sortDir} onSort={conflictsSort.toggleSort} />
                <SortableTh label="Instructor" sortKeyName="Facilitator" sortKey={conflictsSort.sortKey} sortDir={conflictsSort.sortDir} onSort={conflictsSort.toggleSort} />
                <th></th>
              </tr>
            </thead>
            <tbody>
              {conflictsSort.sorted.map((s) => {
                const expanded = expandedConflict === s.ScheduleID;
                return (
                  <Fragment key={s.ScheduleID}>
                    <tr>
                      <td>{s.ServiceName}</td>
                      <td>{formatDate(s.Date)}</td>
                      <td>{s.Time}</td>
                      <td>{s.Facilitator || "—"}</td>
                      <td>
                        <button className="btn-ghost" onClick={() => setExpandedConflict(expanded ? null : s.ScheduleID)}>
                          {expanded ? "Close" : "Resolve"}
                        </button>
                      </td>
                    </tr>
                    {expanded && (
                      <tr>
                        <td colSpan={5}>
                          <SessionAttendance scheduleId={s.ScheduleID} duration={s.Duration} isManagement onLogged={load} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {conflictsSort.sorted.length === 0 && (
                <tr><td colSpan={5} style={{ color: "var(--muted)" }}>No matches.</td></tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      )}
      {/* TKT-0029: previously a pending reschedule request was only ever
          visible on its own row, inside whichever view (Calendar or List)
          you happened to have open for that specific slot — nothing showed
          "everything currently awaiting your decision" in one place. This
          reuses the exact same GET (Management-only, joined with requester
          name + full slot) and PATCH (approve/reject) the per-slot cell
          already calls — no new backend, just a new place to see and act
          on all of them at once. */}
      {rescheduleRequests.length > 0 && (
        <div className="card">
          <h2 className="font-semibold mb-4">Pending Reschedule Requests ({rescheduleRequests.length})</h2>
          <BillingFilterBar search={rescheduleSearch} onSearch={setRescheduleSearch} searchPlaceholder="Search service or requester…" />
          {/* TKT-0134: same maxHeight+overflowY cap as Enrollments/Pipeline. */}
          <div className="scroll-fade overflow-x-auto" style={{ maxHeight: 480, overflowY: "auto" }}>
          <table>
            <thead>
              <tr>
                <SortableTh label="Service" sortKeyName="_service" sortKey={rescheduleSort.sortKey} sortDir={rescheduleSort.sortDir} onSort={rescheduleSort.toggleSort} />
                <SortableTh label="Requested by" sortKeyName="RequesterName" sortKey={rescheduleSort.sortKey} sortDir={rescheduleSort.sortDir} onSort={rescheduleSort.toggleSort} />
                <SortableTh label="Current" sortKeyName="_current" sortKey={rescheduleSort.sortKey} sortDir={rescheduleSort.sortDir} onSort={rescheduleSort.toggleSort} />
                <SortableTh label="Requested" sortKeyName="_requested" sortKey={rescheduleSort.sortKey} sortDir={rescheduleSort.sortDir} onSort={rescheduleSort.toggleSort} />
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rescheduleSort.sorted.map((r) => (
                <tr key={r.RescheduleRequestID}>
                  <td>{r.Slot?.ServiceName || "—"}</td>
                  <td>{r.RequesterName}</td>
                  <td>
                    {r.Slot ? `${formatDate(r.Slot.RescheduledDate || r.Slot.Date)} ${r.Slot.RescheduledTime || r.Slot.Time}` : "—"}
                  </td>
                  <td>
                    {formatDate(r.RequestedDate)} {r.RequestedTime}
                  </td>
                  <td className="flex gap-2">
                    <button
                      className="btn"
                      disabled={busyRequestIds.has(r.RescheduleRequestID)}
                      onClick={() => reviewRescheduleRequest(r.RescheduleRequestID, "approve")}
                    >
                      {busyRequestIds.has(r.RescheduleRequestID) ? "Working…" : "Approve"}
                    </button>
                    <button
                      className="btn-ghost"
                      disabled={busyRequestIds.has(r.RescheduleRequestID)}
                      onClick={() => reviewRescheduleRequest(r.RescheduleRequestID, "reject")}
                    >
                      {busyRequestIds.has(r.RescheduleRequestID) ? "Working…" : "Reject"}
                    </button>
                  </td>
                </tr>
              ))}
              {rescheduleSort.sorted.length === 0 && (
                <tr><td colSpan={5} style={{ color: "var(--muted)" }}>No matches.</td></tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      )}

    <div className="grid gap-6 md:grid-cols-2">
      <div className="card">
        <h2 className="font-semibold mb-4">Offer a Trial / Interview Slot</h2>
        <p className="text-sm mb-3" style={{ color: "var(--muted)" }}>
          Open pool — any Trial/Interview account can request a slot; multiple requests on the
          same slot are fine. Management approves one, which locks the slot and (for Trial)
          auto-bills one month in advance for that Service.
        </p>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-xs block mb-1" style={{ color: "var(--muted)" }}>
              Slot type
            </label>
            <select
              className="field"
              value={serviceType}
              onChange={(e) => {
                setServiceType(e.target.value);
                setServiceId("");
              }}
            >
              {BOOKING_TYPES.map((t) => (
                <option key={t} value={t}>
                  {BOOKING_TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          </div>
          <select className="field" value={serviceId} onChange={(e) => setServiceId(e.target.value)} required>
            <option value="">Select service…</option>
            {eligibleServices.map((s) => (
              <option key={s.ServiceID} value={s.ServiceID}>
                {s.Name}
              </option>
            ))}
          </select>
          <input className="field" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          <div>
            <input className="field" type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
            {/* TKT-0079: every Trial/Interview slot is stored as IST — this
                input has no timezone of its own, so make that explicit
                rather than leaving it ambiguous. */}
            <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>IST (India)</p>
          </div>
          <input
            className="field"
            type="number"
            step="0.5"
            placeholder="Duration (hrs)"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
          />
          <input
            className="field"
            placeholder="Instructor"
            value={facilitator}
            onChange={(e) => setFacilitator(e.target.value)}
          />
          {error && <p style={{ color: "var(--bad)" }}>{error}</p>}
          <button className="btn" type="submit" disabled={creatingSlot}>
            {creatingSlot ? "Offering…" : "Offer slot"}
          </button>
        </form>

        <div className="flex items-center justify-between mt-6 mb-2">
          <h3 className="font-semibold">Open pool slots</h3>
          <div className="flex gap-2">
            <button className={poolView === "list" ? "btn" : "btn-ghost"} onClick={() => setPoolView("list")}>
              List
            </button>
            <button className={poolView === "calendar" ? "btn" : "btn-ghost"} onClick={() => setPoolView("calendar")}>
              Calendar
            </button>
          </div>
        </div>
        {poolView === "calendar" ? (
          <ScheduleCalendar scheduleItems={openPoolSlots} attendanceItems={[]} readOnly colorByGroup />
        ) : (
          <>
          <BillingFilterBar search={openPoolSearch} onSearch={setOpenPoolSearch} searchPlaceholder="Search service or instructor…" />
          {/* TKT-0134: same maxHeight+overflowY cap as Enrollments/Pipeline. */}
          <div className="scroll-fade overflow-x-auto" style={{ maxHeight: 480, overflowY: "auto" }}>
          <table>
            <thead>
              <tr>
                <SortableTh label="Type" sortKeyName="ServiceType" sortKey={openPoolSort.sortKey} sortDir={openPoolSort.sortDir} onSort={openPoolSort.toggleSort} />
                <SortableTh label="Service" sortKeyName="ServiceName" sortKey={openPoolSort.sortKey} sortDir={openPoolSort.sortDir} onSort={openPoolSort.toggleSort} />
                <SortableTh label="Date" sortKeyName="Date" sortKey={openPoolSort.sortKey} sortDir={openPoolSort.sortDir} onSort={openPoolSort.toggleSort} />
                <SortableTh label="Time" sortKeyName="Time" sortKey={openPoolSort.sortKey} sortDir={openPoolSort.sortDir} onSort={openPoolSort.toggleSort} />
                <SortableTh label="Instructor" sortKeyName="Facilitator" sortKey={openPoolSort.sortKey} sortDir={openPoolSort.sortDir} onSort={openPoolSort.toggleSort} />
              </tr>
            </thead>
            <tbody>
              {openPoolSort.sorted.map((s) => (
                <tr key={s.ScheduleID}>
                  <td>{s.ServiceType}</td>
                  <td>
                    <span
                      title={normalizeGroup(s.ServiceGroup).join(" + ")}
                      style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: groupGradient(normalizeGroup(s.ServiceGroup)), marginRight: 6 }}
                    />
                    <span className="subject-truncate" title={s.ServiceName}>{s.ServiceName}</span>
                  </td>
                  <td>{formatDate(s.Date)}</td>
                  <td>{s.Time}</td>
                  <td>{s.Facilitator}</td>
                </tr>
              ))}
              {openPoolSort.sorted.length === 0 && (
                <tr><td colSpan={5} style={{ color: "var(--muted)" }}>{openPoolSlots.length === 0 ? "No open pool slots." : "No matches."}</td></tr>
              )}
            </tbody>
          </table>
          </div>
          </>
        )}

      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Service Schedule (auto-generated)</h2>
          <div className="flex gap-2">
            <button className={serviceView === "list" ? "btn" : "btn-ghost"} onClick={() => setServiceView("list")}>
              List
            </button>
            <button className={serviceView === "calendar" ? "btn" : "btn-ghost"} onClick={() => setServiceView("calendar")}>
              Calendar
            </button>
            <button className={serviceView === "image" ? "btn" : "btn-ghost"} onClick={() => setServiceView("image")}>
              Weekly Schedule Image
            </button>
          </div>
        </div>
        {serviceView === "list" && (
          <div className="flex gap-4 mb-3">
            <label className="text-sm flex items-center gap-2" style={{ color: "var(--muted)" }}>
              <input type="checkbox" checked={showPastSchedule} onChange={(e) => setShowPastSchedule(e.target.checked)} />
              Show past
            </label>
            <label className="text-sm flex items-center gap-2" style={{ color: "var(--muted)" }}>
              <input type="checkbox" checked={conflictsOnly} onChange={(e) => setConflictsOnly(e.target.checked)} />
              Conflicts only {conflictingScheduleIds.size > 0 ? `(${conflictingScheduleIds.size})` : ""}
            </label>
          </div>
        )}
        {serviceView === "list" && (
          <BillingFilterBar search={serviceSlotsSearch} onSearch={setServiceSlotsSearch} searchPlaceholder="Search service or instructor…" />
        )}
        {serviceView === "image" ? (
          <div className="space-y-3">
            {/* Same reasoning as components/ScheduleImage.jsx: the PNG's real
                aspect ratio isn't known ahead of render, so fill + object-fit:
                contain inside a sized wrapper avoids guessing dimensions and
                never crops/distorts, at the cost of a 700px height cap that
                didn't exist on the plain <img> (letterboxed, not cropped).
                unoptimized is required, not optional: this route needs the
                caller's own session cookie (requireManagement), but Next's
                built-in image optimizer fetches the src server-side without
                forwarding cookies, so an optimized fetch 401s silently and
                the image never loads. unoptimized makes the browser fetch it
                directly instead, with the real session. */}
            <div style={{ position: "relative", width: "100%", height: 700, borderRadius: 8, border: "1px solid var(--border)" }}>
              <Image src="/api/schedule/admin-image" alt="Weekly schedule" fill style={{ objectFit: "contain" }} unoptimized />
            </div>
            <div>
              <a className="btn-ghost" href="/api/schedule/admin-image?download=1" download="DC_Admin_Weekly_Schedule.png">
                Download PNG
              </a>
            </div>
          </div>
        ) : serviceView === "calendar" ? (
          <ScheduleCalendar
            scheduleItems={serviceSlots}
            attendanceItems={attendanceItems}
            readOnly
            colorByGroup
            renderExpanded={(scheduleId, s) => (
              <SessionAttendance scheduleId={scheduleId} duration={s.Duration} isManagement onLogged={load} />
            )}
          />
        ) : (
          <>
          {/* TKT-0134: same maxHeight+overflowY cap as Enrollments/Pipeline. */}
          <div className="scroll-fade overflow-x-auto" style={{ maxHeight: 480, overflowY: "auto" }}>
          <table>
            <thead>
              <tr>
                <SortableTh label="Service" sortKeyName="ServiceName" sortKey={serviceSlotsSort.sortKey} sortDir={serviceSlotsSort.sortDir} onSort={serviceSlotsSort.toggleSort} />
                <SortableTh label="Date" sortKeyName="Date" sortKey={serviceSlotsSort.sortKey} sortDir={serviceSlotsSort.sortDir} onSort={serviceSlotsSort.toggleSort} />
                <SortableTh label="Time" sortKeyName="Time" sortKey={serviceSlotsSort.sortKey} sortDir={serviceSlotsSort.sortDir} onSort={serviceSlotsSort.toggleSort} />
                <SortableTh className="num" label="Hrs" sortKeyName="Duration" sortKey={serviceSlotsSort.sortKey} sortDir={serviceSlotsSort.sortDir} onSort={serviceSlotsSort.toggleSort} />
                <SortableTh label="Instructor" sortKeyName="Facilitator" sortKey={serviceSlotsSort.sortKey} sortDir={serviceSlotsSort.sortDir} onSort={serviceSlotsSort.toggleSort} />
                <th>Attendance</th>
                <th>Reschedule</th>
              </tr>
            </thead>
            <tbody>
              {serviceSlotsSort.sorted.map((s) => {
                const expanded = expandedAttendance === s.ScheduleID;
                const recordCount = attendanceItems.filter((a) => a.ScheduleItemID === s.ScheduleID).length;
                return (
                <Fragment key={s.ScheduleID}>
                <tr>
                  <td>
                    <span
                      title={normalizeGroup(s.ServiceGroup).join(" + ")}
                      style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: groupGradient(normalizeGroup(s.ServiceGroup)), marginRight: 6 }}
                    />
                    <span className="subject-truncate" title={s.ServiceName}>{s.ServiceName}</span>
                  </td>
                  <td>{formatDate(s.Date)}</td>
                  <td>{s.Time}</td>
                  <td className="num">{s.Duration}</td>
                  <td>{s.Facilitator}</td>
                  <td>
                    <button className="btn-ghost" onClick={() => setExpandedAttendance(expanded ? null : s.ScheduleID)}>
                      {recordCount > 0 ? `${recordCount} logged` : "None"}
                      {conflictingScheduleIds.has(s.ScheduleID) ? " ⚠" : ""}
                    </button>
                  </td>
                  <td>
                    <RescheduleCell
                      slot={s}
                      pendingRequest={rescheduleRequests.find((r) => r.ScheduleItemID === s.ScheduleID)}
                      onDirectReschedule={directReschedule}
                      onReviewRequest={reviewRescheduleRequest}
                    />
                  </td>
                </tr>
                {expanded && (
                  <tr>
                    <td colSpan={7}>
                      <SessionAttendance scheduleId={s.ScheduleID} duration={s.Duration} isManagement onLogged={load} />
                    </td>
                  </tr>
                )}
                </Fragment>
                );
              })}
              {serviceSlotsSort.sorted.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ color: "var(--muted)" }}>
                    {serviceSlots.length === 0
                      ? "No sessions."
                      : serviceSlotsForList.length > 0
                      ? "No matches."
                      : "No upcoming sessions — check \"Show past\" to see history."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
          </>
        )}
      </div>
    </div>
    </div>
  );
}

// One cell handles all three reschedule states for a single occurrence:
// already rescheduled (badge + clear button), a pending self-service
// request awaiting Management's approve/reject, or neither (a "Reschedule"
// button opening an inline date/time form for Management's own direct
// reschedule — applies immediately, no approval needed).
function RescheduleCell({ slot, pendingRequest, onDirectReschedule, onReviewRequest }) {
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(slot.RescheduledDate || "");
  const [time, setTime] = useState(slot.RescheduledTime || "");
  const [saving, setSaving] = useState(false);

  async function run(fn, ...args) {
    setSaving(true);
    try {
      await fn(...args);
    } finally {
      setSaving(false);
    }
  }

  if (pendingRequest) {
    return (
      <div className="text-sm">
        <div>
          Requested: {formatDate(pendingRequest.RequestedDate)} {pendingRequest.RequestedTime}
        </div>
        <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>
          by {pendingRequest.RequesterName}
        </div>
        <div className="flex gap-2">
          <button
            className="btn-ghost"
            disabled={saving}
            onClick={() => run(onReviewRequest, pendingRequest.RescheduleRequestID, "approve")}
          >
            {saving ? "Working…" : "Approve"}
          </button>
          <button
            className="btn-ghost"
            style={{ color: "var(--bad)" }}
            disabled={saving}
            onClick={() => run(onReviewRequest, pendingRequest.RescheduleRequestID, "reject")}
          >
            {saving ? "Working…" : "Reject"}
          </button>
        </div>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="flex gap-2 items-end flex-wrap">
        <label className="text-xs" style={{ color: "var(--muted)" }}>
          New date
          <input className="field" style={{ display: "block" }} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="text-xs" style={{ color: "var(--muted)" }}>
          New time
          <input className="field" style={{ display: "block" }} type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </label>
        <button
          className="btn-ghost"
          disabled={saving}
          onClick={async () => {
            await run(onDirectReschedule, slot.ScheduleID, date, time);
            setEditing(false);
          }}
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button className="btn-ghost" disabled={saving} onClick={() => setEditing(false)}>
          Cancel
        </button>
      </div>
    );
  }

  if (slot.RescheduledDate) {
    return (
      <div className="text-sm">
        <div>
          → {formatDate(slot.RescheduledDate)} {slot.RescheduledTime}
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={() => setEditing(true)}>
            Edit
          </button>
          <button
            className="btn-ghost"
            style={{ color: "var(--bad)" }}
            disabled={saving}
            onClick={() => run(onDirectReschedule, slot.ScheduleID, "", "")}
          >
            {saving ? "Clearing…" : "Clear"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button className="btn-ghost" onClick={() => setEditing(true)}>
      Reschedule
    </button>
  );
}

/* ---------------- Enrollments ---------------- */
function Enrollments() {
  const [users, setUsers] = useState([]);
  const [services, setServices] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [error, setError] = useState("");

  async function load() {
    const [{ users }, { services }, { enrollments }] = await Promise.all([
      api("/api/users"),
      api("/api/services"),
      api("/api/enrollments"),
    ]);
    setUsers(users.filter((u) => ALL_GROUPS.includes(roleGroupOf(u))));
    setServices(services);
    setEnrollments(enrollments);
  }
  useEffect(() => {
  // eslint-disable-next-line react-hooks/set-state-in-effect -- setState happens after an await inside load(), not synchronously; standard mount-time data-fetch pattern.
    load();
  }, []);

  // TKT-0005: one student into one or more services at once, sharing one
  // StartDate/EndDate — `rows` is [{ serviceId, batchId, rateId }, ...],
  // each already resolved by the form itself (its own Service/Batch/Rate
  // pickers, same as a single enroll). No new API — just the existing
  // single-enrollment POST once per row.
  async function enrollMany(userId, rows, startDate, endDate) {
    setError("");
    const failures = [];
    const created = [];
    for (const row of rows) {
      try {
        const { enrollment } = await api("/api/enrollments", { method: "POST", body: JSON.stringify({ userId, serviceId: row.serviceId, batchId: row.batchId, rateId: row.rateId, startDate, endDate }) });
        created.push(enrollment);
      } catch (e) {
        failures.push(`${serviceNameOf(row.serviceId)}: ${e.message}`);
      }
    }
    if (failures.length) setError(`${failures.length} of ${rows.length} enrollment(s) failed — ${failures.join("; ")}`);
    if (created.length) setEnrollments((prev) => [...prev, ...created]);
  }

  // TKT-0015: mint a one-off custom Rate inline from the enroll form,
  // instead of being limited to a Service's already-defined Rates. Reuses
  // the Service's own rate storage (POST /api/services/rates) so the new
  // Rate is a first-class RateID billing already understands — just
  // created from the enroll form instead of the Service editor.
  async function addCustomRate(serviceId, batchId, rate) {
    const { rate: newRate, service } = await api("/api/services/rates", { method: "POST", body: JSON.stringify({ serviceId, batchId, ...rate }) });
    setServices((prev) => prev.map((s) => (s.ServiceID === service.ServiceID ? service : s)));
    return newRate;
  }

  async function updateEnrollment(enrolmentId, patch) {
    const { enrollment } = await api("/api/enrollments", { method: "PATCH", body: JSON.stringify({ enrolmentId, ...patch }) });
    setEnrollments((prev) => prev.map((e) => (e.EnrolmentID === enrollment.EnrolmentID ? enrollment : e)));
  }

  async function deleteEnrollment(enrolmentId) {
    await api("/api/enrollments", { method: "DELETE", body: JSON.stringify({ enrolmentId }) });
    setEnrollments((prev) => prev.filter((e) => e.EnrolmentID !== enrolmentId));
  }

  function nameOf(id) {
    return users.find((u) => u.UserID === id)?.Name || id;
  }
  function serviceNameOf(id) {
    return services.find((s) => s.ServiceID === id)?.Name || id;
  }
  function batchNameOf(serviceId, batchId) {
    const service = services.find((s) => s.ServiceID === serviceId);
    return batchesOf(service).find((b) => b.BatchID === batchId)?.BatchName || batchId || "—";
  }

  const shared = { users, services, nameOf, serviceNameOf, batchNameOf, onUpdate: updateEnrollment, onDelete: deleteEnrollment, onAddRate: addCustomRate };

  return (
    <div className="space-y-6">
      {error && <p style={{ color: "var(--bad)" }}>{error}</p>}
      {ALL_GROUPS.map((g) => {
        const people = users.filter((u) => roleGroupOf(u) === g);
        const eligibleServices = services.filter((s) => groupMatches(s.Group, g));
        const groupEnrollments = enrollments.filter((e) => people.some((u) => u.UserID === e.UserID));
        return (
          <EnrollmentGroup
            key={g}
            title={g}
            people={people}
            eligibleServices={eligibleServices}
            enrollments={groupEnrollments}
            onEnroll={enrollMany}
            {...shared}
          />
        );
      })}
    </div>
  );
}

function EnrollmentGroup({ title, people, eligibleServices, enrollments, onEnroll, users, services, nameOf, serviceNameOf, batchNameOf, onUpdate, onDelete, onAddRate }) {
  const [userId, setUserId] = useState("");
  // TKT-0005: rows is [{ serviceId, batchId, rateId }, ...] — one student,
  // one or more services in a single enroll action, each with its own
  // Batch/Rate picker (not defaulted) rather than a separate bulk-enroll
  // UI. Start/End date stay shared across every row in the submission.
  const [rows, setRows] = useState([{ serviceId: "", batchId: "", rateId: "" }]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // TKT-0015: index of the row currently showing its "new custom rate"
  // mini-form (only one open at a time — simplest way to avoid tracking a
  // draft per row when in practice only one is being filled in at once).
  const [customRateRow, setCustomRateRow] = useState(null);
  const [customRateDraft, setCustomRateDraft] = useState({ currency: "INR", rate: "", description: "", billingType: "Monthly" });
  const [customRateError, setCustomRateError] = useState("");
  const [addingRate, setAddingRate] = useState(false);
  const [enrolling, setEnrolling] = useState(false);

  function openCustomRate(index) {
    setCustomRateRow(index);
    setCustomRateDraft({ currency: "INR", rate: "", description: "", billingType: "Monthly" });
    setCustomRateError("");
  }

  async function submitCustomRate(index) {
    setCustomRateError("");
    if (!customRateDraft.rate) {
      setCustomRateError("Enter an amount.");
      return;
    }
    setAddingRate(true);
    try {
      const newRate = await onAddRate(rows[index].serviceId, rows[index].batchId, customRateDraft);
      updateRow(index, { rateId: newRate.RateID });
      setCustomRateRow(null);
    } catch (e) {
      setCustomRateError(e.message);
    } finally {
      setAddingRate(false);
    }
  }

  const selectedUser = people.find((u) => u.UserID === userId);

  // TKT-0122: this used to gate availableRates on a selectedBatch actually
  // existing, but a role-based Service (Staff, Ambassador, etc.) has no
  // Batch at all -- its Rates live directly on the Service. ratesOf()
  // itself already falls back to service.Rates correctly (same helper the
  // server's resolveRate() uses); the bug was this client code refusing
  // to call it without a Batch, leaving Staff enrollment with an always-
  // empty rate dropdown (and any newly-added custom rate, though it did
  // save, could never show up in that empty list either).
  function rowOptions(row) {
    const selectedService = eligibleServices.find((s) => s.ServiceID === row.serviceId);
    const availableBatches = selectedService ? batchesOf(selectedService) : [];
    // Only rates this user's own account type is allowed to enroll at — an
    // unset Rate.Group is open to anyone the Service itself is open to.
    const availableRates = (selectedService ? ratesOf(selectedService, row.batchId) : []).filter(
      (r) => !r.Group || r.Group === selectedUser?.UserType
    );
    return { selectedService, availableBatches, availableRates };
  }

  // Enrollments audit pass: no way to jump to one person in a long list,
  // same gap Billing had before its own filter bar. Search-only reuse of
  // BillingFilterBar (no status concept here), collapsed by default.
  const [search, setSearch] = useState("");
  const searchLower = search.trim().toLowerCase();

  const enrollmentRows = enrollments
    .map((e) => ({
      ...e,
      _person: nameOf(e.UserID),
      _service: serviceNameOf(e.ServiceID),
      _batch: batchNameOf(e.ServiceID, e.BatchID),
      _rate: e.Currency ? `${e.Currency} ${rateById(services.find((s) => s.ServiceID === e.ServiceID), e.BatchID, e.RateID)?.Rate ?? ""}` : "",
    }))
    .filter((e) => !searchLower || e._person.toLowerCase().includes(searchLower) || e._service.toLowerCase().includes(searchLower));
  const { sorted, sortKey, sortDir, toggleSort } = useSort(enrollmentRows, "_person");

  function updateRow(index, patch) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  // TKT-0122: rateId used to default to whichever rate happened to sort
  // first, a real amount silently applied with no on-screen indicator
  // Management ever chose it -- same bug class TKT-0047 fixed elsewhere
  // for other silently-auto-selected fields. Rate always starts blank now;
  // the field's own `required` attribute (below) enforces an explicit
  // pick before the form can submit.
  function pickServiceAt(index, id) {
    const svc = eligibleServices.find((s) => s.ServiceID === id);
    const firstBatch = svc ? batchesOf(svc)[0] : null;
    updateRow(index, {
      serviceId: id,
      batchId: firstBatch?.BatchID || "",
      rateId: "",
    });
  }

  function pickBatchAt(index, batchId) {
    updateRow(index, { batchId, rateId: "" });
  }

  function addRow() {
    setRows((prev) => [...prev, { serviceId: "", batchId: "", rateId: "" }]);
  }

  function removeRow(index) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  async function submit(e) {
    e.preventDefault();
    const validRows = rows.filter((r) => r.serviceId);
    setEnrolling(true);
    try {
      await onEnroll(userId, validRows, startDate, endDate);
      setUserId("");
      setRows([{ serviceId: "", batchId: "", rateId: "" }]);
      setStartDate("");
      setEndDate("");
    } finally {
      setEnrolling(false);
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 items-start">
      <div className="card">
        <h2 className="font-semibold mb-4">Enroll a {title} into Service(s)</h2>
        <form onSubmit={submit} className="space-y-3">
          <select className="field" value={userId} onChange={(e) => setUserId(e.target.value)} required>
            <option value="">Select {title.toLowerCase()}…</option>
            {people.map((u) => (
              <option key={u.UserID} value={u.UserID}>
                {u.Name}
              </option>
            ))}
          </select>

          {rows.map((row, index) => {
            const { availableBatches, availableRates } = rowOptions(row);
            return (
              <div key={index} className="space-y-2 p-3" style={{ border: "1px solid var(--border)", borderRadius: 8 }}>
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: "var(--muted)" }}>
                    Service {index + 1}
                  </span>
                  {rows.length > 1 && (
                    <button type="button" className="btn-ghost" style={{ color: "var(--bad)" }} onClick={() => removeRow(index)}>
                      Remove
                    </button>
                  )}
                </div>
                <div>
                  <label className="text-xs block mb-1" style={{ color: "var(--muted)" }}>
                    Service
                  </label>
                  <select className="field" value={row.serviceId} onChange={(e) => pickServiceAt(index, e.target.value)} required>
                    <option value="">Select service…</option>
                    {eligibleServices.map((s) => (
                      <option key={s.ServiceID} value={s.ServiceID}>
                        {s.Name}
                      </option>
                    ))}
                  </select>
                </div>
                {availableBatches.length > 1 && (
                  <div>
                    <label className="text-xs block mb-1" style={{ color: "var(--muted)" }}>
                      Batch
                    </label>
                    <select className="field" value={row.batchId} onChange={(e) => pickBatchAt(index, e.target.value)} required>
                      {availableBatches.map((b) => (
                        <option key={b.BatchID} value={b.BatchID}>
                          {b.BatchName}{batchScheduleLabel(b) ? ` — ${batchScheduleLabel(b)}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {availableRates.length > 0 && (
                  <div>
                    <label className="text-xs block mb-1" style={{ color: "var(--muted)" }}>
                      Rate
                    </label>
                    <select className="field" value={row.rateId} onChange={(e) => updateRow(index, { rateId: e.target.value })} required>
                      <option value="">Select a rate…</option>
                      {availableRates.map((r) => (
                        <option key={r.RateID} value={r.RateID}>
                          {r.Currency} {r.Rate}{r.Description ? ` (${r.Description})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {row.serviceId && (
                  customRateRow === index ? (
                    <div className="space-y-2 p-2" style={{ border: "1px dashed var(--border)", borderRadius: 6 }}>
                      <div className="flex gap-2 items-center">
                        <select className="field" style={{ maxWidth: 100 }} value={customRateDraft.currency} onChange={(e) => setCustomRateDraft((d) => ({ ...d, currency: e.target.value }))}>
                          {CURRENCIES_FULL.map((cur) => (
                            <option key={cur.code} value={cur.code}>
                              {cur.code}
                            </option>
                          ))}
                        </select>
                        <input className="field" type="number" placeholder="Amount" value={customRateDraft.rate} onChange={(e) => setCustomRateDraft((d) => ({ ...d, rate: e.target.value }))} />
                        <select className="field" style={{ maxWidth: 110 }} value={customRateDraft.billingType} onChange={(e) => setCustomRateDraft((d) => ({ ...d, billingType: e.target.value }))}>
                          {BILLING_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </div>
                      <input
                        className="field"
                        placeholder="Description (optional)"
                        maxLength={40}
                        value={customRateDraft.description}
                        onChange={(e) => setCustomRateDraft((d) => ({ ...d, description: e.target.value }))}
                      />
                      {customRateError && (
                        <p className="text-sm" style={{ color: "var(--bad)" }}>
                          {customRateError}
                        </p>
                      )}
                      <div className="flex gap-2">
                        <button type="button" className="btn" disabled={addingRate} onClick={() => submitCustomRate(index)}>
                          {addingRate ? "Adding…" : "Add rate"}
                        </button>
                        <button type="button" className="btn-ghost" onClick={() => setCustomRateRow(null)}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" className="btn-ghost text-sm" onClick={() => openCustomRate(index)}>
                      + New rate for this service
                    </button>
                  )
                )}
              </div>
            );
          })}
          <button type="button" className="btn-ghost" onClick={addRow}>
            + Add another service
          </button>

          <div>
            <label className="text-sm block mb-1" style={{ color: "var(--muted)" }}>
              Start date (optional — applies to all services above)
            </label>
            <input className="field" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className="text-sm block mb-1" style={{ color: "var(--muted)" }}>
              End date (optional — leave blank if ongoing)
            </label>
            <input className="field" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <button className="btn" type="submit" disabled={enrolling}>
            {enrolling
              ? "Enrolling…"
              : `Enroll into ${rows.filter((r) => r.serviceId).length || rows.length} service${(rows.filter((r) => r.serviceId).length || rows.length) === 1 ? "" : "s"}`}
          </button>
        </form>
      </div>
      <div className="card">
        <h2 className="font-semibold mb-4">Current {title} Enrollments</h2>
        <BillingFilterBar search={search} onSearch={setSearch} searchPlaceholder={`Search ${title.toLowerCase()}…`} />
        {/* TKT-0114: this table has no natural row cap, and used to have no
            overflow handling at all, so a long list pushed the whole 50/50
            layout wide instead of staying inside its own card. Vertical
            scroll within a fixed max-height keeps the split intact; the
            inner overflow-x-auto still catches genuinely wide content
            (many columns on a narrow card) without that scrolling the page.
            Audit pass: that scroll used to clip its last row mid-cell with
            no hint there was more below -- className="scroll-fade" adds a
            soft bottom gradient (see globals.css) so a cut-off row reads as
            "scroll for more," not as broken rendering. */}
        <div className="scroll-fade overflow-x-auto" style={{ maxHeight: 480, overflowY: "auto" }}>
            <table>
              <thead>
                <tr>
                  <SortableTh label="Person" sortKeyName="_person" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortableTh label="Service" sortKeyName="_service" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortableTh label="Batch" sortKeyName="_batch" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortableTh className="num" label="Rate" sortKeyName="_rate" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortableTh className="num" label="Start" sortKeyName="StartDate" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortableTh className="num" label="End" sortKeyName="EndDate" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((e) => (
                  <EnrollmentRow
                    key={e.EnrolmentID}
                    enrollment={e}
                    users={users}
                    services={services}
                    nameOf={nameOf}
                    serviceNameOf={serviceNameOf}
                    batchNameOf={batchNameOf}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                  />
                ))}
                {enrollments.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ color: "var(--muted)" }}>
                      No {title.toLowerCase()} enrollments yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}


function EnrollmentRow({ enrollment, users, services, nameOf, serviceNameOf, batchNameOf, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [userId, setUserId] = useState(enrollment.UserID);
  const [serviceId, setServiceId] = useState(enrollment.ServiceID);
  const [batchId, setBatchId] = useState(enrollment.BatchID || "");
  const [rateId, setRateId] = useState(enrollment.RateID || "");
  const [startDate, setStartDate] = useState(enrollment.StartDate || "");
  const [endDate, setEndDate] = useState(enrollment.EndDate || "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  const editingUser = users.find((u) => u.UserID === userId);
  const editingService = services.find((s) => s.ServiceID === serviceId);
  const availableBatches = editingService ? batchesOf(editingService) : [];
  // TKT-0122: same fix as the enroll form above -- ratesOf() already
  // falls back to service.Rates for role-based Services with no Batch,
  // gating on batchId here just left Staff enrollment edits with an
  // empty rate list.
  const availableRates = (editingService ? ratesOf(editingService, batchId) : []).filter(
    (r) => !r.Group || r.Group === editingUser?.UserType
  );

  // TKT-0122: rateId no longer auto-defaults to whichever rate sorts
  // first -- same reasoning as the enroll form above.
  function pickService(id) {
    setServiceId(id);
    const svc = services.find((s) => s.ServiceID === id);
    const firstBatch = svc ? batchesOf(svc)[0] : null;
    setBatchId(firstBatch?.BatchID || "");
    setRateId("");
  }

  function pickBatch(id) {
    setBatchId(id);
    setRateId("");
  }

  function cancel() {
    setUserId(enrollment.UserID);
    setServiceId(enrollment.ServiceID);
    setBatchId(enrollment.BatchID || "");
    setRateId(enrollment.RateID || "");
    setStartDate(enrollment.StartDate || "");
    setEndDate(enrollment.EndDate || "");
    setError("");
    setEditing(false);
  }

  async function save() {
    setError("");
    setSaving(true);
    try {
      await onUpdate(enrollment.EnrolmentID, { userId, serviceId, batchId, rateId, startDate, endDate });
      setEditing(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setRemoving(true);
    try {
      await onDelete(enrollment.EnrolmentID);
    } finally {
      setRemoving(false);
    }
  }

  if (editing) {
    return (
      <tr>
        <td>
          <select className="field" value={userId} onChange={(e) => setUserId(e.target.value)}>
            {users.map((u) => (
              <option key={u.UserID} value={u.UserID}>
                {u.Name} ({u.UserType})
              </option>
            ))}
          </select>
        </td>
        <td>
          <select className="field" value={serviceId} onChange={(e) => pickService(e.target.value)}>
            {services.map((s) => (
              <option key={s.ServiceID} value={s.ServiceID}>
                {s.Name}
              </option>
            ))}
          </select>
          {error && <p style={{ color: "var(--bad)" }}>{error}</p>}
        </td>
        <td>
          <select className="field" value={batchId} onChange={(e) => pickBatch(e.target.value)}>
            {availableBatches.map((b) => (
              <option key={b.BatchID} value={b.BatchID}>
                {b.BatchName}{batchScheduleLabel(b) ? ` — ${batchScheduleLabel(b)}` : ""}
              </option>
            ))}
          </select>
        </td>
        <td>
          <select className="field" value={rateId} onChange={(e) => setRateId(e.target.value)} required>
            <option value="">Select a rate…</option>
            {availableRates.map((r) => (
              <option key={r.RateID} value={r.RateID}>
                {r.Currency} {r.Rate}{r.Description ? ` (${r.Description})` : ""}
              </option>
            ))}
          </select>
        </td>
        <td>
          <input className="field" style={{ width: 145 }} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </td>
        <td>
          <input className="field" style={{ width: 145 }} type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </td>
        <td className="space-x-2">
          <button className="btn" disabled={saving} onClick={save}>
            {saving ? "Saving…" : "Save"}
          </button>
          <button className="btn-ghost" disabled={saving} onClick={cancel}>
            Cancel
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td>{nameOf(enrollment.UserID)}</td>
      <td>
        <span className="subject-truncate" title={serviceNameOf(enrollment.ServiceID)}>
          {serviceNameOf(enrollment.ServiceID)}
        </span>
      </td>
      <td>{batchNameOf(enrollment.ServiceID, enrollment.BatchID)}</td>
      <td className="num">{enrollment.Currency ? `${enrollment.Currency} ${rateById(services.find((s) => s.ServiceID === enrollment.ServiceID), enrollment.BatchID, enrollment.RateID)?.Rate ?? ""}` : "—"}</td>
      <td className="num">{enrollment.StartDate ? formatDate(enrollment.StartDate) : "—"}</td>
      <td className="num">{enrollment.EndDate ? formatDate(enrollment.EndDate) : "—"}</td>
      <td className="space-x-2">
        <button className="btn-ghost" onClick={() => setEditing(true)}>
          Edit
        </button>
        <ConfirmButton
          label="Delete"
          confirmText={`Remove ${nameOf(enrollment.UserID)}'s enrollment in ${serviceNameOf(enrollment.ServiceID)}?`}
          confirmLabel="Yes, remove"
          busyLabel="Removing…"
          style={{ color: "var(--bad)" }}
          disabled={removing}
          onConfirm={remove}
        />
      </td>
    </tr>
  );
}

// Visual-refinement pass: the skipped-item list used to be dumped inline
// as one long comma-joined sentence appended to the summary text --
// unreadable past a handful of skipped subjects. The count now shows
// inline; the actual list of who/what was skipped sits behind a "show
// details" toggle, one press deeper, matching the progressive-disclosure
// principle the rest of this pass is built around.
function SummaryMessage({ summary }) {
  const [showDetails, setShowDetails] = useState(false);
  const { text, skippedItems } = summary;
  return (
    <div className="mt-2">
      <p style={{ color: "var(--muted)" }}>{text}</p>
      {skippedItems.length > 0 && (
        <>
          <button type="button" className="btn-ghost" style={{ padding: "0 0.3rem" }} onClick={() => setShowDetails((v) => !v)}>
            {showDetails ? "▾ Hide" : "▸ Show"} skipped items ({skippedItems.length})
          </button>
          {showDetails && (
            <ul className="text-sm mt-1" style={{ color: "var(--muted)" }}>
              {skippedItems.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

/* ---------------- Billing ---------------- */
function Billing() {
  const [invoices, setInvoices] = useState([]);
  const [paychecks, setPaychecks] = useState([]);
  const [users, setUsers] = useState([]);
  const [services, setServices] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [error, setError] = useState("");
  // Visual-refinement pass: summary used to be a single string, with the
  // full skipped-item list dumped inline as one long comma-joined
  // sentence -- unreadable past a handful of items. Now { text,
  // skippedItems }, skippedItems rendered behind a "show details" toggle
  // (SummaryMessage below) instead of always inline.
  const [summary, setSummary] = useState(null);
  const [generating, setGenerating] = useState(false);

  async function load() {
    const [{ invoices }, { paychecks }, { users }, { services }, { enrollments }] = await Promise.all([
      api("/api/invoices"),
      api("/api/paychecks"),
      api("/api/users"),
      api("/api/services"),
      api("/api/enrollments"),
    ]);
    setInvoices(invoices);
    setPaychecks(paychecks);
    setUsers(users);
    setServices(services);
    setEnrollments(enrollments);
  }
  useEffect(() => {
  // eslint-disable-next-line react-hooks/set-state-in-effect -- setState happens after an await inside load(), not synchronously; standard mount-time data-fetch pattern.
    load();
  }, []);

  function nameOf(id) {
    return users.find((u) => u.UserID === id)?.Name || id;
  }
  function roleOf(id) {
    return users.find((u) => u.UserID === id)?.UserType || "";
  }

  async function generate() {
    setError("");
    setSummary(null);
    setGenerating(true);
    try {
      const [{ created: createdInvoices, skipped: skippedInvoices }, { created: createdPaychecks, skipped: skippedPaychecks }] = await Promise.all([
        api("/api/invoices", { method: "POST", body: JSON.stringify({ action: "generate", year: Number(year), month: Number(month) }) }),
        api("/api/paychecks", { method: "POST", body: JSON.stringify({ action: "generate", year: Number(year), month: Number(month) }) }),
      ]);
      let text = `Generated ${createdInvoices?.length || 0} invoice${createdInvoices?.length === 1 ? "" : "s"}, ${createdPaychecks?.length || 0} paycheck${createdPaychecks?.length === 1 ? "" : "s"}.`;
      const skippedItems = [...(skippedInvoices || []), ...(skippedPaychecks || [])].map((s) => `${s.studentId || s.staffId}/${s.serviceId}`);
      const skippedCount = (skippedInvoices?.length || 0) + (skippedPaychecks?.length || 0);
      if (skippedCount) {
        text += ` ⚠ Skipped ${skippedInvoices?.length || 0} invoice(s) and ${skippedPaychecks?.length || 0} paycheck(s) that would have billed $0 (no scheduled hours), check the Batch's schedule or its billing type.`;
      }
      setSummary({ text, skippedItems });
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  }

  async function patchInvoice(id, patch) {
    const res = await api("/api/invoices", { method: "PATCH", body: JSON.stringify({ invoiceId: id, ...patch }) });
    setInvoices((prev) => prev.map((i) => (i.InvoiceID === id ? res.invoice : i)));
  }
  async function patchInvoiceLineItem(id, lineItemIndex, patch) {
    const res = await api("/api/invoices", { method: "PATCH", body: JSON.stringify({ invoiceId: id, lineItemIndex, ...patch }) });
    setInvoices((prev) => prev.map((i) => (i.InvoiceID === id ? res.invoice : i)));
  }
  async function patchPaycheck(id, patch) {
    const res = await api("/api/paychecks", { method: "PATCH", body: JSON.stringify({ paycheckId: id, ...patch }) });
    setPaychecks((prev) => prev.map((p) => (p.PaycheckID === id ? res.paycheck : p)));
  }
  async function patchPaycheckLineItem(id, lineItemIndex, patch) {
    const res = await api("/api/paychecks", { method: "PATCH", body: JSON.stringify({ paycheckId: id, lineItemIndex, ...patch }) });
    setPaychecks((prev) => prev.map((p) => (p.PaycheckID === id ? res.paycheck : p)));
  }
  async function deleteInvoice(id) {
    await api("/api/invoices", { method: "DELETE", body: JSON.stringify({ invoiceId: id }) });
    setInvoices((prev) => prev.filter((i) => i.InvoiceID !== id));
  }
  async function deletePaycheck(id) {
    await api("/api/paychecks", { method: "DELETE", body: JSON.stringify({ paycheckId: id }) });
    setPaychecks((prev) => prev.filter((p) => p.PaycheckID !== id));
  }

  return (
    <div className="space-y-8">
      <div className="card" style={{ borderLeft: "3px solid var(--accent)" }}>
        <h2 className="font-semibold text-xl">Generate Drafts</h2>
        {/* Visual-refinement pass: four adjacent billing-action cards (this
            one, Rebuild Drafts, and the two manual forms below) had no
            guidance on which one applies to which situation -- a new
            Management user has to infer the difference from the button
            label alone. Each now carries its own accent color as a quick
            visual anchor, and the long calculation explainer moved behind
            an on-demand hover-title instead of always sitting on the page. */}
        <p className="text-sm mb-3" style={{ color: "var(--accent)" }}>
          Use for: the normal monthly run.{" "}
          <span
            style={{ color: "var(--muted)", cursor: "help", textDecoration: "underline", textDecorationStyle: "dotted" }}
            title="Amount is auto-calculated: (Service monthly cost ÷ scheduled hours) × attended hours. INR Amount is auto-converted using the exchange rate as of the 1st of the invoice/paycheck's own month, only INR Due is manually adjustable, for tracking partial payments."
          >
            How amounts are calculated
          </span>
        </p>
        <div className="flex gap-3 items-end flex-wrap">
          <div>
            <label className="text-sm block" style={{ color: "var(--muted)" }}>Year</label>
            <input className="field" type="number" value={year} onChange={(e) => setYear(e.target.value)} />
          </div>
          <div>
            <label className="text-sm block" style={{ color: "var(--muted)" }}>Month</label>
            <input className="field" type="number" min="1" max="12" value={month} onChange={(e) => setMonth(e.target.value)} />
          </div>
          <button className="btn" disabled={generating} onClick={generate}>
            {generating ? "Generating…" : "Generate drafts for this month"}
          </button>
        </div>
        {error && <p style={{ color: "var(--bad)" }} className="mt-2">{error}</p>}
        {summary && <SummaryMessage summary={summary} />}
      </div>

      <RebuildDrafts
        users={users}
        onDone={(msg) => {
          setSummary({ text: msg, skippedItems: [] });
          load();
        }}
      />

      <div className="grid gap-6 md:grid-cols-2">
        <ManualInvoiceForm
          people={users.filter((u) => u.UserType === "Student")}
          services={services}
          enrollments={enrollments}
          onSubmitRows={async ({ personId, year, month, rows }) => {
            const res = await api("/api/invoices", {
              method: "POST",
              body: JSON.stringify({ action: "manual", studentId: personId, year, month, lineItems: rows }),
            });
            setInvoices((prev) => [...prev, ...res.invoices]);
          }}
          onDone={() => {}}
        />
        <ManualBillingForm
          title="Create Paycheck"
          hint="Use for: one-off exceptions Generate Drafts won't create."
          personLabel="Staff"
          people={users.filter((u) => ["Teacher", "Staff", "Ambassador"].includes(u.UserType))}
          services={services}
          onSubmit={async ({ personId, serviceId, year, month, amount }) => {
            const res = await api("/api/paychecks", {
              method: "POST",
              body: JSON.stringify({ action: "manual", staffId: personId, serviceId, year, month, amount }),
            });
            setPaychecks((prev) => [...prev, res.paycheck]);
          }}
        />
      </div>

      <div className="card">
        <h2 className="font-semibold text-xl mb-1">Invoices · Students</h2>
        {/* Standalone guidance annotation -- the four action cards above
            already explain themselves ("Use for: ..."), but nothing on the
            page ever spelled out the invoice lifecycle itself or what the
            status filter options actually mean, so a new admin had to
            reverse-engineer it from the badges alone. */}
        <p className="text-sm mb-4" style={{ color: "var(--accent)" }}>
          Lifecycle: <strong>Draft</strong> (not yet sent) → <strong>Sent</strong> (student can see and pay it) →
          student marks it paid, which shows as <strong>needs approval</strong> until you confirm the amount
          received via Approve/Partial below → <strong>settled</strong>. Use the Status filter to jump straight to
          any of these stages instead of expanding every student.
        </p>
        <InvoiceBillingTable
          rows={invoices}
          nameOf={nameOf}
          services={services}
          onPatch={patchInvoice}
          onPatchLineItem={patchInvoiceLineItem}
          onDelete={deleteInvoice}
        />
      </div>

      <div className="card">
        <h2 className="font-semibold text-xl mb-1">Paychecks</h2>
        {/* Same standalone guidance as Invoices above, mirrored for the
            staff side: StaffReceivedFlag is the self-report here instead
            of StudentPaidFlag, otherwise the exact same lifecycle. */}
        <p className="text-sm mb-4" style={{ color: "var(--accent)" }}>
          Lifecycle: <strong>Draft</strong> (not yet sent) → <strong>Sent</strong> (staff can see it) → staff marks
          it received, which shows as <strong>needs approval</strong> until you confirm the amount via
          Approve/Partial below → <strong>settled</strong>. Use the Status filter to jump straight to any of these
          stages instead of expanding every person.
        </p>
        <PaycheckBillingTable
          rows={paychecks}
          nameOf={nameOf}
          roleOf={roleOf}
          services={services}
          onPatch={patchPaycheck}
          onPatchLineItem={patchPaycheckLineItem}
          onDelete={deletePaycheck}
        />
      </div>
    </div>
  );
}

// TKT-0013: manual invoice creation is month-wise, not one-service-at-a-
// time — pick a student + month, get a checklist of every service they're
// currently enrolled in (defaulting to all checked), type an amount per
// checked subject. Submit loops the existing single-service manual POST
// once per checked+amount-filled row (each appends a LineItem to that
// student's combined monthly invoice — see app/api/invoices/route.js),
// same reuse pattern as the bulk-enroll redesign. Amounts are NOT
// auto-computed here — Management types them, same "manual" meaning as
// before, just for several subjects in one action instead of one at a time.
// TKT-0037: all checked subjects submit as ONE request now (lineItems
// array), not one POST per subject — so the duplicate-invoice hard-block
// on the backend (which fires against whatever already existed BEFORE
// this request) can't mistake this form's own second/third checked
// subject for a real duplicate.
// TKT-0110: "Generate Drafts" never re-touches an existing line item once
// created, so a Draft generated early in the month doesn't pick up
// attendance/rate changes that happen later, it just gets silently
// skipped by generate's own dedup check every time it's re-run. This is
// the fix, an explicit person-by-person rebuild: delete the selected
// people's existing DRAFT invoices/paychecks for the chosen month, then
// regenerate them fresh with current data. Never touches a Sent record.
function RebuildDrafts({ users, onDone }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selected, setSelected] = useState(new Set());
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const people = users
    .filter((u) => ["Student", "Teacher", "Staff", "Ambassador"].includes(u.UserType))
    .sort((a, b) => a.Name.localeCompare(b.Name));

  function toggle(userId) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
    setConfirming(false);
  }

  async function rebuild() {
    setBusy(true);
    setError("");
    try {
      const studentIds = people.filter((p) => p.UserType === "Student" && selected.has(p.UserID)).map((p) => p.UserID);
      const staffIds = people.filter((p) => p.UserType !== "Student" && selected.has(p.UserID)).map((p) => p.UserID);
      const [invoiceRes, paycheckRes] = await Promise.all([
        studentIds.length > 0
          ? api("/api/invoices", { method: "POST", body: JSON.stringify({ action: "generate", year: Number(year), month: Number(month), onlyStudentIds: studentIds, rebuild: true }) })
          : null,
        staffIds.length > 0
          ? api("/api/paychecks", { method: "POST", body: JSON.stringify({ action: "generate", year: Number(year), month: Number(month), onlyStaffIds: staffIds, rebuild: true }) })
          : null,
      ]);
      const parts = [];
      if (invoiceRes) parts.push(`${invoiceRes.created?.length || 0} invoice line item(s) rebuilt for ${studentIds.length} student(s)`);
      if (paycheckRes) parts.push(`${paycheckRes.created?.length || 0} paycheck line item(s) rebuilt for ${staffIds.length} staff`);
      onDone(parts.length > 0 ? `Rebuilt: ${parts.join(", ")}.` : "Nothing selected to rebuild.");
      setSelected(new Set());
      setConfirming(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ borderLeft: "3px solid var(--good)" }}>
      <h2 className="font-semibold text-xl">Rebuild Drafts</h2>
      <p className="text-sm mb-3" style={{ color: "var(--accent)" }}>
        Use for: fixing stale drafts after a correction, never touches a Sent record.{" "}
        <span
          style={{ color: "var(--muted)", cursor: "help", textDecoration: "underline", textDecorationStyle: "dotted" }}
          title="Deletes the selected people's existing DRAFT invoices/paychecks for this month and regenerates them fresh with current attendance/rate data. Won't catch anyone new, Generate Drafts already covers them."
        >
          Details
        </span>
      </p>
      <div className="flex gap-3 items-end flex-wrap mb-3">
        <div>
          <label className="text-sm block" style={{ color: "var(--muted)" }}>Year</label>
          <input className="field" type="number" value={year} onChange={(e) => setYear(e.target.value)} />
        </div>
        <div>
          <label className="text-sm block" style={{ color: "var(--muted)" }}>Month</label>
          <input className="field" type="number" min="1" max="12" value={month} onChange={(e) => setMonth(e.target.value)} />
        </div>
      </div>
      <div style={{ maxHeight: 220, overflowY: "auto" }} className="mb-3">
        {people.map((p) => (
          <label key={p.UserID} className="flex items-center gap-2 text-sm" style={{ padding: "0.15rem 0" }}>
            <input type="checkbox" checked={selected.has(p.UserID)} onChange={() => toggle(p.UserID)} />
            {p.Name} <span style={{ color: "var(--muted)" }}>({p.UserType})</span>
          </label>
        ))}
        {people.length === 0 && <p style={{ color: "var(--muted)" }}>No people found.</p>}
      </div>
      {!confirming ? (
        <button className="btn" disabled={selected.size === 0} onClick={() => setConfirming(true)}>
          Rebuild {selected.size > 0 ? `${selected.size} selected` : ""}
        </button>
      ) : (
        <span className="flex items-center gap-2 flex-wrap">
          <span className="text-sm" style={{ color: "var(--bad)" }}>
            This deletes {selected.size} person&apos;s existing draft(s) for {month}/{year} and regenerates them. Confirm?
          </span>
          <button className="btn" disabled={busy} onClick={rebuild}>
            {busy ? "Rebuilding…" : "Yes, rebuild"}
          </button>
          <button className="btn-ghost" disabled={busy} onClick={() => setConfirming(false)}>
            Cancel
          </button>
        </span>
      )}
      {error && <p style={{ color: "var(--bad)" }} className="mt-2">{error}</p>}
    </div>
  );
}

function ManualInvoiceForm({ people, services, enrollments, onSubmitRows, onDone }) {
  const now = new Date();
  const [personId, setPersonId] = useState("");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [amounts, setAmounts] = useState({}); // serviceId -> amount string
  const [checked, setChecked] = useState({}); // serviceId -> boolean
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  const enrolledServices = enrollments
    .filter((e) => e.UserID === personId)
    .map((e) => services.find((s) => s.ServiceID === e.ServiceID))
    .filter(Boolean);

  function selectPerson(id) {
    setPersonId(id);
    setSuccess("");
    // Default: every currently-enrolled subject pre-checked, matching the
    // ticket's "by default all the subject are selected".
    const nextChecked = {};
    enrollments.filter((e) => e.UserID === id).forEach((e) => {
      nextChecked[e.ServiceID] = true;
    });
    setChecked(nextChecked);
    setAmounts({});
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    const rows = enrolledServices.filter((s) => checked[s.ServiceID] && amounts[s.ServiceID]);
    if (rows.length === 0) {
      setError("Check at least one subject and enter an amount for it.");
      return;
    }
    setBusy(true);
    const personName = people.find((p) => p.UserID === personId)?.Name || personId;
    try {
      await onSubmitRows({
        personId,
        year: Number(year),
        month: Number(month),
        rows: rows.map((s) => ({ serviceId: s.ServiceID, amount: Number(amounts[s.ServiceID]) })),
      });
      setPersonId("");
      setChecked({});
      setAmounts({});
      // Seckler et al. 2014 guideline 19: confirm after submit -- this form
      // used to clear silently with no on-screen sign anything happened.
      setSuccess(`Created ${rows.length} draft invoice line item${rows.length === 1 ? "" : "s"} for ${personName}.`);
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ borderLeft: "3px solid var(--warn)" }}>
      <h2 className="font-semibold text-xl">Create Invoice</h2>
      <p className="text-sm mb-3" style={{ color: "var(--accent)" }}>
        Use for: one-off exceptions Generate Drafts won&apos;t create.
      </p>
      <form onSubmit={submit} className="space-y-3">
        <select className="field" value={personId} onChange={(e) => selectPerson(e.target.value)} required>
          <option value="">Select Student…</option>
          {people.map((p) => (
            <option key={p.UserID} value={p.UserID}>
              {p.Name}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <input className="field" type="number" placeholder="Year" value={year} onChange={(e) => setYear(e.target.value)} />
          <input className="field" type="number" min="1" max="12" placeholder="Month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </div>
        {personId && (
          <div className="space-y-2">
            {enrolledServices.length === 0 && <p style={{ color: "var(--muted)" }}>No enrollments for this student.</p>}
            {enrolledServices.map((s) => (
              <label key={s.ServiceID} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!checked[s.ServiceID]}
                  onChange={(e) => setChecked((prev) => ({ ...prev, [s.ServiceID]: e.target.checked }))}
                />
                <span className="text-sm flex-1">{s.Name}</span>
                <input
                  className="field"
                  style={{ width: 110 }}
                  type="number"
                  placeholder="Amount"
                  disabled={!checked[s.ServiceID]}
                  value={amounts[s.ServiceID] || ""}
                  onChange={(e) => setAmounts((prev) => ({ ...prev, [s.ServiceID]: e.target.value }))}
                />
              </label>
            ))}
          </div>
        )}
        {error && <p style={{ color: "var(--bad)" }}>{error}</p>}
        <button className="btn" type="submit" disabled={busy}>
          {busy ? "Creating…" : "Create draft(s)"}
        </button>
        {success && <p style={{ color: "var(--good)" }}>✓ {success}</p>}
      </form>
    </div>
  );
}

function ManualBillingForm({ title, hint, personLabel, people, services, onSubmit }) {
  const now = new Date();
  const [personId, setPersonId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);
    const personName = people.find((p) => p.UserID === personId)?.Name || personId;
    try {
      await onSubmit({ personId, serviceId, year: Number(year), month: Number(month), amount: Number(amount) });
      setPersonId("");
      setServiceId("");
      setAmount("");
      // Seckler et al. 2014 guideline 19: confirm after submit -- this form
      // used to clear silently with no on-screen sign anything happened.
      setSuccess(`Created draft for ${personName}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card" style={{ borderLeft: "3px solid var(--warn)" }}>
      <h2 className="font-semibold text-xl">{title}</h2>
      {hint && (
        <p className="text-sm mb-3" style={{ color: "var(--accent)" }}>
          {hint}
        </p>
      )}
      <form onSubmit={submit} className="space-y-3">
        <select className="field" value={personId} onChange={(e) => setPersonId(e.target.value)} required>
          <option value="">Select {personLabel}…</option>
          {people.map((p) => (
            <option key={p.UserID} value={p.UserID}>
              {p.Name}
            </option>
          ))}
        </select>
        <select className="field" value={serviceId} onChange={(e) => setServiceId(e.target.value)} required>
          <option value="">Select service…</option>
          {services.map((s) => (
            <option key={s.ServiceID} value={s.ServiceID}>
              {s.Name}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <input className="field" type="number" placeholder="Year" value={year} onChange={(e) => setYear(e.target.value)} />
          <input className="field" type="number" min="1" max="12" placeholder="Month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </div>
        <input className="field" type="number" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        {error && <p style={{ color: "var(--bad)" }}>{error}</p>}
        <button className="btn" type="submit" disabled={saving}>
          {saving ? "Creating…" : "Create draft"}
        </button>
        {success && <p style={{ color: "var(--good)" }}>✓ {success}</p>}
      </form>
    </div>
  );
}

// Invoices-only table — a monthly (combined) Invoice carries a
// LineItems[] array, one entry per subject billed that student that
// month; a OneOff (Books/Counselling/Admissions) invoice keeps the old
// flat single-subject shape (see app/api/invoices/route.js). Paychecks
// now mirror this exactly on their own PaycheckBillingTable/PaycheckRow
// below — two separate components (not one shared/branching one) since
// Invoice and Paycheck fields diverge (StudentID vs StaffID,
// StudentPaidFlag vs StaffReceivedFlag, PaymentProofPath only exists on
// invoices) even though the shapes otherwise match.
// TKT-0030: same grouped-by-person treatment as PaycheckBillingTable, minus
// the Type level — every invoice holder is a Student, so Person is already
// the top grouping level. See groupPaychecksByRoleAndPerson's comment for
// why Year/Month don't get their own header rows.
// Springer & Whittaker 2018: full detail (the exact FX rate) doesn't need
// to sit on the page by default, but should be one hover away when
// someone asks "why is INR Amount this number" -- rate is derived from
// the two numbers already on the row (Amount, INRAmount), not fetched.
// Rows already in INR have nothing to convert, so no reveal for those.
function fxRateTitle(row) {
  const currency = row.Currency || "INR";
  const amount = Number(row.Amount);
  if (currency === "INR" || !amount) return null;
  const rate = Number(row.INRAmount) / amount;
  return `1 ${currency} ≈ ${rate.toFixed(4)} INR, rate used for ${row.Month}/${row.Year}`;
}

function groupInvoicesByPerson(rows, nameOf) {
  const byPerson = new Map();
  for (const r of rows) {
    if (!byPerson.has(r.StudentID)) byPerson.set(r.StudentID, []);
    byPerson.get(r.StudentID).push(r);
  }
  for (const list of byPerson.values()) {
    list.sort((a, b) => b.Year * 100 + b.Month - (a.Year * 100 + a.Month));
  }
  // Was hardcoded alphabetical with no way to change it -- the table
  // component now runs this through useSort instead, so the caller
  // controls order (and can reverse it), same as every other table here.
  return [...byPerson.entries()].map(([studentId, rows]) => ({ studentId, name: nameOf(studentId), rows }));
}

// Visual-refinement pass: the collapsed accordion header used to show
// only a count ("N invoices"), zero signal about whether those were
// Draft, Sent-but-unpaid, or awaiting approval -- finding "who hasn't
// paid" meant expanding every single person. paidFlagKey is
// "StudentPaidFlag" for invoices, "StaffReceivedFlag" for paychecks.
function personStatusSummary(personRows, paidFlagKey) {
  const draft = personRows.filter((r) => r.Status === "Draft").length;
  const needsApproval = personRows.filter((r) => r[paidFlagKey] && Number(r.INRDue) > 0).length;
  const unpaid = personRows.filter((r) => r.Status === "Sent" && !r[paidFlagKey]).length;
  return { draft, needsApproval, unpaid };
}

// Gorgilli 2025 names interactive filtering as one of five techniques for
// cutting cognitive load in dashboards -- these two tables could only be
// scanned by expanding every single person, no way to jump straight to
// "who's unpaid" or find one name in a long roster.
function rowMatchesStatusFilter(row, statusFilter, paidFlagKey) {
  const needsApproval = row[paidFlagKey] && Number(row.INRDue) > 0;
  switch (statusFilter) {
    case "draft":
      return row.Status === "Draft";
    case "sent-unpaid":
      return row.Status === "Sent" && !row[paidFlagKey];
    case "needs-approval":
      return needsApproval;
    case "settled":
      return !!row[paidFlagKey] && !needsApproval;
    default:
      return true;
  }
}

const STATUS_FILTER_LABEL = {
  all: "All statuses",
  draft: "Draft",
  "sent-unpaid": "Sent, unpaid",
  "needs-approval": "Needs approval",
  settled: "Settled",
};

// Progressive disclosure (Springer & Whittaker 2018): a search box and a
// status dropdown sitting on the page at all times, even when nobody is
// filtering, is exactly the "full detail upfront" the paper found doesn't
// help -- collapsed behind one small toggle by default, active state still
// visible on the toggle itself so a forgotten filter is never silent.
// statusFilter/onStatusFilter are optional -- omitting them (e.g.
// Enrollments, which has no status concept) hides the status dropdown and
// makes this a plain search-only filter bar, same collapse behavior.
function BillingFilterBar({ search, onSearch, statusFilter, onStatusFilter, searchPlaceholder, statusOptions = STATUS_FILTER_LABEL }) {
  const [open, setOpen] = useState(false);
  const hasStatus = statusFilter !== undefined;
  const active = !!search.trim() || (hasStatus && statusFilter !== "all");

  if (!open && !active) {
    return (
      <button type="button" className="btn-ghost text-sm mb-3" onClick={() => setOpen(true)}>
        ⌕ Filter
      </button>
    );
  }

  return (
    <div className="mb-3">
      <div className="flex gap-2 items-center flex-wrap">
        <input
          className="field"
          style={{ maxWidth: 220 }}
          type="text"
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />
        {hasStatus && (
          <select className="field" style={{ maxWidth: 200 }} value={statusFilter} onChange={(e) => onStatusFilter(e.target.value)}>
            {Object.entries(statusOptions).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        )}
        {active && (
          <button
            type="button"
            className="btn-ghost text-sm"
            onClick={() => {
              onSearch("");
              if (hasStatus) onStatusFilter("all");
              setOpen(false);
            }}
          >
            Clear
          </button>
        )}
        {!active && (
          <button type="button" className="btn-ghost text-sm" onClick={() => setOpen(false)}>
            Hide
          </button>
        )}
      </div>
    </div>
  );
}

function PersonStatusBadges({ personRows, paidFlagKey }) {
  const { draft, needsApproval, unpaid } = personStatusSummary(personRows, paidFlagKey);
  return (
    <span className="ml-2" style={{ fontWeight: "normal" }}>
      {draft > 0 && (
        <span className="badge badge-pending ml-1">
          {draft} draft
        </span>
      )}
      {unpaid > 0 && (
        <span className="badge badge-info ml-1">
          {unpaid} unpaid
        </span>
      )}
      {needsApproval > 0 && (
        <span className="badge badge-bad ml-1">
          {needsApproval} needs approval
        </span>
      )}
    </span>
  );
}

function InvoiceBillingTable({ rows, nameOf, services, onPatch, onPatchLineItem, onDelete }) {
  const [expandedPeople, setExpandedPeople] = useState(new Set());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  function togglePerson(studentId) {
    setExpandedPeople((prev) => {
      const next = new Set(prev);
      next.has(studentId) ? next.delete(studentId) : next.add(studentId);
      return next;
    });
  }

  // Safety net, not a hard rule — a student can legitimately have more
  // than one invoice in the same month (e.g. a Monthly-billed combined
  // invoice alongside a genuinely separate OneOff purchase), so this only
  // WARNS, never blocks. Mainly catches the pre-migrate-monthly window
  // where an old flat-shape invoice and a freshly generated combined one
  // could both exist for the same student/month — flag it, let Management
  // look and decide whether it's a real duplicate to delete. Computed off
  // every invoice, not just the filtered/visible ones, so filtering never
  // hides a real duplicate warning.
  const monthCounts = new Map();
  for (const r of rows) {
    const key = `${r.StudentID}|${r.Year}|${r.Month}`;
    monthCounts.set(key, (monthCounts.get(key) || 0) + 1);
  }
  const duplicateCount = [...monthCounts.values()].filter((n) => n > 1).length;

  const filteredRows = rows.filter((r) => rowMatchesStatusFilter(r, statusFilter, "StudentPaidFlag"));
  const searchLower = search.trim().toLowerCase();
  const peopleUnsorted = groupInvoicesByPerson(filteredRows, nameOf).filter(
    (p) => !searchLower || p.name.toLowerCase().includes(searchLower)
  );
  const peopleSort = useSort(peopleUnsorted, "name");
  const people = peopleSort.sorted;

  return (
    <>
      {duplicateCount > 0 && (
        <p className="mb-2" style={{ color: "var(--warn, #b45309)" }}>
          ⚠ {duplicateCount} student/month{duplicateCount === 1 ? "" : "s"}{" "}
          with more than one invoice. Check the rows flagged below; if it&apos;s
          genuinely a duplicate bill, delete the extra one.
        </p>
      )}
      <BillingFilterBar
        search={search}
        onSearch={setSearch}
        statusFilter={statusFilter}
        onStatusFilter={setStatusFilter}
        searchPlaceholder="Search student…"
      />
      {rows.length > 0 && people.length === 0 && (
        <p style={{ color: "var(--muted)" }}>No invoices match this filter.</p>
      )}
      {rows.length === 0 && <p style={{ color: "var(--muted)" }}>None generated yet.</p>}
      {/* TKT-0134: same maxHeight+overflowY cap as Enrollments/Pipeline. */}
      <div className="scroll-fade overflow-x-auto" style={{ maxHeight: 480, overflowY: "auto" }}>
      <table className="billing-table">
        <thead>
          <tr>
            <SortableTh label="Student" sortKeyName="name" sortKey={peopleSort.sortKey} sortDir={peopleSort.sortDir} onSort={peopleSort.toggleSort} />
            <th>Subjects</th>
            <th>Period</th>
            <th className="num">Amount</th>
            <th className="num">Amount Due</th>
            <th className="num">INR Amount</th>
            <th className="num">INR Due</th>
            <th>Status</th>
            <th>Paid</th>
            <th></th>
          </tr>
        </thead>
        {people.map(({ studentId, name, rows: personRows }) => {
          const expanded = expandedPeople.has(studentId);
          return (
            <tbody key={studentId}>
              <tr>
                <td
                  colSpan={10}
                  className="font-medium cursor-pointer"
                  style={{ background: "var(--panel-2)" }}
                  role="button"
                  tabIndex={0}
                  aria-expanded={expanded}
                  onClick={() => togglePerson(studentId)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      togglePerson(studentId);
                    }
                  }}
                >
                  {expanded ? "▾" : "▸"} {name} — {personRows.length} invoice{personRows.length === 1 ? "" : "s"}
                  <PersonStatusBadges personRows={personRows} paidFlagKey="StudentPaidFlag" />
                </td>
              </tr>
              {expanded &&
                personRows.map((r) => (
                  <InvoiceRow
                    key={r.InvoiceID}
                    row={r}
                    nameOf={nameOf}
                    services={services}
                    onPatch={onPatch}
                    onPatchLineItem={onPatchLineItem}
                    onDelete={onDelete}
                    isDuplicateMonth={monthCounts.get(`${r.StudentID}|${r.Year}|${r.Month}`) > 1}
                  />
                ))}
            </tbody>
          );
        })}
      </table>
      </div>
    </>
  );
}

// Shown on an Invoice/Paycheck row once the student or staff member has
// self-reported it paid or received, but INRDue hasn't caught up yet
// (still shows the full or a stale amount). Approving in full sets the
// due to 0 in one click; Partial lets Management record a smaller
// remaining due instead of the whole amount, for a part payment.
function ApprovePaymentControl({ onApprove }) {
  const [customizing, setCustomizing] = useState(false);
  const [customDue, setCustomDue] = useState("0");
  const [saving, setSaving] = useState(false);

  async function approve(dueValue) {
    setSaving(true);
    try {
      await onApprove(dueValue);
    } finally {
      setSaving(false);
    }
  }

  if (customizing) {
    return (
      <span className="flex items-center gap-1 flex-wrap">
        <input
          className="field"
          style={{ width: 90 }}
          type="number"
          step="0.01"
          value={customDue}
          onChange={(e) => setCustomDue(e.target.value)}
        />
        <button className="btn" disabled={saving} onClick={() => approve(Number(customDue))}>
          {saving ? "Approving…" : "Approve"}
        </button>
        <button className="btn-ghost" disabled={saving} onClick={() => setCustomizing(false)}>
          Cancel
        </button>
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1 flex-wrap">
      <button className="btn" disabled={saving} onClick={() => approve(0)}>
        {saving ? "Approving…" : "Approve (paid in full)"}
      </button>
      <button className="btn-ghost" disabled={saving} onClick={() => setCustomizing(true)}>
        Partial…
      </button>
    </span>
  );
}

function InvoiceRow({ row, nameOf, services, onPatch, onPatchLineItem, onDelete, isDuplicateMonth }) {
  const [expanded, setExpanded] = useState(false);
  const [editingDue, setEditingDue] = useState(false);
  const [inrDue, setInrDue] = useState(row.INRDue);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const isDraft = row.Status === "Draft";
  const isLineItemInvoice = Array.isArray(row.LineItems);
  // Student claimed this paid, but the due amount hasn't been reconciled
  // yet — Management needs to approve it (full or partial) before it's
  // considered settled.
  const needsApproval = row.StudentPaidFlag && Number(row.INRDue) > 0;

  function serviceNameOf(id, batchId) {
    const s = services.find((s) => s.ServiceID === id);
    return s ? lineItemName(s, batchId) : id;
  }

  async function remove() {
    setRemoving(true);
    try {
      await onDelete(row.InvoiceID);
    } finally {
      setRemoving(false);
    }
  }

  async function saveDue() {
    setSaving(true);
    try {
      await onPatch(row.InvoiceID, { inrDue });
      setEditingDue(false);
    } finally {
      setSaving(false);
    }
  }
  function cancelDue() {
    setInrDue(row.INRDue);
    setEditingDue(false);
  }

  async function toggleStatus(status) {
    setSaving(true);
    try {
      await onPatch(row.InvoiceID, { status });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <tr>
        <td>
          <span className="flex items-center gap-1">
            {nameOf(row.StudentID)}
            {isDuplicateMonth && (
              <span
                className="badge badge-pending"
                style={{ cursor: "help" }}
                title="More than one invoice exists for this student in this month. If they bill the same subjects twice, delete the duplicate — otherwise (e.g. a separate OneOff purchase) this is expected."
              >
                ⚠ dup?
              </span>
            )}
          </span>
        </td>
        <td>
          {isLineItemInvoice ? (
            <button className="btn-ghost" style={{ whiteSpace: "nowrap" }} onClick={() => setExpanded((v) => !v)}>
              {expanded ? "▾" : "▸"} {row.LineItems.length} subject{row.LineItems.length === 1 ? "" : "s"}
            </button>
          ) : (
            serviceNameOf(row.ServiceID, row.BatchID)
          )}
        </td>
        <td>
          {row.Month}/{row.Year}
        </td>
        <td className="num">
          {row.Currency || "INR"} {Number(row.Amount).toFixed(2)}
        </td>
        <td className="num">{`${row.Currency || "INR"} ${amountDueInOwnCurrency(row).toFixed(2)}`}</td>
        <td className="num">
          {(() => {
            const title = fxRateTitle(row);
            return title ? (
              <span style={{ textDecoration: "underline", textDecorationStyle: "dotted", cursor: "help" }} title={title}>
                {Number(row.INRAmount).toFixed(2)}
              </span>
            ) : (
              Number(row.INRAmount).toFixed(2)
            );
          })()}
        </td>
        <td className="num">
          {editingDue ? (
            // Visual-refinement pass: Save/Cancel used to render in the far
            // Actions column, three columns away from the input they act
            // on -- moved next to the field itself.
            <span className="flex items-center gap-1 justify-end flex-wrap">
              <input
                className="field"
                style={{ width: 90 }}
                type="number"
                value={inrDue}
                onChange={(e) => setInrDue(e.target.value)}
              />
              <button className="btn" style={{ padding: "0.25rem 0.6rem" }} disabled={saving} onClick={saveDue}>
                {saving ? "…" : "Save"}
              </button>
              <button className="btn-ghost" style={{ padding: "0.25rem 0.6rem" }} disabled={saving} onClick={cancelDue}>
                Cancel
              </button>
            </span>
          ) : (
            Number(row.INRDue).toFixed(2)
          )}
        </td>
        <td>
          <span className={`badge ${row.Status === "Sent" ? "badge-good" : "badge-pending"}`}>{row.Status}</span>
          {/* TKT-0033 */}
          {row.SentAt && (
            <div className="text-xs" style={{ color: "var(--muted)" }}>
              {formatDate(row.SentAt)}
            </div>
          )}
        </td>
        <td>
          <span className="flex items-center gap-2 flex-wrap">
            <span className={`badge ${row.StudentPaidFlag ? "badge-good" : "badge-pending"}`}>
              {row.StudentPaidFlag ? "Paid" : "Unpaid"}
            </span>
            {row.PaymentProofPath && (
              <a className="btn-ghost" style={{ whiteSpace: "nowrap" }} href={`/api/invoices/proof?invoiceId=${row.InvoiceID}`} target="_blank" rel="noreferrer">
                Proof
              </a>
            )}
          </span>
          {row.PaidAt && (
            <div className="text-xs" style={{ color: "var(--muted)" }}>
              {formatDate(row.PaidAt)}
            </div>
          )}
          {needsApproval && (
            <div className="text-xs" style={{ color: "var(--warn)" }}>
              Needs approval
            </div>
          )}
        </td>
        <td>
          <span className="flex items-center gap-1 flex-wrap table-actions">
            {needsApproval ? (
              <ApprovePaymentControl onApprove={(dueValue) => onPatch(row.InvoiceID, { inrDue: dueValue })} />
            ) : editingDue ? null : (
              <>
                <button className="btn-ghost" onClick={() => setEditingDue(true)}>
                  Edit Due
                </button>
                {isDraft ? (
                  <button className="btn" disabled={saving} onClick={() => toggleStatus("Sent")}>
                    {saving ? "Working…" : "Send"}
                  </button>
                ) : (
                  <button className="btn-ghost" disabled={saving} onClick={() => toggleStatus("Draft")}>
                    {saving ? "Working…" : "Unsend"}
                  </button>
                )}
                <a className="btn-ghost" style={{ whiteSpace: "nowrap" }} href={`/api/invoices/pdf?invoiceId=${row.InvoiceID}`} download>
                  PDF
                </a>
                <ConfirmButton
                  label="Delete"
                  confirmText="Delete this invoice? This cannot be undone."
                  style={{ color: "var(--bad)" }}
                  disabled={removing}
                  onConfirm={remove}
                />
              </>
            )}
          </span>
        </td>
      </tr>
      {isLineItemInvoice && expanded && (
        <tr>
          <td colSpan={9} style={{ padding: 0 }}>
            <table style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>Subject</th>
                  <th className="num">Scheduled hrs</th>
                  <th className="num">Attended hrs</th>
                  <th className="num">Amount</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {row.LineItems.map((li, idx) => (
                  <LineItemRow
                    key={idx}
                    invoiceId={row.InvoiceID}
                    lineItem={li}
                    index={idx}
                    serviceName={serviceNameOf(li.ServiceID, li.BatchID)}
                    onPatchLineItem={onPatchLineItem}
                  />
                ))}
              </tbody>
            </table>
          </td>
        </tr>
      )}
    </>
  );
}

function LineItemRow({ invoiceId, lineItem, index, serviceName, onPatchLineItem }) {
  const [editing, setEditing] = useState(false);
  const [scheduledHours, setScheduledHours] = useState(lineItem.ScheduledHours);
  const [attendedHours, setAttendedHours] = useState(lineItem.AttendedHours);
  const [amount, setAmount] = useState(lineItem.Amount);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await onPatchLineItem(invoiceId, index, { scheduledHours, attendedHours, amount });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }
  function cancel() {
    setScheduledHours(lineItem.ScheduledHours);
    setAttendedHours(lineItem.AttendedHours);
    setAmount(lineItem.Amount);
    setEditing(false);
  }

  return (
    <tr>
      <td>
        <span className="flex items-center gap-1">
          {serviceName}
          {lineItem.Note && (
            <span className="badge badge-pending" title={lineItem.Note} style={{ cursor: "help" }}>
              ⚠
            </span>
          )}
        </span>
      </td>
      <td className="num">
        {editing ? (
          <input
            className="field"
            style={{ width: 70 }}
            type="number"
            step="0.5"
            value={scheduledHours ?? ""}
            onChange={(e) => setScheduledHours(e.target.value)}
          />
        ) : (
          lineItem.ScheduledHours ?? "—"
        )}
      </td>
      <td className="num">
        {editing ? (
          <input
            className="field"
            style={{ width: 70 }}
            type="number"
            step="0.5"
            value={attendedHours ?? ""}
            onChange={(e) => setAttendedHours(e.target.value)}
          />
        ) : (
          lineItem.AttendedHours ?? "—"
        )}
      </td>
      <td className="num">
        {editing ? (
          // Visual-refinement pass: the currency label used to disappear
          // the moment editing started, the one piece of context (what
          // currency this number even is) missing exactly when it's most
          // needed.
          <span className="flex items-center gap-1 justify-end">
            <span style={{ color: "var(--muted)" }}>{lineItem.Currency || "INR"}</span>
            <input className="field" style={{ width: 90 }} type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </span>
        ) : (
          `${lineItem.Currency || "INR"} ${lineItem.Amount}`
        )}
      </td>
      <td>
        {editing ? (
          <span className="flex gap-1">
            <button className="btn" disabled={saving} onClick={save}>
              {saving ? "Saving…" : "Save"}
            </button>
            <button className="btn-ghost" disabled={saving} onClick={cancel}>
              Cancel
            </button>
          </span>
        ) : (
          <button className="btn-ghost" onClick={() => setEditing(true)}>
            Edit
          </button>
        )}
      </td>
    </tr>
  );
}

// Mirrors InvoiceBillingTable above exactly — see its comment for the
// duplicate-month safety-net rationale.
// TKT-0030: was one flat table sortable by column — Teacher/Staff/Ambassador
// paychecks all mixed together under a single "(Staff)" heading, which read
// as if Teachers weren't showing at all when in fact they were just
// unlabeled among everyone else. Grouped Type -> Person instead; a period
// (Year/Month) is already one atomic field per paycheck record, so within a
// person that's just the existing Period column under period-desc sort —
// an extra Year and Month header level each would only repeat what that
// column already shows, at the cost of exactly the "too much on screen"
// complaint already on file (TKT-0020/0042). Each person's row group
// collapses by default (same ▸/▾ convention PaycheckRow already uses for
// its own LineItems) to keep the page compact until Management actually
// wants to look at someone.
const STAFF_ROLE_ORDER = ["Teacher", "Staff", "Ambassador"];
const STAFF_ROLE_LABEL = { Teacher: "Teachers", Staff: "Staff", Ambassador: "Ambassadors" };

function groupPaychecksByRoleAndPerson(rows, nameOf, roleOf) {
  const byRole = new Map(STAFF_ROLE_ORDER.map((role) => [role, new Map()]));
  for (const r of rows) {
    const role = STAFF_ROLE_ORDER.includes(roleOf(r.StaffID)) ? roleOf(r.StaffID) : "Staff";
    const people = byRole.get(role);
    if (!people.has(r.StaffID)) people.set(r.StaffID, []);
    people.get(r.StaffID).push(r);
  }
  for (const people of byRole.values()) {
    for (const list of people.values()) {
      list.sort((a, b) => b.Year * 100 + b.Month - (a.Year * 100 + a.Month));
    }
  }
  // Role order (Teacher/Staff/Ambassador) is a deliberate fixed category
  // order, not something to sort -- but within each role, people were
  // hardcoded alphabetical with no way to change it. Left unsorted here;
  // the table component runs the flattened people list through useSort
  // and regroups by role afterward, same reasoning as invoices above.
  return STAFF_ROLE_ORDER.map((role) => ({
    role,
    people: [...byRole.get(role).entries()].map(([staffId, rows]) => ({ staffId, name: nameOf(staffId), rows })),
  })).filter((g) => g.people.length > 0);
}

function PaycheckBillingTable({ rows, nameOf, roleOf, services, onPatch, onPatchLineItem, onDelete }) {
  const [expandedPeople, setExpandedPeople] = useState(new Set());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  function togglePerson(staffId) {
    setExpandedPeople((prev) => {
      const next = new Set(prev);
      next.has(staffId) ? next.delete(staffId) : next.add(staffId);
      return next;
    });
  }

  const monthCounts = new Map();
  for (const r of rows) {
    const key = `${r.StaffID}|${r.Year}|${r.Month}`;
    monthCounts.set(key, (monthCounts.get(key) || 0) + 1);
  }
  const duplicateCount = [...monthCounts.values()].filter((n) => n > 1).length;

  const filteredRows = rows.filter((r) => rowMatchesStatusFilter(r, statusFilter, "StaffReceivedFlag"));
  const searchLower = search.trim().toLowerCase();
  const roleGroupsUnsorted = groupPaychecksByRoleAndPerson(filteredRows, nameOf, roleOf)
    .map((g) => ({ ...g, people: g.people.filter((p) => !searchLower || p.name.toLowerCase().includes(searchLower)) }))
    .filter((g) => g.people.length > 0);
  // Role order (Teacher/Staff/Ambassador) stays fixed -- only the person
  // order within each role is user-sortable. Flatten across roles so one
  // useSort/toggle governs all of them, then regroup by role afterward;
  // filtering a sorted array by role is stable, so each role's internal
  // order comes out following the sort.
  const peopleFlat = roleGroupsUnsorted.flatMap((g) => g.people.map((p) => ({ ...p, _role: g.role })));
  const peopleSort = useSort(peopleFlat, "name");
  const groups = STAFF_ROLE_ORDER.map((role) => ({ role, people: peopleSort.sorted.filter((p) => p._role === role) })).filter(
    (g) => g.people.length > 0
  );

  return (
    <>
      {duplicateCount > 0 && (
        <p className="mb-2" style={{ color: "var(--warn, #b45309)" }}>
          ⚠ {duplicateCount} staff/month{duplicateCount === 1 ? "" : "s"}{" "}
          with more than one paycheck. Check the rows flagged below; if it&apos;s
          genuinely a duplicate, delete the extra one.
        </p>
      )}
      <BillingFilterBar
        search={search}
        onSearch={setSearch}
        statusFilter={statusFilter}
        onStatusFilter={setStatusFilter}
        searchPlaceholder="Search staff…"
      />
      {rows.length > 0 && groups.length === 0 && (
        <p style={{ color: "var(--muted)" }}>No paychecks match this filter.</p>
      )}
      {rows.length === 0 && <p style={{ color: "var(--muted)" }}>None generated yet.</p>}
      {groups.map(({ role, people }) => (
        <div key={role} className="mb-4">
          <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--muted)" }}>
            {STAFF_ROLE_LABEL[role]}
          </h3>
          {/* TKT-0134: same maxHeight+overflowY cap as Enrollments/Pipeline. */}
          <div className="scroll-fade overflow-x-auto" style={{ maxHeight: 480, overflowY: "auto" }}>
          <table className="billing-table">
            <thead>
              <tr>
                <SortableTh label="Person" sortKeyName="name" sortKey={peopleSort.sortKey} sortDir={peopleSort.sortDir} onSort={peopleSort.toggleSort} />
                <th>Subjects</th>
                <th>Period</th>
                <th className="num">Amount</th>
                <th className="num">Amount Due</th>
                <th className="num">INR Amount</th>
                <th className="num">INR Due</th>
                <th>Status</th>
                <th>Received</th>
                <th></th>
              </tr>
            </thead>
            {people.map(({ staffId, name, rows: personRows }) => {
              const expanded = expandedPeople.has(staffId);
              return (
                <tbody key={staffId}>
                  <tr>
                    <td
                      colSpan={10}
                      className="font-medium cursor-pointer"
                      style={{ background: "var(--panel-2)" }}
                      role="button"
                      tabIndex={0}
                      aria-expanded={expanded}
                      onClick={() => togglePerson(staffId)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          togglePerson(staffId);
                        }
                      }}
                    >
                      {expanded ? "▾" : "▸"} {name} — {personRows.length} paycheck{personRows.length === 1 ? "" : "s"}
                      <PersonStatusBadges personRows={personRows} paidFlagKey="StaffReceivedFlag" />
                    </td>
                  </tr>
                  {expanded &&
                    personRows.map((r) => (
                      <PaycheckRow
                        key={r.PaycheckID}
                        row={r}
                        nameOf={nameOf}
                        services={services}
                        onPatch={onPatch}
                        onPatchLineItem={onPatchLineItem}
                        onDelete={onDelete}
                        isDuplicateMonth={monthCounts.get(`${r.StaffID}|${r.Year}|${r.Month}`) > 1}
                      />
                    ))}
                </tbody>
              );
            })}
          </table>
          </div>
        </div>
      ))}
    </>
  );
}

function PaycheckRow({ row, nameOf, services, onPatch, onPatchLineItem, onDelete, isDuplicateMonth }) {
  const [expanded, setExpanded] = useState(false);
  const [editingDue, setEditingDue] = useState(false);
  const [inrDue, setInrDue] = useState(row.INRDue);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const isDraft = row.Status === "Draft";
  const isLineItemPaycheck = Array.isArray(row.LineItems);
  // Staff claimed this received, but the due amount hasn't been
  // reconciled yet — Management needs to approve it (full or partial)
  // before it's considered settled.
  const needsApproval = row.StaffReceivedFlag && Number(row.INRDue) > 0;

  function serviceNameOf(id, batchId) {
    const s = services.find((s) => s.ServiceID === id);
    return s ? lineItemName(s, batchId) : id;
  }

  async function remove() {
    setRemoving(true);
    try {
      await onDelete(row.PaycheckID);
    } finally {
      setRemoving(false);
    }
  }

  async function saveDue() {
    setSaving(true);
    try {
      await onPatch(row.PaycheckID, { inrDue });
      setEditingDue(false);
    } finally {
      setSaving(false);
    }
  }
  function cancelDue() {
    setInrDue(row.INRDue);
    setEditingDue(false);
  }

  async function toggleStatus(status) {
    setSaving(true);
    try {
      await onPatch(row.PaycheckID, { status });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <tr>
        <td>
          <span className="flex items-center gap-1">
            {nameOf(row.StaffID)}
            {isDuplicateMonth && (
              <span
                className="badge badge-pending"
                style={{ cursor: "help" }}
                title="More than one paycheck exists for this staff member in this month. If they cover the same subjects twice, delete the duplicate — otherwise (e.g. a separate OneOff payment) this is expected."
              >
                ⚠ dup?
              </span>
            )}
          </span>
        </td>
        <td>
          {isLineItemPaycheck ? (
            <button className="btn-ghost" style={{ whiteSpace: "nowrap" }} onClick={() => setExpanded((v) => !v)}>
              {expanded ? "▾" : "▸"} {row.LineItems.length} subject{row.LineItems.length === 1 ? "" : "s"}
            </button>
          ) : (
            serviceNameOf(row.ServiceID, row.BatchID)
          )}
        </td>
        <td>
          {row.Month}/{row.Year}
        </td>
        <td className="num">
          {row.Currency || "INR"} {Number(row.Amount).toFixed(2)}
        </td>
        <td className="num">{`${row.Currency || "INR"} ${amountDueInOwnCurrency(row).toFixed(2)}`}</td>
        <td className="num">
          {(() => {
            const title = fxRateTitle(row);
            return title ? (
              <span style={{ textDecoration: "underline", textDecorationStyle: "dotted", cursor: "help" }} title={title}>
                {Number(row.INRAmount).toFixed(2)}
              </span>
            ) : (
              Number(row.INRAmount).toFixed(2)
            );
          })()}
        </td>
        <td className="num">
          {editingDue ? (
            // Visual-refinement pass: Save/Cancel used to render in the far
            // Actions column, three columns away from the input they act
            // on -- moved next to the field itself.
            <span className="flex items-center gap-1 justify-end flex-wrap">
              <input
                className="field"
                style={{ width: 90 }}
                type="number"
                value={inrDue}
                onChange={(e) => setInrDue(e.target.value)}
              />
              <button className="btn" style={{ padding: "0.25rem 0.6rem" }} disabled={saving} onClick={saveDue}>
                {saving ? "…" : "Save"}
              </button>
              <button className="btn-ghost" style={{ padding: "0.25rem 0.6rem" }} disabled={saving} onClick={cancelDue}>
                Cancel
              </button>
            </span>
          ) : (
            Number(row.INRDue).toFixed(2)
          )}
        </td>
        <td>
          <span className={`badge ${row.Status === "Sent" ? "badge-good" : "badge-pending"}`}>{row.Status}</span>
          {/* TKT-0033 */}
          {row.SentAt && (
            <div className="text-xs" style={{ color: "var(--muted)" }}>
              {formatDate(row.SentAt)}
            </div>
          )}
        </td>
        <td>
          <span className={`badge ${row.StaffReceivedFlag ? "badge-good" : "badge-pending"}`}>
            {row.StaffReceivedFlag ? "Received" : "Not received"}
          </span>
          {row.ReceivedAt && (
            <div className="text-xs" style={{ color: "var(--muted)" }}>
              {formatDate(row.ReceivedAt)}
            </div>
          )}
          {needsApproval && (
            <div className="text-xs" style={{ color: "var(--warn)" }}>
              Needs approval
            </div>
          )}
        </td>
        <td>
          <span className="flex items-center gap-1 flex-wrap table-actions">
            {needsApproval ? (
              <ApprovePaymentControl onApprove={(dueValue) => onPatch(row.PaycheckID, { inrDue: dueValue })} />
            ) : editingDue ? null : (
              <>
                <button className="btn-ghost" onClick={() => setEditingDue(true)}>
                  Edit Due
                </button>
                {isDraft ? (
                  <button className="btn" disabled={saving} onClick={() => toggleStatus("Sent")}>
                    {saving ? "Working…" : "Send"}
                  </button>
                ) : (
                  <button className="btn-ghost" disabled={saving} onClick={() => toggleStatus("Draft")}>
                    {saving ? "Working…" : "Unsend"}
                  </button>
                )}
                <a className="btn-ghost" style={{ whiteSpace: "nowrap" }} href={`/api/paychecks/pdf?paycheckId=${row.PaycheckID}`} download>
                  PDF
                </a>
                <ConfirmButton
                  label="Delete"
                  confirmText="Delete this paycheck? This cannot be undone."
                  style={{ color: "var(--bad)" }}
                  disabled={removing}
                  onConfirm={remove}
                />
              </>
            )}
          </span>
        </td>
      </tr>
      {isLineItemPaycheck && expanded && (
        <tr>
          <td colSpan={9} style={{ padding: 0 }}>
            <table style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>Subject</th>
                  <th className="num">Scheduled hrs</th>
                  <th className="num">Attended hrs</th>
                  <th className="num">Amount</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {row.LineItems.map((li, idx) => (
                  <PaycheckLineItemRow
                    key={idx}
                    paycheckId={row.PaycheckID}
                    lineItem={li}
                    index={idx}
                    serviceName={serviceNameOf(li.ServiceID, li.BatchID)}
                    onPatchLineItem={onPatchLineItem}
                  />
                ))}
              </tbody>
            </table>
          </td>
        </tr>
      )}
    </>
  );
}

function PaycheckLineItemRow({ paycheckId, lineItem, index, serviceName, onPatchLineItem }) {
  const [editing, setEditing] = useState(false);
  const [scheduledHours, setScheduledHours] = useState(lineItem.ScheduledHours);
  const [attendedHours, setAttendedHours] = useState(lineItem.AttendedHours);
  const [amount, setAmount] = useState(lineItem.Amount);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await onPatchLineItem(paycheckId, index, { scheduledHours, attendedHours, amount });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }
  function cancel() {
    setScheduledHours(lineItem.ScheduledHours);
    setAttendedHours(lineItem.AttendedHours);
    setAmount(lineItem.Amount);
    setEditing(false);
  }

  return (
    <tr>
      <td>
        <span className="flex items-center gap-1">
          {serviceName}
          {lineItem.Note && (
            <span className="badge badge-pending" title={lineItem.Note} style={{ cursor: "help" }}>
              ⚠
            </span>
          )}
        </span>
      </td>
      <td className="num">
        {editing ? (
          <input
            className="field"
            style={{ width: 70 }}
            type="number"
            step="0.5"
            value={scheduledHours ?? ""}
            onChange={(e) => setScheduledHours(e.target.value)}
          />
        ) : (
          lineItem.ScheduledHours ?? "—"
        )}
      </td>
      <td className="num">
        {editing ? (
          <input
            className="field"
            style={{ width: 70 }}
            type="number"
            step="0.5"
            value={attendedHours ?? ""}
            onChange={(e) => setAttendedHours(e.target.value)}
          />
        ) : (
          lineItem.AttendedHours ?? "—"
        )}
      </td>
      <td className="num">
        {editing ? (
          // Visual-refinement pass: the currency label used to disappear
          // the moment editing started, the one piece of context (what
          // currency this number even is) missing exactly when it's most
          // needed.
          <span className="flex items-center gap-1 justify-end">
            <span style={{ color: "var(--muted)" }}>{lineItem.Currency || "INR"}</span>
            <input className="field" style={{ width: 90 }} type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </span>
        ) : (
          `${lineItem.Currency || "INR"} ${lineItem.Amount}`
        )}
      </td>
      <td>
        {editing ? (
          <span className="flex gap-1">
            <button className="btn" disabled={saving} onClick={save}>
              {saving ? "Saving…" : "Save"}
            </button>
            <button className="btn-ghost" disabled={saving} onClick={cancel}>
              Cancel
            </button>
          </span>
        ) : (
          <button className="btn-ghost" onClick={() => setEditing(true)}>
            Edit
          </button>
        )}
      </td>
    </tr>
  );
}

// Generic issue-reporting tickets — any account type can raise one (see
// components/DashboardShell.jsx's ReportIssueButton), only Management can
// close it (app/api/tickets/route.js). Simple full-list view since ticket
// volume is expected to be low, unlike the auditlog/applogs tables.
function Tickets() {
  const [tickets, setTickets] = useState([]);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [showClosed, setShowClosed] = useState(false);
  const [search, setSearch] = useState("");

  async function load() {
    setError("");
    try {
      const [{ tickets }, { users }] = await Promise.all([api("/api/tickets"), api("/api/users")]);
      setTickets(tickets);
      setUsers(users);
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
  // eslint-disable-next-line react-hooks/set-state-in-effect -- setState happens after an await inside load(), not synchronously; standard mount-time data-fetch pattern.
    load();
  }, []);

  function nameOf(id) {
    const u = users.find((u) => u.UserID === id);
    return u ? `${u.Name} (${u.UserType})` : id;
  }

  async function setTicketState(ticketId, action, closeMessage) {
    try {
      const { ticket } = await api("/api/tickets", { method: "PATCH", body: JSON.stringify({ ticketId, action, closeMessage }) });
      setTickets((prev) => prev.map((t) => (t.TicketID === ticket.TicketID ? ticket : t)));
    } catch (e) {
      setError(e.message);
    }
  }

  async function editTicket(ticketId, message) {
    try {
      const { ticket } = await api("/api/tickets", { method: "PATCH", body: JSON.stringify({ ticketId, action: "edit", message }) });
      setTickets((prev) => prev.map((t) => (t.TicketID === ticket.TicketID ? ticket : t)));
    } catch (e) {
      setError(e.message);
      throw e; // let TicketRow know the save failed, so it keeps the editor open
    }
  }

  const searchLower = search.trim().toLowerCase();
  const visible = tickets
    .filter((t) => showClosed || !t.ClosedAt)
    .filter((t) => !searchLower || nameOf(t.SenderUserID).toLowerCase().includes(searchLower) || t.Message.toLowerCase().includes(searchLower))
    .sort((a, b) => new Date(b.CreatedAt) - new Date(a.CreatedAt));
  const openCount = tickets.filter((t) => !t.ClosedAt).length;

  return (
    <div className="card space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h2 className="font-semibold">Tickets {openCount > 0 && <span className="badge badge-pending">{openCount} open</span>}</h2>
        <label className="text-sm flex items-center gap-2" style={{ color: "var(--muted)" }}>
          <input type="checkbox" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} />
          Show closed
        </label>
      </div>
      {error && <p style={{ color: "var(--bad)" }}>{error}</p>}
      <BillingFilterBar search={search} onSearch={setSearch} searchPlaceholder="Search sender or message…" />
      {/* TKT-0134: same maxHeight+overflowY cap as Enrollments/Pipeline —
          unlike Audit Log below, Tickets has no server-side pagination and
          genuinely grows unbounded. */}
      <div className="scroll-fade overflow-x-auto" style={{ maxHeight: 480, overflowY: "auto" }}>
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left">Ticket #</th>
              <th className="text-left">Sender</th>
              <th className="text-left">Message</th>
              <th className="text-left">Attachment</th>
              <th className="text-left">Created</th>
              <th className="text-left">Closed</th>
              <th className="text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((t) => (
              <TicketRow key={t.TicketID} ticket={t} nameOf={nameOf} onSetState={setTicketState} onEdit={editTicket} />
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={7} style={{ color: "var(--muted)" }}>No {showClosed ? "" : "open "}tickets.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TicketRow({ ticket: t, nameOf, onSetState, onEdit }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(t.Message);
  const [saving, setSaving] = useState(false);
  const [rowError, setRowError] = useState("");

  // Closing prompts for an optional resolution note (e.g. "fixed in
  // TKT-0022, see commit 1d48d0f") — same inline-form convention as
  // editing, not window.prompt, to match how every other free-text input
  // in this file works. Available whether the ticket is currently open
  // (setting it as part of the close) or already closed (adding/updating
  // the note afterward, without needing to reopen first).
  const [closing, setClosing] = useState(false);
  const [closeDraft, setCloseDraft] = useState(t.CloseMessage || "");
  const [closeSaving, setCloseSaving] = useState(false);
  const [reopening, setReopening] = useState(false);

  async function reopen() {
    setReopening(true);
    try {
      await onSetState(t.TicketID, "reopen");
    } finally {
      setReopening(false);
    }
  }

  function startEdit() {
    setDraft(t.Message);
    setRowError("");
    setEditing(true);
  }

  async function save() {
    if (!draft.trim()) {
      setRowError("Message can't be empty.");
      return;
    }
    setSaving(true);
    setRowError("");
    try {
      await onEdit(t.TicketID, draft);
      setEditing(false);
    } catch (e) {
      setRowError(e.message);
    } finally {
      setSaving(false);
    }
  }

  function startClose() {
    setCloseDraft(t.CloseMessage || "");
    setClosing(true);
  }

  async function confirmClose() {
    setCloseSaving(true);
    try {
      await onSetState(t.TicketID, "close", closeDraft);
      setClosing(false);
    } finally {
      setCloseSaving(false);
    }
  }

  return (
    <tr>
      <td style={{ whiteSpace: "nowrap" }}>{t.TicketID}</td>
      <td>{nameOf(t.SenderUserID)}</td>
      <td style={{ maxWidth: 320 }}>
        {editing ? (
          <div className="space-y-1">
            <textarea
              className="field"
              style={{ width: "100%", minHeight: 60 }}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            {rowError && <p className="text-sm" style={{ color: "var(--bad)" }}>{rowError}</p>}
            <div className="flex gap-2">
              <button className="btn" type="button" disabled={saving} onClick={save}>
                {saving ? "Saving…" : "Save"}
              </button>
              <button className="btn-ghost" type="button" onClick={() => setEditing(false)}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <span style={{ whiteSpace: "pre-wrap" }}>{t.Message}</span>
        )}
      </td>
      <td>
        {t.AttachmentURL ? (
          <a href={t.AttachmentURL} target="_blank" rel="noreferrer">Link</a>
        ) : (
          "—"
        )}
      </td>
      <td>{formatDateTime(t.CreatedAt)}</td>
      <td>
        {t.ClosedAt ? (
          <>
            {formatDateTime(t.ClosedAt)}
            {t.CloseMessage && (
              <div className="text-sm" style={{ color: "var(--muted)", whiteSpace: "pre-wrap" }}>
                {t.CloseMessage}
              </div>
            )}
          </>
        ) : (
          "—"
        )}
      </td>
      <td className="space-x-2">
        {closing ? (
          <div className="space-y-1" style={{ minWidth: 200 }}>
            <textarea
              className="field"
              style={{ width: "100%", minHeight: 50 }}
              placeholder="Resolution note (optional)…"
              value={closeDraft}
              onChange={(e) => setCloseDraft(e.target.value)}
            />
            <div className="flex gap-2">
              <button className="btn" type="button" disabled={closeSaving} onClick={confirmClose}>
                {closeSaving ? "Saving…" : t.ClosedAt ? "Save note" : "Confirm Close"}
              </button>
              <button className="btn-ghost" type="button" onClick={() => setClosing(false)}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            {!editing && (
              <button className="btn-ghost" onClick={startEdit}>Edit</button>
            )}
            {!t.ClosedAt ? (
              <button className="btn-ghost" onClick={startClose}>Close</button>
            ) : (
              <>
                <button className="btn-ghost" onClick={startClose}>{t.CloseMessage ? "Edit note" : "Add note"}</button>
                <button className="btn-ghost" disabled={reopening} onClick={reopen}>{reopening ? "Reopening…" : "Reopen"}</button>
              </>
            )}
          </>
        )}
      </td>
    </tr>
  );
}

// Read-only, paginated view over the auditlog table (see lib/logging.js /
// app/api/auditlog/route.js) — records every Management mutation across
// Services/Users/Invoices/Paychecks/Enrollments/reschedule approvals/API
// keys. Insert-only on the backend (no edit/delete route exists for this
// data), so what's shown here is the full, trustworthy history.
const ENTITY_TYPES = ["Service", "User", "Invoice", "Paycheck", "Enrollment", "RescheduleRequest", "ApiKey"];
function AuditLog() {
  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [entityType, setEntityType] = useState("");
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const limit = 50;

  async function load() {
    setError("");
    try {
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
      if (entityType) params.set("entityType", entityType);
      const [{ entries, total }, { users }] = await Promise.all([
        api(`/api/auditlog?${params}`),
        api("/api/users"),
      ]);
      setEntries(entries);
      setTotal(total);
      setUsers(users);
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
  // eslint-disable-next-line react-hooks/set-state-in-effect -- setState happens after an await inside load(), not synchronously; standard mount-time data-fetch pattern.
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset, entityType]);

  function nameOf(id) {
    return users.find((u) => u.UserID === id)?.Name || id || "—";
  }

  return (
    <div className="card space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h2 className="font-semibold">Audit Log</h2>
        <div className="flex gap-2 items-center">
          <select
            className="field"
            value={entityType}
            onChange={(e) => {
              setEntityType(e.target.value);
              setOffset(0);
            }}
          >
            <option value="">All entity types</option>
            {ENTITY_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>
      {error && <p style={{ color: "var(--bad)" }}>{error}</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left">When</th>
              <th className="text-left">Actor</th>
              <th className="text-left">Action</th>
              <th className="text-left">Entity</th>
              <th className="text-left">Summary</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.AuditID}>
                <td>{formatDateTime(e.Timestamp)}</td>
                <td>{nameOf(e.ActorUserID)}</td>
                <td>{e.Action}</td>
                <td>{e.EntityType}{e.EntityID ? ` · ${e.EntityID}` : ""}</td>
                <td>{e.Summary}</td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={5} style={{ color: "var(--muted)" }}>No entries.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-sm" style={{ color: "var(--muted)" }}>
          {total === 0 ? "0" : `${offset + 1}–${Math.min(offset + limit, total)}`} of {total}
        </span>
        <div className="flex gap-2">
          <button className="btn-ghost" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))}>
            Previous
          </button>
          <button className="btn-ghost" disabled={offset + limit >= total} onClick={() => setOffset(offset + limit)}>
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

// TKT-0160: a global on/off switch per Student-portal Resources feature
// (components/ResourcesSection.jsx reads these via GET /api/resource-
// toggles) — Recordings defaults off pending a real recordings digitizer,
// everything else defaults on. Lives on the Guides tab since it's the same
// kind of thing: admin-managed, gates what content a portal shows.
const RESOURCE_TOGGLE_LABELS = {
  recordings: "Recordings",
  syllabus: "Syllabus",
  worksheets: "Worksheets",
  gcr: "Google Classroom",
  timesheet: "Timesheet",
  progressTracker: "Progress Tracker",
};

function ResourceToggles() {
  const [toggles, setToggles] = useState(null);
  const [error, setError] = useState("");
  const [busyKey, setBusyKey] = useState(null);

  useEffect(() => {
  // eslint-disable-next-line react-hooks/set-state-in-effect -- setState happens after an await inside load(), not synchronously; standard mount-time data-fetch pattern.
    api("/api/resource-toggles").then((res) => setToggles(res.toggles));
  }, []);

  async function flip(key, value) {
    setError("");
    setBusyKey(key);
    try {
      const { toggles } = await api("/api/resource-toggles", { method: "PATCH", body: JSON.stringify({ [key]: value }) });
      setToggles(toggles);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="card">
      <h2 className="font-semibold mb-1">Student Resources Tools</h2>
      <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
        Turn any Resources button on/off for every student at once, without a code change.
      </p>
      {error && <p style={{ color: "var(--bad)" }}>{error}</p>}
      {!toggles ? (
        <p style={{ color: "var(--muted)" }}>Loading…</p>
      ) : (
        <div className="flex gap-2 flex-wrap">
          {Object.entries(RESOURCE_TOGGLE_LABELS).map(([key, label]) => (
            <label
              key={key}
              className="flex items-center gap-2 px-3 py-2 rounded border cursor-pointer"
              style={{ borderColor: "var(--border)", opacity: busyKey === key ? 0.6 : 1 }}
            >
              <input
                type="checkbox"
                checked={!!toggles[key]}
                disabled={busyKey === key}
                onChange={(e) => flip(key, e.target.checked)}
              />
              {label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// Static named-link buttons shown on portal dashboards (see
// components/GuidesSection.jsx) — Management points each one at any URL
// and ticks which portal(s) it should appear on. GUIDE_AUDIENCES (see
// lib/accountTypes.js) groups the raw UserType values one checkbox per
// dashboard — "Interview" covers all three interview account types at once
// since they share a single dashboard.
function Guides() {
  const [guides, setGuides] = useState([]);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  async function load() {
    const { guides } = await api("/api/guides");
    setGuides(guides);
  }
  useEffect(() => {
  // eslint-disable-next-line react-hooks/set-state-in-effect -- setState happens after an await inside load(), not synchronously; standard mount-time data-fetch pattern.
    load();
  }, []);

  async function create(name, url, userTypes) {
    setError("");
    try {
      const { guide } = await api("/api/guides", { method: "POST", body: JSON.stringify({ name, url, userTypes }) });
      setGuides((prev) => [...prev, guide]);
    } catch (e) {
      setError(e.message);
    }
  }

  async function update(guideId, patch) {
    setError("");
    try {
      const { guide } = await api("/api/guides", { method: "PATCH", body: JSON.stringify({ guideId, ...patch }) });
      setGuides((prev) => prev.map((g) => (g.GuideID === guide.GuideID ? guide : g)));
    } catch (e) {
      setError(e.message);
    }
  }

  async function remove(guideId) {
    setError("");
    try {
      await api("/api/guides", { method: "DELETE", body: JSON.stringify({ guideId }) });
      setGuides((prev) => prev.filter((g) => g.GuideID !== guideId));
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="space-y-6">
      {error && <p style={{ color: "var(--bad)" }}>{error}</p>}

      <ResourceToggles />

      <div className="card">
        <h2 className="font-semibold mb-4">Add a Guide</h2>
        <GuideForm onSubmit={create} />
      </div>

      <div className="card">
        <h2 className="font-semibold mb-4">Existing Guides</h2>
        {guides.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>No guides yet — add one above.</p>
        ) : (
          <>
            {/* Not a <table> -- guides render as expandable cards (name,
                audience, per-role links), so there's no column to sort by.
                Search still helps once the list grows past a screenful. */}
            <BillingFilterBar search={search} onSearch={setSearch} searchPlaceholder="Search guide name…" />
            {(() => {
              const filtered = guides.filter((g) => !search.trim() || g.Name.toLowerCase().includes(search.trim().toLowerCase()));
              return (
                <div className="space-y-4">
                  {filtered.map((g) => (
                    <GuideRow key={g.GuideID} guide={g} onUpdate={update} onDelete={remove} />
                  ))}
                  {filtered.length === 0 && <p style={{ color: "var(--muted)" }}>No matches.</p>}
                </div>
              );
            })()}
          </>
        )}
      </div>
    </div>
  );
}

function GuideForm({ initial, onSubmit, submitLabel = "Add Guide" }) {
  const [name, setName] = useState(initial?.Name || "");
  const [url, setUrl] = useState(initial?.Url || "");
  const [audienceKeys, setAudienceKeys] = useState(
    GUIDE_AUDIENCES.filter((a) => a.userTypes.every((t) => initial?.UserTypes?.includes(t))).map((a) => a.key)
  );
  const [saving, setSaving] = useState(false);

  function toggleAudience(key) {
    setAudienceKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  async function submit(e) {
    e.preventDefault();
    const userTypes = GUIDE_AUDIENCES.filter((a) => audienceKeys.includes(a.key)).flatMap((a) => a.userTypes);
    setSaving(true);
    try {
      await onSubmit(name, url, userTypes);
      if (!initial) {
        setName("");
        setUrl("");
        setAudienceKeys([]);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <input className="field" placeholder="Button name (e.g. Student Handbook)" value={name} onChange={(e) => setName(e.target.value)} required />
      <input className="field" type="url" placeholder="https://..." value={url} onChange={(e) => setUrl(e.target.value)} required />
      <div>
        <label className="text-sm block mb-1" style={{ color: "var(--muted)" }}>
          Show on
        </label>
        <div className="flex gap-3 flex-wrap">
          {GUIDE_AUDIENCES.map((a) => (
            <label key={a.key} className="flex items-center gap-1 text-sm">
              <input type="checkbox" checked={audienceKeys.includes(a.key)} onChange={() => toggleAudience(a.key)} />
              {a.label}
            </label>
          ))}
        </div>
      </div>
      <button className="btn" type="submit" disabled={saving}>
        {saving ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}

function GuideRow({ guide, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [removing, setRemoving] = useState(false);

  async function remove() {
    setRemoving(true);
    try {
      await onDelete(guide.GuideID);
    } finally {
      setRemoving(false);
    }
  }

  if (editing) {
    return (
      <div className="p-3 rounded" style={{ background: "var(--panel-2)" }}>
        <GuideForm
          initial={guide}
          submitLabel="Save"
          onSubmit={async (name, url, userTypes) => {
            await onUpdate(guide.GuideID, { name, url, userTypes });
            setEditing(false);
          }}
        />
        <button className="btn-ghost mt-2" onClick={() => setEditing(false)}>
          Cancel
        </button>
      </div>
    );
  }

  const audienceLabels = GUIDE_AUDIENCES.filter((a) => a.userTypes.some((t) => guide.UserTypes?.includes(t))).map((a) => a.label);

  return (
    <div className="p-3 rounded flex items-center justify-between gap-3 flex-wrap" style={{ background: "var(--panel-2)" }}>
      <div>
        <div className="font-medium">{guide.Name}</div>
        <div className="text-sm" style={{ color: "var(--muted)" }}>
          {guide.Url}
        </div>
        <div className="text-sm" style={{ color: "var(--muted)" }}>
          Shown on: {audienceLabels.join(", ") || "none"}
        </div>
      </div>
      <div className="flex gap-2">
        <button className="btn-ghost" onClick={() => setEditing(true)}>
          Edit
        </button>
        <ConfirmButton
          label="Delete"
          confirmText={`Delete the guide "${guide.Name}"?`}
          style={{ color: "var(--bad)" }}
          disabled={removing}
          onConfirm={remove}
        />
      </div>
    </div>
  );
}
