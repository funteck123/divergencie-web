"use client";

import { Fragment, useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import SortableTh from "@/components/SortableTh";
import ScheduleCalendar from "@/components/ScheduleCalendar";
import { api, formatRates, groupMatches, normalizeGroup, roleGroupOf, useSort } from "@/lib/client";
import { ratesOf, rateById, BILLING_TYPES, amountDueInOwnCurrency } from "@/lib/billing";
import { TIMEZONE_GROUPS, normalizeTimezone, timezoneLabel } from "@/lib/timezones";
import { DEPARTMENTS, ROLE_ELIGIBLE, FIXED_DEPARTMENT, CURRENCIES_FULL } from "@/lib/accountTypes";

const TABS = ["Applications", "Pipeline", "Accounts", "Services", "Schedule Pool", "Enrollments", "Billing"];
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

function Body() {
  const [tab, setTab] = useState("Applications");
  return (
    <div>
      <nav className="flex gap-2 mb-6 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={tab === t ? "btn" : "btn-ghost"}
          >
            {t}
          </button>
        ))}
      </nav>
      {tab === "Applications" && <Applications />}
      {tab === "Pipeline" && <Pipeline />}
      {tab === "Accounts" && <Accounts />}
      {tab === "Services" && <Services />}
      {tab === "Schedule Pool" && <SchedulePool />}
      {tab === "Enrollments" && <Enrollments />}
      {tab === "Billing" && <Billing />}
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

function Badge({ children, kind = "info" }) {
  return <span className={`badge badge-${kind}`}>{children}</span>;
}

