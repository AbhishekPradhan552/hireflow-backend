-- AlterTable
ALTER TABLE "Candidate" ADD COLUMN     "bestResumeId" TEXT,
ADD COLUMN     "bestScore" INTEGER;

-- CreateIndex
CREATE INDEX "Candidate_bestResumeId_idx" ON "Candidate"("bestResumeId");
