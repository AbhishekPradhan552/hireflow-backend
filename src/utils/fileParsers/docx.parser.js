import mammoth from "mammoth";

export async function parseDocx(buffer) {
  console.log("👉 parseDocx called");

  const result = await mammoth.extractRawText({ buffer });
  console.log("✅ DOCX parsed successfully");
  return result.value.trim();
}
