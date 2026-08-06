const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const djs = await prisma.djProfile.findMany({ select: { id: true, stageName: true, verificationStatus: true, verified: true, idDocumentUrl: true } });
  console.log(JSON.stringify(djs, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
