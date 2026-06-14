import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { generateWhatsAppLink } from "@/lib/whatsapp";

// GET /api/invoices/[id]/whatsapp-reminder — get details for WhatsApp link
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const role = user.role?.toLowerCase();
  const dept = user.dept?.toLowerCase();

  if (role !== "management" && !(role === "staff" && dept === "finance")) {
    return NextResponse.json({ error: "Forbidden: Finance or Management required" }, { status: 403 });
  }

  const { id } = await params;

  const invoice = await prisma.studentInvoice.findUnique({
    where: { id },
    include: {
      student: {
        include: {
          parent: true
        }
      }
    }
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const stageQuery = req.nextUrl.searchParams.get("stage");
  const stage = stageQuery ? parseInt(stageQuery) : invoice.reminderStage || 1;

  const result = generateWhatsAppLink(
    invoice,
    invoice.student,
    invoice.student.parent,
    stage
  );

  return NextResponse.json({
    ...result,
    stage
  });
}

// PATCH /api/invoices/[id]/whatsapp-reminder — update reminderStage (prevent skipping)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const role = user.role?.toLowerCase();
  const dept = user.dept?.toLowerCase();

  if (role !== "management" && !(role === "staff" && dept === "finance")) {
    return NextResponse.json({ error: "Forbidden: Finance or Management required" }, { status: 403 });
  }

  const { id } = await params;
  const { stage } = await req.json().catch(() => ({}));

  if (stage === undefined || typeof stage !== "number") {
    return NextResponse.json({ error: "Invalid stage parameter" }, { status: 400 });
  }

  const invoice = await prisma.studentInvoice.findUnique({ where: { id } });
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  const currentStage = invoice.reminderStage || 0;

  // Rule: Stage tracker per student prevents skipping (must go to currentStage + 1, or can go to acknowledgment/payment plan)
  // Stage 4 (Acknowledgment) or Stage 5 (Payment Plan) can be transitioned to at any time, but stages 1 -> 2 -> 3 must be sequential.
  if (stage <= 3 && stage > currentStage + 1) {
    return NextResponse.json({
      error: `Cannot skip stages. Current stage is ${currentStage}, proposed is ${stage}.`
    }, { status: 400 });
  }

  const updatedInvoice = await prisma.studentInvoice.update({
    where: { id },
    data: { reminderStage: stage },
  });

  return NextResponse.json(updatedInvoice);
}
