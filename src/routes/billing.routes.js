import express from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import prisma from "../lib/prisma.js";
import {
  startSubscription,
  createBillingCustomer,
} from "../billing/billing.service.js";
import { cancelOrgSubscription } from "../billing/billing.service.js";
import { PLANS } from "../constants/plans.js";

const router = express.Router();
// POST/billing/upgrade
//Body: {plan: "PRO" | "TEAM"}

router.post(
  "/upgrade",
  authMiddleware,
  requirePermission("billing:update"),
  async (req, res) => {
    try {
      const orgId = req.user.orgId;
      const { plan } = req.body;

      //validate plan
      if (!PLANS[plan]) {
        return res.status(400).json({ error: "Invalid plan" });
      }
      //get existing subscription
      let sub = await prisma.organizationSubscription.findUnique({
        where: { orgId },
      });
      if (!sub) {
        return res.status(404).json({ error: "Subscription not found" });
      }
      //ensure billing customer exists
      let customerId = sub.providerCustomerId;
      if (!customerId) {
        const customer = await createBillingCustomer({ id: orgId });
        customerId = customer.providerCustomerId;

        await prisma.organizationSubscription.update({
          where: { orgId },
          data: { providerCustomerId: customerId },
        });
      }

      //start new Sub via billing service
      const newSub = await startSubscription({
        orgId,
        customerId,
        plan,
      });
      return res.json({
        message: `Upgraded to ${plan} plan`,
        subscription: newSub,
      });
    } catch (err) {
      console.error("Upgrade error:", err);
      res.status(500).json({ error: "Failed to upgrade plan" });
    }
  },
);

router.post(
  "/cancel",
  authMiddleware,
  requirePermission("billing:update"),
  async (req, res) => {
    try {
      const orgId = req.user.orgId;
      const sub = await prisma.organizationSubscription.findUnique({
        where: { orgId },
      });
      if (!sub) {
        return res.status(404).json({ error: "Subscription not found" });
      }
      // ✅ Call billing service EVEN if stripeSubscriptionId is null

      const result = await cancelOrgSubscription({
        orgId,
        subscriptionId: sub.providerSubscriptionId, //may be null in mock
      });
      return res.json(result);
    } catch (err) {
      console.error("cancel error:", err);
      res.status(500).json({ error: "Failed to cancel subscription" });
    }
  },
);

router.get(
  "/current",
  authMiddleware,
  requirePermission("billing:read"),
  async (req, res) => {
    try {
      const orgId = req.user.orgId;

      const sub = await prisma.organizationSubscription.findUnique({
        where: { orgId },
        select: { plan: true, status: true },
      });

      if (!sub) {
        return res.status(404).json({ error: "Subscription not found" });
      }

      res.json(sub);
    } catch (err) {
      console.error("Fetch current subscription error:", err);
      res.status(500).json({ error: "Failed to fetch subscription" });
    }
  },
);

//first time subscribe
router.post(
  "/subscribe",
  authMiddleware,
  requirePermission("billing:update"),
  async (req, res) => {
    try {
      const orgId = req.user.orgId;
      const { plan } = req.body;

      if (!PLANS[plan] || plan === "FREE") {
        return res.status(400).json({ error: "Invalid paid plan" });
      }
      //find or create subscription row
      let sub = await prisma.organizationSubscription.findUnique({
        where: { orgId },
      });
      if (!sub) {
        sub = await prisma.organizationSubscription.create({
          data: {
            orgId,
            plan: "FREE",
            status: "INACTIVE",
          },
        });
      }
      //prevent duplicate active subscription
      if (sub.status === "ACTIVE" && sub.plan !== "FREE") {
        return res.status(400).json({ error: "Already subscribed" });
      }

      //ensure provider customer exists
      let customerId = sub.providerCustomerId;
      if (!customerId) {
        const customer = await createBillingCustomer({ id: orgId });
        customerId = customer.providerCustomerId;

        await prisma.organizationSubscription.update({
          where: { orgId },
          data: { providerCustomerId: customerId },
        });
      }

      //start subscription via billing service
      const newSub = await startSubscription({
        orgId,
        customerId,
        plan,
      });

      return res.json({
        message: `Subscribed to ${plan} plan`,
        subscription: {
          plan,
          status: "ACTIVE",
          currentPeriodEnd: newSub.currentPeriodEnd,
        },
      });
    } catch (err) {
      console.error("Subscribe error:", err);
      res.status(500).json({ error: "Failed to subscribe" });
    }
  },
);
export default router;
