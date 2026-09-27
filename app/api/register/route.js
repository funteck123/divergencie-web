import { NextResponse } from "next/server";
import { readDB, writeDB, nextId } from "@/lib/db";
import { BOOKING_TYPES } from "@/lib/scheduleGen";
import { requireManagement } from "@/lib/authz";
import { checkRegisterRateLimit } from "@/lib/rateLimit";
import { getOAuthAccessToken } from "@/lib/googleAuth";
import { uploadFile, extractDriveFolderId } from "@/lib/googleDrive";
import { approveRegForm } from "@/lib/regFormApproval";
import { sendEmail } from "@/lib/googleMail";

const MAX_RESUME_BYTES = 10 * 1024 * 1024; // 10MB

// TKT-0199: resume upload -- optional for now (not gating anything), same
// Drive-upload mechanism as Timesheet/Progress Tracker. A resume upload
// failure never blocks the actual application; the RegForm is saved either
// way, ResumeURL just stays blank on failure.
async function tryUploadResume(resumeFile, name) {
  if (!resumeFile || typeof resumeFile === "string" || resumeFile.size === 0) return "";
  if (resumeFile.size > MAX_RESUME_BYTES) return "";
  try {
    const folderUrl = process.env.GDRIVE_CANDIDATE_RESUMES_FOLDER_URL;
    const folderId = extractDriveFolderId(folderUrl);
    if (!folderId) return "";
    const accessToken = await getOAuthAccessToken();
    const buffer = Buffer.from(await resumeFile.arrayBuffer());
    const ext = (resumeFile.name || "").split(".").pop() || "pdf";
    const result = await uploadFile({
      accessToken,
      folderId,
      filename: `Resume - ${name} - ${Date.now()}.${ext}`,
      mimeType: resumeFile.type || "application/octet-stream",
      buffer,
    });
    return result.webViewLink || "";
  } catch (e) {
    console.error("register: resume upload failed", e);
    return "";
  }
}

// Public endpoint: anyone can submit a RegForm. No account, no schedule pick
// happens here — Management reviews it later and, separately, creates open
// Trial/Interview slots for approved requests to book.
// body (multipart/form-data): name, email, requestedType, whatsappNumber,
// whyDivergenCIE?, resume? (file, optional). Trial also: gender?, location?,
// parentContactNumber, parentEmail?, schoolName?, studying, help?, subjects?,
// referrer?, heardAbout, couponCode?, scoreAStar?
export async function POST(req) {
  // Red-team pass (2026-08-24): 5 rapid POSTs, no throttle, all created
  // real (if disposable-looking) RegForm rows -- an unauthenticated spam
  // vector against the queue Management has to review.
  const rateLimited = checkRegisterRateLimit(req);
  if (rateLimited) return rateLimited;

  const formData = await req.formData();
  const name = formData.get("name");
  const email = formData.get("email");
  const requestedType = formData.get("requestedType");
  const whatsappNumber = formData.get("whatsappNumber");
  const whyDivergenCIE = formData.get("whyDivergenCIE");
  const resumeFile = formData.get("resume");
  // TKT-0283: student (Trial) applications carry the same fields as the public
  // intake form at bit.ly/divergencie. Free text is trimmed and length-capped.
  const field = (k, max = 300) => String(formData.get(k) || "").trim().slice(0, max);

  // TKT-0201/0202: email and WhatsApp are now required (email was
  // previously optional; WhatsApp didn't exist as a field at all).
  if (!name || !requestedType || !email || !whatsappNumber) {
    return NextResponse.json({ error: "Name, email, WhatsApp number, and requested type are required." }, { status: 400 });
  }
  if (!BOOKING_TYPES.includes(requestedType)) {
    return NextResponse.json({ error: `requestedType must be one of ${BOOKING_TYPES.join(", ")}.` }, { status: 400 });
  }

  const isStudent = requestedType === "Trial";
  if (isStudent) {
    if (!field("parentContactNumber")) {
      return NextResponse.json({ error: "Parent's contact number is required." }, { status: 400 });
    }
    if (!field("studying")) {
      return NextResponse.json({ error: "Please choose what you are studying." }, { status: 400 });
    }
    if (!field("heardAbout")) {
      return NextResponse.json({ error: "Please tell us how you heard about us." }, { status: 400 });
    }
  }

  // Students do not upload a resume; only interview applicants do.
  const resumeURL = isStudent ? "" : await tryUploadResume(resumeFile, name);

  const db = await readDB();
  const regForm = {
    RegFormID: await nextId(db, "REG"),
    Name: name,
    Email: email,
    WhatsAppNumber: whatsappNumber,
    WhyDivergenCIE: isStudent ? "" : whyDivergenCIE || "",
    ResumeURL: resumeURL,
    ...(isStudent
      ? {
          Gender: field("gender", 20),
          Location: field("location"),
          ParentContactNumber: field("parentContactNumber", 40),
          ParentEmail: field("parentEmail"),
          SchoolName: field("schoolName"),
          Studying: field("studying", 250),
          HelpWanted: field("help", 100),
          Subjects: field("subjects", 800),
          ReferrerName: field("referrer"),
          HeardAbout: field("heardAbout", 60),
          CouponCode: field("couponCode", 60),
          ScoreAStar: field("scoreAStar", 10),
        }
      : {}),
    RequestedType: requestedType,
    Status: "Pending",
    SubmittedAt: new Date().toISOString(),
  };
  db.regForms.push(regForm);

  // TKT-0203: if Management has turned auto-approval on, skip the manual
  // review step entirely -- create the real account immediately and email
  // the login straight to the applicant. A failure here (bad RequestedType,
  // email send) must never lose the submission itself; the RegForm is
  // already staged above, so on any error it just falls back to sitting
  // Pending for manual review, same as the auto-approve-off path.
  const autoApproveRow = (db.resourceToggles || []).find((r) => r.ID === "REGISTRATION_SETTINGS");
  if (autoApproveRow?.autoApprove) {
    try {
      const { credentials } = await approveRegForm(db, regForm);
      await writeDB(db, ["regForms", "users", "credentials"]);
      try {
        await sendEmail({
          to: email,
          subject: "Your DivergenCIE login",
          text: [
            `Hi ${name},`,
            ``,
            `Your application has been approved. Here are your login details:`,
            ``,
            `Username: ${credentials.username}`,
            `Password: ${credentials.password}`,
            ``,
            `Log in at https://www.divergencie.co.uk/login`,
          ].join("\n"),
        });
      } catch (e) {
        console.error("register: auto-approve credential email failed", e);
      }
      return NextResponse.json({ regForm });
    } catch (e) {
      console.error("register: auto-approve failed, leaving Pending for manual review", e);
    }
  }

  await writeDB(db, ["regForms"]);

  return NextResponse.json({ regForm });
}

export async function GET(req) {
  const { error } = requireManagement(req);
  if (error) return error;

  const db = await readDB();
  return NextResponse.json({ regForms: db.regForms });
}
