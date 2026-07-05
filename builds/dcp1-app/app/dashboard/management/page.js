"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import { api } from "@/lib/client";

const TABS = ["Applications", "Pipeline", "Accounts", "Services", "Schedule Pool", "Enrollments", "Billing"];

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
              <td>{r.RequestedType}</td>
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

  async function load() {
    const [{ scheduleItems }, { users }] = await Promise.all([api("/api/schedule"), api("/api/users")]);
    setUsers(users);
    // trial/interview items aren't exposed as a top-level list endpoint;
    // derive them from each pending account's /api/me bundle instead
    const trialAccs = users.filter((u) => u.UserType === "TrialAcc");
    const interviewAccs = users.filter((u) => u.UserType === "InterviewAcc");
    const trials = [];
    const interviews = [];
    for (const acc of trialAccs) {
      const bundle = await api(`/api/me?userId=${acc.UserID}`);
      trials.push(...bundle.trialItems);
    }
    for (const acc of interviewAccs) {
      const bundle = await api(`/api/me?userId=${acc.UserID}`);
      interviews.push(...bundle.interviewItems);
    }
    setTrialItems(trials);
    setInterviewItems(interviews);
    void scheduleItems;
  }
  useEffect(() => {
    load();
  }, []);

  function nameOf(id) {
    return users.find((u) => u.UserID === id)?.Name || id;
  }

  async function sendOffer(interviewId) {
    await api("/api/interview-offer", { method: "POST", body: JSON.stringify({ interviewId, action: "send" }) });
    load();
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="card">
        <h2 className="font-semibold mb-4">Trial Pipeline</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Feedback</th>
            </tr>
          </thead>
          <tbody>
            {trialItems.map((t) => (
              <tr key={t.TrialID}>
                <td>{nameOf(t.TrialAccID)}</td>
                <td><span className="badge badge-info">{t.Status}</span></td>
                <td style={{ color: "var(--muted)" }}>{t.Feedback || "—"}</td>
              </tr>
            ))}
            {trialItems.length === 0 && (
              <tr><td colSpan={3} style={{ color: "var(--muted)" }}>No trial bookings yet.</td></tr>
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
              <th>Status</th>
              <th>Task</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {interviewItems.map((i) => (
              <tr key={i.InterviewID}>
                <td>{nameOf(i.InterviewAccID)}</td>
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
                <td>
                  {i.Status === "TaskSubmitted" && (
                    <button className="btn" onClick={() => sendOffer(i.InterviewID)}>
                      Send offer
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {interviewItems.length === 0 && (
              <tr><td colSpan={4} style={{ color: "var(--muted)" }}>No interview bookings yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- Accounts ---------------- */
function Accounts() {
  const [users, setUsers] = useState([]);
  const [issued, setIssued] = useState({});
  const [error, setError] = useState("");

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

  return (
    <div className="space-y-6">
      <CreateParent onCreated={load} users={users} />
      <div className="card">
      <h2 className="font-semibold mb-4">All Accounts</h2>
      {error && <p style={{ color: "var(--bad)" }}>{error}</p>}
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Type</th>
            <th>Status</th>
            <th>New credentials</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.UserID}>
              <td>{u.UserID}</td>
              <td>{u.Name}</td>
              <td>{u.UserType}</td>
              <td>
                <Badge kind={u.Status === "Converted" ? "info" : "good"}>{u.Status}</Badge>
              </td>
              <td>
                {issued[u.UserID] ? (
                  <span style={{ color: "var(--muted)" }}>
                    {issued[u.UserID].username} / {issued[u.UserID].password}
                  </span>
                ) : u.ConvertedToUserID ? (
                  <span style={{ color: "var(--muted)" }}>→ {u.ConvertedToUserID}</span>
                ) : (
                  "—"
                )}
              </td>
              <td>
                {["TrialAcc", "InterviewAcc"].includes(u.UserType) && u.Status !== "Converted" && (
                  <button className="btn" onClick={() => convert(u.UserID)}>
                    Convert to {u.UserType === "TrialAcc" ? "Student" : "Staff"}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

function CreateParent({ onCreated, users }) {
  const [name, setName] = useState("");
  const [studentIds, setStudentIds] = useState([]);
  const [issued, setIssued] = useState(null);
  const [error, setError] = useState("");

  const students = users.filter((u) => u.UserType === "Student");

  function toggle(id) {
    setStudentIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      const res = await api("/api/users", { method: "POST", body: JSON.stringify({ name, studentIds }) });
      setIssued(res.credentials);
      setName("");
      setStudentIds([]);
      onCreated();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="card">
      <h2 className="font-semibold mb-4">Create Parent Account</h2>
      <form onSubmit={submit} className="space-y-3">
        <input className="field" placeholder="Parent name" value={name} onChange={(e) => setName(e.target.value)} required />
        <div>
          <label className="text-sm block mb-1" style={{ color: "var(--muted)" }}>
            Linked student(s)
          </label>
          <div className="flex flex-wrap gap-2">
            {students.map((s) => (
              <label key={s.UserID} className="flex items-center gap-1 text-sm">
                <input type="checkbox" checked={studentIds.includes(s.UserID)} onChange={() => toggle(s.UserID)} />
                {s.Name}
              </label>
            ))}
            {students.length === 0 && <p style={{ color: "var(--muted)" }}>No students yet.</p>}
          </div>
        </div>
        {error && <p style={{ color: "var(--bad)" }}>{error}</p>}
        <button className="btn" type="submit">
          Create parent account
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
function Services() {
  const [services, setServices] = useState([]);
  const [name, setName] = useState("");
  const [type, setType] = useState("Class");
  const [monthlyCost, setMonthlyCost] = useState("");
  const [occurrences, setOccurrences] = useState([{ day: "Monday", time: "16:00", duration: 1, facilitator: "" }]);
  const [error, setError] = useState("");

  async function load() {
    const { services } = await api("/api/services");
    setServices(services);
  }
  useEffect(() => {
    load();
  }, []);

  function updateOcc(i, field, value) {
    setOccurrences((prev) => prev.map((o, idx) => (idx === i ? { ...o, [field]: value } : o)));
  }
  function addOcc() {
    setOccurrences((prev) => [...prev, { day: "Monday", time: "16:00", duration: 1, facilitator: "" }]);
  }
  function removeOcc(i) {
    setOccurrences((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      await api("/api/services", {
        method: "POST",
        body: JSON.stringify({ name, type, monthlyCost, occurrences }),
      });
      setName("");
      setMonthlyCost("");
      setOccurrences([{ day: "Monday", time: "16:00", duration: 1, facilitator: "" }]);
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="card">
        <h2 className="font-semibold mb-4">Create Service</h2>
        <form onSubmit={submit} className="space-y-3">
          <input className="field" placeholder="Service name" value={name} onChange={(e) => setName(e.target.value)} required />
          <input className="field" placeholder="Type (e.g. Class, Workshop)" value={type} onChange={(e) => setType(e.target.value)} />
          <input
            className="field"
            type="number"
            placeholder="Monthly cost"
            value={monthlyCost}
            onChange={(e) => setMonthlyCost(e.target.value)}
          />
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
                  placeholder="Facilitator"
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
          <button className="btn" type="submit">
            Create service
          </button>
        </form>
      </div>

      <div className="card">
        <h2 className="font-semibold mb-4">Services</h2>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Type</th>
              <th>Monthly cost</th>
              <th>Occurrences</th>
            </tr>
          </thead>
          <tbody>
            {services.map((s) => (
              <tr key={s.ServiceID}>
                <td>{s.ServiceID}</td>
                <td>{s.Name}</td>
                <td>{s.Type}</td>
                <td>{s.MonthlyCost}</td>
                <td style={{ color: "var(--muted)" }}>
                  {s.OccuranceList.map((o) => `${o.Day} ${o.Time} (${o.Duration}h)`).join(", ")}
                </td>
              </tr>
            ))}
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

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="card">
        <h2 className="font-semibold mb-4">Offer a Trial / Interview Slot</h2>
        <p className="text-sm mb-3" style={{ color: "var(--muted)" }}>
          Open pool — the first pending Trial/Interview account to book it gets it. Every slot is
          for a specific Service; booking a Trial slot auto-bills one month in advance for that
          Service.
        </p>
        <form onSubmit={submit} className="space-y-3">
          <select className="field" value={serviceType} onChange={(e) => setServiceType(e.target.value)}>
            <option value="Trial">Trial</option>
            <option value="Interview">Interview</option>
          </select>
          <select className="field" value={serviceId} onChange={(e) => setServiceId(e.target.value)} required>
            <option value="">Select service…</option>
            {services.map((s) => (
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
            placeholder="Facilitator"
            value={facilitator}
            onChange={(e) => setFacilitator(e.target.value)}
          />
          {error && <p style={{ color: "var(--bad)" }}>{error}</p>}
          <button className="btn" type="submit">
            Offer slot
          </button>
        </form>

        <h3 className="font-semibold mt-6 mb-2">Open pool slots</h3>
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Service</th>
              <th>Date</th>
              <th>Time</th>
              <th>Facilitator</th>
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
      </div>

      <div className="card">
        <h2 className="font-semibold mb-4">Service Schedule (auto-generated)</h2>
        <table>
          <thead>
            <tr>
              <th>Service</th>
              <th>Date</th>
              <th>Time</th>
              <th>Hrs</th>
              <th>Facilitator</th>
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
      </div>
    </div>
  );
}

/* ---------------- Enrollments ---------------- */
function Enrollments() {
  const [users, setUsers] = useState([]);
  const [services, setServices] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [userId, setUserId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const [{ users }, { services }, { enrollments }] = await Promise.all([
      api("/api/users"),
      api("/api/services"),
      api("/api/enrollments"),
    ]);
    setUsers(users.filter((u) => ["Student", "Staff"].includes(u.UserType)));
    setServices(services);
    setEnrollments(enrollments);
  }
  useEffect(() => {
    load();
  }, []);

  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      await api("/api/enrollments", { method: "POST", body: JSON.stringify({ userId, serviceId }) });
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  function nameOf(id) {
    return users.find((u) => u.UserID === id)?.Name || id;
  }
  function serviceNameOf(id) {
    return services.find((s) => s.ServiceID === id)?.Name || id;
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="card">
        <h2 className="font-semibold mb-4">Enroll a Student or Staff into a Service</h2>
        <form onSubmit={submit} className="space-y-3">
          <select className="field" value={userId} onChange={(e) => setUserId(e.target.value)} required>
            <option value="">Select person…</option>
            {users.map((u) => (
              <option key={u.UserID} value={u.UserID}>
                {u.Name} ({u.UserType})
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
          {error && <p style={{ color: "var(--bad)" }}>{error}</p>}
          <button className="btn" type="submit">
            Enroll
          </button>
        </form>
      </div>
      <div className="card">
        <h2 className="font-semibold mb-4">Current Enrollments</h2>
        <table>
          <thead>
            <tr>
              <th>Person</th>
              <th>Service</th>
            </tr>
          </thead>
          <tbody>
            {enrollments.map((e) => (
              <tr key={e.EnrolmentID}>
                <td>{nameOf(e.UserID)}</td>
                <td>{serviceNameOf(e.ServiceID)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- Billing ---------------- */
function Billing() {
  const [invoices, setInvoices] = useState([]);
  const [paychecks, setPaychecks] = useState([]);
  const [users, setUsers] = useState([]);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [error, setError] = useState("");

  async function load() {
    const [{ invoices }, { paychecks }, { users }] = await Promise.all([
      api("/api/invoices"),
      api("/api/paychecks"),
      api("/api/users"),
    ]);
    setInvoices(invoices);
    setPaychecks(paychecks);
    setUsers(users);
  }
  useEffect(() => {
    load();
  }, []);

  function nameOf(id) {
    return users.find((u) => u.UserID === id)?.Name || id;
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

      <div className="card">
        <h2 className="font-semibold mb-4">Invoices (Students)</h2>
        <BillingTable rows={invoices} idKey="InvoiceID" nameOf={nameOf} personKey="StudentID" onPatch={patchInvoice} />
      </div>

      <div className="card">
        <h2 className="font-semibold mb-4">Paychecks (Staff)</h2>
        <BillingTable rows={paychecks} idKey="PaycheckID" nameOf={nameOf} personKey="StaffID" onPatch={patchPaycheck} />
      </div>
    </div>
  );
}

function BillingTable({ rows, idKey, nameOf, personKey, onPatch }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Person</th>
          <th>Period</th>
          <th>Scheduled hrs</th>
          <th>Attended hrs</th>
          <th>Amount</th>
          <th>INR Amount</th>
          <th>INR Due</th>
          <th>Status</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <Row key={r[idKey]} row={r} idKey={idKey} nameOf={nameOf} personKey={personKey} onPatch={onPatch} />
        ))}
        {rows.length === 0 && (
          <tr>
            <td colSpan={9} style={{ color: "var(--muted)" }}>
              None generated yet.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

function Row({ row, idKey, nameOf, personKey, onPatch }) {
  const [inrAmount, setInrAmount] = useState(row.INRAmount);
  const [inrDue, setInrDue] = useState(row.INRDue);
  const isDraft = row.Status === "Draft";
  return (
    <tr>
      <td>{nameOf(row[personKey])}</td>
      <td>{row.Month}/{row.Year}</td>
      <td>{row.ScheduledHours ?? "—"}</td>
      <td>{row.AttendedHours ?? "—"}</td>
      <td>{row.Amount}</td>
      <td>
        <input
          className="field"
          style={{ width: 90 }}
          type="number"
          value={inrAmount}
          disabled={!isDraft}
          onChange={(e) => setInrAmount(e.target.value)}
        />
      </td>
      <td>
        <input
          className="field"
          style={{ width: 90 }}
          type="number"
          value={inrDue}
          disabled={!isDraft}
          onChange={(e) => setInrDue(e.target.value)}
        />
      </td>
      <td>
        <span className={`badge ${row.Status === "Sent" ? "badge-good" : "badge-pending"}`}>{row.Status}</span>
      </td>
      <td className="space-x-2">
        {isDraft && (
          <>
            <button className="btn-ghost" onClick={() => onPatch(row[idKey], { inrAmount, inrDue })}>
              Save
            </button>
            <button className="btn" onClick={() => onPatch(row[idKey], { inrAmount, inrDue, status: "Sent" })}>
              Send
            </button>
          </>
        )}
      </td>
    </tr>
  );
}
