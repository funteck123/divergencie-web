export const REQUESTED_TYPE_LABEL: Record<string, string> = { Trial: "trial", TeacherInterview: "teacher interview", StaffInterview: "staff interview", AmbassadorInterview: "ambassador interview" };
export const APPLY_AS = [
  { value: "Trial", label: "Student (trial class)" },
  { value: "TeacherInterview", label: "Teacher (interview)" },
  { value: "StaffInterview", label: "Staff (interview)" },
  { value: "AmbassadorInterview", label: "Ambassador (interview)" },
];
export const STUDYING_OPTIONS = ["A2 Levels", "AS Level", "AP", "IGCSE/O-Levels", "IB", "SAT", "Qudurat GAT", "Tahsili SAAT", "SAT Subject Tests", "IELTS", "TOEFL", "CBSE", "JEE", "NEET", "CUET", "GMAT", "OCR", "Edexcel", "AQA"];
export const HELP_OPTIONS = ["Classes", "Study Resources"];
export const SUBJECT_OPTIONS = ["Chemistry", "Physics", "Biology", "Computer Science", "Maths", "ICT", "Islamic Studies", "Religious Studies", "PreCalculus", "Calculus", "Hindi", "Arabic", "Urdu", "Environmental Management", "French", "Spanish", "German", "Pak. Studies", "Business Studies", "English Literature", "English Language", "English as a Second Language", "First Language English", "Economics", "Psychology", "Sociology", "History", "Global Perspectives", "Geography", "Art", "Further Mathematics", "Drama", "Accounting", "Law", "English General Paper", "IT", "Science", "Independent Research"];
export const HEARD_OPTIONS = ["Social Media", "Referral", "Newspaper"];
export const SCORE_OPTIONS = ["Yes", "No", "Maybe"];
export const INTL_PHONE_PATTERN = "\\+[0-9][0-9 \\-]{6,}";

export interface RegisterValues {
  requestedType: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  whatsappNumber: string;
  gender: string;
  location: string;
  parentNumber: string;
  parentEmail: string;
  schoolName: string;
  studying: string[];
  otherStudying: string;
  help: string[];
  otherHelp: string;
  subjects: string[];
  otherSubjects: string;
  referrer: string;
  heardAbout: string[];
  couponCode: string;
  scoreAStar: string;
  why: string;
  resume: File | null;
}

const withOther = (list: readonly string[], other: string) => (other.trim() ? [...list, other.trim()] : [...list]);

/** Message when the form cannot be sent, else null. Same two checks and wording as classic. */
export function validateRegister(v: RegisterValues): string | null {
  if (v.requestedType !== "Trial") return null;
  if (withOther(v.studying, v.otherStudying).length === 0) return 'Please choose at least one option under "What are you studying?".';
  if (v.heardAbout.length === 0) return "Please tell us how you heard about us.";
  return null;
}

/** The multipart body POST /api/register receives. A student sends the intake fields; anyone else sends why and an optional resume. */
export function buildRegisterForm(v: RegisterValues): FormData {
  const student = v.requestedType === "Trial";
  const f = new FormData();
  f.set("name", student ? `${v.firstName} ${v.lastName}`.trim() : v.fullName);
  f.set("email", v.email);
  f.set("whatsappNumber", v.whatsappNumber.trim());
  f.set("requestedType", v.requestedType);
  if (student) {
    f.set("gender", v.gender);
    f.set("location", v.location);
    f.set("parentContactNumber", v.parentNumber.trim());
    f.set("parentEmail", v.parentEmail);
    f.set("schoolName", v.schoolName);
    f.set("studying", withOther(v.studying, v.otherStudying).join(", "));
    f.set("help", withOther(v.help, v.otherHelp).join(", "));
    f.set("subjects", withOther(v.subjects, v.otherSubjects).join(", "));
    f.set("referrer", v.referrer);
    f.set("heardAbout", v.heardAbout.join(", "));
    f.set("couponCode", v.couponCode);
    f.set("scoreAStar", v.scoreAStar);
  } else {
    f.set("whyDivergenCIE", v.why);
    if (v.resume) f.set("resume", v.resume);
  }
  return f;
}
