import { describe, expect, it } from "vitest";
import { buildRegisterForm, validateRegister, type RegisterValues } from "./registerLogic";

const base: RegisterValues = { requestedType: "Trial", firstName: "Sam", lastName: "Lee", fullName: "", email: "s@x.com", whatsappNumber: " +44 7000 000000 ", gender: "Male", location: "UK", parentNumber: "+44 7111 111111", parentEmail: "", schoolName: "", studying: ["IB"], otherStudying: "", help: ["Classes"], otherHelp: "Mentoring", subjects: ["Physics"], otherSubjects: "", referrer: "", heardAbout: ["Referral"], couponCode: "", scoreAStar: "Yes", why: "", resume: null };

describe("register form", () => {
  it("student needs studying and heard about", () => {
    expect(validateRegister({ ...base, studying: [] })).toMatch(/studying/);
    expect(validateRegister({ ...base, studying: [], otherStudying: "GRE" })).toBeNull();
    expect(validateRegister({ ...base, heardAbout: [] })).toMatch(/heard about us/);
    expect(validateRegister(base)).toBeNull();
  });
  it("non-students are not asked for intake answers", () => expect(validateRegister({ ...base, requestedType: "StaffInterview", studying: [], heardAbout: [] })).toBeNull());
  it("student body", () => {
    const f = buildRegisterForm(base);
    expect(f.get("name")).toBe("Sam Lee");
    expect(f.get("whatsappNumber")).toBe("+44 7000 000000");
    expect(f.get("help")).toBe("Classes, Mentoring");
    expect(f.get("parentContactNumber")).toBe("+44 7111 111111");
    expect(f.get("whyDivergenCIE")).toBeNull();
  });
  it("interview body", () => {
    const f = buildRegisterForm({ ...base, requestedType: "TeacherInterview", fullName: "Dr Rao", why: "Love teaching" });
    expect(f.get("name")).toBe("Dr Rao");
    expect(f.get("whyDivergenCIE")).toBe("Love teaching");
    expect(f.get("gender")).toBeNull();
  });
});
