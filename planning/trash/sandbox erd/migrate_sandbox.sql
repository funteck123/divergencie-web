-- =============================================================================
-- DivergenCIE Sandbox — Migration Script v3.0
-- Run this BEFORE applying the new schema.prisma via prisma migrate dev
-- SQLite compatible. Run in this exact order.
-- =============================================================================

PRAGMA foreign_keys = OFF;

-- =============================================================================
-- PHASE 1: DROP REPLACED TABLES (leaf → root order)
-- =============================================================================

-- 1. Drop tables that reference others first
DROP TABLE IF EXISTS "BudgetUtilisation";
DROP TABLE IF EXISTS "BudgetSubCategory";
DROP TABLE IF EXISTS "LedgerEntry";
DROP TABLE IF EXISTS "AccountTransaction";

-- 2. Drop old billing tables
DROP TABLE IF EXISTS "EnrollmentPackageItem";
DROP TABLE IF EXISTS "StudentInvoice";
DROP TABLE IF EXISTS "StudentMonthlyEnrollment";
DROP TABLE IF EXISTS "StudentRateOverride";
DROP TABLE IF EXISTS "BatchRateCard";
DROP TABLE IF EXISTS "ResourceInvoice";
DROP TABLE IF EXISTS "CounsellingInvoice";

-- 3. Drop old account tables
DROP TABLE IF EXISTS "Account";
DROP TABLE IF EXISTS "DCBankAccount";

-- 4. Drop cached summary tables (replaced by calculated views)
DROP TABLE IF EXISTS "MonthlyBillingSummary";
DROP TABLE IF EXISTS "MonthlyPayrollSummary";

-- 5. Drop renamed table (MessageTemplate → TextFormat)
DROP TABLE IF EXISTS "MessageTemplate";

-- =============================================================================
-- PHASE 2: ALTER KEPT TABLES — DROP OBSOLETE COLUMNS
-- SQLite does not support DROP COLUMN on some older versions.
-- Strategy: recreate the table with only the columns we want.
-- =============================================================================

