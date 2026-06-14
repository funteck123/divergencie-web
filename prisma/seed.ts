import "dotenv/config";
import * as bcrypt from "bcryptjs";
import prisma from "../src/lib/db.js";

async function seedLookups() {
  const upsertMany = async (model: any, names: string[]) => {
    for (const name of names) {
      await model.upsert({ where: { name }, update: {}, create: { name, isActive: true } });
    }
  };

  await upsertMany(prisma.sessionType, ["REGULAR", "TRIAL", "MAKEUP", "EXTRA", "RECORDING_REVIEW"]);
  await upsertMany(prisma.ticketType, ["ACADEMIC", "SCHEDULING", "FINANCE", "TECHNICAL", "GENERAL", "HR", "COMPLAINT", "FEEDBACK"]);
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
  await upsertMany(prisma.flagType, ["NO_SHOW", "PAYMENT_OVERDUE", "PROGRESS_CONCERN", "BEHAVIORAL", "DROPOUT_RISK", "ATTENDANCE_LOW"]);
  await upsertMany(prisma.recordType, ["WARNING", "COMMENDATION", "ABSENCE_NOTICE", "PERFORMANCE_REVIEW", "SALARY_CHANGE", "ONBOARDING_COMPLETE"]);
  await upsertMany(prisma.mockType, ["PAST_PAPER", "MOCK_EXAM", "TOPIC_TEST", "DIAGNOSTIC", "TIMED_PRACTICE"]);
  await upsertMany(prisma.ambassadorTestType, ["KNOWLEDGE_CHECK", "PITCH_TEST", "ONBOARDING_QUIZ", "MODULE_ASSESSMENT"]);
  await upsertMany(prisma.outreachSource, [
    "REFERRAL", "SOCIAL_MEDIA", "SCHOOL_VISIT", "UNIVERSITY_FAIR", "WEBSITE_ORGANIC",
    "WORD_OF_MOUTH", "PAID_ADVERTISEMENT", "EVENT", "COLD_OUTREACH",
  ]);
  await upsertMany(prisma.socialPlatformType, ["INSTAGRAM", "FACEBOOK", "TIKTOK", "LINKEDIN", "WHATSAPP", "YOUTUBE", "X"]);
  await upsertMany(prisma.socialPostType, ["CAROUSEL", "REEL", "STORY", "STATIC_IMAGE", "VIDEO", "THREAD", "ARTICLE"]);
  await upsertMany(prisma.campaignTag, [
    "ADMISSIONS", "EXAM_PREP", "BRAND_AWARENESS", "AMBASSADOR_DRIVE",
    "REFERRAL", "RESULTS_DAY", "SEASONAL", "SUBJECT_SPOTLIGHT",
  ]);
  await upsertMany(prisma.contentType, ["GRAPHIC", "VIDEO", "ANIMATION", "DOCUMENT", "INFOGRAPHIC", "TESTIMONIAL"]);
  await upsertMany(prisma.outreachType, ["SCHOOL_VISIT", "UNIVERSITY_FAIR", "WEBINAR", "COMMUNITY_EVENT", "CAREERS_DAY"]);
  await upsertMany(prisma.exhibitionType, ["EDUCATION_FAIR", "CAREER_EXPO", "OPEN_DAY", "SHOWCASE", "CONFERENCE"]);
  await upsertMany(prisma.taskType, ["HOMEWORK", "PAST_PAPER", "PROJECT", "READING", "PRACTICE_SET", "CORRECTION", "REVISION_NOTES"]);
  await upsertMany(prisma.knowledgeBankDomain, ["ACADEMIC", "SCHEDULING", "FINANCE", "HR", "MARKETING", "TECHNICAL", "OPERATIONS", "COMPLIANCE"]);

  // PaymentMethodType has extra `region` field
  const paymentMethods = [
    { name: "STRIPE_CARD", region: "GLOBAL" },
    { name: "BANK_TRANSFER_UK", region: "GB" },
    { name: "BANK_TRANSFER_MY", region: "MY" },
    { name: "BANK_TRANSFER_PK", region: "PK" },
    { name: "BANK_TRANSFER_SA", region: "SA" },
    { name: "CASH", region: "ALL" },
  ];
  for (const pm of paymentMethods) {
    await prisma.paymentMethodType.upsert({ where: { name: pm.name }, update: { region: pm.region }, create: { name: pm.name, region: pm.region, isActive: true } });
  }

  console.log("[SEED] Lookup tables seeded");
}

