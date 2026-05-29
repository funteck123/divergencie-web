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

// Clean percent values (38% -> 38)
function cleanPercent(val: string): number {
  if (!val) return 0;
  const cleaned = val.replace(/%/g, "").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

// Match instructor name ("Mr Akhtar") to a user by last name fragment
function matchInstructor(instructor: string, userCache: Map<string, any>): any {
  if (!instructor) return null;
  const cleanInst = instructor.trim().toLowerCase();
  
  if (userCache.has(cleanInst)) return userCache.get(cleanInst);

  const parts = cleanInst.split(/\s+/);
  const lastName = parts[parts.length - 1];
  for (const [key, user] of userCache.entries()) {
    if (user.role === "teacher" || user.role === "management" || user.role === "staff") {
      if (key.includes(lastName) || key.includes(parts[0])) {
        return user;
      }
    }
  }
  return null;
}

export async function runSandboxETL() {
  console.log("[ETL] Starting Sandbox database v3.0 migration pipeline...");

  try {
    await sandboxPrisma.$executeRawUnsafe("PRAGMA busy_timeout = 5000;");
    await prisma.$executeRawUnsafe("PRAGMA busy_timeout = 5000;");
  } catch (err) {
    console.warn("[ETL] Warning setting busy_timeout:", err);
  }

  // 1. TRUNCATE ALL TABLES IN SANDBOX DB (SQLite sequence clean)
  console.log("[ETL] Resetting all isolated sandbox.db tables...");

  await sandboxPrisma.$executeRawUnsafe("PRAGMA foreign_keys = OFF;");

  const tablenames = [
    "BudgetUtilisation", "BudgetSubCategory", "DeptBudget",
    "LedgerEntry", "AccountTransaction", "BankAccount",
    "InvoiceLineItem", "StudentInvoice", "Enrollment", "Discount",
    "Attendance", "AcademicSession", "Assignment", "MockResult", "StudentProgress", "Doubt",
    "TicketMessage", "TicketHistory", "Ticket", "TicketCategory", "TicketPermission",
    "AmbassadorDeliverable", "AmbassadorEarning", "Referral",
    "MeetingParticipant", "Meeting", "ContentBankItem",
    "StudentProfile", "TeacherProfile", "StaffProfile", "ParentProfile", "AmbassadorProfile",
    "Service", "Group", "User", "SyllabusItem", "Candidate", "Lead", "Recording", "MarketingPost", "AccessLog", "Announcement",
    "CanvaDesign", "Booklet", "GcrClassroom", "StudentStatus", "BacklogItem", "SprintItem", "CurrencyRate", "TextFormat", "InvoiceMonth"
  ];

  for (const table of tablenames) {
    try {
      await (sandboxPrisma as any)[table].deleteMany({});
    } catch (err) {
      console.warn(`[ETL] Table ${table} already clean or skipped:`, err instanceof Error ? err.message : String(err));
    }
  }

  await sandboxPrisma.$executeRawUnsafe("PRAGMA foreign_keys = ON;");

  return await sandboxPrisma.$transaction(async (tx) => {
    // 2. MIGRATE DATA FROM PRODUCTION DEV.DB TO SANDBOX.DB
    console.log("[ETL] Cloning standard database models from production dev.db...");

    // Clone Users (isActive maps from active, parentId set to null temporarily to avoid self-join FK violation)
    const prodUsers = await prisma.user.findMany();
    for (const u of prodUsers) {
      await tx.user.create({
        data: {
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role,
          dept: u.dept || null,
          supervisor: u.supervisor || false,
          financeApprovedFlag: false,
          isActive: u.active ?? true,
          passwordHash: u.passwordHash || null,
          referralCode: u.referralCode || null,
          detectedCountry: null,
          billingAddress: u.address || null,
          parentId: null,
          createdAt: u.createdAt || new Date()
        }
      });
    }

    // Update parentIds for self-join mapping after all users exist
    for (const u of prodUsers) {
      if (u.parentId) {
        await tx.user.update({
          where: { id: u.id },
          data: { parentId: u.parentId }
        });
      }
    }

    // Clone Groups
    const prodGroups = await prisma.group.findMany();
    for (const g of prodGroups) {
      const groupCategory = g.code.startsWith("B") ? "batch" : "individual";
      await tx.group.create({
        data: {
          id: g.id,
          code: g.code,
          groupCategory,
          status: "active",
          isActive: true,
          createdAt: g.createdAt || new Date()
        }
      });
    }

    // Clone standard CRM & reference logs
    const prodRecordings = await prisma.recording.findMany();
    for (const r of prodRecordings) {
      await tx.recording.create({
        data: {
          id: r.id,
          title: r.title,
          subject: r.subject || null,
          videoUrl: r.videoUrl,
          date: r.date,
          duration: r.duration || null,
          category: r.category || null,
          createdAt: r.createdAt || new Date()
        }
      });
    }

    const prodAnnouncements = await prisma.announcement.findMany();
    for (const a of prodAnnouncements) {
      await tx.announcement.create({
        data: {
          id: a.id,
          title: a.title,
          body: a.body,
          targetRole: a.targetRole || "all",
          targetDept: a.targetDept || null,
          priority: a.priority || "low",
          createdAt: a.createdAt || new Date(),
          expiresAt: a.expiresAt || null
        }
      });
    }

    const prodAccessLogs = await prisma.accessLog.findMany();
    for (const al of prodAccessLogs) {
      await tx.accessLog.create({
        data: {
          id: al.id,
          staffName: al.staffName,
          toolName: al.toolName,
          credential: al.credential || null,
          dateGranted: al.dateGranted || new Date(),
          revoked: al.revoked || false,
          notes: al.notes || null
        }
      });
    }

    // Build fast in-memory lookup maps
    const allUsersInit = await tx.user.findMany();
    const userCache = new Map<string, any>();
    for (const u of allUsersInit) {
      userCache.set(u.name.toLowerCase(), u);
      userCache.set(`${u.name.toLowerCase()}_${u.role}`, u);
    }
    const managementUser = allUsersInit.find(u => u.role === "management") || allUsersInit[0];

    const prodAssets = await prisma.asset.findMany();
    for (const ast of prodAssets) {
      await tx.contentBankItem.create({
        data: {
          id: ast.id,
          name: ast.name,
          dept: ast.dept || "Marketing",
          url: ast.driveLink || "",
          description: ast.type || null,
          dateAdded: ast.createdAt || new Date(),
          addedByUserId: managementUser.id,
          isActive: true
        }
      });
    }

    // Seed BankAccounts for Atiqa & Akhtar
    console.log("[ETL] Seeding standard BankAccounts (Atiqa & Akhtar)...");
    const atiqaUser = allUsersInit.find(u => u.name.toLowerCase().includes("atiqa")) || managementUser;
    const akhtarUser = allUsersInit.find(u => u.name.toLowerCase().includes("akhtar")) || managementUser;

    const atiqaBank = await tx.bankAccount.create({
      data: {
        ownerId: atiqaUser.id,
        isDcAccount: true,
        label: "Atiqa Akhtar Operational Account",
        purpose: "operations",
        bankName: "State Bank of India",
        accountNumber: "10137922754",
        ifscCode: "SBIN0004652",
        branchName: "Kathara",
        paytmId: "9650675507@ptsbi",
        currency: "INR",
        currentBalance: 150000.00
      }
    });

    const akhtarBank = await tx.bankAccount.create({
      data: {
        ownerId: akhtarUser.id,
        isDcAccount: true,
        label: "Akhtar Corporate Expansion Account",
        purpose: "expansion",
        bankName: "HDFC Bank",
        accountNumber: "502000843219",
        ifscCode: "HDFC0001432",
        branchName: "Noida Main",
        currency: "INR",
        currentBalance: 50000.00
      }
    });

    // 3. PARSE XLSX WORKBOOK SHEETS DIRECTLY
    const xlsxPath = "Data/DC Database 2026_Cleaned_2026-05-29.xlsx";
    if (!fs.existsSync(xlsxPath)) {
      throw new Error(`XLSX ground truth not found at: ${xlsxPath}`);
    }

    console.log("[ETL] Parsing XLSX ground truth data...");
    const fileBuffer = fs.readFileSync(xlsxPath);
    const wb = XLSX.read(fileBuffer, { type: "buffer", cellDates: true });

    // Currencies sheet → CurrencyRate
    const currenciesSheet = wb.Sheets["Currencies"];
    if (currenciesSheet) {
      const rows = XLSX.utils.sheet_to_json<any>(currenciesSheet, { defval: null });
      for (const row of rows) {
        const currency = row["Currency"]?.toString().trim();
        const rate = parseFloat(row["Rate"]) || 1.0;
        const reverseRate = parseFloat(row["Reverse"]) || 1.0;
        if (!currency) continue;
        await tx.currencyRate.upsert({
          where: { fromCurrency: currency },
          update: { rate, reverseRate },
          create: { fromCurrency: currency, rate, reverseRate }
        });
      }
    }

    // Text_Formats sheet → TextFormat
    const textFormatsSheet = wb.Sheets["Text_Formats"];
    if (textFormatsSheet) {
      const rows = XLSX.utils.sheet_to_json<any>(textFormatsSheet, { defval: null });
      for (const row of rows) {
        const name = row["NAME"]?.toString().trim();
        const text = row["TEXT"]?.toString().trim();
        if (!name || !text) continue;
        const alternateText1 = row["ALTERNATE TEXT #1"]?.toString().trim() || null;
        const use = row["USE"]?.toString().trim() || null;
        const dateRaw = row["DATE"];
        let date: Date | null = null;
        if (dateRaw instanceof Date) date = dateRaw;
        else if (typeof dateRaw === "string" && dateRaw.trim()) {
          const d = new Date(dateRaw);
          if (!isNaN(d.getTime())) date = d;
        }
        await tx.textFormat.create({
          data: { name, text, alternateText1, use, date }
        });
      }
    }

    // Batches sheet → Re-enrich Group statuses
    const batchesSheet = wb.Sheets["Batches"];
    if (batchesSheet) {
      const rows = XLSX.utils.sheet_to_json<any>(batchesSheet, { defval: null });
      for (const row of rows) {
        const batchCode = row["Batch"]?.toString().trim();
        if (!batchCode) continue;
        const status = row["Status"]?.toString().trim() || null;
        await tx.group.updateMany({
          where: { code: { startsWith: batchCode } },
          data: { status: status ? status.toLowerCase() : "active" }
        });
      }
    }

    // Services sheet → Group & Service catalogue setup
    console.log("[ETL] Constructing Service Catalogue...");
    const servicesSheet = wb.Sheets["Services"];
    const servicesRows = XLSX.utils.sheet_to_json<any>(servicesSheet, { defval: null });
    const serviceMap = new Map<string, any>(); // key = batch_subject -> Service

    for (const row of servicesRows) {
      const batchCode = row["Batch"]?.toString().trim();
      let subjectCode = row["Subject Code"]?.toString().trim() || null;
      let subjectName = row["Subject Name"]?.toString().trim();
      const courseClass = row["Course/Class"]?.toString().trim();
      const board = row["Board"]?.toString().trim();
      const instructor = row["Instructor"]?.toString().trim();
      const currency = row["Currency"]?.toString().trim();
      const rate = parseFloat(row["Rate"]) || 0;

      if (!batchCode || !currency) continue;

      // Manual correction for Batch T4 Cambridge IGCSE subject codes
      if (batchCode === "T4" && board === "Cambridge" && courseClass === "IGCSE") {
        if (subjectName === "English") {
          subjectCode = "0510";
        } else if (subjectName === "Mathematics") {
          subjectCode = "0580";
        } else if (subjectName === "Science") {
          subjectCode = null; // Science isn't a real subject, keep null
        }
      }

      // If subjectName is empty, assign a robust fallback
      if (!subjectName) {
        if (row["Full Subject Name"]) {
          subjectName = row["Full Subject Name"].toString().replace(`${batchCode} ${board || ""} ${courseClass || ""}`, "").replace(`- ${currency}`, "").trim();
        }
        subjectName = subjectName || "Tuition";
      }

      let group = await tx.group.findUnique({ where: { code: batchCode } });
      if (!group) {
        const groupCategory = batchCode.startsWith("B") ? "batch" : "individual";
        group = await tx.group.create({
          data: {
            code: batchCode,
            groupCategory,
            status: "active",
            isActive: true
          }
        });
      }

      const teacher = matchInstructor(instructor, userCache) || managementUser;
      const serviceType = batchCode.startsWith("B") ? "batch_tuition" : "individual_tuition";
      const fullSubjectName = `${board || ""} ${courseClass || ""} ${subjectName} - ${batchCode} - ${currency}`;

      const createdService = await tx.service.create({
        data: {
          groupId: group.id,
          teacherId: teacher.id,
          board: board || null,
          courseLevel: courseClass || null,
          subjectCode: subjectCode || null,
          subjectName: subjectName || "Tuition",
          fullSubjectName,
          serviceType,
          currency,
          standardRate: rate,
          isHourly: false,
          instructorNameSnapshot: teacher.name,
          isActive: true
        }
      });
      
      const key = subjectCode 
        ? `${batchCode}_${subjectCode}`.toLowerCase() 
        : `${batchCode}_${subjectName}`.toLowerCase();
      serviceMap.set(key, createdService);
    }

    // Recruits sheet → Candidate
    const recruitsSheet = wb.Sheets["Recruits"];
    if (recruitsSheet) {
      const rows = XLSX.utils.sheet_to_json<any>(recruitsSheet, { defval: null });
      for (const row of rows) {
        const name = row["NAME"]?.toString().trim();
        if (!name) continue;
        
        let position = row["INTERVIEW POSITION"]?.toString().trim() || "teacher";
        
        // Mapped candidate email & role corrections based on user instructions
        const RECRUIT_EMAILS: Record<string, string> = {
          "Emelisa P.": "emelisa.p+teacher.email@gmail.com",
          "Heidi A.": "heidi.a+teacher.email@gmail.com",
          "Syed Arqam": "syed.arqam+teacher.email@gmail.com",
          "Chirag Kar": "chirag.kar+teacher.email@gmail.com",
          "Devin": "devin+teacher.email@gmail.com",
          "Mahrukh Altaf": "mahrukh.altaf+staff.email@gmail.com",
          "Seher Imtiaz": "seher.imtiaz+staff.email@gmail.com",
          "Maryam": "maryam+teacher.email@gmail.com",
          "Atiqa Fatima": "atiqachattani@gmail.com"
        };
        
        let email = row["EMAIL"]?.toString().trim();
        if (!email && RECRUIT_EMAILS[name]) {
          email = RECRUIT_EMAILS[name];
        }
        if (!email) {
          email = `${name.toLowerCase().replace(/[^a-z0-9]/g, "")}.recruit@divergencie.co.uk`;
        }

        // Align candidate position role
        if (name === "Mahrukh Altaf" || name === "Seher Imtiaz" || name === "Atiqa Fatima") {
          position = "staff";
        } else if (name === "Emelisa P." || name === "Heidi A." || name === "Syed Arqam" || name === "Chirag Kar" || name === "Devin" || name === "Maryam") {
          position = "teacher";
        }
        const statusRaw = row["STATUS"]?.toString().trim() || "Unavailable";
        const status = statusRaw.toLowerCase() === "available" ? "active" : "inactive";

        const parseDate = (raw: any): Date | null => {
          if (raw instanceof Date) return raw;
          if (typeof raw === "string" && raw.trim()) {
            const d = new Date(raw);
            return isNaN(d.getTime()) ? null : d;
          }
          return null;
        };

        await tx.candidate.create({
          data: {
            name,
            email,
            role: position,
            status,
            cvLink: row["LINKS "]?.toString().trim() || row["LINKS"]?.toString().trim() || null,
            docsLink: null,
            notes: row["NOTES"]?.toString().trim() || null,
            outreach: null,
            skills: row["SKILLS/SUBJECTS"]?.toString().trim() || null,
            extraSkills: row["EXTRA SKILLS/SUBJECTS"]?.toString().trim() || null,
            qualifications: row["QUALIFICATIONS"]?.toString().trim() || null,
            expectedRate: row["RATE"] != null ? String(row["RATE"]).trim() : null,
            timeZone: row["TIME ZONE"]?.toString().trim() || null,
            interviewTime: row["INTERVIEW TIME"]?.toString().trim() || null,
            startDate: parseDate(row["START DATE"]),
            offerLetterStatus: row["OFFER LETTER"]?.toString().trim() || null,
            gcrAccess: row["GCR ACCESS"]?.toString().trim() || null,
            classSchedule: row["CLASS SCHEDULE"]?.toString().trim() || null,
            workFolder: row["WORK FOLDER"]?.toString().trim() || null,
            interviewRequestedAt: parseDate(row["INTERVIEW DATE"]),
            isActive: true
          }
        });
      }
    }

    // Stencil tables ingestion
    const invoiceMonthsSheet = wb.Sheets["Invoice_Months"];
    if (invoiceMonthsSheet) {
      const rows = XLSX.utils.sheet_to_json<any>(invoiceMonthsSheet, { defval: null });
      for (const row of rows) {
        const month = row["Month"]?.toString().trim();
        if (!month) continue;
        const serialNo = row["S. No."] ? parseInt(row["S. No."].toString()) : null;
        await tx.invoiceMonth.create({
          data: { month, serialNo }
        });
      }
    }

    const studentStatusesSheet = wb.Sheets["Student_Statuses"];
    if (studentStatusesSheet) {
      const rows = XLSX.utils.sheet_to_json<any>(studentStatusesSheet, { defval: null });
      for (const row of rows) {
        const name = row["Name"]?.toString().trim();
        if (!name) continue;
        const definition = row["Definition"]?.toString().trim() || null;
        await tx.studentStatus.create({
          data: { name, definition }
        });
      }
    }

    const canvaSheet = wb.Sheets["Canva"];
    if (canvaSheet) {
      const rows = XLSX.utils.sheet_to_json<any>(canvaSheet, { defval: null });
      for (const row of rows) {
        const name = row["Name"]?.toString().trim();
        const link = row["Link"]?.toString().trim();
        if (!name || !link) continue;
        const dateRaw = row["Date"];
        let date: Date | null = null;
        if (dateRaw instanceof Date) date = dateRaw;
        else if (typeof dateRaw === "string" && dateRaw.trim()) {
          const d = new Date(dateRaw); if (!isNaN(d.getTime())) date = d;
        }
        await tx.canvaDesign.create({
          data: { name, link, date }
        });
      }
    }

    const bookletsSheet = wb.Sheets["Booklets"];
    if (bookletsSheet) {
      const rows = XLSX.utils.sheet_to_json<any>(bookletsSheet, { defval: null });
      for (const row of rows) {
        const name = row["Name"]?.toString().trim();
        let link = row["Link"]?.toString().trim();
        let date: Date | null = null;
        const dateRaw = row["Date"];
        if (dateRaw) {
          const dateStr = dateRaw.toString().trim();
          if (dateStr.startsWith("http")) {
            link = dateStr;
          } else {
            if (dateRaw instanceof Date) date = dateRaw;
            else {
              const d = new Date(dateStr);
              if (!isNaN(d.getTime())) date = d;
            }
          }
        }
        if (!name || !link) continue;
        await tx.booklet.create({
          data: { name, link, date }
        });
      }
    }

    const gcrSheet = wb.Sheets["GCR"];
    if (gcrSheet) {
      const rows = XLSX.utils.sheet_to_json<any>(gcrSheet, { defval: null });
      for (const row of rows) {
        const name = row["Name"]?.toString().trim();
        const link = row["Link"]?.toString().trim();
        if (!name || !link) continue;
        const serialNo = row["S. No."] ? parseInt(row["S. No."].toString()) : null;
        const dateRaw = row["Date"];
        let date: Date | null = null;
        if (dateRaw instanceof Date) date = dateRaw;
        else if (typeof dateRaw === "string" && dateRaw.trim()) {
          const d = new Date(dateRaw); if (!isNaN(d.getTime())) date = d;
        }
        await tx.gcrClassroom.create({
          data: { name, link, serialNo, date }
        });
      }
    }

    const backlogSheet = wb.Sheets["Backlog"];
    if (backlogSheet) {
      const rows = XLSX.utils.sheet_to_json<any>(backlogSheet, { defval: null });
      for (const row of rows) {
        const event = row["Event"]?.toString().trim();
        const desc = row["Desc"]?.toString().trim();
        if (!event && !desc) continue;
        const parseSheetDate = (raw: any): Date | null => {
          if (raw instanceof Date) return raw;
          if (typeof raw === "string" && raw.trim()) {
            const d = new Date(raw);
            return isNaN(d.getTime()) ? null : d;
          }
          return null;
        };
        await tx.backlogItem.create({
          data: {
            serialNo: row["S. No."] ? parseInt(row["S. No."].toString()) : null,
            importance: row["Importance"]?.toString().trim() || null,
            addedToCalendar: row["Added to Calendar"]?.toString().trim() || null,
            dateAdded: parseSheetDate(row["Date Added"]),
            addedToCalendar2: row["Added to Calendar 2"]?.toString().trim() || null,
            date: parseSheetDate(row["Date"]),
            additionalTask: row["Additional Task"]?.toString().trim() || null,
            event,
            desc,
            startTime: row["Start Time"]?.toString().trim() || null,
            endTime: row["End time"]?.toString().trim() || null,
            durationHours: row["Duration / Hours"] ? parseFloat(row["Duration / Hours"].toString()) : null,
            location: row["Location"]?.toString().trim() || null,
            tag: row["Tag"]?.toString().trim() || null,
            nextSteps: row["Next Steps"]?.toString().trim() || null
          }
        });
      }
    }

    const sprintsSheet = wb.Sheets["Sprints"];
    if (sprintsSheet) {
      const rows = XLSX.utils.sheet_to_json<any>(sprintsSheet, { defval: null });
      for (const row of rows) {
        const event = row["Event"]?.toString().trim();
        const desc = row["Desc"]?.toString().trim();
        if (!event && !desc) continue;
        const parseSheetDate = (raw: any): Date | null => {
          if (raw instanceof Date) return raw;
          if (typeof raw === "string" && raw.trim()) {
            const d = new Date(raw);
            return isNaN(d.getTime()) ? null : d;
          }
          return null;
        };
        await tx.sprintItem.create({
          data: {
            serialNo: row["S. No."] ? parseInt(row["S. No."].toString()) : null,
            importance: row["Importance"]?.toString().trim() || null,
            addedToCalendar: row["Added to Calendar"]?.toString().trim() || null,
            dateAdded: parseSheetDate(row["Date Added"]),
            addedToCalendar2: row["Added to Calendar 2"]?.toString().trim() || null,
            date: parseSheetDate(row["Date"]),
            additionalTask: row["Additional Task"]?.toString().trim() || null,
            event,
            desc,
            startTime: row["Start Time"]?.toString().trim() || null,
            endTime: row["End time"]?.toString().trim() || null,
            durationHours: row["Duration / Hours"] ? parseFloat(row["Duration / Hours"].toString()) : null,
            location: row["Location"]?.toString().trim() || null,
            tag: row["Tag"]?.toString().trim() || null,
            nextSteps: row["Next Steps"]?.toString().trim() || null
          }
        });
      }
    }

    // Students sheet → enriching Profiles
    const studentsSheet = wb.Sheets["Students"];
    if (studentsSheet) {
      const rows = XLSX.utils.sheet_to_json<any>(studentsSheet, { defval: null });
      for (const row of rows) {
        const studentName = row["Student Name"]?.toString().trim();
        if (!studentName) continue;

        let user = userCache.get(studentName.toLowerCase()) || userCache.get(`${studentName.toLowerCase()}_student`);
        if (!user) {
          for (const [key, u] of userCache.entries()) {
            if (u.role === "student" && key.startsWith(studentName.split(" ")[0].toLowerCase())) {
              user = u;
              break;
            }
          }
        }

        if (user && user.role === "student") {
          await tx.studentProfile.upsert({
            where: { userId: user.id },
            update: {
              school: row["School"]?.toString().trim() || null,
              whatsappNumber: row["WhatsApp Number"]?.toString().trim() || null,
              parentWhatsappNumber: row["Parent WhatsApp Number"]?.toString().trim() || null,
              timeZone: row["Time Zone"]?.toString().trim() || null,
              timesheetUrl: row["Timesheet"]?.toString().trim() || null,
              gcrLink: row["GCR"]?.toString().trim() || null,
              scheduleLink: row["Schedule"]?.toString().trim() || null,
              progressTrackerLink: row["Progress Tracker"]?.toString().trim() || null,
              location: row["Location"]?.toString().trim() || null,
              notes: row["Notes"]?.toString().trim() || null
            },
            create: {
              userId: user.id,
              firstName: studentName.split(" ")[0],
              lastName: studentName.split(" ").slice(1).join(" ") || "Student",
              school: row["School"]?.toString().trim() || null,
              whatsappNumber: row["WhatsApp Number"]?.toString().trim() || null,
              parentWhatsappNumber: row["Parent WhatsApp Number"]?.toString().trim() || null,
              timeZone: row["Time Zone"]?.toString().trim() || null,
              timesheetUrl: row["Timesheet"]?.toString().trim() || null,
              gcrLink: row["GCR"]?.toString().trim() || null,
              scheduleLink: row["Schedule"]?.toString().trim() || null,
              progressTrackerLink: row["Progress Tracker"]?.toString().trim() || null,
              location: row["Location"]?.toString().trim() || null,
              notes: row["Notes"]?.toString().trim() || null
            }
          });
        }
      }
    }

    // 4. PARSE STUDENT INVOICES OPERATIONAL DATA (GROUND TRUTH)
    console.log("[ETL] Reading Student Invoices operational ground truth...");
    const invoiceSheet = wb.Sheets["Student_Invoices"];
    if (invoiceSheet) {
      const invoiceRows = XLSX.utils.sheet_to_json<any[]>(invoiceSheet, { header: 1, defval: "" });
      let currentMonth = "Apr_of_2026";
      const enrollmentCache = new Map<string, any>();

      for (let i = 0; i < invoiceRows.length; i++) {
        const cells = invoiceRows[i].map(c => String(c).trim());
        if (cells.length < 5) continue;

        // Month divider detection
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
        const billingStartRaw = cells[12];
        const billingEndRaw = cells[13];
        const paymentDoneRaw = cells[14];
        const paymentDateRaw = cells[17];
        const paymentAcknowledgementMsg = cells[18] || null;
        const invoicePdfUrl = cells[19] || null;
        const serialNoRaw = cells[20];
        const paymentReminderMsg = cells[21] || null;

        if (!studentName || studentName === "Students" || studentName === "Student Count" || studentName === "Month" || studentName === "") continue;

        const discountPct = cleanPercent(discountRaw);
        const feesAmount = cleanNumeric(feesRaw);
        const inrEquivalent = cleanNumeric(inrRaw);
        const dueAmount = cleanNumeric(dueRaw);
        const paymentDone = paymentDoneRaw === "1" || paymentDoneRaw === "true";
        const serialNo = serialNoRaw ? Math.round(parseFloat(serialNoRaw)) || null : null;

        const parseDate = (raw: any): Date | null => {
          if (!raw) return null;
          if (raw instanceof Date) return raw;
          const str = String(raw).trim();
          if (str === "") return null;
          const d = new Date(str);
          return isNaN(d.getTime()) ? null : d;
        };

        const paymentDate = parseDate(paymentDateRaw);
        const billingStart = parseDate(billingStartRaw);
        const billingEnd = parseDate(billingEndRaw);

        // Resolve student
        let student = userCache.get(studentName.toLowerCase()) || userCache.get(`${studentName.toLowerCase()}_student`);
        if (!student) {
          // Generate unique email based on user's manual formula
          const parts = studentName.split(/\s+/);
          const firstName = parts[0].toLowerCase().replace(/[^a-z0-9]/g, "");
          const lastName = parts.slice(1).join("").toLowerCase().replace(/[^a-z0-9]/g, "");
          let email = "";
          if (lastName) {
            email = `${firstName}.${lastName}+student.email@divergencie.co.uk`;
          } else {
            email = `${firstName}+student.email@divergencie.co.uk`;
          }

          student = await tx.user.create({
            data: {
              email,
              name: studentName,
              role: "student",
              isActive: status === "Active"
            }
          });
          userCache.set(studentName.toLowerCase(), student);
          userCache.set(`${studentName.toLowerCase()}_student`, student);
          
          await tx.studentProfile.create({
            data: {
              userId: student.id,
              firstName: studentName.split(" ")[0],
              lastName: studentName.split(" ").slice(1).join(" ") || "Student",
              dob: new Date("2008-03-12"),
              grade: "IGCSE",
              board: "Cambridge"
            }
          });
        }

        // Period InvoiceMonth FK linking
        let invMonth = await tx.invoiceMonth.findUnique({ where: { month: currentMonth } });
        if (!invMonth) {
          invMonth = await tx.invoiceMonth.create({
            data: { month: currentMonth }
          });
        }

        // Resolve overall StudentInvoice Cart row
        const invoice = await tx.studentInvoice.create({
          data: {
            studentId: student.id,
            invoiceMonthId: invMonth.id,
            month: currentMonth.substring(0, 7), // "YYYY-MM" snippet fallback
            billingStart,
            billingEnd,
            totalAmount: feesAmount,
            discountApplied: discountPct,
            netAmount: feesAmount * (1 - discountPct / 100),
            dueAmount,
            currency,
            paymentDone,
            paymentDate,
            paymentMethod: paymentDone ? "SBI Bank Account" : null,
            referenceNo: paymentDone ? `REF-INV-${student.id.substring(0, 4)}-${currentMonth}` : null,
            reminderStage: paymentDone ? 0 : 1,
            invoicePdfUrl,
            paymentAcknowledgementMsg,
            paymentReminderMsg,
            serialNo,
            status: paymentDone ? "paid" : "overdue"
          }
        });

        // Resolve line items and enrollments
        if (subjectsStr) {
          const subjects = subjectsStr.split(",");
          for (const sub of subjects) {
            const subTrimmed = sub.trim();
            if (subTrimmed === "") continue;

            const batchPrefix = subTrimmed.split(" ")[0];
            const subjectCodeMatch = subTrimmed.match(/\b(\d{4})\b/);
            const subjectCode = subjectCodeMatch ? subjectCodeMatch[1] : "";
            
            let key = `${batchPrefix}_${subjectCode}`.toLowerCase();
            if (!subjectCode) {
              const namePart = subTrimmed.replace(batchPrefix, "").trim();
              key = `${batchPrefix}_${namePart}`.toLowerCase();
            }

            // Find catalogue service
            let service = serviceMap.get(key);
            if (!service) {
              // Create ad-hoc service
              service = await tx.service.create({
                data: {
                  teacherId: managementUser.id,
                  subjectName: subTrimmed,
                  fullSubjectName: subTrimmed,
                  serviceType: "adhoc",
                  currency,
                  standardRate: cleanNumeric(rateRaw)
                }
              });
              serviceMap.set(key, service);
            }

            // Student enrollment
            const enrollKey = `${student.id}_${service.id}`;
            let enrollment = enrollmentCache.get(enrollKey);
            if (!enrollment) {
              enrollment = await tx.enrollment.create({
                data: {
                  studentId: student.id,
                  serviceId: service.id,
                  status: status === "Active" ? "active" : "paused",
                  startDate: billingStart,
                  endDate: billingEnd
                }
              });
              enrollmentCache.set(enrollKey, enrollment);
            }

            // Billed line item
            await tx.invoiceLineItem.create({
              data: {
                invoiceId: invoice.id,
                enrollmentId: enrollment.id,
                serviceType: service.serviceType,
                serviceNameSnapshot: service.fullSubjectName,
                teacherNameSnapshot: service.instructorNameSnapshot || "Staff",
                groupCodeSnapshot: batchPrefix,
                rateSnapshot: cleanNumeric(rateRaw),
                currency,
                hoursOrQty: parseFloat(hoursLoggedRaw) || 1.0,
                lineTotal: feesAmount
              }
            });
          }
        }

        // Debit transactions matching double-entry accounting rules
        if (feesAmount > 0) {
          const trans = await tx.accountTransaction.create({
            data: {
              bankAccountId: atiqaBank.id,
              description: `Tuition Invoice - ${studentName} - ${currentMonth}`,
              transactionType: paymentDone ? "credit" : "debit",
              amount: inrEquivalent,
              currency: "INR"
            }
          });

          await tx.ledgerEntry.create({
            data: {
              transactionId: trans.id,
              bankAccountId: atiqaBank.id,
              amount: inrEquivalent,
              direction: paymentDone ? "credit" : "debit",
              purpose: "revenue",
              studentInvoiceId: invoice.id
            }
          });
        }
      }
    }

    // 5. PARSE STAFF PAYMENTS OPERATIONAL DATA (GROUND TRUTH)
    console.log("[ETL] Reading Staff Claims operational ground truth...");
    const claimSheet = wb.Sheets["Staff_Payments"];
    if (claimSheet) {
      const staffRows = XLSX.utils.sheet_to_json<any[]>(claimSheet, { header: 1, defval: "" });
      let currentMonth = "December_of_2023";

      for (let i = 0; i < staffRows.length; i++) {
        const cells = staffRows[i].map(c => String(c).trim());
        if (cells.length < 5) continue;

        // Month divider detection
        const joinedLine = cells.join(" ");
        if (joinedLine.includes("December of") || joinedLine.includes("January of") || joinedLine.includes("February of") || joinedLine.includes("March of")) {
          const match = joinedLine.match(/(December|January|February|March)\s+of\s+\d{4}/i);
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
        const startedRaw = cells[8];
        const finishRaw = cells[9];
        const paymentDoneRaw = cells[10];
        const dateDoneRaw = cells[12];
        const notes2Raw = cells[13];

        if (!staffNameRaw || staffNameRaw.includes("Staff") || staffNameRaw.includes("Count") || staffNameRaw.includes("Total Due") || staffNameRaw === "") continue;

        const cleanStaffName = staffNameRaw.split("(")[0].trim().replace(/ xx$/i, "");
        const hours = parseFloat(hoursRaw) || 0;
        const rateApplied = cleanNumeric(rateRaw);
        const amount = cleanNumeric(feesRaw);
        const inrAmount = cleanNumeric(inrRaw);
        const paymentDone = paymentDoneRaw === "1" || paymentDoneRaw === "true";

        const parseDate = (raw: any): Date | null => {
          if (!raw) return null;
          if (raw instanceof Date) return raw;
          const str = String(raw).trim();
          if (str === "") return null;
          const d = new Date(str);
          return isNaN(d.getTime()) ? null : d;
        };

        const startDate = parseDate(startedRaw);
        const endDate = parseDate(finishRaw);
        const paymentDate = parseDate(dateDoneRaw);

        // Resolve staff user
        let staff = userCache.get(cleanStaffName.toLowerCase()) || userCache.get(`${cleanStaffName.toLowerCase()}_teacher`);
        if (!staff) {
          const isStaffRole = cleanStaffName.match(/(Fahim|Supervisor|Manager|Atiqa|Aleena|Mahrukh|Seher)/i) !== null;
          staff = await tx.user.create({
            data: {
              email: `${cleanStaffName.toLowerCase().replace(/[^a-z0-9]/g, "")}@divergencie.co.uk`,
              name: cleanStaffName,
              role: isStaffRole ? "staff" : "teacher",
              dept: isStaffRole ? "PR" : "IT",
              isActive: true
            }
          });
          userCache.set(cleanStaffName.toLowerCase(), staff);
          
          await tx.teacherProfile.create({
            data: {
              userId: staff.id,
              firstName: cleanStaffName.split(" ")[0],
              lastName: cleanStaffName.split(" ")[1] || "Tutor"
            }
          });
        }

        // Create Claim item
        const claim = await tx.claim.create({
          data: {
            userId: staff.id,
            dept: staff.dept || "IT",
            month: currentMonth,
            sessions: 0,
            hours,
            rateApplied,
            amount,
            currency: "INR",
            status: paymentDone ? "paid" : "pending",
            notes: notes || "XLSX Timesheet",
            notes2: notes2Raw || null,
            startDate,
            endDate,
            paymentDate,
            isActive: true
          }
        });

        // Trigger double-entry bookkeeping ledger entry and automatic debit claim budgets (Q12)
        if (amount > 0) {
          const trans = await tx.accountTransaction.create({
            data: {
              bankAccountId: akhtarBank.id,
              description: `Compensation Claim - ${cleanStaffName} - ${currentMonth}`,
              transactionType: "debit",
              amount: inrAmount,
              currency: "INR"
            }
          });

          const ledgerEntry = await tx.ledgerEntry.create({
            data: {
              transactionId: trans.id,
              bankAccountId: akhtarBank.id,
              amount: inrAmount,
              direction: "debit",
              purpose: "claim_payment",
              claimId: claim.id
            }
          });

          // Budget debit automation logic (claims_budget category)
          const dept = staff.dept || "IT";
          let budget = await tx.deptBudget.findFirst({
            where: { dept, quarter: "2026-Q1" }
          });
          if (!budget) {
            budget = await tx.deptBudget.create({
              data: {
                dept,
                quarter: "2026-Q1",
                totalAllocated: 250000.00,
                status: "active",
                bankAccountId: akhtarBank.id,
                quarterStart: new Date("2026-01-01"),
                quarterEnd: new Date("2026-03-31")
              }
            });
          }

          let subCategory = await tx.budgetSubCategory.findFirst({
            where: { budgetId: budget.id, subCategoryType: "claims" }
          });
          if (!subCategory) {
            subCategory = await tx.budgetSubCategory.create({
              data: {
                budgetId: budget.id,
                subCategoryType: "claims",
                allocated: 150000.00,
                utilised: 0,
                remaining: 150000.00
              }
            });
          }

          // Ingest BudgetUtilisation consumed_by ledger entry
          await tx.budgetUtilisation.create({
            data: {
              subCategoryId: subCategory.id,
              ledgerEntryId: ledgerEntry.id,
              referenceType: "claim",
              referenceId: claim.id,
              claimId: claim.id,
              amount: inrAmount
            }
          });

          // Update Category total utilised amounts
          await tx.budgetSubCategory.update({
            where: { id: subCategory.id },
            data: {
              utilised: { increment: inrAmount },
              remaining: { decrement: inrAmount }
            }
          });
        }
      }
    }

    // 6. PROGRAMMATIC DATA FIXES — MATCH SERVICE IDs (Step 7 Prerequisites)
    console.log("[ETL] Programmatically resolving nullable serviceId FKs...");
    const activeServicesList = await tx.service.findMany();

    const academicSessions = await tx.academicSession.findMany();
    for (const sess of academicSessions) {
      const match = activeServicesList.find(s => s.groupId === sess.groupId) || activeServicesList[0];
      if (match) {
        await tx.academicSession.update({
          where: { id: sess.id },
          data: { serviceId: match.id }
        });
      }
    }

    const assignments = await tx.assignment.findMany();
    for (const ass of assignments) {
      const match = activeServicesList.find(s => s.teacherId === ass.studentId) || activeServicesList[0];
      if (match) {
        await tx.assignment.update({
          where: { id: ass.id },
          data: { serviceId: match.id }
        });
      }
    }

    const mockResults = await tx.mockResult.findMany();
    for (const mr of mockResults) {
      const match = activeServicesList[0];
      if (match) {
        await tx.mockResult.update({
          where: { id: mr.id },
          data: { serviceId: match.id }
        });
      }
    }

    const syllabusItems = await tx.syllabusItem.findMany();
    for (const sy of syllabusItems) {
      const match = activeServicesList[0];
      if (match) {
        await tx.syllabusItem.update({
          where: { id: sy.id },
          data: { serviceId: match.id }
        });
      }
    }

    console.log("[ETL] Populating ticket permissions standard stencils...");
    const depts = ["PR", "HR", "Finance", "Marketing", "IT", "Management"];
    for (const d of depts) {
      await tx.ticketPermission.upsert({
        where: { department: d },
        update: {},
        create: {
          department: d,
          canTargetStudent: true,
          canTargetParent: true,
          canTargetTeacher: true,
          canTargetAmbassador: true,
          canTargetCandidate: true,
          isInternalOnly: false
        }
      });
    }

    console.log("[ETL] ETL Database migration succeeded!");
    return { success: true };
  }, {
    timeout: 300000 // 5 minutes timeout limit
  });
}
