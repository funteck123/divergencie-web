import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { stripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { invoiceId } = await req.json();
    if (!invoiceId) {
      return NextResponse.json({ error: "Invoice ID is required" }, { status: 400 });
    }

    const invoice = await prisma.studentInvoice.findUnique({
      where: { id: invoiceId },
      include: {
        student: true,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const user = session.user as any;
    const isSelf = user.id === invoice.studentId;
    let isParent = false;

    if (user.role?.toLowerCase() === "parent") {
      const student = await prisma.user.findUnique({
        where: { id: invoice.studentId },
        select: { parentId: true },
      });
      if (student?.parentId === user.id) {
        isParent = true;
      }
    }

    const isStaffOrManagement =
      user.role?.toLowerCase() === "staff" || user.role?.toLowerCase() === "management";

    if (!isSelf && !isParent && !isStaffOrManagement) {
      return NextResponse.json({ error: "Forbidden: Access denied" }, { status: 403 });
    }

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

    // Create Stripe Checkout session
    const stripeSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: invoice.currency.toLowerCase() || "gbp",
            product_data: {
              name: `DivergenCIE Tuition Invoice - ${invoice.month}`,
              description: `Invoice Serial: ${invoice.serialNo || invoice.id}`,
            },
            unit_amount: Math.round(invoice.netAmount * 100), // Stripe uses cents/pence
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      metadata: {
        invoiceId: invoice.id,
        studentId: invoice.studentId,
      },
      success_url: `${baseUrl}/portal/parent/fees?status=success&invoiceId=${invoice.id}`,
      cancel_url: `${baseUrl}/portal/parent/fees?status=cancelled&invoiceId=${invoice.id}`,
      customer_email: user.email || invoice.student.email || undefined,
    });

    return NextResponse.json({ url: stripeSession.url, sessionId: stripeSession.id });
  } catch (error: any) {
    console.error("[STRIPE_CHECKOUT]", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
