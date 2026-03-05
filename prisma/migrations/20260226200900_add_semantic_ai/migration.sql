-- CreateEnum
CREATE TYPE "ResumeAIStatus" AS ENUM ('PENDING', 'EMBEDDING', 'SCORING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "JobAIStatus" AS ENUM ('PENDING', 'EMBEDDING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "aiStatus" "JobAIStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "embedding" DOUBLE PRECISION[] DEFAULT ARRAY[]::DOUBLE PRECISION[],
ADD COLUMN     "embeddingModel" TEXT,
ADD COLUMN     "embeddingUpdatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Resume" ADD COLUMN     "aiProcessedAt" TIMESTAMP(3),
ADD COLUMN     "aiStatus" "ResumeAIStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "embedding" DOUBLE PRECISION[] DEFAULT ARRAY[]::DOUBLE PRECISION[],
ADD COLUMN     "embeddingCreatedAt" TIMESTAMP(3),
ADD COLUMN     "embeddingModel" TEXT,
ADD COLUMN     "hybridScore" INTEGER,
ADD COLUMN     "semanticRawScore" DOUBLE PRECISION,
ADD COLUMN     "semanticScore" INTEGER;

-- CreateIndex
CREATE INDEX "Resume_semanticScore_idx" ON "Resume"("semanticScore");

-- CreateIndex
CREATE INDEX "Resume_hybridScore_idx" ON "Resume"("hybridScore");
