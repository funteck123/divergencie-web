import { describe, expect, it } from "vitest";
import { failureMessage, pickService, ratesFor } from "./enrollLogic";
import type { ServiceRecord } from "@/ui2/queries/types";

const svc: ServiceRecord = {
  ServiceID: "S1", Name: "Physics", Type: "Course", Group: ["Student", "Teacher"],
  OptionalComponents: [{ ComponentID: "C", Batches: [
    { BatchID: "B1", BatchName: "B14", Rates: [{ RateID: "R1", Currency: "INR", Rate: 5000, Group: "" }, { RateID: "R2", Currency: "INR", Rate: 3000, Group: "Teacher" }] },
    { BatchID: "B2", BatchName: "B15", Rates: [{ RateID: "R3", Currency: "SAR", Rate: 200 }] },
  ] }],
};

describe("enrollment form rules", () => {
  it("a rate reserved for Teachers is hidden from a Student", () => {
    expect(ratesFor(svc, "B1", "Student").map((r) => r.RateID)).toEqual(["R1"]);
    expect(ratesFor(svc, "B1", "Teacher").map((r) => r.RateID)).toEqual(["R1", "R2"]);
  });
  it("picking a service selects its first batch and clears the rate", () => {
    expect(pickService([svc], "S1")).toEqual({ serviceId: "S1", batchId: "B1", rateId: "" });
    expect(pickService([svc], "NOPE")).toEqual({ serviceId: "NOPE", batchId: "", rateId: "" });
  });
  it("failure message lists each service with its reason", () => {
    expect(failureMessage([{ serviceId: "S1", message: "Already enrolled" }], 2, () => "Physics")).toBe("1 of 2 enrollment(s) failed — Physics: Already enrolled");
  });
});
