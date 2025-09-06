/* eslint-disable @typescript-eslint/no-explicit-any */
'use server'
import prisma from "#@/lib/server/prisma.ts"
import { CaraBayar, JenisDistribusi, PaymentStatus } from "@prisma/client"
import { differenceInDays, format, startOfDay, subDays } from "date-fns"
import moment from "moment-hijri"
import "moment/locale/id"
import { getPaymentStatusFromAmount } from "@/lib/zod/qurban-form"
import { revalidatePath } from "next/cache"
import { MudhohiEditSchema } from "@/lib/zod/mudhohi"
import type z from "zod"
import { mapToMudhohiInputData, type TipeHewanInputDTO } from "#@/lib/DTOs/mudhohi.ts"
import { generateQRCodeToFile } from "#@/lib/server/services/qr-code.ts"
import { getPaymentInstructions, sendOrderConfirmationEmail } from "#@/lib/server/services/email.ts"
import { HIJRI_MONTH_MAP } from "#@/lib/server/services/date.ts"
import { generateDashCode, generateHewanId } from "#@/lib/server/services/id.ts"


export async function mapToHewanQurbanSchema(
  data:{
    tipe: TipeHewanInputDTO; 
    totalHewan: number; 
    jumlahHewan: number; 
    isKolektif: boolean; 
    keterangan: string
  }, tx: any) {
  const { tipe, totalHewan, jumlahHewan, isKolektif, keterangan } = data

  const hewanRecords = []

  if (isKolektif) {
    let remainingQuantity = jumlahHewan
    while (remainingQuantity > 0) {
      // Find existing kolektif HewanQurban with available slots for the same tipe
      const existingKolektif = await tx.hewanQurban.findFirst({
        where: {
          tipeId: tipe.id,
          isKolektif: true,
          slotTersisa: { gt: 0 }
        },
        orderBy: { slotTersisa: 'desc' } // Prioritize hewan with more available slots
      })
      if (existingKolektif && existingKolektif.slotTersisa) {
        // Use existing kolektif hewan
        const slotsToUse = Math.min(remainingQuantity, existingKolektif.slotTersisa)

        hewanRecords.push({
          isExisting: true,
          id: existingKolektif.id,
          quantity: slotsToUse
        })

        remainingQuantity -= slotsToUse
      } else {
        // Create new kolektif hewan
        const slotsToUse = Math.min(remainingQuantity, 7) // Max 7 slots for kolektif
        hewanRecords.push({
          isExisting: false,
          data: {
            tipeId: tipe.id,
            hewanId: await generateHewanId(tipe, totalHewan, 0),
            isKolektif: true,
            slotTersisa: 7 - slotsToUse, // 7 total slots minus used slots
            keterangan: keterangan || null,
          },
          quantity: slotsToUse
        })

        remainingQuantity -= slotsToUse
      }
    }
  } else {
    // Individual hewan (not kolektif) - create one HewanQurban for each quantity
    for (let i = 0; i < jumlahHewan; i++) {
      hewanRecords.push({
        isExisting: false,
        data: {
          tipeId: tipe.id,
          hewanId: await generateHewanId(tipe!, totalHewan!, i),
          isKolektif: false,
          slotTersisa: null, // Individual hewan don't have slots
          keterangan: keterangan || null,
        },
        quantity: 1
      })
    }
  }

  return hewanRecords
}

export async function getTipeHewan() {
  return await prisma.tipeHewan.findMany({
    orderBy: { id: "asc" },
  })
}

