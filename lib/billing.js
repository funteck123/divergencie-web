// A Service holds one or more OptionalComponents, each holding one or more
// Batches (Service.OptionalComponents[].Batches[]) — the Batch is the level
// someone actually enrolls into. Each Batch offers one or more rates
// (Batch.Rates: [{ RateID, Currency, Rate, BillingType, Group }]) — duplicate
// currencies are allowed (e.g. two different USD tiers), so a rate is
// identified by its own RateID, not its currency. Whoever enrolls picks one
// specific Batch, then one specific Rate within it, recorded as
// Enrollment.BatchID / Enrollment.RateID. Billing math always resolves
// through the enrollment's chosen BatchID+RateID.
//
// BillingType is one of:
//   "Monthly" (default) — rate is a monthly total, prorated by attendance:
//     (rate / scheduledHours) * attendedHours.
//   "Hourly" — rate is a flat per-hour rate: rate * attendedHours (no
//     proration against scheduled hours).
//   "OneOff" — a single flat charge (e.g. a book) — not hours-based at all,
//     and (see /api/invoices, /api/paychecks) only ever generated once per
//     enrollment, regardless of how many months pass.
import { CURRENCIES } from "./accountTypes";

export const BILLING_TYPES = ["Monthly", "Hourly", "OneOff"];

// Kept in sync with app/dashboard/management/page.js's own ALL_GROUPS (an
// account type's list of Service.Group values) — a Rate's optional Group
// restricts who may enroll at it (see /api/enrollments's rateGroupError).
const RATE_GROUPS = ["Student", "Teacher", "Staff", "Management", "Parent", "Ambassador"];

function isValidRateGroup(g) {
  return g === undefined || g === "" || RATE_GROUPS.includes(g);
}

// Shared by POST/PATCH /api/services (validating a whole Service's nested
// rates) and POST /api/services/rates (validating one new Rate at a time,
// via validateRates([rate])) — same rules either way.
export function validateRates(rates) {
  if (!Array.isArray(rates) || rates.length === 0) {
    return "Each batch needs at least one rate.";
  }
  for (const r of rates) {
    const currency = r.currency || "INR";
    if (!CURRENCIES.includes(currency)) {
      return `currency must be one of ${CURRENCIES.join(", ")}.`;
    }
    if (Number(r.rate) < 0 || Number.isNaN(Number(r.rate))) {
      return "rate cannot be negative.";
    }
    if (r.description && String(r.description).length > 40) {
      return "A rate's description must be 40 characters or fewer.";
    }
    if (r.billingType && !BILLING_TYPES.includes(r.billingType)) {
      return `billingType must be one of ${BILLING_TYPES.join(", ")}.`;
    }
    if (!isValidRateGroup(r.group)) {
      return `A rate's group must be one of ${RATE_GROUPS.join(", ")}, or left unset.`;
    }
  }
  return null;
}

// Every Batch across every OptionalComponent of a Service, flattened — Batch
// ids are globally unique (like RateID/OccuranceID), so once you have a
// BatchID you never need to also carry its parent ComponentID/ServiceID to
// look it up within an already-loaded service.
export function batchesOf(service) {
  return (service?.OptionalComponents || []).flatMap((c) => c.Batches || []);
}

export function batchById(service, batchId) {
  const batches = batchesOf(service);
  if (!batchId) return batches[0];
  return batches.find((b) => b.BatchID === batchId) || batches[0];
}

