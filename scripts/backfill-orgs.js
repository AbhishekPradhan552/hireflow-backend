import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting org backfill...");

  const users = await prisma.user.findMany({
    include: {
      memberships: true,
    },
  });

  for (const user of users) {
    // Skip if already has org membership
    if (user.memberships.length > 0) {
      console.log(`User ${user.email} already has org, skipping`);
      continue;
    }

    // 1️⃣ Create org
    const org = await prisma.organization.create({
      data: {
        name: `${user.email}'s Org`,
      },
    });

    // 2️⃣ Add membership OWNER
    await prisma.organizationMember.create({
      data: {
        userId: user.id,
        orgId: org.id,
        role: "OWNER",
      },
    });

    // 3️⃣ Move jobs → org
    await prisma.job.updateMany({
      where: {
        // old jobs had no org
        orgId: null,
      },
      data: {
        orgId: org.id,
      },
    });

    // 4️⃣ Move candidates → org
    await prisma.candidate.updateMany({
      where: {
        orgId: null,
      },
      data: {
        orgId: org.id,
      },
    });

    console.log(`Migrated user ${user.email}`);
  }

  console.log("Backfill complete.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
