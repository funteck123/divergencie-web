import { normalizeGroup } from "./scheduleGen";

// Amount = (baseRate / ScheduledHours) * AttendedHours
// baseRate is Service.Rate for Student/Teacher-eligible services (they carry
// Rate+Currency instead of MonthlyCost — see applyCohortServiceFields in
// api/services/route.js) and Service.MonthlyCost for everything else.
// ScheduledHours = sum of ScheduleItem.Duration for that service in the given month
// AttendedHours  = sum of AttendanceItem.LoggedDuration for that user+service in the given month
export function computeHoursAndAmount(db, { userId, serviceId, year, month }) {
  const service = db.services.find((s) => s.ServiceID === serviceId);
  const group = service ? normalizeGroup(service.Group) : [];
  const isCohort = group.includes("Student") || group.includes("Teacher");
  const monthlyCost = service ? Number(isCohort ? service.Rate : service.MonthlyCost) || 0 : 0;

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

  const amount = scheduledHours > 0 ? (monthlyCost / scheduledHours) * attendedHours : 0;

  return {
    scheduledHours,
    attendedHours,
    amount: Math.round(amount * 100) / 100,
  };
}