async function seedUsers() {
  const USERS = [
    { email: "management@divergencie.com", name: "Director Mike", role: "management", dept: null, subGroup: null, supervisor: false, active: true },
    { email: "teacher@divergencie.com", name: "Teacher User", role: "teacher", dept: null, subGroup: null, supervisor: false, active: true, hourlyRate: 20, specialization: "IGCSE Maths | A Level Chemistry" },
    { email: "student@divergencie.com", name: "Student User", role: "student", dept: null, subGroup: null, supervisor: false, active: true, grade: "Year 11", board: "Cambridge IGCSE", targetUni: "Imperial College London" },
    { email: "parent@divergencie.com", name: "Parent User", role: "parent", dept: null, subGroup: null, supervisor: false, active: true },
    { email: "ambassador@divergencie.com", name: "Ambassador User", role: "ambassador", dept: null, subGroup: null, supervisor: false, active: true, referralCode: "DC-AMB-0001" },
    { email: "candidate@divergencie.com", name: "Candidate User", role: "candidate", dept: null, subGroup: null, supervisor: false, active: true },
    { email: "hr@divergencie.com", name: "HR Manager", role: "staff", dept: "HR", subGroup: "HR_SUP", supervisor: true, active: true },
    { email: "hr-assistant@divergencie.com", name: "HR Assistant", role: "staff", dept: "HR", subGroup: "HR_MEM", supervisor: false, active: true },
    { email: "marketing@divergencie.com", name: "SM Manager", role: "staff", dept: "Marketing", subGroup: "MKT_SUP", supervisor: true, active: true },
    { email: "marketing-assistant@divergencie.com", name: "SM Assistant", role: "staff", dept: "Marketing", subGroup: "MKT_MEM", supervisor: false, active: true },
    { email: "finance@divergencie.com", name: "Sarah Lorde", role: "staff", dept: "Finance", subGroup: "FIN_SUP", supervisor: true, active: true },
    { email: "finance-assistant@divergencie.com", name: "Acct. Assistant", role: "staff", dept: "Finance", subGroup: "FIN_MEM", supervisor: false, active: true },
    { email: "pr@divergencie.com", name: "Assoc. PM", role: "staff", dept: "PR", subGroup: "PR_SUP", supervisor: true, active: true },
    { email: "pr-assistant@divergencie.com", name: "PR Assistant", role: "staff", dept: "PR", subGroup: "PR_MEM", supervisor: false, active: true },
    { email: "ta-pr@divergencie.com", name: "Teaching Asst.", role: "staff", dept: "PR", subGroup: "PR_MEM", supervisor: false, active: true },
    { email: "it@divergencie.com", name: "IT Manager", role: "staff", dept: "IT", subGroup: "IT_SUP", supervisor: true, active: true },
    { email: "it-assistant@divergencie.com", name: "IT Assistant", role: "staff", dept: "IT", subGroup: "IT_MEM", supervisor: false, active: true },
    { email: "ai-intern@divergencie.com", name: "AI Intern", role: "staff", dept: "IT", subGroup: "IT_MEM", supervisor: false, active: true },
    { email: "swe-intern@divergencie.com", name: "SWE Intern", role: "staff", dept: "IT", subGroup: "IT_MEM", supervisor: false, active: true },
  ] as const;

  const hash = await bcrypt.hash("Demo@1234", 12);

  const upserted: Record<string, any> = {};
  for (const u of USERS) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...(u as any), passwordHash: hash },
    });
    upserted[u.email] = user;
    console.log(`  ✓ ${u.email} (${u.role})`);
  }

  const student = upserted["student@divergencie.com"];
  const parent = upserted["parent@divergencie.com"];
  if (student && parent && !student.parentId) {
    await prisma.user.update({ where: { id: student.id }, data: { parentId: parent.id } });
  }

  console.log(`[SEED] ${Object.keys(upserted).length} users seeded`);
  return upserted;
}

