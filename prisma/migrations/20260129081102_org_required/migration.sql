/*
  Warnings:

  - Made the column `orgId` on table `Candidate` required. This step will fail if there are existing NULL values in that column.
  - Made the column `orgId` on table `Job` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Candidate" DROP CONSTRAINT "Candidate_orgId_fkey";

-- DropForeignKey
ALTER TABLE "Job" DROP CONSTRAINT "Job_orgId_fkey";

-- AlterTable
ALTER TABLE "Candidate" ALTER COLUMN "orgId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Job" ALTER COLUMN "orgId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
