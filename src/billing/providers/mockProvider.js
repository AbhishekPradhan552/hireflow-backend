import { BillingProvider } from "./billingProvider.js";
import crypto from "crypto";
import prisma from "../../lib/prisma.js";

export class MockProvider extends BillingProvider {
  async createCustomer(org) {
    return {
      providerCustomerId: "mock_cus_" + crypto.randomUUID(),
      name: org.name,
    };
  }
  async createSubscription({ customerId, plan }) {
    return {
      providerSubscriptionId: "mock_sub_" + crypto.randomUUID(),
      customerId,
      plan,
      status: "active",
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };
  }
  async cancelSubscription(subscriptionId) {
    //find org by subscriptionId
    const sub = await prisma.organizationSubscription.findFirst({
      where: { providerSubscriptionId: subscriptionId },
    });
    if (!sub) {
      throw new Error("Subscription not found");
    }
    //downgrade to free
    await prisma.organizationSubscription.update({
      where: { orgId: sub.orgId },
      data: {
        plan: "FREE",
        status: "ACTIVE",
        providerSubscriptionId: null,
      },
    });
    return { message: "Subscription cancelled (mock). Downgraded to FREE." };
  }
}
