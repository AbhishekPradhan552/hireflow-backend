import { Worker } from "bullmq";
import { redis } from "../queue/connection.js";
import prisma from "../lib/prisma.js";
import { generateEmbedding } from "../ai/embeddings/embedding.engine.js";

const worker = new Worker(
  "jobEmbeddingQueue",
  async (job) => {
    const { jobId } = job.data;

    const jobData = await prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!jobData?.description) {
      throw new Error("Job description missing");
    }

    const embedding = await generateEmbedding(jobData.description);

    await prisma.job.update({
      where: { id: jobId },
      data: {
        embedding,
        embeddingModel: "text-embedding-3-small",
        embeddingUpdatedAt: new Date(),
        aiStatus: "COMPLETED",
      },
    });
  },
  {
    connection: redis,
    concurrency: 1,
  },
);

worker.on("completed", (job) => {
  console.log(`[jobEmbeddingQueue] Job ${job.id} completed`);
});
worker.on("failed", (job, err) => {
  console.log(`[jobEmbeddingQueue] Job ${job?.id} failed`, err);
});
