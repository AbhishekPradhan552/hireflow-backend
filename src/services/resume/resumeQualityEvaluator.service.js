export function evaluateResume({ parsedData = {}, parsedText = "" }) {
  const skillScore = scoreSkills(parsedData.skills);
  const experienceScore = scoreExperience(parsedData.experience);
  const qualityScore = scoreQuality(parsedData, parsedText);

  const confidenceScore = Math.min(
    skillScore + experienceScore + qualityScore,
    100,
  );
  return {
    confidenceScore,
    scoreBreakdown: {
      skillScore,
      experienceScore,
      qualityScore,
    },
  };
}

function scoreSkills(skills = []) {
  if (skills.length === 0) return 0;
  if (skills.length >= 10) return 40;
  if (skills.length >= 7) return 30;
  if (skills.length >= 4) return 20;
  return 10;
}

function scoreExperience(experience = []) {
  if (!experience || experience.length === 0) return 0;
  if (experience.length >= 3) return 30;
  return 20;
}

function scoreQuality(parsedData, text = "") {
  let score = 0;

  if (text.split(/\s+/).length > 300) score += 10;
  if (parsedData.education?.length > 0) score += 10;
  if (parsedData.skills?.length >= 5) score += 10;

  return score;
}
