import express from "express";
import { getBillingProvider } from "../billing/index.js";

const router = express.Router();

/**
 * TEMP TEST ROUTE
 * This will be deleted later.
 */
router.get("/test-billing", async (req, res) => {
  try {
    const billing = getBillingProvider();

    // 1️⃣ Create customer
    const customer = await billing.createCustomer({
      name: "Test Org",
      billingEmail: "test@example.com",
    });

    // 2️⃣ Fake plan object (temporary)
    const fakePlan = {
      razorpayPlanId: process.env.RAZORPAY_TEST_PLAN_ID,
    };

    // 3️⃣ Create subscription
    const subscription = await billing.createSubscription({
      customerId: customer.providerCustomerId,
      plan: fakePlan,
    });

    return res.json({
      success: true,
      customer,
      subscription,
    });
  } catch (error) {
    console.error("TEST BILLING ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;
