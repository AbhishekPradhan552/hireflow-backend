-- AlterTable
ALTER TABLE "Resume" ADD COLUMN     "confidenceScore" INTEGER,
ADD COLUMN     "scoreBreakdown" JSONB;
