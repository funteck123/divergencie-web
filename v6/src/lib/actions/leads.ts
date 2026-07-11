"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

// Public-facing lead creation (contact form) — no auth required
export async function createLead(data: {
  name: string;
  email: string;
  phone?: string;
  source?: string;
  notes?: string;
}) {
  try {
    const lead = await prisma.lead.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        source: data.source || "Web Contact Form",
        notes: data.notes,
        status: "new",
      },
    });
    return { success: true, id: lead.id };
  } catch (err: any) {
    console.error("Lead Creation Error:", err);
    return { success: false, error: err.message };
  }
}

// Staff-only: read and manage leads
export async function getLeads(query?: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const actor = session.user as any;
  if (actor.role !== "staff" && actor.role !== "management") throw new Error("Forbidden");

  return await prisma.lead.findMany({
    where: query
      ? {
          OR: [
            { name: { contains: query } },
            { email: { contains: query } },
            { source: { contains: query } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function updateLeadStatus(id: string, status: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const actor = session.user as any;
  if (actor.role !== "staff" && actor.role !== "management") throw new Error("Forbidden");

  const lead = await prisma.lead.update({ where: { id }, data: { status } });
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/portal/staff/marketing/leads");
  return lead;
}
