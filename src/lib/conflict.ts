import prisma from "./db";

export function getMinutesFromMidnight(d: Date | string) {
  const date = new Date(d);
  return date.getUTCHours() * 60 + date.getUTCMinutes();
}

export function checkTimeOverlap(
  start1: Date | string,
  end1: Date | string,
  start2: Date | string,
  end2: Date | string
) {
  const s1 = getMinutesFromMidnight(start1);
  const e1 = getMinutesFromMidnight(end1);
  const s2 = getMinutesFromMidnight(start2);
  const e2 = getMinutesFromMidnight(end2);
  return s1 < e2 && s2 < e1;
}

export function getDayOfWeekFromDate(d: Date | string) {
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  return days[new Date(d).getUTCDay()];
}

export async function detectScheduleConflict(
  serviceId: string,
  proposed: {
    dayOfWeek?: string | null;
    startTime: Date | string;
    endTime: Date | string;
    recurrenceType: string;
    oneOffDate?: Date | string | null;
    excludeOccurrenceId?: string;
  }
) {
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    include: {
      group: {
        include: {
          students: true
        }
      }
    }
  });

  if (!service) {
    throw new Error("Service not found");
  }

  const studentIds = service.group?.students.map(s => s.id) || [];

  // Query all active schedule occurrences for this teacher and students
  const occurrences = await prisma.scheduleOccurrence.findMany({
    where: {
      isActive: true,
      status: "ACTIVE",
      id: proposed.excludeOccurrenceId ? { not: proposed.excludeOccurrenceId } : undefined,
      OR: [
        {
          schedule: {
            service: {
              teacherId: service.teacherId
            }
          }
        },
        {
          schedule: {
            service: {
              group: {
                students: {
                  some: {
                    id: { in: studentIds }
                  }
                }
              }
            }
          }
        }
      ]
    },
    include: {
      schedule: {
        include: {
          service: {
            include: {
              teacher: { select: { id: true, name: true } },
              group: {
                include: {
                  students: { select: { id: true, name: true } }
                }
              }
            }
          }
        }
      }
    }
  });

  const conflicts: Array<{
    type: "teacher" | "student";
    userId: string;
    userName: string;
    reason: string;
    conflictingOccurrence: any;
  }> = [];

  const propRecur = proposed.recurrenceType.toUpperCase();
  const propDay = proposed.dayOfWeek?.toLowerCase();
  const propOneOff = proposed.oneOffDate ? new Date(proposed.oneOffDate).toISOString().split("T")[0] : null;

  for (const occ of occurrences) {
    const occRecur = occ.recurrenceType.toUpperCase();
    const occDay = occ.dayOfWeek?.toLowerCase();
    const occOneOff = occ.oneOffDate ? new Date(occ.oneOffDate).toISOString().split("T")[0] : null;

    let dayMatches = false;

    // 1. Both are Weekly
    if (propRecur === "WEEKLY" && occRecur === "WEEKLY") {
      if (propDay === occDay) dayMatches = true;
    }
    // 2. Proposed is One-Off, Existing is Weekly
    else if (propRecur === "ONE_OFF" && occRecur === "WEEKLY") {
      if (proposed.oneOffDate) {
        const propDateDay = getDayOfWeekFromDate(proposed.oneOffDate);
        if (propDateDay === occDay) dayMatches = true;
      }
    }
    // 3. Proposed is Weekly, Existing is One-Off
    else if (propRecur === "WEEKLY" && occRecur === "ONE_OFF") {
      if (occ.oneOffDate) {
        const occDateDay = getDayOfWeekFromDate(occ.oneOffDate);
        if (occDateDay === propDay) dayMatches = true;
      }
    }
    // 4. Both are One-Off
    else if (propRecur === "ONE_OFF" && occRecur === "ONE_OFF") {
      if (propOneOff && occOneOff && propOneOff === occOneOff) {
        dayMatches = true;
      }
    }

    if (dayMatches) {
      const isOverlap = checkTimeOverlap(proposed.startTime, proposed.endTime, occ.startTime, occ.endTime);
      if (isOverlap) {
        // Find if it conflicts with teacher
        if (occ.schedule.service.teacherId === service.teacherId) {
          conflicts.push({
            type: "teacher",
            userId: service.teacherId,
            userName: occ.schedule.service.teacher?.name || "Teacher",
            reason: `Teacher is already scheduled for service "${occ.schedule.service.subjectName}"`,
            conflictingOccurrence: {
              id: occ.id,
              subjectName: occ.schedule.service.subjectName,
              dayOfWeek: occ.dayOfWeek,
              startTime: occ.startTime,
              endTime: occ.endTime,
              recurrenceType: occ.recurrenceType
            }
          });
        }

        // Find if it conflicts with any students
        const conflictingStudents = occ.schedule.service.group?.students.filter(s => studentIds.includes(s.id)) || [];
        for (const s of conflictingStudents) {
          conflicts.push({
            type: "student",
            userId: s.id,
            userName: s.name || "Student",
            reason: `Student ${s.name} is already scheduled for service "${occ.schedule.service.subjectName}"`,
            conflictingOccurrence: {
              id: occ.id,
              subjectName: occ.schedule.service.subjectName,
              dayOfWeek: occ.dayOfWeek,
              startTime: occ.startTime,
              endTime: occ.endTime,
              recurrenceType: occ.recurrenceType
            }
          });
        }
      }
    }
  }

  return conflicts;
}
