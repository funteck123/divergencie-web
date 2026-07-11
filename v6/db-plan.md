CRITICAL ARCHITECTURAL PIVOT: STOP ALL INCREMENTAL LOOPS AND TIMERS.
The project is suffering from configuration drift. We are moving to a Pure TypeScript (ESM) architecture and batching all remaining audit fixes to stop the regeneration cycles. Execute these steps in a single sequence:
1. Eliminate Hybrid Configuration Conflict
DELETE all legacy .cjs and .js configuration files that have .ts equivalents (e.g., tailwind.config.js, postcss.config.js, or any prisma.config.cjs).
UNIFY package.json: Ensure "type": "module" is present.
FIX tsconfig.json: Set "moduleResolution": "Bundler" and "module": "ESNext" to ensure compatibility with Prisma 7 and Next.js.
2. Batch Schema Modernization
STOP doing one-by-one schema updates.
UPDATE prisma/schema.prisma in one single write operation to resolve ALL pending issues from ISSUE-055 to ISSUE-081 (Ambassadors, Claims, Paychecks, and BOLA security relations).
PRISMA 7 CONFIG: Create a single prisma.config.ts using the defineConfig pattern. REMOVE the url and directUrl strings from the datasource block in schema.prisma to comply with Prisma 7’s strict environment variable rules.
3. Final Data Layer Rebuild
Run npx prisma generate ONCE after the batch update is complete.
Run npx prisma migrate dev --name audit_final_alignment to sync the database state.
4. Logic Execution
Once the data layer is clean and the 'Hybrid Conflict' is deleted, move directly to the Code Fix Phase in implementation_plan.md.
Priority: Fix the BOLA (Broken Object Level Authorization) security defects in the API routes using the newly generated, type-safe Prisma client.
DO NOT start a new timer loop until the hybrid config files are deleted and the schema is batched. Report 'System Unified' when complete.