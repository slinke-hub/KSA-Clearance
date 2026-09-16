const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  await prisma.$executeRawUnsafe('DROP INDEX IF EXISTS saudi_tariff_catalog_embedding_idx;');
  console.log('Index dropped');
}
main().catch(console.error).finally(() => prisma.$disconnect());
