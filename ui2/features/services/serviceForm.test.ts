import { describe, expect, it } from "vitest";
import { buildServiceBody, effectiveName, emptyServiceForm, flagsOf, loadServiceForm, suggestedName, typeOptionsFor, validateServiceForm } from "./serviceForm";
import type { ServiceRecord } from "@/ui2/queries/types";

const cohort: ServiceRecord = {
  ServiceID: "SVC-1", Name: "Cambridge IGCSE 0625 Physics", Type: "Course", Group: ["Student", "Teacher"], Board: "Cambridge", Course: "IGCSE", SubjectCode: "0625", SubjectName: "Physics",
  StartDate: "2026-01-01", EndDate: "2026-12-31", Links: [{ LinkID: "L1", Name: "Answers", Url: "https://x" }],
  OptionalComponents: [{ ComponentID: "C1", ComponentName: "", Batches: [{
    BatchID: "B1", BatchName: "B14", StartDate: "2026-02-01", EndDate: "2026-11-30",
    Rates: [{ RateID: "R1", Currency: "INR", Rate: 5000, Description: "B14 INR", BillingType: "Monthly", Group: "" }],
    OccuranceList: [{ OccuranceID: "O1", Day: "Tuesday", Time: "17:00", Duration: 1.5, Facilitator: "Ms T", FacilitatorUserID: "TCH-1", Timezone: "Asia/Kolkata" }],
  }] }],
};

describe("load then build keeps identity (the wholesale PATCH lesson)", () => {
  it("keeps every id and the batch dates", () => {
    const body = buildServiceBody(loadServiceForm(cohort)) as { components: { componentId: string; batches: { batchId: string; startDate: string; endDate: string; rates: { rateId: string }[]; occurrences: { occuranceId: string; facilitatorUserId: string }[] }[] }[] };
    const b = body.components[0]!.batches[0]!;
    expect(body.components[0]!.componentId).toBe("C1");
    expect([b.batchId, b.startDate, b.endDate]).toEqual(["B1", "2026-02-01", "2026-11-30"]);
    expect(b.rates[0]!.rateId).toBe("R1");
    expect(b.occurrences[0]).toMatchObject({ occuranceId: "O1", facilitatorUserId: "TCH-1" });
  });
  it("keeps the stored name even though a different one would be suggested", () => {
    const f = loadServiceForm({ ...cohort, Name: "Custom name" });
    expect(effectiveName(f)).toBe("Custom name");
    expect(suggestedName(f)).toBe("Cambridge IGCSE 0625 Physics");
  });
});

describe("flags and suggestions", () => {
  it("one non-student group is role based", () => expect(flagsOf({ group: ["Staff"], type: "Staff" })).toMatchObject({ isRoleBasedService: true, isStaffRole: true, cohortEligible: false }));
  it("student plus teacher is cohort", () => expect(flagsOf({ group: ["Student", "Teacher"], type: "Course" })).toMatchObject({ isRoleBasedService: false, cohortEligible: true }));
  it("type options are the union", () => expect(typeOptionsFor(["Teacher", "Staff"])).toEqual(["Teacher", "Staff"]));
  it("suggested names per type", () => {
    const f = { ...emptyServiceForm(), board: "Cambridge", course: "A-Level", subjectCode: "9702", subjectName: "Physics" };
    expect(suggestedName(f)).toBe("Cambridge A-Level 9702 Physics");
    expect(suggestedName({ ...f, type: "Book" })).toBe("Cambridge A-Level 9702 Physics Booklet");
    expect(suggestedName({ ...f, type: "Counselling" })).toBe("DC Counselling");
    expect(suggestedName({ ...f, type: "Admissions", country: "UK", university: "UCL" })).toBe("UK Admissions Consulting - UCL");
    expect(suggestedName({ ...f, group: ["Staff"], type: "Staff", role: "SM Assistant" })).toBe("DC Staff - SM Assistant");
  });
});

describe("body shape", () => {
  it("role based sends flat rates and occurrences and no cohort fields", () => {
    const f = { ...emptyServiceForm(), group: ["Staff"], type: "Staff", role: "PM", name: "n", nameManuallyEdited: true };
    const body = buildServiceBody(f);
    expect(Object.keys(body).sort()).toEqual(["department", "endDate", "group", "links", "name", "occurrences", "rates", "role", "startDate", "type"]);
  });
  it("cohort sends components and resource links", () => {
    const keys = Object.keys(buildServiceBody(emptyServiceForm())).sort();
    expect(keys).toEqual(["board", "components", "country", "course", "endDate", "gcrLink", "group", "links", "name", "recordingsLink", "startDate", "subjectCode", "subjectName", "syllabusLink", "type", "university", "worksheetsLink"]);
  });
});

describe("validation", () => {
  it("needs a group", () => expect(validateServiceForm({ ...emptyServiceForm(), group: [] })).toBe("Select at least one group this service is open to."));
  it("needs a batch per component", () => expect(validateServiceForm({ ...emptyServiceForm(), components: [{ componentName: "", batches: [] }] })).toMatch(/At least one batch/));
  it("role service needs a rate and an occurrence", () => expect(validateServiceForm({ ...emptyServiceForm(), group: ["Staff"], flatRates: [] })).toBe("At least one rate and one occurrence are required."));
  it("a complete form passes", () => expect(validateServiceForm(emptyServiceForm())).toBeNull());
});
