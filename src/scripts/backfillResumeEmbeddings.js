import prisma from "../lib/prisma.js";
import { resumeEmbeddingQueue } from "../queue/resumeEmbedding.queue.js";

async function backfillResumes() {
  const resumes = await prisma.resume.findMany({
    where: {
      embedding: {
        isEmpty: true,
      },
    },
  });

  console.log("📄 Resumes to backfill:", resumes.length);

  for (const resume of resumes) {
    console.log("➡️ Adding to queue:", resume.id);
    await resumeEmbeddingQueue.add("resumeEmbedding", {
      resumeId: resume.id,
    });
  }

  console.log("✅ Resume backfill complete");
  process.exit(0);
}

backfillResumes();
