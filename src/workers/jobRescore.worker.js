import { Worker } from "bullmq";
import { redis } from "../queue/connection.js";
import { rescoreJobCandidates } from "../services/job/jobRescore.service.js";

const jobRescoreWorker = new Worker(
  "job-rescore",
  async (job) => {
    const { jobId } = job.data;

    try {
      console.log(`🔄 Starting rescore for job: ${jobId} `);

      await rescoreJobCandidates(jobId);
      console.log(`✅ Rescore completed for job: ${jobId}`);
    } catch (err) {
      console.error("❌ Job rescore failed:", err.message);
      throw err; //BullMQ retry
    }
  },
  { connection: redis },
);

jobRescoreWorker.on("completed", (job) => {
  console.log(`🎯 Job rescored successfully: ${job.data.jobId}`);
});

jobRescoreWorker.on("failed", (job, err) => {
  console.error(`🚨 Job rescore failed for ${job?.data?.jobId}:`, err.message);
});
