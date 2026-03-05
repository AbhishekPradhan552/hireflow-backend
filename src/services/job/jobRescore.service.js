import prisma from "../../lib/prisma.js";
import { evaluateJobMatch } from "../resume/jobMatchEvaluator.service.js";
import { recomputeBestResume } from "../candidate/candidateScore.service.js";
/**
 * Rescore all resumes under a job
 * runs in controlled parallel batches
 */

export async function rescoreJobCandidates(jobId) {
  //fetch job
  const job = await prisma.job.findUnique({
    where: { id: jobId },
  });
  if (!job) {
    return;
  }

  //fetch resumes
  const resumes = await prisma.resume.findUnique({
    where: {
      candidate: { jobId },
      parseStatus: "COMPLETED",
    },
    select: {
      id: true,
      parsedData: true,
      candidateId: true,
    },
  });

  if (!resumes.length) return;

  //controlled parallel batch processing

  const BATCH_SIZE = 20;

  for (let i = 0; i < resumes.length; i += BATCH_SIZE) {
    const batch = resumes.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (resume) => {
        const parsedData = resume.parsedData ?? {};

        const jobMatch = evaluateJobMatch({
          parsedData,
          job,
        });

        await prisma.resume.update({
          where: { id: resume.id },
          data: {
            matchScore: jobMatch.matchScore,
            matchedSkills: jobMatch.matchedSkills,
            missingSkills: jobMatch.missingSkills,
          },
        });
      }),
    );
  }

  //recompute best resume per candidate

  const uniqueCandidateIds = [...new Set(resumes.map((r) => r.candidateId))];

  await Promise.all(
    uniqueCandidateIds.map((candidateId) => recomputeBestResume(candidateId)),
  );
}
