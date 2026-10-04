import { LinkButton } from "@/ui2/components/Button";
import type { ReactNode } from "react";
import { formatInternationalNumber } from "@/lib/countryCodes";
import { timezoneLabel, tzAbbrFor } from "@/lib/timezones";
import type { Column } from "@/ui2/components/DataTable";
import type { UserRecord } from "@/ui2/queries/types";

export const INTERVIEW_ACC_TYPES = ["TeacherInterviewAcc", "StaffInterviewAcc", "AmbassadorInterviewAcc"] as const;
export const INTERVIEW_ACC_LABEL: Record<string, string> = {
  TeacherInterviewAcc: "Teacher Interview",
  StaffInterviewAcc: "Staff Interview",
  AmbassadorInterviewAcc: "Ambassador Interview",
};
/** Pending account type to the account type it converts to (same table as the classic page). */
export const CONVERT_LABEL: Record<string, string> = {
  TrialAcc: "Student",
  TeacherInterviewAcc: "Teacher",
  StaffInterviewAcc: "Staff",
  AmbassadorInterviewAcc: "Ambassador",
};

export interface AccountGroup {
  id: string;
  label: string;
  /** Singular title used in headings and the search placeholder. */
  title: string;
  types: readonly string[];
  /** Columns between Status and the row actions. */
  columns: (ctx: GroupContext) => Column<UserRecord>[];
  showSchedule?: boolean;
  showConvert?: boolean;
}

export interface GroupContext {
  users: readonly UserRecord[];
}

const dash = (v: ReactNode) => (v === undefined || v === null || v === "" ? "—" : v);
const text = (id: string, header: string, get: (u: UserRecord) => string | undefined, extra: Partial<Column<UserRecord>> = {}): Column<UserRecord> => ({
  id,
  header,
  cell: (u) => dash(get(u)),
  sortValue: (u) => get(u) ?? "",
  tip: (u) => get(u),
  ...extra,
});
const today = () => new Date().toISOString().slice(0, 10);
const tzShort = (u: UserRecord) => tzAbbrFor(today(), u.Timezone ?? "Asia/Kolkata") || timezoneLabel(u.Timezone);
const phone = (v?: string) => formatInternationalNumber(v) || undefined;

function mark(id: string, header: string, title: string, on: (u: UserRecord) => boolean, label: (u: UserRecord) => string): Column<UserRecord> {
  return {
    id,
    header,
    title,
    width: 30,
    align: "center",
    sortValue: (u) => (on(u) ? 1 : 0),
    cell: (u) => (
      <span title={label(u)} aria-label={label(u)} role="img" className="u2-mark">
        {on(u) ? "●" : "–"}
      </span>
    ),
  };
}
function link(id: string, header: string, title: string, url: (u: UserRecord) => string | undefined): Column<UserRecord> {
  return {
    id,
    header,
    title,
    width: 30,
    align: "center",
    sortValue: (u) => (url(u) ? 1 : 0),
    cell: (u) => {
      const href = url(u);
      return href ? (
        <LinkButton href={href} target="_blank" aria-label={`Open ${title.toLowerCase()} of ${u.Name}`} title={title}>
          ↗
        </LinkButton>
      ) : (
        <span aria-label={`No ${title.toLowerCase()}`}>–</span>
      );
    },
  };
}
const currency = text("currency", "Cur", (u) => u.Currency || "INR", { title: "Currency", width: 38 });
const batch = text("batch", "Batch", (u) => u.Batch, { width: 46 });
const role = text("role", "Role", (u) => u.Role);
const department = text("department", "Department", (u) => u.Department);
const passport = text("passport", "Passport #", (u) => u.PassportNumber);

