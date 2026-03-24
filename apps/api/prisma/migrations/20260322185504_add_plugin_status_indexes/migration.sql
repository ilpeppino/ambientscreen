-- CreateIndex
CREATE INDEX "Plugin_status_idx" ON "Plugin"("status");

-- CreateIndex
CREATE INDEX "Plugin_isApproved_idx" ON "Plugin"("isApproved");

-- CreateIndex
CREATE INDEX "PluginVersion_isActive_idx" ON "PluginVersion"("isActive");
