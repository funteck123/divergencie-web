# DivergenCIE Sandbox — Migration Guide v3.0

## What this does
Drops all replaced tables, strips obsolete columns from kept tables,
renames/restructures columns for XLSX parity, then lets Prisma create
the new tables from schema.prisma.

## Prerequisites
- You are on the `divergencie` project root
- SQLite dev.db is at `prisma/dev.db`
- New `schema.prisma` is in place at `prisma/schema.prisma`

## Step-by-step

### Step 1 — Backup first
```bash
cp prisma/dev.db prisma/dev.db.bak
```

### Step 2 — Run the migration SQL
```bash
sqlite3 prisma/dev.db < migrate_sandbox.sql
```

### Step 3 — Verify no errors
The script prints all remaining table names at the end.
You should NOT see any of these tables:
- BatchRateCard
- StudentRateOverride
- StudentMonthlyEnrollment
- EnrollmentPackageItem
- ResourceInvoice
- CounsellingInvoice
- Account
- DCBankAccount
- MonthlyBillingSummary
- MonthlyPayrollSummary
- MessageTemplate

### Step 4 — Replace your schema.prisma
```bash
cp schema.prisma prisma/schema.prisma
```

### Step 5 — Run Prisma migrate
```bash
cd path/to/divergencie
npx prisma migrate dev --name sandbox_v3_clean_rebuild
```

This creates all new tables (Service, Enrollment, BankAccount,
DeptBudget, BudgetSubCategory, BudgetUtilisation, InvoiceLineItem,
AmbassadorDeliverable, AmbassadorEarning, ContentBankItem, TextFormat, etc.)

### Step 6 — Regenerate client
```bash
npx prisma generate
```

### Step 7 — Seed nullable FKs
After migration, several columns are nullable pending data entry:
- `AcademicSession.serviceId` — assign once Service rows exist
- `Assignment.serviceId` — assign once Service rows exist
- `SyllabusItem.serviceId` — assign once Service rows exist
- `MockResult.serviceId` — assign once Service rows exist

Run your seed script or assign via Prisma Studio:
```bash
npx prisma studio
```

## Rollback
If anything goes wrong before Step 5:
```bash
cp prisma/dev.db.bak prisma/dev.db
```
After Step 5, rollback via:
```bash
npx prisma migrate reset
```
(Warning: resets all data)

## Post-migration checklist
- [ ] BankAccount rows created for Atiqa + Akhtar accounts (isDcAccount=true)
- [ ] Service rows created from XLSX Services sheet
- [ ] Group rows verified (codes preserved from old Group table)
- [ ] DeptBudget rows auto-created for current quarter (or seeded manually)
- [ ] TicketPermission rows seeded per dept
- [ ] StudentProfile.location + referredBy populated where known
