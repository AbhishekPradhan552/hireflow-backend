import prisma from "../lib/prisma.js";
import { PLANS } from "../constants/plans.js";

export async function enforceResumeLimit(req, res, next) {
  try {
    const orgId = req.user.orgId;

    //get subscription
    const subscription = await prisma.organizationSubscription.findUnique({
      where: { orgId },
    });
    if (!subscription || subscription.status !== "ACTIVE") {
      return res.status(403).json({
        error: "No active subscription. Please upgrade your plan.",
      });
    }

    //get current month usage
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const usage = await prisma.orgUsage.findUnique({
      where: {
        orgId_month: {
          orgId,
          month: monthStart,
        },
      },
    });
    const resumesParsed = usage?.resumesParsed || 0;
    const planConfig = PLANS[subscription.plan];

    if (!planConfig) {
      return res.status(500).json({ error: "Invalid plan configuration" });
    }
    //check Limit
    if (
      planConfig.resumeLimit !== null &&
      resumesParsed >= planConfig.resumeLimit
    ) {
      return res.status(403).json({
        error: "Monthly resume limit reached.Please upgrade your plan",
      });
    }
    next();
  } catch (err) {
    console.error("Plan enforcement error:", err);
    res.status(500).json({ error: "Failed to verify plan limits" });
  }
}
