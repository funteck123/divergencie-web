#!/usr/bin/env bash
# DivergenCIE — First-time setup script
# Run once: bash setup.sh
# Then: npm run build && npm start

set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✅ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
fail() { echo -e "${RED}❌ $1${NC}"; exit 1; }

echo ""
echo "═══════════════════════════════════════"
echo "  DivergenCIE — Setup Check"
echo "═══════════════════════════════════════"
echo ""

# ─── 1. Check Node ───────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  fail "Node.js not found. Install from https://nodejs.org"
fi
NODE_VER=$(node -e "process.stdout.write(process.versions.node)")
NODE_MAJOR=$(echo $NODE_VER | cut -d. -f1)
if [ "$NODE_MAJOR" -lt 22 ]; then
  fail "Node.js v$NODE_VER found — v22+ required. Upgrade using: nvm install 22 && nvm use 22"
fi
ok "Node.js v$NODE_VER"

# ─── 2. Check npm ────────────────────────────────────────────────
if ! command -v npm &>/dev/null; then
  fail "npm not found"
fi
ok "npm $(npm --version)"

# ─── 3. Check build tools for better-sqlite3 ────────────────────
if ! command -v gcc &>/dev/null; then
  warn "gcc not found — needed to compile better-sqlite3"
  echo "     Run: sudo apt-get install -y build-essential"
  echo "     Then re-run this script."
  exit 1
fi
ok "gcc $(gcc --version | head -1 | grep -oP '\d+\.\d+\.\d+' | head -1)"

if ! command -v python3 &>/dev/null && ! command -v python &>/dev/null; then
  warn "python3 not found — needed for node-gyp"
  echo "     Run: sudo apt-get install -y python3"
  exit 1
fi
ok "python3 $(python3 --version 2>&1 | grep -oP '\d+\.\d+\.\d+')"

echo ""
echo "─── Installing Missing Prisma 7 Dependencies ───────────────"
npm install dotenv @prisma/config
npm install -D @types/better-sqlite3 @types/node@22

echo ""
echo "─── Installing npm dependencies ────────────────────────────"
npm install

echo ""
echo "─── Rebuilding better-sqlite3 (native compile) ─────────────"
npm rebuild better-sqlite3

echo ""
echo "─── Setting up prisma.config.ts ─────────────────────────────"
cat << 'EOF' > prisma.config.ts
import 'dotenv/config';
import { defineConfig, env } from '@prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL')
  }
});
EOF
ok "Created prisma.config.ts"

echo ""
echo "─── Generating Prisma client ────────────────────────────────"
npx prisma generate

echo ""
echo "─── Creating SQLite database, running migrations, and seeding"
# Wipes the old local DB to ensure a clean slate for the new zip
rm -rf prisma/dev.db prisma/dev.db-journal

# In Prisma 7, this handles migration AND automatically runs the seed.ts script
npx prisma migrate dev --name init

echo ""
echo "═══════════════════════════════════════"
ok "Setup complete!"
echo ""
echo "  Build + start:"
echo "  npm run build && npm start"
echo ""
echo "  Then open: http://localhost:3000"
echo ""
echo "  Test login accounts:"
echo "    admin@divergencie.co.uk     → Management"
echo "    alex.chen@student.dc        → Student"
echo "    riya.sharma@teacher.dc      → Teacher"
echo "    pr1@staff.dc                → Staff (PR)"
echo "    ambassador1@dc.co.uk        → Ambassador"
echo "  (any password works in prototype)"
echo "═══════════════════════════════════════"