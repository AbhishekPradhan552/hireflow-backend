import fs from "fs";
import path from "path";
import prisma from "../../lib/prisma.js";

import { parsePdf } from "../../utils/fileParsers/pdf.parser.js";
import { parseDocx } from "../../utils/fileParsers/docx.parser.js";
import { getBufferFromS3 } from "../storage/s3.service.js";
import { extractStructuredData } from "./resumeStructuredParser.service.js";

import { resumeEmbeddingQueue } from "../../queue/resumeEmbedding.queue.js";

export async function parseResume(resumeId) {
  const resume = await prisma.resume.findUnique({
    where: { id: resumeId },
  });

  if (!resume) throw new Error("Resume not found");

  // idempotency guard
  if (
    resume.parseStatus === "PROCESSING" ||
    resume.parseStatus === "COMPLETED"
  ) {
    return;
  }

  // atomic state change
  const updated = await prisma.resume.updateMany({
    where: { id: resumeId, parseStatus: "PENDING" },
    data: { parseStatus: "PROCESSING", parseError: null },
  });

  if (updated.count === 0) return;

  try {
    const ext = path.extname(resume.originalName).toLowerCase();

    //fetch file from S3
    const buffer = await getBufferFromS3(resume.fileKey);

    if (!buffer || buffer.length === 0) {
      throw new Error("Failed to fetch resume file from S3");
    }

    let text = "";
    if (ext === ".pdf") text = await parsePdf(buffer);
    else if (ext === ".docx") text = await parseDocx(buffer);
    else throw new Error(`Unsupported file type: ${ext}`);
    if (!text || typeof text !== "string") {
      throw new Error("Resume text extraction failed");
    }

    const parsedData = extractStructuredData(text);
    //const evaluation = evaluateResume({ parsedData, parsedText: text });

    await prisma.$transaction(async (tx) => {
      await tx.resume.update({
        where: { id: resumeId },
        data: {
          parsedText: text,
          parsedData,

          confidenceScore: 80, //temp fixed score
          scoreBreakdown: {},
          parseStatus: "COMPLETED",
          parsedAt: new Date(),
        },
      });
    });

    // push to embedding queue
    await resumeEmbeddingQueue.add(
      "generateEmbedding",
      { resumeId },
      {
        jobId: `resume-embed-${resumeId}`,
        attempts: 2,
        backoff: {
          type: "exponential",
          delay: 3000,
        },
      },
    );

    return {
      text,
      parsedData,
    };
  } catch (err) {
    await prisma.resume.update({
      where: { id: resumeId },
      data: { parseStatus: "FAILED", parseError: err.message },
    });

    throw err;
  }
}
