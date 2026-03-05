import express from "express";
import prisma from "../lib/prisma.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { getResumeUsage } from "../services/billing/usage.service.js";
import { PLANS } from "../constants/plans.js";
import { createOrganizationWithSubscription } from "../services/org/org.service.js";
const router = express.Router();

//create organization
router.post("/", authMiddleware, async (req, res) => {
  try {
    const org = await createOrganizationWithSubscription(
      { name: req.body.name },
      req.user.id,
    );
    res.status(201).json(org);
  } catch (err) {
    console.error("POST/ org error:", err);
    res.status(500).json({ error: "Failed to create Organization" });
  }
});

//GET org/usage

router.get("/usage", authMiddleware, async (req, res) => {
  try {
    const orgId = req.user.orgId;

    const resumesParsed = await getResumeUsage(orgId);

    const sub = await prisma.organizationSubscription.findUnique({
      where: { orgId },
      select: { plan: true },
    });
    const limit = PLANS[sub?.plan || "FREE"].resumeLimit;

    res.json({
      resumesParsed,
      limit,
    });
  } catch (err) {
    console.error("GET /org/usage error:", err);
    res.status(500).json({ error: "Failed to fetch usage" });
  }
});

export default router;
