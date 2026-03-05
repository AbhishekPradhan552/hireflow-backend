-- AlterTable
ALTER TABLE "Resume" ADD COLUMN     "parseError" TEXT,
ADD COLUMN     "parsedAt" TIMESTAMP(3),
ADD COLUMN     "parsedData" JSONB,
ADD COLUMN     "parsedText" TEXT;
