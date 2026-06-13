"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";

async function requireStaffAccess() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const actor = session.user as any;
  if (actor.role !== "staff" && actor.role !== "management") throw new Error("Forbidden");
  return actor;
}

export async function getAssets(dept?: string, query?: string) {
  await requireStaffAccess();

  const items = await prisma.contentBankItem.findMany({
    where: {
      isActive: true,
      ...(dept && dept !== "all" ? { dept } : {}),
      ...(query ? { OR: [{ name: { contains: query, mode: "insensitive" } }, { description: { contains: query, mode: "insensitive" } }] } : {}),
    },
    orderBy: { dateAdded: "desc" },
    take: 200,
  });

  return items.map(item => {
    let type = "Other";
    let campaignTag = "";
    try {
      if (item.description) {
        const parsed = JSON.parse(item.description);
        type = parsed.type || "Other";
        campaignTag = parsed.campaignTag || "";
      }
    } catch {
      type = item.description || "Other";
    }

    return {
      id: item.id,
      name: item.name,
      type,
      driveLink: item.url,
      dept: item.dept,
      campaignTag,
      createdAt: item.dateAdded || new Date(),
    };
  });
}

export async function createAsset(data: {
  name: string;
  type: string;
  driveLink: string;
  dept: string;
  campaignTag?: string;
}) {
  const actor = await requireStaffAccess();

  const asset = await prisma.contentBankItem.create({
    data: {
      name: data.name,
      url: data.driveLink,
      dept: data.dept,
      description: JSON.stringify({ type: data.type, campaignTag: data.campaignTag || "" }),
      addedByUserId: actor.id,
      dateAdded: new Date(),
    }
  });

  revalidatePath("/portal/staff/shared/content-bank");
  revalidatePath("/portal/management");
  return {
    id: asset.id,
    name: asset.name,
    type: data.type,
    driveLink: asset.url,
    dept: asset.dept,
    campaignTag: data.campaignTag,
    createdAt: asset.dateAdded || new Date(),
  };
}

export async function deleteAsset(id: string) {
  await requireStaffAccess();

  await prisma.contentBankItem.delete({ where: { id } });
  revalidatePath("/portal/staff/shared/content-bank");
}
