import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user;
    const role = user.role?.toLowerCase() || "";

    // Auth gate check
    if (!["student", "parent", "staff", "management"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validation
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPEG, PNG, WEBP, PDF" },
        { status: 400 }
      );
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File exceeds max size limit of 5MB" },
        { status: 400 }
      );
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const pathname = `receipts/${user.id}-${Date.now()}-${safeName}`;

    // Convert file to buffer for upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data, error } = await supabaseAdmin.storage
      .from("receipts")
      .upload(pathname, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (error) {
      console.error("[STORAGE] Upload failed:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from("receipts")
      .getPublicUrl(pathname);

    return NextResponse.json({ url: publicUrl, pathname });
  } catch (error: any) {
    console.error("[UPLOAD] error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
