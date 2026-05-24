#!/bin/bash
# verify_stages.sh

echo "=== DIVERGENCIE RE-REDO VERIFICATION ==="

# Stage 1: package.json
echo -n "[STAGE 1] package.json ESM check: "
if grep -q '"type": "module"' package.json; then
    echo "PASS"
else
    echo "FAIL (missing type: module)"
fi

# Stage 2: Prisma Config
echo -n "[STAGE 2] prisma.config.ts check: "
if [ -f "prisma.config.ts" ]; then
    echo "PASS"
else
    echo "FAIL (missing prisma.config.ts)"
fi

# Stage 3: Schema
echo -n "[STAGE 3] schema.prisma check: "
if grep -q 'provider = "prisma-client"' prisma/schema.prisma && ! sed -n '/datasource db/,/}/p' prisma/schema.prisma | grep -q 'url'; then
    echo "PASS"
else
    echo "FAIL (check provider or url presence in datasource)"
fi

# Stage 4: Client
echo -n "[STAGE 4] Generated Client check: "
if [ -d "src/generated/prisma" ]; then
    echo "PASS"
else
    echo "FAIL (missing src/generated/prisma)"
fi

# Stage 5: DB Import
echo -n "[STAGE 5] db.ts import check: "
if grep -q "@/generated/prisma/client" src/lib/db.ts; then
    echo "PASS"
else
    echo "FAIL (wrong import path)"
fi

# Stage 6: Auth Decouple
echo -n "[STAGE 6] auth.config.ts presence: "
if [ -f "src/lib/auth.config.ts" ]; then
    echo "PASS"
else
    echo "FAIL (missing auth.config.ts)"
fi

echo "=== END VERIFICATION ==="
