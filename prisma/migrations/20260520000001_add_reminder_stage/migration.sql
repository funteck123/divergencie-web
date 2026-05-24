-- Add reminderStage to Invoice
ALTER TABLE "Invoice" ADD COLUMN "reminderStage" INTEGER NOT NULL DEFAULT 0;
