"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { revalidatePath, cacheLife, cacheTag, revalidateTag } from "next/cache";

async function requireManagementAccess() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const actor = session.user as any;
  if (actor.role !== "management") throw new Error("Forbidden");
  return actor;
}

async function requireStaffAccess() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const actor = session.user as any;
  if (actor.role !== "staff" && actor.role !== "management") throw new Error("Forbidden");
  return actor;
}

export async function getGlobalStats() {
  await requireManagementAccess();

  const [students, staff, tickets, claims] = await Promise.all([
    prisma.user.count({ where: { role: "student" } }),
    prisma.user.count({ where: { role: "staff" } }),
    prisma.ticket.count({ where: { status: "OPEN" } }),
    prisma.claim.count({ where: { status: "pending" } }),
  ]);

  return { students, staff, tickets, claims };
}

export async function getRecentActivity() {
  await requireStaffAccess();

  const [tickets, claims] = await Promise.all([
    prisma.ticket.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { creator: { select: { name: true } } },
    }),
    prisma.claim.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true } } },
    }),
  ]);

  const activity = [
    ...tickets.map((t: any) => ({
      id: t.id,
      type: "ticket",
      text: `New ticket: ${t.title}`,
      time: t.createdAt,
      author: t.creator.name,
    })),
    ...claims.map((c: any) => ({
      id: c.id,
      type: "claim",
      text: `New claim: ${c.month} (£${c.amount})`,
      time: c.createdAt,
      author: c.user.name,
    })),
  ].sort((a: any, b: any) => b.time.getTime() - a.time.getTime());

  return activity.slice(0, 5);
}

export async function approveClaim(claimId: string) {
  await requireManagementAccess();

  const claim = await prisma.claim.update({
    where: { id: claimId },
    data: { status: "approved" },
  });
  return claim;
}

export async function getDepartmentAudit() {
  await requireManagementAccess();

  const departments = ["PR", "IT", "HR", "Finance", "Marketing"];
  const stats = await Promise.all(
    departments.map(async (dept) => {
      const [tickets, meetings] = await Promise.all([
        prisma.ticket.count({ where: { department: dept } }),
        prisma.meeting.count({ where: { dept: dept } }),
      ]);
      return { name: dept, tickets, meetings };
    })
  );
  return stats;
}

