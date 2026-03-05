import prisma from "../lib/prisma.js";
import { MockProvider } from "./providers/mockProvider.js";
import { RazorpayProvider } from "./providers/razorpay.provider.js";

let provider;
if (process.env.BILLING_PROVIDER === "razorpay") {
  provider = new RazorpayProvider();
} else {
  provider = new MockProvider();
}

export async function createBillingCustomer(org) {
  const customer = await provider.createCustomer(org);
  //store customerId in DB
  await prisma.organizationSubscription.update({
    where: { orgId: org.id },
    data: {
      providerCustomerId: customer.providerCustomerId,
    },
  });
  return customer;
}

export async function startSubscription({ orgId, customerId, plan }) {
  const sub = await provider.createSubscription({ customerId, plan });
  //persist subscription state
  await prisma.organizationSubscription.update({
    where: { orgId },
    data: {
      plan,
      status: "ACTIVE",
      providerSubscriptionId: sub.providerSubscriptionId,
      currentPeriodEnd: sub.currentPeriodEnd,
    },
  });
  return sub;
}
export async function cancelOrgSubscription({ orgId, subscriptionId }) {
  //call provider mock for now
  await provider.cancelSubscription(subscriptionId);

  await prisma.organizationSubscription.update({
    where: { orgId },
    data: {
      plan: "FREE",
      status: "ACTIVE",
      providerSubscriptionId: null,
      currentPeriodEnd: null,
    },
  });
  return { message: "Subscription canceled and downgraded to FREE" };
}
