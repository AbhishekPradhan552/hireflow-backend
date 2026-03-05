/*
  Warnings:

  - You are about to drop the column `stripeCustomerId` on the `OrganizationSubscription` table. All the data in the column will be lost.
  - You are about to drop the column `stripeSubscriptionId` on the `OrganizationSubscription` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[providerCustomerId]` on the table `OrganizationSubscription` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[providerSubscriptionId]` on the table `OrganizationSubscription` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "OrganizationSubscription_stripeCustomerId_key";

-- DropIndex
DROP INDEX "OrganizationSubscription_stripeSubscriptionId_key";

-- AlterTable
ALTER TABLE "OrganizationSubscription" DROP COLUMN "stripeCustomerId",
DROP COLUMN "stripeSubscriptionId",
ADD COLUMN     "provider" TEXT NOT NULL DEFAULT 'razorpay',
ADD COLUMN     "providerCustomerId" TEXT,
ADD COLUMN     "providerSubscriptionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationSubscription_providerCustomerId_key" ON "OrganizationSubscription"("providerCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationSubscription_providerSubscriptionId_key" ON "OrganizationSubscription"("providerSubscriptionId");
