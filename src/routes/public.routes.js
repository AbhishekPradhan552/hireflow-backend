import express from "express";
import prisma from "../lib/prisma.js";
import multer from "multer";

import { uploadToS3 } from "../services/storage/s3.service.js";
const router = express.Router();

// multer setup for file uploads-------
const upload = multer({
  storage: multer.memoryStorage(),

  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error("Only PDF, DOC, and DOCX files are allowed"));
    }
    cb(null, true);
  },
});

//---------apply to job-----------

router.post(
  "/public/jobs/:jobId/apply",
  upload.single("resume"),
  async (req, res) => {
    try {
      const { jobId } = req.params;
      const { name, email, phone } = req.body;

      // ✅ Basic validation
      if (!name || !email) {
        return res.status(400).json({
          error: "Name and email are required",
        });
      }
      if (!req.file) {
        return res.status(400).json({ error: "Resume file is required" });
      }

      //-----validate job------
      const job = await prisma.job.findUnique({
        where: { id: jobId },
      });
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }

      // ✅ Check job status
      if (job.status !== "open") {
        return res.status(400).json({
          error: "This job is no longer accepting applications",
        });
      }

      //--prevent duplicate application-----
      const existingCandidate = await prisma.candidate.findFirst({
        where: { jobId, email },
      });
      if (existingCandidate) {
        return res
          .status(409)
          .json({ error: "you have already applied for this job" });
      }

      //------upload resume to s3-----
      const uploadResult = await uploadToS3(req.file);

      //---------create candidate-----------
      const candidate = await prisma.candidate.create({
        data: {
          name,
          email,
          phone,
          jobId: job.id,
          orgId: job.orgId,
        },
      });

      //----create resume record-----
      const resume = await prisma.resume.create({
        data: {
          candidateId: candidate.id,
          fileKey: uploadResult.fileKey,
          originalName: req.file.originalname,

          parseStatus: "PENDING",
          aiStatus: "PENDING",
        },
      });

      //----response----
      res.json({
        success: true,
        message: "Application submitted successfully",
        candidateId: candidate.id,
        resumeId: resume.id,
      });
    } catch (err) {
      console.error("Public apply error:", err);

      res.status(500).json({
        error: "Failed to submit application",
      });
    }
  },
);

router.get("/public/jobs/:jobId", async (req, res) => {
  try {
    const { jobId } = req.params;
    //validate param
    if (!jobId) {
      return res.status(400).json({
        success: false,
        message: "Job ID is required",
      });
    }
    // fetch only safe/public  fields
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        title: true,
        description: true,
        requiredSkills: true,
        status: true,
      },
    });

    //job not found
    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }
    // job not open
    if (job.status !== "open") {
      return res.status(404).json({
        success: false,
        message: "This job is no longer accepting applications",
      });
    }

    // clean response for frontend
    return res.status(200).json({
      id: job.id,
      title: job.title,
      description: job.description || "",
      requiredSkills: job.requiredSkills || [],
    });
  } catch (error) {
    console.error("Error fetching public job:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

export default router;
