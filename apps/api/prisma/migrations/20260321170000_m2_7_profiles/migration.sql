-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Profile_userId_idx" ON "Profile"("userId");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill one default profile for each existing user
INSERT INTO "Profile" ("id", "userId", "name", "isDefault", "createdAt")
SELECT
  "id" AS "id",
  "id" AS "userId",
  'Default' AS "name",
  true AS "isDefault",
  CURRENT_TIMESTAMP AS "createdAt"
FROM "User";

-- Add profile relation to WidgetInstance and migrate data
ALTER TABLE "WidgetInstance" ADD COLUMN "profileId" TEXT;

UPDATE "WidgetInstance" wi
SET "profileId" = p."id"
FROM "Profile" p
WHERE p."userId" = wi."userId";

ALTER TABLE "WidgetInstance" ALTER COLUMN "profileId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "WidgetInstance_profileId_idx" ON "WidgetInstance"("profileId");

-- AddForeignKey
ALTER TABLE "WidgetInstance" ADD CONSTRAINT "WidgetInstance_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Remove old user relation from widgets
ALTER TABLE "WidgetInstance" DROP CONSTRAINT "WidgetInstance_userId_fkey";
ALTER TABLE "WidgetInstance" DROP COLUMN "userId";
