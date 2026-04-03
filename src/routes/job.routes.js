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
      if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ error: "Request body is missing" });
      }

      const { title, description, requiredSkills: manualSkills } = req.body;

      if (!title?.trim()) {
        return res.status(400).json({ error: "Title is required" });
      }

      if (!description?.trim()) {
        return res.status(400).json({ error: "Description is required" });
      }

      if (description.length > 5000) {
        return res.status(400).json({ error: "Description too long" });
      }

      const orgId = req.user?.orgId;
      if (!orgId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      // normalize helper
      const normalize = (arr) =>
        (Array.isArray(arr) ? arr : [])
          .map((s) => String(s).toLowerCase().trim())
          .filter(Boolean);

      const normalizedManual = normalize(manualSkills);

      let extractedSkills = [];
      try {
        const extracted = extractSkills(description);
        extractedSkills = normalize(extracted);
      } catch (err) {
        console.error("Skill extraction failed:", err);
      }

      const usedManual = normalizedManual.length > 0;

      let requiredSkills = usedManual ? normalizedManual : extractedSkills;

      requiredSkills = [...new Set(requiredSkills)].slice(0, 30);

      // transaction (important)
      const job = await prisma.$transaction(async (tx) => {
        const job = await tx.job.create({
          data: {
            title: title.trim(),
            description: description.trim(),
            requiredSkills,
            orgId,
          },
        });

        const month = getMonthStart();

        await tx.orgUsage.upsert({
          where: {
            orgId_month: { orgId, month },
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

        return job;
      });

      // side effects (non-blocking)
      if (requiredSkills.length > 0) {
        registerSkills(requiredSkills).catch(console.error);
      }

      await jobEmbeddingQueue.add(
        "jobEmbedding",
        { jobId: job.id },
        {
          jobId: `job-embed-${job.id}`,
          attempts: 2,
          backoff: { type: "exponential", delay: 3000 },
          removeOnComplete: true,
          removeOnFail: true,
        },
      );

      res.status(201).json({
        job,
        meta: {
          skillsDetected: requiredSkills.length,
          skills: requiredSkills,
          source: usedManual ? "manual" : "extracted",
        },
      });
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

    const { status, search } = req.query;

    try {
      const whereClause = {
        orgId: req.user.orgId,
        ...(status && status !== "all" && { status }),

        ...(search && {
          title: {
            contains: search,
            mode: "insensitive",
          },
        }),
      };

      const [jobs, total] = await Promise.all([
        prisma.job.findMany({
          where: whereClause,
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
          include: {
            _count: {
              select: { candidates: true },
            },
          },
        }),

        prisma.job.count({
          where: whereClause, // 👈 IMPORTANT (same filter for pagination)
        }),
      ]);

      const formattedJobs = jobs.map((job) => ({
        id: job.id,
        title: job.title,
        description: job.description ?? null,
        createdAt: job.createdAt,
        status: job.status, // 👈 ADD THIS
        candidateCount: job._count.candidates,
      }));

      res.json({
        data: formattedJobs,
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
      if (requiredSkills && requiredSkills.length > 0) {
        await jobRescoreQueue.add(
          "rescore",
          { jobId: req.params.id },
          {
            jobId: `job-rescore-${req.params.id}`,
            attempts: 2,
            backoff: { type: "exponential", delay: 3000 },
            removeOnComplete: true,
            removeOnFail: true,
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

//update job status (open/closed)

router.patch(
  "/jobs/:id/status",
  authMiddleware,
  requirePermission("job:update"),
  async (req, res) => {
    const { status } = req.body;

    try {
      if (!["OPEN", "CLOSED"].includes(status)) {
        return res.status(400).json({ error: "Invalid status " });
      }
      const job = await prisma.job.update({
        where: {
          id: req.params.id,
          orgId: req.user.orgId, //  important for multi-tenant safety
        },
        data: {
          status,
        },
      });

      res.json(job);
    } catch (err) {
      console.error("PATCH /jobs/:id/status error:", err);
      res.status(500).json({ error: "Failed to update status" });
    }
  },
);

export default router;
