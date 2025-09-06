/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { sendOrderConfirmationEmail, getPaymentInstructions } from "#@/lib/server/services/email.ts";
import { generateHewanId, generateDashCode } from "#@/lib/server/services/id.ts";
import { generateQRCodeToFile } from "#@/lib/server/services/qr-code.ts";
import { CaraBayar, PaymentStatus, type JenisDistribusi, Prisma, PrismaClient } from "@prisma/client";
import prisma from "#@/lib/server/prisma.ts";
import type { TipeHewanInputDTO } from "#@/lib/DTOs/mudhohi.ts";
import type { DefaultArgs } from "@prisma/client/runtime/library";

// Helper function for kolektif hewan
async function findOrCreateKolektifHewan(
  tipeHewan: TipeHewanInputDTO, 
  quantity: number, 
  tx: Omit<PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">) {
  // Find available kolektif hewan with enough slots
  const availableHewan = await tx.hewanQurban.findFirst({
    where: {
      tipeId: tipeHewan.id,
      isKolektif: true,
      slotTersisa: { gte: quantity }
    }
  });
  
  if (availableHewan) {
    await tx.hewanQurban.update({
      where: { id: availableHewan.id },
      data: { slotTersisa: { decrement: quantity } }
    });
    return availableHewan;
  }
  const totalHewan = await prisma.hewanQurban.count({
    where: { tipeId: tipeHewan.id },
  });
  // Create new kolektif hewan with full slots
  return await tx.hewanQurban.create({
    data: {
      tipeId: tipeHewan.id,
      hewanId: await generateHewanId(tipeHewan, totalHewan, 0),
      isKolektif: true,
      slotTersisa: 7 - quantity  // Start with remaining slots
    }
  });
}

