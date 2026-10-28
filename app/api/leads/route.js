import { NextResponse } from "next/server";
import { readDB, writeDB, nextId } from "@/lib/db";
import { requireManagement } from "@/lib/authz";
import { sendEmail } from "@/lib/googleMail";
import { parseLeadBody, leadNotes, findDuplicate, ADMISSIONS_SOURCE } from "@/lib/leadForm";

// TKT-0169: who gets notified the moment a real inquiry comes in.
const LEAD_NOTIFICATION_RECIPIENTS = ["atiqa@dyeagency.co.uk", "team@divergencie.co.uk"];

// Public-facing lead creation (marketing site contact form and the /admissions student form) — no auth
// required, mirrors v6's src/lib/actions/leads.ts createLead() but backed
// by the same JSON store (later Firestore) as everything else, not Prisma.
// body: { name, email, whatsapp?, country?, phone?, source?, notes?, ... } — the full student form adds parent, level, subjects, etc.
// (TKT-0261): the rules (limits, honeypot, consent, duplicate check, readable notes) live in lib/leadForm.js and are tested there.
export async function POST(req) {
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 }); }
  const parsed = parseLeadBody(body);
  if (parsed.honeypot) return NextResponse.json({ lead: { LeadID: "" } });   // a bot: look successful, save nothing
  if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const f = parsed.lead;

  const db = await readDB();
  const now = new Date().toISOString();
  // The same person submitting again within 30 days adds a line to their lead; no second record, no second email.
  const dup = findDuplicate(db.leads, { email: f.email, whatsapp: f.whatsapp });
  if (dup) {
    // the repeat may carry a different name, email or WhatsApp number than the first one: keep them in the text
    const who = [f.name !== dup.Name && `name ${f.name}`, f.email !== String(dup.Email).toLowerCase() && `email ${f.email}`, f.whatsapp && f.whatsapp !== dup.WhatsAppNumber && `WhatsApp ${f.whatsapp}`].filter(Boolean).join(", ");
    dup.Notes = [dup.Notes, `--- Submitted again ${now.slice(0, 10)}${who ? ` (${who})` : ""} ---`, leadNotes(f)].filter(Boolean).join("\n");
    await writeDB(db, ["leads"]);
    return NextResponse.json({ lead: { LeadID: dup.LeadID }, duplicate: true });   // nothing of the earlier lead is shown to the submitter
  }

  const lead = {
    LeadID: await nextId(db, "LEAD"),
    Name: f.name,
    Email: f.email,
    WhatsAppNumber: f.whatsapp,
    Country: f.country,
    Phone: f.phone,
    Source: f.source,
    Notes: leadNotes(f),
    Status: "new",
    CreatedAt: now,
  };
  if (f.source === ADMISSIONS_SOURCE) {
    lead.Details = f.details;   // the structured answers; Notes above is the same text for people to read
    lead.ConsentAt = now;       // agreed to the Privacy Policy by ticking the box
  }
  db.leads.push(lead);
  await writeDB(db, ["leads"]);

  // Best-effort: a Gmail hiccup must never fail the actual lead submission
  // a real visitor is waiting on. The lead is already saved above either way.
  try {
    await sendEmail({
      to: LEAD_NOTIFICATION_RECIPIENTS,
      subject: `New inquiry: ${f.name}`,
      text: [
        `New inquiry submitted via the website (${lead.Source}).`,
        ``,
        `Name: ${f.name}`,
        `Email: ${f.email}`,
        `WhatsApp: ${f.whatsapp || "(not given)"}`,
        `Country: ${f.country || "(not given)"}`,
        ``,
        lead.Notes,
      ].join("\n"),
    });
  } catch (e) {
    console.error("leads POST: notification email failed", e);
  }

  return NextResponse.json({ lead });
}

// Management-only: read submitted leads.
export async function GET(req) {
  const { error } = requireManagement(req);
  if (error) return error;

  const db = await readDB();
  return NextResponse.json({ leads: db.leads });
}
