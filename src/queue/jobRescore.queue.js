import { Queue } from "bullmq";
import { redis } from "./connection.js";

export const jobRescoreQueue = new Queue("job-rescore", {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: true,
  },
});
