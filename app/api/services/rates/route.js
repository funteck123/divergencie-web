import { NextResponse } from "next/server";
import { readDB, writeDB, nextId } from "@/lib/db";
import { requireManagement } from "@/lib/authz";
import { batchesOf, validateRates } from "@/lib/billing";
import { logAudit } from "@/lib/logging";

// TKT-0015: lets Management mint a one-off custom Rate inline (from the
// bulk-enroll form) instead of only picking from a Service's already
// -defined Rates. Appends to the existing Batch.Rates array (or, for a
// role-based Service with no Batches, straight onto Service.Rates) — same
// shape and same validation as a Rate created via the full Service edit
// form (POST/PATCH /api/services), just without having to resend the
// entire Service body to add one Rate.
//
// body: { serviceId, batchId?, currency, rate, description?, billingType?, group? }
// batchId omitted/empty targets a role-based Service's own Rates list.
export async function POST(req) {
  const { session, error: authError } = requireManagement(req);
  if (authError) return authError;

  const { serviceId, batchId, currency, rate, description, billingType, group } = await req.json();
  if (!serviceId) return NextResponse.json({ error: "serviceId is required." }, { status: 400 });

  const db = await readDB();
  const service = db.services.find((s) => s.ServiceID === serviceId);
  if (!service) return NextResponse.json({ error: "Service not found." }, { status: 404 });

  const rateInput = { currency, rate, description, billingType, group };
  const ratesError = validateRates([rateInput]);
  if (ratesError) return NextResponse.json({ error: ratesError }, { status: 400 });

  let target;
  if (batchId) {
    target = batchesOf(service).find((b) => b.BatchID === batchId);
    if (!target) return NextResponse.json({ error: "Batch not found on this Service." }, { status: 404 });
  } else {
    if (batchesOf(service).length > 0) {
      return NextResponse.json({ error: "This Service has Batches — batchId is required." }, { status: 400 });
    }
    target = service;
  }

  const newRate = {
    RateID: await nextId(db, "RATE"),
    Currency: currency || "INR",
    Rate: Number(rate) || 0,
    Description: (description || "").trim(),
    BillingType: billingType || "Monthly",
    Group: group || "",
  };
  target.Rates = Array.isArray(target.Rates) ? target.Rates : [];
  target.Rates.push(newRate);

  await writeDB(db, ["services"]);
  await logAudit({
    actorUserId: session.userId,
    action: "edit",
    entityType: "Service",
    entityId: service.ServiceID,
    summary: `Added rate ${newRate.Currency} ${newRate.Rate} to "${service.Name}"${batchId ? ` (${target.BatchName})` : ""}`,
  });

  return NextResponse.json({ rate: newRate, service });
}
