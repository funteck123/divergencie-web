-- Remove preChecked column from User table
-- SQLite doesn't support DROP COLUMN directly before 3.35.0; recreate table
CREATE TABLE "User_new" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "dept" TEXT,
  "supervisor" BOOLEAN NOT NULL DEFAULT false,
  "subGroup" TEXT,
  "subject" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "passwordHash" TEXT,
  "referralCode" TEXT UNIQUE,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "phone" TEXT,
  "address" TEXT,
  "bio" TEXT,
  "grade" TEXT,
  "board" TEXT,
  "targetUni" TEXT,
  "hourlyRate" REAL,
  "specialization" TEXT,
  "parentId" TEXT REFERENCES "User"("id")
);
INSERT INTO "User_new" SELECT "id","email","name","role","dept","supervisor","subGroup","subject","active","passwordHash","referralCode","createdAt","phone","address","bio","grade","board","targetUni","hourlyRate","specialization","parentId" FROM "User";
DROP TABLE "User";
ALTER TABLE "User_new" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
