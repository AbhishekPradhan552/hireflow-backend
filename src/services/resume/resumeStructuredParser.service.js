import { KNOWN_SKILLS, normalizeSkill } from "../../constants/skills.js";

export function extractStructuredData(text) {
  return {
    email: extractEmail(text),
    phone: extractPhone(text),
    skills: extractSkills(text),
    education: extractEducation(text),
    experience: extractExperience(text),
  };
}

//helpers
function extractEmail(text) {
  const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/);
  return match?.[0] || null;
}

function extractPhone(text) {
  const match = text.match(/(\+91[-\s]?)?[6-9]\d{9}/);
  return match?.[0] || null;
}

export function extractSkills(text) {
  if (!text) return [];

  // Match tech-like tokens
  const tokens = text.toLowerCase().match(/[a-z0-9.+#/]+/g) || [];
  const normalizedTokens = tokens.map(normalizeSkill);

  const matchedSkills = normalizedTokens.filter((skill) =>
    KNOWN_SKILLS.has(skill),
  );
  return [...new Set(matchedSkills)];
}

function extractEducation(text) {
  const keywords = [
    "b.tech",
    "bachelor",
    "master",
    "degree",
    "university",
    "college",
  ];

  return text
    .split("\n")
    .filter((line) => keywords.some((k) => line.toLowerCase().includes(k)))
    .slice(0, 3)
    .map((line) => ({ raw: line.trim() }));
}

function extractExperience(text) {
  const keywords = [
    "experience",
    "developer",
    "engineer",
    "intern",
    "software",
  ];

  return text
    .split("\n")
    .filter((line) => keywords.some((k) => line.toLowerCase().includes(k)))
    .slice(0, 5)
    .map((line) => ({ raw: line.trim() }));
}
