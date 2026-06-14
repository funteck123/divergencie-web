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

export async function getKnowledgeBankItems(domainName?: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  if (domainName) {
    const domain = await prisma.knowledgeBankDomain.findFirst({ where: { name: domainName } });
    if (!domain) return [];
    const lists = await prisma.knowledgeBankList.findMany({ where: { domainId: domain.id } });
    const listIds = lists.map((l: any) => l.id);
    return await prisma.knowledgeBankItem.findMany({
      where: { isActive: true, listId: { in: listIds } },
      take: 100,
    });
  }

  return await prisma.knowledgeBankItem.findMany({
    where: { isActive: true },
    take: 100,
  });
}

export async function createKnowledgeBankItem(data: {
  title: string;
  summary: string;
  domainName: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const actor = session.user as any;
  if (actor.role !== "staff" && actor.role !== "management") throw new Error("Forbidden");

  let domain = await prisma.knowledgeBankDomain.findFirst({ where: { name: data.domainName } });
  if (!domain) domain = await prisma.knowledgeBankDomain.create({ data: { name: data.domainName, isActive: true } });

  let list = await prisma.knowledgeBankList.findFirst({ where: { domainId: domain.id } });
  if (!list) list = await prisma.knowledgeBankList.create({ data: { domainId: domain.id, isActive: true } });

  const item = await prisma.knowledgeBankItem.create({
    data: { listId: list.id, title: data.title, summary: data.summary, isActive: true },
  });

  revalidatePath("/portal/staff/it/roadmap");
  return item;
}
