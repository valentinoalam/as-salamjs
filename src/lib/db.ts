import type { ErrorLog } from "@/app/dashboard/counter-inventori/counter-inventori-client"
import { PrismaClient, type HewanStatus, jenisProduk, Counter } from "@prisma/client"
import { revalidatePath } from "next/cache"


const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma || new PrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

export default prisma

// Socket emitter function
const emitSocketEvent = (eventName: string, data: any) => {
  console.log("oh")
  try {
    // Get socket from global context if available
    // This is a workaround since we can't use hooks in non-React functions
    if (typeof window !== "undefined" && (window as any).__SOCKET_INSTANCE__) {
      const socket = (window as any).__SOCKET_INSTANCE__
      console.log(socket)
      socket.emit(eventName, data)

    }
  } catch (error) {
    console.error(`Socket error in ${eventName}:`, error)
  }
}

// Helper functions for database operations
const calculateOffset = (page: number, pageSize: number, group?: string) => {
  if (group) {
    const groupIndex = group.charCodeAt(0) - 65;
    return (groupIndex * 50) + ((page - 1) * pageSize);
  }
  return (page - 1) * pageSize;
};

export async function getHewanQurban(
  type: "sapi" | "domba", 
  page = 1, 
  pageSize = 10,
  group?: string,
  itemsPerGroup?: number
) {
  const tipeId = type === "sapi" ? 1 : 2
  const skip = (page - 1) * pageSize
  console.log(group)
  if(group) {
    const prefix = `${type}_${group}-`;
    return await prisma.hewanQurban.findMany({
      where: { 
        tipeId, 
        hewanId: {
        startsWith: prefix
      }
      },
      orderBy: { hewanId: "asc" },
      skip,
      take: pageSize,
    })
  }
  return await prisma.hewanQurban.findMany({
    where: { tipeId },
    orderBy: { createdAt: "asc" },
    skip,
    take: pageSize,
  })
}

// export async function getInventory() {
//   return await prisma.inventory.findMany()
// }

// export async function getTimbang() {
//   return await prisma.hasilTimbang.findMany()
// }

// export async function getProgresSapi() {
//   return await prisma.progresSapi.findMany({
//     orderBy: { id: "asc" },
//   })
// }

// export async function getProgresDomba() {
//   return await prisma.progresDomba.findMany({
//     orderBy: { id: "asc" },
//   })
// }

// export async function insertHistoryTimbang(hasil_timbang_id: number, operation: string, value: number) {
//   // First update the hasil_timbang record
//   const hasilTimbang = await prisma.hasilTimbang.findUnique({
//     where: { id: hasil_timbang_id },
//   })

//   if (!hasilTimbang) {
//     throw new Error(`HasilTimbang with id ${hasil_timbang_id} not found`)
//   }

//   let newValue = hasilTimbang.hasil
//   if (operation === "add") {
//     newValue += value
//   } else if (operation === "decrease") {
//     newValue = Math.max(0, newValue - value)
//   }

//   await prisma.hasilTimbang.update({
//     where: { id: hasil_timbang_id },
//     data: { hasil: newValue },
//   })

//   // Then create the history record
//   const result = await prisma.timbangHistory.create({
//     data: {
//       hasil_timbang_id,
//       operation,
//       value,
//     },
//   })

//   // Emit socket event with the updated data
//   const updatedData = await getTimbang()
//   emitSocketEvent("hasil-timbang-updated", updatedData)

//   return result
// }

// export async function insertHistoryInventori(inventory_id: number, operation: string, value: number) {
//   // First update the inventory record
//   const inventory = await prisma.inventory.findUnique({
//     where: { id: inventory_id },
//   })

//   if (!inventory) {
//     throw new Error(`Inventory with id ${inventory_id} not found`)
//   }

//   let newValue = inventory.hasil
//   if (operation === "add") {
//     newValue += value
//   } else if (operation === "decrease") {
//     newValue = Math.max(0, newValue - value)
//   }

//   await prisma.inventory.update({
//     where: { id: inventory_id },
//     data: { hasil: newValue },
//   })

//   // Then create the history record
//   const result = await prisma.inventoryHistory.create({
//     data: {
//       inventory_id,
//       operation,
//       value,
//     },
//   })

//   // Emit socket event with the updated data
//   const updatedData = await getInventory()
//   emitSocketEvent("inventory-updated", updatedData)

//   return result
// }

export async function updateHewanInventoryStatus(hewanId: string, onInventory: any) {
  const result = await prisma.hewanQurban.update({
    where: { hewanId },
    data: {
      onInventory,
    },
  })

  // Get animal type for emitting the correct event
  const animal = await prisma.hewanQurban.findUnique({
    where: { hewanId },
    select: { tipeId: true },
  })

  if (animal) {
    try{
      // Emit socket event for the specific animal
      emitSocketEvent("hewan-updated", {
        hewanId,
        onInventory,
        tipeId: animal.tipeId,
      })

      // Also emit updated data for the animal type
      const type = animal.tipeId === 1 ? "sapi" : "domba"
      const updatedData = await getHewanQurban(type)
      emitSocketEvent(`${type}-data-updated`, updatedData)
    } catch (error) {
      console.error("Socket error in updateHewanInventoryStatus:", error)
    }
  }

  return result
}