-- -----------------------------------------------------------------------
-- User: drop subject, grade, board, targetUni, hourlyRate, specialization
-- Keep parentId for the self-join (parent–student relation)
-- -----------------------------------------------------------------------
CREATE TABLE "_User_new" (
    "id"                  TEXT NOT NULL PRIMARY KEY,
    "email"               TEXT NOT NULL,
    "name"                TEXT NOT NULL,
    "role"                TEXT NOT NULL,
    "dept"                TEXT,
    "supervisor"          BOOLEAN NOT NULL DEFAULT false,
    "financeApprovedFlag" BOOLEAN NOT NULL DEFAULT false,
    "isActive"            BOOLEAN NOT NULL DEFAULT true,
    "passwordHash"        TEXT,
    "referralCode"        TEXT,
    "detectedCountry"     TEXT,
    "billingAddress"      TEXT,
    "parentId"            TEXT,
    "createdAt"           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "_User_new"
    ("id","email","name","role","dept","supervisor","isActive",
     "passwordHash","referralCode","parentId","createdAt")
SELECT
    "id","email","name","role","dept","supervisor",
    COALESCE("active", true),
    "passwordHash","referralCode","parentId","createdAt"
FROM "User";
DROP TABLE "User";
ALTER TABLE "_User_new" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");

-- -----------------------------------------------------------------------
-- Group: drop subject, teacherId, courseLevel
-- -----------------------------------------------------------------------
CREATE TABLE "_Group_new" (
    "id"            TEXT NOT NULL PRIMARY KEY,
    "code"          TEXT NOT NULL,
    "groupCategory" TEXT NOT NULL DEFAULT 'batch',
    "status"        TEXT NOT NULL DEFAULT 'active',
    "isActive"      BOOLEAN NOT NULL DEFAULT true,
    "createdAt"     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "_Group_new" ("id","code","status","createdAt")
SELECT "id","code",LOWER("status"),"createdAt" FROM "Group";
DROP TABLE "Group";
ALTER TABLE "_Group_new" RENAME TO "Group";
CREATE UNIQUE INDEX "Group_code_key" ON "Group"("code");

-- -----------------------------------------------------------------------
-- AcademicSession: drop subject, studentId; add serviceId (nullable for now)
-- -----------------------------------------------------------------------
CREATE TABLE "_AcademicSession_new" (
    "id"                        TEXT NOT NULL PRIMARY KEY,
    "groupId"                   TEXT NOT NULL,
    "teacherId"                 TEXT NOT NULL,
    "serviceId"                 TEXT,            -- nullable until Service rows are created
    "topic"                     TEXT,
    "startTime"                 DATETIME NOT NULL,
    "endTime"                   DATETIME NOT NULL,
    "durationMinutes"           INTEGER,
    "zoomLink"                  TEXT,
    "wbLink"                    TEXT,
    "wbName"                    TEXT,
    "recordingLink"             TEXT,
    "status"                    TEXT NOT NULL DEFAULT 'scheduled',
    "timesheetSubmissionStatus" TEXT NOT NULL DEFAULT 'pending',
    "timesheetSubmittedAt"      DATETIME,
    "isActive"                  BOOLEAN NOT NULL DEFAULT true,
    "createdAt"                 DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "_AcademicSession_new"
    ("id","groupId","teacherId","topic","startTime","endTime",
     "zoomLink","status","createdAt")
SELECT
    "id",
    COALESCE("groupId", ''),
    "teacherId",
    "topic","startTime","endTime","zoomLink",
    LOWER("status"),
    CURRENT_TIMESTAMP
FROM "AcademicSession"
WHERE "groupId" IS NOT NULL;
DROP TABLE "AcademicSession";
ALTER TABLE "_AcademicSession_new" RENAME TO "AcademicSession";

-- -----------------------------------------------------------------------
-- Assignment: drop subject; add serviceId (nullable for now)
-- -----------------------------------------------------------------------
CREATE TABLE "_Assignment_new" (
    "id"             TEXT NOT NULL PRIMARY KEY,
    "studentId"      TEXT NOT NULL,
    "serviceId"      TEXT,            -- nullable until Service rows are created
    "title"          TEXT NOT NULL,
    "description"    TEXT,
    "dueDate"        DATETIME NOT NULL,
    "status"         TEXT NOT NULL DEFAULT 'pending',
    "grade"          TEXT,
    "submissionLink" TEXT,
    "isActive"       BOOLEAN NOT NULL DEFAULT true,
    "createdAt"      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "_Assignment_new"
    ("id","studentId","title","description","dueDate","status","grade",
     "submissionLink","createdAt")
SELECT
    "id","studentId","title","description","dueDate",
    LOWER("status"),"grade","submission",CURRENT_TIMESTAMP
FROM "Assignment";
DROP TABLE "Assignment";
ALTER TABLE "_Assignment_new" RENAME TO "Assignment";

-- -----------------------------------------------------------------------
-- SyllabusItem: drop subject; add serviceId (nullable for now)
-- -----------------------------------------------------------------------
CREATE TABLE "_SyllabusItem_new" (
    "id"         TEXT NOT NULL PRIMARY KEY,
    "serviceId"  TEXT,            -- nullable until Service rows are created
    "chapterNum" TEXT,
    "title"      TEXT NOT NULL,
    "milestone"  TEXT NOT NULL DEFAULT 'core',
    "order"      INTEGER NOT NULL,
    "isActive"   BOOLEAN NOT NULL DEFAULT true
);
INSERT INTO "_SyllabusItem_new"
    ("id","chapterNum","title","milestone","order")
SELECT "id","chapterNum","title","milestone","order"
FROM "SyllabusItem";
DROP TABLE "SyllabusItem";
ALTER TABLE "_SyllabusItem_new" RENAME TO "SyllabusItem";

-- -----------------------------------------------------------------------
-- MockResult: drop subject, level, diff, grade, timeTaken
--             score Int → keep as-is (SQLite stores as numeric anyway)
--             add serviceId (nullable), maxScore, topic, takenAt
-- -----------------------------------------------------------------------
CREATE TABLE "_MockResult_new" (
    "id"        TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "serviceId" TEXT,
    "score"     REAL NOT NULL DEFAULT 0,
    "maxScore"  REAL NOT NULL DEFAULT 100,
    "topic"     TEXT,
    "takenAt"   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "_MockResult_new"
    ("id","studentId","score","createdAt")
SELECT "id","studentId",CAST("score" AS REAL),CURRENT_TIMESTAMP
FROM "MockResult";
DROP TABLE "MockResult";
ALTER TABLE "_MockResult_new" RENAME TO "MockResult";

-- -----------------------------------------------------------------------
-- StaffProfile: drop bankAccountInfo
-- -----------------------------------------------------------------------
CREATE TABLE "_StaffProfile_new" (
    "id"                  TEXT NOT NULL PRIMARY KEY,
    "userId"              TEXT NOT NULL UNIQUE,
    "firstName"           TEXT NOT NULL,
    "lastName"            TEXT NOT NULL,
    "dob"                 DATETIME,
    "roleTitle"           TEXT,
    "salaryType"          TEXT,
    "salaryRate"          REAL,
    "latestQualification" TEXT,
    "createdAt"           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "_StaffProfile_new"
    ("id","userId","firstName","lastName","dob","roleTitle",
     "salaryType","salaryRate","latestQualification")
SELECT "id","userId","firstName","lastName","dob","roleTitle",
       "salaryType","salaryRate","latestQualification"
FROM "StaffProfile";
DROP TABLE "StaffProfile";
ALTER TABLE "_StaffProfile_new" RENAME TO "StaffProfile";

-- -----------------------------------------------------------------------
-- TeacherProfile: drop bankAccountInfo, hourlyRate
-- -----------------------------------------------------------------------
CREATE TABLE "_TeacherProfile_new" (
    "id"                  TEXT NOT NULL PRIMARY KEY,
    "userId"              TEXT NOT NULL UNIQUE,
    "firstName"           TEXT NOT NULL,
    "lastName"            TEXT NOT NULL,
    "dob"                 DATETIME,
    "latestQualification" TEXT,
    "teachingProfileUrl"  TEXT,
    "createdAt"           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "_TeacherProfile_new"
    ("id","userId","firstName","lastName","dob",
     "latestQualification","teachingProfileUrl")
SELECT "id","userId","firstName","lastName","dob",
       "latestQualification","teachingProfileUrl"
FROM "TeacherProfile";
DROP TABLE "TeacherProfile";
ALTER TABLE "_TeacherProfile_new" RENAME TO "TeacherProfile";

-- -----------------------------------------------------------------------
-- AmbassadorProfile: drop bankAccountInfo; add cohort, referralLink, referralCode
-- -----------------------------------------------------------------------
CREATE TABLE "_AmbassadorProfile_new" (
    "id"           TEXT NOT NULL PRIMARY KEY,
    "userId"       TEXT NOT NULL UNIQUE,
    "firstName"    TEXT NOT NULL,
    "lastName"     TEXT NOT NULL,
    "dob"          DATETIME,
    "cohort"       TEXT,
    "referralLink" TEXT,
    "referralCode" TEXT UNIQUE,
    "createdAt"    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "_AmbassadorProfile_new"
    ("id","userId","firstName","lastName","dob")
SELECT "id","userId","firstName","lastName","dob"
FROM "AmbassadorProfile";
DROP TABLE "AmbassadorProfile";
ALTER TABLE "_AmbassadorProfile_new" RENAME TO "AmbassadorProfile";

-- -----------------------------------------------------------------------
-- StudentProfile: add location, referredBy
-- -----------------------------------------------------------------------
ALTER TABLE "StudentProfile" ADD COLUMN "location"   TEXT;
ALTER TABLE "StudentProfile" ADD COLUMN "referredBy" TEXT;

-- -----------------------------------------------------------------------
-- Ticket: add ticketType, isConfidential, isActive
-- -----------------------------------------------------------------------
ALTER TABLE "Ticket" ADD COLUMN "ticketType"     TEXT;
ALTER TABLE "Ticket" ADD COLUMN "isConfidential" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Ticket" ADD COLUMN "isActive"       BOOLEAN NOT NULL DEFAULT true;

-- -----------------------------------------------------------------------
-- Meeting: add meetingType, isActive
-- -----------------------------------------------------------------------
ALTER TABLE "Meeting" ADD COLUMN "meetingType" TEXT;
ALTER TABLE "Meeting" ADD COLUMN "isActive"    BOOLEAN NOT NULL DEFAULT true;

-- -----------------------------------------------------------------------
-- MeetingParticipant: add rsvp
-- -----------------------------------------------------------------------
ALTER TABLE "MeetingParticipant" ADD COLUMN "rsvp" TEXT NOT NULL DEFAULT 'pending';

-- -----------------------------------------------------------------------
-- Referral: drop @unique on studentId (student can only have one referral
-- but the unique constraint causes issues when studentId is null)
-- Add referredStudentId (replaces studentId naming), isActive
-- -----------------------------------------------------------------------
CREATE TABLE "_Referral_new" (
    "id"                TEXT NOT NULL PRIMARY KEY,
    "referrerId"        TEXT NOT NULL,
    "referredStudentId" TEXT,
    "code"              TEXT NOT NULL,
    "status"            TEXT NOT NULL DEFAULT 'pending',
    "isActive"          BOOLEAN NOT NULL DEFAULT true,
    "createdAt"         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "_Referral_new"
    ("id","referrerId","referredStudentId","code","status","createdAt")
SELECT "id","referrerId","studentId","code","status","createdAt"
FROM "Referral";
DROP TABLE "Referral";
ALTER TABLE "_Referral_new" RENAME TO "Referral";

-- -----------------------------------------------------------------------
-- CurrencyRate: rename columns
-- (SQLite: recreate)
-- -----------------------------------------------------------------------
CREATE TABLE "_CurrencyRate_new" (
    "id"           TEXT NOT NULL PRIMARY KEY,
    "fromCurrency" TEXT NOT NULL UNIQUE,
    "rate"         REAL NOT NULL,
    "reverseRate"  REAL NOT NULL,
    "updatedAt"    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "_CurrencyRate_new"
    ("id","fromCurrency","rate","reverseRate","updatedAt")
SELECT "id","currency","toINR","fromINR","updatedAt"
FROM "CurrencyRate";
DROP TABLE "CurrencyRate";
ALTER TABLE "_CurrencyRate_new" RENAME TO "CurrencyRate";

-- -----------------------------------------------------------------------
-- Candidate: add isActive (already has most fields)
-- -----------------------------------------------------------------------
ALTER TABLE "Candidate" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- -----------------------------------------------------------------------
-- Lead: add passedAt, prTicketId, isActive (existing Lead table is stripped)
-- -----------------------------------------------------------------------
ALTER TABLE "Lead" ADD COLUMN "passedAt"   DATETIME;
ALTER TABLE "Lead" ADD COLUMN "prTicketId" TEXT;
ALTER TABLE "Lead" ADD COLUMN "isActive"   BOOLEAN NOT NULL DEFAULT true;

-- =============================================================================
-- PHASE 3: CREATE NEW TABLES
-- (Prisma migrate dev will handle this from schema.prisma — but listed here
--  for manual run safety if needed)
-- =============================================================================

-- New tables to be created by prisma migrate dev:
--   BankAccount
--   Service
--   Enrollment
--   Discount
--   InvoiceLineItem  (new StudentInvoice + InvoiceLineItem replaces old)
--   StudentInvoice   (rebuilt)
--   Claim            (rebuilt with dept + currency + isActive)
--   AccountTransaction (rebuilt against BankAccount)
--   LedgerEntry      (rebuilt)
--   DeptBudget
--   BudgetSubCategory
--   BudgetUtilisation
--   AmbassadorDeliverable
--   AmbassadorEarning
--   ContentBankItem
--   TextFormat       (renamed from MessageTemplate)

-- =============================================================================
-- PHASE 4: RE-ENABLE FOREIGN KEYS
-- =============================================================================

PRAGMA foreign_keys = ON;

-- =============================================================================
-- PHASE 5: VERIFY
-- =============================================================================

SELECT name FROM sqlite_master
WHERE type='table'
ORDER BY name;
