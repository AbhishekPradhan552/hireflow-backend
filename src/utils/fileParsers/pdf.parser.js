import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

export async function parsePdf(buffer) {
  const data = new Uint8Array(buffer);

  const pdf = await pdfjsLib.getDocument({ data }).promise;

  let text = "";

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const strings = content.items.map((item) => item.str);
    text += strings.join(" ") + "\n";
  }

  console.log("✅ PDF parsed successfully");
  return text.trim();
}
