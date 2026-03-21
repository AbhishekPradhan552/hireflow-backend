import { groq } from "../../config/openaiClient.js";

export async function generateSummary(resumeText) {
  console.log("📡 Sending resume to Groq for summary...");

  if (!resumeText) return null;

  try {
    // Trim very long resumes to avoid token overflow
    const trimmedText = resumeText.slice(0, 6000);

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      temperature: 0.2, // more consistent output
      max_tokens: 120,

      messages: [
        {
          role: "system",
          content: `

            You are an expert technical recruiter summarizing candidate resumes.
            Your summaries should be concise, professional, and useful for hiring decisions.
            `,
        },
        {
          role: "user",
          content: `
            Write a short recruiter-style summary of the candidate.

            Rules:
            • Write  2-3 sentences.
            • Maximum 60 words total.
            • Do NOT add introductions like "Here is a summary".
            • Do NOT say "summary" or "resume".
            • Do NOT mention that this is a resume.
            • Focus on the candidate's role, key technologies, and notable experience.
            • Output ONLY the summary text.

            Candidate information:
            ${trimmedText}`,
        },
      ],
    });

    console.log("📨 Groq response received");

    const summary = completion?.choices?.[0]?.message?.content?.trim();

    return (
      summary ||
      "Candidate has relevant technical experience aligned with the job requirements."
    );
  } catch (err) {
    console.error("AI summary generation failed:", err.message);

    // fallback if API fails
    return "Candidate has relevant technical experience aligned with the job requirements.";
  }
}
