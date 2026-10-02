import { formatInternationalNumber } from "@/lib/countryCodes";
import { ROLE_ELIGIBLE } from "@/lib/accountTypes";
import { normalizeTimezone } from "@/lib/timezones";
import type { UserRecord } from "@/ui2/queries/types";

/** Account types an admin can create (same list and order as the classic Create Account card). */
export const CREATABLE_TYPES = ["Parent", "Student", "Teacher", "Staff", "TrialAcc", "TeacherInterviewAcc", "StaffInterviewAcc", "AmbassadorInterviewAcc", "Management", "Ambassador"] as const;

/** Types that have a timezone field. */
export const TIMEZONE_TYPES = ["Student", "Teacher", "Staff", "Ambassador"];

export interface FormValues {
  name: string;
  status: string;
  username: string;
  password: string;
  currency: string;
  timezone: string;
  role: string;
  passportNumber: string;
  whatsappNumber: string;
  parentWhatsappNumber: string;
  parentEmail: string;
  email: string;
  department: string;
  workFolderUrl: string;
  timesheetUrl: string;
  progressTrackerUrl: string;
  course: string;
  batch: string;
  school: string;
  location: string;
  notes: string;
  gender: string;
  helpWanted: string;
  subjects: string;
  heardAbout: string;
  scoreAStar: string;
  referrerName: string;
  referrerUserId: string;
  groupSent: boolean;
  gcrSent: boolean;
  scheduleSent: boolean;
  studentIds: string[];
}

const str = (v: unknown) => (typeof v === "string" ? v : "");

/** Form values of an existing account. Same defaults as the classic edit form (Converted shows as Active, timezone normalised). */
export function initialValues(user: UserRecord): FormValues {
  return {
    name: user.Name,
    status: user.Status === "Converted" ? "Active" : user.Status || "Active",
    username: user.Username || "",
    password: "",
    currency: user.Currency || "INR",
    timezone: normalizeTimezone(user.Timezone),
    role: user.Role || "",
    passportNumber: user.PassportNumber || "",
    whatsappNumber: formatInternationalNumber(user.WhatsAppNumber) || "",
    parentWhatsappNumber: formatInternationalNumber(user.ParentWhatsAppNumber) || "",
    parentEmail: user.ParentEmail || "",
    email: user.Email || "",
    department: user.Department || "",
    workFolderUrl: user.WorkFolderURL || "",
    timesheetUrl: user.TimesheetURL || "",
    progressTrackerUrl: user.ProgressTrackerURL || "",
    course: user.Course || "",
    batch: user.Batch || "",
    school: user.School || "",
    location: user.Location || "",
    notes: user.Notes || "",
    gender: str(user.Gender),
    helpWanted: str(user.HelpWanted),
    subjects: str(user.Subjects),
    heardAbout: str(user.HeardAbout),
    scoreAStar: str(user.ScoreAStar),
    referrerName: str(user.ReferrerName),
    referrerUserId: str(user.ReferrerUserID),
    groupSent: Boolean(user.GroupSent),
    gcrSent: Boolean(user.GCRSent),
    scheduleSent: Boolean(user.ScheduleSent),
    studentIds: user.StudentIDs || [],
  };
}

/** The fields PATCH /api/users receives for an edit. Mirrors the classic EditAccountForm.submit() exactly. */
export function buildPatchFields(user: UserRecord, v: FormValues): Record<string, unknown> {
  const f: Record<string, unknown> = { name: v.name, username: v.username, currency: v.currency };
  if (user.Status !== "Converted") f.status = v.status;
  if (ROLE_ELIGIBLE.includes(user.UserType)) {
    f.role = v.role;
    f.passportNumber = v.passportNumber;
    f.whatsappNumber = v.whatsappNumber;
    f.email = v.email;
  }
  if (user.UserType === "Staff") f.department = v.department;
  if (["Staff", "Teacher"].includes(user.UserType)) {
    f.workFolderUrl = v.workFolderUrl;
    f.timesheetUrl = v.timesheetUrl;
  }
  if (user.UserType === "Teacher") f.batch = v.batch;
  if (user.UserType === "Student") {
    f.course = v.course;
    f.batch = v.batch;
    f.whatsappNumber = v.whatsappNumber;
    f.parentWhatsappNumber = v.parentWhatsappNumber;
    f.parentEmail = v.parentEmail;
    f.email = v.email;
    f.school = v.school;
    f.location = v.location;
    f.notes = v.notes;
    f.gender = v.gender;
    f.helpWanted = v.helpWanted;
    f.subjects = v.subjects;
    f.heardAbout = v.heardAbout;
    f.scoreAStar = v.scoreAStar;
    f.referrerName = v.referrerName;
    f.referrerUserId = v.referrerUserId;
    f.timesheetUrl = v.timesheetUrl;
    f.progressTrackerUrl = v.progressTrackerUrl;
    f.groupSent = v.groupSent;
    f.gcrSent = v.gcrSent;
    f.scheduleSent = v.scheduleSent;
  }
  if (TIMEZONE_TYPES.includes(user.UserType)) f.timezone = v.timezone;
  if (user.UserType === "Parent") f.studentIds = v.studentIds;
  if (v.password.trim()) f.password = v.password;
  return f;
}

export function emptyCreateValues(): FormValues {
  return { ...initialValues({ UserID: "", UserType: "", Name: "", Status: "Active" }), timezone: "Asia/Kolkata", currency: "INR" };
}

/** The body POST /api/users receives for a new account. Mirrors the classic CreateAccount.submit(). */
export function buildCreateBody(userType: string, v: FormValues): Record<string, unknown> {
  const body: Record<string, unknown> = { userType, name: v.name, currency: v.currency };
  if (userType === "Parent") body.studentIds = v.studentIds;
  if (ROLE_ELIGIBLE.includes(userType)) {
    body.role = v.role;
    body.passportNumber = v.passportNumber;
    body.whatsappNumber = v.whatsappNumber;
    body.email = v.email;
  }
  if (userType === "Staff") {
    body.department = v.department;
    body.timezone = v.timezone;
    body.workFolderUrl = v.workFolderUrl;
    body.timesheetUrl = v.timesheetUrl;
  }
  if (userType === "Teacher") {
    body.batch = v.batch;
    body.timezone = v.timezone;
  }
  if (userType === "Student") {
    body.course = v.course;
    body.batch = v.batch;
    body.timezone = v.timezone;
  }
  if (userType === "Ambassador") body.timezone = v.timezone;
  return body;
}
