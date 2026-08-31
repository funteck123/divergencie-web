import { NextResponse } from "next/server";
import { readDB, writeDB, nextId } from "@/lib/db";
import { requireManagement } from "@/lib/authz";
import { sendEmail } from "@/lib/googleMail";

// TKT-0169: who gets notified the moment a real inquiry comes in.
const LEAD_NOTIFICATION_RECIPIENTS = ["atiqa@dyeagency.co.uk", "team@divergencie.co.uk"];

// Public-facing lead creation (marketing site contact form) — no auth
// required, mirrors v6's src/lib/actions/leads.ts createLead() but backed
// by the same JSON store (later Firestore) as everything else, not Prisma.
// body: { name, email, whatsapp?, country?, phone?, source?, notes? }
export async function POST(req) {
  const { name, email, whatsapp, country, phone, source, notes } = await req.json();
  if (!name || !email) {
    return NextResponse.json({ error: "name and email are required." }, { status: 400 });
  }

  const db = await readDB();
  const lead = {
    LeadID: await nextId(db, "LEAD"),
    Name: name,
    Email: email,
    WhatsAppNumber: whatsapp || "",
    Country: country || "",
    Phone: phone || "",
    Source: source || "Web Contact Form",
    Notes: notes || "",
    Status: "new",
    CreatedAt: new Date().toISOString(),
  };
  db.leads.push(lead);
  await writeDB(db, ["leads"]);

  // Best-effort: a Gmail hiccup must never fail the actual lead submission
  // a real visitor is waiting on. The lead is already saved above either way.
  try {
    await sendEmail({
      to: LEAD_NOTIFICATION_RECIPIENTS,
      subject: `New inquiry: ${name}`,
      text: [
        `New inquiry submitted via the website contact form.`,
        ``,
        `Name: ${name}`,
        `Email: ${email}`,
        `WhatsApp: ${whatsapp || "(not given)"}`,
        `Country: ${country || "(not given)"}`,
        `Source: ${lead.Source}`,
        ``,
        notes || "",
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
