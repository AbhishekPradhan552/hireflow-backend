import { MockProvider } from "./providers/mockProvider.js";
import { RazorpayProvider } from "./providers/razorpay.provider.js";

export function getBillingProvider() {
  if (process.env.BILLING_PROVIDER === "razorpay") {
    return new RazorpayProvider();
  }

  return new MockProvider();
}