export const ACCOUNT_GROUPS: readonly AccountGroup[] = [
  {
    id: "students",
    label: "Students",
    title: "Student Accounts",
    types: ["Student"],
    showSchedule: true,
    columns: () => [
      text("course", "Course", (u) => u.Course, { width: 56 }),
      batch,
      text("tz", "TZ", tzShort, { title: "Timezone", width: 40, tip: (u) => timezoneLabel(u.Timezone) }),
      currency,
      text("wa", "WhatsApp #", (u) => phone(u.WhatsAppNumber), { width: 100 }),
      text("pwa", "Parent WA #", (u) => phone(u.ParentWhatsAppNumber), { title: "Parent WhatsApp #", width: 100 }),
      text("pem", "P. Email", (u) => u.ParentEmail, { title: "Parent Email", width: 72 }),
      text("email", "Email", (u) => u.Email, { width: 118 }),
      text("school", "School", (u) => u.School, { width: 88 }),
      text("location", "Location", (u) => u.Location, { width: 64 }),
      {
        id: "notes",
        header: "Nt",
        title: "Notes",
        width: 30,
        align: "center",
        sortValue: (u) => u.Notes ?? "",
        tip: (u) => u.Notes,
        cell: (u) => (u.Notes ? <span aria-label={`Notes: ${u.Notes}`}>●</span> : <span aria-label="No notes">–</span>),
      },
      link("timesheet", "Ts", "Timesheet", (u) => u.TimesheetURL),
      link("progress", "Pt", "Progress Tracker", (u) => u.ProgressTrackerURL),
      {
        id: "sent",
        header: "Sent",
        title: "Group Sent, GCR Sent, Schedule Sent",
        width: 44,
        align: "center",
        sortValue: (u) => Number(!!u.GroupSent) + Number(!!u.GCRSent) + Number(!!u.ScheduleSent),
        cell: (u) => {
          const label = `Group ${u.GroupSent ? "sent" : "not sent"}, GCR ${u.GCRSent ? "sent" : "not sent"}, Schedule ${u.ScheduleSent ? "sent" : "not sent"}`;
          return (
            <span title={label} aria-label={label} role="img" className="u2-sent">
              {[u.GroupSent, u.GCRSent, u.ScheduleSent].map((on, i) => (
                <i key={i} className={on ? "on" : ""} />
              ))}
            </span>
          );
        },
      },
    ],
  },
  {
    id: "teachers",
    label: "Teachers",
    title: "Teacher Accounts",
    types: ["Teacher"],
    showSchedule: true,
    columns: () => [role, department, passport, batch, text("tz", "Timezone", (u) => timezoneLabel(u.Timezone)), currency],
  },
  {
    id: "staff",
    label: "Staff",
    title: "Staff Accounts",
    types: ["Staff"],
    showSchedule: true,
    columns: () => [
      role,
      department,
      passport,
      text("tz", "Timezone", (u) => timezoneLabel(u.Timezone)),
      currency,
      link("workfolder", "Work Folder", "Work Folder", (u) => u.WorkFolderURL),
      link("timesheet", "Timesheet", "Timesheet", (u) => u.TimesheetURL),
    ],
  },
  { id: "management", label: "Management", title: "Management Accounts", types: ["Management"], columns: () => [currency] },
  {
    id: "parents",
    label: "Parents",
    title: "Parent Accounts",
    types: ["Parent"],
    columns: ({ users }) => {
      const names = (u: UserRecord) => (u.StudentIDs?.length ? u.StudentIDs.map((id) => users.find((x) => x.UserID === id)?.Name || id).join(", ") : undefined);
      return [text("students", "Linked Student(s)", names), currency];
    },
  },
  {
    id: "ambassadors",
    label: "Ambassadors",
    title: "Ambassador Accounts",
    types: ["Ambassador"],
    columns: () => [role, department, passport, text("tz", "Timezone", (u) => timezoneLabel(u.Timezone)), currency],
  },
  { id: "pending-trial", label: "Pending Trial", title: "Pending Trial Accounts", types: ["TrialAcc"], showConvert: true, columns: () => [] },
  ...INTERVIEW_ACC_TYPES.map<AccountGroup>((t) => ({
    id: `pending-${t}`,
    label: `Pending ${INTERVIEW_ACC_LABEL[t]}`,
    title: `Pending ${INTERVIEW_ACC_LABEL[t]} Accounts`,
    types: [t],
    showConvert: true,
    columns: () => [],
  })),
];
