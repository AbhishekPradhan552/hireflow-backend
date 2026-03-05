import prisma from "../../lib/prisma.js";

/**
 * Recompute best resume for a candidate
 * Used when:
 * - Resume deleted
 * - Resume rescored
 * - Job updated
 */
export async function recomputeBestResume(candidateId) {
  //temporarily disabled until semantic scoring is fully active
  return;
}

/**
 * Called after resume scoring completes
 * Keeps candidate.bestScore in sync
 */
export async function updateBestResumeOnParse(resumeId, db = prisma) {
  return; //temp disable
}

/**
 * Called when resume is deleted
 */
export async function handleResumeDeleted(resumeId) {
  const resume = await prisma.resume.findUnique({
    where: { id: resumeId },
    include: { candidate: true },
  });

  if (!resume) return;

  const candidateId = resume.candidateId;
  const wasBest = resume.candidate.bestResumeId === resume.id;

  // Delete resume first
  await prisma.resume.delete({
    where: { id: resumeId },
  });

  // If it wasn't best, nothing to do
  if (!wasBest) return;

  // Recompute best resume safely
  await recomputeBestResume(candidateId);
}