/* ---------------- Applications ---------------- */
function Applications() {
  const [regForms, setRegForms] = useState([]);
  const [issued, setIssued] = useState({}); // regFormId -> {username,password}
  const [error, setError] = useState("");

  async function load() {
    const { regForms } = await api("/api/regforms");
    setRegForms(regForms);
  }
  useEffect(() => {
    load();
  }, []);

  async function act(regFormId, action) {
    setError("");
    try {
      const res = await api("/api/regforms", {
        method: "PATCH",
        body: JSON.stringify({ regFormId, action }),
      });
      if (res.credentials) setIssued((prev) => ({ ...prev, [regFormId]: res.credentials }));
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="card">
      <h2 className="font-semibold mb-4">RegForm Applications</h2>
      {error && <p style={{ color: "var(--bad)" }}>{error}</p>}
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Type</th>
            <th>Status</th>
            <th>Credentials</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {regForms.map((r) => (
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
                  const cred = issued[r.RegFormID] || (r.Username && { username: r.Username, password: r.Password });
                  return cred ? (
                    <span style={{ color: "var(--muted)" }}>
                      {cred.username} / {cred.password}
                    </span>
                  ) : (
                    "—"
                  );
                })()}
              </td>
              <td className="space-x-2">
                {r.Status === "Pending" && (
                  <>
                    <button className="btn" onClick={() => act(r.RegFormID, "approve")}>
                      Approve
                    </button>
                    <button className="btn-ghost" onClick={() => act(r.RegFormID, "reject")}>
                      Reject
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
  );
}

/* ---------------- Pipeline ---------------- */
function Pipeline() {
  const [trialItems, setTrialItems] = useState([]);
  const [interviewItems, setInterviewItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [services, setServices] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [issued, setIssued] = useState({});
  const [pendingTrials, setPendingTrials] = useState([]);
  const [pendingInterviews, setPendingInterviews] = useState([]);
  const [error, setError] = useState("");

  async function load() {
    const [{ users }, { services }, { invoices }, { pendingTrials, pendingInterviews }] = await Promise.all([
      api("/api/users"),
      api("/api/services"),
      api("/api/invoices"),
      api("/api/schedule/requests"),
    ]);
    setUsers(users);
    setServices(services);
    setInvoices(invoices);
    setPendingTrials(pendingTrials);
    setPendingInterviews(pendingInterviews);
    // trial/interview items aren't exposed as a top-level list endpoint;
    // derive them from each pending account's /api/me bundle instead — run
    // every account's fetch concurrently rather than one at a time (this was
    // a real N+1: sequential /api/me calls, one per pending account).
    const trialAccs = users.filter((u) => u.UserType === "TrialAcc");
    const interviewAccs = users.filter((u) => INTERVIEW_ACC_TYPES.includes(u.UserType));
    const [trialBundles, interviewBundles] = await Promise.all([
      Promise.all(trialAccs.map((acc) => api(`/api/me?userId=${acc.UserID}`))),
      Promise.all(interviewAccs.map((acc) => api(`/api/me?userId=${acc.UserID}`))),
    ]);
    setTrialItems(trialBundles.flatMap((b) => b.trialItems));
    setInterviewItems(interviewBundles.flatMap((b) => b.interviewItems));
  }
  useEffect(() => {
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
  function invoiceFor(trial) {
    // Invoices are billed to the converted Student's own ID, not the TrialAcc
    // ID — a Trial produces no invoice until Management adds the Service.
    const account = accountOf(trial.TrialAccID);
    const studentId = account?.ConvertedToUserID || trial.TrialAccID;
    return invoices.find((inv) => inv.StudentID === studentId && inv.ServiceID === trial.ServiceID);
  }

  async function addService(trialId) {
    setError("");
    try {
      await api("/api/trial-enroll", { method: "POST", body: JSON.stringify({ trialId }) });
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function sendOffer(interviewId, feedback, offerLetterLink) {
    await api("/api/interview-offer", { method: "POST", body: JSON.stringify({ interviewId, action: "send", feedback, offerLetterLink }) });
    load();
  }

  async function setInterviewOutcome(interviewId, action, feedback) {
    await api("/api/interview-offer", { method: "POST", body: JSON.stringify({ interviewId, action, feedback }) });
    load();
  }

  async function convert(accountId) {
    setError("");
    try {
      const res = await api("/api/convert", { method: "POST", body: JSON.stringify({ accountId }) });
      setIssued((prev) => ({ ...prev, [accountId]: res.credentials }));
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function actOnRequest(type, id, action) {
    setError("");
    try {
      await api("/api/schedule/requests", { method: "PATCH", body: JSON.stringify({ type, id, action }) });
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  function AccountCell({ accountId }) {
    const account = accountOf(accountId);
    if (!account) return "—";
    if (issued[accountId]) {
      return (
        <span style={{ color: "var(--muted)" }}>
          {issued[accountId].username} / {issued[accountId].password}
        </span>
      );
    }
    if (account.Status === "Converted") {
      return <span style={{ color: "var(--muted)" }}>→ {account.ConvertedToUserID}</span>;
    }
    return (
      <button className="btn-ghost" onClick={() => convert(accountId)}>
        Convert
      </button>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {error && <p style={{ color: "var(--bad)" }} className="md:col-span-2">{error}</p>}
      <div className="card">
        <h2 className="font-semibold mb-4">Trial Pipeline</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Service</th>
              <th>Status</th>
              <th>Feedback</th>
              <th></th>
              <th>Invoice</th>
              <th>Account</th>
            </tr>
          </thead>
          <tbody>
            {trialItems.map((t) => {
              const invoice = invoiceFor(t);
              return (
                <tr key={t.TrialID}>
                  <td>{nameOf(t.TrialAccID)}</td>
                  <td>{serviceNameOf(t.ServiceID)}</td>
                  <td><span className="badge badge-info">{t.Status}</span></td>
                  <td style={{ color: "var(--muted)" }}>{t.Feedback || "—"}</td>
                  <td>
                    {t.Status === "FeedbackSubmitted" && !t.ServiceAdded && (
                      <button className="btn" onClick={() => addService(t.TrialID)}>
                        Add Service
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
            {trialItems.length === 0 && (
              <tr><td colSpan={7} style={{ color: "var(--muted)" }}>No trial bookings yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2 className="font-semibold mb-4">Interview Pipeline</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Service</th>
              <th>Status</th>
              <th>Task</th>
              <th>Offer</th>
              <th></th>
              <th>Account</th>
            </tr>
          </thead>
          <tbody>
            {interviewItems.map((i) => (
              <tr key={i.InterviewID}>
                <td>{nameOf(i.InterviewAccID)}</td>
                <td>{serviceNameOf(i.ServiceID)}</td>
                <td><span className="badge badge-info">{i.Status}</span></td>
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
            ))}
            {interviewItems.length === 0 && (
              <tr><td colSpan={7} style={{ color: "var(--muted)" }}>No interview bookings yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card md:col-span-2">
        <h2 className="font-semibold mb-4">Pending Requests</h2>
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Requester</th>
              <th>Service</th>
              <th>Date</th>
              <th>Time</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pendingTrials.map((t) => (
              <tr key={t.TrialID}>
                <td>Trial</td>
                <td>{t.RequesterName}</td>
                <td>{t.Slot?.ServiceName}</td>
                <td>{t.Slot?.Date}</td>
                <td>{t.Slot?.Time}</td>
                <td className="space-x-2">
                  <button className="btn" onClick={() => actOnRequest("Trial", t.TrialID, "approve")}>
                    Approve
                  </button>
                  <button className="btn-ghost" onClick={() => actOnRequest("Trial", t.TrialID, "reject")}>
                    Reject
                  </button>
                </td>
              </tr>
            ))}
            {pendingInterviews.map((i) => {
              const bookingType = i.RequesterType ? i.RequesterType.replace(/Acc$/, "") : "StaffInterview";
              return (
                <tr key={i.InterviewID}>
                  <td>{INTERVIEW_ACC_LABEL[i.RequesterType] || "Interview"}</td>
                  <td>{i.RequesterName}</td>
                  <td>{i.Slot?.ServiceName}</td>
                  <td>{i.Slot?.Date}</td>
                  <td>{i.Slot?.Time}</td>
                  <td className="space-x-2">
                    <button className="btn" onClick={() => actOnRequest(bookingType, i.InterviewID, "approve")}>
                      Approve
                    </button>
                    <button className="btn-ghost" onClick={() => actOnRequest(bookingType, i.InterviewID, "reject")}>
                      Reject
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
  );
}

function InterviewOutcomeForm({ initialFeedback, initialLink, onSendOffer, onWaitlist, onReject }) {
  const [feedback, setFeedback] = useState(initialFeedback || "");
  const [offerLetterLink, setOfferLetterLink] = useState(initialLink || "");

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
          disabled={!offerLetterLink.trim()}
          onClick={() => onSendOffer(feedback, offerLetterLink)}
        >
          Send offer
        </button>
        <button className="btn-ghost" type="button" onClick={() => onWaitlist(feedback)}>
          Waitlist
        </button>
        <button className="btn-ghost" style={{ color: "var(--bad)" }} type="button" onClick={() => onReject(feedback)}>
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
            disabled={!offerLetterLink.trim()}
            onClick={() => {
              onSave(feedback, offerLetterLink);
              setEditing(false);
            }}
          >
            Save
          </button>
          <button
            className="btn-ghost"
            type="button"
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
      <button className="btn-ghost" type="button" onClick={onUnsend}>
        Unsend
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

  async function load() {
    const { users } = await api("/api/users");
    setUsers(users);
  }
  useEffect(() => {
    load();
  }, []);

  async function convert(accountId) {
    setError("");
    try {
      const res = await api("/api/convert", {
        method: "POST",
        body: JSON.stringify({ accountId }),
      });
      setIssued((prev) => ({ ...prev, [accountId]: res.credentials }));
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function saveEdit(userId, fields) {
    setError("");
    try {
      await api("/api/users", { method: "PATCH", body: JSON.stringify({ userId, ...fields }) });
      setEditingId(null);
      load();
    } catch (e) {
      setError(e.message);
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

  const sharedProps = { users, issued, editingId, setEditingId, convert, saveEdit };

  return (
    <div className="space-y-6">
      <CreateAccount onCreated={load} users={users} />
      {error && <p style={{ color: "var(--bad)" }}>{error}</p>}

      <AccountGroupTable
        title="Student Accounts"
        rows={studentUsers}
        columns={[
          { header: "Course", render: (u) => u.Course || "—" },
          { header: "Batch", render: (u) => u.Batch || "—" },
          { header: "Timezone", render: (u) => timezoneLabel(u.Timezone) },
          { header: "Currency", render: (u) => u.Currency || "INR" },
          { header: "WhatsApp #", render: (u) => u.WhatsAppNumber || "—" },
          { header: "Parent WhatsApp #", render: (u) => u.ParentWhatsAppNumber || "—" },
          { header: "Email", render: (u) => u.Email || "—" },
          { header: "School", render: (u) => u.School || "—" },
          { header: "Location", render: (u) => u.Location || "—" },
          {
            header: "Notes",
            render: (u) => (u.Notes ? <span title={u.Notes}>{u.Notes.length > 24 ? `${u.Notes.slice(0, 24)}…` : u.Notes}</span> : "—"),
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
          },
          { header: "Group Sent", render: (u) => (u.GroupSent ? "✓" : "—") },
          { header: "GCR Sent", render: (u) => (u.GCRSent ? "✓" : "—") },
          { header: "Schedule Sent", render: (u) => (u.ScheduleSent ? "✓" : "—") },
        ]}
        showSchedule
        {...sharedProps}
      />

      <AccountGroupTable
        title="Teacher Accounts"
        rows={teacherUsers}
        columns={[
          { header: "Role", render: (u) => u.Role || "—" },
          { header: "Department", render: (u) => u.Department || "—" },
          { header: "Passport #", render: (u) => u.PassportNumber || "—" },
          { header: "Batch", render: (u) => u.Batch || "—" },
          { header: "Timezone", render: (u) => timezoneLabel(u.Timezone) },
          { header: "Currency", render: (u) => u.Currency || "INR" },
        ]}
        showSchedule
        {...sharedProps}
      />

      <AccountGroupTable
        title="Staff Accounts"
        rows={otherStaffUsers}
        columns={[
          { header: "Role", render: (u) => u.Role || "—" },
          { header: "Department", render: (u) => u.Department || "—" },
          { header: "Passport #", render: (u) => u.PassportNumber || "—" },
          { header: "Timezone", render: (u) => timezoneLabel(u.Timezone) },
          { header: "Currency", render: (u) => u.Currency || "INR" },
        ]}
        showSchedule
        {...sharedProps}
      />

      <AccountGroupTable
        title="Management Accounts"
        rows={managementUsers}
        columns={[{ header: "Currency", render: (u) => u.Currency || "INR" }]}
        {...sharedProps}
      />

      <AccountGroupTable
        title="Parent Accounts"
        rows={parentUsers}
        columns={[
          { header: "Linked Student(s)", render: (u) => studentNamesOf(u.StudentIDs) },
          { header: "Currency", render: (u) => u.Currency || "INR" },
        ]}
        {...sharedProps}
      />

      <AccountGroupTable
        title="Ambassador Accounts"
        rows={ambassadorUsers}
        columns={[
          { header: "Role", render: (u) => u.Role || "—" },
          { header: "Department", render: (u) => u.Department || "—" },
          { header: "Passport #", render: (u) => u.PassportNumber || "—" },
          { header: "Timezone", render: (u) => timezoneLabel(u.Timezone) },
          { header: "Currency", render: (u) => u.Currency || "INR" },
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
function AccountGroupTable({ title, rows, columns, users, issued, editingId, setEditingId, convert, saveEdit, showSchedule, showConvert }) {
  const colSpan = 3 + columns.length + (showSchedule ? 1 : 0) + 2;

  return (
    <div className="card">
      <h2 className="font-semibold mb-4">{title}</h2>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "max-content", minWidth: "100%" }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Status</th>
              {columns.map((c) => (
                <th key={c.header}>{c.header}</th>
              ))}
              <th>New credentials</th>
              {showSchedule && <th>Schedule</th>}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
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
                      <span style={{ color: "var(--muted)" }}>
                        {issued[u.UserID].username} / {issued[u.UserID].password}
                      </span>
                    ) : u.ConvertedToUserID ? (
                      <span style={{ color: "var(--muted)" }}>→ {u.ConvertedToUserID}</span>
                    ) : u.Username ? (
                      <span style={{ color: "var(--muted)" }}>
                        {u.Username} / {u.Password}
                      </span>
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
                    {showConvert && CONVERT_LABEL[u.UserType] && u.Status !== "Converted" && (
                      <button className="btn" onClick={() => convert(u.UserID)}>
                        Convert to {CONVERT_LABEL[u.UserType]}
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
            {rows.length === 0 && (
              <tr>
                <td colSpan={colSpan} style={{ color: "var(--muted)" }}>
                  None yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
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
  const [email, setEmail] = useState(user.Email || "");
  const [school, setSchool] = useState(user.School || "");
  const [location, setLocation] = useState(user.Location || "");
  const [notes, setNotes] = useState(user.Notes || "");
  const [timesheetUrl, setTimesheetUrl] = useState(user.TimesheetURL || "");
  const [progressTrackerUrl, setProgressTrackerUrl] = useState(user.ProgressTrackerURL || "");
  const [groupSent, setGroupSent] = useState(Boolean(user.GroupSent));
  const [gcrSent, setGcrSent] = useState(Boolean(user.GCRSent));
  const [scheduleSent, setScheduleSent] = useState(Boolean(user.ScheduleSent));

  const students = users.filter((u) => u.UserType === "Student");

  function toggleStudent(id) {
    setStudentIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function submit(e) {
    e.preventDefault();
    const fields = { name, username, currency };
    if (user.Status !== "Converted") fields.status = status;
    if (ROLE_ELIGIBLE.includes(user.UserType)) {
      fields.role = role;
      fields.passportNumber = passportNumber;
    }
    if (user.UserType === "Staff") fields.department = department;
    if (user.UserType === "Teacher") fields.batch = batch;
    if (user.UserType === "Student") {
      fields.course = course;
      fields.batch = batch;
      fields.whatsappNumber = whatsappNumber;
      fields.parentWhatsappNumber = parentWhatsappNumber;
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
    onSave(fields);
  }

  return (
    <form onSubmit={submit} className="space-y-3 p-3" style={{ background: "var(--panel-2)", borderRadius: 8 }}>
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
            <input className="field" value={timesheetUrl} onChange={(e) => setTimesheetUrl(e.target.value)} />
          </div>
          <div>
            <label className="text-sm block mb-1" style={{ color: "var(--muted)" }}>
              Progress Tracker URL
            </label>
            <input
              className="field"
              value={progressTrackerUrl}
              onChange={(e) => setProgressTrackerUrl(e.target.value)}
            />
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
        <button className="btn" type="submit">
          Save
        </button>
        <button className="btn-ghost" type="button" onClick={onCancel}>
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
  const [course, setCourse] = useState("");
  const [batch, setBatch] = useState("");
  const [department, setDepartment] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [issued, setIssued] = useState(null);
  const [error, setError] = useState("");

  const students = users.filter((u) => u.UserType === "Student");

  function toggleStudent(id) {
    setStudentIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function reset() {
    setName("");
    setStudentIds([]);
    setRole("");
    setPassportNumber("");
    setCourse("");
    setBatch("");
    setDepartment("");
    setCurrency("INR");
    setTimezone("Asia/Kolkata");
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      const body = { userType, name, currency };
      if (userType === "Parent") body.studentIds = studentIds;
      if (ROLE_ELIGIBLE.includes(userType)) {
        body.role = role;
        body.passportNumber = passportNumber;
      }
      if (userType === "Staff") {
        body.department = department;
        body.timezone = timezone;
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
      onCreated();
    } catch (e) {
      setError(e.message);
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

        <select className="field" style={{ maxWidth: 260 }} value={currency} onChange={(e) => setCurrency(e.target.value)}>
          {CURRENCIES_FULL.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code} — {c.name}
            </option>
          ))}
        </select>

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
              placeholder="Passport / IC Number"
              value={passportNumber}
              onChange={(e) => setPassportNumber(e.target.value)}
            />
          </>
        )}

        {userType === "Staff" && (
          <select className="field" value={department} onChange={(e) => setDepartment(e.target.value)}>
            <option value="">Select department…</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
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
        <button className="btn" type="submit">
          Create account
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
const EMPTY_OCC = { day: "Monday", time: "16:00", duration: 1, facilitator: "" };
const ALL_GROUPS = ["Student", "Teacher", "Staff", "Management", "Parent", "Ambassador"];

function Services() {
  const [services, setServices] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState("");
  const [type, setType] = useState("Class");
  const [group, setGroup] = useState(["Student"]);
  const [batch, setBatch] = useState("");
  const [board, setBoard] = useState("");
  const [courseClass, setCourseClass] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [fullSubjectName, setFullSubjectName] = useState("");
  const [rates, setRates] = useState([{ currency: "INR", rate: "", description: "", billingType: "Monthly" }]);
  const [occurrences, setOccurrences] = useState([{ ...EMPTY_OCC }]);
  const [error, setError] = useState("");

  const cohortEligible = group.includes("Student") || group.includes("Teacher");

  function toggleGroup(g) {
    setGroup((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  }

  async function load() {
    const { services } = await api("/api/services");
    setServices(services);
  }
  useEffect(() => {
    load();
  }, []);

  function resetForm() {
    setEditingId(null);
    setName("");
    setType("Class");
    setGroup(["Student"]);
    setBatch("");
    setBoard("");
    setCourseClass("");
    setSubjectCode("");
    setSubjectName("");
    setFullSubjectName("");
    setRates([{ currency: "INR", rate: "", description: "", billingType: "Monthly" }]);
    setOccurrences([{ ...EMPTY_OCC }]);
  }

  function startEdit(s) {
    setEditingId(s.ServiceID);
    setName(s.Name);
    setType(s.Type);
    setGroup(normalizeGroup(s.Group));
    setBatch(s.Batch || "");
    setBoard(s.Board || "");
    setCourseClass(s.CourseClass || "");
    setSubjectCode(s.SubjectCode || "");
    setSubjectName(s.SubjectName || "");
    setFullSubjectName(s.FullSubjectName || "");
    setRates(
      Array.isArray(s.Rates) && s.Rates.length > 0
        ? s.Rates.map((r) => ({ rateId: r.RateID, currency: r.Currency, rate: r.Rate, description: r.Description || "", billingType: r.BillingType || "Monthly" }))
        : [{ currency: s.Currency || "INR", rate: s.Rate ?? "", description: "", billingType: "Monthly" }]
    );
    setOccurrences(
      s.OccuranceList.map((o) => ({
        occuranceId: o.OccuranceID,
        day: o.Day,
        time: o.Time,
        duration: o.Duration,
        facilitator: o.Facilitator,
      }))
    );
  }

  function updateOcc(i, field, value) {
    setOccurrences((prev) => prev.map((o, idx) => (idx === i ? { ...o, [field]: value } : o)));
  }
  function addOcc() {
    setOccurrences((prev) => [...prev, { ...EMPTY_OCC }]);
  }
  function removeOcc(i) {
    setOccurrences((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateRate(i, field, value) {
    setRates((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  }
  function addRate() {
    setRates((prev) => [...prev, { currency: "INR", rate: "", description: "", billingType: "Monthly" }]);
  }
  function removeRate(i) {
    setRates((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (group.length === 0) {
      setError("Select at least one group this service is open to.");
      return;
    }
    if (rates.length === 0) {
      setError("At least one currency/rate is required.");
      return;
    }
    try {
      if (editingId) {
        await api("/api/services", {
          method: "PATCH",
          body: JSON.stringify({
            serviceId: editingId,
            name,
            type,
            group,
            batch,
            board,
            courseClass,
            subjectCode,
            subjectName,
            fullSubjectName,
            rates,
            occurrences,
          }),
        });
      } else {
        await api("/api/services", {
          method: "POST",
          body: JSON.stringify({
            name,
            type,
            group,
            batch,
            board,
            courseClass,
            subjectCode,
            subjectName,
            fullSubjectName,
            rates,
            occurrences,
          }),
        });
      }
      resetForm();
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 items-start">
      <div className="card">
        <h2 className="font-semibold mb-4">{editingId ? `Edit Service (${editingId})` : "Create Service"}</h2>
        <form onSubmit={submit} className="space-y-3">
          <input className="field" placeholder="Service name" value={name} onChange={(e) => setName(e.target.value)} required />
          <input className="field" placeholder="Type (e.g. Class, Workshop)" value={type} onChange={(e) => setType(e.target.value)} />
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
          {cohortEligible && (
            <>
              <input className="field" placeholder="Batch" value={batch} onChange={(e) => setBatch(e.target.value)} />
              <input className="field" placeholder="Board (e.g. Cambridge)" value={board} onChange={(e) => setBoard(e.target.value)} />
              <input
                className="field"
                placeholder="Course/Class (e.g. IGCSE Year 10)"
                value={courseClass}
                onChange={(e) => setCourseClass(e.target.value)}
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
              <input
                className="field"
                placeholder="Full Subject Name"
                value={fullSubjectName}
                onChange={(e) => setFullSubjectName(e.target.value)}
              />
            </>
          )}
          <div className="space-y-2">
            <label className="text-sm" style={{ color: "var(--muted)" }}>
              Rates offered (whoever enrolls picks one of these — duplicate currencies allowed, e.g. two USD tiers)
            </label>
            {rates.map((r, i) => (
              <div key={i} className="flex gap-2 items-center">
                <select
                  className="field"
                  style={{ maxWidth: 160 }}
                  value={r.currency}
                  onChange={(e) => updateRate(i, "currency", e.target.value)}
                >
                  {CURRENCIES_FULL.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>
                <input
                  className="field"
                  type="number"
                  placeholder="Rate"
                  value={r.rate}
                  onChange={(e) => updateRate(i, "rate", e.target.value)}
                />
                <input
                  className="field"
                  style={{ maxWidth: 140 }}
                  placeholder="Description (optional)"
                  maxLength={40}
                  value={r.description}
                  onChange={(e) => updateRate(i, "description", e.target.value)}
                />
                <select
                  className="field"
                  style={{ maxWidth: 120 }}
                  value={r.billingType}
                  onChange={(e) => updateRate(i, "billingType", e.target.value)}
                >
                  {BILLING_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                {rates.length > 1 && (
                  <button type="button" className="btn-ghost" onClick={() => removeRate(i)}>
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button type="button" className="btn-ghost" onClick={addRate}>
              + Add rate
            </button>
          </div>
          <div className="space-y-2">
            <label className="text-sm" style={{ color: "var(--muted)" }}>
              Recurring occurrences
            </label>
            {occurrences.map((o, i) => (
              <div key={i} className="flex gap-2 items-center">
                <select className="field" value={o.day} onChange={(e) => updateOcc(i, "day", e.target.value)}>
                  {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
                <input
                  className="field"
                  type="time"
                  value={o.time}
                  onChange={(e) => updateOcc(i, "time", e.target.value)}
                />
                <input
                  className="field"
                  type="number"
                  step="0.5"
                  placeholder="Hrs"
                  value={o.duration}
                  onChange={(e) => updateOcc(i, "duration", e.target.value)}
                />
                <input
                  className="field"
                  placeholder="Instructor"
                  value={o.facilitator}
                  onChange={(e) => updateOcc(i, "facilitator", e.target.value)}
                />
                {occurrences.length > 1 && (
                  <button type="button" className="btn-ghost" onClick={() => removeOcc(i)}>
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button type="button" className="btn-ghost" onClick={addOcc}>
              + Add occurrence
            </button>
          </div>
          {error && <p style={{ color: "var(--bad)" }}>{error}</p>}
          <div className="space-x-2">
            <button className="btn" type="submit">
              {editingId ? "Save changes" : "Create service"}
            </button>
            {editingId && (
              <button type="button" className="btn-ghost" onClick={resetForm}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {ALL_GROUPS.map((g) => (
        <ServiceGroupTable key={g} groupName={g} services={services.filter((s) => groupMatches(s.Group, g))} onEdit={startEdit} />
      ))}
    </div>
  );
}

// One table per Group — every service shows Rate (the one billing field);
// Student/Teacher services additionally carry the cohort curriculum fields
// (Batch/Board/Subject...).
function ServiceGroupTable({ groupName, services, onEdit }) {
  const isCohort = groupName === "Student" || groupName === "Teacher";
  const colSpan = isCohort ? 13 : 7;

  return (
    <div className="card">
      <h2 className="font-semibold mb-4">{groupName} Services</h2>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "max-content", minWidth: "100%" }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Type</th>
              <th>Group</th>
              {isCohort && (
                <>
                  <th>Batch</th>
                  <th>Board</th>
                  <th>Course/Class</th>
                  <th>Subject Code</th>
                  <th>Subject Name</th>
                  <th>Full Subject Name</th>
                </>
              )}
              <th>Rate</th>
              <th>Occurrences</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {services.map((s) => (
              <tr key={s.ServiceID}>
                <td>{s.ServiceID}</td>
                <td>{s.Name}</td>
                <td>{s.Type}</td>
                <td>{normalizeGroup(s.Group).join(", ")}</td>
                {isCohort && (
                  <>
                    <td>{s.Batch || "—"}</td>
                    <td>{s.Board || "—"}</td>
                    <td>{s.CourseClass || "—"}</td>
                    <td>{s.SubjectCode || "—"}</td>
                    <td>{s.SubjectName || "—"}</td>
                    <td>{s.FullSubjectName || "—"}</td>
                  </>
                )}
                <td>{formatRates(s)}</td>
                <td style={{ color: "var(--muted)" }}>{s.OccuranceList.map((o) => `${o.Day} ${o.Time} (${o.Duration}h)`).join(", ")}</td>
                <td>
                  <button className="btn-ghost" onClick={() => onEdit(s)}>
                    Edit
                  </button>
                </td>
              </tr>
            ))}
            {services.length === 0 && (
              <tr>
                <td colSpan={colSpan} style={{ color: "var(--muted)" }}>
                  None yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- Schedule Pool ---------------- */
function SchedulePool() {
  const [items, setItems] = useState([]);
  const [openPoolSlots, setOpenPoolSlots] = useState([]);
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

  async function load() {
    const [{ scheduleItems, openPoolSlots }, { services }] = await Promise.all([
      api("/api/schedule"),
      api("/api/services"),
    ]);
    setItems(scheduleItems);
    setOpenPoolSlots(openPoolSlots);
    setServices(services);
  }
  useEffect(() => {
    load();
  }, []);

  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      await api("/api/schedule", {
        method: "POST",
        body: JSON.stringify({ serviceType, serviceId, date, time, duration, facilitator }),
      });
      setDate("");
      setTime("");
      setFacilitator("");
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  const serviceSlots = items.filter((i) => i.OccuranceID !== null);
  const requiredGroup = REQUIRED_GROUP_FOR_BOOKING_TYPE[serviceType] || "Staff";
  const eligibleServices = services.filter((s) => groupMatches(s.Group, requiredGroup));

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="card">
        <h2 className="font-semibold mb-4">Offer a Trial / Interview Slot</h2>
        <p className="text-sm mb-3" style={{ color: "var(--muted)" }}>
          Open pool — any Trial/Interview account can request a slot; multiple requests on the
          same slot are fine. Management approves one, which locks the slot and (for Trial)
          auto-bills one month in advance for that Service.
        </p>
        <form onSubmit={submit} className="space-y-3">
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
          <select className="field" value={serviceId} onChange={(e) => setServiceId(e.target.value)} required>
            <option value="">Select service…</option>
            {eligibleServices.map((s) => (
              <option key={s.ServiceID} value={s.ServiceID}>
                {s.Name}
              </option>
            ))}
          </select>
          <input className="field" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          <input className="field" type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
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
          <button className="btn" type="submit">
            Offer slot
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
          <ScheduleCalendar scheduleItems={openPoolSlots} attendanceItems={[]} readOnly />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Service</th>
                <th>Date</th>
                <th>Time</th>
                <th>Instructor</th>
              </tr>
            </thead>
            <tbody>
              {openPoolSlots.map((s) => (
                <tr key={s.ScheduleID}>
                  <td>{s.ServiceType}</td>
                  <td>{s.ServiceName}</td>
                  <td>{s.Date}</td>
                  <td>{s.Time}</td>
                  <td>{s.Facilitator}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
          </div>
        </div>
        {serviceView === "calendar" ? (
          <ScheduleCalendar scheduleItems={serviceSlots} attendanceItems={[]} readOnly />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Service</th>
                <th>Date</th>
                <th>Time</th>
                <th>Hrs</th>
                <th>Instructor</th>
              </tr>
            </thead>
            <tbody>
              {serviceSlots.map((s) => (
                <tr key={s.ScheduleID}>
                  <td>{s.ServiceName}</td>
                  <td>{s.Date}</td>
                  <td>{s.Time}</td>
                  <td>{s.Duration}</td>
                  <td>{s.Facilitator}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
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
    load();
  }, []);

  async function enroll(userId, serviceId, rateId, startDate, endDate) {
    setError("");
    try {
      await api("/api/enrollments", { method: "POST", body: JSON.stringify({ userId, serviceId, rateId, startDate, endDate }) });
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function updateEnrollment(enrolmentId, patch) {
    await api("/api/enrollments", { method: "PATCH", body: JSON.stringify({ enrolmentId, ...patch }) });
    load();
  }

  async function deleteEnrollment(enrolmentId) {
    await api("/api/enrollments", { method: "DELETE", body: JSON.stringify({ enrolmentId }) });
    load();
  }

  function nameOf(id) {
    return users.find((u) => u.UserID === id)?.Name || id;
  }
  function serviceNameOf(id) {
    return services.find((s) => s.ServiceID === id)?.Name || id;
  }

  const shared = { users, services, nameOf, serviceNameOf, onUpdate: updateEnrollment, onDelete: deleteEnrollment };

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
            onEnroll={enroll}
            {...shared}
          />
        );
      })}
    </div>
  );
}

function EnrollmentGroup({ title, people, eligibleServices, enrollments, onEnroll, users, services, nameOf, serviceNameOf, onUpdate, onDelete }) {
  const [userId, setUserId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [rateId, setRateId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const selectedService = eligibleServices.find((s) => s.ServiceID === serviceId);
  const availableRates = selectedService ? ratesOf(selectedService) : [];

  function pickService(id) {
    setServiceId(id);
    const svc = eligibleServices.find((s) => s.ServiceID === id);
    setRateId(svc ? ratesOf(svc)[0].RateID : "");
  }

  function submit(e) {
    e.preventDefault();
    onEnroll(userId, serviceId, rateId, startDate, endDate);
    setUserId("");
    setServiceId("");
    setRateId("");
    setStartDate("");
    setEndDate("");
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="card">
        <h2 className="font-semibold mb-4">Enroll a {title} into a Service</h2>
        <form onSubmit={submit} className="space-y-3">
          <select className="field" value={userId} onChange={(e) => setUserId(e.target.value)} required>
            <option value="">Select {title.toLowerCase()}…</option>
            {people.map((u) => (
              <option key={u.UserID} value={u.UserID}>
                {u.Name}
              </option>
            ))}
          </select>
          <select className="field" value={serviceId} onChange={(e) => pickService(e.target.value)} required>
            <option value="">Select service…</option>
            {eligibleServices.map((s) => (
              <option key={s.ServiceID} value={s.ServiceID}>
                {s.Name}
              </option>
            ))}
          </select>
          {availableRates.length > 0 && (
            <select className="field" value={rateId} onChange={(e) => setRateId(e.target.value)} required>
              {availableRates.map((r) => (
                <option key={r.RateID} value={r.RateID}>
                  {r.Currency} {r.Rate}{r.Description ? ` (${r.Description})` : ""}
                </option>
              ))}
            </select>
          )}
          <div>
            <label className="text-sm block mb-1" style={{ color: "var(--muted)" }}>
              Start date (optional)
            </label>
            <input className="field" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className="text-sm block mb-1" style={{ color: "var(--muted)" }}>
              End date (optional — leave blank if ongoing)
            </label>
            <input className="field" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <button className="btn" type="submit">
            Enroll
          </button>
        </form>
      </div>
      <div className="card">
        <h2 className="font-semibold mb-4">Current {title} Enrollments</h2>
        <table>
          <thead>
            <tr>
              <th>Person</th>
              <th>Service</th>
              <th>Rate</th>
              <th>Start</th>
              <th>End</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {enrollments.map((e) => (
              <EnrollmentRow
                key={e.EnrolmentID}
                enrollment={e}
                users={users}
                services={services}
                nameOf={nameOf}
                serviceNameOf={serviceNameOf}
                onUpdate={onUpdate}
                onDelete={onDelete}
              />
            ))}
            {enrollments.length === 0 && (
              <tr>
                <td colSpan={6} style={{ color: "var(--muted)" }}>
                  No {title.toLowerCase()} enrollments yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EnrollmentRow({ enrollment, users, services, nameOf, serviceNameOf, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [userId, setUserId] = useState(enrollment.UserID);
  const [serviceId, setServiceId] = useState(enrollment.ServiceID);
  const [rateId, setRateId] = useState(enrollment.RateID || "");
  const [startDate, setStartDate] = useState(enrollment.StartDate || "");
  const [endDate, setEndDate] = useState(enrollment.EndDate || "");
  const [error, setError] = useState("");

  const editingService = services.find((s) => s.ServiceID === serviceId);
  const availableRates = editingService ? ratesOf(editingService) : [];

  function pickService(id) {
    setServiceId(id);
    const svc = services.find((s) => s.ServiceID === id);
    setRateId(svc ? ratesOf(svc)[0].RateID : "");
  }

  function cancel() {
    setUserId(enrollment.UserID);
    setServiceId(enrollment.ServiceID);
    setRateId(enrollment.RateID || "");
    setStartDate(enrollment.StartDate || "");
    setEndDate(enrollment.EndDate || "");
    setError("");
    setEditing(false);
  }

  async function save() {
    setError("");
    try {
      await onUpdate(enrollment.EnrolmentID, { userId, serviceId, rateId, startDate, endDate });
      setEditing(false);
    } catch (e) {
      setError(e.message);
    }
  }

  function remove() {
    if (window.confirm(`Remove ${nameOf(enrollment.UserID)}'s enrollment in ${serviceNameOf(enrollment.ServiceID)}?`)) {
      onDelete(enrollment.EnrolmentID);
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
          <select className="field" value={rateId} onChange={(e) => setRateId(e.target.value)}>
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
          <button className="btn" onClick={save}>
            Save
          </button>
          <button className="btn-ghost" onClick={cancel}>
            Cancel
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td>{nameOf(enrollment.UserID)}</td>
      <td>{serviceNameOf(enrollment.ServiceID)}</td>
      <td>{enrollment.Currency ? `${enrollment.Currency} ${rateById(services.find((s) => s.ServiceID === enrollment.ServiceID), enrollment.RateID)?.Rate ?? ""}` : "—"}</td>
      <td>{enrollment.StartDate || "—"}</td>
      <td>{enrollment.EndDate || "—"}</td>
      <td className="space-x-2">
        <button className="btn-ghost" onClick={() => setEditing(true)}>
          Edit
        </button>
        <button className="btn-ghost" style={{ color: "var(--bad)" }} onClick={remove}>
          Delete
        </button>
      </td>
    </tr>
  );
}

/* ---------------- Billing ---------------- */
function Billing() {
  const [invoices, setInvoices] = useState([]);
  const [paychecks, setPaychecks] = useState([]);
  const [users, setUsers] = useState([]);
  const [services, setServices] = useState([]);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [error, setError] = useState("");

  async function load() {
    const [{ invoices }, { paychecks }, { users }, { services }] = await Promise.all([
      api("/api/invoices"),
      api("/api/paychecks"),
      api("/api/users"),
      api("/api/services"),
    ]);
    setInvoices(invoices);
    setPaychecks(paychecks);
    setUsers(users);
    setServices(services);
  }
  useEffect(() => {
    load();
  }, []);

  function nameOf(id) {
    return users.find((u) => u.UserID === id)?.Name || id;
  }
  function serviceNameOf(id) {
    const s = services.find((s) => s.ServiceID === id);
    return s ? s.Name : id;
  }

  async function generate() {
    setError("");
    try {
      await api("/api/invoices", { method: "POST", body: JSON.stringify({ action: "generate", year: Number(year), month: Number(month) }) });
      await api("/api/paychecks", { method: "POST", body: JSON.stringify({ action: "generate", year: Number(year), month: Number(month) }) });
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function patchInvoice(id, patch) {
    await api("/api/invoices", { method: "PATCH", body: JSON.stringify({ invoiceId: id, ...patch }) });
    load();
  }
  async function patchPaycheck(id, patch) {
    await api("/api/paychecks", { method: "PATCH", body: JSON.stringify({ paycheckId: id, ...patch }) });
    load();
  }
  async function deleteInvoice(id) {
    await api("/api/invoices", { method: "DELETE", body: JSON.stringify({ invoiceId: id }) });
    load();
  }
  async function deletePaycheck(id) {
    await api("/api/paychecks", { method: "DELETE", body: JSON.stringify({ paycheckId: id }) });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="font-semibold mb-4">Generate Drafts</h2>
        <p className="text-sm mb-3" style={{ color: "var(--muted)" }}>
          Amount is auto-calculated: (Service monthly cost ÷ scheduled hours) × attended hours. Only INR
          Amount and INR Due need manual entry.
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
          <button className="btn" onClick={generate}>
            Generate drafts for this month
          </button>
        </div>
        {error && <p style={{ color: "var(--bad)" }} className="mt-2">{error}</p>}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <ManualBillingForm
          title="Create Invoice (manual)"
          personLabel="Student"
          people={users.filter((u) => u.UserType === "Student")}
          services={services}
          onSubmit={async ({ personId, serviceId, year, month, amount }) => {
            await api("/api/invoices", {
              method: "POST",
              body: JSON.stringify({ action: "manual", studentId: personId, serviceId, year, month, amount }),
            });
            load();
          }}
        />
        <ManualBillingForm
          title="Create Paycheck (manual)"
          personLabel="Staff"
          people={users.filter((u) => ["Teacher", "Staff", "Ambassador"].includes(u.UserType))}
          services={services}
          onSubmit={async ({ personId, serviceId, year, month, amount }) => {
            await api("/api/paychecks", {
              method: "POST",
              body: JSON.stringify({ action: "manual", staffId: personId, serviceId, year, month, amount }),
            });
            load();
          }}
        />
      </div>

      <div className="card">
        <h2 className="font-semibold mb-4">Invoices (Students)</h2>
        <BillingTable
          rows={invoices}
          idKey="InvoiceID"
          nameOf={nameOf}
          personKey="StudentID"
          serviceNameOf={serviceNameOf}
          onPatch={patchInvoice}
          onDelete={deleteInvoice}
          flagKey="StudentPaidFlag"
          flagLabel="Paid"
        />
      </div>

      <div className="card">
        <h2 className="font-semibold mb-4">Paychecks (Staff)</h2>
        <BillingTable
          rows={paychecks}
          idKey="PaycheckID"
          nameOf={nameOf}
          personKey="StaffID"
          serviceNameOf={serviceNameOf}
          onPatch={patchPaycheck}
          onDelete={deletePaycheck}
          flagKey="StaffReceivedFlag"
          flagLabel="Received"
        />
      </div>
    </div>
  );
}

function ManualBillingForm({ title, personLabel, people, services, onSubmit }) {
  const now = new Date();
  const [personId, setPersonId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      await onSubmit({ personId, serviceId, year: Number(year), month: Number(month), amount: Number(amount) });
      setPersonId("");
      setServiceId("");
      setAmount("");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="card">
      <h2 className="font-semibold mb-4">{title}</h2>
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
        <button className="btn" type="submit">
          Create draft
        </button>
      </form>
    </div>
  );
}

function BillingTable({ rows, idKey, nameOf, personKey, serviceNameOf, onPatch, onDelete, flagKey, flagLabel }) {
  const decorated = rows.map((r) => ({ ...r, _person: nameOf(r[personKey]), _period: r.Year * 100 + r.Month }));
  const { sorted, sortKey, sortDir, toggleSort } = useSort(decorated, "_period", "desc");
  return (
    <table>
      <thead>
        <tr>
          <SortableTh label="Person" sortKeyName="_person" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
          <th>Service</th>
          <SortableTh label="Period" sortKeyName="_period" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
          <SortableTh label="Scheduled hrs" sortKeyName="ScheduledHours" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
          <SortableTh label="Attended hrs" sortKeyName="AttendedHours" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
          <SortableTh label="Amount" sortKeyName="Amount" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
          <th>Amount Due</th>
          <th>INR Amount</th>
          <th>INR Due</th>
          <SortableTh label="Status" sortKeyName="Status" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
          <th>{flagLabel}</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((r) => (
          <Row
            key={r[idKey]}
            row={r}
            idKey={idKey}
            nameOf={nameOf}
            personKey={personKey}
            serviceNameOf={serviceNameOf}
            onPatch={onPatch}
            onDelete={onDelete}
            flagKey={flagKey}
            flagLabel={flagLabel}
          />
        ))}
        {sorted.length === 0 && (
          <tr>
            <td colSpan={12} style={{ color: "var(--muted)" }}>
              None generated yet.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

function Row({ row, idKey, nameOf, personKey, serviceNameOf, onPatch, onDelete, flagKey, flagLabel }) {
  const [editing, setEditing] = useState(false);
  const [scheduledHours, setScheduledHours] = useState(row.ScheduledHours);
  const [attendedHours, setAttendedHours] = useState(row.AttendedHours);
  const [amount, setAmount] = useState(row.Amount);
  const [inrAmount, setInrAmount] = useState(row.INRAmount);
  const [inrDue, setInrDue] = useState(row.INRDue);
  const isDraft = row.Status === "Draft";

  function cancel() {
    setScheduledHours(row.ScheduledHours);
    setAttendedHours(row.AttendedHours);
    setAmount(row.Amount);
    setInrAmount(row.INRAmount);
    setInrDue(row.INRDue);
    setEditing(false);
  }

  function save() {
    onPatch(row[idKey], { scheduledHours, attendedHours, amount, inrAmount, inrDue });
    setEditing(false);
  }

  function remove() {
    if (window.confirm(`Delete this ${flagLabel === "Paid" ? "invoice" : "paycheck"}? This cannot be undone.`)) {
      onDelete(row[idKey]);
    }
  }

  return (
    <tr>
      <td>
        <span className="flex items-center gap-1">
          {nameOf(row[personKey])}
          {row.Note && (
            <span className="badge badge-pending" title={row.Note} style={{ cursor: "help" }}>
              ⚠
            </span>
          )}
        </span>
      </td>
      <td>{serviceNameOf(row.ServiceID)}</td>
      <td>{row.Month}/{row.Year}</td>
      <td>
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
          row.ScheduledHours ?? "—"
        )}
      </td>
      <td>
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
          row.AttendedHours ?? "—"
        )}
      </td>
      <td>
        {editing ? (
          <input
            className="field"
            style={{ width: 90 }}
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        ) : (
          `${row.Currency || "INR"} ${row.Amount}`
        )}
      </td>
      <td>
        {`${row.Currency || "INR"} ${amountDueInOwnCurrency(row).toFixed(2)}`}
      </td>
      <td>
        {editing ? (
          <input
            className="field"
            style={{ width: 90 }}
            type="number"
            value={inrAmount}
            onChange={(e) => setInrAmount(e.target.value)}
          />
        ) : (
          row.INRAmount
        )}
      </td>
      <td>
        {editing ? (
          <input
            className="field"
            style={{ width: 90 }}
            type="number"
            value={inrDue}
            onChange={(e) => setInrDue(e.target.value)}
          />
        ) : (
          row.INRDue
        )}
      </td>
      <td>
        <span className={`badge ${row.Status === "Sent" ? "badge-good" : "badge-pending"}`}>{row.Status}</span>
      </td>
      <td>
        <span className="flex items-center gap-2 flex-wrap">
          <span className={`badge ${row[flagKey] ? "badge-good" : "badge-pending"}`}>
            {row[flagKey] ? flagLabel : "Unpaid"}
          </span>
          {row.PaymentProofPath && (
            <a className="btn-ghost" style={{ whiteSpace: "nowrap" }} href={`/api/invoices/proof?invoiceId=${row[idKey]}`} target="_blank" rel="noreferrer">
              Proof
            </a>
          )}
        </span>
      </td>
      <td>
        <span className="flex items-center gap-1 flex-wrap">
          {editing ? (
            <>
              <button className="btn" onClick={save}>
                Save
              </button>
              <button className="btn-ghost" onClick={cancel}>
                Cancel
              </button>
            </>
          ) : (
            <>
              <button className="btn-ghost" onClick={() => setEditing(true)}>
                Edit
              </button>
              {isDraft ? (
                <button className="btn" onClick={() => onPatch(row[idKey], { status: "Sent" })}>
                  Send
                </button>
              ) : (
                <button className="btn-ghost" onClick={() => onPatch(row[idKey], { status: "Draft" })}>
                  Unsend
                </button>
              )}
              <a
                className="btn-ghost"
                style={{ whiteSpace: "nowrap" }}
                href={idKey === "InvoiceID" ? `/api/invoices/pdf?invoiceId=${row[idKey]}` : `/api/paychecks/pdf?paycheckId=${row[idKey]}`}
                download
              >
                PDF
              </a>
              <button className="btn-ghost" style={{ color: "var(--bad)" }} onClick={remove}>
                Delete
              </button>
            </>
          )}
        </span>
      </td>
    </tr>
  );
}
