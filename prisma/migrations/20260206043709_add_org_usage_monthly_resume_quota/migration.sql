-- CreateTable
CREATE TABLE "OrgUsage" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "resumesParsed" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "OrgUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrgUsage_orgId_idx" ON "OrgUsage"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "OrgUsage_orgId_month_key" ON "OrgUsage"("orgId", "month");

-- AddForeignKey
ALTER TABLE "OrgUsage" ADD CONSTRAINT "OrgUsage_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
