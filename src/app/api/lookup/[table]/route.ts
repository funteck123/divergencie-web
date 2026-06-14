import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

const LOOKUP_MAP: Record<string, () => Promise<any[]>> = {
  departments: () => prisma.department.findMany({ orderBy: { name: "asc" } }),
  staffRoles: () => prisma.staffRole.findMany({ orderBy: { name: "asc" } }),
  userTypes: () => prisma.userType.findMany({ orderBy: { name: "asc" } }),
  sessionTypes: () => prisma.sessionType.findMany({ orderBy: { name: "asc" } }),
  ticketTypes: () => prisma.ticketType.findMany({ orderBy: { name: "asc" } }),
  notificationTypes: () => prisma.notificationType.findMany({ orderBy: { name: "asc" } }),
  flagTypes: () => prisma.flagType.findMany({ orderBy: { name: "asc" } }),
  recordTypes: () => prisma.recordType.findMany({ orderBy: { name: "asc" } }),
  mockTypes: () => prisma.mockType.findMany({ orderBy: { name: "asc" } }),
  ambassadorTestTypes: () => prisma.ambassadorTestType.findMany({ orderBy: { name: "asc" } }),
  outreachSources: () => prisma.outreachSource.findMany({ orderBy: { name: "asc" } }),
  socialPlatformTypes: () => prisma.socialPlatformType.findMany({ orderBy: { name: "asc" } }),
  socialPostTypes: () => prisma.socialPostType.findMany({ orderBy: { name: "asc" } }),
  campaignTags: () => prisma.campaignTag.findMany({ orderBy: { name: "asc" } }),
  contentTypes: () => prisma.contentType.findMany({ orderBy: { name: "asc" } }),
  outreachTypes: () => prisma.outreachType.findMany({ orderBy: { name: "asc" } }),
  exhibitionTypes: () => prisma.exhibitionType.findMany({ orderBy: { name: "asc" } }),
  taskTypes: () => prisma.taskType.findMany({ orderBy: { name: "asc" } }),
  paymentMethodTypes: () => prisma.paymentMethodType.findMany({ orderBy: { name: "asc" } }),
};

// GET /api/lookup/[table]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { table } = await params;
  const fn = LOOKUP_MAP[table];

  if (!fn) {
    return NextResponse.json(
      { error: `Unknown lookup table: ${table}`, available: Object.keys(LOOKUP_MAP) },
      { status: 400 }
    );
  }

  const records = await fn();
  return NextResponse.json(records);
}
