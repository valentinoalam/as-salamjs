"use server"
import prisma from "@/lib/prisma";
import type { ErrorLog } from "@/app/dashboard/(default)/counter-inventori/counter-inventori-client"
import { HewanStatus, JenisProduk, Counter, PengirimanStatus, JenisHewan } from "@prisma/client"

// Helper functions for database operations
const calculateOffset = (page: number, pageSize: number, group?: string) => {
  if (group) {
    const groupIndex = group.charCodeAt(0) - 65;
    return (groupIndex * 50) + ((page - 1) * pageSize);
  }
  return (page - 1) * pageSize;
};

export async function generateHewanId(tipeId: number): Promise<string> {
  // 1. Ambil data TipeHewan
  const tipeHewan = await prisma.tipeHewan.findUnique({
    where: { id: tipeId },
    select: {
      nama: true,
      jenis: true,
      target: true
    }
  });

  if (!tipeHewan) {
    throw new Error('TipeHewan tidak ditemukan');
  }

  // 2. Hitung total hewan dengan tipe ini
  const totalHewan = await prisma.hewanQurban.count({
    where: { tipeId }
  });

  // 3. Tentukan apakah perlu grup khusus
  type SingleQurban = 'KAMBING' | 'DOMBA';
  const isSingleQurban = (jenis: JenisHewan): jenis is SingleQurban => {
    return jenis === JenisHewan.KAMBING || jenis === JenisHewan.DOMBA;
  };
  
  // Kemudian di dalam fungsi:
  const inLargeQuota =  isSingleQurban(tipeHewan.jenis) || tipeHewan.target > 100;

  // 4. Generate ID sesuai logika
  if (inLargeQuota) {
    const groupIndex = Math.floor(totalHewan / 50);
    const remainder = totalHewan % 50;
    const currentNumber = remainder + 1;
    
    const groupChar = String.fromCharCode(65 + groupIndex);
    const formattedNumber = currentNumber.toString().padStart(2, '0');
    
    return `${tipeHewan.nama}_${groupChar}-${formattedNumber}`;
  }
  
  // Untuk kasus normal (non-kambing/domba dan target ≤ 100)
  return `${tipeHewan.nama}_${totalHewan + 1}`;
}
// Get all animal types
export async function getAllTipeHewan() {
  try {
    return await prisma.tipeHewan.findMany({
      orderBy: { nama: "asc" },
    })
  } catch (error) {
    console.error("Error fetching tipe hewan:", error)
    return []
  }
}

export async function getHewanQurban(
  type: "sapi" | "domba", 
  page = 1, 
  pageSize = 10,
  group?: string,
  itemsPerGroup?: number
) {
  const tipeId = type === "sapi" ? 1 : 2
  const skip = (page - 1) * pageSize

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
      take: itemsPerGroup || pageSize,
    })
  }
  return await prisma.hewanQurban.findMany({
    where: { tipeId },
    orderBy: { createdAt: "asc" },
    skip,
    take: pageSize,
  })
}

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

  return result
}

export async function countHewanQurban(type: "sapi" | "domba") {
  const tipeId = type === "sapi" ? 1 : 2

  return await prisma.hewanQurban.count({
    where: { tipeId },
  })
}