// Short day/time summary of a Batch's own occurrences — e.g. "Mon 09:00,
// Wed 09:00" — TKT-0026: the enrollment form's Batch picker only showed
// BatchName (which can be a generic/blank label), leaving Management to
// pick a Batch blind with no way to tell which one actually matches the
// student's availability without leaving the form to go check the Service
// separately. Empty when a Batch has no occurrences set yet (e.g. a
// resource-only Service pending a real schedule).
const DAY_ABBR = { Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed", Thursday: "Thu", Friday: "Fri", Saturday: "Sat", Sunday: "Sun" };
export function batchScheduleLabel(batch) {
  const occurrences = batch?.OccuranceList || [];
  if (occurrences.length === 0) return "";
  return occurrences.map((o) => `${DAY_ABBR[o.Day] || o.Day} ${o.Time}`).join(", ");
}

export function ratesOf(service, batchId) {
  const batch = batchById(service, batchId);
  if (batch && Array.isArray(batch.Rates) && batch.Rates.length > 0) return batch.Rates;
  // A Staff-role Service (Role/Department, no Batches — see
  // app/api/services/route.js's applyStaffRoleFields) keeps its Rates
  // directly on the Service, not nested under a Batch.
  if (Array.isArray(service?.Rates) && service.Rates.length > 0) return service.Rates;
  // Legacy single-currency service (or none) — synthesize a one-entry list
  // so older display code never crashes on an empty array.
  return [{
    RateID: `${service?.ServiceID || "legacy"}-default`,
    Currency: service?.Currency || "INR",
    Rate: Number(service?.Rate) || 0,
    Description: "",
    BillingType: "Monthly",
    Group: "",
  }];
}

export function rateById(service, batchId, rateId) {
  const rates = ratesOf(service, batchId);
  return rates.find((r) => r.RateID === rateId) || rates[0];
}

// The long-form name used on invoice/paycheck line items — auto-generated
// from Batch + Board + SubjectCode + SubjectName, never typed by hand (see
// app/api/services/route.js's stampFullNames, which recomputes and stores
// it as Batch.FullName on every Service create/edit). A Service with no
// Board/SubjectName (Staff-role, or a non-curriculum Type like Book/
// Counselling/Admissions) has nothing to compose, so this just falls back
// to the Service's own Name.
export function batchFullName(service, batch) {
  if (service?.Board || service?.SubjectName) {
    return [batch?.BatchName, service.Board, service.SubjectCode, service.SubjectName].filter(Boolean).join(" ");
  }
  return service?.Name || "";
}

// What to actually print for a given invoice/paycheck's Service+Batch — the
// stored Batch.FullName if present (the normal case), else recomputed live
// (covers a Service saved before this existed), else the Service's own Name.
export function lineItemName(service, batchId) {
  if (!service) return "—";
  const batch = batchById(service, batchId);
  return batch?.FullName || batchFullName(service, batch) || service.Name;
}

// The outstanding balance in the invoice's/paycheck's OWN currency, derived
// from the manually-entered INRDue using the same FX rate implied by
// Amount/INRAmount (whatever rate was actually frozen for this record) —
// avoids a second live FX lookup and stays consistent with the record's own
// numbers. Returns 0 if there's no rate to derive from (e.g. INRAmount was
// never filled in).
export function amountDueInOwnCurrency(record, fallbackCurrency = "INR") {
  const currency = record?.Currency || fallbackCurrency;
  const inrDue = Number(record?.INRDue) || 0;
  if (currency === "INR") return inrDue;
  const amount = Number(record?.Amount) || 0;
  const inrAmount = Number(record?.INRAmount) || 0;
  if (!amount || !inrAmount) return 0;
  const impliedRate = inrAmount / amount; // INR per unit of `currency`
  return Math.round((inrDue / impliedRate) * 100) / 100;
}

// Whether an Enrollment is active for a given (year, month) — compared at
// month granularity (an enrollment is active for a month if any part of
// that month falls within [StartDate, EndDate]), not exact days. No
// StartDate/EndDate (older enrollments, predating this field) means always
// active, same as before this existed.
export function isEnrollmentActiveForMonth(enrollment, year, month) {
  const monthNum = year * 12 + month;
  if (enrollment?.StartDate) {
    const [sy, sm] = enrollment.StartDate.split("-").map(Number);
    if (monthNum < sy * 12 + sm) return false;
  }
  if (enrollment?.EndDate) {
    const [ey, em] = enrollment.EndDate.split("-").map(Number);
    if (monthNum > ey * 12 + em) return false;
  }
  return true;
}

// ScheduledHours = sum of ScheduleItem.Duration for that service+batch in the given month
// AttendedHours  = sum of AttendanceItem.LoggedDuration for that user+service in the given month
// batchId scopes both the rate lookup and the schedule-hours sum to one
// specific Batch — required now that a Service can have several, each with
// its own occurrences; without it, a user enrolled in one Batch would have
// every other Batch's hours (and a mismatched rate) folded into their bill.
export function computeHoursAndAmount(db, { userId, serviceId, batchId, year, month }) {
  const service = db.services.find((s) => s.ServiceID === serviceId);
  const enrollment = db.enrollments.find(
    (e) => e.UserID === userId && e.ServiceID === serviceId && (!batchId || e.BatchID === batchId)
  );
  const resolvedBatchId = batchId || enrollment?.BatchID;
  const matchedRate = service ? rateById(service, resolvedBatchId, enrollment?.RateID) : null;
  const rate = Number(matchedRate?.Rate) || 0;
  const currency = matchedRate?.Currency || service?.Currency || "INR";
  const billingType = matchedRate?.BillingType || "Monthly";

  // Occurrences are further bounded to the enrollment's own StartDate/EndDate
  // (plain "YYYY-MM-DD" strings — safe to compare lexicographically) so a
  // mid-month start/end only bills for the days actually enrolled. OneOff is
  // exempt — it's a flat one-time charge, never hours/date-range-based to
  // begin with. No bound applied if there's no enrollment on record (nothing
  // to prorate against) or the relevant Start/EndDate was never set.
  const monthScheduleItems = db.scheduleItems.filter((s) => {
    if (s.ServiceID !== serviceId) return false;
    if (resolvedBatchId && s.BatchID !== resolvedBatchId) return false;
    const d = new Date(s.Date);
    if (d.getFullYear() !== year || d.getMonth() + 1 !== month) return false;
    if (billingType !== "OneOff" && enrollment) {
      if (enrollment.StartDate && s.Date < enrollment.StartDate) return false;
      if (enrollment.EndDate && s.Date > enrollment.EndDate) return false;
    }
    return true;
  });
  const scheduleIdSet = new Set(monthScheduleItems.map((s) => s.ScheduleID));

  const scheduledHours = monthScheduleItems.reduce((sum, s) => sum + (Number(s.Duration) || 0), 0);

  // TKT-0037: more than one person's attendance record can now exist for
  // the same (session, subject) -- e.g. the subject's own self-log AND a
  // co-enrolled Teacher/Student's record about them. Billing only ever
  // reads the one flagged AcceptedForBilling; `!== false` (not `=== true`)
  // so records written before this field existed -- always the sole,
  // implicitly-authoritative record for their session -- keep counting
  // exactly as before. A session where the accepted record's Status or
  // LoggedDuration disagrees with a still-present other record is a real,
  // unresolved conflict -- surfaced via hasUnresolvedAttendance so the
  // invoice/paycheck can flag it (see app/api/invoices, app/api/paychecks)
  // without blocking draft generation itself.
  const attendanceForUser = db.attendanceItems.filter((a) => a.UserID === userId && scheduleIdSet.has(a.ScheduleItemID));
  const acceptedRecords = attendanceForUser.filter((a) => a.AcceptedForBilling !== false);
  const attendedHours = acceptedRecords.reduce((sum, a) => sum + (Number(a.LoggedDuration) || 0), 0);

  const bySession = new Map();
  for (const a of attendanceForUser) {
    if (!bySession.has(a.ScheduleItemID)) bySession.set(a.ScheduleItemID, []);
    bySession.get(a.ScheduleItemID).push(a);
  }
  // A disagreement Management has explicitly reviewed (accepted record has
  // ResolvedBy set, via PATCH /api/attendance) is a deliberate, reviewed
  // choice, not an open question — it never blocks Sending, even though
  // the two records keep differing forever as history. Without
  // ResolvedBy, the acceptance was just a default (self-record auto-wins
  // on creation, or first-record-in auto-wins) that nobody has actually
  // looked at yet — that DOES block Sending.
  let hasUnresolvedAttendance = false;
  for (const records of bySession.values()) {
    if (records.length < 2) continue;
    const accepted = records.find((a) => a.AcceptedForBilling !== false);
    if (!accepted || accepted.ResolvedBy) continue;
    if (records.some((a) => a !== accepted && (a.Status !== accepted.Status || Number(a.LoggedDuration) !== Number(accepted.LoggedDuration)))) {
      hasUnresolvedAttendance = true;
      break;
    }
  }

  let amount;
  if (billingType === "Hourly") {
    amount = rate * attendedHours;
  } else if (billingType === "OneOff") {
    amount = rate;
  } else {
    amount = scheduledHours > 0 ? (rate / scheduledHours) * attendedHours : 0;
  }

  return {
    scheduledHours,
    attendedHours,
    amount: Math.round(amount * 100) / 100,
    currency,
    billingType,
    hasUnresolvedAttendance,
  };
}