export async function processSheetData(rows: any[], headers: string[], userId: string) {
  let successCount = 0
  let failedCount = 0
  const processedData = []
  
  for (const row of rows) {
    try {
      // Skip empty rows
      if (!row[0] || row.every((cell: any) => !cell)) {
        continue
      }
      
      // Create a data object from row values
      const rowData: Record<string, any> = {}
      headers.forEach((header, index) => {
        if (row[index] !== undefined) {
          rowData[header] = row[index]
        }
      })
      
      // Map Google Sheets data to create mudhohi data structure
      const mudhohiInputData = await mapToMudhohiInputData(rowData, userId)
      
      // Use the same transaction logic as createMudhohi
      const result = await prisma.$transaction(async (tx) => {
        // 1. Handle user creation/update (same as createMudhohi)
        let user = null;
        let isNewUser = false;

        // 1a. Prioritas 1: Cari berdasarkan userId (jika user sudah login)
        if (mudhohiInputData.userId) {
          user = await tx.user.findUnique({
            where: { id: mudhohiInputData.userId },
          });
        }

        // 1b. Prioritas 2: Jika belum ditemukan, cari berdasarkan accountProviderId
        if (!user && mudhohiInputData.accountProvider && mudhohiInputData.accountProviderId) {
          const account = await tx.account.findUnique({
            where: {
              provider_providerAccountId: {
                provider: mudhohiInputData.accountProvider,
                providerAccountId: mudhohiInputData.accountProviderId,
              },
            },
            include: { user: true },
          });
          if (account) {
            user = account.user;
            user = await tx.user.update({
              where: { id: user.id },
              data: {
                email: mudhohiInputData.email,
                name: mudhohiInputData.nama_pengqurban,
                phone: mudhohiInputData.phone || user.phone,
              },
            });
          }
        }

        // 1c. Prioritas 3: Jika belum ditemukan, cari berdasarkan email atau nama
        if (!user) {
          user = await tx.user.findFirst({
            where: {
              OR: [{ email: mudhohiInputData.email }, { name: mudhohiInputData.nama_pengqurban }],
            },
          });
        }

        // 1d. Jika user ditemukan, update datanya
        if (user) {
          user = await tx.user.update({
            where: { id: user.id },
            data: {
              ...(mudhohiInputData.email && { email: mudhohiInputData.email }),
              ...(mudhohiInputData.phone && { phone: mudhohiInputData.phone }),
              ...(user.name === null && mudhohiInputData.nama_pengqurban && { name: mudhohiInputData.nama_pengqurban }),
            },
          });

          // Handle account linking if needed
          if (mudhohiInputData.accountProvider && mudhohiInputData.accountProviderId) {
            const existingAccount = await tx.account.findUnique({
              where: {
                provider_providerAccountId: {
                  provider: mudhohiInputData.accountProvider,
                  providerAccountId: mudhohiInputData.accountProviderId,
                },
              },
            });
            if (!existingAccount) {
              await tx.account.create({
                data: {
                  userId: user.id,
                  type: 'oauth',
                  provider: mudhohiInputData.accountProvider,
                  providerAccountId: mudhohiInputData.accountProviderId,
                },
              });
            }
          }
        }
        // 1e. Jika user belum ditemukan, buat user baru
        else {
          isNewUser = true;
          user = await tx.user.create({
            data: {
              email: mudhohiInputData.email,
              name: mudhohiInputData.nama_pengqurban,
              phone: mudhohiInputData.phone,
              password: "password123",
            },
          });

          // Create account if needed
          if (mudhohiInputData.accountProvider && mudhohiInputData.accountProviderId) {
            await tx.account.create({
              data: {
                userId: user.id,
                type: 'oauth',
                provider: mudhohiInputData.accountProvider,
                providerAccountId: mudhohiInputData.accountProviderId,
              },
            });
          }
        }

        if (!user?.id) {
          throw new Error("Gagal membuat atau menemukan user.");
        }

        // 2. Get and validate tipe hewan
        const tipeHewan = await tx.tipeHewan.findUnique({
          where: { id: mudhohiInputData.tipeHewanId },
          select: {
            id: true,
            nama: true,
            jenis: true,
            target: true,
            harga: true,
            hargaKolektif: true,
            _count: {
              select: {
                hewan: true
              }
            }
          }
        });

        if (!tipeHewan) {
          throw new Error("Tipe hewan tidak ditemukan");
        }

        const isKolektif = mudhohiInputData.isKolektif;
        const quantity = mudhohiInputData.quantity || 1;
        const totalHewan = tipeHewan._count.hewan;
        const unitPrice = isKolektif ? (tipeHewan.hargaKolektif || tipeHewan.harga) : tipeHewan.harga;
        const totalAmount = unitPrice * quantity;

        // 3. Handle animal allocation using existing mapToHewanQurbanSchema
        const hewanQurbanData = await mapToHewanQurbanSchema({
          tipe:tipeHewan,
          isKolektif,
          totalHewan,
          jumlahHewan: totalHewan, 
          keterangan: mudhohiInputData.keterangan}, tx);
        
        const hewanData = [];
        // if (isKolektif) {
        //   const kolektifHewan = await findOrCreateKolektifHewan(tipeHewan, quantity, tx);
        //   hewanData.push({
        //     tipeId: mudhohiInputData.tipeHewanId,
        //     hewanId: kolektifHewan.hewanId,
        //     isKolektif: true,
        //     slotTersisa: Math.max(0, Number(kolektifHewan.slotTersisa) - quantity),
        //     kolektifParentId: kolektifHewan.id,
        //     keterangan: mudhohiInputData.keterangan || null
        //   });
        // } else {
        //   for (let i = 0; i < quantity; i++) {
        //     const newHewanId = await generateHewanId(tipeHewan, totalHewan, i);
        //     hewanData.push({
        //       tipeId: mudhohiInputData.tipeHewanId,
        //       hewanId: newHewanId,
        //       isKolektif: false,
        //       keterangan: mudhohiInputData.keterangan || null
        //     });
        //   }
        // }
        for (const hewanRecord of hewanQurbanData) {
          if (!hewanRecord.isExisting && hewanRecord.data) {
            // Add new hewan data for creation
            hewanData.push({
              tipeId: hewanRecord.data.tipeId,
              hewanId: hewanRecord.data?.hewanId,
              isKolektif: hewanRecord.data?.isKolektif,
              slotTersisa: hewanRecord.data?.slotTersisa,
              keterangan: hewanRecord.data?.keterangan,
              tipe: {
                connect: {
                  id: hewanRecord.data?.tipeId // Connect to the existing TipeHewan
                }
              }
            });
          } else {           // For existing kolektif animals, we'll handle them after mudhohi creation
            continue;
          }
        }
        // 4. Create or get Mudhohi distribution category
        const distribusiMudhohi = await tx.distribusi.upsert({
          where: { kategori: "Mudhohi" },
          update: {
            target: { increment: 1 },
            realisasi: { increment: 1 }
          },
          create: {
            kategori: "Mudhohi",
            target: 1,
            realisasi: 1,
          }
        });

        // 6. Prepare payment data
        const paymentData = {
          cara_bayar: mudhohiInputData.cara_bayar,
          paymentStatus: mudhohiInputData.paymentStatus || PaymentStatus.BELUM_BAYAR,
          urlTandaBukti: mudhohiInputData?.urlTandaBukti || null,
          dibayarkan: mudhohiInputData.dibayarkan || 0,
          kodeResi: mudhohiInputData.kodeResi || null,
          quantity: quantity,
          isKolektif: isKolektif,
          totalAmount: totalAmount,
          tipeid: mudhohiInputData.tipeHewanId
        };

        // 7. Create mudhohi record
        const mudhohi = await tx.mudhohi.create({
          data: {
            userId: user.id,
            year: new Date().getFullYear(),
            nama_pengqurban: mudhohiInputData.nama_pengqurban,
            nama_peruntukan: mudhohiInputData.nama_peruntukan || null,
            pesan_khusus: mudhohiInputData.pesan_khusus || null,
            keterangan: mudhohiInputData.keterangan || null,
            potong_sendiri: mudhohiInputData.potong_sendiri,
            ambil_daging: mudhohiInputData.ambil_daging,
            dash_code: await generateDashCode(),
            payment: {
              create: paymentData
            },
            sudah_terima_kupon: mudhohiInputData.cara_bayar === CaraBayar.TUNAI? true : false,
            jatahPengqurban: {
              create: {
                distribusiId: distribusiMudhohi.id,
                nama: mudhohiInputData.nama_pengqurban,
                jenis: "INDIVIDU" as JenisDistribusi,
                sudahMenerima: false,
                jumlahKupon: 2
              }
            },
            hewan: !isKolektif ? {
              create: hewanData
              }
            : undefined
          }, 
          include: {
            jatahPengqurban: true,
            hewan: true
          }
        });

        // 7a. Handle existing kolektif animals (connect and update slots)
        for (const hewanRecord of hewanQurbanData) {
          if (hewanRecord.isExisting) {
            await tx.hewanQurban.update({
              where: { id: hewanRecord.id },
              data: {
                slotTersisa: { decrement: hewanRecord.quantity },
                mudhohi: { connect: { id: mudhohi.id } }
              }
            });
          }
        }

        // 8. Generate QR Code
        const qrFilePath = `./public/qr-codes/${mudhohi.dash_code}.png`;
        const qrcode_url = await generateQRCodeToFile(mudhohi, qrFilePath);
        await tx.mudhohi.update({
          where: { id: mudhohi.id },
          data: {
            qrcode_url
          }
        });

        // 9. Determine selected products
        let selectedProdukIds: number[] = [];
        if (mudhohiInputData.jatahPengqurban && mudhohiInputData.jatahPengqurban.length > 0) {
          const validProducts = await tx.produkHewan.findMany({
            where: {
              id: { in: mudhohiInputData.jatahPengqurban },
              JenisHewan: tipeHewan.jenis
            }
          });
          
          if (validProducts.length !== mudhohiInputData.jatahPengqurban.length) {
            throw new Error("Some selected products don't match the animal type");
          }
          
          selectedProdukIds = mudhohiInputData.jatahPengqurban.slice(0, 2);
        } else {
          const availableProducts = await tx.produkHewan.findMany({
            where: { JenisHewan: tipeHewan.jenis },
            take: 2
          });
          selectedProdukIds = availableProducts.map(p => p.id);
        }

        // 10. Create LogDistribusi for the mudhohi
        const logDistribusi = await tx.logDistribusi.create({
          data: {
            penerimaId: mudhohi.jatahPengqurban[0].id,
          }
        });

        // 11. Handle product distribution based on animal type
        const isKambing = tipeHewan.jenis === 'KAMBING';
        const isDomba = tipeHewan.jenis === 'DOMBA';
        const jatahDagingKolektif = 2;
        
        if (isKolektif) {
          const existing = await tx.produkHewan.findFirst({
            where: {
              nama: {
                contains: 'daging',
              },
              JenisHewan: tipeHewan.jenis
            },
          });

          let daging;
          if (existing) {
            daging = existing;
          } else {
            daging = await tx.produkHewan.create({
              data: {
                nama: 'Kaki Belakang',
                JenisHewan: tipeHewan.jenis,
                JenisProduk: 'KAKI',
              },
            });
          }

          await tx.produkDiterima.create({
            data: {
              logDistribusiId: logDistribusi.id,
              jenisProdukId: daging.id,
              jumlahPaket: quantity * jatahDagingKolektif,
            },
          });
        } else if (isKambing || isDomba) {
          const animalType = isKambing ? 'KAMBING' : 'DOMBA';
          const kakiBelakang = await tx.produkHewan.upsert({
            where: { 
              nama: 'Kaki Belakang',
              JenisHewan: animalType,
              JenisProduk: "KAKI"
            },
            create: {
              nama: 'Kaki Belakang',
              JenisHewan: animalType,
              JenisProduk: "KAKI"
            },
            update: {}
          });

          await tx.produkDiterima.create({
            data: {
              logDistribusiId: logDistribusi.id,
              jenisProdukId: kakiBelakang.id,
              jumlahPaket: quantity,
            }
          });
        } else {
          for (const produkId of selectedProdukIds) {
            await tx.produkDiterima.create({
              data: {
                logDistribusiId: logDistribusi.id,
                jenisProdukId: produkId,
                jumlahPaket: quantity,
              }
            });
          }
        }

        // 12. Allocate 2 free coupons to mudhohi
        const availableCoupons = await tx.kupon.findMany({
          where: { status: "AVAILABLE" },
          take: 2,
          orderBy: { id: 'asc' }
        });
        const allocatedCoupons = [];

        if (availableCoupons.length === 2) {
          for (const coupon of availableCoupons) {
            const updated = await tx.kupon.update({
              where: { id: coupon.id },
              data: {
                status: mudhohiInputData.cara_bayar === "TUNAI" ? "DISTRIBUTED" : "AVAILABLE",
              }
            });
            allocatedCoupons.push(updated);
          }
        } else if (availableCoupons.length === 1) {
          const updated = await tx.kupon.update({
            where: { id: availableCoupons[0].id },
            data: {
              status: mudhohiInputData.cara_bayar === "TUNAI" ? "DISTRIBUTED" : "AVAILABLE",
            }
          });
          allocatedCoupons.push(updated);

          const created = await tx.kupon.create({
            data: {
              status: mudhohiInputData.cara_bayar === "TUNAI" ? "DISTRIBUTED" : "AVAILABLE",
            }
          });
          allocatedCoupons.push(created);
        } else {
          for (let i = 0; i < 2; i++) {
            const created = await tx.kupon.create({
              data: {
                status: mudhohiInputData.cara_bayar === "TUNAI" ? "DISTRIBUTED" : "AVAILABLE",
              }
            });
            allocatedCoupons.push(created);
          }
        }

        // 13. Update product inventory tracking
        for (const produkId of selectedProdukIds) {
          await tx.produkHewan.update({
            where: { id: produkId },
            data: {
              targetPaket: { increment: quantity },
            }
          });
        }

        return {
          success: true,
          error: "",
          data: {
            ...mudhohi,
            hewan: hewanData,
            payment: paymentData,
            user,
            isNewUser,
            logDistribusi: logDistribusi,
            selectedProducts: selectedProdukIds
          },
          kupon: allocatedCoupons
        };
      });

      // Send confirmation email (similar to createMudhohi)
      if (result.success) {
        const mudhohi = result.data;
        await sendOrderConfirmationEmail(
          mudhohi.user.email!,
          {
            orderId: mudhohi.id,
            dashCode: mudhohi.dash_code,
            qrcode_url: mudhohi.qrcode_url,
            namaPengqurban: mudhohi.nama_pengqurban,
            totalAmount: mudhohi.payment.totalAmount,
            paymentStatus: mudhohi.payment.paymentStatus,
            paymentInstructions: getPaymentInstructions(mudhohiInputData.cara_bayar),
          },
          mudhohi.isNewUser,
          !!mudhohiInputData.accountProvider
        );
      }

      processedData.push(result)
      successCount++
    } catch (error) {
      console.error(`Error processing row:`, error)
      failedCount++
    }
  }

  return {
    success: successCount,
    failed: failedCount,
    data: processedData,
  }
}