export async function getStaffDashboardData(dept: string) {
  await requireStaffAccess();

  const [tickets, announcements] = await Promise.all([
    prisma.ticket.findMany({
      where: { department: dept },
      include: { creator: { select: { name: true, role: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.announcement.findMany({
      where: {
        OR: [
          { targetRole: "all" },
          { targetRole: "staff", targetDept: dept },
          { targetRole: "staff", targetDept: null },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return { tickets, announcements };
}

export async function getManagementDashboardData() {
  await requireManagementAccess();

  const [pendingClaims, urgentTickets] = await Promise.all([
    prisma.claim.findMany({
      where: { status: "pending" },
      include: { user: { select: { name: true, role: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.ticket.findMany({
      where: { OR: [{ status: "OPEN" }, { priority: "HIGH" }] },
      include: { creator: { select: { name: true, role: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return { pendingClaims, urgentTickets };
}

export async function getTeacherDashboardData(emailOrId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const user = await prisma.user.findFirst({
    where: { OR: [{ email: emailOrId }, { id: emailOrId }] },
    select: { id: true },
  });
  const userId = user?.id ?? emailOrId;
  const [tickets, announcements, lastClaim] = await Promise.all([
    prisma.ticket.findMany({
      where: { creatorId: userId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.announcement.findMany({
      where: { OR: [{ targetRole: "all" }, { targetRole: "teacher" }] },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.claim.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } }),
  ]);

  return { tickets, announcements, lastClaim };
}

export async function getManagementMetrics() {
  await requireManagementAccess();

  const [
    totalStudents,
    activeStudents,
    totalStaff,
    totalTeachers,
    openTickets,
    pendingClaims,
    totalSessions,
    totalAttendance,
    leads,
    posts,
    ambassadors,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "student" } }),
    prisma.user.count({ where: { role: "student", active: true } }),
    prisma.user.count({ where: { role: "staff", active: true } }),
    prisma.user.count({ where: { role: "teacher", active: true } }),
    prisma.ticket.count({ where: { status: { in: ["OPEN", "REOPENED"] } } }),
    prisma.claim.count({ where: { status: { in: ["pending", "submitted"] } } }),
    prisma.academicSession.count({ where: { status: "completed" } }),
    prisma.attendance.count({ where: { status: "present" } }),
    prisma.lead.count({ where: { passedToPR: false } }),
    prisma.marketingPost.count({ where: { status: "missed" } }),
    prisma.user.count({ where: { role: "ambassador", active: true } }),
  ]);

  const staffList = await prisma.user.findMany({
    where: { role: { in: ["staff", "teacher"] }, active: true },
    select: { id: true, name: true, dept: true, role: true },
  });

  const [claimsByUser, ticketsByAssignee] = await Promise.all([
    prisma.claim.groupBy({
      by: ["userId"],
      _sum: { hours: true, sessions: true },
      where: { status: { in: ["approved", "paid"] } },
    }),
    prisma.ticket.groupBy({
      by: ["assigneeId"],
      _count: { id: true },
      where: { status: "CLOSED" },
    }),
  ]);

  const staff = staffList.map((s) => {
    const claims = claimsByUser.find((c) => c.userId === s.id);
    const tickets = ticketsByAssignee.find((t) => t.assigneeId === s.id);
    return {
      id: s.id,
      name: s.name,
      dept: s.dept ?? "—",
      role: s.role,
      totalSessions: claims?._sum.sessions ?? 0,
      totalHours: claims?._sum.hours ?? 0,
      closedTickets: tickets?._count.id ?? 0,
    };
  });

  return {
    overview: {
      totalStudents,
      activeStudents,
      totalStaff: totalStaff + totalTeachers,
      openTickets,
      pendingClaims,
      totalSessions,
      totalAttendance,
      leads,
      missedPosts: posts,
      ambassadors,
    },
    staff,
  };
}

export async function getManagementTrends() {
  await requireManagementAccess();

  const weeks: { label: string; start: Date; end: Date }[] = [];
  for (let i = 7; i >= 0; i--) {
    const end = new Date();
    end.setDate(end.getDate() - i * 7);
    const start = new Date(end);
    start.setDate(start.getDate() - 7);
    weeks.push({ label: `W${8 - i}`, start, end });
  }

  const [sessionsByWeek, ticketsByWeek, leadsByWeek] = await Promise.all([
    Promise.all(
      weeks.map((w) =>
        prisma.academicSession.count({
          where: { status: "completed", startTime: { gte: w.start, lt: w.end } },
        })
      )
    ),
    Promise.all(
      weeks.map((w) =>
        prisma.ticket.count({ where: { createdAt: { gte: w.start, lt: w.end } } })
      )
    ),
    Promise.all(
      weeks.map((w) =>
        prisma.lead.count({ where: { createdAt: { gte: w.start, lt: w.end } } })
      )
    ),
  ]);

  return {
    labels: weeks.map((w) => w.label),
    sessions: sessionsByWeek,
    tickets: ticketsByWeek,
    leads: leadsByWeek,
  };
}

async function _getAnnouncementsCached() {
  "use cache";
  cacheLife("minutes"); // Announcements can be urgent — revalidate every 2 min
  cacheTag("announcements");
  return prisma.announcement.findMany({ orderBy: { createdAt: "desc" }, take: 20 });
}

export async function getAnnouncements() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return _getAnnouncementsCached();
}

export async function createAnnouncement(data: {
  title: string;
  body: string;
  targetRole: string;
  priority: string;
}) {
  await requireManagementAccess();

  const ann = await prisma.announcement.create({ data });
  revalidateTag("announcements"); // Instant cache invalidation on new announcement
  revalidatePath("/portal/management");
  revalidatePath("/portal/student");
  revalidatePath("/portal/teacher");
  revalidatePath("/portal/staff");
  return ann;
}

export async function deleteAnnouncement(id: string) {
  await requireManagementAccess();

  await prisma.announcement.delete({ where: { id } });
  revalidateTag("announcements");
  revalidatePath("/portal/management");
}
