import prisma from "../lib/prisma.js";
import { normalizeSkills } from "../constants/skills.js";

export async function registerSkills(rawSkills = []) {
  const normalized = normalizeSkills(rawSkills);

  const unique = [...new Set(normalized)];

  if (!unique.length) return [];

  return prisma.$transaction(
    unique.map((name) =>
      prisma.skill.upsert({
        where: { name },
        update: {},
        create: { name },
      }),
    ),
  );
}
