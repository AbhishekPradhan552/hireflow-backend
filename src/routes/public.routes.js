import express from "express";
import prisma from "../lib/prisma.js";
import multer from "multer";
import { dbRetry } from "../utils/dbRetry.js";
import { resumeQueue } from "../queue/resume.queue.js";
import { uploadToS3 } from "../services/storage/s3.service.js";

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3 } from "../config/s3Client.js";

const router = express.Router();

// 🔹 Constants (avoid string bugs)
const JOB_STATUS = {
  OPEN: "OPEN",
  CLOSED: "CLOSED",
};

// multer setup
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

// ==========================
// 🔥 APPLY TO JOB
// ==========================
// router.post(
//   "/public/jobs/:jobId/apply",
//   upload.single("resume"),
//   async (req, res) => {
//     try {
//       const { jobId } = req.params;
//       const { name, email, phone } = req.body;

//       if (!name || !email) {
//         return res.status(400).json({
//           success: false,
//           error: "Name and email are required",
//         });
//       }

//       if (!req.file) {
//         return res.status(400).json({
//           success: false,
//           error: "Resume file is required",
//         });
//       }

//       const job = await prisma.job.findUnique({
//         where: { id: jobId },
//       });

//       if (!job) {
//         return res.status(404).json({
//           success: false,
//           error: "Job not found",
//         });
//       }

//       // ✅ FIX: correct enum + correct status code
//       if (job.status !== JOB_STATUS.OPEN) {
//         return res.status(403).json({
//           success: false,
//           error: "This job is no longer accepting applications",
//         });
//       }

//       // ✅ FIX: case-insensitive email check
//       const existingCandidate = await prisma.candidate.findFirst({
//         where: {
//           jobId,
//           email: {
//             equals: email,
//             mode: "insensitive",
//           },
//         },
//       });

//       if (existingCandidate) {
//         return res.status(409).json({
//           success: false,
//           error: "You have already applied for this job",
//         });
//       }

//       // upload to S3
//       const fileKey = `resumes/${jobId}/${Date.now()}-${req.file.originalname}`;

//       await uploadToS3({
//         buffer: req.file.buffer,
//         key: fileKey,
//         mimeType: req.file.mimetype,
//       });

//       const candidate = await prisma.candidate.create({
//         data: {
//           name,
//           email,
//           phone,
//           jobId: job.id,
//           orgId: job.orgId,
//           status: "APPLIED",
//         },
//       });

//       const resume = await prisma.resume.create({
//         data: {
//           candidateId: candidate.id,
//           orgId: job.orgId,
//           uploadedBy: "PUBLIC_APPLY",
//           fileKey,
//           originalName: req.file.originalname,
//           fileSize: req.file.size,
//           mimeType: req.file.mimetype,
//           parseStatus: "PENDING",
//           aiStatus: "PENDING",
//         },
//       });

//       await resumeQueue.add("parse-resume", {
//         resumeId: resume.id,
//       });

//       return res.json({
//         success: true,
//         message: "Application submitted successfully",
//         data: {
//           candidateId: candidate.id,
//           resumeId: resume.id,
//         },
//       });
//     } catch (err) {
//       console.error("Public apply error:", err);

//       return res.status(500).json({
//         success: false,
//         error: "Failed to submit application",
//       });
//     }
//   },
// );

// ==========================
// 🔥 GET PUBLIC JOB
// ==========================
router.get("/public/jobs/:jobId", async (req, res) => {
  try {
    const { jobId } = req.params;

    if (!jobId) {
      return res.status(400).json({
        success: false,
        message: "Job ID is required",
      });
    }

    const job = await dbRetry(() =>
      prisma.job.findUnique({
        where: { id: jobId },
        select: {
          id: true,
          title: true,
          description: true,
          requiredSkills: true,
          status: true,
        },
      }),
    );

    // ✅ Only true 404 case
    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    // ✅ FIX: NEVER return 404 for closed job
    return res.status(200).json({
      success: true,
      data: {
        id: job.id,
        title: job.title,
        description: job.description || "",
        requiredSkills: job.requiredSkills || [],
        isOpen: job.status === JOB_STATUS.OPEN,
      },
    });
  } catch (error) {
    console.error("Error fetching public job:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

//apply route

router.post("/public/jobs/:jobId/apply", async (req, res) => {
  try {
    const { jobId } = req.params;
    const { name, email, phone } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        error: "Name and email are required",
      });
    }

    const job = await prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        error: "Job not found",
      });
    }

    if (job.status !== JOB_STATUS.OPEN) {
      return res.status(403).json({
        success: false,
        error: "This job is no longer accepting applications",
      });
    }

    const existingCandidate = await prisma.candidate.findFirst({
      where: {
        jobId,
        email: {
          equals: email,
          mode: "insensitive",
        },
      },
    });

    if (existingCandidate) {
      return res.status(409).json({
        success: false,
        error: "You have already applied for this job",
      });
    }

    const candidate = await prisma.candidate.create({
      data: {
        name,
        email,
        phone,
        jobId: job.id,
        orgId: job.orgId,
        status: "APPLIED",
      },
    });

    return res.json({
      success: true,
      candidateId: candidate.id,
      orgId: candidate.orgId,
    });
  } catch (err) {
    console.error("Public apply error:", err);

    return res.status(500).json({
      success: false,
      error: "Failed to submit application",
    });
  }
});

//presigned-url direct s3 upload
router.post("/public/uploads/presigned-url", async (req, res) => {
  try {
    const { fileName, fileType, jobId } = req.body;

    if (!fileName || !fileType || !jobId) {
      return res.status(400).json({
        error: "Missing required fields",
      });
    }

    // optional: validate file type (same as multer)
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedTypes.includes(fileType)) {
      return res.status(400).json({
        error: "Invalid file type",
      });
    }

    const key = `resumes/${jobId}/${Date.now()}-${fileName}`;

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key,
      ContentType: fileType,
    });

    const uploadUrl = await getSignedUrl(s3, command, {
      expiresIn: 60,
    });

    return res.json({
      success: true,
      uploadUrl,
      key,
    });
  } catch (err) {
    console.error("Presigned URL error:", err);

    return res.status(500).json({
      error: "Failed to generate upload URL",
    });
  }
});

//resume save endpoint
router.post("/public/resumes/direct", async (req, res) => {
  try {
    const { candidateId, orgId, key, originalName, mimeType, fileSize } =
      req.body;

    if (!candidateId || !key || !orgId) {
      return res.status(400).json({
        error: "Missing required fields",
      });
    }

    // ✅ safety check
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
    });

    if (!candidate) {
      return res.status(404).json({
        error: "Candidate not found",
      });
    }

    const resume = await prisma.resume.create({
      data: {
        candidateId,
        orgId,
        uploadedBy: "PUBLIC_APPLY",
        fileKey: key,
        originalName,
        fileSize,
        mimeType,
        parseStatus: "PENDING",
        aiStatus: "PENDING",
      },
    });

    res.status(201).json({
      success: true,
      resumeId: resume.id,
    });

    //  ADD TO QUEUE (NON-BLOCKING, SAFE)
    resumeQueue
      .add(
        "parse-resume",
        { resumeId: resume.id },
        {
          jobId: resume.id,
          attempts: 2,
          backoff: { type: "exponential", delay: 3000 },
          removeOnComplete: true,
          removeOnFail: true,
        },
      )
      .catch((err) => {
        console.error("Queue failed (safe):", err.message);
      });
  } catch (err) {
    console.error("Public resume error:", err);

    return res.status(500).json({
      error: "Failed to save resume",
    });
  }
});

export default router;
