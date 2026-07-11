// Client-safe replacement for v6's "use server" src/lib/actions/leads.ts —
// that version wrote to Prisma/Postgres directly from a server action; v7's
// contact form is a "use client" component, so this just calls the plain
// API route (POST /api/leads) with the same createLead({...}) call shape
// the page already uses, keeping that edit to a single import line.
export async function createLead(data) {
  try {
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, error: body.error || "Could not submit enquiry." };
    return { success: true, id: body.lead.LeadID };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
