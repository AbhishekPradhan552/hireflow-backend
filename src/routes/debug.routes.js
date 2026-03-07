import express from "express";
import prisma from "../lib/prisma.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/debug/resume/:id", authMiddleware, async (req, res) => {
  try {
    const resumeId = req.params.id;
    const orgId = req.user.orgId;

    const resume = await prisma.resume.findFirst({
      where: {
        id: resumeId,
        orgId,
      },
      include: {
        candidate: {
          include: {
            job: true,
          },
        },
      },
    });

    if (!resume) {
      return res.status(404).json({ error: "Resume not found" });
    }

    return res.json({
      resume: {
        id: resume.id,
        originalName: resume.originalName,
        fileKey: resume.fileKey,
        parseStatus: resume.parseStatus,
        parsedAt: resume.parsedAt,

        semanticScore: resume.semanticScore,
        hybridScore: resume.hybridScore,
        matchScore: resume.matchScore,

        matchedSkills: resume.matchedSkills,
        missingSkills: resume.missingSkills,

        embeddingLength: resume.embedding?.length || 0,
      },

      candidate: {
        id: resume.candidate.id,
        name: resume.candidate.name,
        email: resume.candidate.email,
      },

      job: {
        id: resume.candidate.job.id,
        title: resume.candidate.job.title,
        requiredSkills: resume.candidate.job.requiredSkills,
      },

      actions: {
        download: `/resumes/${resume.id}/download`,
        delete: `/resumes/${resume.id}`,
        reparse: `/resumes/${resume.id}/reparse`,
      },
    });
  } catch (err) {
    console.error("DEBUG ROUTE ERROR:", err);
    res.status(500).json({ error: "Debug fetch failed" });
  }
});

export default router;
