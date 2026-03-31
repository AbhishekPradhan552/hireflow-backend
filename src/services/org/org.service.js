import prisma from "../../lib/prisma.js";

export async function createOrganizationWithSubscription(name, userId, role) {
  console.log("🔥 ORG SERVICE: function reached");
  return await prisma.$transaction(async (tx) => {
    console.log("🟡 TRANSACTION START");
    //create organization
    const org = await tx.organization.create({
      data: {
        name,
        members: {
          create: {
            userId,
            role,
          },
        },
      },
    });
    //create default free subscription
    console.log("🟢 ORG CREATED:", org.id);

    await tx.organizationSubscription.create({
      data: {
        orgId: org.id,
        plan: "FREE",
        status: "ACTIVE",
      },
    });
    console.log("✅ SUBSCRIPTION CREATED");
    return org;
  });
}
