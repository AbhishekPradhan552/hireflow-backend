import express from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { checkLimit } from "../middleware/planLimit.middleware.js";
import { getMonthStart } from "../utils/getMonthStart.js";
import { jobRescoreQueue } from "../queue/jobRescore.queue.js";
import prisma from "../lib/prisma.js";
import { jobEmbeddingQueue } from "../queue/jobEmbedding.queue.js";

import { extractSkills } from "../services/resume/resumeStructuredParser.service.js";
import { normalizeSkills } from "../constants/skills.js";
import { registerSkills } from "../services/skill.service.js";

const router = express.Router();

//jobs crud routes

//create job
router.post(
  "/jobs",
  authMiddleware,
  checkLimit("jobs"),
  requirePermission("job:create"),
  async (req, res) => {
    try {
      if (!req.body) {
        return res.status(400).json({ error: "Request body is missing" });
      }
      const { title, description } = req.body;
      if (!title) {
        return res.status(400).json({ error: "Title is required" });
      }
      const orgId = req.user.orgId;

      // auto extract required skills from description

      const requiredSkills = extractSkills(description);

      if (!requiredSkills.length) {
        return res.status(400).json({
          error: "No valid technical skills detected in job description",
        });
      }

      await registerSkills(requiredSkills);
      const job = await prisma.job.create({
        data: {
          title,
          description,
          requiredSkills,
          orgId,
        },
      });

      //trigger embedding after job creation

      await jobEmbeddingQueue.add("generateEmbedding", { jobId: job.id });

      //increment usage after success
      const month = getMonthStart();
      await prisma.orgUsage.upsert({
        where: {
          orgId_month: {
            orgId,
            month,
          },
        },
        update: {
          jobsCreated: { increment: 1 },
        },
        create: {
          orgId,
          month,
          jobsCreated: 1,
          resumesParsed: 0,
        },
      });
      res.status(201).json(job);
    } catch (err) {
      console.error("POST /jobs error:", err);
      res.status(500).json({ error: "Failed to create job" });
    }
  },
);
//get all jobs for the authenticated user

//GET /jobs?page=1&limit=10
router.get(
  "/jobs",
  authMiddleware,
  requirePermission("job:read"),
  async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    try {
      const [jobs, total] = await Promise.all([
        prisma.job.findMany({
          where: { orgId: req.user.orgId },
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        }),
        prisma.job.count({
          where: { orgId: req.user.orgId },
        }),
      ]);
      res.json({
        data: jobs,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      console.error("GET /jobs error:", err);
      res.status(500).json({ error: "Failed to fetch jobs" });
    }
  },
);

//get single job
router.get(
  "/jobs/:id",
  authMiddleware,
  requirePermission("job:read"),
  async (req, res) => {
    try {
      const jobs = await prisma.job.findFirst({
        where: { id: req.params.id, orgId: req.user.orgId },
      });
      if (!jobs) {
        return res.status(404).json({ error: "Job not found" });
      }
      res.json(jobs);
    } catch (err) {
      console.error("GET/jobs/:id error:", err);
      res.status(500).json({ error: "Failed to fetch jobs" });
    }
  },
);

//update job
router.put(
  "/jobs/:id",
  authMiddleware,
  requirePermission("job:update"),
  async (req, res) => {
    try {
      const { requiredSkills, ...rest } = req.body;

      //update job safely
      const result = await prisma.job.updateMany({
        where: { id: req.params.id, orgId: req.user.orgId },
        data: {
          ...rest,
          ...(requiredSkills && { requiredSkills }),
        },
      });
      if (result.count === 0) {
        return res.status(404).json({ error: "Job not found" });
      }

      //trigger async response only if requird skills change
      if (requiredSkills) {
        await jobRescoreQueue.add(
          "rescore",
          { jobId: req.params.id },
          {
            removeOnComplete: 100,
            removeOnFail: 50,
          },
        );
      }
      res.json({ success: true });
    } catch (err) {
      console.error("PUT /jobs/:id error:", err);
      res.status(500).json({ error: "Failed to update job" });
    }
  },
);

//delete job
router.delete(
  "/jobs/:id",
  authMiddleware,
  requirePermission("job:delete"),
  async (req, res) => {
    try {
      const result = await prisma.job.deleteMany({
        where: { id: req.params.id, orgId: req.user.orgId },
      });
      if (result.count === 0) {
        return res.status(404).json({ error: "Job not found" });
      }
      res.json({ success: true });
    } catch (err) {
      console.error("DELETE/jobs/:id error:", err);
      res.status(500).json({ error: "Failed to delete job" });
    }
  },
);

export default router;
