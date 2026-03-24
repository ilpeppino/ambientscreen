-- AlterTable
ALTER TABLE "OrchestrationRule" ADD COLUMN     "currentIndex" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "rotationProfileIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
