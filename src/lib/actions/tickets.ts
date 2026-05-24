"use server";

/**
 * Legacy server actions for tickets.
 * NOTE: New code should use the REST API at /api/tickets instead.
 * These are retained for backward compatibility with existing call sites
 * but all now validate session and derive creatorId from the session.
 */

import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createTicket(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const actor = session.user as any;

  const title =
    (formData.get("title") as string) || (formData.get("subject") as string);
  const description =
    (formData.get("description") as string) || (formData.get("body") as string);
  const department = formData.get("department") as string;
  const priority = formData.get("priority") as string;

  if (!title || !description) throw new Error("Title and description are required");

  // Always derive creatorId from the authenticated session — never from form input
  const creatorId = actor.id as string;

  const ticket = await prisma.$transaction(async (tx) => {
    // Generate displayId correctly
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const dateStr = `${yyyy}${mm}${dd}`;

    const countToday = await tx.ticket.count({
      where: { displayId: { startsWith: dateStr } },
    });
    const displayId = `${dateStr}-${String(countToday + 1).padStart(4, "0")}`;

    const t = await tx.ticket.create({
      data: {
        displayId,
        title,
        description,
        department,
        originalDept: department,
        priority: (priority || "NORMAL").toUpperCase(),
        status: "OPEN",
        creatorId,
      },
    });

    await tx.ticketHistory.create({
      data: { ticketId: t.id, actorId: creatorId, action: "CREATED" },
    });

    return t;
  });

  revalidatePath("/portal/student/support");
  revalidatePath("/portal/staff/tickets");
  return ticket;
}

export async function getTickets(userId?: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  return await prisma.ticket.findMany({
    where: userId ? { OR: [{ creatorId: userId }, { assigneeId: userId }] } : {},
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      creator: { select: { name: true, email: true, role: true } },
      assignee: { select: { name: true, email: true } },
      _count: { select: { messages: true } },
    },
  });
}

export async function replyToTicket(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const actor = session.user as any;

  const ticketId = formData.get("ticketId") as string;
  const body = formData.get("body") as string;

  if (!ticketId || !body) throw new Error("Missing required fields");

  // Always derive senderId from session
  const senderId = actor.id as string;

  const message = await prisma.$transaction(async (tx) => {
    const m = await tx.ticketMessage.create({
      data: { ticketId, senderId, body },
    });

    await tx.ticketHistory.create({
      data: { ticketId, actorId: senderId, action: "REPLIED" },
    });

    await tx.ticket.update({
      where: { id: ticketId },
      data: { updatedAt: new Date() },
    });

    return m;
  });

  revalidatePath("/portal/student/support");
  revalidatePath("/portal/staff/tickets");
  return message;
}

export async function assignTicket(ticketId: string, assignedToId: string, actorId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const actor = session.user as any;
  if (actor.role !== "staff" && actor.role !== "management") throw new Error("Forbidden");

  const ticket = await prisma.$transaction(async (tx) => {
    const t = await tx.ticket.update({
      where: { id: ticketId },
      data: {
        assigneeId: assignedToId === "unassigned" ? null : assignedToId,
        updatedAt: new Date(),
      },
    });

    await tx.ticketHistory.create({
      data: {
        ticketId,
        actorId: actor.id,
        action: "ASSIGNED",
        meta: JSON.stringify({ to: assignedToId }),
      },
    });

    return t;
  });

  revalidatePath("/portal/staff/tickets");
  return ticket;
}

export async function updateTicketStatus(ticketId: string, status: string, actorId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const actor = session.user as any;

  const ticket = await prisma.$transaction(async (tx) => {
    const t = await tx.ticket.update({
      where: { id: ticketId },
      data: { status: status.toUpperCase(), updatedAt: new Date() },
    });

    await tx.ticketHistory.create({
      data: { ticketId, actorId: actor.id, action: status.toUpperCase() },
    });

    return t;
  });

  revalidatePath("/portal/student/support");
  revalidatePath("/portal/staff/tickets");
  return ticket;
}
