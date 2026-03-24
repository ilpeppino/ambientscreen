-- CreateTable
CREATE TABLE "TokenBlocklist" (
    "jti" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenBlocklist_pkey" PRIMARY KEY ("jti")
);

-- CreateIndex
CREATE INDEX "TokenBlocklist_expiresAt_idx" ON "TokenBlocklist"("expiresAt");
