import { Worker } from "bullmq";
import { redis } from "../queue/connection.js";
import prisma from "../lib/prisma.js";
import { parseResume } from "../services/resume/resumeParser.service.js";
import { incrementResumeUsage } from "../services/billing/usage.service.js";

const worker = new Worker(
  "resume-processing",
  async (job) => {
    const { resumeId } = job.data;
    try {
      //run full parsing lifecycle
      await parseResume(resumeId);

      // increment usage on succesful parse
      const resume = await prisma.resume.findUnique({
        where: { id: resumeId },
        select: { orgId: true, parseStatus: true },
      });
      if (resume?.orgId && resume.parseStatus === "COMPLETED") {
        await incrementResumeUsage(resume.orgId);
      }
    } catch (err) {
      console.error("Worker parse failed:", err.message);
      throw err; // allow bullMQ retry later
    }
  },
  {
    connection: redis,
    concurrency: 1,
    limiter: {
      max: 5,
      duration: 1000,
    },
  },
);
worker.on("completed", (job) => {
  console.log(`✅ Resume processed: ${job.data.resumeId}`);
});

worker.on("failed", (job, err) => {
  console.error(`❌ Resume failed: ${job.data.resumeId}`, err.message);
});
