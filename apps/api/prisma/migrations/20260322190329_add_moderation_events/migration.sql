-- CreateTable
CREATE TABLE "ModerationEvent" (
    "id" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "pluginId" TEXT NOT NULL,
    "action" "ModerationStatus" NOT NULL,
    "actorId" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModerationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ModerationEvent_pluginId_idx" ON "ModerationEvent"("pluginId");

-- CreateIndex
CREATE INDEX "ModerationEvent_targetId_idx" ON "ModerationEvent"("targetId");

-- CreateIndex
CREATE INDEX "ModerationEvent_actorId_idx" ON "ModerationEvent"("actorId");
