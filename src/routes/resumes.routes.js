import express from "express";
import prisma from "../lib/prisma.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { handleResumeDeleted } from "../services/candidate/candidateScore.service.js";
import { resumeQueue } from "../queue/resume.queue.js";

//import { getBufferFromS3 } from "../services/storage/s3.service.js";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3 } from "../config/s3Client.js";

const router = express.Router();

//signed url download(new route)

router.get(
  "/resumes/:id/download-url",
  authMiddleware,
  requirePermission("candidate:read"),
  async (req, res) => {
    try {
      const resumeId = req.params.id;
      const orgId = req.user.orgId;

      const resume = await prisma.resume.findFirst({
        where: {
          id: resumeId,
          orgId,
        },
      });
      if (!resume) {
        return res.status(404).json({ error: "Resume not found" });
      }

      const command = new GetObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: resume.fileKey,
      });

      const signedUrl = await getSignedUrl(s3, command, {
        expiresIn: 60 * 5, // 5 min
      });

      return res.json({
        url: signedUrl,
        filename: resume.originalName,
      });
    } catch (err) {
      console.error("SIGNED URL ERROR:", err);
      res.status(500).json({ error: "Failed to generate download URL" });
    }
  },
);

//DOWNLOAD RESUME from S3

router.get(
  "/resumes/:id/download",
  authMiddleware,
  requirePermission("candidate:read"),
  async (req, res) => {
    try {
      const resumeId = req.params.id;
      const orgId = req.user.orgId;

      //fetch resum org scoped
      const resume = await prisma.resume.findFirst({
        where: {
          id: resumeId,
          orgId,
        },
      });
      if (!resume) {
        return res.status(404).json({ error: "Resume not found" });
      }

      const command = new GetObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: resume.fileKey,
      });
      const s3Response = await s3.send(command);

      //force browser download
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${resume.originalName}"`,
      );
      res.setHeader(
        "Content-Type",
        resume.mimeType || "application/octet-stream",
      );
      if (resume.fileSize) {
        res.setHeader("Content-Length", resume.fileSize);
      }

      // stream S3 file to client
      s3Response.Body.pipe(res);
    } catch (err) {
      console.error("DOWNLOAD RESUME ERROR :", err);
      res.status(500).json({ error: "Failed to download resume" });
    }
  },
);

// GET RESUME (parsed data + status)
router.get(
  "/resumes/:id",
  authMiddleware,
  requirePermission("candidate:read"),
  async (req, res) => {
    try {
      const resumeId = req.params.id;
      const orgId = req.user.orgId;

      const resume = await prisma.resume.findFirst({
        where: {
          id: resumeId,
          orgId,
        },
        select: {
          id: true,
          originalName: true,
          parseStatus: true,
          parsedText: true,
          parsedAt: true,
          parseError: true,

          hybridScore: true,
          matchedSkills: true,
          missingSkills: true,

          candidateId: true,
          createdAt: true,
        },
      });

      if (!resume) {
        return res.status(404).json({ error: "Resume not found" });
      }

      return res.json(resume);
    } catch (err) {
      console.error("GET /resumes/:id error:", err);
      return res.status(500).json({ error: "Failed to fetch resume" });
    }
  },
);

//DELETE RESUME from S3
router.delete(
  "/resumes/:id",
  authMiddleware,
  requirePermission("candidate:update"),
  async (req, res) => {
    const resumeId = req.params.id;
    const orgId = req.user.orgId;

    const resume = await prisma.resume.findFirst({
      where: { id: resumeId, orgId },
    });

    if (!resume) {
      return res.status(404).json({ error: "Resume not found" });
    }

    // delete file from S3 instead of disk
    await s3.send(
      new DeleteObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: resume.fileKey,
      }),
    );

    await handleResumeDeleted(resumeId);

    res.json({ success: true });
  },
);

router.post(
  "/resumes/:id/reparse",
  authMiddleware,
  requirePermission("candidate:update"),
  async (req, res) => {
    const resumeId = req.params.id;
    const orgId = req.user.orgId;

    const resume = await prisma.resume.findFirst({
      where: { id: resumeId, orgId },
    });

    if (!resume) {
      return res.status(404).json({ error: "Resume not found" });
    }
    //only allow retry for failed or completed(manual reparse)
    if (!["FAILED", "COMPLETED"].includes(resume.parseStatus)) {
      return res
        .status(400)
        .json({ error: "Resume cannot be reparsed in current state" });
    }
    // reset parse state
    await prisma.resume.update({
      where: { id: resumeId },
      data: {
        parseStatus: "PENDING",
        parseError: null,
        parsedText: null,
        parsedData: null,
        parsedAt: null,
        confidenceScore: null,
        scoreBreakdown: null,
      },
    });

    // push back to BullMQ queue (with retries)
    await resumeQueue.add(
      "parse-resume",
      { resumeId },
      {
        jobId: `resume-${resumeId}`,
        attempts: 2,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: true,
        removeOnFail: true,
      },
    );

    res.json({ success: true, message: "Re-parse started " });
  },
);

export default router;
