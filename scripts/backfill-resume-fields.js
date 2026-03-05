import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("Starting resume fields backfill...");

  const resumes = await prisma.resume.findMany({
    where: {
      OR: [{ originalName: null }, { filePath: null }],
    },
  });

  console.log(`Found ${resumes.length} resumes to backfill`);

  for (const resume of resumes) {
    await prisma.resume.update({
      where: { id: resume.id },
      data: {
        originalName: resume.originalName ?? resume.fileName,
        filePath: resume.filePath ?? resume.fileUrl,
      },
    });

    console.log(`Backfilled resume ${resume.id}`);
  }
  console.log("Resume backfill complete.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
