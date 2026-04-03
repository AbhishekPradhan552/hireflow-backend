import { Worker } from "bullmq";
import { redis } from "../queue/connection.js";
import prisma from "../lib/prisma.js";
import { generateEmbedding } from "../ai/embeddings/embedding.engine.js";
import { semanticMatchQueue } from "../queue/semanticMatch.queue.js";

const worker = new Worker(
  "jobEmbeddingQueue",
  async (job) => {
    console.log("🔥 jobEmbedding worker triggered:", job.data);
    const { jobId } = job.data;

    const jobData = await prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!jobData?.description) {
      throw new Error("Job description missing");
    }

    const text = `
    ${jobData.title}
    ${jobData.description}
    ${(jobData.requiredSkills || []).join(" ")}
    `;

    const embedding = await generateEmbedding(text);

    await prisma.job.update({
      where: { id: jobId },
      data: {
        embedding,
        embeddingModel: "text-embedding-3-small",
        embeddingUpdatedAt: new Date(),
        aiStatus: "COMPLETED",
      },
    });
    console.log("✅ Job embedding completed for:", jobId);

    const resumes = await prisma.resume.findMany({
      where: {
        candidate: {
          jobId: jobId,
        },
      },
      include: {
        candidate: true,
      },
    });

    for (const resume of resumes) {
      if (resume.embedding?.length && resume.aiStatus !== "COMPLETED") {
        semanticMatchQueue
          .add(
            "semanticMatch",
            { resumeId: resume.id },
            {
              jobId: resume.id,
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
      }
    }
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
  console.error(`[jobEmbeddingQueue] Job ${job?.id} failed`, err);
});
