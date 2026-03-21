UPDATE "User"
SET "email" = CONCAT('legacy-', "id", '@ambient.local')
WHERE "email" IS NULL;

ALTER TABLE "User"
ALTER COLUMN "email" SET NOT NULL;

ALTER TABLE "User"
ADD COLUMN "passwordHash" TEXT NOT NULL DEFAULT '$2b$10$7EqJtq98hPqEX7fNZaFWoO5C9jR6xS0x2drXr/7EQFA1leChX2ND6';

ALTER TABLE "User"
ALTER COLUMN "passwordHash" DROP DEFAULT;