export async function mudhohiReceivedKupon(mudhohiId: string) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Find up to 2 available coupons.
      //    Ordering by ID ensures a consistent selection if multiple concurrent
      //    requests are trying to get coupons.
      const existingAvailableCoupons = await tx.kupon.findMany({
        where: { status: "AVAILABLE" },
        take: 2, // Limit to 2 coupons
        orderBy: { id: 'asc' } // Ensure consistent selection
      });

      // Calculate how many new coupons need to be created to reach a total of 2.
      const couponsToCreateCount = 2 - existingAvailableCoupons.length;
      let newlyCreatedCoupons: string | any[] = [];

      // 2. If fewer than 2 coupons are available, create the missing ones.
      if (couponsToCreateCount > 0) {
        const createPromises = [];
        for (let i = 0; i < couponsToCreateCount; i++) {
          createPromises.push(tx.kupon.create({
            data: { status: 'AVAILABLE' } // New coupons are created with 'AVAILABLE' status
          }));
        }
        // Wait for all new coupons to be created.
        newlyCreatedCoupons = await Promise.all(createPromises);
        console.log(`Created ${newlyCreatedCoupons.length} new coupons.`);
      }

      // 3. Combine the existing available coupons and any newly created coupons.
      //    This array now contains exactly 2 coupons that need to be distributed.
      const allCouponsToDistribute = [...existingAvailableCoupons, ...newlyCreatedCoupons];

      // 4. Extract the IDs of all coupons that need to be updated.
      const couponIdsToUpdate = allCouponsToDistribute.map(kupon => kupon.id);

      // 5. Update the status of all these coupons to 'DISTRIBUTED' (Distributed).
      //    Using `updateMany` is more efficient than individual `update` calls.
      const updatedResult = await tx.kupon.updateMany({
        where: {
          id: {
            in: couponIdsToUpdate // Update only the coupons we specifically identified
          }
        },
        data: {
          status: 'DISTRIBUTED'
        }
      });
      await tx.mudhohi.update({
        where:{ id: mudhohiId },
        data: {
          sudah_terima_kupon: true
        }
      })
      console.log(`Updated status for ${updatedResult.count} coupons to 'DISTRIBUTED'.`);
      // Return relevant information about the operation.
      return {
        success: true, 
        message: `${updatedResult.count} kupon berhasil diubah menjadi TERSALURKAN`,
        kupons: couponIdsToUpdate 
        // totalCouponsProcessed: allCouponsToDistribute.length,
        // updatedCount: updatedResult.count,
        // distributedCouponIds: couponIdsToUpdate,
        // If you need the full updated coupon objects, you could fetch them again here,
        // or reconstruct them from `allCouponsToDistribute` with the new status.
        // e.g., actualDistributedCoupons: await tx.kupon.findMany({ where: { id: { in: couponIdsToUpdate } } })
      };

    });


    return result;
  } catch (error) {
    console.error("Error updating kupon status:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to update kupon status",
      kupons: []
    };
  }
}

