import { normalizeSkills } from "../../constants/skills.js";

export function evaluateJobMatch({ parsedData = {}, job = {} }) {
  const resumeSkills = Array.isArray(parsedData.skills)
    ? parsedData.skills
    : [];
  const requiredSkills = Array.isArray(job.requiredSkills)
    ? job.requiredSkills
    : [];

  const skillMatch = scoreSkillMatch(resumeSkills, requiredSkills);

  return {
    matchScore: skillMatch.matchPercentage,
    matchedSkills: skillMatch.matchedSkills,
    missingSkills: skillMatch.missingSkills,
  };

  function scoreSkillMatch(resumeSkills = [], requiredSkills = []) {
    const normalizedResume = new Set(normalizeSkills(resumeSkills));
    const normalizedRequired = new Set(normalizeSkills(requiredSkills));
    if (normalizedRequired.size === 0) {
      return {
        matchPercentage: 0,
        matchedSkills: [],
        missingSkills: [],
      };
    }

    const matchedSkills = [];
    const missingSkills = [];

    for (const skill of normalizedRequired) {
      if (normalizedResume.has(skill)) {
        matchedSkills.push(skill);
      } else {
        missingSkills.push(skill);
      }
    }
    const matchPercentage = Math.round(
      (matchedSkills.length / normalizedRequired.size) * 100,
    );

    return {
      matchPercentage,
      matchedSkills,
      missingSkills,
    };
  }
}
