import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { canPerform, TicketAction } from "@/lib/ticketPermissions";

// GET /api/tickets/[id] - Get single ticket with full thread
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const role = session.user.role;
  const userId = session.user.id;

  try {
    const isStaffOrManagement = role === "management" || role === "staff";

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        creator: { select: { name: true, email: true, role: true } },
        assignee: { select: { name: true, email: true, role: true } },
        history: {
          include: { actor: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
        },
        messages: {
          // Filter internal messages in the query, not in application code
          where: isStaffOrManagement ? {} : { isInternal: false },
          include: { sender: { select: { name: true, role: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!ticket) return NextResponse.json({ error: "Not Found" }, { status: 404 });

    if (!isStaffOrManagement && ticket.creatorId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(ticket);
  } catch (error) {
    console.error("[TICKET_GET_ID]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// PATCH /api/tickets/[id] - Update ticket (Assign, Forward, Close, Reopen, Reply)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const userId = session.user.id;
  const role = session.user.role || "";
  const subGroup = session.user.subGroup;

  try {
    const { action, assigneeId, department, note, body, isInternal, attachmentLink } =
      await req.json();

    if (assigneeId === userId) {
      return NextResponse.json(
        { error: "Forbidden: Cannot assign/forward a ticket to yourself." },
        { status: 403 }
      );
    }

    if (!canPerform(action as TicketAction, role, subGroup ?? null)) {
      if (action === "CLOSE") {
        const t = await prisma.ticket.findUnique({ where: { id } });
        if (t?.creatorId !== userId) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      } else {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) return NextResponse.json({ error: "Not Found" }, { status: 404 });

    const stack = JSON.parse((ticket as any).routingStack || "[]");
    const updateData: any = {};
    let historyAction = action;
    let meta: any = null;

    if (body) {
      await prisma.ticketMessage.create({
        data: {
          ticketId: id,
          senderId: userId,
          body,
          isInternal: !!(isInternal && (role === "staff" || role === "management")),
          attachmentLink: attachmentLink || null,
        },
      });
    }

    switch (action) {
      case "ASSIGN": {
        const assignPusherId = ticket.assigneeId || userId;
        const assignStack = [
          ...stack,
          { department: ticket.department, assigneeId: assignPusherId },
        ];
        updateData.routingStack = JSON.stringify(assignStack);
        updateData.assigneeId = assigneeId;
        updateData.status = "PROCESSING";
        historyAction = "ASSIGNED";
        break;
      }
      case "FORWARD": {
        if (!department) {
          return NextResponse.json(
            { error: "Target department is required for forwarding." },
            { status: 400 }
          );
        }
        const pusherId = ticket.assigneeId || userId;
        const newStack = [
          ...stack,
          { department: ticket.department, assigneeId: pusherId },
        ];
        updateData.routingStack = JSON.stringify(newStack);
        updateData.department = department;
        updateData.assigneeId = assigneeId || null;
        updateData.status = "PROCESSING";
        historyAction = "FORWARDED";
        meta = { from: ticket.department, to: department, note };
        break;
      }
      case "HANDBACK": {
        if (!stack || stack.length === 0) {
          updateData.department = ticket.originalDept || "PR";
          updateData.assigneeId = ticket.creatorId;
        } else {
          const last = stack.pop();
          updateData.routingStack = JSON.stringify(stack);
          updateData.department = last.department;
          updateData.assigneeId = last.assigneeId;
        }
        updateData.status = "PROCESSING";
        historyAction = "HANDED_BACK";
        break;
      }
      case "CLOSE":
        updateData.status = "CLOSED";
        historyAction = "CLOSED";
        break;
      case "REOPEN":
        updateData.status = "REOPENED";
        historyAction = "REOPENED";
        break;
      case "PROCESSING":
        updateData.status = "PROCESSING";
        historyAction = "PROCESSING";
        break;
      case "REPLY": {
        if (userId === ticket.creatorId && ticket.assigneeId === userId) {
          if (stack && stack.length > 0) {
            const last = stack.pop();
            updateData.routingStack = JSON.stringify(stack);
            updateData.department = last.department;
            updateData.assigneeId = last.assigneeId;
            historyAction = "REPLIED_AND_RETURNED";
          } else {
            const lastStaff = await prisma.ticketHistory.findFirst({
              where: {
                ticketId: id,
                action: { in: ["FORWARDED", "ASSIGNED", "HANDED_BACK"] },
                actor: { role: { in: ["staff", "management"] } },
              },
              orderBy: { createdAt: "desc" },
              include: { actor: true },
            });

            if (lastStaff && lastStaff.actorId !== userId) {
              updateData.assigneeId = lastStaff.actorId;
              updateData.department =
                (lastStaff.actor as any).dept || ticket.originalDept;
              historyAction = "REPLIED_AND_RETURNED";
            } else {
              updateData.assigneeId = null;
              updateData.department = ticket.originalDept;
              historyAction = "REPLIED";
            }
          }
        } else {
          historyAction = "REPLIED";
        }
        break;
      }
      default:
        return NextResponse.json({ error: "Invalid Action" }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const t = await tx.ticket.update({ where: { id }, data: updateData });
      await tx.ticketHistory.create({
        data: {
          ticketId: id,
          actorId: userId,
          action: historyAction,
          meta: meta ? JSON.stringify(meta) : null,
        },
      });
      return t;
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[TICKET_PATCH]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
