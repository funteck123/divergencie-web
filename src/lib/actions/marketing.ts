"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";

async function requireMarketingAccess() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const actor = session.user as any;
  if (actor.role !== "staff" && actor.role !== "management") throw new Error("Forbidden");
  return actor;
}

export async function getLeads(query?: string) {
  await requireMarketingAccess();

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

export async function createLead(data: {
  name: string;
  email?: string;
  phone?: string;
  source?: string;
  notes?: string;
}) {
  await requireMarketingAccess();

  const lead = await prisma.lead.create({ data });
  revalidatePath("/portal/staff/marketing/leads");
  return lead;
}

export async function updateLeadStatus(id: string, status: string) {
  await requireMarketingAccess();

  const lead = await prisma.lead.update({ where: { id }, data: { status } });
  revalidatePath("/portal/staff/marketing/leads");
  return lead;
}

export async function passLeadToPR(id: string, creatorEmail: string) {
  await requireMarketingAccess();

  const lead = await prisma.lead.update({
    where: { id },
    data: { status: "enrolled", passedToPR: true },
  });

  const creator = await prisma.user.findUnique({
    where: { email: creatorEmail },
    select: { id: true },
  });

  if (creator) {
    await prisma.ticket.create({
      data: {
        title: `New Lead Passed — ${lead.name}`,
        description: `Marketing passed lead ${lead.name} (${lead.email ?? lead.phone ?? "no contact"}) sourced from ${lead.source}. Please contact, qualify, and begin onboarding if confirmed.`,
        status: "OPEN",
        priority: "MEDIUM",
        department: "PR",
        category: "Onboarding",
        creatorId: creator.id,
      },
    });
    revalidatePath("/portal/staff/pr");
    revalidatePath("/portal/management");
  }

  revalidatePath("/portal/staff/marketing/leads");
  return lead;
}

export async function getMarketingPosts(status?: string) {
  await requireMarketingAccess();

  return await prisma.marketingPost.findMany({
    where: status ? { status } : undefined,
    orderBy: { scheduledAt: "asc" },
    take: 200,
  });
}

export async function createMarketingPost(data: {
  canvaLink?: string;
  driveLink?: string;
  caption?: string;
  scheduledAt: Date;
  contentType?: string;
  campaignTag?: string;
}) {
  await requireMarketingAccess();

  const post = await prisma.marketingPost.create({ data });
  revalidatePath("/portal/staff/marketing/calendar");
  return post;
}

export async function updatePostStatus(id: string, status: string) {
  await requireMarketingAccess();

  const post = await prisma.marketingPost.update({ where: { id }, data: { status } });
  revalidatePath("/portal/staff/marketing/calendar");
  return post;
}

export async function getMarketingStats() {
  await requireMarketingAccess();

  const [posts, ambassadors, leads] = await Promise.all([
    prisma.marketingPost.findMany({ select: { status: true } }),
    prisma.user.count({ where: { role: "ambassador", active: true } }),
    prisma.lead.count({ where: { passedToPR: false } }),
  ]);
  return {
    scheduled: posts.filter((p) => p.status === "scheduled").length,
    posted: posts.filter((p) => p.status === "posted").length,
    missed: posts.filter((p) => p.status === "missed").length,
    ambassadors,
    leads,
  };
}