export async function getProdukHewan(jenis?: JenisProduk) {
  if (jenis) {
    return await prisma.produkHewan.findMany({
      where: { JenisProduk: jenis },
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
        JenisProduk: {
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
          diTimbang: { increment: 1 },
          kumulatif: { increment: 1 },
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
      updateData.diTimbang = { increment: value }
      updateData.kumulatif = { increment: value }
    } else if (place === "INVENTORY") {
      updateData.diInventori = { increment: value }

      // Check if there's a discrepancy
      if (product.diInventori + value > product.diTimbang) {
        await prisma.errorLog.create({
          data: {
            produkId,
            event,
            note: `Discrepancy detected: Received (${product.diInventori + value}) > Origin (${product.diTimbang})`,
          },
        })
      }
    }
  } else if (event === "decrease") {
    if (place === "PENYEMBELIHAN") {
      updateData.diTimbang = { decrement: Math.min(value, product.diTimbang) }
    } else if (place === "INVENTORY") {
      updateData.diInventori = { decrement: Math.min(value, product.diInventori) }
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

  return updatedProduct
}

// New functions for shipping flow

export async function createShipment(products: { produkId: number; jumlah: number }[], catatan?: string) {
  // Create the shipping log
  const shipment = await prisma.logPutaranPickup.create({
    data: {
      statusPengiriman: PengirimanStatus.PENDING,
      catatan,
      daftarProdukHewan: {
        create: products.map((product) => ({
          produkId: product.produkId,
          jumlah: product.jumlah,
        })),
      },
    },
    include: {
      daftarProdukHewan: {
        include: {
          produk: true,
        },
      },
    },
  })

  // Update the product status to DIKIRIM
  await prisma.logPutaranPickup.update({
    where: { id: shipment.id },
    data: {
      statusPengiriman: PengirimanStatus.DIKIRIM,
    },
  })

  // Decrease the pkgOrigin count for each product
  for (const product of products) {
    await prisma.produkHewan.update({
      where: { id: product.produkId },
      data: {
        diTimbang: {
          decrement: product.jumlah,
        },
      },
    })

    // Add a product log entry
    await prisma.productLog.create({
      data: {
        produkId: product.produkId,
        event: "decrease",
        place: Counter.PENYEMBELIHAN,
        value: product.jumlah,
        note: `Shipped to inventory in batch #${shipment.id}`,
      },
    })
  }

  return shipment
}

export async function getPendingShipments() {
  return await prisma.logPutaranPickup.findMany({
    where: {
      statusPengiriman: PengirimanStatus.DIKIRIM,
    },
    include: {
      daftarProdukHewan: {
        include: {
          produk: {
            include: {
              tipe_hewan: true,
            },
          },
        },
      },
    },
    orderBy: {
      waktuPengiriman: "desc",
    },
  })
}

export async function getAllShipments(page = 1, pageSize = 10) {
  const skip = (page - 1) * pageSize

  return await prisma.logPutaranPickup.findMany({
    skip,
    take: pageSize,
    include: {
      daftarProdukHewan: {
        include: {
          produk: {
            include: {
              tipe_hewan: true,
            },
          },
        },
      },
    },
    orderBy: {
      waktuPengiriman: "desc",
    },
  })
}

export async function countShipments() {
  return await prisma.logPutaranPickup.count()
}

export async function receiveShipment(shipmentId: number, receivedProducts: { produkId: number; jumlah: number }[]) {
  // Get the original shipment
  const shipment = await prisma.logPutaranPickup.findUnique({
    where: { id: shipmentId },
    include: {
      daftarProdukHewan: {
        include: {
          produk: true,
        },
      },
    },
  })

  if (!shipment) {
    throw new Error(`Shipment with id ${shipmentId} not found`)
  }

  // Check for discrepancies
  const discrepancies = []

  for (const original of shipment.daftarProdukHewan) {
    const received = receivedProducts.find((p) => p.produkId === original.produkId)

    if (!received) {
      // Product was shipped but not received
      discrepancies.push({
        produkId: original.produkId,
        expected: original.jumlah,
        received: 0,
        message: `Product ${original.produk.nama} was shipped but not received`,
      })
      continue
    }

    if (received.jumlah !== original.jumlah) {
      // Quantity mismatch
      discrepancies.push({
        produkId: original.produkId,
        expected: original.jumlah,
        received: received.jumlah,
        message: `Quantity mismatch for ${original.produk.nama}: expected ${original.jumlah}, received ${received.jumlah}`,
      })
    }
  }

  // Check for extra products
  for (const received of receivedProducts) {
    const original = shipment.daftarProdukHewan.find((p) => p.produkId === received.produkId)

    if (!original) {
      // Product was received but not shipped
      discrepancies.push({
        produkId: received.produkId,
        expected: 0,
        received: received.jumlah,
        message: `Product with ID ${received.produkId} was received but not in the original shipment`,
      })
    }
  }

  // Log discrepancies
  for (const discrepancy of discrepancies) {
    await prisma.errorLog.create({
      data: {
        produkId: discrepancy.produkId,
        event: "shipment_discrepancy",
        note: `Shipment #${shipmentId}: ${discrepancy.message}`,
      },
    })
  }

  // Update the shipment status
  await prisma.logPutaranPickup.update({
    where: { id: shipmentId },
    data: {
      statusPengiriman: PengirimanStatus.DITERIMA,
      waktuDiterima: new Date(),
    },
  })

  // Add the products to inventory
  for (const product of receivedProducts) {
    await prisma.produkHewan.update({
      where: { id: product.produkId },
      data: {
        diInventori: {
          increment: product.jumlah,
        },
      },
    })

    // Add a product log entry
    await prisma.productLog.create({
      data: {
        produkId: product.produkId,
        event: "add",
        place: Counter.INVENTORY,
        value: product.jumlah,
        note: `Received from shipment #${shipmentId}`,
      },
    })
  }

  return {
    shipment,
    discrepancies,
    success: true,
  }
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
        sdhDiserahkan: { increment: numberOfPackages },
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
  const newPenerima = await prisma.penerima.create({
    data: {
      ...data,
      isDiterima: false,
    },
  })

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

  return result
}

