import "dotenv/config";
import * as bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";
import prisma from "../src/lib/db.js";

// Supabase admin client for creating Auth users
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function ensureSupabaseAuthUser(
  email: string, password: string, name: string, role: string, dept: string,
  cachedUsers: any[]
) {
  const found = cachedUsers.find((u: any) => u.email === email);
  if (found) {
    await supabaseAdmin.auth.admin.updateUserById(found.id, {
      password,
      user_metadata: { name, role, dept },
      email_confirm: true,
    });
  } else {
    await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: { name, role, dept },
      email_confirm: true,
    });
  }
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const upsertMany = async (model: any, names: string[]) => {
  for (const name of names) {
    await model.upsert({ where: { name }, update: {}, create: { name, isActive: true } });
  }
};

// ─── LOOKUPS ─────────────────────────────────────────────────────────────────

async function seedLookups() {
  // UserType (§53)
  await upsertMany(prisma.userType, ["Student", "Teacher", "Staff", "Ambassador", "Parent", "Candidate", "ALL"]);

  // Department
  await upsertMany(prisma.department, ["PR", "HR", "Finance", "Marketing", "IT", "Management"]);

  // StaffRole
  await upsertMany(prisma.staffRole, [
    "A Level Teacher", "IGCSE Teacher", "Teaching Assistant",
    "HR Manager", "HR Assistant",
    "Marketing Manager", "Marketing Assistant",
    "Finance Manager", "Finance Assistant",
    "PR Manager", "PR Associate",
    "IT Manager", "IT Engineer", "AI Engineer", "SWE Intern",
  ]);

  await upsertMany(prisma.sessionType, [
    "REGULAR", "TRIAL", "MAKEUP", "EXTRA", "RECORDING_REVIEW",
    "STAFF_MEETING", "AMBASSADOR_MEETING", "GENERAL_MEETING",
  ]);

  await upsertMany(prisma.ticketType, [
    "ACADEMIC", "SCHEDULING", "FINANCE", "TECHNICAL", "GENERAL", "HR", "COMPLAINT", "FEEDBACK",
  ]);

  await upsertMany(prisma.notificationType, [
    "SESSION_SCHEDULED", "SESSION_CANCELLED", "SESSION_RESCHEDULED",
    "INVOICE_GENERATED", "INVOICE_OVERDUE", "PAYMENT_RECEIVED", "PAYMENT_FAILED",
    "TASK_ASSIGNED", "TASK_DUE", "TASK_GRADED",
    "DOUBT_ANSWERED", "MOCK_RESULT_READY",
    "TICKET_CREATED", "TICKET_UPDATED", "TICKET_RESOLVED",
    "CLAIM_SUBMITTED", "CLAIM_APPROVED", "CLAIM_REJECTED",
    "ONBOARDING_FLAG_SET", "ONBOARDING_COMPLETE",
    "ANNOUNCEMENT", "PROGRESS_REPORT_READY",
  ]);

  await upsertMany(prisma.flagType, [
    "NO_SHOW", "PAYMENT_OVERDUE", "PROGRESS_CONCERN", "BEHAVIORAL", "DROPOUT_RISK", "ATTENDANCE_LOW",
  ]);

  await upsertMany(prisma.recordType, [
    "WARNING", "COMMENDATION", "ABSENCE_NOTICE", "PERFORMANCE_REVIEW", "SALARY_CHANGE", "ONBOARDING_COMPLETE",
  ]);

  await upsertMany(prisma.mockType, [
    "PAST_PAPER", "MOCK_EXAM", "TOPIC_TEST", "DIAGNOSTIC", "TIMED_PRACTICE",
  ]);

  await upsertMany(prisma.ambassadorTestType, [
    "KNOWLEDGE_CHECK", "PITCH_TEST", "ONBOARDING_QUIZ", "MODULE_ASSESSMENT",
  ]);

  await upsertMany(prisma.outreachSource, [
    "REFERRAL", "SOCIAL_MEDIA", "SCHOOL_VISIT", "UNIVERSITY_FAIR", "WEBSITE_ORGANIC",
    "WORD_OF_MOUTH", "PAID_ADVERTISEMENT", "EVENT", "COLD_OUTREACH",
  ]);

  await upsertMany(prisma.socialPlatformType, [
    "INSTAGRAM", "FACEBOOK", "TIKTOK", "LINKEDIN", "WHATSAPP", "YOUTUBE", "X",
  ]);

  await upsertMany(prisma.socialPostType, [
    "CAROUSEL", "REEL", "STORY", "STATIC_IMAGE", "VIDEO", "THREAD", "ARTICLE",
  ]);

  await upsertMany(prisma.campaignTag, [
    "ADMISSIONS", "EXAM_PREP", "BRAND_AWARENESS", "AMBASSADOR_DRIVE",
    "REFERRAL", "RESULTS_DAY", "SEASONAL", "SUBJECT_SPOTLIGHT",
  ]);

  await upsertMany(prisma.contentType, [
    "GRAPHIC", "VIDEO", "ANIMATION", "DOCUMENT", "INFOGRAPHIC", "TESTIMONIAL",
  ]);

  await upsertMany(prisma.outreachType, [
    "SCHOOL_VISIT", "UNIVERSITY_FAIR", "WEBINAR", "COMMUNITY_EVENT", "CAREERS_DAY",
  ]);

  await upsertMany(prisma.exhibitionType, [
    "EDUCATION_FAIR", "CAREER_EXPO", "OPEN_DAY", "SHOWCASE", "CONFERENCE",
  ]);

  await upsertMany(prisma.taskType, [
    "HOMEWORK", "PAST_PAPER", "PROJECT", "READING", "PRACTICE_SET", "CORRECTION", "REVISION_NOTES",
  ]);

  await upsertMany(prisma.knowledgeBankDomain, [
    "ACADEMIC", "SCHEDULING", "FINANCE", "HR", "MARKETING", "TECHNICAL", "OPERATIONS", "COMPLIANCE",
  ]);

  const paymentMethods = [
    { name: "STRIPE_CARD", region: "GLOBAL" },
    { name: "BANK_TRANSFER_UK", region: "GB" },
    { name: "BANK_TRANSFER_MY", region: "MY" },
    { name: "BANK_TRANSFER_PK", region: "PK" },
    { name: "BANK_TRANSFER_SA", region: "SA" },
    { name: "CASH", region: "ALL" },
  ];
  for (const pm of paymentMethods) {
    await prisma.paymentMethodType.upsert({
      where: { name: pm.name },
      update: { region: pm.region },
      create: { name: pm.name, region: pm.region, isActive: true },
    });
  }

  await prisma.currencyRate.upsert({
    where: { fromCurrency: "GBP" },
    update: { rate: 107.5, reverseRate: 0.0093 },
    create: { fromCurrency: "GBP", toCurrency: "INR", rate: 107.5, reverseRate: 0.0093, effectiveDate: new Date() },
  });

  console.log("[SEED] Lookups seeded");
}

