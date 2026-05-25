import fs from "fs";
import path from "path";
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
    "ledgerEntry", "accountTransaction", "account",
    "studentInvoice", "resourceInvoice", "counsellingInvoice",
    "enrollmentPackageItem", "studentMonthlyEnrollment", "studentRateOverride", "batchRateCard",
    "claim", "dCBankAccount", "monthlyBillingSummary", "monthlyPayrollSummary",
    "attendance", "academicSession", "assignment", "studentProgress", "doubt", "recording",
    "ticketMessage", "ticketHistory", "ticket", "ticketCategory", "ticketPermission",
    "referral", "meetingParticipant", "meeting", "group", "user",
    "syllabusItem", "mockResult", "candidate", "lead", "announcement", "asset", "accessLog"
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

    // Clone Groups
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

    // Ensure every cloned user has a corresponding sub-profile table entry based on their role
    console.log("[ETL] Creating normalized profiles for cloned users...");
    const clonedUsers = await tx.user.findMany();
    for (const u of clonedUsers) {
      if (u.role === "staff") {
        const existing = await tx.staffProfile.findUnique({ where: { userId: u.id } });
        if (!existing) {
          let roleTitle = "Administrative Staff";
          let qualification = "Bachelors Degree";
          
          if (u.name.toLowerCase().includes("atiqa")) {
            roleTitle = "Associate Project Manager";
            qualification = "Project Management Professional (PMP)";
            // Set Atiqa's historical APM bio
            await tx.user.update({
              where: { id: u.id },
              data: { bio: "Assistant Project Manager (before March 2026)" }
            });
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
        }
      } else if (u.role === "teacher") {
        const existing = await tx.teacherProfile.findUnique({ where: { userId: u.id } });
        if (!existing) {
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
        }
      } else if (u.role === "student") {
        const existing = await tx.studentProfile.findUnique({ where: { userId: u.id } });
        if (!existing) {
          await tx.studentProfile.create({
            data: {
              userId: u.id,
              firstName: u.name.split(" ")[0],
              lastName: u.name.split(" ")[1] || "Student",
              dob: new Date("2008-03-12"),
              grade: u.grade || "IGCSE",
              board: u.board || "Cambridge",
              targetUni: u.targetUni || "Oxford University",
              paymentMethodPreference: "SBI Corporate Bank Account"
            }
          });
        }
      } else if (u.role === "parent") {
        const existing = await tx.parentProfile.findUnique({ where: { userId: u.id } });
        if (!existing) {
          await tx.parentProfile.create({
            data: {
              userId: u.id,
              firstName: u.name.split(" ")[0],
              lastName: u.name.split(" ")[1] || "Parent",
              phone: u.phone || "+44 7700 900077",
              address: u.address || "12 Baker St, London, UK"
            }
          });
        }
      } else if (u.role === "ambassador") {
        const existing = await tx.ambassadorProfile.findUnique({ where: { userId: u.id } });
        if (!existing) {
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
    }

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
      { name: "Social Media Campaigns Q1 2026", accountType: "ASSET", balance: 0 } // Campaign budget
    ];

    const accountMap = new Map<string, any>();
    const accountBalances = new Map<string, number>();
    for (const acc of accountsData) {
      const createdAcc = await tx.account.create({ data: acc });
      accountMap.set(createdAcc.name, createdAcc);
      accountBalances.set(createdAcc.name, createdAcc.balance);
    }

    // Create default corporate bank methods
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

    // 4. PRE-CACHE COMMONLY LOOKED UP TABLES
    console.log("[ETL] Building fast in-memory lookups for users, groups, and bank accounts...");
    const allUsers = await tx.user.findMany();
    const userCache = new Map<string, any>();
    for (const u of allUsers) {
      userCache.set(`${u.name.toLowerCase()}_${u.role}`, u);
      // Also index by name lowercase for backup matching
      userCache.set(u.name.toLowerCase(), u);
    }

    const allGroups = await tx.group.findMany();

    const enrollmentCache = new Map<string, any>();

    // 5. PARSE STUDENT INVOICES SPREADSHEET
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
        const paymentDoneRaw = cells[14];
        const paymentDateRaw = cells[17];
        const invoicePdfUrl = cells[19];
        
        // Skip header lines or totals/blank names
        if (!studentName || studentName === "Students" || studentName === "Student Count" || studentName === "Month" || studentName === "Date" || studentName === "") continue;
        
        // Clean values
        const discountPct = cleanPercent(discountRaw);
        const feesAmount = cleanNumeric(feesRaw);
        const inrEquivalent = cleanNumeric(inrRaw);
        const dueAmount = cleanNumeric(dueRaw);
        const paymentDone = paymentDoneRaw === "1" || paymentDoneRaw === "true";
        let paymentDate: Date | null = null;
        if (paymentDateRaw && paymentDateRaw.trim() !== "") {
          const parsedDate = new Date(paymentDateRaw);
          if (!isNaN(parsedDate.getTime())) {
            paymentDate = parsedDate;
          }
        }
        
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

          // Seed dynamic StudentProfile matching GSheet CSV properties
          await tx.studentProfile.create({
            data: {
              userId: student.id,
              firstName: studentName.split(" ")[0],
              lastName: studentName.split(" ")[1] || "Student",
              dob: new Date("2008-03-12"),
              grade: "IGCSE",
              board: "Cambridge",
              targetUni: "Oxford University",
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
            
            // Match matching Group code from cache
            const group = allGroups.find(g => g.code.includes(subTrimmed.substring(0, 3)));
            
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
            feesAmount,
            discountApplied: discountPct,
            netAmount: feesAmount * (1 - discountPct / 100),
            inrEquivalent,
            dueAmount,
            paymentDone,
            paymentDate,
            paymentMethod: paymentDone ? "SBI Corporate Bank Account" : null,
            referenceNo: paymentDone ? `REF-MIG-${currentMonth.toUpperCase()}-${student.id.substring(0, 4)}` : null,
            invoicePdfUrl
          }
        });
        
        // E. Log Double-Entry Ledger Record for Invoiced Revenue
        if (feesAmount > 0) {
          const transaction = await tx.accountTransaction.create({
            data: {
              description: `Import Tuition Fee Invoice - ${studentName} - ${currentMonth}`
            }
          });
          
          // Debit Asset (Due balance or Paid cash)
          const activeAssetAccount = paymentDone ? "SBI Corporate Bank Account" : "DivergenCIE Corporate Cash Wallet";
          const assetAcc = accountMap.get(activeAssetAccount);
          const revAcc = accountMap.get("Tuition Fees Revenue Account");
          
          if (assetAcc && revAcc) {
            await tx.ledgerEntry.create({
              data: {
                transactionId: transaction.id,
                accountId: assetAcc.id,
                amount: inrEquivalent,
                studentInvoiceId: invoice.id
              }
            });
            
            // Credit Revenue Account
            await tx.ledgerEntry.create({
              data: {
                transactionId: transaction.id,
                accountId: revAcc.id,
                amount: -inrEquivalent,
                studentInvoiceId: invoice.id
              }
            });
            
            // Update Account Balances in cache
            accountBalances.set(activeAssetAccount, (accountBalances.get(activeAssetAccount) || 0) + inrEquivalent);
            accountBalances.set("Tuition Fees Revenue Account", (accountBalances.get("Tuition Fees Revenue Account") || 0) + inrEquivalent);
          }
        }
      }
    }

    // 6. PARSE STAFF PAYMENTS SPREADSHEET
    console.log("[ETL] Parsing Staff Payments CSV operational data...");
    const staffPaymentsPath = path.join(process.cwd(), "planning", "old system data", "DC Staff_Students 2026 - Staff Payments 2024.csv");
    
    if (fs.existsSync(staffPaymentsPath)) {
      const fileContent = fs.readFileSync(staffPaymentsPath, "utf-8");
      const lines = fileContent.split(/\r?\n/);
      
      let currentMonth = "December of 2023";
      
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
        const status = cells[2];
        const hoursRaw = cells[3];
        const rateRaw = cells[4];
        const feesRaw = cells[5];
        const inrRaw = cells[6];
        const dueRaw = cells[7];
        const paymentDoneRaw = cells[10];
        
        if (!staffNameRaw || staffNameRaw.includes("Staff") || staffNameRaw.includes("Count") || staffNameRaw.includes("Total Due") || staffNameRaw.trim() === "") continue;
        
        const cleanStaffName = staffNameRaw.split("(")[0].trim().replace(/ xx$/i, "");
        const hours = parseFloat(hoursRaw) || 0;
        const amount = cleanNumeric(feesRaw);
        const inrAmount = cleanNumeric(inrRaw);
        const paymentDone = paymentDoneRaw === "1" || paymentDoneRaw === "true";
        
        // A. Match or create Staff/Teacher user profile from cache
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
        } else if (staff.role !== resolvedRole) {
          // Sync role to correctly separate profiles
          staff = await tx.user.update({
            where: { id: staff.id },
            data: { role: resolvedRole }
          });
          userCache.set(cleanStaffName.toLowerCase(), staff);
        }

        // Initialize staging profile
        if (resolvedRole === "staff") {
          const profileKey = `profile_staff_${staff.id}`;
          if (!userCache.has(profileKey)) {
            let roleTitle = "Administrative Staff";
            let qualification = "Bachelors Degree";
            
            if (cleanStaffName.toLowerCase().includes("atiqa")) {
              roleTitle = "Associate Project Manager";
              qualification = "Project Management Professional (PMP)";
            } else if (cleanStaffName.toLowerCase().includes("aleena")) {
              roleTitle = "Teaching Assistant";
              qualification = "Bachelors in Education";
            } else if (cleanStaffName.toLowerCase().includes("mahrukh")) {
              roleTitle = "SM Assistant";
              qualification = "Bachelors in Media & Communications";
            } else if (cleanStaffName.toLowerCase().includes("seher")) {
              roleTitle = "Teaching Assistant";
              qualification = "Bachelors in Science";
            }
            
            await tx.staffProfile.create({
              data: {
                userId: staff.id,
                firstName: cleanStaffName.split(" ")[0],
                lastName: cleanStaffName.split(" ")[1] || "Staff",
                dob: new Date("1998-05-20"),
                roleTitle,
                salaryType: cleanStaffName.toLowerCase().includes("atiqa") ? "monthly" : "hourly",
                salaryRate: cleanNumeric(rateRaw) || 20.0,
                latestQualification: qualification,
                bankAccountInfo: "SBI Main Staging Account xxxx754"
              }
            });
            userCache.set(profileKey, true);
          }
        } else {
          const profileKey = `profile_teacher_${staff.id}`;
          if (!userCache.has(profileKey)) {
            await tx.teacherProfile.create({
              data: {
                userId: staff.id,
                firstName: cleanStaffName.split(" ")[0],
                lastName: cleanStaffName.split(" ")[1] || "Tutor",
                dob: new Date("1995-08-15"),
                hourlyRate: cleanNumeric(rateRaw) || 15.0,
                latestQualification: "Bachelors in Cambridge CIE Pedagogy",
                teachingProfileUrl: `https://divergencie.co.uk/tutors/${cleanStaffName.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
                bankAccountInfo: "HDFC Main Staging Account xxxx432"
              }
            });
            userCache.set(profileKey, true);
          }
        }
        
        // B. Create Claim Record
        const claim = await tx.claim.create({
          data: {
            userId: staff.id,
            month: currentMonth,
            hours,
            amount,
            status: paymentDone ? "paid" : "pending",
            notes: notes || "Historical imported contract Timesheet"
          }
        });
        
        // C. Log Double-Entry Ledger entries for Claim expenses
        if (amount > 0) {
          const transaction = await tx.accountTransaction.create({
            data: {
              description: `Import Compensation Claim - ${cleanStaffName} - ${currentMonth}`
            }
          });
          
          const expenseAccountName = staff.role === "teacher" ? "Teacher Compensation Expense" : "Staff Payroll Expense";
          const expenseAcc = accountMap.get(expenseAccountName);
          
          // Credit Bank / Cash Asset (if paid) or Expense Payable Liability (if unpaid)
          const creditAccountName = paymentDone ? "SBI Corporate Bank Account" : "DivergenCIE Corporate Cash Wallet";
          const assetAcc = accountMap.get(creditAccountName);
          
          if (expenseAcc && assetAcc) {
            // Debit Expense Account
            await tx.ledgerEntry.create({
              data: {
                transactionId: transaction.id,
                accountId: expenseAcc.id,
                amount: inrAmount,
                claimId: claim.id
              }
            });
            
            // Credit Asset Account
            await tx.ledgerEntry.create({
              data: {
                transactionId: transaction.id,
                accountId: assetAcc.id,
                amount: -inrAmount,
                claimId: claim.id
              }
            });
            
            // Update Balances in cache
            accountBalances.set(expenseAccountName, (accountBalances.get(expenseAccountName) || 0) + inrAmount);
            accountBalances.set(creditAccountName, (accountBalances.get(creditAccountName) || 0) - inrAmount);
          }
        }
      }
    }

    // 7. SAVE FINAL ACCOUNT LEDGER BALANCES
    console.log("[ETL] Committing in-memory ledger account balance aggregates...");
    for (const [name, finalBalance] of accountBalances.entries()) {
      await tx.account.update({
        where: { name },
        data: { balance: finalBalance }
      });
    }

    // 8. RUN DYNAMIC SUMMARIES AGGREGATIONS
    console.log("[ETL] Generating dynamic monthly cache summaries...");
    
    // Aggregate Student Invoices by Month
    const allInvoices = await tx.studentInvoice.findMany();
    const monthGroups = new Map<string, any[]>();
    for (const inv of allInvoices) {
      const m = inv.month;
      if (!monthGroups.has(m)) {
        monthGroups.set(m, []);
      }
      monthGroups.get(m)!.push(inv);
    }
    
    for (const [m, studentInvoices] of monthGroups.entries()) {
      const studentCount = await tx.studentMonthlyEnrollment.count({
        where: { month: m, status: "Active" }
      });
      const totalLocalFees = studentInvoices.reduce((sum, inv) => sum + inv.feesAmount, 0);
      const totalINR = studentInvoices.reduce((sum, inv) => sum + inv.inrEquivalent, 0);
      const totalDueINR = studentInvoices.reduce((sum, inv) => sum + (inv.paymentDone ? 0 : inv.inrEquivalent), 0);
      const paidInvoices = studentInvoices.filter(inv => inv.paymentDone).length;
      const dueInvoices = studentInvoices.filter(inv => !inv.paymentDone).length;
      
      await tx.monthlyBillingSummary.create({
        data: {
          month: m,
          studentCount,
          totalLocalFees,
          totalINR,
          totalDueINR,
          paidInvoices,
          dueInvoices,
          paidRatio: studentInvoices.length > 0 ? (paidInvoices / studentInvoices.length) : 0
        }
      });
    }

    console.log("[ETL] ETL Database Migration completed successfully!");
    return { success: true };
  }, {
    timeout: 300000 // 5 minutes timeout
  });
}
