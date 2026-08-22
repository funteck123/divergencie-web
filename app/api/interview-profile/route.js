import { NextResponse } from "next/server";
import { readDB, writeDB } from "@/lib/db";
import { requireSelfOrManagement } from "@/lib/authz";
import { isValidTimezone } from "@/lib/timezones";

// TKT-0120: every interview account (Teacher/Staff/Ambassador track) needs a
// Personal Info section (email, WhatsApp number, country/timezone) and a
// Documents section (one Resume, one optional Cover Letter, up to 5
// optional Portfolio links). This is the first self-service profile-edit
// path in the app; every other account's own fields are Management-only
// (PATCH /api/users). A candidate has to be the one entering their own
// resume/cover letter/portfolio, there's no source data to pull those from,
// so this can't be Management-only the way everything else is.
// body: { userId, email?, whatsappNumber?, timezone?, resumeUrl?,
//         coverLetterUrl?, portfolioLinks?: string[] }
const INTERVIEW_ACC_TYPES = ["TeacherInterviewAcc", "StaffInterviewAcc", "AmbassadorInterviewAcc"];

export async function PATCH(req) {
  const { userId, email, whatsappNumber, timezone, resumeUrl, coverLetterUrl, portfolioLinks } = await req.json();
  if (!userId) return NextResponse.json({ error: "userId is required." }, { status: 400 });

  const { error } = requireSelfOrManagement(req, userId);
  if (error) return error;

  if (
    [email, whatsappNumber, timezone, resumeUrl, coverLetterUrl, portfolioLinks].every((v) => v === undefined)
  ) {
    return NextResponse.json({ error: "at least one field to update is required." }, { status: 400 });
  }
  if (timezone !== undefined && !isValidTimezone(timezone)) {
    return NextResponse.json({ error: "timezone is not a recognized IANA timezone." }, { status: 400 });
  }
  if (portfolioLinks !== undefined) {
    if (!Array.isArray(portfolioLinks)) return NextResponse.json({ error: "portfolioLinks must be an array." }, { status: 400 });
    if (portfolioLinks.length > 5) return NextResponse.json({ error: "Up to 5 portfolio links only." }, { status: 400 });
  }

  const db = await readDB();
  const user = db.users.find((u) => u.UserID === userId);
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });
  if (!INTERVIEW_ACC_TYPES.includes(user.UserType)) {
    return NextResponse.json({ error: "This profile is only for Interview accounts." }, { status: 400 });
  }

  if (email !== undefined) user.Email = email;
  if (whatsappNumber !== undefined) user.WhatsAppNumber = whatsappNumber;
  if (timezone !== undefined) user.Timezone = timezone;
  if (resumeUrl !== undefined) user.ResumeURL = resumeUrl;
  if (coverLetterUrl !== undefined) user.CoverLetterURL = coverLetterUrl;
  if (portfolioLinks !== undefined) user.PortfolioLinks = portfolioLinks.filter((l) => l && l.trim());

  await writeDB(db, ["users"]);
  return NextResponse.json({ user });
}