export async function updateMudhohi(id: string, data: z.infer<typeof MudhohiEditSchema>) {
  // Validate incoming data
  const validatedData = MudhohiEditSchema.parse(data);

  try {
    const updatedMudhohi = await prisma.mudhohi.update({
      where: { id },
      data: validatedData,
    });

    return {success:true, updatedMudhohi, error:""};
  } catch (error) {
    console.error('Failed to update Mudhohi:', error);
    throw error;
  }
}

export async function getMudhohiStats() {
  const totalMudhohi = await prisma.mudhohi.count()
  const totalHewan = await prisma.hewanQurban.count({
    where: {
      mudhohi: {
        some: {},
      },
    },
  })

  // Count by payment status
  const belumBayar = await prisma.pembayaran.count({
    where: { paymentStatus: PaymentStatus.BELUM_BAYAR },
  })
  const menungguKonfirmasi = await prisma.pembayaran.count({
    where: { paymentStatus: PaymentStatus.MENUNGGU_KONFIRMASI },
  })
  const lunas = await prisma.pembayaran.count({
    where: { paymentStatus: PaymentStatus.LUNAS },
  })
  const batal = await prisma.pembayaran.count({
    where: { paymentStatus: PaymentStatus.BATAL },
  })

  return {
    totalMudhohi,
    totalHewan,
    statusCounts: {
      BELUM_BAYAR: belumBayar,
      MENUNGGU_KONFIRMASI: menungguKonfirmasi,
      LUNAS: lunas,
      BATAL: batal,
    },
  }
}

