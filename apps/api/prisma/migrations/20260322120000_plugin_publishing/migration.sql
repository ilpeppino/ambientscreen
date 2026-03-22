-- AlterTable: Add authorId to Plugin
ALTER TABLE "Plugin" ADD COLUMN "authorId" TEXT;

-- AlterTable: Add entryPoint to PluginVersion
ALTER TABLE "PluginVersion" ADD COLUMN "entryPoint" TEXT;

-- CreateIndex: unique constraint on Plugin.name
CREATE UNIQUE INDEX "Plugin_name_key" ON "Plugin"("name");

-- CreateIndex: index on Plugin.authorId
CREATE INDEX "Plugin_authorId_idx" ON "Plugin"("authorId");

-- AddForeignKey: Plugin.authorId -> User.id
ALTER TABLE "Plugin" ADD CONSTRAINT "Plugin_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
