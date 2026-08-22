import { NextResponse } from "next/server";
import { readDB, writeDB, nextId, deleteRecords } from "@/lib/db";
import { computeHoursAndAmount, ratesOf, rateById, isEnrollmentActiveForMonth, studentCurrencyOf, lineItemINR, refreshStudentTotal } from "@/lib/billing";
import { getRateToINR } from "@/lib/fxRates";
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
    const zeroItem = items.find((li) => Number(li.amount) <= 0);
    if (zeroItem) {
      return NextResponse.json({ error: `Amount for ${zeroItem.serviceId} must be greater than 0. A $0 invoice can't be created.` }, { status: 400 });
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
          InvoiceID: await nextId(db, "INV"),
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
          InvoiceID: await nextId(db, "INV"),
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
    await writeDB(db, ["invoices"]);
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
  // TKT-0110: "Rebuild Drafts" -- onlyStudentIds scopes generate to just
  // the selected people (an empty/omitted array means everyone, the
  // existing "Generate Drafts" behavior, unchanged); rebuild deletes their
  // existing DRAFT records for this exact month first, so stale
  // attendance/rate data doesn't linger in an already-generated line item
  // that generate's own dedup logic would otherwise just skip over.
  // Never touches a Sent invoice -- rebuilding only makes sense for drafts
  // nobody has acted on yet.
  const { year, month, onlyStudentIds, rebuild } = body;
  const y = Number(year);
  const m = Number(month);
  const db = await readDB();

  if (rebuild) {
    if (!Array.isArray(onlyStudentIds) || onlyStudentIds.length === 0) {
      return NextResponse.json({ error: "onlyStudentIds is required to rebuild." }, { status: 400 });
    }
    const onlySet = new Set(onlyStudentIds);
    const toDelete = db.invoices.filter(
      (i) => i.Status === "Draft" && i.Year === y && i.Month === m && onlySet.has(i.StudentID)
    );
    if (toDelete.length > 0) {
      db.invoices = db.invoices.filter((i) => !toDelete.includes(i));
      await deleteRecords(db, [{ collection: "invoices", ids: toDelete.map((i) => i.InvoiceID) }]);
    }
  }

  const studentIds = new Set(
    db.users
      .filter((u) => u.UserType === "Student" && (!onlyStudentIds || onlyStudentIds.includes(u.UserID)))
      .map((u) => u.UserID)
  );
  const studentEnrollments = db.enrollments.filter((e) => studentIds.has(e.UserID));

  const createdOneOffs = [];
  const createdLineItems = [];
  const touchedInvoiceIds = new Set();
  // Neither branch below creates a $0 invoice/line item anymore — an
  // enrollment that would bill nothing (no scheduled hours, or a OneOff
  // rate that computes to 0) is skipped and reported here instead, so
  // Management still sees exactly what didn't get billed and why, without
  // a real $0 record sitting in Billing needing manual cleanup.
  const skipped = [];

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

      const { amount, currency } = computeHoursAndAmount(db, { userId: enr.UserID, serviceId: enr.ServiceID, batchId: enr.BatchID, year: y, month: m, assumePresentIfUnlogged: true, fullFeeMode: true });
      if (amount <= 0) {
        skipped.push({ studentId: enr.UserID, serviceId: enr.ServiceID, batchId: enr.BatchID, reason: "OneOff rate computed to $0 — check the Service's Rate." });
        continue;
      }
      const fxRate = await getRateToINR(db, currency, y, m);
      const invoiceINRAmount = fxRate != null ? Math.round(amount * fxRate * 100) / 100 : 0;
      const invoice = {
        InvoiceID: await nextId(db, "INV"),
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

    // TKT-0035: unlike paychecks, an invoice bills for a scheduled class
    // even if nobody logged its attendance -- a Student can't withhold
    // payment just because logging didn't happen.
    const { scheduledHours, attendedHours, amount, currency, billingType, hasUnresolvedAttendance } = computeHoursAndAmount(db, {
      userId: enr.UserID,
      serviceId: enr.ServiceID,
      batchId: enr.BatchID,
      year: y,
      month: m,
      assumePresentIfUnlogged: true,
      fullFeeMode: true,
    });
    // A genuinely-zero scheduleless month for an active Monthly/Hourly
    // enrollment is the case Management needs to catch: missing
    // Occurrences, or a billing type left on the wrong default. Reported
    // via `skipped` (see above) instead of creating a $0 line item, so
    // there's no $0 invoice/line item left sitting in Billing to clean up
    // by hand. Checked before touching or creating any invoice, so a
    // student whose only enrollment this month is zero-schedule never
    // gets an empty invoice shell created for them either.
    if (scheduledHours <= 0) {
      skipped.push({ studentId: enr.UserID, serviceId: enr.ServiceID, batchId: enr.BatchID, reason: "No scheduled hours found for this Service/month. Check the Batch's schedule or its billing type." });
      continue;
    }
    // TKT-0037: an unresolved attendance conflict (the accepted record
    // disagrees with a still-present other one) doesn't block drafting.
    // Only Sending (see PATCH below) does, where it's actually money
    // going out.
    const lineItem = {
      ServiceID: enr.ServiceID,
      BatchID: enr.BatchID || "",
      ScheduledHours: scheduledHours,
      AttendedHours: attendedHours,
      Amount: amount,
      Currency: currency,
      HasAttendanceConflict: hasUnresolvedAttendance,
      ...(hasUnresolvedAttendance
        ? { Note: "Attendance for this subject has an unresolved conflict. Resolve it in the Schedule tab before sending this invoice." }
        : {}),
    };

    if (!invoice) {
      invoice = {
        InvoiceID: await nextId(db, "INV"),
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

  await writeDB(db, ["invoices"]);
  // One summary entry for the whole batch, not one per invoice/line item,
  // a monthly "Generate Drafts" run can touch dozens at once, and a
  // per-item audit entry for each would bury the log; ids are listed in
  // the snapshot for anyone who does need them.
  await logAudit({
    actorUserId: session.userId,
    action: rebuild ? "rebuild" : "generate",
    entityType: "Invoice",
    entityId: `${m}/${y}`,
    summary: `${rebuild ? "Rebuilt" : "Generated"} ${createdOneOffs.length} OneOff invoice(s) and ${createdLineItems.length} line item(s) across ${touchedInvoiceIds.size} invoice(s) for ${m}/${y}${rebuild ? ` (${onlyStudentIds.length} selected student(s), existing drafts deleted first)` : ""}, skipped ${skipped.length} that would have billed $0`,
    snapshot: { oneOffInvoiceIds: createdOneOffs.map((i) => i.InvoiceID), touchedInvoiceIds: [...touchedInvoiceIds], skipped },
  });
  // `created` kept as the combined list the Billing UI previously read for
  // its $0-warning count. Nothing in it carries a $0 Note anymore (those
  // are skipped, not created), so it's just the OneOff invoices plus every
  // new line item now. `skipped` is the new list the UI reads instead, to
  // show what didn't get billed and why.
  const created = [...createdOneOffs, ...createdLineItems.map((c) => c.lineItem)];
  return NextResponse.json({ created, skipped });
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
        assumePresentIfUnlogged: true,
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
    // TKT-0033: SentAt/PaidAt stamp the first time each transition
    // actually happens — never overwritten by a later edit that leaves
    // Status/StudentPaidFlag unchanged, and cleared back out if the flag
    // is ever unset (mark-as-unpaid), so it always reflects the CURRENT
    // paid state's own timestamp, not stale history.
    if (status !== undefined) {
      invoice.Status = status;
      if (status === "Sent" && !invoice.SentAt) invoice.SentAt = new Date().toISOString();
    }
    // inrAmount is a rare manual correction, not a normal edit path (the
    // per-line-item PATCH above is what keeps INRAmount in sync day to
    // day via deltas) — needed when that delta accounting is built on top
    // of an already-wrong baseline (e.g. a stale $0 from an FX lookup
    // that failed at generation time) and re-saving the same line item
    // amount nets a zero delta, so it can't self-correct.
    if (inrAmount !== undefined) {
      invoice.INRAmount = Number(inrAmount);
      await refreshStudentTotal(db, invoice);
    }
    if (inrDue !== undefined) invoice.INRDue = Number(inrDue);
    if (studentPaidFlag !== undefined) {
      invoice.StudentPaidFlag = Boolean(studentPaidFlag);
      invoice.PaidAt = studentPaidFlag ? invoice.PaidAt || new Date().toISOString() : "";
    }
    summary = managementOnly ? `Edited invoice ${invoice.InvoiceID}` : `Student self-reported invoice ${invoice.InvoiceID} as ${studentPaidFlag ? "paid" : "unpaid"}`;
  } else {
    // Legacy flat-shape (OneOff) invoice — unchanged behavior.
    if (scheduledHours !== undefined) invoice.ScheduledHours = Number(scheduledHours);
    if (attendedHours !== undefined) invoice.AttendedHours = Number(attendedHours);
    if (amount !== undefined) invoice.Amount = Number(amount);
    if (inrAmount !== undefined) invoice.INRAmount = Number(inrAmount);
    if (inrDue !== undefined) invoice.INRDue = Number(inrDue);
    if (status !== undefined) {
      invoice.Status = status;
      if (status === "Sent" && !invoice.SentAt) invoice.SentAt = new Date().toISOString();
    }
    if (studentPaidFlag !== undefined) {
      invoice.StudentPaidFlag = Boolean(studentPaidFlag);
      invoice.PaidAt = studentPaidFlag ? invoice.PaidAt || new Date().toISOString() : "";
    }
    summary = managementOnly ? `Edited invoice ${invoice.InvoiceID}` : `Student self-reported invoice ${invoice.InvoiceID} as ${studentPaidFlag ? "paid" : "unpaid"}`;
  }

  await writeDB(db, ["invoices"]);
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
  await deleteRecords(db, [{ collection: "invoices", ids: [invoiceId] }]);
  await logAudit({ actorUserId: session.userId, action: "delete", entityType: "Invoice", entityId: invoiceId, summary: `Deleted invoice ${invoiceId}`, snapshot: deleted });
  return NextResponse.json({ ok: true });
}
