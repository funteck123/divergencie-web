import { DEPARTMENTS } from "@/lib/accountTypes";
import { normalizeGroup } from "@/lib/client";
import type { ServiceRecord } from "@/ui2/queries/types";

export const ALL_GROUPS = ["Student", "Teacher", "Staff", "Management", "Parent", "Ambassador"] as const;
export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

/** Type suggestions per group. Type is free text on the server; these are only offered. */
export const TYPE_OPTIONS_BY_GROUP: Record<string, string[]> = {
  Student: ["Book", "Course", "Counselling", "Admissions"],
  Teacher: ["Teacher"],
  Parent: ["Parent"],
  Ambassador: ["Ambassador"],
  Management: ["Management"],
  Staff: ["Staff"],
};

/** A service open to several groups offers the union of each group's options (TKT-0116 rule). */
export function typeOptionsFor(group: readonly string[]): string[] {
  const out: string[] = [];
  for (const g of group) for (const t of TYPE_OPTIONS_BY_GROUP[g] ?? []) if (!out.includes(t)) out.push(t);
  return out;
}

export interface RateForm {
  rateId?: string;
  currency: string;
  rate: string | number;
  description: string;
  billingType: string;
  group: string;
}
export interface OccurrenceForm {
  occuranceId?: string;
  day: string;
  time: string;
  duration: string | number;
  facilitator: string;
  facilitatorUserId: string;
  timezone: string;
}
export interface BatchForm {
  batchId?: string;
  batchName: string;
  startDate: string;
  endDate: string;
  rates: RateForm[];
  occurrences: OccurrenceForm[];
}
export interface ComponentForm {
  componentId?: string;
  componentName: string;
  batches: BatchForm[];
}
export interface LinkForm {
  linkId?: string;
  name: string;
  url: string;
}

export interface ServiceForm {
  /** Set when editing; absent when creating. */
  serviceId?: string;
  name: string;
  /** True once the person typed a name: the suggestion no longer replaces it. */
  nameManuallyEdited: boolean;
  type: string;
  group: string[];
  board: string;
  course: string;
  subjectCode: string;
  subjectName: string;
  recordingsLink: string;
  syllabusLink: string;
  worksheetsLink: string;
  gcrLink: string;
  startDate: string;
  endDate: string;
  components: ComponentForm[];
  role: string;
  department: string;
  flatRates: RateForm[];
  flatOccurrences: OccurrenceForm[];
  university: string;
  country: string;
  links: LinkForm[];
}

export const emptyRate = (): RateForm => ({ currency: "INR", rate: "", description: "", billingType: "Monthly", group: "" });
export const emptyOccurrence = (): OccurrenceForm => ({ day: "Monday", time: "16:00", duration: 1, facilitator: "", facilitatorUserId: "", timezone: "Asia/Kolkata" });
export const emptyBatch = (): BatchForm => ({ batchName: "", startDate: "", endDate: "", rates: [emptyRate()], occurrences: [emptyOccurrence()] });
export const emptyComponent = (): ComponentForm => ({ componentName: "", batches: [emptyBatch()] });
export const emptyLink = (): LinkForm => ({ name: "", url: "" });

export function emptyServiceForm(): ServiceForm {
  return {
    name: "", nameManuallyEdited: false, type: "Course", group: ["Student"], board: "", course: "", subjectCode: "", subjectName: "",
    recordingsLink: "", syllabusLink: "", worksheetsLink: "", gcrLink: "", startDate: "", endDate: "", components: [emptyComponent()],
    role: "", department: DEPARTMENTS[0] ?? "", flatRates: [emptyRate()], flatOccurrences: [emptyOccurrence()], university: "", country: "", links: [emptyLink()],
  };
}

const mapRate = (r: NonNullable<ServiceRecord["Rates"]>[number]): RateForm => ({ rateId: r.RateID, currency: r.Currency, rate: r.Rate, description: r.Description || "", billingType: r.BillingType || "Monthly", group: r.Group || "" });
const mapOcc = (o: NonNullable<ServiceRecord["OccuranceList"]>[number]): OccurrenceForm => ({
  occuranceId: o.OccuranceID, day: o.Day, time: o.Time, duration: o.Duration, facilitator: o.Facilitator, facilitatorUserId: o.FacilitatorUserID || "", timezone: o.Timezone || "Asia/Kolkata",
});

