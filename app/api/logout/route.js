import { NextResponse } from "next/server";
import { clearedSessionCookie } from "@/lib/session";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  const cookie = clearedSessionCookie();
  res.cookies.set(cookie.name, cookie.value, cookie.options);
  return res;
}
