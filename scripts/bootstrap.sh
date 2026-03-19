#!/bin/bash

set -e

ROOT="/Volumes/DevSSD/projects/ambientscreen"

echo "🚀 Creating Ambient Screen project..."

# ---------------------------------------
# 1. Root structure
# ---------------------------------------
mkdir -p "$ROOT"
cd "$ROOT"

mkdir -p apps/client apps/api packages/shared-contracts packages/shared-ui infra docs

# ---------------------------------------
# 2. Root config
# ---------------------------------------
cat > package.json <<EOF
{
  "name": "ambient-display-monorepo",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ]
}
EOF

cat > tsconfig.base.json <<EOF
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "jsx": "react-jsx",
    "baseUrl": "."
  }
}
EOF

# ---------------------------------------
# 3. API setup
# ---------------------------------------
mkdir -p apps/api/src
mkdir -p apps/api/prisma

cat > apps/api/package.json <<EOF
{
  "name": "@ambient/api",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "node src/main.js",
    "build": "tsc",
    "prisma:generate": "prisma generate"
  },
  "dependencies": {
    "@prisma/client": "^5.0.0"
  },
  "devDependencies": {
    "prisma": "^5.0.0",
    "typescript": "^5.0.0"
  }
}
EOF

cat > apps/api/src/main.ts <<EOF
console.log("🚀 API started");
EOF

# ---------------------------------------
# 4. Prisma schema
# ---------------------------------------
cat > apps/api/prisma/schema.prisma <<EOF
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(uuid())
  email     String?  @unique
  createdAt DateTime @default(now())
}
EOF

# ---------------------------------------
# 5. Client (Expo placeholder)
# ---------------------------------------
mkdir -p apps/client

cat > apps/client/package.json <<EOF
{
  "name": "@ambient/client",
  "private": true,
  "scripts": {
    "start": "expo start"
  }
}
EOF

# ---------------------------------------
# 6. Shared contracts
# ---------------------------------------
mkdir -p packages/shared-contracts/src

cat > packages/shared-contracts/package.json <<EOF
{
  "name": "@ambient/shared-contracts",
  "private": true
}
EOF

cat > packages/shared-contracts/src/index.ts <<EOF
export type WidgetKey = "clockDate" | "weather";
EOF

# ---------------------------------------
# 7. Widget structure
# ---------------------------------------
mkdir -p apps/client/src/widgets/clockDate

cat > apps/client/src/widgets/clockDate/index.ts <<EOF
export const clockDateWidget = {
  key: "clockDate",
  name: "Clock & Date"
};
EOF

# ---------------------------------------
# DONE
# ---------------------------------------
echo "✅ Project scaffold created!"
echo ""
echo "Next steps:"
echo "cd $ROOT"
echo "npm install"
echo ""
echo "Then:"
echo "cd apps/api && npx prisma generate"
