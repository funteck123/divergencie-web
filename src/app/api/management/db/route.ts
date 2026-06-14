import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

// Allowlist of tables accessible via this endpoint — prevents prototype pollution
// and access to internal Prisma tables (_prisma_migrations, etc.)
const ALLOWED_TABLES = [
  "user",
  "ticket",
  "ticketMessage",
  "ticketHistory",
  "ticketCategory",
  "ticketPermission",
  "attendance",
  "claim",
  "meeting",
  "meetingParticipant",
  "candidate",
  "rateCard",
  "invoice",
  "academicSession",
  "assignment",
  "syllabusItem",
  "doubt",
  "studentSyllabusProgress",
  "recording",
  "marketingPost",
  "lead",
  "accessLog",
  "announcement",
  "asset",
  "mockResult",
  "group",
  "referral",
] as const;

type AllowedTable = (typeof ALLOWED_TABLES)[number];

// Fields that must never be updated through the generic endpoint
const IMMUTABLE_FIELDS = ["id", "passwordHash", "createdAt"];

function validateTable(table: string): table is AllowedTable {
  return ALLOWED_TABLES.includes(table as AllowedTable);
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "management") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const table = searchParams.get("table");

  if (!table) return NextResponse.json({ error: "Table name required" }, { status: 400 });
  if (!validateTable(table)) {
    return NextResponse.json({ error: "Invalid table name" }, { status: 400 });
  }

  try {
    const data = await (prisma as any)[table].findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json(data);
  } catch {
    try {
      const data = await (prisma as any)[table].findMany({ take: 100 });
      return NextResponse.json(data);
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
  }
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "management") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { table, id, data } = await req.json();
    if (!table || !id || !data) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }
    if (!validateTable(table)) {
      return NextResponse.json({ error: "Invalid table name" }, { status: 400 });
    }

    // Strip immutable fields from the update payload
    const safeData = Object.fromEntries(
      Object.entries(data).filter(([key]) => !IMMUTABLE_FIELDS.includes(key))
    );

    if (Object.keys(safeData).length === 0) {
      return NextResponse.json({ error: "No updatable fields provided" }, { status: 400 });
    }

    const updated = await (prisma as any)[table].update({ where: { id }, data: safeData });
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "management") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { table, id } = await req.json();
    if (!table || !id) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }
    if (!validateTable(table)) {
      return NextResponse.json({ error: "Invalid table name" }, { status: 400 });
    }

    await (prisma as any)[table].delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
