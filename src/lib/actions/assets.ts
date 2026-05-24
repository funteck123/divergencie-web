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

  return await prisma.asset.findMany({
    where: {
      ...(dept && dept !== "all" ? { dept } : {}),
      ...(query ? { OR: [{ name: { contains: query } }, { type: { contains: query } }] } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function createAsset(data: {
  name: string;
  type: string;
  driveLink: string;
  dept: string;
  campaignTag?: string;
}) {
  await requireStaffAccess();

  const asset = await prisma.asset.create({ data });
  revalidatePath("/portal/staff/shared/content-bank");
  revalidatePath("/portal/management");
  return asset;
}

export async function deleteAsset(id: string) {
  await requireStaffAccess();

  await prisma.asset.delete({ where: { id } });
  revalidatePath("/portal/staff/shared/content-bank");
}
