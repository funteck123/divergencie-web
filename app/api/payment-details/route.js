import { NextResponse } from "next/server";
import { requireManagement } from "@/lib/authz";
import { PAYMENT_OPTIONS } from "@/lib/paymentDetails";

// Management only: the fee reminder button reads the account-details blocks from here
// instead of having them compiled into the public page bundle.
export async function GET(req) {
  const { error } = requireManagement(req);
  if (error) return error;
  return NextResponse.json({ options: PAYMENT_OPTIONS }, { headers: { "Cache-Control": "no-store" } });
}
