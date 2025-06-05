"use server"
import prisma from "@/lib/prisma";
import { HewanStatus, Counter, PengirimanStatus, type TipeHewan, type ErrorLog, JenisDistribusi, JenisProduk } from "@prisma/client"

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
              url: "/placeholder.svg?height=500&width=auto", // Your placeholder URL
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

export async function getDistribution() {
  return await prisma.distribusi.findMany({
    include: {
      penerimaList: true,
    },
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

export async function getPenerima(distribusiId?: string) {
  const includeClause = {
    distribusi: true,
    logDistribusi: {
      include: {
        listProduk: {
          include: {
            jenisProduk: true,
          },
        },
      },
    },
  };

  if (distribusiId) {
    return await prisma.penerima.findMany({
      where: { distribusiId },
      include: includeClause,
    })
  }

  return await prisma.penerima.findMany({
    include: includeClause,
  })
}

export async function getlogDistribusi() {
  return await prisma.logDistribusi.findMany({
    include: {
      penerima: {
        include: {
          distribusi: true,
        },
      },
      listProduk: {
        include: {
          jenisProduk: true,
        },
      },
    },
  })
}

export async function updateHewanStatus(
  hewanId: string,
  status: HewanStatus,
  slaughtered = false
) {
  const hewan = await prisma.hewanQurban.findUnique({
    where: { hewanId },
    include: { tipe: true },
  });

  if (!hewan) {
    throw new Error(`Hewan with hewanId ${hewanId} not found`);
  }

  // Add non-meat products when slaughtered
  if (slaughtered && !hewan.slaughtered) {
    const nonMeatProducts = await prisma.produkHewan.findMany({
      where: {
        tipeId: hewan.tipeId,
        JenisProduk: { not: "DAGING" },
      },
    });

    for (const product of nonMeatProducts) {
      await addProductLog(
        product.id,
        "menambahkan",
        Counter.PENYEMBELIHAN,
        1,
        `Auto-added from slaughter of ${hewan.tipe.nama} #${hewan.hewanId}`
      );
    }
  }

  return await prisma.hewanQurban.update({
    where: { hewanId },
    data: {
      status,
      slaughtered,
      slaughteredAt: slaughtered ? new Date() : hewan.slaughteredAt,
    },
  });
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
  event: "menambahkan" | "memindahkan" | "mengkoreksi",
  place: Counter,
  value: number,
  note: string
) {
  // Validate input values
  if (value <= 0) {
    throw new Error("Value must be greater than 0");
  }

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

  // Prepare update data
  const updateData: {
    diTimbang?: { increment?: number; set?: number };
    diInventori?: { increment?: number; set?: number };
    kumulatif?: { increment?: number };
  } = {};

  switch (event) {
    case "menambahkan":
      if (place === Counter.PENYEMBELIHAN) {
        updateData.diTimbang = { increment: value };
        updateData.kumulatif = { increment: value };
      } else if (place === Counter.INVENTORY) {
        updateData.diInventori = { increment: value };
      }
      break;

    case "memindahkan":
      if (place === Counter.PENYEMBELIHAN) {
        // Validate sufficient inventory
        if (product.diTimbang < value) {
          throw new Error(
            `Insufficient stock in PENYEMBELIHAN for product ${produkId}`
          );
        }
        updateData.diTimbang = { increment: -value };
      } else if (place === Counter.INVENTORY) {
        // Validate sufficient inventory
        if (product.diInventori < value) {
          throw new Error(
            `Insufficient stock in INVENTORY for product ${produkId}`
          );
        }
        updateData.diInventori = { increment: -value };
      }
      break;

    case "mengkoreksi":
      if (place === Counter.PENYEMBELIHAN) {
        updateData.diTimbang = { set: value };
      } else if (place === Counter.INVENTORY) {
        updateData.diInventori = { set: value };
      }
      break;

    default:
      throw new Error(`Invalid event type: ${event}`);
  }

  // Apply updates
  const updatedProduct = await prisma.produkHewan.update({
    where: { id: produkId },
    data: updateData,
  });

  // Create log
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
      catatan: catatan || null,
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
        event: "memindahkan",
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
      statusPengiriman: PengirimanStatus.PENDING,
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

export async function receiveShipment(
  shipmentId: number,
  receivedProducts: { produkId: number; jumlah: number }[]
) {
  const shipment = await prisma.logPutaranPickup.findUnique({
    where: { id: shipmentId },
    include: { daftarProdukHewan: { include: { produk: true } } },
  });

  if (!shipment) {
    throw new Error(`Shipment with id ${shipmentId} not found`);
  }

  const discrepancies = [];
  const operations = [];

  // Process each received product
  for (const received of receivedProducts) {
    const shipped = shipment.daftarProdukHewan.find(
      (p) => p.produkId === received.produkId
    );

    // Check for discrepancies
    if (!shipped) {
      discrepancies.push({
        produkId: received.produkId,
        expected: 0,
        received: received.jumlah,
        message: `Product not in original shipment`,
      });
    } else if (shipped.jumlah !== received.jumlah) {
      discrepancies.push({
        produkId: received.produkId,
        expected: shipped.jumlah,
        received: received.jumlah,
        message: `Quantity mismatch`,
      });
    }

    // Add to inventory
    operations.push(
      prisma.produkHewan.update({
        where: { id: received.produkId },
        data: { diInventori: { increment: received.jumlah } },
      })
    );

    // Create product log
    operations.push(
      prisma.productLog.create({
        data: {
          produkId: received.produkId,
          event: "menambahkan",
          place: Counter.INVENTORY,
          value: received.jumlah,
          note: `Received from shipment #${shipmentId}`,
        },
      })
    );
  }

  // Create error logs for discrepancies
  for (const d of discrepancies) {
    operations.push(
      prisma.errorLog.create({
        data: {
          produkId: d.produkId,
          event: "shipment_discrepancy",
          note: `Shipment #${shipmentId}: ${d.message} (Expected: ${d.expected}, Received: ${d.received})`,
        },
      })
    );
  }

  // Update shipment status
  operations.push(
    prisma.logPutaranPickup.update({
      where: { id: shipmentId },
      data: {
        statusPengiriman: PengirimanStatus.DITERIMA,
        waktuDiterima: new Date(),
      },
    })
  );

  // Execute all operations in a transaction
  await prisma.$transaction(operations);

  return {
    success: true,
    discrepancies: discrepancies.length > 0 ? discrepancies : undefined,
  };
}

export async function createDistribusi(data: {
  kategori: string;
  target: number;
}) {
  return await prisma.distribusi.create({
    data: {
      kategori: data.kategori,
      target: data.target,
      realisasi: 0,
    },
  });
}
export async function createPenerima(data: {
  distribusiId: string;
  nama: string;
  diterimaOleh?: string;
  noIdentitas?: string;
  alamat?: string;
  telepon?: string;
  keterangan?: string;
  jenis: JenisDistribusi;
  noKupon?: string;
}) {
  return prisma.penerima.create({
    data: {
      distribusiId: data.distribusiId,
      noKupon: data.noKupon,
      diterimaOleh: data.diterimaOleh,
      nama: data.nama,
      noIdentitas: data.noIdentitas,
      alamat: data.alamat,
      telepon: data.telepon,
      keterangan: data.keterangan,
      jenis: data.jenis,
      sudahMenerima: false,
    },
  });
}

export async function updateStatsPenerima({
  penerimaId,
  produkDistribusi,
}: {
  penerimaId: string;
  produkDistribusi: { produkId: number; jumlah: number }[];
}) {
  try {
    // Create log distribusi with product details
    const {logDistribusi, updatedPenerima} = await prisma.$transaction(async (tx) => {
      const logDistribusi = await tx.logDistribusi.create({
        data: {
          penerimaId,
          // distribusiId,
          listProduk: {
            create: produkDistribusi.map(p => ({
              jenisProdukId: p.produkId,
              jumlahPaket: p.jumlah,
            })),
          },
        },
      });

      const updatedPenerima = await tx.penerima.update({
        where: { id: penerimaId },
        data: {
          sudahMenerima: true,
          waktuTerima: new Date(),
        },
      });

      for (const produk of produkDistribusi) {
        await tx.produkHewan.update({
          where: { id: produk.produkId },
          data: { sdhDiserahkan: { increment: produk.jumlah } },
        });
      }

      await tx.distribusi.update({
        where: { id: updatedPenerima.distribusiId },
        data: { realisasi: { increment: 1 } },
      });

      return { logDistribusi, updatedPenerima };
    });


    return {logDistribusi, updatedPenerima};
    } catch (error) {
    console.error("Transaction failed:", error);
    throw new Error("Failed to complete distribusi. Please try again.");
  }
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

