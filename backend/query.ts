import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const repos = await prisma.repository.findMany();
  console.log(repos);
}
main();
