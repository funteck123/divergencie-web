// A Service now offers one or more {Currency, Rate} pairs (Service.Rates) —
// a Student/Teacher/etc enrolling in it picks one of the offered currencies,
// recorded on their Enrollment. Service.Currency/Service.Rate are kept in
// sync with Rates[0] for any older display code, but billing math always
// resolves the actual rate through the enrollment's chosen currency.
export function ratesOf(service) {
  if (Array.isArray(service?.Rates) && service.Rates.length > 0) return service.Rates;
  // Legacy single-currency service (or none) — synthesize a one-entry list.
  return [{ Currency: service?.Currency || "INR", Rate: Number(service?.Rate) || 0 }];
}

export function rateFor(service, currency) {
  const rates = ratesOf(service);
  const match = rates.find((r) => r.Currency === currency);
  return match ? Number(match.Rate) || 0 : Number(rates[0].Rate) || 0;
}

// Amount = (rate / ScheduledHours) * AttendedHours, where rate is the
// Service's rate in whichever currency the Student's Enrollment chose.
// ScheduledHours = sum of ScheduleItem.Duration for that service in the given month
// AttendedHours  = sum of AttendanceItem.LoggedDuration for that user+service in the given month
export function computeHoursAndAmount(db, { userId, serviceId, year, month }) {
  const service = db.services.find((s) => s.ServiceID === serviceId);
  const enrollment = db.enrollments.find((e) => e.UserID === userId && e.ServiceID === serviceId);
  const currency = enrollment?.Currency || service?.Currency || "INR";
  const rate = service ? rateFor(service, currency) : 0;

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
