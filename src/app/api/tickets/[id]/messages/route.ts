import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

// POST /api/tickets/[id]/messages - Reply to ticket
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const userId = session.user.id;
  const role = session.user.role;

  try {
    const { body, isInternal, attachmentLink } = await req.json();

    if (!body) return NextResponse.json({ error: "Body required" }, { status: 400 });

    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) return NextResponse.json({ error: "Not Found" }, { status: 404 });

    // Internal notes only for staff/management
    const setInternal = isInternal && (role === "staff" || role === "management");

    const message = await prisma.$transaction(async (tx) => {
      const m = await tx.ticketMessage.create({
        data: {
          ticketId: id,
          senderId: userId,
          body,
          isInternal: setInternal,
          attachmentLink: attachmentLink || null,
        }
      });

      await tx.ticketHistory.create({
        data: {
          ticketId: id,
          actorId: userId,
          action: "REPLIED",
        }
      });

      // Update ticket updatedAt
      await tx.ticket.update({
        where: { id },
        data: { updatedAt: new Date() }
      });

      return m;
    });

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error("[TICKET_MESSAGE_POST]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
