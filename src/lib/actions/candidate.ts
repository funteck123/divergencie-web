"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function submitCandidateDocs(data: {
  email: string;
  cvLink: string;
  docsLink: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const candidate = await prisma.candidate.upsert({
    where: { email: data.email },
    update: { cvLink: data.cvLink, docsLink: data.docsLink },
    create: {
      email: data.email,
      name: data.email.split("@")[0],
      cvLink: data.cvLink,
      docsLink: data.docsLink,
    },
  });

  revalidatePath("/portal/candidate");
  return candidate;
}

export async function requestInterview(email: string, date: Date) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const candidate = await prisma.candidate.update({
    where: { email },
    data: { interviewRequestedAt: date },
  });

  revalidatePath("/portal/candidate");
  return candidate;
}

export async function getCandidateByEmail(email: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  return prisma.candidate.findUnique({ where: { email } });
}
