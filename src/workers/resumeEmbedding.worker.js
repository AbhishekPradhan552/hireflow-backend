import { Worker } from "bullmq";
import { redis } from "../queue/connection.js";
import prisma from "../lib/prisma.js";
import { generateEmbedding } from "../ai/embeddings/embedding.engine.js";
import { semanticMatchQueue } from "../queue/semanticMatch.queue.js";

const worker = new Worker(
  "resumeEmbeddingQueue",
  async (job) => {
    const { resumeId } = job.data;

    const resume = await prisma.resume.findUnique({
      where: { id: resumeId },
      include: {
        candidate: true,
      },
    });

    if (resume?.embedding?.length) {
      console.log("⚠️ Embedding already exists, skipping");
      return;
    }

    if (!resume?.candidate?.jobId) {
      throw new Error("Job ID missing from resume");
    }

    if (!resume?.parsedText) {
      throw new Error("Parsed Text mising");
    }
    await prisma.resume.update({
      where: { id: resumeId },
      data: { aiStatus: "EMBEDDING" },
    });
    const embedding = await generateEmbedding(resume.parsedText);

    await prisma.resume.update({
      where: { id: resumeId },
      data: {
        embedding,
        embeddingModel: "text-embedding-3-small",
        embeddingCreatedAt: new Date(),
        aiStatus: "SCORING",
      },
    });

    const jobData = await prisma.job.findUnique({
      where: { id: resume.candidate.jobId },
    });

    if (jobData?.embedding?.length) {
      semanticMatchQueue
        .add(
          "semanticMatch",
          { resumeId },
          {
            jobId: resumeId,
            attempts: 2,
            backoff: {
              type: "exponential",
              delay: 3000,
            },
            removeOnComplete: true,
            removeOnFail: true,
          },
        )
        .catch((err) => {
          console.error("Semantic queue failed:", err.message);
        });
    } else {
      console.log("⏳ Skipping match — job embedding not ready");
    }
  },
  {
    connection: redis,
    concurrency: 2,
  },
);

worker.on("completed", (job) => {
  console.log(`[resumeEmbeddingQueue] Job ${job.id} completed`);
});
worker.on("failed", (job, err) => {
  console.error(`[resumeEmbeddingQueue] Job ${job?.id} failed`, err);
});
