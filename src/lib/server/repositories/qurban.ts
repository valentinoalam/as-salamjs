"use server"
import prisma from "#@/lib/server/prisma.ts";
import { HewanStatus, Counter, PengirimanStatus, type TipeHewan, type ErrorLog, JenisDistribusi, JenisProduk, type Kupon } from "@prisma/client"

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

/**
 * Fetches all coupon data, including related recipient information.
 * This data is used to initialize the CounterDistribusi component.
 */
export async function getCouponData() {
  try {
    const coupons = await prisma.kupon.findMany({
      orderBy: { id: 'asc' },
    })
    return coupons
  } catch (error) {
    console.error("Error fetching coupon data:", error)
    // Return an empty array or handle the error gracefully in the UI
    return []
  }
}

export async function getProdukHewan(jenis?: JenisProduk) {
  if (jenis) {
    return await prisma.produkHewan.findMany({
      where: { JenisProduk: jenis },
    })
  }

  return await prisma.produkHewan.findMany()
}
export async function getHewanQurban(
  type: "sapi" | "domba",
  page = 1,
  pageSize = 10,
  group?: string,
  itemsPerGroup = 50
) {
  const tipeId = type === "sapi" ? 1 : 2;
  const skip = (page - 1) * pageSize;
  // Handle group-specific queries
  if (group) {
    // Calculate global offset for the group
    const groupIndex = group.charCodeAt(0) - 65; // Convert A=0, B=1, etc.
    const groupStartIndex = groupIndex * itemsPerGroup;
    
    // Calculate skip/take for pagination within the group

    const take = pageSize;

    return await prisma.hewanQurban.findMany({
      where: { tipeId },
      orderBy: { createdAt: "asc" },
      skip: groupStartIndex + skip,
      take,
    });
  }

  return await prisma.hewanQurban.findMany({
    where: { tipeId },
    orderBy: { hewanId: "asc" },
    skip,
    take: pageSize,
  });
}

// Enhanced version that supports better group handling
export async function getHewanQurbanWithGroups(
  type: "sapi" | "domba",
  page = 1,
  pageSize = 10,
  group?: string,
  itemsPerGroup?: number,
  useGroups?: boolean,
  customGroups?: Array<{ id: string; name: string; itemCount: number; isActive: boolean }>
) {
  const tipeId = type === "sapi" ? 1 : 2;

  if (useGroups && customGroups && itemsPerGroup) {
    const activeGroups = customGroups.filter(g => g.isActive);
    
    if (group) {
      // Fetch specific group with pagination within that group
      const prefix = `${type}_${group}-`;
      const skipWithinGroup = (page - 1) * pageSize;
      
      return await prisma.hewanQurban.findMany({
        where: {
          tipeId,
          hewanId: {
            startsWith: prefix
          }
        },
        orderBy: { hewanId: "asc" },
        skip: skipWithinGroup,
        take: pageSize,
      });
    } else {
      // Cross-group pagination based on itemsPerGroup
      const totalItemsToSkip = (page - 1) * itemsPerGroup;
      
      // Calculate which group this page falls into
      let cumulativeCount = 0;
      let targetGroupId = null;
      let skipWithinTargetGroup = totalItemsToSkip;
      
      for (const grp of activeGroups) {
        if (totalItemsToSkip < cumulativeCount + grp.itemCount) {
          targetGroupId = grp.id;
          skipWithinTargetGroup = totalItemsToSkip - cumulativeCount;
          break;
        }
        cumulativeCount += grp.itemCount;
      }
      
      if (targetGroupId) {
        // Fetch from specific group
        const prefix = `${type}_${targetGroupId}-`;
        return await prisma.hewanQurban.findMany({
          where: {
            tipeId,
            hewanId: {
              startsWith: prefix
            }
          },
          orderBy: { hewanId: "asc" },
          skip: skipWithinTargetGroup,
          take: Math.min(itemsPerGroup, pageSize),
        });
      } else {
        // Fallback to getting items across all groups
        return await prisma.hewanQurban.findMany({
          where: { tipeId },
          orderBy: { hewanId: "asc" },
          skip: totalItemsToSkip,
          take: itemsPerGroup,
        });
      }
    }
  }

  // Standard pagination without groups
  const skip = (page - 1) * pageSize;
  
  return await prisma.hewanQurban.findMany({
    where: { tipeId },
    orderBy: { createdAt: "asc" },
    skip,
    take: pageSize,
  });
}

