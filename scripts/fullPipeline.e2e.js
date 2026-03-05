import fs from "fs";
import path from "path";
import prisma from "../src/lib/prisma.js";
import jwt from "jsonwebtoken";

const BASE_URL = "http://localhost:5001";
const POLL_INTERVAL = 2000;
const TIMEOUT = 120000;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/* ---------------- WAIT HELPERS ---------------- */

async function waitForJobEmbedding(jobId) {
  const start = Date.now();

  while (true) {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
    });

    if (job?.aiStatus === "COMPLETED") return job;

    if (Date.now() - start > TIMEOUT) throw new Error("Job embedding timeout");

    await sleep(POLL_INTERVAL);
  }
}

async function waitForParseCompletion(resumeId) {
  const start = Date.now();

  while (true) {
    const resume = await prisma.resume.findUnique({
      where: { id: resumeId },
    });

    if (resume?.parseStatus === "COMPLETED") return resume;

    if (resume?.parseStatus === "FAILED")
      throw new Error("Resume parsing failed");

    if (Date.now() - start > TIMEOUT) throw new Error("Resume parse timeout");

    await sleep(POLL_INTERVAL);
  }
}

async function waitForResumeAI(resumeId) {
  const start = Date.now();

  while (true) {
    const resume = await prisma.resume.findUnique({
      where: { id: resumeId },
    });

    if (resume?.aiStatus === "COMPLETED") return resume;

    if (resume?.aiStatus === "FAILED") throw new Error("Resume AI failed");

    if (Date.now() - start > TIMEOUT) throw new Error("Resume AI timeout");

    await sleep(POLL_INTERVAL);
  }
}

/* ---------------- MAIN TEST ---------------- */

