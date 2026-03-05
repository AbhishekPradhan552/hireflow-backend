import Razorpay from "razorpay";
import { BillingProvider } from "./billingProvider.js";

export class RazorpayProvider extends BillingProvider {
  constructor() {
    super();
    this.client = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }

  async createCustomer(org) {
    const customer = await this.client.customers.create({
      name: org.name,
      email: org.billingEmail || "noemail@hireflow.app",
    });
    return { providerCustomerId: customer.id };
  }

  async createSubscription({ customerId, plan }) {
    const subscription = await this.client.subscriptions.create({
      customer_id: customerId,
      plan_id: plan.razorpayPlanId,
      total_count: 12,
    });
    return {
      providerSubscriptionId: subscription.id,
      status: subscription.status,
    };
  }

  async cancelSubscription(subscriptionId) {
    const cancelled = await this.client.subscriptions.cancel(subscriptionId);

    return {
      status: cancelled.status,
    };
  }
}
