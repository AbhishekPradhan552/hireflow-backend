import { computeSemanticMatch } from "../src/ai/matching/semantic.engine.js";
import { evaluateJobMatch } from "../src/services/resume/jobMatchEvaluator.service.js";

const job = {
  requiredSkills: ["nodejs", "postgresql", "docker", "redis"],
};

const testResumes = [
  {
    name: "Perfect Match",
    parsedData: {
      skills: ["nodejs", "postgresql", "docker", "redis"],
    },
    embeddingA: [1, 0],
    embeddingB: [1, 0],
  },
  {
    name: "Partial Match",
    parsedData: {
      skills: ["nodejs", "docker"],
    },
    embeddingA: [0.8, 0.2],
    embeddingB: [1, 0],
  },
  {
    name: "Frontend Dev",
    parsedData: {
      skills: ["react", "css"],
    },
    embeddingA: [0.2, 0.9],
    embeddingB: [1, 0],
  },
  {
    name: "Keyword Stuffing",
    parsedData: {
      skills: ["nodejs", "nodejs", "nodejs", "nodejs"],
    },
    embeddingA: [0.1, 0.9],
    embeddingB: [1, 0],
  },
  {
    name: "Empty Resume",
    parsedData: {
      skills: [],
    },
    embeddingA: [0, 0],
    embeddingB: [1, 0],
  },
];

for (const resume of testResumes) {
  const semantic = computeSemanticMatch(resume.embeddingA, resume.embeddingB);

  const jobMatch = evaluateJobMatch({
    parsedData: resume.parsedData,
    job,
  });

  console.log("\n---", resume.name, "---");
  console.log("Semantic:", semantic.scaledScore);
  console.log("Skill:", jobMatch.matchScore);
}