export async function countMudhohi() {
  return await prisma.mudhohi.count()
}

export async function getMudhohi(page = 1, pageSize = 10, status?: PaymentStatus, searchTerm?: string) {
  const skip = (page - 1) * pageSize
  // Build where clause
  const where: any = {}
  
  if (status) {
    where.payment = { paymentStatus: status }
  }
  
  if (searchTerm) {
    where.OR = [
      { nama_pengqurban: { contains: searchTerm, mode: 'insensitive' } },
      { nama_peruntukan: { contains: searchTerm, mode: 'insensitive' } },
      { dash_code: { contains: searchTerm, mode: 'insensitive' } },
      { payment: { kodeResi: { contains: searchTerm, mode: 'insensitive' } } }
    ]
  }
  return await prisma.mudhohi.findMany({
    where,
    skip,
    take: pageSize,
    include: {
      hewan: {
        include: {
          tipe: true
        },
      },
      jatahPengqurban: true,
      payment: true,
      // user: true,
    },
    orderBy:  { nama_pengqurban: "asc" },
  })
}

export async function getMudhohiList(status?: PaymentStatus, searchTerm?: string) {
  const where: any = {}

  if (status) {
    where.payment = {
      paymentStatus: status,
    }
  }

  if (searchTerm) {
    where.OR = [
      { nama_pengqurban: { contains: searchTerm } },
      { nama_peruntukan: { contains: searchTerm } },
      { dash_code: { contains: searchTerm } },
      { user: { email: { contains: searchTerm } } },
    ]
  }

  return await prisma.mudhohi.findMany({
    where,
    include: {
      payment: true,
      hewan: {
        include: {
          tipe: true,
        },
      },
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  })
}

export async function updatePaymentDetails(
  mudhohiId: string,
  dibayarkan: number,
  kodeResi?: string
) {
  try {
    // Get the current mudhohi data to calculate total amount
    const mudhohi = await prisma.mudhohi.findUnique({
      where: { id: mudhohiId },
      include: {
        hewan: {
          include: { tipe: true }
        },
        payment: true,
        _count: { select: { hewan: true } }
      },
    });

    if (!mudhohi) {
      return { success: false, error: "Data mudhohi tidak ditemukan" };
    }

    const hewan = mudhohi.hewan;
    if (hewan.length === 0) {
      return { success: false, error: "Data hewan tidak ditemukan" };
    }

    const { tipe, isKolektif } = hewan[0];
    const count = mudhohi._count.hewan;
    const hargaPerEkor = isKolektif ? tipe.hargaKolektif! : tipe.harga;
    const totalAmount = hargaPerEkor * count;

    // Determine status based on the new payment amount
    const finalStatus = getPaymentStatusFromAmount(dibayarkan, totalAmount);

    await prisma.pembayaran.update({
      where: { mudhohiId },
      data: {
        paymentStatus: finalStatus,
        kodeResi: kodeResi || undefined,
        dibayarkan: dibayarkan,
      },
    });
    
    revalidatePath("/mudhohi")
    revalidatePath("/dashboard/mudhohi")

    return { success: true }
  } catch (error) {
    console.error("Error updating payment details:", error)
    return { success: false, error: "Gagal mengupdate detail pembayaran" }
  }
}

export async function updatePaymentStatus(
  mudhohiId: string,
  paymentData: {  
    status?: PaymentStatus,
    kodeResi?: string,
    dibayarkan?: number,
    caraBayar: CaraBayar
    isVerification?: boolean
  }
) {
  const { status, kodeResi, dibayarkan, caraBayar } = paymentData;
  try {
    // Get the current mudhohi data to calculate total amount
    const mudhohi = await prisma.mudhohi.findUnique({
      where: { id: mudhohiId },
      include: {
        hewan: {
          include: { tipe: true }
        },
        payment: true,
        _count: { select: { hewan: true } }
      },
    });

    if (!mudhohi) {
      return { success: false, error: "Data mudhohi tidak ditemukan" };
    }

    const hewan = mudhohi.hewan;
    if (hewan.length === 0) {
      return { success: false, error: "Data hewan tidak ditemukan" };
    }

    const { tipe, isKolektif } = hewan[0];
    const count = mudhohi._count.hewan;
    const hargaPerEkor = isKolektif ? tipe.hargaKolektif! : tipe.harga;
    const totalAmount = hargaPerEkor * count;

     // Determine payment status based on different scenarios
    let newStatus = status;
    let newAmount = dibayarkan;
    const newKodeResi = kodeResi;

    // Scenario 1: Payment verification (mark as waiting confirmation)
    if (paymentData.isVerification) {
      newStatus = PaymentStatus.MENUNGGU_KONFIRMASI;
    }
    // Scenario 2: Payment confirmation (mark as paid)
    else if (paymentData.status === PaymentStatus.LUNAS) {
      newStatus = PaymentStatus.LUNAS;
    }
    // Scenario 3: Automatic status calculation based on amount
    else if (dibayarkan !== undefined) {
      // Ambil nilai pembayaran sebelumnya dan tambahkan yang baru jika ada
      const existingPaid = mudhohi.payment?.dibayarkan || 0;

      const totalPaid = existingPaid + dibayarkan;
      
      newStatus = getPaymentStatusFromAmount(totalPaid, totalAmount);
      newAmount = totalPaid;
    }

    // Use existing values if not provided in update
    const finalAmount = newAmount !== undefined ? newAmount : mudhohi.payment?.dibayarkan || 0;
    const finalKodeResi = newKodeResi || mudhohi.payment?.kodeResi || null;
    
    // For verification, keep existing amount if not provided
    const verifiedAmount = paymentData.isVerification && paymentData.dibayarkan === undefined
      ? mudhohi.payment?.dibayarkan || 0
      : finalAmount;

     // Update payment record
    const updatedData = await prisma.pembayaran.upsert({
      where: { mudhohiId },
      update: {
        paymentStatus: newStatus,
        kodeResi: finalKodeResi || kodeResi || undefined,
        dibayarkan: verifiedAmount,
        updatedAt: new Date(),
      },
      create: {
        mudhohiId,
        paymentStatus: newStatus || PaymentStatus.BELUM_BAYAR,
        kodeResi: finalKodeResi,
        dibayarkan: verifiedAmount,
        cara_bayar: caraBayar
      },
    });

    revalidatePath("/mudhohi")
    revalidatePath("/dashboard/mudhohi")

    return { success: true, data: updatedData }
  } catch (error) {
    console.error("Error updating payment status:", error)
    return { success: false, error: "Gagal mengupdate status pembayaran" }
  }
}

export async function getMudhohiProgress() {
  const date = moment().iYear(); // Get current Hijri year
  const hijriDate = moment(`${date}-12-10`, 'iYYYY-iMM-iDD');
  const day = hijriDate.toDate(); // Convert to JavaScript Date
  const startDate = subDays(startOfDay(day), 20);

  const mudhohiRecords = await prisma.mudhohi.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lt: day
      }
    },
    select: {
      createdAt: true
    }
  });

  const grouped: { [key: string]: number } = {};

  mudhohiRecords.forEach(record => {
    const daysAgo = differenceInDays(day, record.createdAt);
    const bucket = Math.floor((20 - daysAgo) / 2); // 2-day intervals
    const bucketStart = subDays(day, 20 - bucket * 2);
    const dateKey = format(bucketStart, 'yyyy-MM-dd');

    grouped[dateKey] = (grouped[dateKey] || 0) + 1;
  });
  moment.locale('id');
  const result = Object.entries(grouped)
    .map(([date, total]) => ({ date, total }))
    .sort((a, b) => new Date(a.date).getTime()  - new Date(b.date).getTime() )
    .map(({ date, total }) => {
      const hijri = moment(date);
      const rawMonth = hijri.format('iMMMM');
      const day = hijri.format('iD');
      const mappedMonth = HIJRI_MONTH_MAP[rawMonth] || rawMonth;

      return {
        date: `${day} ${mappedMonth}`,
        total,
      };
    });
  return result; // Added return statement
}