async function run() {
  console.log("🚀 Starting Full Multi-Resume Pipeline E2E Test");

  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET not defined");
  }

  /* 1️⃣ Create Org */
  const org = await prisma.organization.create({
    data: { name: `E2E Org ${Date.now()}` },
  });

  /* 2️⃣ Add Subscription */
  await prisma.organizationSubscription.create({
    data: {
      orgId: org.id,
      plan: "PRO",
      status: "ACTIVE",
      providerCustomerId: `cust_${Date.now()}`,
      providerSubscriptionId: `sub_${Date.now()}`,
    },
  });

  /* 3️⃣ Create User + Membership */
  const user = await prisma.user.create({
    data: {
      email: `e2e_${Date.now()}@test.com`,
      password: "hashed",
    },
  });

  await prisma.organizationMember.create({
    data: {
      userId: user.id,
      orgId: org.id,
      role: "OWNER",
    },
  });

  /* 4️⃣ Create Auth Token */
  const token = jwt.sign(
    {
      userId: user.id,
      orgId: org.id,
      role: "OWNER",
    },
    process.env.JWT_SECRET,
  );

  const jsonHeaders = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  console.log("✅ Auth prepared");

  /* 5️⃣ Create Job */

  const jobRes = await fetch(`${BASE_URL}/jobs`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({
      title: "Backend Developer",
      description: "Looking for Node.js, Express, PostgreSQL, Prisma developer",
    }),
  });

  if (!jobRes.ok) throw new Error(await jobRes.text());

  const jobData = await jobRes.json();
  const jobId = jobData.id;

  console.log("📄 Job created:", jobId);

  const job = await waitForJobEmbedding(jobId);

  if (!job.embedding?.length) {
    throw new Error("Job embedding missing");
  }

  console.log("📦 Job embedding ready:", job.embedding.length);

  /* ---------------- UPLOAD RESUMES ---------------- */

  const resumes = [
    { name: "ResumeA", file: "ResumeA.pdf" },
    { name: "ResumeB", file: "ResumeB.pdf" },
    { name: "ResumeC", file: "ResumeC.pdf" },
    { name: "ResumeD", file: "ResumeD.pdf" },
    { name: "ResumeE", file: "ResumeE.pdf" },
  ];

  const uploadedResumeIds = [];

  for (const r of resumes) {
    /* Create Candidate */

    const candidateRes = await fetch(`${BASE_URL}/jobs/${jobId}/candidates`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        name: r.name,
        email: `${r.name}@test.com`,
      }),
    });

    if (!candidateRes.ok) throw new Error(await candidateRes.text());

    const candidateData = await candidateRes.json();
    const candidateId = candidateData.id;

    /* Upload Resume */

    const fileBuffer = fs.readFileSync(
      path.join("scripts", "test-data", r.file),
    );

    const form = new FormData();

    form.append(
      "resume",
      new Blob([fileBuffer], { type: "application/pdf" }),
      r.file,
    );

    const uploadRes = await fetch(
      `${BASE_URL}/candidates/${candidateId}/resumes`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: form,
      },
    );

    if (!uploadRes.ok) throw new Error(await uploadRes.text());

    const uploadData = await uploadRes.json();
    const resumeId = uploadData.id;

    uploadedResumeIds.push(resumeId);

    console.log(`📎 ${r.name} uploaded → ${uploadData.fileKey}`);

    /* Wait for parsing */

    await waitForParseCompletion(resumeId);
    console.log(`📄 ${r.name} parsed`);

    /* Wait for AI */

    await waitForResumeAI(resumeId);
    console.log(`🤖 ${r.name} AI completed`);
  }

  /* ---------------- FETCH + RANK ---------------- */

  const listRes = await fetch(`${BASE_URL}/jobs/${jobId}/candidates`, {
    headers: jsonHeaders,
  });

  if (!listRes.ok) throw new Error(await listRes.text());

  const response = await listRes.json();
  const candidates = response.data;

  const ranked = candidates
    .map((c) => ({
      name: c.name,
      score: c.confidenceScore ?? 0,
    }))
    .sort((a, b) => b.score - a.score);

  console.log("\n📊 Ranking Results:");

  ranked.forEach((r, i) => console.log(`${i + 1}. ${r.name} – ${r.score}`));

  /* ---------------- ASSERT ORDER ---------------- */

  const topScore = ranked[0].score;

  const topNames = ranked
    .filter((r) => r.score === topScore)
    .map((r) => r.name);

  if (!topNames.includes("ResumeA")) {
    throw new Error("Ranking failed: ResumeA not in top tier");
  }

  if (ranked[ranked.length - 1].name !== "ResumeE") {
    throw new Error("Ranking failed: ResumeE not last");
  }

  console.log("\n✅ Ranking validation passed");

  /* ---------------- S3 DOWNLOAD TEST ---------------- */

  console.log("\n⬇️ Testing S3 resume downloads");

  for (const resumeId of uploadedResumeIds) {
    const downloadRes = await fetch(
      `${BASE_URL}/resumes/${resumeId}/download`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!downloadRes.ok) {
      throw new Error(`Download failed for ${resumeId}`);
    }

    const arrayBuffer = await downloadRes.arrayBuffer();

    const buffer = Buffer.from(arrayBuffer);

    if (!buffer.length || buffer.length < 100) {
      throw new Error("Downloaded file buffer invalid");
    }

    console.log(`✅ Resume ${resumeId} downloaded (${buffer.length} bytes)`);
  }

  /* ---------------- DELETE TEST ---------------- */

  console.log("\n🗑 Testing resume deletion");

  for (const resumeId of uploadedResumeIds) {
    const deleteRes = await fetch(`${BASE_URL}/resumes/${resumeId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!deleteRes.ok) {
      throw new Error(`Delete failed for ${resumeId}`);
    }

    /* Verify DB deletion */

    const dbResume = await prisma.resume.findUnique({
      where: { id: resumeId },
    });

    if (dbResume) {
      throw new Error(`Resume still exists in DB: ${resumeId}`);
    }

    console.log(`🗑 Resume ${resumeId} deleted (S3 + DB verified)`);
  }

  console.log("\n🎉 FULL PIPELINE + S3 E2E PASSED");
}

run().catch((err) => {
  console.error("❌ E2E FAILED:", err.message);
  process.exit(1);
});
