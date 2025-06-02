"use server"
import prisma from "@/lib/prisma";
import type { ErrorLog } from "@/app/dashboard/(default)/counter-inventori/counter-inventori-client"
import { HewanStatus, JenisProduk, Counter, PengirimanStatus, type TipeHewan } from "@prisma/client"

// Helper functions for database operations
// const calculateOffset = (page: number, pageSize: number, group?: string) => {
//   if (group) {
//     const groupIndex = group.charCodeAt(0) - 65;
//     return (groupIndex * 50) + ((page - 1) * pageSize);
//   }
//   return (page - 1) * pageSize;
// };

// Get all animal types
type Image = {
  id: string
  url: string
  alt: string
}

interface TipeHewanWithImages extends TipeHewan {images: Image[]}

export async function getAllTipeHewan(): Promise<TipeHewanWithImages[]> {
  try {
    const tipeHewan = await prisma.tipeHewan.findMany({
      orderBy: { nama: "asc" },
    })

    // Get images for each tipe hewan
    const tipeHewanWithImages = await Promise.all(
      tipeHewan.map(async (tipe) => {
        const imagesData = await prisma.image.findMany({
          where: {
            relatedId: tipe.id.toString(),
            relatedType: "TipeHewan",
          },
          orderBy: { createdAt: "desc" },
        })
        const images = imagesData.length > 0
          ? imagesData.map(img => ({
              id: img.id || "",
              url: img.url || "",
              alt: img.alt || `${tipe.nama} image`
            }))
          : [{ // Default placeholder object
              id: "default",
              url: "/path/to/placeholder.jpg", // Your placeholder URL
              alt: `Placeholder for ${tipe.nama}`
            }];
        return {
          ...tipe,
          images
        }
      }),
    )

    return tipeHewanWithImages
  } catch (error) {
    console.error("Error fetching tipe hewan:", error)
    throw new Error("Failed to fetch tipe hewan")
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

export async function updateHewanInventoryStatus(hewanId: string, onInventory: boolean) {
  const result = await prisma.hewanQurban.update({
    where: { hewanId },
    data: {
      onInventory,
    },
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
  const result = await prisma.hewanQurban.update({
    where: { hewanId },
    data: {
      receivedByMdhohi: received,
    },
  })

  return result
}

export async function addProductLog(
  produkId: number,
  event: 'add' | 'decrease', // Restrict event type to 'add' or 'decrease'
  place: Counter,
  value: number,
  note: string,
) {
  // 1. Fetch the product with only the necessary fields
  const product = await prisma.produkHewan.findUnique({
    where: { id: produkId },
    select: {
      id: true,
      diTimbang: true,
      diInventori: true,
      kumulatif: true,
    },
  });

  if (!product) {
    throw new Error(`Product with id ${produkId} not found`);
  }

  // 2. Define the update data structure with proper types for increment/decrement
  const updateData: {
    diTimbang?: { increment?: number; decrement?: number };
    diInventori?: { increment?: number; decrement?: number };
    kumulatif?: { increment?: number; decrement?: number };
  } = {};

  // 3. Process events and prepare update data
  if (event === 'add') {
    if (place === 'PENYEMBELIHAN') {
      updateData.diTimbang = { increment: value };
      updateData.kumulatif = { increment: value };
    } else if (place === 'INVENTORY') {
      updateData.diInventori = { increment: value };

      // Log discrepancy if `diInventori` after 'add' exceeds `diTimbang`
      if (product.diInventori + value > product.diTimbang) {
        await prisma.errorLog.create({
          data: {
            produkId,
            event: 'discrepancy_add_inventory', // More specific error event
            note: `Discrepancy detected: Added to inventory (${value}), resulting in ${product.diInventori + value} which exceeds 'diTimbang' of ${product.diTimbang}.`,
          },
        });
      }
    }
  } else if (event === 'decrease') {
    if (place === 'PENYEMBELIHAN') {
      // Ensure decrement doesn't go below zero for diTimbang
      const decrementValue = Math.min(value, product.diTimbang);
      updateData.diTimbang = { decrement: decrementValue };

      // Optional: If 'kumulatif' also decreases with 'PENYEMBELIHAN' decreases
      // updateData.kumulatif = { decrement: decrementValue };
    } else if (place === 'INVENTORY') {
      // Ensure decrement doesn't go below zero for diInventori
      const decrementValue = Math.min(value, product.diInventori);
      updateData.diInventori = { decrement: decrementValue };

      // Optional: Log if an attempt to decrement below zero was made
      if (product.diInventori < value) {
        await prisma.errorLog.create({
          data: {
            produkId,
            event: 'attempt_decrease_below_zero_inventory', // More specific error event
            note: `Attempted to decrease inventory (${value}) below current stock (${product.diInventori}). Decremented by ${decrementValue}.`,
          },
        });
      }
    }
  } else {
    // Handle unexpected event types
    throw new Error(`Invalid event type: "${event}". Expected 'add' or 'decrease'.`);
  }

  // 4. Perform the product update if there are changes to apply
  // This is crucial to prevent an empty update call.
  if (Object.keys(updateData).length === 0) {
    throw new Error(`No update data generated for event "${event}" and place "${place}".`);
  }

  const updatedProduct = await prisma.produkHewan.update({
    where: { id: produkId },
    data: updateData,
  });

  // 5. Create log entry (do this after the product update for consistency)
  await prisma.productLog.create({
    data: {
      produkId,
      event,
      place,
      value,
      note,
    },
  });

  return updatedProduct;
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
        connect: produkIds.map((id: number) => ({ id })),
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