// ─── USERS ────────────────────────────────────────────────────────────────────

async function seedUsers(lookups: Record<string, any>) {
  const { depts, roles } = lookups;

  const USERS = [
    { email: "management@divergencie.co.uk", name: "Director Mike", role: "management", active: true, supervisor: false },
    { email: "teacher@divergencie.co.uk", name: "Teacher User", role: "teacher", active: true, supervisor: false, hourlyRate: 20, specialization: "IGCSE Maths | A Level Chemistry" },
    { email: "student@divergencie.co.uk", name: "Student User", role: "student", active: true, supervisor: false, grade: "Year 11", board: "Cambridge IGCSE", targetUni: "Imperial College London" },
    { email: "parent@divergencie.co.uk", name: "Parent User", role: "parent", active: true, supervisor: false },
    { email: "ambassador@divergencie.co.uk", name: "Ambassador User", role: "ambassador", active: true, supervisor: false, referralCode: "DC-AMB-0001" },
    { email: "candidate@divergencie.co.uk", name: "Candidate User", role: "candidate", active: true, supervisor: false },
    { email: "hr@divergencie.co.uk", name: "HR Manager", role: "staff", active: true, supervisor: true, subGroup: "HR_SUP" },
    { email: "hr-assistant@divergencie.co.uk", name: "HR Assistant", role: "staff", active: true, supervisor: false, subGroup: "HR_MEM" },
    { email: "marketing@divergencie.co.uk", name: "SM Manager", role: "staff", active: true, supervisor: true, subGroup: "MKT_SUP" },
    { email: "marketing-assistant@divergencie.co.uk", name: "SM Assistant", role: "staff", active: true, supervisor: false, subGroup: "MKT_MEM" },
    { email: "finance@divergencie.co.uk", name: "Sarah Lorde", role: "staff", active: true, supervisor: true, subGroup: "FIN_SUP" },
    { email: "finance-assistant@divergencie.co.uk", name: "Acct. Assistant", role: "staff", active: true, supervisor: false, subGroup: "FIN_MEM" },
    { email: "pr@divergencie.co.uk", name: "Assoc. PM", role: "staff", active: true, supervisor: true, subGroup: "PR_SUP" },
    { email: "pr-assistant@divergencie.co.uk", name: "PR Assistant", role: "staff", active: true, supervisor: false, subGroup: "PR_MEM" },
    { email: "ta-pr@divergencie.co.uk", name: "Teaching Asst.", role: "staff", active: true, supervisor: false, subGroup: "PR_MEM" },
    { email: "it@divergencie.co.uk", name: "IT Manager", role: "staff", active: true, supervisor: true, subGroup: "IT_SUP" },
    { email: "it-assistant@divergencie.co.uk", name: "IT Assistant", role: "staff", active: true, supervisor: false, subGroup: "IT_MEM" },
    { email: "ai-intern@divergencie.co.uk", name: "AI Intern", role: "staff", active: true, supervisor: false, subGroup: "IT_MEM" },
    { email: "swe-intern@divergencie.co.uk", name: "SWE Intern", role: "staff", active: true, supervisor: false, subGroup: "IT_MEM" },
  ] as const;

  const [hash, { data: authData }] = await Promise.all([
    bcrypt.hash("demo", 12),
    supabaseAdmin.auth.admin.listUsers(),
  ]);
  const cachedAuthUsers: any[] = authData?.users ?? [];
  const upserted: Record<string, any> = {};

  // Batch: all Prisma user upserts in parallel
  await Promise.all(
    USERS.map(async (u) => {
      const user = await prisma.user.upsert({
        where: { email: u.email },
        update: { name: u.name, active: u.active, ...((u as any).referralCode ? { referralCode: (u as any).referralCode } : {}) },
        create: { ...(u as any), passwordHash: hash },
      });
      upserted[u.email] = user;
    })
  );

  // Batch: all Supabase Auth upserts in parallel (using cached list)
  await Promise.all(
    USERS.map(async (u) => {
      const dept = (u as any).subGroup
        ? (u as any).subGroup.split("_")[0].toLowerCase()
        : (u as any).dept ?? "";
      await ensureSupabaseAuthUser(u.email, "demo", u.name, u.role, dept, cachedAuthUsers).catch((e: any) =>
        console.warn(`  ⚠ Supabase Auth for ${u.email}: ${e.message}`)
      );
      console.log(`  ✓ ${u.email}`);
    })
  );

  // Link student → parent
  const student = upserted["student@divergencie.co.uk"];
  const parent = upserted["parent@divergencie.co.uk"];
  if (student && parent && !student.parentId) {
    await prisma.user.update({ where: { id: student.id }, data: { parentId: parent.id } });
  }

  // StaffProfiles with FK dept/role
  const staffMappings: Array<{ email: string; deptName: string; roleName: string }> = [
    { email: "hr@divergencie.co.uk", deptName: "HR", roleName: "HR Manager" },
    { email: "hr-assistant@divergencie.co.uk", deptName: "HR", roleName: "HR Assistant" },
    { email: "marketing@divergencie.co.uk", deptName: "Marketing", roleName: "Marketing Manager" },
    { email: "marketing-assistant@divergencie.co.uk", deptName: "Marketing", roleName: "Marketing Assistant" },
    { email: "finance@divergencie.co.uk", deptName: "Finance", roleName: "Finance Manager" },
    { email: "finance-assistant@divergencie.co.uk", deptName: "Finance", roleName: "Finance Assistant" },
    { email: "pr@divergencie.co.uk", deptName: "PR", roleName: "PR Manager" },
    { email: "pr-assistant@divergencie.co.uk", deptName: "PR", roleName: "PR Associate" },
    { email: "ta-pr@divergencie.co.uk", deptName: "PR", roleName: "Teaching Assistant" },
    { email: "it@divergencie.co.uk", deptName: "IT", roleName: "IT Manager" },
    { email: "it-assistant@divergencie.co.uk", deptName: "IT", roleName: "IT Engineer" },
    { email: "ai-intern@divergencie.co.uk", deptName: "IT", roleName: "AI Engineer" },
    { email: "swe-intern@divergencie.co.uk", deptName: "IT", roleName: "SWE Intern" },
  ];

  for (const m of staffMappings) {
    const u = upserted[m.email];
    if (!u) continue;
    await prisma.staffProfile.upsert({
      where: { userId: u.id },
      update: {},
      create: {
        userId: u.id,
        deptId: depts[m.deptName]?.id,
        staffRoleId: roles[m.roleName]?.id,
        isSupervisor: u.supervisor ?? false,
      },
    });
  }

  // StudentProfile
  if (student) {
    await prisma.studentProfile.upsert({
      where: { userId: student.id },
      update: {},
      create: { userId: student.id, firstName: "Student", status: "ACTIVE", gcrAssigned: false, groupAssigned: false, scheduleAssigned: false },
    });
  }

  // TeacherProfile
  const teacher = upserted["teacher@divergencie.co.uk"];
  if (teacher) {
    await prisma.teacherProfile.upsert({
      where: { userId: teacher.id },
      update: {},
      create: { userId: teacher.id, firstName: "Teacher", idDocProvided: false, salaryAccountProvided: false },
    });
  }

  // AmbassadorProfile
  const ambassador = upserted["ambassador@divergencie.co.uk"];
  if (ambassador) {
    await prisma.ambassadorProfile.upsert({
      where: { userId: ambassador.id },
      update: {},
      create: { userId: ambassador.id, referralCode: "DC-AMB-SEED-01", cohort: "2026-A" },
    });
  }

  console.log(`[SEED] ${Object.keys(upserted).length} users seeded`);
  return upserted;
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n═══ DivergenCIE Seed v2 ═══\n");

  await seedLookups();

  // Fetch lookup records for FK wiring
  const depts = Object.fromEntries(
    (await prisma.department.findMany()).map((d: any) => [d.name, d])
  );
  const roles = Object.fromEntries(
    (await prisma.staffRole.findMany()).map((r: any) => [r.name, r])
  );
  const userTypes = Object.fromEntries(
    (await prisma.userType.findMany()).map((t: any) => [t.name, t])
  );

  const users = await seedUsers({ depts, roles, userTypes });
  const teacher = users["teacher@divergencie.co.uk"];
  const prStaff = users["pr@divergencie.co.uk"];
  const student = users["student@divergencie.co.uk"];

  // ─── Group & Service ────────────────────────────────────────────────────────

  const group = await prisma.group.upsert({
    where: { code: "B8-MATHS" },
    update: {},
    create: { code: "B8-MATHS", subject: "IGCSE Mathematics", teacherId: teacher.id, groupCategory: "B_GROUP" },
  });
  if (student) {
    await prisma.group.update({ where: { id: group.id }, data: { students: { connect: { id: student.id } } } });
  }

  let service = await prisma.service.findFirst({ where: { subjectName: "IGCSE Mathematics", teacherId: teacher.id } });
  if (!service) {
    service = await prisma.service.create({
      data: { subjectName: "IGCSE Mathematics", teacherId: teacher.id, serviceType: "MONTHLY", groupId: group.id },
    });
  }

  // ─── Curriculum ─────────────────────────────────────────────────────────────

  let currList = await prisma.curriculumList.findUnique({ where: { serviceId: service.id } });
  if (!currList) {
    currList = await prisma.curriculumList.create({ data: { serviceId: service.id } });
  }

  let sList = await prisma.syllabusList.findFirst({ where: { curriculumListId: currList.id } });
  if (!sList) {
    sList = await prisma.syllabusList.create({
      data: { curriculumListId: currList.id, name: "IGCSE Mathematics Core", version: "1.0", level: "IGCSE", status: "ACTIVE", activatedAt: new Date() },
    });
  }

  const chaptersData = [
    { chapterNum: "01", chapterTitle: "Number & Operations", level: "IGCSE", order: 1 },
    { chapterNum: "02", chapterTitle: "Algebraic Manipulation", level: "IGCSE", order: 2 },
    { chapterNum: "03", chapterTitle: "Quadratic Equations", level: "IGCSE", order: 3 },
    { chapterNum: "04", chapterTitle: "Coordinate Geometry", level: "IGCSE", order: 4 },
    { chapterNum: "05", chapterTitle: "Trigonometry", level: "IGCSE", order: 5 },
  ];

  await prisma.syllabusChapter.deleteMany({ where: { syllabusListId: sList.id } });
  await prisma.syllabusItem.deleteMany({ where: { syllabusListId: sList.id } });

  const syllabusItems: any[] = [];
  const chapters: any[] = [];
  for (const ch of chaptersData) {
    const chapter = await prisma.syllabusChapter.create({
      data: {
        syllabusListId: sList.id,
        chapterNum: ch.chapterNum,
        chapterTitle: ch.chapterTitle,
        order: ch.order,
        isActive: true,
      },
    });
    chapters.push(chapter);

    const item1 = await prisma.syllabusItem.create({
      data: {
        syllabusListId: sList.id,
        syllabusChapterId: chapter.id,
        subject: "IGCSE Mathematics",
        chapterNum: ch.chapterNum,
        chapterTitle: ch.chapterTitle,
        topicCode: `${ch.chapterNum}.1`,
        topicTitle: `${ch.chapterTitle} Fundamentals`,
        level: ch.level,
        order: 1,
        isActive: true,
      },
    });

    const item2 = await prisma.syllabusItem.create({
      data: {
        syllabusListId: sList.id,
        syllabusChapterId: chapter.id,
        subject: "IGCSE Mathematics",
        chapterNum: ch.chapterNum,
        chapterTitle: ch.chapterTitle,
        topicCode: `${ch.chapterNum}.2`,
        topicTitle: `Advanced ${ch.chapterTitle}`,
        level: ch.level,
        order: 2,
        isActive: true,
      },
    });

    syllabusItems.push(item1, item2);
  }

  // StudentSyllabusProgress
  if (student) {
    for (let i = 0; i < Math.min(10, syllabusItems.length); i++) {
      await prisma.studentSyllabusProgress.upsert({
        where: { studentId_syllabusItemId: { studentId: student.id, syllabusItemId: syllabusItems[i].id } },
        update: { completed: i < 6, masteryPct: i < 6 ? 80 + i * 2 : 25 },
        create: { studentId: student.id, syllabusItemId: syllabusItems[i].id, completed: i < 6, masteryPct: i < 6 ? 80 + i * 2 : 25 },
      });
    }
  }

  // ─── Academic Sessions ───────────────────────────────────────────────────────

  const now = new Date();
  const past1 = new Date(now.getTime() - 3 * 86400000); past1.setHours(16, 0, 0, 0);
  const past2 = new Date(now.getTime() - 7 * 86400000); past2.setHours(14, 0, 0, 0);
  const future = new Date(now.getTime() + 86400000); future.setHours(16, 0, 0, 0);

  const sess1 = await prisma.academicSession.create({
    data: {
      subject: "IGCSE Mathematics", topic: "Quadratic Equations",
      startTime: past1, endTime: new Date(past1.getTime() + 3600000),
      teacherId: teacher.id, studentId: student?.id, groupId: group.id,
      serviceId: service.id,
      status: "COMPLETED", zoomLink: "https://zoom.us/j/123456789",
      wbLink: "https://miro.com/board/example1", durationHours: 1.0,
    },
  });

  const sess2 = await prisma.academicSession.create({
    data: {
      subject: "A Level Chemistry", topic: "Chemical Equilibrium",
      startTime: past2, endTime: new Date(past2.getTime() + 5400000),
      teacherId: teacher.id, studentId: student?.id,
      status: "COMPLETED", zoomLink: "https://zoom.us/j/987654321",
      wbLink: "https://miro.com/board/example2", durationHours: 1.5,
    },
  });

  await prisma.academicSession.create({
    data: {
      subject: "IGCSE Mathematics", topic: "Coordinate Geometry",
      startTime: future, endTime: new Date(future.getTime() + 3600000),
      teacherId: teacher.id, studentId: student?.id, groupId: group.id,
      serviceId: service.id,
      status: "SCHEDULED", zoomLink: "https://zoom.us/j/111222333",
      durationHours: 1.0,
    },
  });

  if (student) {
    await prisma.sessionAttendance.createMany({
      data: [
        { sessionId: sess1.id, studentId: student.id, status: "PRESENT", markedAt: now },
        { sessionId: sess2.id, studentId: student.id, status: "PRESENT", markedAt: now },
      ],
      skipDuplicates: true,
    });
  }

  // Recordings (sessionId field)
  await prisma.recording.upsert({
    where: { id: "rec-seed-1" },
    update: {},
    create: { id: "rec-seed-1", title: "IGCSE Mathematics — Quadratic Equations", videoUrl: "https://miro.com/board/example1", sessionId: sess1.id, date: past1, category: "session" },
  });
  await prisma.recording.upsert({
    where: { id: "rec-seed-2" },
    update: {},
    create: { id: "rec-seed-2", title: "A Level Chemistry — Chemical Equilibrium", videoUrl: "https://miro.com/board/example2", sessionId: sess2.id, date: past2, category: "session" },
  });

  const quadraticChapter = await prisma.syllabusChapter.findFirst({
    where: { chapterNum: "03" },
  });
  if (quadraticChapter) {
    const recList = await prisma.chapterRecordingList.upsert({
      where: { syllabusChapterId: quadraticChapter.id },
      update: {},
      create: { syllabusChapterId: quadraticChapter.id, isActive: true },
    });
    await prisma.chapterRecordingItem.upsert({
      where: {
        chapterRecordingListId_recordingId: {
          chapterRecordingListId: recList.id,
          recordingId: "rec-seed-1",
        },
      },
      update: {},
      create: {
        chapterRecordingListId: recList.id,
        recordingId: "rec-seed-1",
        notes: "Covers standard quadratic graph sketching and calculations",
        order: 1,
        isActive: true,
      },
    });
  }

  // ─── Billing & Finance ───────────────────────────────────────────────────────

  const billingMonth = await prisma.billingMonth.upsert({
    where: { month: "2026-05" },
    update: {},
    create: { month: "2026-05", serialNo: 5 },
  });

  if (student) {
    await prisma.studentInvoice.create({
      data: {
        studentId: student.id,
        billingMonthId: billingMonth.id,
        month: "2026-05",
        subtotal: 640,
        discountApplied: 0,
        netAmount: 640,
        dueAmount: 640,
        currency: "GBP",
        status: "issued",
        issuedAt: new Date(now.getTime() - 10 * 86400000),
      },
    });
  }

  // Claims (deptId FK)
  await prisma.claim.create({
    data: {
      userId: teacher.id,
      month: "2026-04",
      sessions: 32,
      hours: 32,
      amount: 640,
      currency: "GBP",
      status: "approved",
      deptId: depts["PR"]?.id,
      billingMonthId: billingMonth.id,
    },
  });
  await prisma.claim.create({
    data: {
      userId: teacher.id,
      month: "2026-05",
      sessions: 18,
      hours: 18,
      amount: 360,
      currency: "GBP",
      status: "pending",
      deptId: depts["PR"]?.id,
    },
  });

  // ─── Content Bank ────────────────────────────────────────────────────────────

  if (prStaff) {
    await prisma.contentBankItem.create({
      data: { name: "Teacher Onboarding Protocol v2", url: "https://drive.google.com/onboarding-protocol", deptId: depts["PR"]?.id, addedByUserId: prStaff.id },
    });
    await prisma.contentBankItem.create({
      data: { name: "May 2026 Course Catalogue", url: "https://drive.google.com/course-catalogue-may", deptId: depts["Marketing"]?.id, addedByUserId: prStaff.id },
    });
    await prisma.contentBankItem.create({
      data: { name: "Finance Claim Guidebook", url: "https://drive.google.com/claim-guidebook", deptId: depts["Finance"]?.id, addedByUserId: prStaff.id },
    });
  }

  // ─── Candidates ──────────────────────────────────────────────────────────────

  await prisma.candidate.upsert({
    where: { email: "sarah.miller@example.com" },
    update: {},
    create: {
      name: "Sarah Miller", email: "sarah.miller@example.com",
      staffRoleId: roles["A Level Teacher"]?.id,
      candidateUserTypeId: userTypes["Teacher"]?.id,
      status: "Interview", cvLink: "https://drive.google.com/cv-sarah",
      notes: "Strong Imperial background", outreach: "LinkedIn",
    },
  });
  await prisma.candidate.upsert({
    where: { email: "linda.chen@example.com" },
    update: {},
    create: {
      name: "Linda Chen", email: "linda.chen@example.com",
      staffRoleId: roles["IGCSE Teacher"]?.id,
      candidateUserTypeId: userTypes["Teacher"]?.id,
      status: "Offer Sent", cvLink: "https://drive.google.com/cv-linda",
      notes: "Expected join June 1", outreach: "IG",
    },
  });

  // ─── Misc Entities ───────────────────────────────────────────────────────────

  await prisma.accessLog.create({
    data: { staffName: "Ms Priya Sharma", toolName: "Zoom", credential: "host-key-xxx", notes: "Granted on onboarding" },
  });

  await prisma.marketingPost.create({
    data: { canvaLink: "https://canva.com/example1", caption: "A* results — our students deliver! #DivergenCIE", scheduledDate: new Date(now.getTime() + 2 * 86400000), status: "scheduled", contentType: "post", campaignTag: "Results2026" },
  });

  await prisma.lead.create({ data: { name: "Fatimah Al-Rashid", email: "fatimah@example.com", source: "Instagram", status: "new", notes: "Interested in IGCSE Maths 1-on-1" } });
  await prisma.lead.create({ data: { name: "Arjun Nair", phone: "+60123456789", source: "WhatsApp Channel", status: "contacted", notes: "Wants A Level Chemistry, starting June" } });

  await prisma.announcement.create({
    data: { title: "May Mock Exam Schedule", body: "Timed mocks start 19 May. Results shared within 48h via portal.", targetRole: "all", priority: "high" },
  });
  await prisma.announcement.create({
    data: { title: "New Whiteboard Protocol", body: "All teachers must name boards: Subject_StudentName_Date.", targetRole: "teacher", priority: "medium" },
  });

  for (const dept of ["PR", "HR", "Finance", "Marketing", "IT", "Management", "Student", "Teacher", "Ambassador", "Candidate"]) {
    await prisma.ticketPermission.upsert({ where: { department: dept }, update: {}, create: { department: dept } });
  }

  // GeneralMeeting (participants wired via separate create after meeting exists)
  const meeting = await prisma.generalMeeting.create({
    data: {
      title: "Bimonthly Teacher Training Workshop",
      dateTime: new Date(now.getTime() + 5 * 86400000),
      status: "scheduled",
      deptId: depts["PR"]?.id,
    },
  }).catch(() => null);

  if (meeting && teacher && prStaff) {
    await prisma.meetingParticipant.createMany({
      data: [
        { generalMeetingId: meeting.id, userId: teacher.id },
        { generalMeetingId: meeting.id, userId: prStaff.id },
      ],
      skipDuplicates: true,
    });
  }


  // ─── Extended Dataset (P-H2) ─────────────────────────────────────────────

  const ambassador = users["ambassador@divergencie.co.uk"];
  const parent = users["parent@divergencie.co.uk"];

  // Additional Services for ServicesGrid DB wiring
  const svcCambridge = await prisma.service.upsert({
    where: { id: "svc-cambridge-maths" },
    update: {},
    create: { id: "svc-cambridge-maths", subjectName: "Mathematics", fullSubjectName: "Cambridge IGCSE Mathematics (0580)", board: "Cambridge", courseLevel: "IGCSE", serviceType: "CAMBRIDGE", teacherId: teacher.id, currency: "GBP", standardRate: 40, isActive: true },
  });
  await prisma.service.upsert({
    where: { id: "svc-cambridge-phys" },
    update: {},
    create: { id: "svc-cambridge-phys", subjectName: "Physics", fullSubjectName: "Cambridge A Level Physics (9702)", board: "Cambridge", courseLevel: "A Level", serviceType: "CAMBRIDGE", teacherId: teacher.id, currency: "GBP", standardRate: 45, isActive: true },
  });
  await prisma.service.upsert({
    where: { id: "svc-cambridge-chem" },
    update: {},
    create: { id: "svc-cambridge-chem", subjectName: "Chemistry", fullSubjectName: "Cambridge IGCSE Chemistry (0620)", board: "Cambridge", courseLevel: "IGCSE", serviceType: "CAMBRIDGE", teacherId: teacher.id, currency: "GBP", standardRate: 40, isActive: true },
  });
  await prisma.service.upsert({
    where: { id: "svc-cambridge-bio" },
    update: {},
    create: { id: "svc-cambridge-bio", subjectName: "Biology", fullSubjectName: "Cambridge IGCSE Biology (0610)", board: "Cambridge", courseLevel: "IGCSE", serviceType: "CAMBRIDGE", teacherId: teacher.id, currency: "GBP", standardRate: 40, isActive: true },
  });
  await prisma.service.upsert({
    where: { id: "svc-ap-calc" },
    update: {},
    create: { id: "svc-ap-calc", subjectName: "AP Calculus BC", fullSubjectName: "AP Calculus BC (CollegeBoard)", board: "CollegeBoard", courseLevel: "AP", serviceType: "AP", teacherId: teacher.id, currency: "USD", standardRate: 55, isActive: true },
  });
  await prisma.service.upsert({
    where: { id: "svc-ap-phys" },
    update: {},
    create: { id: "svc-ap-phys", subjectName: "AP Physics C", fullSubjectName: "AP Physics C: Mechanics", board: "CollegeBoard", courseLevel: "AP", serviceType: "AP", teacherId: teacher.id, currency: "USD", standardRate: 55, isActive: true },
  });
  await prisma.service.upsert({
    where: { id: "svc-ielts" },
    update: {},
    create: { id: "svc-ielts", subjectName: "Academic IELTS", fullSubjectName: "IELTS Academic (British Council)", board: "British Council", courseLevel: "Test Prep", serviceType: "IELTS", teacherId: teacher.id, currency: "GBP", standardRate: 35, isActive: true },
  });
  await prisma.service.upsert({
    where: { id: "svc-toefl" },
    update: {},
    create: { id: "svc-toefl", subjectName: "TOEFL iBT", fullSubjectName: "TOEFL iBT (ETS)", board: "ETS", courseLevel: "Test Prep", serviceType: "IELTS", teacherId: teacher.id, currency: "USD", standardRate: 50, isActive: true },
  });

  // StudentEnrolmentList + Item
  if (student) {
    const selList = await prisma.studentEnrolmentList.upsert({
      where: { id: "sel-student-cambridge" },
      update: {},
      create: { id: "sel-student-cambridge", studentId: student.id, serviceType: "CAMBRIDGE", isActive: true },
    });
    await prisma.studentEnrolmentItem.upsert({
      where: { id: "sei-maths" },
      update: {},
      create: {
        id: "sei-maths",
        enrolmentListId: selList.id,
        studentId: student.id,
        serviceId: svcCambridge.id,
        status: "ACTIVE",
        startDate: new Date("2026-01-01"),
        activatedAt: new Date("2026-01-01"),
        isActive: true,
      },
    });
  }

  // TeacherEnrolmentList + Item
  const telList = await prisma.teacherEnrolmentList.upsert({
    where: { id: "tel-teacher-cambridge" },
    update: {},
    create: { id: "tel-teacher-cambridge", teacherId: teacher.id, serviceType: "CAMBRIDGE", isActive: true },
  });
  await prisma.teacherEnrolmentItem.upsert({
    where: { id: "tei-maths" },
    update: {},
    create: {
      id: "tei-maths",
      enrolmentListId: telList.id,
      teacherId: teacher.id,
      serviceId: svcCambridge.id,
      status: "ACTIVE",
      startDate: new Date("2026-01-01"),
      activatedAt: new Date("2026-01-01"),
      isActive: true,
    },
  });

  // ParentProfile
  if (parent) {
    await prisma.parentProfile.upsert({
      where: { userId: parent.id },
      update: {},
      create: { userId: parent.id, phone: "+44 7700 900001", address: "12 Oxford Street, London, W1D 1AR" },
    });
  }

  // AmbassadorService + ProgrammeList
  const ambService = await prisma.ambassadorService.upsert({
    where: { id: "amb-svc-seed" },
    update: {},
    create: { id: "amb-svc-seed", title: "DivergenCIE Ambassador Programme 2026", serviceType: "AMBASSADOR", currency: "GBP", rate: 0, isActive: true },
  });
  const ambProgramme = await prisma.ambassadorProgrammeList.upsert({
    where: { ambassadorServiceId: ambService.id },
    update: {},
    create: { ambassadorServiceId: ambService.id, isActive: true },
  });

  // ContentList + Items
  const ambContent = await prisma.ambassadorProgrammeContentList.upsert({
    where: { id: "apc-seed-1" },
    update: {},
    create: { id: "apc-seed-1", programmeListId: ambProgramme.id, name: "Foundation Module", version: "1.0", status: "ACTIVE", activatedAt: new Date(), isActive: true },
  });
  const progItem1 = await prisma.ambassadorProgrammeItem.upsert({
    where: { id: "api-seed-1" },
    update: {},
    create: { id: "api-seed-1", contentListId: ambContent.id, programmeCode: "AMB-F01", programmeTitle: "Introduction to DivergenCIE", level: "Foundation", order: 1, note: "Mandatory onboarding module", isActive: true },
  });
  const progItem2 = await prisma.ambassadorProgrammeItem.upsert({
    where: { id: "api-seed-2" },
    update: {},
    create: { id: "api-seed-2", contentListId: ambContent.id, programmeCode: "AMB-F02", programmeTitle: "Referral Strategy & Tools", level: "Foundation", order: 2, note: "Learn the referral system", isActive: true },
  });
  const progItem3 = await prisma.ambassadorProgrammeItem.upsert({
    where: { id: "api-seed-3" },
    update: {},
    create: { id: "api-seed-3", contentListId: ambContent.id, programmeCode: "AMB-F03", programmeTitle: "Commission Structure & Payouts", level: "Foundation", order: 3, isActive: true },
  });

  // TimelineList + Items
  const ambTimeline = await prisma.ambassadorProgrammeTimelineList.upsert({
    where: { id: "aptl-seed-1" },
    update: {},
    create: { id: "aptl-seed-1", programmeListId: ambProgramme.id, name: "2026 Programme Timeline", version: "1", status: "ACTIVE", isActive: true },
  });
  await prisma.ambassadorProgrammeTimelineItem.upsert({
    where: { id: "apti-seed-1" },
    update: {},
    create: { id: "apti-seed-1", timelineListId: ambTimeline.id, month: "2026-01", weekNumber: 1, itemType: "ONBOARDING", programmeItemId: progItem1.id, notes: "Complete onboarding by end of week 1" },
  });
  await prisma.ambassadorProgrammeTimelineItem.upsert({
    where: { id: "apti-seed-2" },
    update: {},
    create: { id: "apti-seed-2", timelineListId: ambTimeline.id, month: "2026-02", weekNumber: 2, itemType: "TRAINING", programmeItemId: progItem2.id, notes: "Referral tools training" },
  });
  await prisma.ambassadorProgrammeTimelineItem.upsert({
    where: { id: "apti-seed-3" },
    update: {},
    create: { id: "apti-seed-3", timelineListId: ambTimeline.id, month: "2026-03", weekNumber: 1, itemType: "ASSESSMENT", notes: "Mid-programme check-in meeting" },
  });

  // TestList + Item + Result
  const ambTestList = await prisma.ambassadorTestList.upsert({
    where: { id: "atl-seed-1" },
    update: {},
    create: { id: "atl-seed-1", programmeListId: ambProgramme.id, name: "Foundation Assessment", version: "1", status: "ACTIVE", activatedAt: new Date(), isActive: true },
  });
  const ambTestItem = await prisma.ambassadorTestItem.upsert({
    where: { id: "ati-seed-1" },
    update: {},
    create: { id: "ati-seed-1", testListId: ambTestList.id, programmeItemId: progItem1.id, testType: "MCQ", scheduledDate: new Date("2026-02-15"), totalMarks: 50, isActive: true },
  });
  if (ambassador) {
    await prisma.ambassadorTestResult.upsert({
      where: { testItemId_ambassadorId: { testItemId: ambTestItem.id, ambassadorId: ambassador.id } },
      update: {},
      create: { testItemId: ambTestItem.id, ambassadorId: ambassador.id, marksScored: 44, marksAvailable: 50, marksLost: 6, completed: true, completedAt: new Date("2026-02-15") },
    });

    // AmbassadorProgrammeProgress
    await prisma.ambassadorProgrammeProgress.upsert({
      where: { ambassadorId_programmeItemId: { ambassadorId: ambassador.id, programmeItemId: progItem1.id } },
      update: {},
      create: { ambassadorId: ambassador.id, programmeItemId: progItem1.id, status: "COMPLETED", masteryPct: 88 },
    });
    await prisma.ambassadorProgrammeProgress.upsert({
      where: { ambassadorId_programmeItemId: { ambassadorId: ambassador.id, programmeItemId: progItem2.id } },
      update: {},
      create: { ambassadorId: ambassador.id, programmeItemId: progItem2.id, status: "IN_PROGRESS", masteryPct: 40 },
    });

    // AmbassadorEnrolmentList + Item
    const aelList = await prisma.ambassadorEnrolmentList.upsert({
      where: { id: "ael-seed-1" },
      update: {},
      create: { id: "ael-seed-1", ambassadorId: ambassador.id, serviceType: "AMBASSADOR", isActive: true },
    });
    const ambEnrolItem = await prisma.ambassadorEnrolmentItem.upsert({
      where: { id: "aei-seed-1" },
      update: {},
      create: {
        id: "aei-seed-1",
        enrolmentListId: aelList.id,
        ambassadorId: ambassador.id,
        ambassadorServiceId: ambService.id,
        status: "ACTIVE",
        startDate: new Date("2026-01-01"),
        activatedAt: new Date("2026-01-01"),
        isActive: true,
      },
    });

    // AmbassadorMeeting + Attendance
    const sessionTypeMeeting = await prisma.sessionType.findFirst({ where: { name: "AMBASSADOR_MEETING" } });
    const ambMeeting = await prisma.ambassadorMeeting.upsert({
      where: { id: "am-seed-1" },
      update: {},
      create: {
        id: "am-seed-1",
        ambassadorServiceId: ambService.id,
        sessionTypeId: sessionTypeMeeting?.id,
        title: "Monthly Check-in — January 2026",
        startTime: new Date("2026-01-15T10:00:00Z"),
        endTime: new Date("2026-01-15T11:00:00Z"),
        durationHours: 1,
        status: "completed",
        zoomLink: "https://zoom.us/j/amb-meeting-1",
      },
    });
    await prisma.ambassadorMeetingAttendance.upsert({
      where: { id: "ama-seed-1" },
      update: {},
      create: {
        id: "ama-seed-1",
        meetingId: ambMeeting.id,
        ambassadorId: ambassador.id,
        enrolmentItemId: ambEnrolItem.id,
        status: "PRESENT",
        ambassadorLoggedHours: 1,
        managementLoggedHours: 1,
        hoursMatch: true,
        feedbackStars: 5,
        feedbackText: "Great session, learned a lot about referral strategies",
        feedbackGivenAt: new Date("2026-01-15T11:30:00Z"),
        markedAt: new Date("2026-01-15T11:00:00Z"),
      },
    });

    // AmbassadorServiceSchedule + Occurrence
    const ambSchedule = await prisma.ambassadorServiceSchedule.upsert({
      where: { ambassadorServiceId: ambService.id },
      update: {},
      create: { ambassadorServiceId: ambService.id, isActive: true },
    });
    const sessionTypeAmbMeet = await prisma.sessionType.findFirst({ where: { name: "AMBASSADOR_MEETING" } });
    await prisma.ambassadorScheduleOccurrence.upsert({
      where: { id: "aso-seed-1" },
      update: {},
      create: {
        id: "aso-seed-1",
        scheduleId: ambSchedule.id,
        sessionTypeId: sessionTypeAmbMeet?.id ?? sessionTypeMeeting?.id ?? "",
        recurrenceType: "WEEKLY",
        dayOfWeek: "WEDNESDAY",
        startTime: new Date("2026-01-15T10:00:00Z"),
        endTime: new Date("2026-01-15T11:00:00Z"),
        durationHours: 1,
        status: "ACTIVE",
        activatedAt: new Date("2026-01-01"),
      },
    });

    // AmbassadorCommissionList + Item (linked to student enrolment)
    const seiRecord = await prisma.studentEnrolmentItem.findFirst({ where: { id: "sei-maths" } });
    if (seiRecord) {
      const acList = await prisma.ambassadorCommissionList.upsert({
        where: { id: "acl-seed-1" },
        update: {},
        create: { id: "acl-seed-1", ambassadorId: ambassador.id, isActive: true },
      });
      await prisma.ambassadorCommissionItem.upsert({
        where: { id: "aci-seed-1" },
        update: {},
        create: {
          id: "aci-seed-1",
          commissionListId: acList.id,
          studentEnrolmentItemId: seiRecord.id,
          commissionPct: 10,
          status: "ACTIVE",
          activatedAt: new Date("2026-01-01"),
          isActive: true,
        },
      });

      // AmbassadorClaim + Paycheck
      const ambClaim = await prisma.ambassadorClaim.upsert({
        where: { id: "ac-seed-1" },
        update: {},
        create: {
          id: "ac-seed-1",
          ambassadorId: ambassador.id,
          commissionListId: acList.id,
          month: "2026-05",
          totalStudentAmountPaid: 640,
          commissionAmount: 64,
          currency: "GBP",
          status: "approved",
          notes: "May commission from IGCSE Maths referral",
        },
      });
      await prisma.ambassadorPaycheck.upsert({
        where: { id: "apay-seed-1" },
        update: {},
        create: {
          id: "apay-seed-1",
          claimId: ambClaim.id,
          ambassadorId: ambassador.id,
          billingMonthId: billingMonth.id,
          month: "2026-05",
          subtotal: 64,
          dueAmount: 64,
          currency: "GBP",
          status: "paid",
          notes: "Paid via bank transfer",
        },
      });
    }

    // Referral
    const ambProfile = await prisma.ambassadorProfile.findUnique({ where: { userId: ambassador.id } });
    await prisma.referral.upsert({
      where: { id: "ref-seed-1" },
      update: {},
      create: {
        id: "ref-seed-1",
        referrerId: ambassador.id,
        code: ambProfile?.referralCode ?? "DC-AMB-SEED-01",
        status: "active",
        isActive: true,
      },
    });
  }

  // MockList + Item + Result (student)
  if (student && currList) {
    const mockList = await prisma.mockList.upsert({
      where: { id: "ml-seed-1" },
      update: {},
      create: { id: "ml-seed-1", curriculumListId: currList.id, name: "IGCSE Mathematics Mock Series", version: "1", status: "ACTIVE", activatedAt: new Date(), isActive: true },
    });
    const mockItem1 = await prisma.mockItem.upsert({
      where: { id: "mi-seed-1" },
      update: {},
      create: { id: "mi-seed-1", mockListId: mockList.id, serviceId: service.id, mockType: "Paper 2 (Extended)", paperCode: "0580/22/M/J/25", scheduledDate: new Date("2026-04-10"), totalMarks: 70, isActive: true },
    });
    const mockItem2 = await prisma.mockItem.upsert({
      where: { id: "mi-seed-2" },
      update: {},
      create: { id: "mi-seed-2", mockListId: mockList.id, serviceId: service.id, mockType: "Paper 4 (Extended)", paperCode: "0580/42/M/J/25", scheduledDate: new Date("2026-04-24"), totalMarks: 130, isActive: true },
    });
    await prisma.mockResult.upsert({
      where: { mockItemId_studentId: { mockItemId: mockItem1.id, studentId: student.id } },
      update: {},
      create: { mockItemId: mockItem1.id, studentId: student.id, marksScored: 61, marksAvailable: 70, marksLost: 9, completed: true, completedAt: new Date("2026-04-10"), serviceId: service.id, subject: "IGCSE Mathematics", level: "IGCSE", grade: "A*", score: 87 },
    });
    await prisma.mockResult.upsert({
      where: { mockItemId_studentId: { mockItemId: mockItem2.id, studentId: student.id } },
      update: {},
      create: { mockItemId: mockItem2.id, studentId: student.id, marksScored: 118, marksAvailable: 130, marksLost: 12, completed: true, completedAt: new Date("2026-04-24"), serviceId: service.id, subject: "IGCSE Mathematics", level: "IGCSE", grade: "A*", score: 91 },
    });
  }

  // TaskType + TaskList + TaskItem + Assignment + Submission
  if (student && currList) {
    
    
    const taskType = await prisma.taskType.findFirst({ where: { name: "HOMEWORK" } });
    if (taskType) {
      const taskList = await prisma.taskList.upsert({
        where: { id: "tl-seed-1" },
        update: {},
        create: { id: "tl-seed-1", curriculumListId: currList.id, name: "Term 2 Homework", version: "1", status: "ACTIVE", activatedAt: new Date(), isActive: true },
      });
      const sylItem = syllabusItems[0];
      const taskItem = await prisma.taskItem.upsert({
        where: { id: "ti-seed-1" },
        update: {},
        create: {
          id: "ti-seed-1",
          taskListId: taskList.id,
          taskTypeId: taskType.id,
          syllabusItemId: sylItem?.id,
          serviceId: service.id,
          title: "Number Operations — Worksheet A",
          description: "Complete all questions in Section 1 and 2",
          dueDate: new Date("2026-05-30"),
          assignedToAll: false,
          isActive: true,
        },
      });
      await prisma.taskAssignment.upsert({
        where: { taskItemId_studentId: { taskItemId: taskItem.id, studentId: student.id } },
        update: {},
        create: { taskItemId: taskItem.id, studentId: student.id },
      });
      await prisma.taskSubmission.upsert({
        where: { taskItemId_studentId: { taskItemId: taskItem.id, studentId: student.id } },
        update: {},
        create: { taskItemId: taskItem.id, studentId: student.id, status: "GRADED", totalMarks: 20, marksScored: 18, marksLost: 2, submittedAt: new Date("2026-05-28") },
      });
    }
  }

  // Doubt
  if (student && syllabusItems.length > 0) {
    await prisma.doubt.upsert({
      where: { id: "doubt-seed-1" },
      update: {},
      create: { id: "doubt-seed-1", studentId: student.id, syllabusItemId: syllabusItems[2].id, body: "I don't understand how to solve quadratics using the quadratic formula when the discriminant is negative — does this mean no real solutions?", response: "Correct! When b²−4ac < 0, the discriminant is negative, meaning the quadratic has no real roots (only complex roots). For IGCSE, you just state 'no real solutions'. For A Level Further Maths you'd use complex numbers.", status: "answered" },
    });
  }

  // Support Ticket
  if (student) {
    const ticket = await prisma.ticket.upsert({
      where: { displayId: "TKT-0001" },
      update: {},
      create: {
        displayId: "TKT-0001",
        title: "Recording not available for 8 Apr session",
        description: "The recording for the 8 April session on Quadratic Equations is not showing in my portal. I can see the session was marked COMPLETED but there's no recording link.",
        status: "open",
        priority: "normal",
        creatorId: student.id,
        department: "IT",
        ticketType: "TECHNICAL",
        isActive: true,
      },
    });
    await prisma.ticketMessage.create({
      data: { ticketId: ticket.id, senderId: student.id, body: "Please could you upload the recording ASAP as my exam is in 2 weeks.", isInternal: false },
    });
  }

  // MetricSnapshot + ProgressReport
  if (student) {
    const snap = await prisma.metricSnapshot.upsert({
      where: { id: "ms-seed-1" },
      update: {},
      create: {
        id: "ms-seed-1",
        entityType: "student",
        entityId: student.id,
        month: "2026-05",
        metrics: { sessionsAttended: 12, avgMockScore: 89, tasksCompleted: 4, doubtsRaised: 1, syllabusProgress: 60 },
        snapshotAt: new Date("2026-05-31T23:59:00Z"),
      },
    });
    await prisma.progressReport.upsert({
      where: { id: "pr-seed-1" },
      update: {},
      create: {
        id: "pr-seed-1",
        studentId: student.id,
        metricSnapshotId: snap.id,
        month: "2026-05",
        staffComments: "Outstanding performance this month. Mock scores are consistently A*. Recommend entering for early May exam sitting.",
        status: "published",
        reviewedByUserId: prStaff.id,
        reviewedAt: new Date("2026-06-01T09:00:00Z"),
        sentAt: new Date("2026-06-01T10:00:00Z"),
        isActive: true,
      },
    });
  }

  console.log("[SEED] Extended dataset seeded");

  console.log("\n═══ Seed complete ═══");
  console.log("Login with any email above, password: demo\n");
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
