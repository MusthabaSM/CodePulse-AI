import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with mock data...');

  const orgId = undefined; // the backend logger said "undefined" for the user, but maybe we should just create one with "default-org" and undefined

  // Create or find repository
  const repo = await prisma.repository.create({
    data: {
      url: 'https://github.com/codepulse/demo-repo',
      owner: 'codepulse',
      name: 'demo-repo',
      organizationId: 'default-org',
      healthScore: 85.5,
      lastScannedAt: new Date(),
      lastAnalysisAt: new Date(),
    },
  });

  console.log(`Created repository: ${repo.id}`);

  // Create an analysis snapshot
  const snapshot = await prisma.analysisSnapshot.create({
    data: {
      repoId: repo.id,
      organizationId: 'default-org',
      versionLabel: 'v1.0.0',
      healthScore: 85.5,
      totalDebtHours: 120,
      maintenanceCost: 15000.0,
      riskScore: 12.5,
    },
  });

  console.log(`Created analysis snapshot: ${snapshot.id}`);
  
  // Wait, if the orgId in auth is literally string 'undefined', let's also create one for that just in case!
  const repo2 = await prisma.repository.create({
    data: {
      url: 'https://github.com/codepulse/demo-repo-undefined',
      owner: 'codepulse',
      name: 'demo-repo-undefined',
      organizationId: 'undefined',
      healthScore: 78.0,
      lastScannedAt: new Date(),
      lastAnalysisAt: new Date(),
    },
  });

  const snapshot2 = await prisma.analysisSnapshot.create({
    data: {
      repoId: repo2.id,
      organizationId: 'undefined',
      versionLabel: 'v1.1.0',
      healthScore: 78.0,
      totalDebtHours: 200,
      maintenanceCost: 25000.0,
      riskScore: 30.5,
    },
  });

  console.log(`Created snapshot for undefined org: ${snapshot2.id}`);

  console.log('Database seeding completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