/** Form state of an existing service. Ids are kept so the wholesale PATCH keeps every batch, rate and occurrence identity (and batch dates). */
export function loadServiceForm(s: ServiceRecord): ServiceForm {
  const comps = s.OptionalComponents ?? [];
  return {
    serviceId: s.ServiceID,
    name: s.Name,
    nameManuallyEdited: true, // an existing name is never replaced by a suggestion
    type: s.Type,
    group: normalizeGroup(s.Group),
    board: s.Board || "", course: s.Course || "", subjectCode: s.SubjectCode || "", subjectName: s.SubjectName || "",
    recordingsLink: s.RecordingsLink || "", syllabusLink: s.SyllabusLink || "", worksheetsLink: s.WorksheetsLink || "", gcrLink: s.GCRLink || "",
    startDate: s.StartDate || "", endDate: s.EndDate || "",
    components: comps.length
      ? comps.map((c) => ({
          componentId: c.ComponentID,
          componentName: c.ComponentName || "",
          batches: (c.Batches ?? []).map((b) => ({
            batchId: b.BatchID, batchName: b.BatchName || "", startDate: b.StartDate || "", endDate: b.EndDate || "",
            rates: (b.Rates ?? []).map(mapRate), occurrences: (b.OccuranceList ?? []).map(mapOcc),
          })),
        }))
      : [emptyComponent()],
    role: s.Role || "",
    department: (DEPARTMENTS as string[]).includes(s.Department ?? "") ? (s.Department as string) : (DEPARTMENTS[0] ?? ""),
    flatRates: Array.isArray(s.Rates) && s.Rates.length ? s.Rates.map(mapRate) : [emptyRate()],
    flatOccurrences: Array.isArray(s.OccuranceList) && s.OccuranceList.length ? s.OccuranceList.map(mapOcc) : [emptyOccurrence()],
    university: s.University || "", country: s.Country || "",
    links: Array.isArray(s.Links) && s.Links.length ? s.Links.map((l) => ({ linkId: l.LinkID, name: l.Name, url: l.Url })) : [emptyLink()],
  };
}

/** What the form shows and sends depends on these three facts only. */
export function flagsOf(f: Pick<ServiceForm, "group" | "type">) {
  const cohortEligible = f.group.includes("Student") || f.group.includes("Teacher");
  // A service open to exactly one non-Student group has no batch concept: flat rates and occurrences instead.
  const isRoleBasedService = f.group.length === 1 && ["Staff", "Teacher", "Ambassador", "Parent", "Management"].includes(f.group[0] ?? "");
  const isStaffRole = isRoleBasedService && f.group[0] === "Staff";
  return { cohortEligible, isRoleBasedService, isStaffRole, isAdmissions: f.type === "Admissions" };
}

/** Academic sessions offered as the Admissions batch name, from this year forward (Fall and Spring pairs). */
export function sessionOptions(year = new Date().getFullYear()): string[] {
  return [0, 1, 2].flatMap((i) => [`Fall ${year + i}`, `Spring ${year + i + 1}`]);
}

/** Name suggestion per Type. Batch names are not baked in for courses and books: one service can have several batches. */
export function suggestedName(f: ServiceForm): string {
  const { isRoleBasedService } = flagsOf(f);
  const firstBatchName = f.components[0]?.batches[0]?.batchName || "";
  if (isRoleBasedService) return [`DC ${f.group[0]}`, f.role].filter(Boolean).join(" - ");
  if (f.type === "Admissions") return [[f.country, "Admissions Consulting"].filter(Boolean).join(" "), f.university, firstBatchName].filter(Boolean).join(" - ");
  if (f.type === "Counselling") return ["DC Counselling", firstBatchName].filter(Boolean).join(" - ");
  if (f.type === "Book") return [f.board, f.course, f.subjectCode, f.subjectName, "Booklet"].filter(Boolean).join(" ");
  return [f.board, f.course, f.subjectCode, f.subjectName].filter(Boolean).join(" ");
}

export const effectiveName = (f: ServiceForm) => (f.nameManuallyEdited ? f.name : suggestedName(f));

/** Message when the form cannot be sent, else null. Same checks and wording as the classic form. */
export function validateServiceForm(f: ServiceForm): string | null {
  if (f.group.length === 0) return "Select at least one group this service is open to.";
  const { isRoleBasedService } = flagsOf(f);
  if (isRoleBasedService) {
    if (f.flatRates.length === 0 || f.flatOccurrences.length === 0) return "At least one rate and one occurrence are required.";
  } else if (f.components.length === 0 || f.components.some((c) => c.batches.length === 0)) {
    return "At least one batch (with a rate and an occurrence) is required per component.";
  }
  return null;
}

/** The body for POST /api/services, or PATCH /api/services with serviceId added. Mirrors the classic submit(). */
export function buildServiceBody(f: ServiceForm): Record<string, unknown> {
  const name = effectiveName(f);
  const { isRoleBasedService } = flagsOf(f);
  if (isRoleBasedService) {
    return { name, type: f.type, group: f.group, role: f.role, department: f.department, rates: f.flatRates, occurrences: f.flatOccurrences, links: f.links, startDate: f.startDate, endDate: f.endDate };
  }
  return {
    name, type: f.type, group: f.group, board: f.board, course: f.course, subjectCode: f.subjectCode, subjectName: f.subjectName,
    recordingsLink: f.recordingsLink, syllabusLink: f.syllabusLink, worksheetsLink: f.worksheetsLink, gcrLink: f.gcrLink,
    university: f.university, country: f.country, components: f.components, links: f.links, startDate: f.startDate, endDate: f.endDate,
  };
}
