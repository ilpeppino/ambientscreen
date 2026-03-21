ALTER TABLE "User" ADD COLUMN "activeProfileId" TEXT;

UPDATE "User" u
SET "activeProfileId" = selected."id"
FROM (
  SELECT DISTINCT ON ("userId") "userId", "id"
  FROM "Profile"
  ORDER BY "userId", "isDefault" DESC, "createdAt" ASC
) selected
WHERE selected."userId" = u."id"
  AND u."activeProfileId" IS NULL;

CREATE INDEX "User_activeProfileId_idx" ON "User"("activeProfileId");

ALTER TABLE "User"
ADD CONSTRAINT "User_activeProfileId_fkey"
FOREIGN KEY ("activeProfileId") REFERENCES "Profile"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
