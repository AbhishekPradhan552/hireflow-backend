import prisma from "../lib/prisma.js";
import { jobEmbeddingQueue } from "../queue/jobEmbedding.queue.js";

async function backfillJobs() {
  const jobs = await prisma.job.findMany({
    where: {
      embedding: null,
    },
  });

  console.log("🧠 Jobs to backfill:", jobs.length);

  for (const job of jobs) {
    console.log("➡️ Queueing job:", job.id);

    await jobEmbeddingQueue.add("jobEmbedding", {
      jobId: job.id,
    });
  }

  console.log("✅ Job embedding backfill complete");
  process.exit(0);
}

backfillJobs().catch((err) => {
  console.error("❌ Backfill failed:", err);
  process.exit(1);
});
