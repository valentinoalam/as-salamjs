import { PrismaClient, type HewanStatus, jenisProduk, Counter } from "@prisma/client"

const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma || new PrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

export default prisma

// Helper functions for database operations

export async function getHewanQurban(type: "sapi" | "kambing", page = 1, pageSize = 10) {
  const tipeId = type === "sapi" ? 1 : 2
  const skip = (page - 1) * pageSize

  return await prisma.hewanQurban.findMany({
    where: { tipeId },
    orderBy: { animalId: "asc" },
    skip,
    take: pageSize,
  })
}

export async function countHewanQurban(type: "sapi" | "kambing") {
  const tipeId = type === "sapi" ? 1 : 2

  return await prisma.hewanQurban.count({
    where: { tipeId },
  })
}

export async function getProdukHewan(jenis?: jenisProduk) {
  if (jenis) {
    return await prisma.produkHewan.findMany({
      where: { jenisProduk: jenis },
      include: { tipe_hewan: true },
    })
  }

  return await prisma.produkHewan.findMany({
    include: { tipe_hewan: true },
  })
}

export async function getDistribution() {
  return await prisma.distribution.findMany({
    include: {
      Penerima: true,
    },
  })
}

export async function getPenerima(distributionId?: string) {
  if (distributionId) {
    return await prisma.penerima.findMany({
      where: { distributionId },
      include: {
        category: true,
        DistribusiLog: {
          include: {
            produkQurban: true,
          },
        },
      },
    })
  }

  return await prisma.penerima.findMany({
    include: {
      category: true,
      DistribusiLog: {
        include: {
          produkQurban: true,
        },
      },
    },
  })
}

export async function getDistribusiLog() {
  return await prisma.distribusiLog.findMany({
    include: {
      penerima: {
        include: {
          category: true,
        },
      },
      produkQurban: true,
    },
  })
}

export async function getMudhohi(page = 1, pageSize = 10) {
  const skip = (page - 1) * pageSize

  return await prisma.mudhohi.findMany({
    skip,
    take: pageSize,
    include: {
      hewan: true,
      payment: true,
    },
  })
}

export async function countMudhohi() {
  return await prisma.mudhohi.count()
}

export async function updateHewanStatus(animalId: number, status: HewanStatus, slaughtered = false) {
  const hewan = await prisma.hewanQurban.findUnique({
    where: { animalId },
    include: { tipe: true },
  })

  if (!hewan) {
    throw new Error(`Hewan with animalId ${animalId} not found`)
  }

  // If animal is being slaughtered, automatically add non-meat products
  if (slaughtered && !hewan.slaughtered) {
    // Get non-meat products for this animal type
    const nonMeatProducts = await prisma.produkHewan.findMany({
      where: {
        tipeId: hewan.tipeId,
        jenisProduk: {
          not: jenisProduk.DAGING,
        },
      },
    })

    // Add one of each non-meat product to inventory
    for (const product of nonMeatProducts) {
      await prisma.productLog.create({
        data: {
          produkId: product.id,
          event: "add",
          place: Counter.PENYEMBELIHAN,
          value: 1,
          note: `Auto-added from slaughter of ${hewan.tipe.nama} #${hewan.animalId}`,
        },
      })

      await prisma.produkHewan.update({
        where: { id: product.id },
        data: {
          pkgOrigin: { increment: 1 },
        },
      })
    }
  }

  return await prisma.hewanQurban.update({
    where: { animalId },
    data: {
      status,
      slaughtered,
      slaughteredAt: slaughtered ? new Date() : hewan.slaughteredAt,
    },
  })
}

export async function updateMudhohiReceived(animalId: number, received: boolean) {
  return await prisma.hewanQurban.update({
    where: { animalId },
    data: {
      receivedByMdhohi: received,
    },
  })
}

export async function addProductLog(produkId: number, event: string, place: Counter, value: number, note: string) {
  const product = await prisma.produkHewan.findUnique({
    where: { id: produkId },
  })

  if (!product) {
    throw new Error(`Product with id ${produkId} not found`)
  }

  // Update product counts based on event and place
  const updateData: any = {}

  if (event === "add") {
    if (place === Counter.PENYEMBELIHAN) {
      updateData.pkgOrigin = { increment: value }
    } else if (place === Counter.INVENTORY) {
      updateData.pkgReceived = { increment: value }

      // Check if there's a discrepancy
      if (product.pkgReceived + value > product.pkgOrigin) {
        await prisma.errorLog.create({
          data: {
            produkId,
            event,
            note: `Discrepancy detected: Received (${product.pkgReceived + value}) > Origin (${product.pkgOrigin})`,
          },
        })
      }
    }
  } else if (event === "decrease") {
    if (place === Counter.PENYEMBELIHAN) {
      updateData.pkgOrigin = { decrement: Math.min(value, product.pkgOrigin) }
    } else if (place === Counter.INVENTORY) {
      updateData.pkgReceived = { decrement: Math.min(value, product.pkgReceived) }
    }
  }

  // Create log entry
  await prisma.productLog.create({
    data: {
      produkId,
      event,
      place,
      value,
      note,
    },
  })

  // Update product
  return await prisma.produkHewan.update({
    where: { id: produkId },
    data: updateData,
  })
}

