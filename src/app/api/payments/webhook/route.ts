import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import prisma from "@/lib/db";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  let event;

  try {
    if (!signature) {
      throw new Error("No Stripe signature found in headers");
    }
    // Webhook secret could be configured in environment. Fallback to mock secret in dev.
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "whsec_mock_secret_key_divergencie";
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Handle checkout.session.completed event
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as any;
    const invoiceId = session.metadata?.invoiceId;

    if (invoiceId) {
      try {
        // Find the invoice
        const invoice = await prisma.studentInvoice.findUnique({
          where: { id: invoiceId },
        });

        if (invoice) {
          // Update invoice
          await prisma.studentInvoice.update({
            where: { id: invoiceId },
            data: {
              status: "paid",
              paymentDone: true,
              paymentDate: new Date(),
              paymentMethod: "STRIPE_CARD",
              referenceNo: session.payment_intent || session.id,
            },
          });

          // Create payment record
          await prisma.paymentRecord.create({
            data: {
              entityType: "STUDENT_INVOICE",
              entityId: invoiceId,
              amount: invoice.netAmount,
              currency: invoice.currency,
              stripePaymentIntentId: session.payment_intent || session.id,
              status: "SUCCESSFUL",
              paidAt: new Date(),
              receiverConfirmed: true,
              confirmedAt: new Date(),
              notes: `Paid via Stripe Checkout. Session: ${session.id}`,
            },
          });

          // Find or create DC bank account to ledger this revenue
          let bankAccount = await prisma.bankAccount.findFirst({
            where: { isDcAccount: true, isActive: true },
          });
          if (!bankAccount) {
            bankAccount = await prisma.bankAccount.create({
              data: {
                label: "DC Operating Account",
                isDcAccount: true,
                currency: invoice.currency || "GBP",
                currentBalance: 0,
                isActive: true,
              },
            });
          }

          // Create LedgerEntry
          await prisma.ledgerEntry.create({
            data: {
              bankAccountId: bankAccount.id,
              amount: invoice.netAmount,
              direction: "credit",
              purpose: "revenue",
              studentInvoiceId: invoiceId,
            },
          });

          // Update bank account balance
          await prisma.bankAccount.update({
            where: { id: bankAccount.id },
            data: {
              currentBalance: {
                increment: invoice.netAmount,
              },
            },
          });

          // Log status change
          await prisma.studentInvoiceStatusChangeLog.create({
            data: {
              invoiceId: invoice.id,
              fromStatus: invoice.status,
              toStatus: "paid",
              changedByUserId: "stripe_webhook",
              reason: "Payment processed successfully via Stripe Checkout",
            },
          });

          // Create Notifications for Student and Parent
          const notifType = await prisma.notificationType.findUnique({
            where: { name: "PAYMENT_RECEIVED" },
          });

          if (notifType) {
            await prisma.notification.create({
              data: {
                userId: invoice.studentId,
                notificationTypeId: notifType.id,
                title: "Payment Received",
                body: `Payment of ${invoice.netAmount} ${invoice.currency || "GBP"} for invoice ${invoice.month} was successfully received.`,
                entityType: "STUDENT_INVOICE",
                entityId: invoiceId,
              },
            });

            const studentUser = await prisma.user.findUnique({
              where: { id: invoice.studentId },
              select: { parentId: true },
            });

            if (studentUser?.parentId) {
              await prisma.notification.create({
                data: {
                  userId: studentUser.parentId,
                  notificationTypeId: notifType.id,
                  title: "Payment Received",
                  body: `Payment of ${invoice.netAmount} ${invoice.currency || "GBP"} for your child's invoice (${invoice.month}) was successfully received.`,
                  entityType: "STUDENT_INVOICE",
                  entityId: invoiceId,
                },
              });
            }
          }
        }
      } catch (dbError) {
        console.error("Error updating database for webhook event:", dbError);
        return NextResponse.json({ error: "Database update failed" }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ received: true });
}

export const dynamic = "force-dynamic";
