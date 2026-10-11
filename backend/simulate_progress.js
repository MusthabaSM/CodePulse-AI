const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const job = await prisma.analysisJob.findFirst({
    orderBy: { createdAt: 'desc' }
  });

  if (job) {
    console.log(`Found job ${job.id}, current progress: ${job.progress}`);
    await prisma.analysisJob.update({
      where: { id: job.id },
      data: { 
        status: 'RUNNING',
        progress: 67 
      }
    });
    console.log(`Updated job ${job.id} to 67% (RUNNING)`);
  } else {
    console.log("No jobs found");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
