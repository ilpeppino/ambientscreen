-- CreateTable
CREATE TABLE "SharedScreenSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "activeProfileId" TEXT,
    "slideshowEnabled" BOOLEAN NOT NULL DEFAULT false,
    "slideshowIntervalSec" INTEGER NOT NULL DEFAULT 60,
    "rotationProfileIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "currentIndex" INTEGER NOT NULL DEFAULT 0,
    "lastAdvancedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SharedScreenSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SharedScreenParticipant" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "displayName" TEXT,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SharedScreenParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SharedScreenSession_userId_idx" ON "SharedScreenSession"("userId");

-- CreateIndex
CREATE INDEX "SharedScreenSession_userId_isActive_idx" ON "SharedScreenSession"("userId", "isActive");

-- CreateIndex
CREATE INDEX "SharedScreenParticipant_sessionId_idx" ON "SharedScreenParticipant"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "SharedScreenParticipant_sessionId_deviceId_key" ON "SharedScreenParticipant"("sessionId", "deviceId");

-- AddForeignKey
ALTER TABLE "SharedScreenSession" ADD CONSTRAINT "SharedScreenSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedScreenParticipant" ADD CONSTRAINT "SharedScreenParticipant_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SharedScreenSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
