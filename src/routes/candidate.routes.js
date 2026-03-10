import express from "express";
import prisma from "../lib/prisma.js";
import path from "path";
import { uploadToS3 } from "../services/storage/s3.service.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { uploadResume } from "../middleware/upload.middleware.js";
import { resumeQueue } from "../queue/resume.queue.js";

import { checkLimit } from "../middleware/planLimit.middleware.js";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3 } from "../config/s3Client.js";
import crypto from "crypto";

const router = express.Router();

// CANDIDATES CRUD ROUTES WOULD GO HERE

//create candidate for a job
router.post(
  "/jobs/:jobId/candidates",
  authMiddleware,
  requirePermission("candidate:create"),
  async (req, res) => {
    const { jobId } = req.params;
    const { name, email, phone, resumeUrl } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: "Name and email are required " });
    }
    try {
      // ensure job belongs to logged in user
      const job = await prisma.job.findFirst({
        where: {
          id: jobId,
          orgId: req.user.orgId,
        },
      });
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }

      const candidates = await prisma.candidate.create({
        data: {
          name,
          email,
          phone,

          jobId,
          orgId: req.user.orgId,
        },
      });
      res.status(201).json(candidates);
    } catch (err) {
      console.error("POST /jobs/:jobId/candidates error:", err);
      res.status(500).json({ error: "Failed to create candidate" });
    }
  },
);

// get all candidates for a job
// GET /jobs/:jobId/candidates?page=1&limit=10

router.get(
  "/jobs/:jobId/candidates",
  authMiddleware,
  requirePermission("candidate:read"),
  async (req, res) => {
    const { jobId } = req.params;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    try {
      const [candidates, total] = await Promise.all([
        prisma.candidate.findMany({
          where: {
            jobId,
            orgId: req.user.orgId,
          },
          include: {
            resumes: {
              orderBy: { createdAt: "desc" },
              select: {
                id: true,
                hybridScore: true,
                parseStatus: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        }),

        prisma.candidate.count({
          where: {
            jobId,
            orgId: req.user.orgId,
          },
        }),
      ]);

      const formatted = candidates.map((c) => {
        const bestResume = c.resumes.find((r) => r.id === c.bestResumeId);

        return {
          id: c.id,
          name: c.name,
          email: c.email,
          phone: c.phone,
          status: c.status,
          createdAt: c.createdAt,

          // use hybrid score instead of confidence score
          hybridScore: c.bestScore ?? null,

          parseStatus: bestResume?.parseStatus ?? null,

          resumeCount: c.resumes.length,
        };
      });

      res.json({
        data: formatted,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      console.error("GET /jobs/:jobId/candidates error:", err);
      res.status(500).json({ error: "Failed to fetch candidates" });
    }
  },
);

// get single candidate
router.get(
  "/candidates/:id",
  authMiddleware,
  requirePermission("candidate:read"),
  async (req, res) => {
    try {
      const candidate = await prisma.candidate.findFirst({
        where: {
          id: req.params.id,
          orgId: req.user.orgId,
        },
        include: {
          resumes: {
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              originalName: true,
              fileKey: true,
              fileSize: true,
              mimeType: true,
              parseStatus: true,
              parsedAt: true,
              semanticScore: true,
              hybridScore: true,
              matchedSkills: true,
              missingSkills: true,
              aiStatus: true,
              createdAt: true,
            },
          },
        },
      });

      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }

      // attach signed URLs
      const resumesWithUrls = await Promise.all(
        candidate.resumes.map(async (resume) => {
          const command = new GetObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: resume.fileKey,
          });

          const signedUrl = await getSignedUrl(s3, command, {
            expiresIn: 60 * 5,
          });

          return {
            ...resume,
            downloadUrl: signedUrl,
          };
        }),
      );

      res.json({
        ...candidate,
        resumes: resumesWithUrls,
      });
    } catch (err) {
      console.error("GET /candidates/:id error:", err);
      res.status(500).json({ error: "Failed to fetch candidate" });
    }
  },
);

// GET ranked candidates for a job
router.get(
  "/jobs/:jobId/candidates/ranked",
  authMiddleware,
  requirePermission("candidate:read"),
  async (req, res) => {
    const { jobId } = req.params;

    try {
      const candidates = await prisma.candidate.findMany({
        where: {
          jobId,
          orgId: req.user.orgId,
        },
        include: {
          resumes: {
            select: {
              id: true,
              hybridScore: true,
              parseStatus: true,
            },
          },
        },
        orderBy: {
          bestScore: "desc",
        },
      });

      const ranked = candidates.map((c) => {
        const bestResume = c.resumes.find((r) => r.id === c.bestResumeId);

        return {
          id: c.id,
          name: c.name,
          email: c.email,
          phone: c.phone,
          status: c.status,
          createdAt: c.createdAt,

          hybridScore: c.bestScore ?? null,

          parseStatus: bestResume?.parseStatus ?? null,

          resumeCount: c.resumes.length,
        };
      });

      res.json({
        jobId,
        total: ranked.length,
        data: ranked,
      });
    } catch (err) {
      console.error("GET /jobs/:jobId/candidates/ranked error:", err);
      res.status(500).json({ error: "Failed to fetch ranked candidates" });
    }
  },
);

//update candidate
router.patch(
  "/candidates/:id",
  authMiddleware,
  requirePermission("candidate:update"),
  async (req, res) => {
    const { name, email, phone, status } = req.body;
    try {
      const data = {};
      if (name !== undefined) data.name = name;
      if (email !== undefined) data.email = email;
      if (phone !== undefined) data.phone = phone;
      if (status !== undefined) data.status = status;

      if (Object.keys(data).length === 0) {
        return res.status(400).json({ error: "No fields provided to update" });
      }

      const result = await prisma.candidate.updateMany({
        where: {
          id: req.params.id,
          orgId: req.user.orgId,
        },
        data,
      });
      if (result.count === 0) {
        return res.status(404).json({ error: "Candidate not found" });
      }
      res.json({ success: true });
    } catch (err) {
      console.error("PATCH /candidates/:id error:", err);
      res.status(500).json({ error: "Failed to update candidate" });
    }
  },
);

//delete candidate
router.delete(
  "/candidates/:id",
  authMiddleware,
  requirePermission("candidate:delete"),
  async (req, res) => {
    try {
      const result = await prisma.candidate.deleteMany({
        where: {
          id: req.params.id,
          orgId: req.user.orgId,
        },
      });
      if (result.count === 0) {
        return res.status(404).json({ error: "Candidate not found" });
      }
      res.json({ success: true });
    } catch (err) {
      console.error("DELETE /candidates/:id error:", err);
      return res.status(500).json({ error: "Failed to delete candidate" });
    }
  },
);

// UPLOAD RESUME

router.post(
  "/candidates/:id/resumes",
  authMiddleware,
  checkLimit("resumes"),
  requirePermission("candidate:update"),
  uploadResume.single("resume"),
  async (req, res) => {
    try {
      const candidateId = req.params.id;
      const orgId = req.user.orgId;
      if (!req.file) {
        return res.status(400).json({ error: "Resume file is required" });
      }

      if (!req.file.buffer || req.file.buffer.length === 0) {
        return res.status(400).json({ error: "Invalid file buffer" });
      }

      const candidate = await prisma.candidate.findFirst({
        where: {
          id: candidateId,
          orgId,
        },
      });
      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }

      // generate S3 key(replaces disk folder structure)
      const ext = path.extname(req.file.originalname).toLowerCase();
      const uniqueKey = `resumes/${orgId}/${candidateId}/${crypto.randomUUID()}${ext}`;

      //upload to S3
      const key = await uploadToS3({
        buffer: req.file.buffer,
        key: uniqueKey,
        mimeType: req.file.mimetype,
      });

      //save to DB(store key only)
      const resume = await prisma.resume.create({
        data: {
          originalName: req.file.originalname,
          fileKey: key, //
          fileSize: req.file.size,
          mimeType: req.file.mimetype,
          candidateId,
          orgId,
          uploadedBy: req.user.id, // from JWT
          parseStatus: "PENDING",
        },
      });
      await resumeQueue.add(
        "parse-resume",
        { resumeId: resume.id },
        {
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 5000,
          },
          removeOnComplete: true,
          removeOnFail: false, //keep failed jobs for debugging
        },
      );

      res.status(201).json(resume);
    } catch (err) {
      console.error("UPLOAD ERROR:", err);
      res.status(500).json({ error: err.message });
    }
  },
);

