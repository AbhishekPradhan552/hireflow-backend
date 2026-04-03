import { redis } from "./connection.js";
import { Queue } from "bullmq";

export const jobEmbeddingQueue = new Queue("jobEmbeddingQueue", {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: true,
  },
});
