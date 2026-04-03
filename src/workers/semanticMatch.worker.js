import { Worker } from "bullmq";
import { redis } from "../queue/connection.js";
import prisma from "../lib/prisma.js";
import { computeSemanticMatch } from "../ai/matching/semantic.engine.js";
import { evaluateJobMatch } from "../services/resume/jobMatchEvaluator.service.js";
import { generateSummary } from "../ai/resume/generateSummary.js";

const worker = new Worker(
  "semanticMatchQueue",
  async (job) => {
    const { resumeId } = job.data;

    const resume = await prisma.resume.findUnique({
      where: { id: resumeId },
      include: {
        candidate: {
          include: { job: true },
        },
      },
    });

    if (resume?.aiStatus === "COMPLETED") {
      console.log("⚠️ Already processed, skipping:", resumeId);
      return;
    }

    // ✅ Resume embedding must exist (critical)
    if (!resume?.embedding?.length) {
      throw new Error("Resume embedding missing");
    }

    if (!resume?.candidate?.job?.embedding?.length) {
      console.warn("⏳ Job embedding not ready, retrying...");
      throw new Error("JOB_EMBEDDING_NOT_READY");
    }

    await prisma.resume.update({
      where: { id: resumeId },
      data: { aiStatus: "SCORING" },
    });

    const { rawScore, scaledScore } = computeSemanticMatch(
      resume.embedding,
      resume.candidate.job.embedding,
    );

    console.log("========== DEBUG SKILL CHECK ==========");
    console.log("Resume ID:", resumeId);
    console.log("RESUME SKILLS:", resume.parsedData?.skills);
    console.log("JOB REQUIRED:", resume.candidate.job?.requiredSkills);
    console.log("=======================================");

    //skill match
    const jobMatch = evaluateJobMatch({
      parsedData: resume.parsedData ?? {},
      job: resume.candidate.job ?? {},
    });

    const skillScore = Number(jobMatch?.matchScore ?? 0);
    const semanticScore = Number(scaledScore ?? 0);

    // clamp scores between 0 and 100

    const safeSkillScore = Math.max(0, Math.min(100, skillScore));
    const safeSemanticScore = Math.max(0, Math.min(100, semanticScore));

    const jobRequiredSkills = resume?.candidate?.job?.requiredSkills ?? [];

    // smart hybrid score logic

    let hybridScore;

    //  No structured skills → semantic fallback
    if (!Array.isArray(jobRequiredSkills) || jobRequiredSkills.length === 0) {
      hybridScore = safeSemanticScore;
    } else {
      const skillCoverage = jobRequiredSkills.length;

      let skillWeight;
      let semanticWeight;

      if (skillCoverage >= 6) {
        skillWeight = 0.35;
        semanticWeight = 0.65;
      } else if (skillCoverage >= 3) {
        skillWeight = 0.25;
        semanticWeight = 0.75;
      } else {
        skillWeight = 0.15;
        semanticWeight = 0.85;
      }

      hybridScore = Math.round(
        safeSemanticScore * semanticWeight + safeSkillScore * skillWeight,
      );

      // Anti keyword stuffing protection
      if (safeSkillScore === 100 && safeSemanticScore < 40) {
        hybridScore = safeSemanticScore;
      }
    }

    //final clamp
    hybridScore = Math.max(0, Math.min(100, hybridScore));

    console.log("DEBUG SCORES:", {
      resumeId,
      semanticScore,
      skillScore,
      hybridScore,
    });

    // Generate AI summary
    let aiSummary = null;

    try {
      console.log("RESUME FULL OBJECT:", Object.keys(resume));
      console.log("RESUME TEXT VALUE:", resume.parsedText);
      if (resume.parsedText) {
        console.log("🧠 Generating AI summary for resume:", resumeId);
        aiSummary = await generateSummary(resume.parsedText);
        console.log("✅ AI summary generated:", aiSummary);
      }
    } catch (err) {
      console.error("AI summary generation failed:", err.message);
    }

    await prisma.resume.update({
      where: { id: resumeId },
      data: {
        semanticRawScore: rawScore,
        semanticScore,
        matchScore: skillScore,
        matchedSkills: jobMatch.matchedSkills ?? [],
        missingSkills: jobMatch.missingSkills ?? [],
        hybridScore,
        aiSummary,
        aiStatus: "COMPLETED",
        parseStatus: "COMPLETED",
        aiProcessedAt: new Date(),
      },
    });

    //update candidate aggregate score
    const candidate = await prisma.candidate.findUnique({
      where: { id: resume.candidateId },
      select: {
        bestScore: true,
      },
    });
    if (candidate?.bestScore == null || hybridScore > candidate.bestScore) {
      await prisma.candidate.update({
        where: { id: resume.candidateId },
        data: {
          bestScore: hybridScore,
          bestResumeId: resume.id,
        },
      });
    }
  },
  {
    connection: redis,
    concurrency: 2,
    defaultJobOptions: {
      attempts: 2,
      backoff: {
        type: "exponential",
        delay: 3000,
      },
    },
  },
);

worker.on("completed", (job) => {
  console.log(`[semanticMatchQueue] Job ${job.id} completed`);
});
worker.on("failed", (job, err) => {
  console.error(`[semanticMatchQueue] Job ${job.id} failed`, err);
});
