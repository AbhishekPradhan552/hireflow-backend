import prisma from "../lib/prisma.js";
import { PLANS } from "../constants/plans.js";
import { getMonthStart } from "../utils/getMonthStart.js";

export function checkLimit(feature) {
  return async (req, res, next) => {
    try {
      const orgId = req.user.orgId;
      const sub = await prisma.organizationSubscription.findUnique({
        where: { orgId },
      });

      if (!sub) {
        return res.status(400).json({ error: "Subscription not found" });
      }
      if (sub.status !== "ACTIVE") {
        return res.status(403).json({
          error: "Subscription inactive",
        });
      }
      const planLimits = PLANS[sub.plan];
      if (!planLimits) {
        return res.status(400).json({ error: "Invalid plan" });
      }

      //get current month start
      const month = getMonthStart();

      //get monthly usage
      const usage = await prisma.orgUsage.findUnique({
        where: {
          orgId_month: {
            orgId,
            month,
          },
        },
      });

      const jobsUsed = usage?.jobsCreated ?? 0;
      const resumesUsed = usage?.resumesParsed ?? 0;

      console.log("CHECK LIMIT resumesUsed:", resumesUsed);


      //dynamic feature handling
      const featureMap = {
        jobs: "jobsLimit",
        resumes: "resumeLimit",
      };

      const limitKey = featureMap[feature];
      if (!limitKey) {
        return res.status(400).json({
          error: "Invalid feature type",
        });
      }

      const limit = planLimits[limitKey];
      const used = feature === "jobs" ? jobsUsed : resumesUsed;
      //enforce limit
      if (limit !== null && used >= limit) {
        return res.status(403).json({
          error: `${feature} limit reached. Please upgrade your plan.`,
        });
      }
      next();
    } catch (err) {
      console.error("Plan limit error:", err);
      res.status(500).json({ error: "Failed to check limits" });
    }
  };
}
