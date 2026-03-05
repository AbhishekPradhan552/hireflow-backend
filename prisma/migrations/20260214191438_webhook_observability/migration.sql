-- AlterTable
ALTER TABLE "OrganizationSubscription" ADD COLUMN     "lastWebhookAt" TIMESTAMP(3),
ADD COLUMN     "lastWebhookEvent" TEXT;
