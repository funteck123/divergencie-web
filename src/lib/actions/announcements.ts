"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getAnnouncements(targetRole?: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const actor = session.user as any;

  return await prisma.announcement.findMany({
    where: {
      isActive: true,
      OR: [
        { targetRole: "all" },
        { targetRole: null },
        { targetRole: actor.role },
        ...(targetRole ? [{ targetRole }] : []),
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function createAnnouncement(data: {
  title: string;
  body: string;
  priority?: string;
  targetRole?: string;
  targetDept?: string;
  expiresAt?: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const actor = session.user as any;
  if (actor.role !== "staff" && actor.role !== "management") throw new Error("Forbidden");

  const ann = await prisma.announcement.create({
    data: {
      title: data.title,
      body: data.body,
      priority: data.priority ?? "low",
      targetRole: data.targetRole ?? "all",
      targetDept: data.targetDept,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
    },
  });

  revalidatePath("/portal/staff/pr");
  revalidatePath("/portal/management/announcements");
  return ann;
}

export async function archiveAnnouncement(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const actor = session.user as any;
  if (actor.role !== "staff" && actor.role !== "management") throw new Error("Forbidden");

  const ann = await prisma.announcement.update({ where: { id }, data: { isActive: false } });
  revalidatePath("/portal/staff/pr");
  revalidatePath("/portal/management/announcements");
  return ann;
}

export async function getChecklistTemplates() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  return await prisma.checklistTemplate.findMany({
    where: { isActive: true },
    include: { items: { orderBy: { order: "asc" } } },
    orderBy: { name: "asc" },
  });
}

export async function createChecklistTemplate(data: { name: string; entityType: string; items: string[] }) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const actor = session.user as any;
  if (actor.role !== "staff" && actor.role !== "management") throw new Error("Forbidden");

  const template = await prisma.checklistTemplate.create({
    data: {
      name: data.name,
      entityType: data.entityType,
      items: {
        create: data.items.map((label, order) => ({ label, order, isActive: true })),
      },
    },
    include: { items: true },
  });
  revalidatePath("/portal/staff/pr");
  return template;
}

export async function getChecklistEntries(entityType: string, entityId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  return await prisma.checklistEntry.findMany({
    where: { entityType, entityId },
    include: {
      template: { include: { items: true } },
      items: true,
    },
  });
}

export async function createChecklistEntry(data: { templateId: string; entityType: string; entityId: string }) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const actor = session.user as any;

  const template = await prisma.checklistTemplate.findUnique({
    where: { id: data.templateId },
    include: { items: true },
  });
  if (!template) throw new Error("Template not found");

  const entry = await prisma.checklistEntry.create({
    data: {
      templateId: data.templateId,
      entityType: data.entityType,
      entityId: data.entityId,
      userId: actor.id,
      items: {
        create: template.items.map((item: any) => ({
          templateItemId: item.id,
          checked: false,
        })),
      },
    },
    include: { items: true },
  });
  revalidatePath("/portal/staff/pr");
  return entry;
}

export async function toggleChecklistItem(itemEntryId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const item = await prisma.checklistItemEntry.findUnique({ where: { id: itemEntryId } });
  if (!item) throw new Error("Not found");

  const updated = await prisma.checklistItemEntry.update({
    where: { id: itemEntryId },
    data: { checked: !item.checked, checkedAt: !item.checked ? new Date() : null },
  });
  revalidatePath("/portal/staff/pr");
  return updated;
}
