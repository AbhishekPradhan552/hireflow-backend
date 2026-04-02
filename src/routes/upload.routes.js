import express from "express";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3 } from "../config/s3Client.js";
import crypto from "crypto";
import prisma from "../lib/prisma.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/presigned-url", authMiddleware, async (req, res) => {
  try {
    const { fileName, fileType, candidateId } = req.body;
    const orgId = req.user.orgId;

    if (!fileName || !fileType || !candidateId) {
      return res.status(400).json({ error: "Missing fields" });
    }

    // 🔒 validate candidate ownership
    const candidate = await prisma.candidate.findFirst({
      where: { id: candidateId, orgId },
    });

    if (!candidate) {
      return res.status(404).json({ error: "Candidate not found" });
    }

    // ✅ SAME STRUCTURE AS YOUR CURRENT SYSTEM
    const ext = fileName.split(".").pop();
    const key = `resumes/${orgId}/${candidateId}/${crypto.randomUUID()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key,
      ContentType: fileType,
    });

    const uploadUrl = await getSignedUrl(s3, command, {
      expiresIn: 60,
    });

    res.json({ uploadUrl, key });
  } catch (err) {
    console.error("PRESIGNED ERROR:", err);
    res.status(500).json({ error: "Failed to generate URL" });
  }
});

export default router;
