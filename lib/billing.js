// A Service now offers one or more rates (Service.Rates: [{ RateID, Currency,
// Rate }]) — duplicate currencies are allowed (e.g. two different USD tiers),
// so a rate is identified by its own RateID, not its currency. Whoever
// enrolls picks one specific rate, recorded as Enrollment.RateID.
// Service.Currency/Service.Rate stay in sync with Rates[0] for any older
// display code, but billing math always resolves through the enrollment's
// chosen RateID.
export function ratesOf(service) {
  if (Array.isArray(service?.Rates) && service.Rates.length > 0) return service.Rates;
  // Legacy single-currency service (or none) — synthesize a one-entry list.
  return [{ RateID: `${service?.ServiceID || "legacy"}-default`, Currency: service?.Currency || "INR", Rate: Number(service?.Rate) || 0 }];
}

export function rateById(service, rateId) {
  const rates = ratesOf(service);
  return rates.find((r) => r.RateID === rateId) || rates[0];
}

// Amount = (rate / ScheduledHours) * AttendedHours, where rate is whichever
// specific Rate entry the Student's Enrollment chose.
// ScheduledHours = sum of ScheduleItem.Duration for that service in the given month
// AttendedHours  = sum of AttendanceItem.LoggedDuration for that user+service in the given month
export function computeHoursAndAmount(db, { userId, serviceId, year, month }) {
  const service = db.services.find((s) => s.ServiceID === serviceId);
  const enrollment = db.enrollments.find((e) => e.UserID === userId && e.ServiceID === serviceId);
  const matchedRate = service ? rateById(service, enrollment?.RateID) : null;
  const rate = Number(matchedRate?.Rate) || 0;
  const currency = matchedRate?.Currency || service?.Currency || "INR";

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

  const amount = scheduledHours > 0 ? (rate / scheduledHours) * attendedHours : 0;

  return {
    scheduledHours,
    attendedHours,
    amount: Math.round(amount * 100) / 100,
    currency,
  };
}
