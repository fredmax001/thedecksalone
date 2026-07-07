import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { username: { contains: 'fred', mode: 'insensitive' } },
        { email: { contains: 'fred', mode: 'insensitive' } }
      ]
    },
    include: { djProfile: true }
  })
  console.log(JSON.stringify(users, null, 2))
}
main()
