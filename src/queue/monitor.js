import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";

import { resumeQueue } from "./resume.queue.js";
import { jobRescoreQueue } from "./jobRescore.queue.js";
import { resumeEmbeddingQueue } from "./resumeEmbedding.queue.js";
import { semanticMatchQueue } from "./semanticMatch.queue.js";
import { jobEmbeddingQueue } from "./jobEmbedding.queue.js";

export function setupQueueMonitor(app) {
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath("/admin/queues");

  createBullBoard({
    queues: [
      new BullMQAdapter(resumeQueue),
      new BullMQAdapter(jobRescoreQueue),
      new BullMQAdapter(resumeEmbeddingQueue),
      new BullMQAdapter(semanticMatchQueue),
      new BullMQAdapter(jobEmbeddingQueue),
    ],
    serverAdapter,
  });

  app.use("/admin/queues", serverAdapter.getRouter());
}
