/*
  Warnings:

  - You are about to drop the column `fileName` on the `Resume` table. All the data in the column will be lost.
  - You are about to drop the column `fileUrl` on the `Resume` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Resume" DROP COLUMN "fileName",
DROP COLUMN "fileUrl",
ADD COLUMN     "filePath" TEXT,
ADD COLUMN     "originalName" TEXT;
