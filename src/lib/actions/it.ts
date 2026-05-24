"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";

async function requireITAccess() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const actor = session.user as any;
  if (actor.role !== "staff" && actor.role !== "management") throw new Error("Forbidden");
  return actor;
}

export async function getAccessLogs(query?: string) {
  await requireITAccess();

  return await prisma.accessLog.findMany({
    where: query
      ? {
          OR: [
            { staffName: { contains: query } },
            { toolName: { contains: query } },
            { credential: { contains: query } },
          ],
        }
      : undefined,
    orderBy: { dateGranted: "desc" },
    take: 200,
  });
}

export async function createAccessLog(data: {
  staffName: string;
  toolName: string;
  credential?: string;
  notes?: string;
}) {
  await requireITAccess();

  const log = await prisma.accessLog.create({ data });
  revalidatePath("/portal/staff/it/access");
  return log;
}

export async function revokeAccess(id: string) {
  await requireITAccess();

  const log = await prisma.accessLog.update({ where: { id }, data: { revoked: true } });
  revalidatePath("/portal/staff/it/access");
  return log;
}
