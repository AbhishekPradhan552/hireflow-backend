-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "requiredSkills" TEXT[];

-- AlterTable
ALTER TABLE "Resume" ADD COLUMN     "matchScore" INTEGER,
ADD COLUMN     "matchedSkills" TEXT[],
ADD COLUMN     "missingSkills" TEXT[];
