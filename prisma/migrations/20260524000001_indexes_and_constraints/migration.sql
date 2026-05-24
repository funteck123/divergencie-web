-- Add missing FK indexes for query performance
CREATE INDEX IF NOT EXISTS "Ticket_creatorId_idx" ON "Ticket"("creatorId");
CREATE INDEX IF NOT EXISTS "Ticket_assigneeId_idx" ON "Ticket"("assigneeId");
CREATE INDEX IF NOT EXISTS "Ticket_department_status_idx" ON "Ticket"("department", "status");
CREATE INDEX IF NOT EXISTS "Ticket_status_updatedAt_idx" ON "Ticket"("status", "updatedAt");

CREATE INDEX IF NOT EXISTS "TicketMessage_ticketId_idx" ON "TicketMessage"("ticketId");
CREATE INDEX IF NOT EXISTS "TicketMessage_senderId_idx" ON "TicketMessage"("senderId");

CREATE INDEX IF NOT EXISTS "TicketHistory_ticketId_idx" ON "TicketHistory"("ticketId");
CREATE INDEX IF NOT EXISTS "TicketHistory_actorId_idx" ON "TicketHistory"("actorId");

CREATE INDEX IF NOT EXISTS "Attendance_studentId_idx" ON "Attendance"("studentId");
CREATE INDEX IF NOT EXISTS "Attendance_sessionId_idx" ON "Attendance"("sessionId");

CREATE INDEX IF NOT EXISTS "AcademicSession_teacherId_idx" ON "AcademicSession"("teacherId");
CREATE INDEX IF NOT EXISTS "AcademicSession_studentId_idx" ON "AcademicSession"("studentId");
CREATE INDEX IF NOT EXISTS "AcademicSession_startTime_idx" ON "AcademicSession"("startTime");

CREATE INDEX IF NOT EXISTS "Claim_userId_idx" ON "Claim"("userId");
CREATE INDEX IF NOT EXISTS "Claim_status_idx" ON "Claim"("status");

CREATE INDEX IF NOT EXISTS "Invoice_studentId_idx" ON "Invoice"("studentId");
CREATE INDEX IF NOT EXISTS "Invoice_status_idx" ON "Invoice"("status");

CREATE INDEX IF NOT EXISTS "Doubt_studentId_idx" ON "Doubt"("studentId");
CREATE INDEX IF NOT EXISTS "Doubt_syllabusItemId_idx" ON "Doubt"("syllabusItemId");

CREATE INDEX IF NOT EXISTS "StudentProgress_studentId_idx" ON "StudentProgress"("studentId");
CREATE INDEX IF NOT EXISTS "StudentProgress_syllabusItemId_idx" ON "StudentProgress"("syllabusItemId");

CREATE INDEX IF NOT EXISTS "MockResult_studentId_idx" ON "MockResult"("studentId");

CREATE INDEX IF NOT EXISTS "MeetingParticipant_userId_idx" ON "MeetingParticipant"("userId");
CREATE INDEX IF NOT EXISTS "MeetingParticipant_meetingId_idx" ON "MeetingParticipant"("meetingId");

CREATE INDEX IF NOT EXISTS "Group_teacherId_idx" ON "Group"("teacherId");

CREATE INDEX IF NOT EXISTS "Assignment_studentId_idx" ON "Assignment"("studentId");

CREATE INDEX IF NOT EXISTS "Referral_referrerId_idx" ON "Referral"("referrerId");

-- Add unique constraint on Ticket.displayId (deduplicates concurrent creation)
-- Note: existing "PENDING" default values must be updated before applying in prod
CREATE UNIQUE INDEX IF NOT EXISTS "Ticket_displayId_key" ON "Ticket"("displayId");

-- Add unique constraint on StudentProgress to prevent duplicate rows
CREATE UNIQUE INDEX IF NOT EXISTS "StudentProgress_studentId_syllabusItemId_key" 
  ON "StudentProgress"("studentId", "syllabusItemId");

-- Add FK on Assignment.studentId (was undeclared in original schema)
-- SQLite does not enforce FK constraints without PRAGMA foreign_keys = ON
-- This is a schema-level annotation change only; no DDL needed in SQLite

-- Add FK on Invoice.studentId (was undeclared in original schema)
-- Same as above — Prisma will enforce at query level
