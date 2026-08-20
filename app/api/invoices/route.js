import { NextResponse } from "next/server";
import { readDB, writeDB, nextId } from "@/lib/db";
import { computeHoursAndAmount, ratesOf, rateById, isEnrollmentActiveForMonth } from "@/lib/billing";
import { getRateToINR, convertINRAmount } from "@/lib/fxRates";
import { requireManagement, requireSelfOrParentOrManagement } from "@/lib/authz";
import { logAudit } from "@/lib/logging";

// Two Invoice shapes coexist in db.invoices, told apart by whether
// `LineItems` is present:
//
// - OneOff-billed (Books, Counselling, Admissions, ...): unchanged flat
//   shape from before this file was rewritten — ServiceID/BatchID/Amount/
//   Currency directly on the invoice, one ever per Student+Service+Batch,
//   never bundled into a month. They were never month-based billing to
//   begin with (see lib/billing.js's BILLING_TYPES doc), so folding them
//   into "one invoice per month" would just be forcing an unrelated concept
//   together for no reason.
// - Monthly/Hourly-billed: ONE combined Invoice per (StudentID, Year,
//   Month), covering every subject the student is billed for that month as
//   a LineItems[] entry: { ServiceID, BatchID, ScheduledHours,
//   AttendedHours, Amount, Currency, Note? }. Amount/Currency on the
//   invoice itself is the LineItems total converted into the student's own
//   profile Currency (student/parent-facing); INRAmount/INRDue are the
//   same total in INR (Management's internal accounting currency,
//   INRDue independently adjustable for partial-payment tracking, same
//   mechanic as before). Status/StudentPaidFlag/PaymentProofPath are a
//   single field for the whole month — paying means paying the full
//   month, no per-subject payment state.

function studentCurrencyOf(db, studentId) {
  return db.users.find((u) => u.UserID === studentId)?.Currency || "INR";
}

// INR-equivalent of one line item's native Amount, using the invoice's own
// (Year, Month) rate — same "rate as of the 1st of the invoice's own
// month" convention as getRateToINR itself. Returns 0 (not null) so a
// single unresolvable line item degrades gracefully rather than corrupting
// the whole invoice's running total; Management can always correct INRDue
// by hand same as before this existed.
async function lineItemINR(db, lineItem, year, month) {
  const rate = await getRateToINR(db, lineItem.Currency, year, month);
  if (rate == null) return 0;
  return Math.round((Number(lineItem.Amount) || 0) * rate * 100) / 100;
}

// Recomputes Amount (student's own currency, student/parent-facing) from
// the invoice's current INRAmount. Called once per touched invoice after
// INRAmount/INRDue have already been adjusted by the caller (via
// lineItemINR deltas) — never re-derives INRAmount itself here, so it
// can't clobber a manually-adjusted INRDue.
//
// invoice.Currency is deliberately NOT reassigned here — it's frozen once,
// at invoice creation, to whatever the student's profile Currency was at
// that time (same "locked at generation, not live" convention as every
// other FX figure on this record). Re-deriving it on every edit would mean
// an unrelated line-item correction on an old, already-Sent invoice could
// silently flip its displayed currency if the student's profile Currency
// changed sometime after it was billed.
async function refreshStudentTotal(db, invoice) {
  const converted = await convertINRAmount(db, invoice.INRAmount, invoice.Currency, invoice.Year, invoice.Month);
  if (converted != null) invoice.Amount = converted;
}

export async function GET(req) {
  const { error } = requireManagement(req);
  if (error) return error;

  const db = await readDB();
  return NextResponse.json({ invoices: db.invoices });
}

