// Is an enrollment live in the week that starts on `today`? A weekly schedule picture shows the recurring pattern for the next
// seven days, so an enrollment counts when it has started by the last of those days and has not ended before today.
// Dates are "YYYY-MM-DD" strings (or empty for "no limit"), so plain string comparison is a correct date comparison.
export function addDays(dateStr, n) {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function isEnrollmentLiveThisWeek(enrollment, today) {
  const lastDay = addDays(today, 6);
  if (enrollment.StartDate && enrollment.StartDate > lastDay) return false;
  if (enrollment.EndDate && enrollment.EndDate < today) return false;
  return true;
}

export function todayString(now = new Date()) {
  return now.toISOString().slice(0, 10);
}