// Utility function to get total count for pagination
export async function getHewanQurbanCount(
  type: "sapi" | "domba",
  group?: string
) {
  const tipeId = type === "sapi" ? 1 : 2;
  
  if (group) {
    const prefix = `${type}_${group}-`;
    return await prisma.hewanQurban.count({
      where: {
        tipeId,
        hewanId: {
          startsWith: prefix
        }
      }
    });
  }
  
  return await prisma.hewanQurban.count({
    where: { tipeId }
  });
}

// Utility function to get counts for all groups
export async function getHewanQurbanCountsByGroup(
  type: "sapi" | "domba",
  customGroups: Array<{ id: string; name: string; itemCount: number; isActive: boolean }>
) {
  const tipeId = type === "sapi" ? 1 : 2;
  const activeGroups = customGroups.filter(g => g.isActive);
  
  const counts = await Promise.all(
    activeGroups.map(async (group) => {
      const prefix = `${type}_${group.id}-`;
      const count = await prisma.hewanQurban.count({
        where: {
          tipeId,
          hewanId: {
            startsWith: prefix
          }
        }
      });
      return { groupId: group.id, count };
    })
  );
  
  return counts.reduce((acc, { groupId, count }) => {
    acc[groupId] = count;
    return acc;
  }, {} as Record<string, number>);
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

export async function getPenerima(distribusiId?: string, pagination?: {page: number, pageSize: number}) {
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

  const skip = pagination? (pagination.page - 1) * pagination.pageSize : undefined
  if (distribusiId) {
    return await prisma.penerima.findMany({
      where: { distribusiId },
      include: includeClause,
      
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: pagination? pagination.pageSize : undefined,
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
        JenisHewan: hewan.tipe.jenis,
        JenisProduk: { not: "DAGING" },
      },
    });

    for (const product of nonMeatProducts) {
      await addProductLog(
        product.id,
        "menambahkan",
        Counter.TIMBANG,
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
      if (place === Counter.TIMBANG) {
        updateData.diTimbang = { increment: value };
        updateData.kumulatif = { increment: value };
      } else if (place === Counter.INVENTORY) {
        updateData.diInventori = { increment: value };
      }
      break;

    case "memindahkan":
      if (place === Counter.TIMBANG) {
        // Validate sufficient inventory
        if (product.diTimbang < value) {
          throw new Error(
            `Insufficient stock in TIMBANG for product ${produkId}`
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
      if (place === Counter.TIMBANG) {
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
  const shipment = await prisma.$transaction(async (tx) => {
    // 1. Create the shipping log
    const shipment = await tx.logPutaranPickup.create({
      data: {
        statusPengiriman: PengirimanStatus.DIKIRIM, // Assuming this maps correctly
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
            produk: true, // Include related product details if needed
          },
        },
      },
    });

    // 2. Prepare all product updates and log creations within the transaction
    // We use `Promise.all` to execute these concurrently for efficiency within the transaction
    const productOperations = products.map(async (product) => {
      // Decrease the diTimbang count for each product
      await tx.produkHewan.update({
        where: { id: product.produkId },
        data: {
          diTimbang: {
            decrement: product.jumlah,
          },
        },
      });

      // Add a product log entry
      await tx.productLog.create({
        data: {
          produkId: product.produkId,
          event: "memindahkan", // 'moved'
          place: Counter.TIMBANG, // 'slaughter counter'
          value: product.jumlah,
          // Use the `shipment.id` obtained from the first creation
          note: `Shipped to inventory in batch #${shipment.id}${
            catatan ? ` - ${catatan}` : ''
          }`,
        },
      });
    });

    // Wait for all product-related updates and log creations to complete
    await Promise.all(productOperations);

    // Return the created shipment, or whatever data is needed from the transaction
    return shipment;
  });

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
          produk: true,
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
          produk: true,
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
          diTimbang: d.expected,
          diInventori: d.received,

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
  jumlahKupon?: number; // Parameter opsional untuk jumlah kupon
}) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Buat penerima
      const penerima = await tx.penerima.create({
        data: {
          distribusiId: data.distribusiId,
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

      const assignedKupons: Kupon[] = [];

      // Jika ada jumlahKupon yang diminta, assign kupon
      if (data.jumlahKupon && data.jumlahKupon > 0) {
        // Cari kupon yang tersedia
        const availableKupons = await tx.kupon.findMany({
          where: { status: "AVAILABLE" },
          take: data.jumlahKupon,
          orderBy: { id: 'asc' }
        });

        if (availableKupons.length < data.jumlahKupon) {
          // Jika kupon tersedia tidak cukup, buat kupon baru
          const kuponToCreate = data.jumlahKupon - availableKupons.length;
          
          for (let i = 0; i < kuponToCreate; i++) {
            const newKupon = await tx.kupon.create({
              data: {
                status: 'DISTRIBUTED',
              }
            });
            assignedKupons.push(newKupon);
          }
        }

        // Update kupon yang sudah ada menjadi TERSALURKAN dan connect ke penerima
        for (const kupon of availableKupons) {
          const updatedKupon = await tx.kupon.update({
            where: { id: kupon.id },
            data: {
              status: 'DISTRIBUTED',
            }
          });
          assignedKupons.push(updatedKupon);
        }
      }

      return {
        success: true,
        penerima,
        kupons: assignedKupons,
        message: `Penerima berhasil dibuat${assignedKupons.length > 0 ? ` dengan ${assignedKupons.length} kupon` : ''}`
      };
    });

    return result;
  } catch (error) {
    console.error("Error creating penerima:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create penerima",
      penerima: null,
      kupons: []
    };
  }
}

export async function updateStatsPenerima({
  penerimaId,
  produkDistribusi,
}: {
  penerimaId: string;
  produkDistribusi: { produkId: number; jumlah: number }[];
}) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const penerima = await tx.penerima.findUnique({
        where: { id: penerimaId },
      });

      if (!penerima) {
        throw new Error("Penerima tidak ditemukan");
      }

      // Create log distribusi with product details
      const logDistribusi = await tx.logDistribusi.create({
        data: {
          penerimaId,
          listProduk: {
            create: produkDistribusi.map(p => ({
              jenisProdukId: p.produkId,
              jumlahPaket: p.jumlah,
            })),
          },
        },
      });

      // Update penerima status
      const updatedPenerima = await tx.penerima.update({
        where: { id: penerimaId },
        data: {
          sudahMenerima: true,
          waktuTerima: new Date(),
        },
      });

      // Update produk hewan statistics
      for (const produk of produkDistribusi) {
        await tx.produkHewan.update({
          where: { id: produk.produkId },
          data: { sdhDiserahkan: { increment: produk.jumlah } },
        });
      }

      // Update distribusi realisasi
      await tx.distribusi.update({
        where: { id: updatedPenerima.distribusiId },
        data: { realisasi: { increment: 1 } },
      });

      let updatedKupons: Kupon[] = [];

      // Jika penerima memiliki kupon, update status kupon
      if (penerima.jumlahKupon) {
        const availableCoupons = await tx.kupon.findMany({
          where: { status: "AVAILABLE" },
          take: penerima.jumlahKupon,
          orderBy: { id: 'asc' }
        });
        updatedKupons = await Promise.all(
          availableCoupons.map(async (kupon) => {
            // Update status kupon berdasarkan logika bisnis
            // Misalnya: jika sudah menerima, status menjadiDISTRIBUTED
            // atau bisa jadi RETURNED/NOT_BACK tergantung kondisi
            return await tx.kupon.update({
              where: { id: kupon.id },
              data: { 
                status: 'DISTRIBUTED' // atau status lain sesuai kebutuhan
              }
            });
          })
        );
      }

      return { 
        logDistribusi, 
        updatedPenerima,
        updatedKupons,
        message: `Distribusi berhasil dicatat${updatedKupons.length > 0 ? ` dan ${updatedKupons.length} kupon diupdate` : ''}`
      };
    });

    return result;
  } catch (error) {
    console.error("Transaction failed:", error);
    throw new Error("Failed to complete distribusi. Please try again.");
  }
}

// Fungsi helper untuk mendapatkan informasi kupon penerima
export async function getPenerimaKuponInfo(penerimaId: string) {
  try {
    const penerima = await prisma.penerima.findUnique({
      where: { id: penerimaId },
      select: {
        nama: true,
        jumlahKupon: true,
        sudah_terima_kupon: true
      }
    });

    if (!penerima) {
      return { success: false, error: "Penerima tidak ditemukan" };
    }

    return {
      success: true,
      penerima: penerima.nama,
      totalKupon: penerima.jumlahKupon,
    };
  } catch (error) {
    console.error("Error getting penerima kupon info:", error);
    return { 
      success: false, 
      error: "Failed to get kupon information" 
    };
  }
}

export async function getErrorLogs(): Promise<ErrorLog[]> {
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
  const result = await prisma.errorLog.update({
    where: { id },
    data: { note },
  })

  return result
}