// action "generate": drafts/extends invoices for {year, month} — OneOff
// enrollments get their own standalone invoice (unchanged, one ever);
// Monthly/Hourly enrollments each become a LineItem on that student's one
// combined invoice for the month, creating it if it doesn't exist yet.
// Re-running for a month a student already has line items for only adds
// NEW ones (e.g. a mid-month enrollment) — existing line items are never
// touched by generate, only by an explicit PATCH.
// action "manual": adds a single ad-hoc LineItem (or standalone OneOff-
// shaped invoice, if no service applies) for cases the bulk generator
// doesn't cover.
export async function POST(req) {
  const { session, error: authError } = requireManagement(req);
  if (authError) return authError;

  const body = await req.json();
  const { action } = body;

  // body: either the original single-item shape (studentId, serviceId,
  // year, month, amount — unchanged, still used by the CLI/MCP "one
  // ad-hoc line item" tool) or { studentId, year, month, lineItems:
  // [{serviceId, amount}, ...] } for the Enrollments tab's multi-select
  // form: TKT-0037's duplicate-invoice hard-block (below) only fires
  // against what already existed BEFORE this request — every item in one
  // `lineItems` array is part of ONE atomic submission and lands on the
  // same fresh invoice together, exactly like checking several subjects
  // and hitting submit once always has.
  if (action === "manual") {
    const { studentId, year, month, serviceId, amount, lineItems: rawLineItems } = body;
    const items = Array.isArray(rawLineItems) ? rawLineItems : serviceId !== undefined ? [{ serviceId, amount }] : [];
    if (!studentId || !year || !month || items.length === 0 || items.some((li) => !li.serviceId || li.amount === undefined)) {
      return NextResponse.json(
        { error: "studentId, year, month, and at least one {serviceId, amount} line item are required." },
        { status: 400 }
      );
    }

    const db = await readDB();
    const y = Number(year);
    const m = Number(month);

    const oneOffCreated = [];
    let monthlyInvoice = null;
    // Only checked once, against state as of the start of this request —
    // multiple Monthly/Hourly items in the same `lineItems` array all
    // land on `monthlyInvoice` below without re-triggering this check
    // against each other.
    const existingMonthlyForMonth = db.invoices.find((i) => i.LineItems && i.StudentID === studentId && i.Year === y && i.Month === m);

    for (const li of items) {
      const service = db.services.find((s) => s.ServiceID === li.serviceId);
      // A student may hold more than one enrollment in the same Service
      // now (different Batches), so this resolves to whichever enrollment
      // is passed/found first — fine for the manual path, which a human
      // is filling in directly.
      const enrollment = db.enrollments.find((e) => e.UserID === studentId && e.ServiceID === li.serviceId);
      const batchId = enrollment?.BatchID;
      const matchedRate = service ? rateById(service, batchId, enrollment?.RateID) : null;
      const currency = enrollment?.Currency || (service ? ratesOf(service, batchId)[0].Currency : "INR");
      const invoiceAmount = Number(li.amount) || 0;

      if (matchedRate?.BillingType === "OneOff") {
        const already = db.invoices.some(
          (i) => !i.LineItems && i.StudentID === studentId && i.ServiceID === li.serviceId && i.BatchID === batchId
        );
        if (already) {
          return NextResponse.json(
            { error: `This is a One-off rate — an invoice for ${studentId}/${li.serviceId} already exists and none further will be created.` },
            { status: 400 }
          );
        }
        const fxRate = await getRateToINR(db, currency, y, m);
        const invoiceINRAmount = fxRate != null ? Math.round(invoiceAmount * fxRate * 100) / 100 : 0;
        const invoice = {
          InvoiceID: nextId(db, "INV"),
          StudentID: studentId,
          ServiceID: li.serviceId,
          BatchID: batchId || "",
          Year: y,
          Month: m,
          ScheduledHours: null,
          AttendedHours: null,
          Amount: invoiceAmount,
          Currency: currency,
          INRAmount: invoiceINRAmount,
          INRDue: invoiceINRAmount,
          Status: "Draft",
        };
        db.invoices.push(invoice);
        oneOffCreated.push(invoice);
        continue;
      }

      // Monthly/Hourly: a manual invoice always creates a brand-new
      // record for this student+month — if one already existed BEFORE
      // this request (either shape), that's a hard stop, not an append.
      // (Previously this appended a LineItem to whatever already
      // existed, letting Management top up a month's invoice with more
      // subjects in a LATER, separate action — deliberately removed:
      // Management now deletes the existing invoice first if it needs to
      // be regenerated, same explicit action every other "duplicate" in
      // this app already requires. Multiple subjects in ONE submission,
      // via `lineItems`, still all land together below.)
      if (existingMonthlyForMonth) {
        return NextResponse.json(
          { error: `An invoice already exists for this student for ${m}/${y} (${existingMonthlyForMonth.InvoiceID}). Delete it first if you need to recreate it.` },
          { status: 400 }
        );
      }
      if (!monthlyInvoice) {
        monthlyInvoice = {
          InvoiceID: nextId(db, "INV"),
          StudentID: studentId,
          Year: y,
          Month: m,
          LineItems: [],
          Amount: 0,
          Currency: studentCurrencyOf(db, studentId),
          INRAmount: 0,
          INRDue: 0,
          Status: "Draft",
        };
        db.invoices.push(monthlyInvoice);
      }
      const lineItem = { ServiceID: li.serviceId, BatchID: batchId || "", ScheduledHours: null, AttendedHours: null, Amount: invoiceAmount, Currency: currency };
      monthlyInvoice.LineItems.push(lineItem);
      const liINR = await lineItemINR(db, lineItem, y, m);
      monthlyInvoice.INRAmount = Math.round((monthlyInvoice.INRAmount + liINR) * 100) / 100;
      monthlyInvoice.INRDue = monthlyInvoice.INRAmount;
    }

    if (monthlyInvoice) await refreshStudentTotal(db, monthlyInvoice);
    await writeDB(db);
    for (const invoice of oneOffCreated) {
      await logAudit({ actorUserId: session.userId, action: "create", entityType: "Invoice", entityId: invoice.InvoiceID, summary: `Manual OneOff invoice for ${studentId} — ${invoice.Currency} ${invoice.Amount}`, snapshot: invoice });
    }
    if (monthlyInvoice) {
      await logAudit({ actorUserId: session.userId, action: "create", entityType: "Invoice", entityId: monthlyInvoice.InvoiceID, summary: `Manual invoice for ${studentId}, ${m}/${y} — ${monthlyInvoice.LineItems.length} line item(s)`, snapshot: monthlyInvoice });
    }
    const created = [...oneOffCreated, ...(monthlyInvoice ? [monthlyInvoice] : [])];
    // Legacy single-item shape (no `lineItems` array in the request) keeps
    // returning {invoice} exactly as before — the CLI/MCP tool never sends
    // more than one item, so `created` is always exactly one entry there.
    return NextResponse.json(Array.isArray(rawLineItems) ? { invoices: created } : { invoice: created[0] });
  }

  if (action !== "generate") {
    return NextResponse.json({ error: "action must be generate or manual." }, { status: 400 });
  }
  const { year, month } = body;
  const y = Number(year);
  const m = Number(month);
  const db = await readDB();

  const studentIds = new Set(db.users.filter((u) => u.UserType === "Student").map((u) => u.UserID));
  const studentEnrollments = db.enrollments.filter((e) => studentIds.has(e.UserID));

  const createdOneOffs = [];
  const createdLineItems = [];
  const touchedInvoiceIds = new Set();

  for (const enr of studentEnrollments) {
    if (!isEnrollmentActiveForMonth(enr, y, m)) continue;

    const service = db.services.find((s) => s.ServiceID === enr.ServiceID);
    const matchedRate = service ? rateById(service, enr.BatchID, enr.RateID) : null;
    const isOneOff = matchedRate?.BillingType === "OneOff";

    if (isOneOff) {
      const already = db.invoices.some(
        (i) => !i.LineItems && i.StudentID === enr.UserID && i.ServiceID === enr.ServiceID && i.BatchID === enr.BatchID
      );
      if (already) continue;

      const { amount, currency } = computeHoursAndAmount(db, { userId: enr.UserID, serviceId: enr.ServiceID, batchId: enr.BatchID, year: y, month: m });
      const fxRate = await getRateToINR(db, currency, y, m);
      const invoiceINRAmount = fxRate != null ? Math.round(amount * fxRate * 100) / 100 : 0;
      const invoice = {
        InvoiceID: nextId(db, "INV"),
        StudentID: enr.UserID,
        ServiceID: enr.ServiceID,
        BatchID: enr.BatchID || "",
        Year: y,
        Month: m,
        ScheduledHours: 0,
        AttendedHours: 0,
        Amount: amount,
        Currency: currency,
        INRAmount: invoiceINRAmount,
        INRDue: invoiceINRAmount,
        Status: "Draft",
      };
      db.invoices.push(invoice);
      createdOneOffs.push(invoice);
      continue;
    }

    // Monthly/Hourly — find or create this student's combined invoice for
    // the month, skip if a LineItem for this exact Service/Batch already
    // exists on it (already generated; generate never re-adds/re-touches
    // an existing line — that's PATCH's job).
    let invoice = db.invoices.find((i) => i.LineItems && i.StudentID === enr.UserID && i.Year === y && i.Month === m);
    if (invoice?.LineItems.some((li) => li.ServiceID === enr.ServiceID && li.BatchID === enr.BatchID)) continue;

    // Also skip if an OLD flat-shape invoice already covers this exact
    // Student/Service/Batch/Year/Month — i.e. this was already billed
    // under the pre-rewrite per-subject shape and just hasn't gone
    // through /api/invoices/migrate-monthly yet. Without this check,
    // running generate again for an already-invoiced month (before
    // migrating) would silently create a second, duplicate invoice for
    // the same subject instead of recognizing it as already billed.
    const oldFlatAlreadyExists = db.invoices.some(
      (i) => !i.LineItems && i.StudentID === enr.UserID && i.ServiceID === enr.ServiceID && i.BatchID === enr.BatchID && i.Year === y && i.Month === m
    );
    if (oldFlatAlreadyExists) continue;

    const { scheduledHours, attendedHours, amount, currency, billingType, hasUnresolvedAttendance } = computeHoursAndAmount(db, {
      userId: enr.UserID,
      serviceId: enr.ServiceID,
      batchId: enr.BatchID,
      year: y,
      month: m,
    });
    // Same "flag, don't fail" as before this rewrite — a genuinely-zero
    // scheduleless month for an active Monthly/Hourly enrollment is the
    // case Management needs to catch (missing Occurrences, or a billing
    // type left on the wrong default).
    const zeroScheduleWarning = scheduledHours <= 0;
    // TKT-0037: an unresolved attendance conflict (the accepted record
    // disagrees with a still-present other one) doesn't block drafting —
    // only Sending (see PATCH below), where it's actually money going out.
    const lineItem = {
      ServiceID: enr.ServiceID,
      BatchID: enr.BatchID || "",
      ScheduledHours: scheduledHours,
      AttendedHours: attendedHours,
      Amount: amount,
      Currency: currency,
      HasAttendanceConflict: hasUnresolvedAttendance,
      ...(zeroScheduleWarning
        ? { Note: "$0 — no scheduled hours found for this Service/month. Check the Batch's schedule or its billing type." }
        : hasUnresolvedAttendance
        ? { Note: "⚠ Attendance for this subject has an unresolved conflict — resolve it in the Schedule tab before sending this invoice." }
        : {}),
    };

    if (!invoice) {
      invoice = {
        InvoiceID: nextId(db, "INV"),
        StudentID: enr.UserID,
        Year: y,
        Month: m,
        LineItems: [],
        Amount: 0,
        Currency: studentCurrencyOf(db, enr.UserID),
        INRAmount: 0,
        INRDue: 0,
        Status: "Draft",
      };
      db.invoices.push(invoice);
    }
    invoice.LineItems.push(lineItem);
    const liINR = await lineItemINR(db, lineItem, y, m);
    invoice.INRAmount = Math.round((invoice.INRAmount + liINR) * 100) / 100;
    invoice.INRDue = Math.round((invoice.INRDue + liINR) * 100) / 100;
    touchedInvoiceIds.add(invoice.InvoiceID);
    createdLineItems.push({ invoiceId: invoice.InvoiceID, lineItem });
  }

  for (const invoiceId of touchedInvoiceIds) {
    const invoice = db.invoices.find((i) => i.InvoiceID === invoiceId);
    await refreshStudentTotal(db, invoice);
  }

  await writeDB(db);
  // One summary entry for the whole batch, not one per invoice/line item —
  // a monthly "Generate Drafts" run can touch dozens at once, and a
  // per-item audit entry for each would bury the log; ids are listed in
  // the snapshot for anyone who does need them.
  await logAudit({
    actorUserId: session.userId,
    action: "generate",
    entityType: "Invoice",
    entityId: `${m}/${y}`,
    summary: `Generated ${createdOneOffs.length} OneOff invoice(s) and ${createdLineItems.length} line item(s) across ${touchedInvoiceIds.size} invoice(s) for ${m}/${y}`,
    snapshot: { oneOffInvoiceIds: createdOneOffs.map((i) => i.InvoiceID), touchedInvoiceIds: [...touchedInvoiceIds] },
  });
  // `created` kept as the combined list the Billing UI's $0-warning count
  // already reads (`created.filter(i => i.Note)`) — OneOff invoices carry
  // Note the same way they always did; line items carry it per-item, so
  // callers checking a whole invoice's Note won't see it — the UI reads
  // this raw list, not db.invoices, specifically to still catch those.
  const created = [...createdOneOffs, ...createdLineItems.map((c) => c.lineItem)];
  return NextResponse.json({ created });
}

