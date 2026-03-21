-- CreateTable
CREATE TABLE "OrchestrationRule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "intervalSec" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrchestrationRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrchestrationRule_userId_idx" ON "OrchestrationRule"("userId");

-- AddForeignKey
ALTER TABLE "OrchestrationRule" ADD CONSTRAINT "OrchestrationRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