// GET job statistics
router.get(
  "/jobs/:jobId/stats",
  authMiddleware,
  requirePermission("candidate:read"),
  async (req, res) => {
    const { jobId } = req.params;

    try {
      const candidates = await prisma.candidate.findMany({
        where: {
          jobId,
          orgId: req.user.orgId,
        },
        select: {
          bestScore: true,
          resumes: {
            select: {
              parseStatus: true,
            },
          },
        },
      });

      const totalCandidates = candidates.length;

      let parsed = 0;
      let pending = 0;
      let scores = [];

      candidates.forEach((c) => {
        if (c.bestScore !== null) scores.push(c.bestScore);

        c.resumes.forEach((r) => {
          if (r.parseStatus === "COMPLETED") parsed++;
          if (r.parseStatus === "PENDING") pending++;
        });
      });

      const avgScore =
        scores.length > 0
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
          : null;

      const topScore = scores.length > 0 ? Math.max(...scores) : null;

      res.json({
        jobId,
        totalCandidates,
        parsedResumes: parsed,
        pendingResumes: pending,
        averageScore: avgScore,
        topScore,
      });
    } catch (err) {
      console.error("GET /jobs/:jobId/stats error:", err);
      res.status(500).json({ error: "Failed to fetch job stats" });
    }
  },
);

// GET candidate pipeline summary
router.get(
  "/jobs/:jobId/pipeline",
  authMiddleware,
  requirePermission("candidate:read"),
  async (req, res) => {
    const { jobId } = req.params;

    try {
      const candidates = await prisma.candidate.findMany({
        where: {
          jobId,
          orgId: req.user.orgId,
        },
        select: {
          status: true,
        },
      });

      const pipeline = {
        applied: 0,
        screening: 0,
        interview: 0,
        hired: 0,
        rejected: 0,
      };

      candidates.forEach((c) => {
        const key = (c.status || '').toLowerCase();
        if (key && pipeline[key] !== undefined) {
          pipeline[key]++;
        }
      });

      res.json({
        jobId,
        pipeline,
      });
    } catch (err) {
      console.error("GET /jobs/:jobId/pipeline error:", err);
      res.status(500).json({ error: "Failed to fetch pipeline data" });
    }
  },
);

export default router;
