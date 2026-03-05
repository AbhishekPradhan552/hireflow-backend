import { cosineSimilarity } from "./cosine.js";

export function computeSemanticMatch(resumeEmbedding, jobEmbedding) {
  const rawScore = cosineSimilarity(resumeEmbedding, jobEmbedding);

  //clamp cosine to safe range
  const safeRaw = Math.max(0, Math.min(1, rawScore));
  const scaledScore = Math.round(safeRaw * 100);

  return {
    rawScore: safeRaw,
    scaledScore,
  };
}
