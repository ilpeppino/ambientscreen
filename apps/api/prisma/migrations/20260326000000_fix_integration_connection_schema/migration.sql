-- Migrate IntegrationConnection from old schema to new schema

-- Drop foreign key constraint
ALTER TABLE "IntegrationConnection" DROP CONSTRAINT "IntegrationConnection_userId_fkey";

-- Rename old columns to match new naming
ALTER TABLE "IntegrationConnection"
  RENAME COLUMN "encryptedAccessToken" TO "accessTokenEncrypted";
ALTER TABLE "IntegrationConnection"
  RENAME COLUMN "encryptedRefreshToken" TO "refreshTokenEncrypted";

-- Add new columns with defaults
ALTER TABLE "IntegrationConnection"
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'connected';
ALTER TABLE "IntegrationConnection"
  ADD COLUMN "accountLabel" TEXT;
ALTER TABLE "IntegrationConnection"
  ADD COLUMN "scopesJson" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "IntegrationConnection"
  ADD COLUMN "metadataJson" TEXT NOT NULL DEFAULT '{}';
ALTER TABLE "IntegrationConnection"
  ADD COLUMN "tokenExpiresAt" TIMESTAMP(3);
ALTER TABLE "IntegrationConnection"
  ADD COLUMN "lastSyncedAt" TIMESTAMP(3);

-- Drop obsolete columns from old schema
ALTER TABLE "IntegrationConnection" DROP COLUMN "tokenType";
ALTER TABLE "IntegrationConnection" DROP COLUMN "scopes";
ALTER TABLE "IntegrationConnection" DROP COLUMN "expiresAt";
ALTER TABLE "IntegrationConnection" DROP COLUMN "label";
ALTER TABLE "IntegrationConnection" DROP COLUMN "metadata";

-- Recreate foreign key constraint
ALTER TABLE "IntegrationConnection"
  ADD CONSTRAINT "IntegrationConnection_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
