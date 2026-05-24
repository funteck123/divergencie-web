-- AlterTable
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;

-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Group_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TicketPermission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "department" TEXT NOT NULL,
    "canTargetStudent" BOOLEAN NOT NULL DEFAULT true,
    "canTargetParent" BOOLEAN NOT NULL DEFAULT true,
    "canTargetTeacher" BOOLEAN NOT NULL DEFAULT true,
    "canTargetAmbassador" BOOLEAN NOT NULL DEFAULT true,
    "canTargetCandidate" BOOLEAN NOT NULL DEFAULT true,
    "isInternalOnly" BOOLEAN NOT NULL DEFAULT false,
    "canTargetPR" BOOLEAN NOT NULL DEFAULT true,
    "canTargetIT" BOOLEAN NOT NULL DEFAULT true,
    "canTargetHR" BOOLEAN NOT NULL DEFAULT true,
    "canTargetFinance" BOOLEAN NOT NULL DEFAULT true,
    "canTargetMarketing" BOOLEAN NOT NULL DEFAULT true,
    "canTargetManagement" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "_StudentGroups" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_StudentGroups_A_fkey" FOREIGN KEY ("A") REFERENCES "Group" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_StudentGroups_B_fkey" FOREIGN KEY ("B") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AcademicSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subject" TEXT NOT NULL,
    "topic" TEXT,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME NOT NULL,
    "zoomLink" TEXT,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "teacherId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "groupId" TEXT,
    CONSTRAINT "AcademicSession_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AcademicSession_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AcademicSession_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_AcademicSession" ("endTime", "id", "startTime", "status", "studentId", "subject", "teacherId", "topic", "zoomLink") SELECT "endTime", "id", "startTime", "status", "studentId", "subject", "teacherId", "topic", "zoomLink" FROM "AcademicSession";
DROP TABLE "AcademicSession";
ALTER TABLE "new_AcademicSession" RENAME TO "AcademicSession";
CREATE TABLE "new_Ticket" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "displayId" TEXT NOT NULL DEFAULT 'PENDING',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "creatorId" TEXT NOT NULL,
    "assigneeId" TEXT,
    "department" TEXT,
    "originalDept" TEXT,
    "attachmentLink" TEXT,
    "category" TEXT,
    "routingStack" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Ticket_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Ticket_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Ticket" ("assigneeId", "attachmentLink", "category", "createdAt", "creatorId", "department", "description", "id", "originalDept", "priority", "status", "title", "updatedAt") SELECT "assigneeId", "attachmentLink", "category", "createdAt", "creatorId", "department", "description", "id", "originalDept", "priority", "status", "title", "updatedAt" FROM "Ticket";
DROP TABLE "Ticket";
ALTER TABLE "new_Ticket" RENAME TO "Ticket";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Group_code_key" ON "Group"("code");

-- CreateIndex
CREATE UNIQUE INDEX "TicketPermission_department_key" ON "TicketPermission"("department");

-- CreateIndex
CREATE UNIQUE INDEX "_StudentGroups_AB_unique" ON "_StudentGroups"("A", "B");

-- CreateIndex
CREATE INDEX "_StudentGroups_B_index" ON "_StudentGroups"("B");
