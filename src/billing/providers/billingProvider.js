//contract every payment provider must follow

export class BillingProvider {
  async createCustomer(org) {
    throw new Error("createCustomer() not implemented");
  }
  async createSubscription({ customerId, plan }) {
    throw new Error("createSubscription() not implemented");
  }
  async cancelSubscription(subscriptionId) {
    throw new Error("cancelSubscription() not implemented");
  }
}
