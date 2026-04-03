import { redis } from "./connection.js";
import { Queue } from "bullmq";

export const resumeEmbeddingQueue = new Queue("resumeEmbeddingQueue", {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: true,
  },
});