// New functions for mudhohi collection management
export async function getMudhohiByResi(kodeResi: string) {
  // Find the Pembayaran (Payment) record that matches the kodeResi
  const paymentRecord = await prisma.pembayaran.findUnique({
    where: {
      kodeResi: kodeResi,
    },
    include: {
      // Include the related Mudhohi record
      mudhohi: {
        include: {
          // Then include its related animals and their types
          hewan: {
            include: {
              tipe: true,
            },
          },
          payment: true,
        },
      },
    },
  });

  // If a payment record was found, return its associated mudhohi.
  // Otherwise, return null.
  return paymentRecord?.mudhohi || null;
}

export async function getMudhohiByName(nama: string) {
  return await prisma.mudhohi.findMany({
    where: {
      nama_pengqurban: {
        contains: nama,
        // mode: "insensitive",
      },
    },
    include: {
      hewan: {
        include: {
          tipe: true,
        },
      },
      payment: true,
    },
  })
}

export async function getMudhohiByHewanCode(kodeHewan: string) {
  // First, find the HewanQurban entries that match the kodeHewan
  // We need to use `hewanId` on the HewanQurban model, not `kodeHewan` directly on Mudhohi.
  // The `mode: "insensitive"` will only work if your database provider supports it (e.g., PostgreSQL).
  // If you are using MySQL/MariaDB/SQL Server, it's likely case-insensitive by default,
  // and 'mode' might not be a valid property as discussed previously.
  // I'm keeping it here for now assuming PostgreSQL or MongoDB.

  const hewanQurban = await prisma.hewanQurban.findMany({
    where: {
      hewanId: {
        contains: kodeHewan, // Searching for the string kodeHewan within HewanQurban.hewanId
        // If 'mode' causes a TypeScript error, remove it if your DB is case-insensitive by default.
        // mode: "insensitive",
      },
    },
    // We need to include the Mudhohi relation to get the associated Mudhohi records
    include: {
      mudhohi: {
        include: {
          payment: true, // Include payment for each mudhohi
          // You don't need to include 'hewan' here again as it's the primary object you're searching
        },
      },
      tipe: true, // Include the animal type
    },
  });

  // Now, extract all unique Mudhohi records from the found HewanQurban entries
  const mudhohiResults: any[] = []; // Use a more specific type if possible
  const seenMudhohiIds = new Set<string>();

  hewanQurban.forEach((hewan) => {
    hewan.mudhohi.forEach((mudhohi) => {
      if (!seenMudhohiIds.has(mudhohi.id)) {
        // Attach the found animal info to the mudhohi for convenience if needed
        // Or simply push the mudhohi as requested by the function name
        mudhohiResults.push({
          ...mudhohi,
          hewan: hewan, // Attach the animal that matched the code
        });
        seenMudhohiIds.add(mudhohi.id);
      }
    });
  });

  return mudhohiResults;
}
export async function getMudhohiCollectionStats() {
  // Common filter for slaughtered animals
  const slaughteredAnimalFilter = {
    hewan: {
      some: { // Use 'some' because a Mudhohi can be linked to multiple animals, we care if at least one is slaughtered
        slaughtered: true,
      },
    },
  };

  // 1. Total Mudhohi linked to at least one slaughtered animal
  const totalMudhohi = await prisma.mudhohi.count({
    where: slaughteredAnimalFilter,
  });

  // 2. Collected Mudhohi: This is tricky. 'isCollected' is not on Mudhohi.
  // 'receivedByMdhohi' is on HewanQurban.
  // If a Mudhohi is "collected" when *all* animals they are linked to have been received by them,
  // this becomes complex.
  // Let's assume 'collectedMudhohi' means Mudhohi linked to at least one slaughtered animal
  // AND at least one of their *associated* animals has `receivedByMdhohi: true`.
  // This might not be perfectly accurate if one Mudhohi is linked to multiple animals and only some are received.
  // You might need to clarify what "collected Mudhohi" means in your business logic.
  // For simplicity here, I'll count Mudhohi linked to ANY slaughtered animal that has been received.
  const collectedMudhohi = await prisma.mudhohi.count({
    where: {
      AND: [
        slaughteredAnimalFilter, // Ensure related animal is slaughtered
        {
          hewan: {
            some: {
              receivedByMdhohi: true, // And at least one related animal has been received
            },
          },
        },
      ],
    },
  });

  // Helper function for animal type filters
  const getAnimalTypeFilter = (animalName: string) => ({
    hewan: {
      some: {
        slaughtered: true,
        tipe: {
          nama: {
            contains: animalName,
            // Assuming 'mode: "insensitive"' works for your DB, otherwise remove it
            mode: "insensitive",
          },
        },
      },
    },
  });

  // 3. Kambing Stats
  // We need to group Mudhohi, but the `isCollected` property (which should be `receivedByMdhohi` on HewanQurban)
  // is on the related `HewanQurban` model. `groupBy` on `Mudhohi` can't directly group by a property of a related array.
  // A more robust way might be to get the Mudhohi IDs first, then count based on those.
  // Alternatively, we can count the mudhohi directly.

  const totalKambingMudhohi = await prisma.mudhohi.count({
    where: getAnimalTypeFilter("kambing"),
  });

  const collectedKambingMudhohi = await prisma.mudhohi.count({
    where: {
      AND: [
        getAnimalTypeFilter("kambing"),
        {
          hewan: {
            some: {
              receivedByMdhohi: true,
            },
          },
        },
      ],
    },
  });

  // 4. Sapi Individual Stats
  const totalSapiIndividualMudhohi = await prisma.mudhohi.count({
    where: {
      AND: [
        getAnimalTypeFilter("sapi"),
        {
          hewan: {
            // A Mudhohi is "individual" for a sapi if they are linked to a sapi that is NOT kolektif.
            // If one mudhohi is linked to both kolektif and non-kolektif sapi, this counts them in both.
            some: {
              isKolektif: false,
            },
          },
        },
      ],
    },
  });

  const collectedSapiIndividualMudhohi = await prisma.mudhohi.count({
    where: {
      AND: [
        getAnimalTypeFilter("sapi"),
        {
          hewan: {
            some: {
              isKolektif: false,
              receivedByMdhohi: true,
            },
          },
        },
      ],
    },
  });

  // 5. Sapi Kolektif Stats
  const totalSapiKolektifMudhohi = await prisma.mudhohi.count({
    where: {
      AND: [
        getAnimalTypeFilter("sapi"),
        {
          hewan: {
            some: {
              isKolektif: true,
            },
          },
        },
      ],
    },
  });

  const collectedSapiKolektifMudhohi = await prisma.mudhohi.count({
    where: {
      AND: [
        getAnimalTypeFilter("sapi"),
        {
          hewan: {
            some: {
              isKolektif: true,
              receivedByMdhohi: true,
            },
          },
        },
      ],
    },
  });

  return {
    total: totalMudhohi,
    collected: collectedMudhohi,
    pending: totalMudhohi - collectedMudhohi,
    percentage: totalMudhohi > 0 ? Math.round((collectedMudhohi / totalMudhohi) * 100) : 0,
    byCategory: {
      kambing: {
        total: totalKambingMudhohi,
        collected: collectedKambingMudhohi,
      },
      sapiIndividual: {
        total: totalSapiIndividualMudhohi,
        collected: collectedSapiIndividualMudhohi,
      },
      sapiKolektif: {
        total: totalSapiKolektifMudhohi,
        collected: collectedSapiKolektifMudhohi,
      },
    },
  };
}