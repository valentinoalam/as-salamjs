import { PrismaClient } from "@prisma/client"
const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma || new PrismaClient({
  transactionOptions: {
    maxWait: 10000,     // time to wait for transaction to acquire a connection
    timeout: 10000      // total time for interactive transaction
  }
})

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

export default prisma