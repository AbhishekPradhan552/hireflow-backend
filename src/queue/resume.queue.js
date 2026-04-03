import { Queue } from "bullmq";
import { redis } from "./connection.js";

export const resumeQueue = new Queue("resume-processing", {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: true,
  },
});
