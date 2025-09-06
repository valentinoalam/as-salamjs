"use server"

import prisma from "#@/lib/server/prisma.ts"

export async function getMudhohiById(id: string) {
  return await prisma.mudhohi.findUnique({
    where: { id },
    include: {
      payment: true,
      hewan: {
        include: {
          tipe: true,
        },
      },
    },
  })
}
