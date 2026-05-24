import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

// POST /api/tickets - Create a new ticket
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const role = session.user.role;

  try {
    const { title, description, department, priority, assigneeId, category, attachmentLink } =
      await req.json();

    if (!title || !description) {
      return NextResponse.json({ error: "Title and Description required" }, { status: 400 });
    }

    // Role-based restrictions
    if (role === "candidate" && department !== "HR") {
      return NextResponse.json(
        { error: "Forbidden: Candidates can only create tickets for HR." },
        { status: 403 }
      );
    }

    const externalRoles = ["student", "teacher", "ambassador", "parent"];
    const validExternalDepts = ["HR", "Marketing", "Finance", "IT", "PR"];
    if (externalRoles.includes(role) && !validExternalDepts.includes(department)) {
      return NextResponse.json(
        { error: `Forbidden: ${role} can only create tickets for ${validExternalDepts.join(", ")}.` },
        { status: 403 }
      );
    }

    const ticket = await prisma.$transaction(async (tx) => {
      // Generate displayId — use prefix match to avoid date range mutation bug and race condition
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
          category: category || null,
          attachmentLink: attachmentLink || null,
          priority: priority || "NORMAL",
          creatorId: userId,
          assigneeId: externalRoles.concat(["candidate"]).includes(role)
            ? null
            : assigneeId || null,
          status: "OPEN",
        },
      });

      await tx.ticketHistory.create({
        data: { ticketId: t.id, actorId: userId, action: "CREATED" },
      });

      return t;
    });

    return NextResponse.json(ticket, { status: 201 });
  } catch (error) {
    console.error("[TICKET_POST]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// GET /api/tickets - List tickets based on role and department
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const role = session.user.role;
  const dept = session.user.dept;

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    let where: any = {};

    if (role === "management") {
      where = {};
    } else if (role === "staff") {
      where = {
        OR: [
          { department: dept },
          { creatorId: userId },
          { assigneeId: userId },
          { history: { some: { actorId: userId } } },
        ],
      };
    } else {
      where = {
        OR: [
          { creatorId: userId },
          { assigneeId: userId },
          { history: { some: { actorId: userId } } },
        ],
      };
    }

    if (status) where.status = status;

    // List view: minimal includes — no full message threads
    const tickets = await prisma.ticket.findMany({
      where,
      include: {
        creator: { select: { name: true, email: true, role: true } },
        assignee: { select: { name: true, email: true } },
        _count: { select: { messages: true } },
        history: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { actor: { select: { name: true, role: true, dept: true } } },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 200,
    });

    return NextResponse.json(tickets);
  } catch (error) {
    console.error("[TICKETS_GET]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