export async function countHewanQurban(type: "sapi" | "domba") {
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
export async function updateHewanStatus(hewanId: string, status: HewanStatus, slaughtered = false) {
  const hewan = await prisma.hewanQurban.findUnique({
    where: { hewanId },
    include: { tipe: true },
  })

  if (!hewan) {
    throw new Error(`Hewan with hewanId ${hewanId} not found`)
  }

  // If animal is being slaughtered, automatically add non-meat products
  if (slaughtered && !hewan.slaughtered) {
    // Get non-meat products for this animal type
    const nonMeatProducts = await prisma.produkHewan.findMany({
      where: {
        tipeId: hewan.tipeId,
        jenisProduk: {
          not: "DAGING",
        },
      },
    })

    // Add one of each non-meat product to inventory
    for (const product of nonMeatProducts) {
      await prisma.productLog.create({
        data: {
          produkId: product.id,
          event: "add",
          place: "PENYEMBELIHAN",
          value: 1,
          note: `Auto-added from slaughter of ${hewan.tipe.nama} #${hewan.hewanId}`,
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

  const result = await prisma.hewanQurban.update({
    where: { hewanId },
    data: {
      status,
      slaughtered,
      slaughteredAt: slaughtered ? new Date() : hewan.slaughteredAt,
    },
  })

  // Emit socket event
  // try {
  //   console.log("sock")
  //   // Emit socket event for the specific animal
  //   emitSocketEvent("hewan-updated", {
  //     hewanId,
  //     status,
  //     slaughtered,
  //     tipeId: hewan.tipeId,
  //   })
      
  //   // Also emit updated data for the animal type
  //   const type = hewan.tipeId === 1 ? "sapi" : "domba"
  //   const updatedData = await getHewanQurban(type)
  //   emitSocketEvent(`${type}-data-updated`, updatedData)
    
  //   // If products were added, emit product updates
  //   if (slaughtered && !hewan.slaughtered) {
  //     const products = await getProdukHewan()
  //     emitSocketEvent("products-updated", products)
  //   }
  // } catch (error) {
  //   console.error("Socket error in updateHewanStatus:", error)
  // }

  return result
}

export async function updateMudhohiReceived(hewanId: string, received: boolean) {
  const hewan = await prisma.hewanQurban.findUnique({
    where: { hewanId },
    select: { tipeId: true }
  })

  const result = await prisma.hewanQurban.update({
    where: { hewanId },
    data: {
      receivedByMdhohi: received,
    },
  })

  // Emit socket event
  try {
    // Emit socket event for the specific animal
    emitSocketEvent("hewan-updated", {
      hewanId,
      receivedByMdhohi: received,
      tipeId: hewan?.tipeId,
    })

    // Also emit updated data for the animal type
    if (hewan) {
      const type = hewan.tipeId === 1 ? "sapi" : "domba"
      const updatedData = await getHewanQurban(type)
      emitSocketEvent(`${type}-data-updated`, updatedData)
    }
  } catch (error) {
    console.error("Socket error in updateMudhohiReceived:", error)
  }

  return result
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
    if (place === "PENYEMBELIHAN") {
      updateData.pkgOrigin = { increment: value }
    } else if (place === "INVENTORY") {
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
    if (place === "PENYEMBELIHAN") {
      updateData.pkgOrigin = { decrement: Math.min(value, product.pkgOrigin) }
    } else if (place === "INVENTORY") {
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
  const updatedProduct = await prisma.produkHewan.update({
    where: { id: produkId },
    data: updateData,
  })

  // Emit socket event
  try {
    // Emit product update
    emitSocketEvent("product-updated", updatedProduct)

    // Emit all products update
    const products = await getProdukHewan()
    emitSocketEvent("products-updated", products)

    // If there was a discrepancy, emit error logs update
    if (event === "add" && place === "INVENTORY" && product.pkgReceived + value > product.pkgOrigin) {
      const errorLogs = await getErrorLogs()
      emitSocketEvent("error-logs-updated", errorLogs)
    }
  } catch (error) {
    console.error("Socket error in addProductLog:", error)
  }

  return updatedProduct
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
        connect: produkIds.map((id: any) => ({ id })),
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

  // Emit socket events
  try {
    // Emit distribusi log update
    const allDistribusiLogs = await getDistribusiLog()
    emitSocketEvent("distribusi-logs-updated", allDistribusiLogs)

    // Emit products update
    const products = await getProdukHewan()
    emitSocketEvent("products-updated", products)

    // Emit penerima update
    const allPenerima = await getPenerima()
    emitSocketEvent("penerima-updated", allPenerima)

    // Emit distribution update
    const distributions = await getDistribution()
    emitSocketEvent("distributions-updated", distributions)
  } catch (error) {
    console.error("Socket error in createDistribusi:", error)
  }

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
  const newPenerima = await prisma.penerima.create({
    data: {
      ...data,
      isDiterima: false,
    },
  })

  // Emit socket event
  try {
   // Emit penerima update
    const allPenerima = await getPenerima()
    emitSocketEvent("penerima-updated", allPenerima)

    // Emit distribution update
    const distributions = await getDistribution()
    emitSocketEvent("distributions-updated", distributions)
  } catch (error) {
    console.error("Socket error in createPenerima:", error)
  }

  return newPenerima
}

export async function getErrorLogs(): Promise<ErrorLog[]> {
  return await prisma.errorLog.findMany({
    include: {
      produk: {
        include: {
          tipe_hewan: true
        }
      },
    },
    orderBy: {
      timestamp: "desc",
    },
  })
}

export async function updateErrorLogNote(id: number, note: string) {
  const result = await prisma.errorLog.update({
    where: { id },
    data: { note },
  })

  // Emit socket event
  try {
    // Emit socket event with the updated data
    const errorLogs = await getErrorLogs()
    emitSocketEvent("error-logs-updated", errorLogs)
  } catch (error) {
    console.error("Socket error in updateErrorLogNote:", error)
  }

  return result
}

