#!/bin/bash
# redo_db.sh

LOG_FILE="redo_db.log"
exec > >(tee -a "$LOG_FILE") 2>&1

echo "[STAGE 1] ENV CHECK"
if [ -f .env ]; then
    echo "  .env exists"
    cat .env
else
    echo "  ERR: .env missing"
    exit 1
fi

echo "[STAGE 2] SCHEMA VALIDATE"
npx prisma validate
if [ $? -eq 0 ]; then
    echo "  Schema valid"
else
    echo "  ERR: Schema invalid"
    exit 1
fi

echo "[STAGE 3] DELETE DB + CLIENT"
rm -f dev.db
rm -rf src/generated/prisma
echo "  Deleted dev.db and src/generated/prisma"

echo "[STAGE 4] GENERATE"
npx prisma generate
if [ $? -eq 0 ]; then
    echo "  Generate success"
else
    echo "  ERR: Generate failed"
    exit 1
fi

echo "[STAGE 5] MIGRATE"
npx prisma migrate dev --name redo_final
if [ $? -eq 0 ]; then
    echo "  Migrate success"
else
    echo "  ERR: Migrate failed"
    exit 1
fi

echo "[STAGE 6] SEED USERS"
npx tsx prisma/seed.ts
if [ $? -eq 0 ]; then
    echo "  Seed users success"
else
    echo "  ERR: Seed users failed"
    exit 1
fi

echo "[STAGE 7] SEED CATEGORIES"
npx tsx prisma/seed-categories.ts
if [ $? -eq 0 ]; then
    echo "  Seed categories success"
else
    echo "  ERR: Seed categories failed"
    exit 1
fi

echo "[STAGE 8] FINAL VERIFY"
npx tsx --eval "
import 'dotenv/config';
import { PrismaClient } from './src/generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
const p = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! }) });
(async () => {
    const users = await p.user.count();
    const cats = await p.ticketCategory.count();
    const pc = await p.user.count({ where: { preChecked: true } });
    console.log('--- FINAL STATS ---');
    console.log('Users:      ', users);
    console.log('Categories: ', cats);
    console.log('preChecked: ', pc);
    await p.\$disconnect();
})()
"

echo "=== REDO COMPLETE ==="
