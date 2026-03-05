/*
  Warnings:

  - Made the column `filePath` on table `Resume` required. This step will fail if there are existing NULL values in that column.
  - Made the column `originalName` on table `Resume` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Resume" ALTER COLUMN "filePath" SET NOT NULL,
ALTER COLUMN "originalName" SET NOT NULL;
