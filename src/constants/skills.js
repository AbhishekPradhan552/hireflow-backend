// Skill alias dictionary for normalization
// This does NOT restrict skills.
// It only helps convert variations into a consistent format.

export const SKILL_ALIASES = {
  // JavaScript ecosystem
  "node.js": "nodejs",
  "node js": "nodejs",
  node: "nodejs",
  js: "javascript",
  "react.js": "react",
  "next.js": "nextjs",
  "next js": "nextjs",

  //frameworks
  "express.js": "express",
  nestjs: "nest",
  "vue.js": "vue",
  angularjs: "angular",
  "fastapi framework": "fastapi",

  // Databases
  postgres: "postgresql",
  postgre: "postgresql",
  mongo: "mongodb",
  "mongo db": "mongodb",

  // DevOps
  "aws cloud": "aws",
  "amazon web services": "aws",
  "docker container": "docker",
  k8s: "kubernetes",
  gcp: "google cloud",
  "azure cloud": "azure",
  "github actions": "ci/cd",
  "gitlab ci": "ci/cd",
  terraform: "infrastructure as code",

  // Languages
  py: "python",
  ts: "typescript",
};

export const KNOWN_SKILLS = new Set([
  // Backend
  "nodejs",
  "express",
  "nestjs",
  "fastify",

  // Databases
  "postgresql",
  "mysql",
  "mongodb",
  "redis",

  // ORM
  "prisma",
  "typeorm",

  // Frontend
  "react",
  "nextjs",
  "vue",
  "angular",

  // DevOps
  "docker",
  "kubernetes",
  "aws",
  "ci/cd",

  // Languages
  "javascript",
  "typescript",
  "python",
  "golang",
]);

// Normalize a single skill
export function normalizeSkill(skill = "") {
  const cleaned = skill.trim().toLowerCase();

  const normalized = SKILL_ALIASES[cleaned] || cleaned;
  return normalized.replace(/[^a-z0-9+/]/g, "");
}

// Normalize an array of skills
export function normalizeSkills(skills = []) {
  return skills.map((skill) => normalizeSkill(skill)).filter(Boolean);
}
