import prisma from "../../lib/prisma.js";

function getMonthKey(date = new Date()) {
  return date.toISOString().slice(0, 7);
}

export async function getResumeUsage(orgId) {
  const month = getMonthKey();

  const usage = await prisma.orgUsage.findUnique({
    where: { orgId_month: { orgId, month } },
  });
  return usage?.resumesParsed ?? 0;
}

export async function incrementResumeUsage(orgId) {
  const month = getMonthKey();
  await prisma.orgUsage.upsert({
    where: { orgId_month: { orgId, month } },
    update: { resumesParsed: { increment: 1 } },
    create: { orgId, month, resumesParsed: 1, jobsCreated: 0 },
  });
}