export async function createMudhohi(data: {
  userId?: string; // Optional: Akan ada jika user sudah login
  accountProviderId?: string; // Tambahan: ID dari provider (misal: Google ID)
  accountProvider?: string; // Tambahan: Nama provider (misal: "google")
  createdAt?: Date;
  nama_pengqurban: string
  nama_peruntukan?: string
  email: string
  phone: string
  alamat: string
  pesan_khusus?: string
  keterangan?: string
  potong_sendiri: boolean
  ambil_daging: boolean
  tipeHewanId: number
  isKolektif: boolean
  quantity: number
  cara_bayar: CaraBayar
  paymentStatus?: PaymentStatus
  urlTandaBukti?: string
  dibayarkan?: number
  kodeResi?: string
  jatahPengqurban?: number[] // Array of selected product IDs (max 2)
}) {
  let result
  try {
    result = await prisma.$transaction(async (tx) => {
      // 1. Handle user creation/update (Modified)
      let user = null;
      let isNewUser = false;

      // 1a. Prioritas 1: Cari berdasarkan userId (jika user sudah login)
      if (data.userId) {
        user = await tx.user.findUnique({
          where: { id: data.userId },
        });
      }

      // 1b. Prioritas 2: Jika belum ditemukan, cari berdasarkan accountProviderId (untuk login/daftar via Google)
      if (!user && data.accountProvider && data.accountProviderId) {
        const account = await tx.account.findUnique({
          where: {
            provider_providerAccountId: {
              provider: data.accountProvider,
              providerAccountId: data.accountProviderId,
            },
          },
          include: { user: true },
        });
        if (account) {
          user = account.user;
          // Pastikan email dan nama di user up-to-date dengan data dari Google
          user = await tx.user.update({
            where: { id: user.id },
            data: {
              email: data.email,
              name: data.nama_pengqurban,
              phone: data.phone || user.phone, // Update phone if provided
            },
          });
        }
      }

      // 1c. Prioritas 3: Jika belum ditemukan, cari berdasarkan email atau nama (untuk guest checkout/manual)
      if (!user) {
        user = await tx.user.findFirst({
          where: {
            OR: [{ email: data.email }, { name: data.nama_pengqurban }],
          },
        });
      }

      // 1d. Jika user ditemukan, update datanya
      if (user) {
        user = await tx.user.update({
          where: { id: user.id },
          data: {
            ...(data.email && { email: data.email }),
            ...(data.phone && { phone: data.phone }),
            // Nama hanya diupdate jika sebelumnya null atau kosong
            ...(user.name === null && data.nama_pengqurban && { name: data.nama_pengqurban }),
          },
        });

        // Jika login dengan Google tapi belum ada account yang terhubung
        if (data.accountProvider && data.accountProviderId) {
          const existingAccount = await tx.account.findUnique({
            where: {
              provider_providerAccountId: {
                provider: data.accountProvider,
                providerAccountId: data.accountProviderId,
              },
            },
          });
          if (!existingAccount) {
            await tx.account.create({
              data: {
                userId: user.id,
                type: 'oauth', // Atau jenis lain yang sesuai
                provider: data.accountProvider,
                providerAccountId: data.accountProviderId,
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
            email: data.email,
            name: data.nama_pengqurban,
            phone: data.phone,
            password: "password123", // Password template, harus segera di-prompt untuk diubah
          },
        });

        // Jika registrasi via Google, buat juga entry Account
        if (data.accountProvider && data.accountProviderId) {
          await tx.account.create({
            data: {
              userId: user.id,
              type: 'oauth',
              provider: data.accountProvider,
              providerAccountId: data.accountProviderId,
            },
          });
        }
      }

      // Pastikan user.id ada sebelum melanjutkan
      if (!user?.id) {
        throw new Error("Gagal membuat atau menemukan user.");
      }

      // 2. Get and validate tipe hewan
      const tipeHewan = await tx.tipeHewan.findUnique({
        where: { id: data.tipeHewanId },
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

      const isKolektif = data.isKolektif //tipeHewan.nama.toLowerCase().includes("kolektif");
      const quantity = data.quantity || 1;
      const totalHewanCountForIdGen = tipeHewan._count.hewan
      // Calculate total amount based on animal type
      const unitPrice = isKolektif ? (tipeHewan.hargaKolektif || tipeHewan.harga) : tipeHewan.harga;
      const totalAmount = unitPrice * quantity;

      // 3. Handle animal allocation
      // --- Reordered Logic: Handle animal creation/assignment FIRST ---
      const createdOrUpdatedHewanIds: { id: string }[] = [];

      if (isKolektif) {
          const kolektifHewan = await findOrCreateKolektifHewan(tipeHewan, quantity, tx);
          // We now have the kolektifHewan object, including its ID
          createdOrUpdatedHewanIds.push({ id: kolektifHewan.id });
      } else {
          for (let i = 0; i < quantity; i++) {
              const newHewanId = await generateHewanId(tipeHewan, totalHewanCountForIdGen, i);
              const newIndividualHewan = await tx.hewanQurban.create({
                  data: {
                      tipeId: data.tipeHewanId,
                      hewanId: newHewanId,
                      isKolektif: false,
                      slotTersisa: 1, // Individual hewan always has 1 slot
                      keterangan: data.keterangan || null
                  }
              });
              createdOrUpdatedHewanIds.push({ id: newIndividualHewan.id });
          }
      }
      
      // 4. Create or get Mudhohi distribution category
      const distribusiMudhohi = await tx.distribusi.upsert({
        where: { kategori: "Mudhohi" },
        update: {
          target: { increment: 1 }, // Increment target for each new mudhohi
          realisasi: { increment: 1 } // Increment realisasi since mudhohi is registered
        },
        create: {
          kategori: "Mudhohi",
          target: 1,
          realisasi: 1,
        }
      });
      const paymentData = {
        cara_bayar: data.cara_bayar,
        paymentStatus: data.paymentStatus || PaymentStatus.BELUM_BAYAR,
        urlTandaBukti: data?.urlTandaBukti || null,
        dibayarkan: data.dibayarkan || 0,
        kodeResi: data.kodeResi || null,
        quantity: quantity,
        isKolektif: isKolektif,
        totalAmount: totalAmount,
        tipeid: data.tipeHewanId
      }

      // 5. Create Mudhohi and connect to the created/found hewan
      const mudhohi = await tx.mudhohi.create({
          data: {
              createdAt: data.createdAt || new Date(),
              userId: user.id,
              year: new Date().getFullYear(),
              nama_pengqurban: data.nama_pengqurban,
              nama_peruntukan: data.nama_peruntukan || null,
              pesan_khusus: data.pesan_khusus || null,
              keterangan: data.keterangan || null,
              potong_sendiri: data.potong_sendiri,
              ambil_daging: data.ambil_daging,
              dash_code: await generateDashCode(),
              payment: {
                  create: paymentData
              },
              sudah_terima_kupon: data.cara_bayar ===  CaraBayar.TUNAI? true : false,
              jatahPengqurban: {
                  create: {
                      distribusiId: distribusiMudhohi.id,
                      nama: data.nama_pengqurban,
                      jenis: "INDIVIDU" as JenisDistribusi,
                      sudahMenerima: false,
                      jumlahKupon: 2
                  }
              },
              // Connect to the already created/updated hewan records
              hewan: {
                  connect: createdOrUpdatedHewanIds // Connect using the IDs of the animals
              }
          },
          include: {
              jatahPengqurban: true,
              hewan: true // Include for verification if needed
          }
      });

      // 8. Generate QR Code
      const qrFilePath = `./public/qr-codes/${mudhohi.dash_code}.png`;
      const qrcode_url = await generateQRCodeToFile(mudhohi, qrFilePath)
      await tx.mudhohi.update({
        where: { id: mudhohi.id },
        data: {
          qrcode_url
        }
      });

      // 9. Determine selected products
      let selectedProdukIds: number[] = [];

      // --- Section 1: Handle SAPI product selection and validation ---
      if (tipeHewan.jenis === "SAPI" && data.jatahPengqurban && data.jatahPengqurban.length > 0) {
        // Validate selected products belong to the correct animal type
        const validProducts = await tx.produkHewan.findMany({
          where: {
            id: { in: data.jatahPengqurban },
            JenisHewan: tipeHewan.jenis
          }
        });

        if (validProducts.length !== data.jatahPengqurban.length) {
          throw new Error("Some selected products don't match the animal type or are invalid.");
        }

        // Limit to maximum 2 products for SAPI
        selectedProdukIds = data.jatahPengqurban.slice(0, 2);
      }

      // --- Section 2: Create single LogDistribusi for the mudhohi (as penerima) ---
      // IMPORTANT: Verify `mudhohi.jatahPengqurban[0].id` is the correct ID for the recipient.
      // If 'mudhohi' is the actual recipient object, it's more common to use `mudhohi.id`.
      const logDistribusi = await tx.logDistribusi.create({
        data: {
          penerimaId: mudhohi.jatahPengqurban[0].id, // Please double-check if this is the intended recipient ID
        }
      });

      const isKambing = tipeHewan.jenis === 'KAMBING';
      const isDomba = tipeHewan.jenis === 'DOMBA';
      const jatahDagingKolektif = 2; // Assuming this is a fixed value for collective meat share

      // --- Section 3: Handle product allocation based on animal type and collective status ---
      if (isKolektif) {
        // For collective, we need a specific 'daging' product.
        // The 'nama' field for ProdukHewan is unique. To avoid P2002, we make the name specific.
        const collectiveProductName = `Daging Kolektif ${tipeHewan.jenis}`; // e.g., "Daging Kolektif SAPI"

        const daging = await tx.produkHewan.upsert({
          where: {
            nama: collectiveProductName, // Use the specific name for lookup
          },
          update: {}, // No updates needed if it exists, just retrieve it
          create: {
            nama: collectiveProductName, // Create with the specific unique name
            JenisHewan: tipeHewan.jenis,
            JenisProduk: 'DAGING', // Assuming 'daging' refers to a 'DAGING' product type
            // Add any other required fields for ProdukHewan creation
          },
        });

        await tx.produkDiterima.create({
          data: {
            logDistribusiId: logDistribusi.id,
            jenisProdukId: daging.id,
            jumlahPaket: quantity * jatahDagingKolektif,
          },
        });
      } else if (isKambing || isDomba) {
        // For individual Kambing/Domba, we need a 'Kaki Belakang' product.
        // The 'nama' field for ProdukHewan is unique. To avoid P2002, the name in 'create'
        // must match the name in 'where' and be unique across all ProdukHewan.
        const animalType = isKambing ? 'KAMBING' : 'DOMBA';
        const kakiBelakangProductName = `Kaki Belakang ${animalType}`; // e.g., "Kaki Belakang KAMBING"

        const kakiBelakang = await tx.produkHewan.upsert({
          where: {
            // Use the specific name for WHERE clause to find existing record
            nama: kakiBelakangProductName,
            JenisHewan: animalType, // Include JenisHewan in where for more specific lookup if nama is not globally unique
            JenisProduk: "KAKI" // Include JenisProduk in where for more specific lookup
          },
          create: {
            // The 'nama' in create MUST match the 'nama' in where for upsert to work correctly
            // if 'nama' is the unique key.
            nama: kakiBelakangProductName,
            JenisHewan: animalType,
            JenisProduk: "KAKI"
          },
          update: {} // No updates needed if it exists, just retrieve it
        });

        await tx.produkDiterima.create({
          data: {
            logDistribusiId: logDistribusi.id,
            jenisProdukId: kakiBelakang.id,
            jumlahPaket: quantity, // Always 1 per product per animal
          }
        });
      } else {
        // This 'else' block likely handles the 'SAPI' case where specific products are selected.
        // Add selected products to distribution log (1 quantity per product per hewan)
        for (const produkId of selectedProdukIds) {
          await tx.produkDiterima.create({
            data: {
              logDistribusiId: logDistribusi.id,
              jenisProdukId: produkId,
              jumlahPaket: quantity, // Always 1 per product per animal
            }
          });
        }
      }

      // --- Section 4: Allocate 2 coupons to mudhohi (optimized) ---
      const desiredCouponCount = 2;
      const currentCouponStatus = data.cara_bayar === "TUNAI" ? "DISTRIBUTED" : "AVAILABLE";

      // Find existing available coupons
      const availableCoupons = await tx.kupon.findMany({
        where: { status: "AVAILABLE" },
        take: desiredCouponCount,
        orderBy: { id: 'asc' } // Ensure consistent selection
      });

      const allocatedCoupons = [];

      // Update existing coupons to the desired status
      if (availableCoupons.length > 0) {
        const couponIdsToUpdate = availableCoupons.map(coupon => coupon.id);
        // Use updateMany for efficiency when updating multiple records
        await tx.kupon.updateMany({
          where: {
            id: { in: couponIdsToUpdate }
          },
          data: {
            status: currentCouponStatus,
          }
        });
        // Re-fetch or reconstruct if you need the full updated objects, otherwise count is enough
        allocatedCoupons.push(...availableCoupons.map(coupon => ({ ...coupon, status: currentCouponStatus })));
      }

      // Create any remaining coupons needed to reach 'desiredCouponCount'
      const couponsToCreateCount = desiredCouponCount - availableCoupons.length;
      if (couponsToCreateCount > 0) {
        const createPromises = [];
        for (let i = 0; i < couponsToCreateCount; i++) {
          createPromises.push(tx.kupon.create({
            data: {
              status: currentCouponStatus,
            }
          }));
        }
        // Wait for all new coupons to be created and add them to allocatedCoupons
        const newlyCreatedCoupons = await Promise.all(createPromises);
        allocatedCoupons.push(...newlyCreatedCoupons);
      }

      // Now 'allocatedCoupons' array will contain exactly 2 coupon objects (either updated or newly created)
      // with their final status.

      // --- Section 5: Update product inventory tracking ---
      // This loop is correct for incrementing targetPaket for selected products.
      for (const produkId of selectedProdukIds) {
        await tx.produkHewan.update({
          where: { id: produkId },
          data: {
            targetPaket: { increment: quantity }, // Increment target based on quantity of animals
          }
        });
      }


      return { 
        success: true, 
        error: "", 
        data: { 
          ...mudhohi,
          payment: paymentData,
          user, 
          isNewUser,
          logDistribusi: logDistribusi,
          selectedProducts: selectedProdukIds,
          kupon: allocatedCoupons 
        }, 
      };
    });

    return result;
  } catch (error) {
    console.error("Error creating mudhohi:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to create mudhohi", 
      data: {} as any
    };
  } finally {
    // if (result) {
    //   const mudhohi = result.data;
    //   // // Send confirmation email with QR code
    //   await sendOrderConfirmationEmail(
    //     mudhohi.user.email!,
    //     {
    //       orderId: mudhohi.id,
    //       dashCode: mudhohi.dash_code,
    //       qrcode_url: mudhohi.qrcode_url,
    //       namaPengqurban: mudhohi.nama_pengqurban,
    //       totalAmount: mudhohi.payment.totalAmount,
    //       paymentStatus: mudhohi.payment.paymentStatus,
    //       paymentInstructions: getPaymentInstructions(data.cara_bayar),
    //     },
    //     mudhohi.isNewUser,
    //     !!data.accountProvider
    //   );
    //   console.log(`TODO: Buat session login untuk user ID: ${mudhohi.user.id} (jika belum ada)`);
    // }
  }
}