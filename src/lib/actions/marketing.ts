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

  const posts = await prisma.marketingPost.findMany({
    where: status ? { status } : undefined,
    orderBy: { scheduledDate: "asc" },
    take: 200,
  });

  return posts.map(p => ({
    id: p.id,
    contentType: p.contentType,
    status: p.status,
    canvaLink: p.canvaLink,
    driveLink: p.driveLink,
    caption: p.caption,
    scheduledAt: p.scheduledDate,
    campaignTag: p.campaignTag,
  }));
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

  const post = await prisma.marketingPost.create({
    data: {
      canvaLink: data.canvaLink,
      driveLink: data.driveLink,
      caption: data.caption,
      scheduledDate: data.scheduledAt,
      contentType: data.contentType,
      campaignTag: data.campaignTag,
    }
  });

  revalidatePath("/portal/staff/marketing/calendar");
  return {
    ...post,
    scheduledAt: post.scheduledDate,
  };
}

export async function updatePostStatus(id: string, status: string) {
  await requireMarketingAccess();

  const post = await prisma.marketingPost.update({ where: { id }, data: { status } });
  revalidatePath("/portal/staff/marketing/calendar");
  return {
    ...post,
    scheduledAt: post.scheduledDate,
  };
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

export async function getCampaigns() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return await prisma.campaign.findMany({
    where: { isActive: true },
    include: { items: true, campaignTag: { select: { name: true } } },
    orderBy: { startDate: "desc" },
    take: 50,
  });
}

export async function createCampaign(data: { name: string; description?: string; status: string; startDate?: string; endDate?: string }) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const actor = session.user as any;
  if (actor.role !== "staff" && actor.role !== "management") throw new Error("Forbidden");

  const c = await prisma.campaign.create({
    data: {
      name: data.name,
      description: data.description,
      status: data.status,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
    },
  });
  revalidatePath("/portal/staff/marketing/calendar");
  return c;
}

export async function getOutreachItems() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return await prisma.outreachItem.findMany({
    where: { isActive: true },
    include: { outreachType: { select: { name: true } } },
    orderBy: { plannedDate: "desc" },
    take: 50,
  });
}

export async function createOutreachItem(data: {
  outreachTypeName: string;
  title: string;
  targetAudience: string;
  assignedToUserId: string;
  plannedDate: string;
  notes?: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const actor = session.user as any;
  if (actor.role !== "staff" && actor.role !== "management") throw new Error("Forbidden");

  const outreachType = await prisma.outreachType.findFirst({ where: { name: data.outreachTypeName } });
  if (!outreachType) throw new Error("Outreach type not found");

  const item = await prisma.outreachItem.create({
    data: {
      outreachTypeId: outreachType.id,
      title: data.title,
      targetAudience: data.targetAudience,
      assignedToUserId: data.assignedToUserId,
      plannedDate: new Date(data.plannedDate),
      status: "PLANNED",
      notes: data.notes,
    },
  });
  revalidatePath("/portal/staff/marketing/calendar");
  return item;
}

export async function getExhibitionItems() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return await prisma.exhibitionItem.findMany({
    where: { isActive: true },
    include: { exhibitionType: { select: { name: true } } },
    orderBy: { plannedDate: "desc" },
    take: 50,
  });
}

export async function createExhibitionItem(data: {
  exhibitionTypeName: string;
  title: string;
  venue: string;
  location: string;
  assignedToUserId: string;
  plannedDate: string;
  notes?: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const actor = session.user as any;
  if (actor.role !== "staff" && actor.role !== "management") throw new Error("Forbidden");

  const exhibitionType = await prisma.exhibitionType.findFirst({ where: { name: data.exhibitionTypeName } });
  if (!exhibitionType) throw new Error("Exhibition type not found");

  const item = await prisma.exhibitionItem.create({
    data: {
      exhibitionTypeId: exhibitionType.id,
      title: data.title,
      venue: data.venue,
      location: data.location,
      assignedToUserId: data.assignedToUserId,
      plannedDate: new Date(data.plannedDate),
      status: "PLANNED",
      notes: data.notes,
    },
  });
  revalidatePath("/portal/staff/marketing/calendar");
  return item;
}

export async function getMarketingSchedules() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return await prisma.marketingSchedule.findMany({
    where: { isActive: true },
    include: {
      occurrences: {
        include: { history: { orderBy: { changedAt: "desc" }, take: 5 }, postSlots: { take: 10 } },
      },
      createdBy: { select: { name: true } },
    },
    orderBy: { id: "desc" },
    take: 20,
  });
}