export async function createDistribusi(penerimaId: string, produkIds: number[], numberOfPackages: number) {
  // Check if penerima exists
  const penerima = await prisma.penerima.findUnique({
    where: { id: penerimaId },
  })

  if (!penerima) {
    throw new Error(`Penerima with id ${penerimaId} not found`)
  }

  // Create distribusi log
  const distribusiLog = await prisma.distribusiLog.create({
    data: {
      penerimaId,
      numberOfPackages,
      produkQurban: {
        connect: produkIds.map((id) => ({ id })),
      },
    },
  })

  // Update product delivered count
  for (const produkId of produkIds) {
    await prisma.produkHewan.update({
      where: { id: produkId },
      data: {
        pkgDelivered: { increment: numberOfPackages },
      },
    })
  }

  // Update distribution realized count
  await prisma.distribution.update({
    where: { id: penerima.distributionId },
    data: {
      realized: { increment: 1 },
    },
  })

  // Update penerima
  await prisma.penerima.update({
    where: { id: penerimaId },
    data: {
      isDiterima: true,
      receivedAt: new Date(),
    },
  })

  return distribusiLog
}

export async function createPenerima(data: {
  distributionId: string
  noKupon?: string
  receivedBy?: string
  institusi?: string
  noKk?: string
  alamat?: string
  phone?: string
  keterangan?: string
}) {
  return await prisma.penerima.create({
    data: {
      ...data,
      isDiterima: false,
    },
  })
}

export async function getErrorLogs() {
  return await prisma.errorLog.findMany({
    include: {
      produk: true,
    },
    orderBy: {
      timestamp: "desc",
    },
  })
}

export async function updateErrorLogNote(id: number, note: string) {
  return await prisma.errorLog.update({
    where: { id },
    data: { note },
  })
}

export async function getInventory() {
  return await prisma.inventory.findMany()
}

export async function getTimbang() {
  return await prisma.hasilTimbang.findMany()
}

export async function getProgresSapi() {
  return await prisma.progresSapi.findMany({
    orderBy: { id: "asc" },
  })
}

export async function getProgresKambing() {
  return await prisma.progresKambing.findMany({
    orderBy: { id: "asc" },
  })
}

export async function updateSembelih(id: number, sembelih: boolean, type: "sapi" | "kambing") {
  if (type === "sapi") {
    return await prisma.progresSapi.update({
      where: { id },
      data: { sembelih },
    })
  } else {
    return await prisma.progresKambing.update({
      where: { id },
      data: { sembelih },
    })
  }
}

export async function insertHistoryTimbang(hasil_timbang_id: number, operation: string, value: number) {
  // First update the hasil_timbang record
  const hasilTimbang = await prisma.hasilTimbang.findUnique({
    where: { id: hasil_timbang_id },
  })

  if (!hasilTimbang) {
    throw new Error(`HasilTimbang with id ${hasil_timbang_id} not found`)
  }

  let newValue = hasilTimbang.hasil
  if (operation === "add") {
    newValue += value
  } else if (operation === "decrease") {
    newValue = Math.max(0, newValue - value)
  }

  await prisma.hasilTimbang.update({
    where: { id: hasil_timbang_id },
    data: { hasil: newValue },
  })

  // Then create the history record
  return await prisma.timbangHistory.create({
    data: {
      hasil_timbang_id,
      operation,
      value,
    },
  })
}

export async function insertHistoryInventori(inventory_id: number, operation: string, value: number) {
  // First update the inventory record
  const inventory = await prisma.inventory.findUnique({
    where: { id: inventory_id },
  })

  if (!inventory) {
    throw new Error(`Inventory with id ${inventory_id} not found`)
  }

  let newValue = inventory.hasil
  if (operation === "add") {
    newValue += value
  } else if (operation === "decrease") {
    newValue = Math.max(0, newValue - value)
  }

  await prisma.inventory.update({
    where: { id: inventory_id },
    data: { hasil: newValue },
  })

  // Then create the history record
  return await prisma.inventoryHistory.create({
    data: {
      inventory_id,
      operation,
      value,
    },
  })
}
