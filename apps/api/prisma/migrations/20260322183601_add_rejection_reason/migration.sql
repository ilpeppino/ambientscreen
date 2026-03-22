-- AlterTable
ALTER TABLE "Plugin" ADD COLUMN     "rejectionReason" TEXT;

-- AlterTable
ALTER TABLE "PluginVersion" ADD COLUMN     "rejectionReason" TEXT;