async function main() {
  console.log("\n═══ DivergenCIE Seed ═══\n");

  await seedLookups();
  const users = await seedUsers();
  const teacher = users["teacher@divergencie.com"];
  const prStaff = users["pr@divergencie.com"];
  const student = users["student@divergencie.com"];

  // Group
  const group = await prisma.group.upsert({
    where: { code: "B8-MATHS" },
    update: {},
    create: { code: "B8-MATHS", subject: "IGCSE Mathematics", teacherId: teacher.id, groupCategory: "B_GROUP" },
  });
  if (student) {
    await prisma.group.update({ where: { id: group.id }, data: { students: { connect: { id: student.id } } } });
  }

  // Syllabus
  const chapters = [
    { subject: "IGCSE Mathematics", chapterNum: "01", chapterTitle: "Number & Operations", topicTitle: "Number & Operations", level: "IGCSE", order: 1 },
    { subject: "IGCSE Mathematics", chapterNum: "02", chapterTitle: "Algebraic Manipulation", topicTitle: "Algebraic Manipulation", level: "IGCSE", order: 2 },
    { subject: "IGCSE Mathematics", chapterNum: "03", chapterTitle: "Quadratic Equations", topicTitle: "Quadratic Equations", level: "IGCSE", order: 3 },
    { subject: "IGCSE Mathematics", chapterNum: "04", chapterTitle: "Coordinate Geometry", topicTitle: "Coordinate Geometry", level: "IGCSE", order: 4 },
    { subject: "IGCSE Mathematics", chapterNum: "05", chapterTitle: "Trigonometry", topicTitle: "Trigonometry", level: "IGCSE", order: 5 },
    { subject: "A Level Chemistry", chapterNum: "01", chapterTitle: "Atomic Structure & Bonding", topicTitle: "Atomic Structure & Bonding", level: "A Level", order: 1 },
    { subject: "A Level Chemistry", chapterNum: "02", chapterTitle: "Energetics & Kinetics", topicTitle: "Energetics & Kinetics", level: "A Level", order: 2 },
    { subject: "A Level Chemistry", chapterNum: "03", chapterTitle: "Chemical Equilibrium", topicTitle: "Chemical Equilibrium", level: "A Level", order: 3 },
    { subject: "IGCSE Physics", chapterNum: "01", chapterTitle: "Forces & Motion", topicTitle: "Forces & Motion", level: "IGCSE", order: 1 },
    { subject: "IGCSE Physics", chapterNum: "02", chapterTitle: "Waves & Optics", topicTitle: "Waves & Optics", level: "IGCSE", order: 2 },
    { subject: "IGCSE Physics", chapterNum: "03", chapterTitle: "Electricity & Magnetism", topicTitle: "Electricity & Magnetism", level: "IGCSE", order: 3 },
  ];
  const syllabusItems: any[] = [];
  // Ensure we clean old ones to prevent unique constraint failures on re-run
  await prisma.syllabusItem.deleteMany({});
  for (const ch of chapters) {
    // SyllabusList is required in schema, so let's check or mock one
    let list = await prisma.syllabusList.findFirst();
    if (!list) {
      // Find or create curriculum list
      let service = await prisma.service.findFirst();
      if (!service) {
        service = await prisma.service.create({
          data: {
            subjectName: ch.subject,
            teacherId: teacher.id,
            serviceType: "MONTHLY",
          }
        });
      }
      let currList = await prisma.curriculumList.findUnique({ where: { serviceId: service.id } });
      if (!currList) {
        currList = await prisma.curriculumList.create({ data: { serviceId: service.id } });
      }
      list = await prisma.syllabusList.create({
        data: {
          curriculumListId: currList.id,
          name: ch.subject,
          version: "1.0",
          level: ch.level,
        }
      });
    }

    const item = await prisma.syllabusItem.create({
      data: {
        syllabusListId: list.id,
        subject: ch.subject,
        chapterNum: ch.chapterNum,
        chapterTitle: ch.chapterTitle,
        topicTitle: ch.topicTitle,
        level: ch.level,
        order: ch.order,
      }
    });
    syllabusItems.push(item);
  }

  // Student progress — use upsert with compound key to avoid duplicate errors on re-seed
  if (student) {
    for (let i = 0; i < 7; i++) {
      await prisma.studentProgress.upsert({
        where: {
          studentId_syllabusItemId: {
            studentId: student.id,
            syllabusItemId: syllabusItems[i].id,
          },
        },
        update: { completed: i < 5, masteryPct: i < 5 ? 80 + i * 2 : 0 },
        create: { studentId: student.id, syllabusItemId: syllabusItems[i].id, completed: i < 5, masteryPct: i < 5 ? 80 + i * 2 : 0 },
      });
    }
  }

  // Sessions
  const now = new Date();
  const past1 = new Date(now.getTime() - 3 * 86400000); past1.setHours(16, 0, 0, 0);
  const past2 = new Date(now.getTime() - 7 * 86400000); past2.setHours(14, 0, 0, 0);
  const future = new Date(now.getTime() + 86400000); future.setHours(16, 0, 0, 0);

  const sess1 = await prisma.academicSession.create({
    data: {
      subject: "IGCSE Mathematics", topic: "Quadratic Equations",
      startTime: past1, endTime: new Date(past1.getTime() + 3600000),
      teacherId: teacher.id, studentId: student.id, groupId: group.id,
      status: "COMPLETED", zoomLink: "https://zoom.us/j/123456789",
      wbLink: "https://miro.com/board/example1",
      durationHours: 1.0,
    }
  });
  const sess2 = await prisma.academicSession.create({
    data: {
      subject: "A Level Chemistry", topic: "Chemical Equilibrium",
      startTime: past2, endTime: new Date(past2.getTime() + 5400000),
      teacherId: teacher.id, studentId: student.id,
      status: "COMPLETED", zoomLink: "https://zoom.us/j/987654321",
      wbLink: "https://miro.com/board/example2",
      durationHours: 1.5,
    }
  });
  await prisma.academicSession.create({
    data: {
      subject: "IGCSE Mathematics", topic: "Coordinate Geometry",
      startTime: future, endTime: new Date(future.getTime() + 3600000),
      teacherId: teacher.id, studentId: student.id, groupId: group.id,
      status: "SCHEDULED", zoomLink: "https://zoom.us/j/111222333",
      durationHours: 1.0,
    }
  });

  // Attendance
  await prisma.sessionAttendance.create({
    data: {
      sessionId: sess1.id,
      studentId: student.id,
      status: "PRESENT",
      markedAt: now,
    }
  });
  await prisma.sessionAttendance.create({
    data: {
      sessionId: sess2.id,
      studentId: student.id,
      status: "PRESENT",
      markedAt: now,
    }
  });

  // Recordings
  await prisma.recording.upsert({
    where: { id: "rec-seed-1" },
    update: {},
    create: {
      id: "rec-seed-1",
      title: "IGCSE Mathematics — Quadratic Equations",
      videoUrl: "https://miro.com/board/example1",
      academicSessionId: sess1.id,
    }
  });
  await prisma.recording.upsert({
    where: { id: "rec-seed-2" },
    update: {},
    create: {
      id: "rec-seed-2",
      title: "A Level Chemistry — Chemical Equilibrium",
      videoUrl: "https://miro.com/board/example2",
      academicSessionId: sess2.id,
    }
  });

  // Assignments
  await prisma.assignment.create({ data: { title: "Quadratics Past Paper", studentId: student.id, dueDate: new Date(now.getTime() + 3 * 86400000), status: "pending" } });
  await prisma.assignment.create({ data: { title: "Equilibrium Problem Set", studentId: student.id, dueDate: new Date(now.getTime() + 6 * 86400000), status: "pending" } });
  await prisma.assignment.create({ data: { title: "Number Revision Sheet", studentId: student.id, dueDate: new Date(now.getTime() - 2 * 86400000), status: "submitted" } });

  // Mock result
  await prisma.mockResult.create({
    data: {
      studentId: student.id,
      subject: "IGCSE Mathematics",
      level: "IGCSE",
      diff: "medium",
      score: 76,
      grade: "A",
      timeTaken: 45,
      completed: true,
      marksScored: 76,
      marksAvailable: 100,
    }
  });

  // Invoices
  await prisma.studentInvoice.create({
    data: {
      studentId: student.id,
      month: "2026-05",
      netAmount: 450,
      dueAmount: 450,
      currency: "GBP",
      status: "due",
    }
  });
  await prisma.studentInvoice.create({
    data: {
      studentId: student.id,
      month: "2026-04",
      netAmount: 450,
      dueAmount: 0,
      currency: "GBP",
      status: "paid",
    }
  });

  // Rate cards
  for (const r of [
    { course: "IGCSE Foundation", country: "UK", groupCode: "B", rateGBP: 150 },
    { course: "IGCSE Foundation", country: "MY", groupCode: "B", rateGBP: 40 },
    { course: "A* Track 1-on-1", country: "UK", groupCode: "C", rateGBP: 200 },
    { course: "A* Track 1-on-1", country: "MY", groupCode: "C", rateGBP: 55 },
    { course: "World Topper", country: "UK", groupCode: "T", rateGBP: 350 },
  ]) {
    const ex = await prisma.rateCard.findFirst({ where: { course: r.course, country: r.country, groupCode: r.groupCode } });
    if (!ex) await prisma.rateCard.create({ data: r });
  }

  // Marketing posts
  await prisma.marketingPost.create({
    data: {
      canvaLink: "https://canva.com/example1",
      caption: "A* results — our students deliver! #DivergenCIE",
      scheduledDate: new Date(now.getTime() + 2 * 86400000),
      status: "scheduled",
      contentType: "post",
      campaignTag: "Results2026",
    }
  });
  await prisma.marketingPost.create({
    data: {
      driveLink: "https://drive.google.com/example1",
      caption: "Meet our tutors.",
      scheduledDate: new Date(now.getTime() - 86400000),
      status: "posted",
      contentType: "reel",
      campaignTag: "TeamSpotlight",
    }
  });
  await prisma.marketingPost.create({
    data: {
      scheduledDate: new Date(now.getTime() - 5 * 86400000),
      status: "missed",
      contentType: "story",
      campaignTag: "WeeklyStudyTip",
    }
  });

  // Leads
  await prisma.lead.create({ data: { name: "Fatimah Al-Rashid", email: "fatimah@example.com", source: "Instagram", status: "new", notes: "Interested in IGCSE Maths 1-on-1" } });
  await prisma.lead.create({ data: { name: "Arjun Nair", phone: "+60123456789", source: "WhatsApp Channel", status: "contacted", notes: "Wants A Level Chemistry, starting June" } });

  // HR candidates
  await prisma.candidate.upsert({ where: { email: "sarah.miller@example.com" }, update: {}, create: { name: "Sarah Miller", email: "sarah.miller@example.com", role: "A Level Teacher", status: "Interview", cvLink: "https://drive.google.com/cv-sarah", notes: "Strong Imperial background", outreach: "LinkedIn" } });
  await prisma.candidate.upsert({ where: { email: "linda.chen@example.com" }, update: {}, create: { name: "Linda Chen", email: "linda.chen@example.com", role: "IGCSE Maths Teacher", status: "Offer Sent", cvLink: "https://drive.google.com/cv-linda", notes: "Expected join June 1", outreach: "IG" } });
  
  // Access logs
  await prisma.accessLog.create({ data: { staffName: "Ms Priya Sharma", toolName: "Zoom", credential: "host-key-xxx", notes: "Granted on onboarding" } });
  await prisma.accessLog.create({ data: { staffName: "Ms Priya Sharma", toolName: "Google Classroom", notes: "Co-teacher B8-MATHS" } });

  // Assets (ContentBankItem)
  await prisma.contentBankItem.create({
    data: {
      name: "Teacher Onboarding Protocol v2",
      url: "https://drive.google.com/onboarding-protocol",
      dept: "PR",
      addedByUserId: prStaff.id,
      description: JSON.stringify({ type: "Protocol", campaignTag: "Onboarding" }),
    }
  });
  await prisma.contentBankItem.create({
    data: {
      name: "May 2026 Course Catalogue",
      url: "https://drive.google.com/course-catalogue-may",
      dept: "Marketing",
      addedByUserId: prStaff.id,
      description: JSON.stringify({ type: "Catalogue", campaignTag: "Catalogue" }),
    }
  });
  await prisma.contentBankItem.create({
    data: {
      name: "Finance Claim Guidebook",
      url: "https://drive.google.com/claim-guidebook",
      dept: "Finance",
      addedByUserId: prStaff.id,
      description: JSON.stringify({ type: "Guidebook" }),
    }
  });

  // Claims
  await prisma.claim.create({ data: { userId: teacher.id, month: "2026-04", sessions: 32, hours: 32, amount: 640, status: "approved", dept: "PR" } });
  await prisma.claim.create({ data: { userId: teacher.id, month: "2026-05", sessions: 18, hours: 18, amount: 360, status: "pending", dept: "PR" } });

  // Announcements
  await prisma.announcement.create({ data: { title: "May Mock Exam Schedule", body: "Timed mocks start 19 May. Results shared within 48h via portal.", targetRole: "all", priority: "high" } });
  await prisma.announcement.create({ data: { title: "New Whiteboard Protocol", body: "All teachers must name boards: Subject_StudentName_Date.", targetRole: "teacher", priority: "medium" } });

  // Ticket permissions
  for (const dept of ["PR", "HR", "Finance", "Marketing", "IT", "Management", "Student", "Teacher", "Ambassador", "Candidate"]) {
    await prisma.ticketPermission.upsert({ where: { department: dept }, update: {}, create: { department: dept } });
  }

  // Meeting
  await prisma.generalMeeting.create({
    data: {
      title: "Bimonthly Teacher Training Workshop",
      dateTime: new Date(now.getTime() + 5 * 86400000),
      status: "pending",
      participants: { create: [{ userId: teacher.id }, { userId: prStaff.id }] },
    }
  }).catch(() => { });

  console.log("\n═══ Seed complete ═══");
  console.log("Login with any email above, password: Demo@1234\n");
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
