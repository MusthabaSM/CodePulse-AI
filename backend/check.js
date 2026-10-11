const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.organization.findUnique({where: {id: 'test-org-id'}}).then(console.log).finally(() => prisma.$disconnect());
