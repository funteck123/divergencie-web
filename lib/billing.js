// A Service now offers one or more rates (Service.Rates: [{ RateID, Currency,
// Rate, BillingType }]) — duplicate currencies are allowed (e.g. two
// different USD tiers), so a rate is identified by its own RateID, not its
// currency. Whoever enrolls picks one specific rate, recorded as
// Enrollment.RateID. Service.Currency/Service.Rate stay in sync with
// Rates[0] for any older display code, but billing math always resolves
// through the enrollment's chosen RateID.
//
// BillingType is one of:
//   "Monthly" (default) — rate is a monthly total, prorated by attendance:
//     (rate / scheduledHours) * attendedHours.
//   "Hourly" — rate is a flat per-hour rate: rate * attendedHours (no
//     proration against scheduled hours).
//   "OneOff" — a single flat charge (e.g. a book) — not hours-based at all,
//     and (see /api/invoices, /api/paychecks) only ever generated once per
//     enrollment, regardless of how many months pass.
export const BILLING_TYPES = ["Monthly", "Hourly", "OneOff"];

export function ratesOf(service) {
  if (Array.isArray(service?.Rates) && service.Rates.length > 0) return service.Rates;
  // Legacy single-currency service (or none) — synthesize a one-entry list.
  return [{
    RateID: `${service?.ServiceID || "legacy"}-default`,
    Currency: service?.Currency || "INR",
    Rate: Number(service?.Rate) || 0,
    Description: "",
    BillingType: "Monthly",
  }];
}

export function rateById(service, rateId) {
  const rates = ratesOf(service);
  return rates.find((r) => r.RateID === rateId) || rates[0];
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

// ScheduledHours = sum of ScheduleItem.Duration for that service in the given month
// AttendedHours  = sum of AttendanceItem.LoggedDuration for that user+service in the given month
export function computeHoursAndAmount(db, { userId, serviceId, year, month }) {
  const service = db.services.find((s) => s.ServiceID === serviceId);
  const enrollment = db.enrollments.find((e) => e.UserID === userId && e.ServiceID === serviceId);
  const matchedRate = service ? rateById(service, enrollment?.RateID) : null;
  const rate = Number(matchedRate?.Rate) || 0;
  const currency = matchedRate?.Currency || service?.Currency || "INR";
  const billingType = matchedRate?.BillingType || "Monthly";

  const monthScheduleItems = db.scheduleItems.filter((s) => {
    if (s.ServiceID !== serviceId) return false;
    const d = new Date(s.Date);
    return d.getFullYear() === year && d.getMonth() + 1 === month;
  });
  const scheduleIdSet = new Set(monthScheduleItems.map((s) => s.ScheduleID));

  const scheduledHours = monthScheduleItems.reduce((sum, s) => sum + (Number(s.Duration) || 0), 0);

  const attendedHours = db.attendanceItems
    .filter((a) => a.UserID === userId && scheduleIdSet.has(a.ScheduleItemID))
    .reduce((sum, a) => sum + (Number(a.LoggedDuration) || 0), 0);

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
  };
}
