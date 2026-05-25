import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import prisma from "./db"; // production DB client
import sandboxPrisma from "./db-sandbox"; // sandbox DB client

// Helper to parse CSV lines ignoring commas inside double-quotes
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// Clean money values ($1,200.00 -> 1200)
function cleanNumeric(val: string): number {
  if (!val) return 0;
  const cleaned = val.replace(/[\$,"]/g, "").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

// Clean percent values (38% -> 38.00)
function cleanPercent(val: string): number {
  if (!val) return 0;
  const cleaned = val.replace(/%/g, "").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

// Match instructor name ("Mr Akhtar") to a user by last name fragment
function matchInstructor(instructor: string, userCache: Map<string, any>): any {
  if (!instructor) return null;
  const parts = instructor.split(/\s+/);
  const lastName = parts[parts.length - 1].toLowerCase();
  for (const [key, user] of userCache.entries()) {
    if (user && (user.role === "teacher" || user.role === "management" || user.role === "staff")) {
      if (key.includes(lastName)) return user;
    }
  }
  return null;
}

export async function runSandboxETL() {
  console.log("[ETL] Starting Sandbox database migration pipeline...");

  // Configure busy_timeout to prevent SQLite locking issues under concurrent handles
  try {
    await sandboxPrisma.$executeRawUnsafe("PRAGMA busy_timeout = 5000;");
    await prisma.$executeRawUnsafe("PRAGMA busy_timeout = 5000;");
  } catch (err) {
    console.warn("[ETL] Warning setting busy_timeout:", err);
  }

  // 1. TRUNCATE ALL TABLES IN SANDBOX DB (SQLite sequence clean)
  console.log("[ETL] Cleaning up isolated sandbox.db...");

  // Disable foreign keys during truncation to prevent constraint blockages
  await sandboxPrisma.$executeRawUnsafe("PRAGMA foreign_keys = OFF;");

  const tablenames = [
    // Profile tables first (FK to user)
    "ambassadorProfile", "parentProfile", "studentProfile", "teacherProfile", "staffProfile",
    // Ledger
    "ledgerEntry", "accountTransaction", "account",
    // Billing
    "studentInvoice", "resourceInvoice", "counsellingInvoice",
    "enrollmentPackageItem", "studentMonthlyEnrollment", "studentRateOverride", "batchRateCard",
    "claim", "dCBankAccount", "monthlyBillingSummary", "monthlyPayrollSummary",
    // Academic
    "attendance", "academicSession", "assignment", "studentProgress", "doubt", "recording",
    // Tickets
    "ticketMessage", "ticketHistory", "ticket", "ticketCategory", "ticketPermission",
    // CRM & org
    "referral", "meetingParticipant", "meeting", "marketingPost", "group", "user",
    "syllabusItem", "mockResult", "candidate", "lead", "announcement", "asset", "accessLog",
    // Reference tables
    "currencyRate", "messageTemplate"
  ];

  for (const table of tablenames) {
    try {
      await (sandboxPrisma as any)[table].deleteMany({});
    } catch (err) {
      console.error(`[ETL] Error truncating ${table}:`, err);
    }
  }

  // Restore foreign keys enforcement after truncate
  await sandboxPrisma.$executeRawUnsafe("PRAGMA foreign_keys = ON;");

  return await sandboxPrisma.$transaction(async (tx) => {
    // 2. MIGRATE DATA FROM PRODUCTION DEV.DB TO SANDBOX.DB
    console.log("[ETL] Cloning schema instances from live dev.db to sandbox.db...");

    // Clone Users
    const prodUsers = await prisma.user.findMany();
    await tx.user.createMany({ data: prodUsers as any });

    // Clone Groups (prod only - XLSX will add more)
    const prodGroups = await prisma.group.findMany();
    await tx.group.createMany({ data: prodGroups as any });

    // Clone Sessions
    const prodSessions = await prisma.academicSession.findMany();
    await tx.academicSession.createMany({ data: prodSessions as any });

    // Clone Attendances
    const prodAttendances = await prisma.attendance.findMany();
    await tx.attendance.createMany({ data: prodAttendances as any });

    // Clone Assignments
    const prodAssignments = await prisma.assignment.findMany();
    await tx.assignment.createMany({ data: prodAssignments as any });

    // Clone Syllabus
    const prodSyllabus = await prisma.syllabusItem.findMany();
    await tx.syllabusItem.createMany({ data: prodSyllabus as any });

    // Clone Progress
    const prodProgress = await prisma.studentProgress.findMany();
    await tx.studentProgress.createMany({ data: prodProgress as any });

    // Clone Doubts
    const prodDoubts = await prisma.doubt.findMany();
    await tx.doubt.createMany({ data: prodDoubts as any });

    // Clone Recordings
    const prodRecordings = await prisma.recording.findMany();
    await tx.recording.createMany({ data: prodRecordings as any });

    // Clone Tickets
    const prodTickets = await prisma.ticket.findMany();
    await tx.ticket.createMany({ data: prodTickets as any });

    // Clone Ticket categories, messages, history, permissions
    const prodCats = await prisma.ticketCategory.findMany();
    await tx.ticketCategory.createMany({ data: prodCats as any });

    const prodMsgs = await prisma.ticketMessage.findMany();
    await tx.ticketMessage.createMany({ data: prodMsgs as any });

    const prodHistory = await prisma.ticketHistory.findMany();
    await tx.ticketHistory.createMany({ data: prodHistory as any });

    const prodPerms = await prisma.ticketPermission.findMany();
    await tx.ticketPermission.createMany({ data: prodPerms as any });

    const prodReferrals = await prisma.referral.findMany();
    await tx.referral.createMany({ data: prodReferrals as any });

    const prodMeetings = await prisma.meeting.findMany();
    await tx.meeting.createMany({ data: prodMeetings as any });

    const prodMeetingParts = await prisma.meetingParticipant.findMany();
    await tx.meetingParticipant.createMany({ data: prodMeetingParts as any });

    const prodMarketingPosts = await (prisma as any).marketingPost.findMany();
    await (tx as any).marketingPost.createMany({ data: prodMarketingPosts as any });

    const prodCandidates = await prisma.candidate.findMany();
    await (tx as any).candidate.createMany({ data: prodCandidates as any });

    const prodLeads = await prisma.lead.findMany();
    await (tx as any).lead.createMany({ data: prodLeads as any });

    const prodAssets = await prisma.asset.findMany();
    await (tx as any).asset.createMany({ data: prodAssets as any });

    const prodAccessLogs = await prisma.accessLog.findMany();
    await tx.accessLog.createMany({ data: prodAccessLogs as any });

    const prodAnnouncements = await prisma.announcement.findMany();
    await (tx as any).announcement.createMany({ data: prodAnnouncements as any });

    const prodMockResults = await prisma.mockResult.findMany();
    await (tx as any).mockResult.createMany({ data: prodMockResults as any });

    console.log("[ETL] Standard website tables cloned successfully.");

    // 3. INITIALIZE LEDGER accounts
    console.log("[ETL] Initializing Chart of Accounts for Double-Entry Ledger...");
    const accountsData = [
      { name: "SBI Corporate Bank Account", accountType: "ASSET", balance: 150000 },
      { name: "Paytm Payments Gateway", accountType: "ASSET", balance: 50000 },
      { name: "DivergenCIE Corporate Cash Wallet", accountType: "ASSET", balance: 10000 },
      { name: "Tuition Fees Revenue Account", accountType: "REVENUE", balance: 0 },
      { name: "Book Sales Resource Revenue", accountType: "REVENUE", balance: 0 },
      { name: "Admissions Counselling Revenue", accountType: "REVENUE", balance: 0 },
      { name: "Ambassador Referral Expense", accountType: "EXPENSE", balance: 0 },
      { name: "Teacher Compensation Expense", accountType: "EXPENSE", balance: 0 },
      { name: "Staff Payroll Expense", accountType: "EXPENSE", balance: 0 },
      { name: "General Administration Expense", accountType: "EXPENSE", balance: 0 },
      { name: "Social Media Campaigns Q1 2026", accountType: "ASSET", balance: 0 }
    ];

    const accountMap = new Map<string, any>();
    const accountBalances = new Map<string, number>();
    for (const acc of accountsData) {
      const createdAcc = await tx.account.create({ data: acc });
      accountMap.set(createdAcc.name, createdAcc);
      accountBalances.set(createdAcc.name, createdAcc.balance);
    }

    // Create default corporate bank account
    const defaultBank = await tx.dCBankAccount.create({
      data: {
        label: "Mohammad Fahim Akhtar State Bank of India",
        bankName: "State Bank of India",
        accountNumber: "10137922754",
        ifscCode: "SBIN0004652",
        branchName: "Kathara",
        paytmId: "9650675507@ptsbi"
      }
    });

    // 4. BUILD FAST IN-MEMORY USER CACHE (before XLSX processing)
    console.log("[ETL] Building fast in-memory user lookup cache...");
    const allUsersInit = await tx.user.findMany();
    const userCache = new Map<string, any>();
    for (const u of allUsersInit) {
      userCache.set(u.name.toLowerCase(), u);
      userCache.set(`${u.name.toLowerCase()}_${u.role}`, u);
    }

    // Get management user as fallback for teacher assignments
    const managementUser = allUsersInit.find(u => u.role === "management") || allUsersInit[0];

    // 5. CREATE NORMALIZED PROFILES FOR CLONED PROD USERS
    console.log("[ETL] Creating normalized profiles for cloned production users...");
    for (const u of allUsersInit) {
      if (u.role === "staff") {
        let roleTitle = "Administrative Staff";
        let qualification = "Bachelors Degree";
        if (u.name.toLowerCase().includes("atiqa")) {
          roleTitle = "Associate Project Manager";
          qualification = "Project Management Professional (PMP)";
          await tx.user.update({ where: { id: u.id }, data: { bio: "Assistant Project Manager (before March 2026)" } });
        } else if (u.name.toLowerCase().includes("aleena")) {
          roleTitle = "Teaching Assistant";
          qualification = "Bachelors in Education";
        } else if (u.name.toLowerCase().includes("mahrukh")) {
          roleTitle = "SM Assistant";
          qualification = "Bachelors in Media & Communications";
        } else if (u.name.toLowerCase().includes("seher")) {
          roleTitle = "Teaching Assistant";
          qualification = "Bachelors in Science";
        }
        await tx.staffProfile.create({
          data: {
            userId: u.id,
            firstName: u.name.split(" ")[0],
            lastName: u.name.split(" ")[1] || "Staff",
            dob: new Date("1998-05-20"),
            roleTitle,
            salaryType: u.name.toLowerCase().includes("atiqa") ? "monthly" : "hourly",
            salaryRate: u.hourlyRate || 20.0,
            latestQualification: qualification,
            bankAccountInfo: "SBI Main Staging Account xxxx754"
          }
        });
      } else if (u.role === "teacher") {
        await tx.teacherProfile.create({
          data: {
            userId: u.id,
            firstName: u.name.split(" ")[0],
            lastName: u.name.split(" ")[1] || "Tutor",
            dob: new Date("1995-08-15"),
            hourlyRate: u.hourlyRate || 15.0,
            latestQualification: "Bachelors in Cambridge CIE Pedagogy",
            teachingProfileUrl: `https://divergencie.co.uk/tutors/${u.name.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
            bankAccountInfo: "HDFC Main Staging Account xxxx432"
          }
        });
      } else if (u.role === "student") {
        await tx.studentProfile.create({
          data: {
            userId: u.id,
            firstName: u.name.split(" ")[0],
            lastName: u.name.split(" ")[1] || "Student",
            dob: new Date("2008-03-12"),
            grade: u.grade || "IGCSE",
            board: u.board || "Cambridge",
            targetUni: u.targetUni || "TBD",
            paymentMethodPreference: "SBI Corporate Bank Account"
          }
        });
      } else if (u.role === "parent") {
        await tx.parentProfile.create({
          data: {
            userId: u.id,
            firstName: u.name.split(" ")[0],
            lastName: u.name.split(" ")[1] || "Parent",
            phone: u.phone || null,
            address: u.address || null
          }
        });
      } else if (u.role === "ambassador") {
        await tx.ambassadorProfile.create({
          data: {
            userId: u.id,
            firstName: u.name.split(" ")[0],
            lastName: u.name.split(" ")[1] || "Ambassador",
            dob: new Date("1990-11-25"),
            bankAccountInfo: "Barclays Staging Account xxxx987"
          }
        });
      }
    }

    // 6. PARSE XLSX — all sheets
    const xlsxPath = path.join(process.cwd(), "Data", "DC Database 2026.xlsx");
    if (fs.existsSync(xlsxPath)) {
      console.log("[ETL] Parsing DC Database 2026.xlsx sheets...");
      const wb = XLSX.readFile(xlsxPath, { cellDates: true });

      // --- 6A. Currencies sheet → CurrencyRate ---
      console.log("[ETL] Importing Currencies sheet → CurrencyRate...");
      const currenciesSheet = wb.Sheets["Currencies"];
      const currenciesRows = XLSX.utils.sheet_to_json<any>(currenciesSheet, { defval: null });
      for (const row of currenciesRows) {
        const currency = row["Currency"]?.toString().trim();
        const toINR = parseFloat(row["Rate"]) || 1;
        const fromINR = parseFloat(row["Reverse"]) || 1;
        if (!currency) continue;
        await (tx as any).currencyRate.upsert({
          where: { currency },
          update: { toINR, fromINR },
          create: { currency, toINR, fromINR }
        });
      }

      // --- 6B. Text_Formats sheet → MessageTemplate ---
      console.log("[ETL] Importing Text_Formats sheet → MessageTemplate...");
      const textFormatsSheet = wb.Sheets["Text_Formats"];
      const textFormatsRows = XLSX.utils.sheet_to_json<any>(textFormatsSheet, { defval: null });
      for (const row of textFormatsRows) {
        const name = row["NAME"]?.toString().trim();
        const text = row["TEXT"]?.toString().trim();
        if (!name || !text) continue;
        const alternateText = row["ALTERNATE TEXT #1"]?.toString().trim() || null;
        const use = row["USE"]?.toString().trim() || null;
        const dateRaw = row["DATE"];
        let date: Date | null = null;
        if (dateRaw instanceof Date) date = dateRaw;
        else if (typeof dateRaw === "string" && dateRaw.trim()) {
          const d = new Date(dateRaw); if (!isNaN(d.getTime())) date = d;
        }
        await (tx as any).messageTemplate.upsert({
          where: { name },
          update: { text, alternateText, use, date },
          create: { name, text, alternateText, use, date }
        });
      }

      // --- 6C. Batches sheet → enrich Group status + courseLevel ---
      console.log("[ETL] Importing Batches sheet → Group status/courseLevel...");
      const batchesSheet = wb.Sheets["Batches"];
      const batchesRows = XLSX.utils.sheet_to_json<any>(batchesSheet, { defval: null });
      for (const row of batchesRows) {
        const batchCode = row["Batch"]?.toString().trim();
        if (!batchCode) continue;
        const status = row["Status"]?.toString().trim() || null;
        const courseLevel = row["Course/Class"]?.toString().trim() || null;
        // Update all groups whose code starts with this batch code
        const matchingGroups = await tx.group.findMany({
          where: { code: { startsWith: batchCode + "-" } }
        });
        for (const g of matchingGroups) {
          await tx.group.update({
            where: { id: g.id },
            data: {
              ...(status ? { status } : {}),
              ...(courseLevel ? { courseLevel } : {})
            }
          });
        }
      }

      // --- 6D. Services sheet → Groups + BatchRateCards ---
      console.log("[ETL] Importing Services sheet → Groups + BatchRateCards...");
      const servicesSheet = wb.Sheets["Services"];
      const servicesRows = XLSX.utils.sheet_to_json<any>(servicesSheet, { defval: null });

      // Track created groups: groupKey → group record
      const xlsxGroupMap = new Map<string, any>();

      for (const row of servicesRows) {
        const batchCode = row["Batch"]?.toString().trim();
        const subjectCode = row["Subject Code"]?.toString().trim();
        const subjectName = row["Subject Name"]?.toString().trim();
        const courseClass = row["Course/Class"]?.toString().trim();
        const board = row["Board"]?.toString().trim();
        const instructor = row["Instructor"]?.toString().trim();
        const currency = row["Currency"]?.toString().trim();
        const rate = parseFloat(row["Rate"]) || 0;

        if (!batchCode || !subjectCode || !currency) continue;

        const groupKey = `${batchCode}-${subjectCode}`;

        // Ensure Group exists
        if (!xlsxGroupMap.has(groupKey)) {
          let group = await tx.group.findUnique({ where: { code: groupKey } });
          if (!group) {
            const teacher = matchInstructor(instructor, userCache) || managementUser;
            group = await tx.group.create({
              data: {
                code: groupKey,
                subject: `${subjectCode} ${subjectName} (${board} ${courseClass})`,
                teacherId: teacher.id
              }
            });
          }
          xlsxGroupMap.set(groupKey, group);
        }

        // Create or update BatchRateCard for this currency
        const group = xlsxGroupMap.get(groupKey)!;
        await tx.batchRateCard.upsert({
          where: {
            groupId_currency: {
              groupId: group.id,
              currency
            }
          },
          update: {
            feesValue: rate,
            hourlyFeesValue: rate,
            monthlyFeesValue: rate
          },
          create: {
            groupId: group.id,
            currency,
            feesValue: rate,
            hourlyFeesValue: rate,
            monthlyFeesValue: rate
          }
        });
      }

      console.log(`[ETL] Created ${xlsxGroupMap.size} Groups and ${servicesRows.length} BatchRateCards from Services sheet.`);

      // --- 6B. Students sheet → StudentProfile enrichment ---
      console.log("[ETL] Importing Students sheet → enriching StudentProfiles...");
      const studentsSheet = wb.Sheets["Students"];
      const studentsRows = XLSX.utils.sheet_to_json<any>(studentsSheet, { defval: null });

      for (const row of studentsRows) {
        const studentName = row["Student Name"]?.toString().trim();
        if (!studentName) continue;

        const email = row["Email"]?.toString().trim() || null;
        const school = row["School"]?.toString().trim() || null;
        const whatsappNumber = row["WhatsApp Number"]?.toString().trim() || null;
        const parentWhatsappNumber = row["Parent WhatsApp Number"]?.toString().trim() || null;
        const timeZone = row["Time Zone"]?.toString().trim() || null;
        const location = row["Location"]?.toString().trim() || null;
        const timesheetUrl = row["Timesheet"]?.toString().trim() || null;
        const gcrRaw = row["GCR"];
        const gcrLink = typeof gcrRaw === "string" && gcrRaw.startsWith("http") ? gcrRaw.trim() : null;
        const scheduleRaw = row["Schedule"];
        const scheduleLink = typeof scheduleRaw === "string" && scheduleRaw.startsWith("http") ? scheduleRaw.trim() : null;
        const progressRaw = row["Progress Tracker"];
        const progressTrackerLink = typeof progressRaw === "string" && progressRaw.startsWith("http") ? progressRaw.trim() : null;
        const notes = row["Notes"]?.toString().trim() || null;

        // Try to find the student user in cache
        let user = userCache.get(studentName.toLowerCase());
        if (!user || user.role !== "student") {
          for (const [key, u] of userCache.entries()) {
            if (u.role === "student" && key.startsWith(studentName.split(" ")[0].toLowerCase())) {
              user = u;
              break;
            }
          }
        }

        if (user && user.role === "student") {
          // Update user email/phone
          if (email || whatsappNumber) {
            await tx.user.update({
              where: { id: user.id },
              data: {
                ...(email ? { email } : {}),
                ...(whatsappNumber ? { phone: whatsappNumber } : {})
              }
            });
          }

          // Upsert StudentProfile with all XLSX fields
          const existing = await tx.studentProfile.findUnique({ where: { userId: user.id } });
          const profileData = {
            school: school || undefined,
            whatsappNumber: whatsappNumber || undefined,
            parentWhatsappNumber: parentWhatsappNumber || undefined,
            timeZone: timeZone || undefined,
            timesheetUrl: timesheetUrl || undefined,
            gcrLink: gcrLink || undefined,
            scheduleLink: scheduleLink || undefined,
            progressTrackerLink: progressTrackerLink || undefined,
            notes: notes || undefined,
            paymentMethodPreference: location || undefined
          };
          if (existing) {
            await tx.studentProfile.update({ where: { userId: user.id }, data: profileData });
          } else {
            await tx.studentProfile.create({
              data: {
                userId: user.id,
                firstName: studentName.split(" ")[0],
                lastName: studentName.split(" ").slice(1).join(" ") || "Student",
                grade: user.grade || "IGCSE",
                board: user.board || "Cambridge",
                ...profileData
              }
            });
          }
        }
      }

      // --- 6C. Recruits sheet → Candidates ---
      console.log("[ETL] Importing Recruits sheet → Candidates...");
      const recruitsSheet = wb.Sheets["Recruits"];
      const recruitsRows = XLSX.utils.sheet_to_json<any>(recruitsSheet, { defval: null });

      for (const row of recruitsRows) {
        const name = row["NAME"]?.toString().trim();
        if (!name) continue;

        const position = row["INTERVIEW POSITION"]?.toString().trim() || "Teacher";
        const email = row["EMAIL"]?.toString().trim() || null;
        const statusRaw = row["STATUS"]?.toString().trim() || "Unavailable";
        const notes = row["NOTES"]?.toString().trim() || null;
        const skills = row["SKILLS/SUBJECTS"]?.toString().trim() || null;
        const extraSkills = row["EXTRA SKILLS/SUBJECTS"]?.toString().trim() || null;
        const cvLink = row["LINKS "]?.toString().trim() || row["LINKS"]?.toString().trim() || null;
        const qualifications = row["QUALIFICATIONS"]?.toString().trim() || null;
        const timeZone = row["TIME ZONE"]?.toString().trim() || null;
        const interviewTime = row["INTERVIEW TIME"]?.toString().trim() || null;
        const offerLetterStatus = row["OFFER LETTER"]?.toString().trim() || null;
        const expectedRate = row["RATE"] != null ? String(row["RATE"]).trim() : null;
        const gcrAccess = row["GCR ACCESS"]?.toString().trim() || null;
        const classSchedule = row["CLASS SCHEDULE"]?.toString().trim() || null;
        const workFolder = row["WORK FOLDER"]?.toString().trim() || null;

        const interviewDateRaw = row["INTERVIEW DATE"];
        const startDateRaw = row["START DATE"];

        const candidateEmail = email ||
          `${name.toLowerCase().replace(/[^a-z0-9]/g, "")}.recruit@divergencie.co.uk`;

        const status = statusRaw.toLowerCase() === "available" ? "active" : "inactive";

        const parseDate = (raw: any): Date | null => {
          if (raw instanceof Date) return raw;
          if (typeof raw === "string" && raw.trim()) {
            const d = new Date(raw);
            return isNaN(d.getTime()) ? null : d;
          }
          return null;
        };

        const candidateData = {
          role: position,
          status,
          notes,
          skills,
          extraSkills,
          cvLink,
          qualifications,
          expectedRate,
          timeZone,
          interviewTime,
          offerLetterStatus,
          gcrAccess,
          classSchedule,
          workFolder,
          startDate: parseDate(startDateRaw),
          interviewRequestedAt: parseDate(interviewDateRaw)
        };

        await tx.candidate.upsert({
          where: { email: candidateEmail },
          update: candidateData,
          create: { email: candidateEmail, name, ...candidateData }
        });
      }

      console.log(`[ETL] Imported ${recruitsRows.length} recruit candidates from Recruits sheet.`);
    } else {
      console.warn("[ETL] DC Database 2026.xlsx not found at Data/ — skipping XLSX import.");
    }

    // 7. REBUILD CACHES after XLSX group import
    console.log("[ETL] Rebuilding caches after XLSX import...");
    const allUsers = await tx.user.findMany();
    // Re-sync userCache with any new users
    for (const u of allUsers) {
      userCache.set(u.name.toLowerCase(), u);
      userCache.set(`${u.name.toLowerCase()}_${u.role}`, u);
    }

    const allGroups = await tx.group.findMany();
    const enrollmentCache = new Map<string, any>();

    // 8. PARSE STUDENT INVOICES SPREADSHEET
    console.log("[ETL] Parsing Student Invoices CSV operational data...");
    const studentInvoicesPath = path.join(process.cwd(), "planning", "old system data", "DC Staff_Students 2026 - Student Invoices 2025 (1).csv");

    if (fs.existsSync(studentInvoicesPath)) {
      const fileContent = fs.readFileSync(studentInvoicesPath, "utf-8");
      const lines = fileContent.split(/\r?\n/);

      let currentMonth = "Apr_of_2026"; // Default starting block

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line || line.trim() === "") continue;

        const cells = parseCSVLine(line);
        if (cells.length < 5) continue;

        // Detect month switches
        const possibleMonthIdx = cells.findIndex(c => c === "Month");
        if (possibleMonthIdx !== -1 && possibleMonthIdx + 1 < cells.length && cells[possibleMonthIdx + 1] !== "") {
          currentMonth = cells[possibleMonthIdx + 1].trim();
          continue;
        }

        const studentName = cells[2];
        const status = cells[3];
        const subjectsStr = cells[4];
        const currency = cells[5] || "INR";
        const hoursLoggedRaw = cells[6];
        const discountRaw = cells[7];
        const rateRaw = cells[8];
        const feesRaw = cells[9];
        const inrRaw = cells[10];
        const dueRaw = cells[11];
        const billingStartRaw = cells[12];   // XLSX col11 "Start"
        const billingEndRaw = cells[13];     // XLSX col12 "Finish"
        const paymentDoneRaw = cells[14];
        const paymentDateRaw = cells[17];
        const paymentAcknowledgementMsg = cells[18] || null;  // XLSX col17
        const invoicePdfUrl = cells[19] || null;              // XLSX col18
        const serialNoRaw = cells[20];                        // XLSX col19 "S. No."
        const paymentReminderMsg = cells[21] || null;         // XLSX col20

        // Skip header lines or totals/blank names
        if (!studentName || studentName === "Students" || studentName === "Student Count" || studentName === "Month" || studentName === "Date" || studentName === "") continue;

        // Clean values
        const discountPct = cleanPercent(discountRaw);
        const feesAmount = cleanNumeric(feesRaw);
        const inrEquivalent = cleanNumeric(inrRaw);
        const dueAmount = cleanNumeric(dueRaw);
        const paymentDone = paymentDoneRaw === "1" || paymentDoneRaw === "true";
        const serialNo = serialNoRaw ? Math.round(parseFloat(serialNoRaw)) || null : null;

        const parseCSVDate = (raw: string | null): Date | null => {
          if (!raw || raw.trim() === "") return null;
          const d = new Date(raw);
          return isNaN(d.getTime()) ? null : d;
        };

        const paymentDate = parseCSVDate(paymentDateRaw);
        const billingStart = parseCSVDate(billingStartRaw);
        const billingEnd = parseCSVDate(billingEndRaw);

        // A. Match or create Student User record
        const studentKey = `${studentName.toLowerCase()}_student`;
        let student = userCache.get(studentKey) || userCache.get(studentName.toLowerCase());

        if (!student || student.role !== "student") {
          student = await tx.user.create({
            data: {
              email: `${studentName.toLowerCase().replace(/[^a-z0-9]/g, "")}@divergencie.co.uk`,
              name: studentName,
              role: "student",
              active: status === "Active",
              grade: "IGCSE",
              board: "Cambridge"
            }
          });
          userCache.set(studentKey, student);
          userCache.set(studentName.toLowerCase(), student);

          // Create StudentProfile for new CSV student
          await tx.studentProfile.create({
            data: {
              userId: student.id,
              firstName: studentName.split(" ")[0],
              lastName: studentName.split(" ").slice(1).join(" ") || "Student",
              dob: new Date("2008-03-12"),
              grade: "IGCSE",
              board: "Cambridge",
              targetUni: "TBD",
              paymentMethodPreference: "SBI Corporate Bank Account"
            }
          });
        }

        // B. Create or Resolve StudentMonthlyEnrollment Snapshot Row
        const enrollmentKey = `${student.id}_${currentMonth}`;
        let enrollment = enrollmentCache.get(enrollmentKey);

        if (!enrollment) {
          enrollment = await tx.studentMonthlyEnrollment.create({
            data: {
              studentId: student.id,
              month: currentMonth,
              status: status || "Active",
              discountPct,
              currency,
              exchangeRate: feesAmount > 0 ? (inrEquivalent / feesAmount) : 1.0,
              preferredPaymentId: defaultBank.id
            }
          });
          enrollmentCache.set(enrollmentKey, enrollment);
        }

        // C. Parse comma-separated subject codes and create Package Items
        if (subjectsStr && subjectsStr.trim() !== "") {
          const subjects = subjectsStr.split(",");
          for (const sub of subjects) {
            const subTrimmed = sub.trim();
            if (subTrimmed === "") continue;

            // Match group by code prefix (batch code in subject name)
            const batchPrefix = subTrimmed.split(" ")[0]; // e.g., "B14"
            const subjectCodeMatch = subTrimmed.match(/\b(\d{4})\b/); // e.g., "0625"
            const subjectCode = subjectCodeMatch ? subjectCodeMatch[1] : null;
            const groupCode = subjectCode ? `${batchPrefix}-${subjectCode}` : null;
            const group = groupCode ? allGroups.find(g => g.code === groupCode) : allGroups.find(g => g.code.startsWith(batchPrefix));

            const isHourly = hoursLoggedRaw.includes(",");
            const cleanHours = parseFloat(hoursLoggedRaw.replace(/,/g, "")) || 1;

            await tx.enrollmentPackageItem.create({
              data: {
                enrollmentId: enrollment.id,
                groupId: group ? group.id : null,
                customServiceName: group ? null : subTrimmed,
                subjectsCount: isHourly ? 1 : Math.round(cleanHours),
                isHourly,
                rateApplied: cleanNumeric(rateRaw),
                billingNotes: rateRaw
              }
            });
          }
        }

        // D. Create Decoupled StudentInvoice Record
        const invoice = await tx.studentInvoice.create({
          data: {
            enrollmentId: enrollment.id,
            month: currentMonth,
            billingStart,
            billingEnd,
            feesAmount,
            discountApplied: discountPct,
            netAmount: feesAmount * (1 - discountPct / 100),
            inrEquivalent,
            dueAmount,
            paymentDone,
            paymentDate,
            paymentMethod: paymentDone ? "SBI Corporate Bank Account" : null,
            referenceNo: paymentDone ? `REF-MIG-${currentMonth.toUpperCase()}-${student.id.substring(0, 4)}` : null,
            invoicePdfUrl,
            paymentAcknowledgementMsg,
            paymentReminderMsg,
            serialNo
          }
        });

        // E. Log Double-Entry Ledger Record for Invoiced Revenue
        if (feesAmount > 0) {
          const transaction = await tx.accountTransaction.create({
            data: {
              description: `Import Tuition Fee Invoice - ${studentName} - ${currentMonth}`
            }
          });

          const activeAssetAccount = paymentDone ? "SBI Corporate Bank Account" : "DivergenCIE Corporate Cash Wallet";
          const assetAcc = accountMap.get(activeAssetAccount);
          const revAcc = accountMap.get("Tuition Fees Revenue Account");

          if (assetAcc && revAcc) {
            await tx.ledgerEntry.create({
              data: { transactionId: transaction.id, accountId: assetAcc.id, amount: inrEquivalent, studentInvoiceId: invoice.id }
            });
            await tx.ledgerEntry.create({
              data: { transactionId: transaction.id, accountId: revAcc.id, amount: -inrEquivalent, studentInvoiceId: invoice.id }
            });
            accountBalances.set(activeAssetAccount, (accountBalances.get(activeAssetAccount) || 0) + inrEquivalent);
            accountBalances.set("Tuition Fees Revenue Account", (accountBalances.get("Tuition Fees Revenue Account") || 0) + inrEquivalent);
          }
        }
      }
    }

    // 9. PARSE STAFF PAYMENTS SPREADSHEET
    console.log("[ETL] Parsing Staff Payments CSV operational data...");
    const staffPaymentsPath = path.join(process.cwd(), "planning", "old system data", "DC Staff_Students 2026 - Staff Payments 2024.csv");

    if (fs.existsSync(staffPaymentsPath)) {
      const fileContent = fs.readFileSync(staffPaymentsPath, "utf-8");
      const lines = fileContent.split(/\r?\n/);

      let currentMonth = "December_of_2023";

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line || line.trim() === "") continue;

        const cells = parseCSVLine(line);
        if (cells.length < 5) continue;

        // Detect month switches
        if (line.includes("December of") || line.includes("January of") || line.includes("February of") || line.includes("March of")) {
          const match = line.match(/(December|January|February|March)\s+of\s+\d{4}/i);
          if (match) {
            currentMonth = match[0].trim().replace(/\s+/g, "_");
            continue;
          }
        }

        const notes = cells[0];
        const staffNameRaw = cells[1];
        const hoursRaw = cells[3];
        const rateRaw = cells[4];
        const feesRaw = cells[5];
        const inrRaw = cells[6];
        const startedRaw = cells[8];    // XLSX col8 "Started"
        const finishRaw = cells[9];     // XLSX col9 "Finish"
        const paymentDoneRaw = cells[10];
        const dateDoneRaw = cells[12];  // XLSX col12 "Date done"
        const notes2Raw = cells[13];    // XLSX col13 "Notes 2"

        if (!staffNameRaw || staffNameRaw.includes("Staff") || staffNameRaw.includes("Count") || staffNameRaw.includes("Total Due") || staffNameRaw.trim() === "") continue;

        const cleanStaffName = staffNameRaw.split("(")[0].trim().replace(/ xx$/i, "");
        const hours = parseFloat(hoursRaw) || 0;
        const rateApplied = cleanNumeric(rateRaw) || null;
        const amount = cleanNumeric(feesRaw);
        const inrAmount = cleanNumeric(inrRaw);
        const paymentDone = paymentDoneRaw === "1" || paymentDoneRaw === "true";

        const parseStaffDate = (raw: string | null): Date | null => {
          if (!raw || raw.trim() === "") return null;
          const d = new Date(raw);
          return isNaN(d.getTime()) ? null : d;
        };
        const startDate = parseStaffDate(startedRaw);
        const endDate = parseStaffDate(finishRaw);
        const paymentDate = parseStaffDate(dateDoneRaw);
        const notes2 = notes2Raw && !isNaN(parseFloat(notes2Raw)) ? null : (notes2Raw || null); // col13 is sometimes a numeric INR value, skip those

        let staff = userCache.get(cleanStaffName.toLowerCase());

        const isStaffRole = cleanStaffName.match(/(Fahim|Supervisor|Manager|Atiqa|Aleena|Mahrukh|Seher)/i) !== null;
        const resolvedRole = isStaffRole ? "staff" : "teacher";

        if (!staff) {
          staff = await tx.user.create({
            data: {
              email: `${cleanStaffName.toLowerCase().replace(/[^a-z0-9]/g, "")}@divergencie.co.uk`,
              name: cleanStaffName,
              role: resolvedRole,
              active: true,
              hourlyRate: cleanNumeric(rateRaw),
              specialization: notes || "Tutor"
            }
          });
          userCache.set(`${cleanStaffName.toLowerCase()}_${resolvedRole}`, staff);
          userCache.set(cleanStaffName.toLowerCase(), staff);

          // Create normalized profile for newly created staff/teacher
          if (resolvedRole === "staff") {
            let roleTitle = "Administrative Staff";
            let qualification = "Bachelors Degree";
            if (cleanStaffName.toLowerCase().includes("atiqa")) {
              roleTitle = "Associate Project Manager"; qualification = "Project Management Professional (PMP)";
            } else if (cleanStaffName.toLowerCase().includes("aleena")) {
              roleTitle = "Teaching Assistant"; qualification = "Bachelors in Education";
            } else if (cleanStaffName.toLowerCase().includes("mahrukh")) {
              roleTitle = "SM Assistant"; qualification = "Bachelors in Media & Communications";
            } else if (cleanStaffName.toLowerCase().includes("seher")) {
              roleTitle = "Teaching Assistant"; qualification = "Bachelors in Science";
            }
            await tx.staffProfile.create({
              data: {
                userId: staff.id, firstName: cleanStaffName.split(" ")[0], lastName: cleanStaffName.split(" ")[1] || "Staff",
                dob: new Date("1998-05-20"), roleTitle, salaryType: cleanStaffName.toLowerCase().includes("atiqa") ? "monthly" : "hourly",
                salaryRate: cleanNumeric(rateRaw) || 20.0, latestQualification: qualification, bankAccountInfo: "SBI Main Staging Account xxxx754"
              }
            });
          } else {
            await tx.teacherProfile.create({
              data: {
                userId: staff.id, firstName: cleanStaffName.split(" ")[0], lastName: cleanStaffName.split(" ")[1] || "Tutor",
                dob: new Date("1995-08-15"), hourlyRate: cleanNumeric(rateRaw) || 15.0,
                latestQualification: "Bachelors in Cambridge CIE Pedagogy",
                teachingProfileUrl: `https://divergencie.co.uk/tutors/${cleanStaffName.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
                bankAccountInfo: "HDFC Main Staging Account xxxx432"
              }
            });
          }
        } else if (staff.role !== resolvedRole) {
          staff = await tx.user.update({ where: { id: staff.id }, data: { role: resolvedRole } });
          userCache.set(cleanStaffName.toLowerCase(), staff);
        }

        // Create Claim Record
        const claim = await tx.claim.create({
          data: {
            userId: staff.id,
            month: currentMonth,
            hours,
            rateApplied,
            amount,
            status: paymentDone ? "paid" : "pending",
            notes: notes || "Historical imported contract Timesheet",
            notes2,
            startDate,
            endDate,
            paymentDate
          }
        });

        // Log Double-Entry Ledger entries for Claim expenses
        if (amount > 0) {
          const transaction = await tx.accountTransaction.create({
            data: { description: `Import Compensation Claim - ${cleanStaffName} - ${currentMonth}` }
          });

          const expenseAccountName = resolvedRole === "teacher" ? "Teacher Compensation Expense" : "Staff Payroll Expense";
          const expenseAcc = accountMap.get(expenseAccountName);
          const creditAccountName = paymentDone ? "SBI Corporate Bank Account" : "DivergenCIE Corporate Cash Wallet";
          const assetAcc = accountMap.get(creditAccountName);

          if (expenseAcc && assetAcc) {
            await tx.ledgerEntry.create({
              data: { transactionId: transaction.id, accountId: expenseAcc.id, amount: inrAmount, claimId: claim.id }
            });
            await tx.ledgerEntry.create({
              data: { transactionId: transaction.id, accountId: assetAcc.id, amount: -inrAmount, claimId: claim.id }
            });
            accountBalances.set(expenseAccountName, (accountBalances.get(expenseAccountName) || 0) + inrAmount);
            accountBalances.set(creditAccountName, (accountBalances.get(creditAccountName) || 0) - inrAmount);
          }
        }
      }
    }

    // 10. SAVE FINAL ACCOUNT LEDGER BALANCES
    console.log("[ETL] Committing in-memory ledger account balance aggregates...");
    for (const [name, finalBalance] of accountBalances.entries()) {
      await tx.account.update({ where: { name }, data: { balance: finalBalance } });
    }

    // 11. GENERATE MONTHLY BILLING SUMMARIES (student-side)
    console.log("[ETL] Generating dynamic monthly billing cache summaries...");
    const allInvoices = await tx.studentInvoice.findMany();
    const monthGroups = new Map<string, any[]>();
    for (const inv of allInvoices) {
      if (!monthGroups.has(inv.month)) monthGroups.set(inv.month, []);
      monthGroups.get(inv.month)!.push(inv);
    }
    for (const [m, studentInvoices] of monthGroups.entries()) {
      const studentCount = await tx.studentMonthlyEnrollment.count({ where: { month: m, status: "Active" } });
      const totalLocalFees = studentInvoices.reduce((sum, inv) => sum + inv.feesAmount, 0);
      const totalINR = studentInvoices.reduce((sum, inv) => sum + inv.inrEquivalent, 0);
      const totalDueINR = studentInvoices.reduce((sum, inv) => sum + (inv.paymentDone ? 0 : inv.inrEquivalent), 0);
      const paidInvoices = studentInvoices.filter(inv => inv.paymentDone).length;
      const dueInvoices = studentInvoices.filter(inv => !inv.paymentDone).length;
      await tx.monthlyBillingSummary.create({
        data: { month: m, studentCount, totalLocalFees, totalINR, totalDueINR, paidInvoices, dueInvoices, paidRatio: studentInvoices.length > 0 ? (paidInvoices / studentInvoices.length) : 0 }
      });
    }

    // 12. GENERATE MONTHLY PAYROLL SUMMARIES (staff-side)
    console.log("[ETL] Generating monthly payroll summaries...");
    const allClaims = await tx.claim.findMany();
    const claimMonthGroups = new Map<string, any[]>();
    for (const c of allClaims) {
      if (!claimMonthGroups.has(c.month)) claimMonthGroups.set(c.month, []);
      claimMonthGroups.get(c.month)!.push(c);
    }
    for (const [m, claims] of claimMonthGroups.entries()) {
      const staffCount = new Set(claims.map((c: any) => c.userId)).size;
      const totalLocalFees = claims.reduce((sum: number, c: any) => sum + c.amount, 0);
      // Rough GBP→INR at 105 (approximate historical average)
      const totalINR = totalLocalFees * 105;
      const paidClaims = claims.filter((c: any) => c.status === "paid").length;
      const dueClaims = claims.filter((c: any) => c.status !== "paid").length;
      const totalDueINR = claims.filter((c: any) => c.status !== "paid").reduce((sum: number, c: any) => sum + c.amount, 0) * 105;
      await tx.monthlyPayrollSummary.create({
        data: { month: m, staffCount, totalLocalFees, totalINR, totalDueINR, paidClaims, dueClaims }
      });
    }

    console.log("[ETL] ETL Database Migration completed successfully!");
    return { success: true };
  }, {
    timeout: 300000 // 5 minutes timeout
  });
}