// Monthly (LineItems) invoice body variants:
//   Line-item edit:  { invoiceId, lineItemIndex, scheduledHours?, attendedHours?, amount? } — Management only
//   Invoice-level:   { invoiceId, status?, inrDue?, studentPaidFlag? } — status/inrDue Management only,
//                    studentPaidFlag may also be set by the Student/Parent themselves
// OneOff (legacy flat) invoice body: { invoiceId, scheduledHours?, attendedHours?, amount?, inrAmount?, inrDue?, status?, studentPaidFlag? } — unchanged.
//
// lineItemIndex addresses a LineItems array position — safe only because
// generate()/manual() (above) exclusively APPEND to LineItems and nothing
// ever removes/reorders one; there is no per-line-item DELETE endpoint. If
// one is ever added, it must not use plain array splice — indices held by
// an in-flight client edit would silently point at the wrong subject.
export async function PATCH(req) {
  const body = await req.json();
  const { invoiceId, lineItemIndex, scheduledHours, attendedHours, amount, inrAmount, inrDue, status, studentPaidFlag } = body;
  const db = await readDB();
  const invoice = db.invoices.find((i) => i.InvoiceID === invoiceId);
  if (!invoice) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });

  const isLineItemInvoice = Array.isArray(invoice.LineItems);
  const managementOnly = [scheduledHours, attendedHours, amount, inrAmount, inrDue, status].some((v) => v !== undefined) || lineItemIndex !== undefined;
  const { session, error } = managementOnly
    ? requireManagement(req)
    : requireSelfOrParentOrManagement(req, db, invoice.StudentID);
  if (error) return error;

  // TKT-0037: an unresolved attendance conflict on any of this invoice's
  // own line items blocks moving it to Sent specifically — drafting was
  // never blocked (see the generate loop above), only actually sending
  // money out the door. Resolve via PATCH /api/attendance (Management
  // picks which record is correct), then Send again. Re-checked LIVE here
  // (not the line item's own stored HasAttendanceConflict, which is only
  // ever set once at creation) — `generate` deliberately never re-touches
  // an already-existing line item, so a stored flag would never clear
  // even after Management resolves the underlying conflict; recomputing
  // at Send time is what actually reflects the current state.
  if (status === "Sent" && isLineItemInvoice) {
    const conflicted = invoice.LineItems.filter((li) => {
      const { hasUnresolvedAttendance } = computeHoursAndAmount(db, {
        userId: invoice.StudentID,
        serviceId: li.ServiceID,
        batchId: li.BatchID,
        year: invoice.Year,
        month: invoice.Month,
      });
      return hasUnresolvedAttendance;
    });
    if (conflicted.length > 0) {
      return NextResponse.json(
        { error: `Can't send — ${conflicted.length} line item(s) have an unresolved attendance conflict. Resolve in the Schedule tab first.` },
        { status: 400 }
      );
    }
  }

  const before = JSON.parse(JSON.stringify(invoice));
  let summary;

  if (isLineItemInvoice && lineItemIndex !== undefined) {
    const li = invoice.LineItems[lineItemIndex];
    if (!li) return NextResponse.json({ error: "Line item not found." }, { status: 404 });

    const oldLiINR = await lineItemINR(db, li, invoice.Year, invoice.Month);
    if (scheduledHours !== undefined) li.ScheduledHours = Number(scheduledHours);
    if (attendedHours !== undefined) li.AttendedHours = Number(attendedHours);
    if (amount !== undefined) li.Amount = Number(amount);
    const newLiINR = await lineItemINR(db, li, invoice.Year, invoice.Month);

    const delta = Math.round((newLiINR - oldLiINR) * 100) / 100;
    invoice.INRAmount = Math.round((invoice.INRAmount + delta) * 100) / 100;
    invoice.INRDue = Math.round((invoice.INRDue + delta) * 100) / 100;
    await refreshStudentTotal(db, invoice);
    summary = `Edited line item ${lineItemIndex} on invoice ${invoice.InvoiceID}`;
  } else if (isLineItemInvoice) {
    // Amount/INRAmount are computed from LineItems, not directly settable
    // on a monthly invoice — only Status, INRDue (partial-payment
    // tracking, same manual-adjustment mechanic as before), and the
    // self-report flag are.
    if (status !== undefined) invoice.Status = status;
    if (inrDue !== undefined) invoice.INRDue = Number(inrDue);
    if (studentPaidFlag !== undefined) invoice.StudentPaidFlag = Boolean(studentPaidFlag);
    summary = managementOnly ? `Edited invoice ${invoice.InvoiceID}` : `Student self-reported invoice ${invoice.InvoiceID} as ${studentPaidFlag ? "paid" : "unpaid"}`;
  } else {
    // Legacy flat-shape (OneOff) invoice — unchanged behavior.
    if (scheduledHours !== undefined) invoice.ScheduledHours = Number(scheduledHours);
    if (attendedHours !== undefined) invoice.AttendedHours = Number(attendedHours);
    if (amount !== undefined) invoice.Amount = Number(amount);
    if (inrAmount !== undefined) invoice.INRAmount = Number(inrAmount);
    if (inrDue !== undefined) invoice.INRDue = Number(inrDue);
    if (status !== undefined) invoice.Status = status;
    if (studentPaidFlag !== undefined) invoice.StudentPaidFlag = Boolean(studentPaidFlag);
    summary = managementOnly ? `Edited invoice ${invoice.InvoiceID}` : `Student self-reported invoice ${invoice.InvoiceID} as ${studentPaidFlag ? "paid" : "unpaid"}`;
  }

  await writeDB(db);
  await logAudit({
    actorUserId: session.userId,
    action: "edit",
    entityType: "Invoice",
    entityId: invoice.InvoiceID,
    summary,
    snapshot: { before, after: invoice },
  });
  return NextResponse.json({ invoice });
}

// body: { invoiceId } — removes the whole invoice: for a monthly
// (LineItems) invoice, that's every subject billed that month at once, not
// one line within it (no per-line-item delete endpoint — a mistaken line
// is corrected via PATCH, not removed piecemeal).
export async function DELETE(req) {
  const { session, error: authError } = requireManagement(req);
  if (authError) return authError;

  const { invoiceId } = await req.json();
  const db = await readDB();
  const index = db.invoices.findIndex((i) => i.InvoiceID === invoiceId);
  if (index === -1) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });

  const [deleted] = db.invoices.splice(index, 1);
  await writeDB(db);
  await logAudit({ actorUserId: session.userId, action: "delete", entityType: "Invoice", entityId: invoiceId, summary: `Deleted invoice ${invoiceId}`, snapshot: deleted });
  return NextResponse.json({ ok: true });
}
