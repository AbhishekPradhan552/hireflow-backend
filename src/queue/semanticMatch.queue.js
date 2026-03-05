import { redis } from "./connection.js";
import { Queue } from "bullmq";

export const semanticMatchQueue = new Queue("semanticMatchQueue", {
  connection: redis,
});
