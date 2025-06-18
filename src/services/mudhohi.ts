'use server'
import prisma from "@/lib/prisma"
import { HewanStatus, JenisDistribusi, JenisHewan, PaymentStatus, Prisma, PrismaClient, type CaraBayar } from "@prisma/client"
import { differenceInDays, format, startOfDay, subDays } from "date-fns"
import moment from "moment-hijri"
import "moment/locale/id"
import type { DefaultArgs } from "@prisma/client/runtime/library"
import { getPaymentStatusFromAmount } from "@/lib/zod/qurban-form"
import { revalidatePath } from "next/cache"
import { MudhohiEditSchema } from "@/types/mudhohi"
import type z from "zod"
import * as fs from 'fs';
import * as path from 'path';
import QRCode from 'qrcode';

interface Pembayaran {
  id: string;
  mudhohiId: string;
  tipeid?: number | null;
  quantity?: number | null;
  isKolektif?: boolean | null;
  totalAmount?: number | null;
  cara_bayar: CaraBayar;
  paymentStatus: PaymentStatus;
  dibayarkan: number;
  urlTandaBukti?: string | null;
  kodeResi?: string | null;
  createdAt: Date | null;
  updatedAt?: Date | null;
  tipe?: TipeHewan | null; // Optional relation to TipeHewan
}

interface HewanQurban {
  id: string;
  tipeId: number;
  hewanId: string;
  status: HewanStatus;
  slaughtered: boolean;
  slaughteredAt?: Date | null;
  meatPackageCount: number;
  onInventory: boolean;
  receivedByMdhohi: boolean;
  isKolektif: boolean;
  isCustom: boolean;
  slotTersisa?: number | null;
  keterangan?: string | null;
  tipe?: TipeHewan; // Relation to TipeHewan
  createdAt: Date;
  updatedAt: Date;
}

interface Mudhohi {
  id: string;
  userId: string;
  nama_pengqurban: string;
  nama_peruntukan?: string | null;
  alamat?: string | null;
  pesan_khusus?: string| null;
  keterangan?: string | null;
  potong_sendiri: boolean;
  ambil_daging?: boolean| null;
  dash_code: string;
  qrcode_url?: string | null;
  createdAt: Date;
  // Assuming 'User' type exists elsewhere if you need to include it
  // user: User;
  payment?: Pembayaran | null; // Relationship to Pembayaran (one-to-one or one-to-many depending on your logic)
  hewan?: HewanQurban[] | null; // Array for HewanQurban (one-to-many relationship)
}

interface QRCodeData {
  mudhohi_id: string;
  dash_code: string;
  nama_pengqurban: string;
  quantity: number;
  tipe_hewan: string;
  created_at: string;
}

interface QRCodeOptions {
  format?: 'png' | 'svg';
  size?: number;
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
}

type TipeHewan = {id: number, nama:string, jenis: JenisHewan, target:number }

/**
 * Generates a QR code for Mudhohi order
 * @param mudhohi - The mudhohi object from database
 * @param options - QR code generation options
 * @returns Promise<string> - Base64 data URL or SVG string
 */
export async function generateQRCode(
  mudhohi: Mudhohi, // Replace with proper Mudhohi type
  options: QRCodeOptions = {}
): Promise<string> {
  try {
    // Default options
    const defaultOptions = {
      format: 'png' as const,
      size: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    };

    const config = { ...defaultOptions, ...options };

    // Prepare QR code data
    const qrData: QRCodeData = {
      mudhohi_id: mudhohi.id,
      dash_code: mudhohi.dash_code,
      nama_pengqurban: mudhohi.nama_pengqurban,
      quantity: mudhohi.payment?.quantity || 1,
      tipe_hewan: mudhohi.hewan?.[0]?.tipe?.nama || 'Unknown',
      created_at: mudhohi.createdAt?.toISOString() || new Date().toISOString()
    };

    // Create verification URL - adjust this to your actual verification endpoint
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://yourdomain.com';
    const verificationUrl = `${baseUrl}/verify-mudhohi?code=${mudhohi.dash_code}`;

    // You can choose to encode either the verification URL or the JSON data
    const dataToEncode = JSON.stringify({
      url: verificationUrl,
      data: qrData
    });

    // QR Code generation options
    const qrOptions = {
      width: config.size,
      margin: config.margin,
      color: {
        dark: config.color.dark,
        light: config.color.light,
      },
      errorCorrectionLevel: 'M' as const, // Medium error correction
    };

    if (config.format === 'svg') {
      // Generate SVG QR code
      const svgString = await QRCode.toString(dataToEncode, {
        ...qrOptions,
        type: 'svg'
      });
      return svgString;
    } else {
      // Generate PNG QR code as base64 data URL
      const dataUrl = await QRCode.toDataURL(dataToEncode, qrOptions);
      return dataUrl;
    }

  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Alternative function that saves QR code to file system
 * @param mudhohi - The mudhohi object from database
 * @param filePath - Path where to save the QR code image
 * @param options - QR code generation options
 * @returns Promise<string> - File path of the generated QR code
 */
export async function generateQRCodeToFile(
  mudhohi: Mudhohi,
  filePath: string,
  options: QRCodeOptions = {}
): Promise<string> {
  try {
    const config = {
      format: 'png' as const,
      size: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      ...options
    };

    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
    const qrData: QRCodeData = {
      mudhohi_id: mudhohi.id,
      dash_code: mudhohi.dash_code,
      nama_pengqurban: mudhohi.nama_pengqurban,
      quantity: mudhohi.payment?.quantity || 1,
      tipe_hewan: mudhohi.hewan?.[0]?.tipe?.nama || 'Unknown',
      created_at: mudhohi.createdAt?.toISOString() || new Date().toISOString()
    };

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://yourdomain.com';
    const verificationUrl = `${baseUrl}/verify-mudhohi?code=${mudhohi.dash_code}`;

    const dataToEncode = JSON.stringify({
      url: verificationUrl,
      data: qrData
    });

    const qrOptions = {
      width: config.size,
      margin: config.margin,
      color: {
        dark: config.color.dark,
        light: config.color.light,
      },
      errorCorrectionLevel: 'M' as const,
    };

    // Save to file
    await QRCode.toFile(filePath, dataToEncode, qrOptions);
    
    return filePath;
  } catch (error) {
    console.error('Error generating QR code file:', error);
    throw new Error('Failed to generate QR code file');
  }
}

/**
 * Generate QR code and return as buffer (useful for API responses)
 * @param mudhohi - The mudhohi object from database
 * @param options - QR code generation options
 * @returns Promise<Buffer> - QR code image buffer
 */
export async function generateQRCodeBuffer(
  mudhohi: Mudhohi,
  options: QRCodeOptions = {}
): Promise<Buffer> {
  try {
    const config = {
      size: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      ...options
    };

    const qrData: QRCodeData = {
      mudhohi_id: mudhohi.id,
      dash_code: mudhohi.dash_code,
      nama_pengqurban: mudhohi.nama_pengqurban,
      quantity: mudhohi.payment?.quantity || 1,
      tipe_hewan: mudhohi.hewan?.[0]?.tipe?.nama || 'Unknown',
      created_at: mudhohi.createdAt?.toISOString() || new Date().toISOString()
    };

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://yourdomain.com';
    const verificationUrl = `${baseUrl}/verify-mudhohi?code=${mudhohi.dash_code}`;

    const dataToEncode = JSON.stringify({
      url: verificationUrl,
      data: qrData
    });

    const qrOptions = {
      width: config.size,
      margin: config.margin,
      color: {
        dark: config.color.dark,
        light: config.color.light,
      },
      errorCorrectionLevel: 'M' as const,
    };

    const buffer = await QRCode.toBuffer(dataToEncode, qrOptions);
    return buffer;
  } catch (error) {
    console.error('Error generating QR code buffer:', error);
    throw new Error('Failed to generate QR code buffer');
  }
}

// Usage example in your createMudhohi function:
/*
// After creating mudhohi successfully, generate QR code
try {
  const qrCodeDataUrl = await generateQRCode(mudhohi, {
    format: 'png',
    size: 300,
    color: {
      dark: '#2D5016', // Dark green for Islamic theme
      light: '#FFFFFF'
    }
  });
  
  // You can store this data URL in database or return it in response
  // Or save as file for later use
  const qrFilePath = `./public/qr-codes/${mudhohi.dash_code}.png`;
  await generateQRCodeToFile(mudhohi, qrFilePath);
  
} catch (qrError) {
  console.error('Failed to generate QR code:', qrError);
  // Continue without QR code or handle as needed
}
*/

export async function generateDashCode(): Promise<string> {
  return `QRB-${Math.floor(Math.random() * 10000)
      .toString(36).substring(2, 8).toUpperCase()
      .padStart(4, "0")}`
}

export async function generateHewanId(tipeHewan: TipeHewan, index: number): Promise<string> {
  const totalHewan = await prisma.hewanQurban.count({
    where: { tipeId: tipeHewan.id },
  });

  // 3. Tentukan apakah perlu grup khusus
  type SingleQurban = 'DOMBA' | 'KAMBING';
  const isSingleQurban = (jenis: JenisHewan): jenis is SingleQurban => {
    return jenis === JenisHewan.DOMBA || jenis === JenisHewan.KAMBING;
  };
  
  // Kemudian di dalam fungsi:
  const inLargeQuota =  isSingleQurban(tipeHewan.jenis) || tipeHewan.target > 100;

  // 4. Generate ID sesuai logika
  if (inLargeQuota) {
    const groupIndex = Math.floor(totalHewan / 50);
    const remainder = totalHewan % 50;
    const currentNumber = remainder + (index+1);
    
    const groupChar = String.fromCharCode(65 + groupIndex);
    const formattedNumber = currentNumber.toString().padStart(2, '0');
    
    return `${tipeHewan.nama}_${groupChar}-${formattedNumber}`;
  }
  
  // Untuk kasus normal (non-domba/domba dan target ≤ 100)
  return `${tipeHewan.nama}_${totalHewan + (index+1)}`;
}

// Helper function for kolektif hewan
async function findOrCreateKolektifHewan(tipeHewan: TipeHewan, quantity: number, tx: Omit<PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">) {
  // Find available kolektif hewan with enough slots
  const availableHewan = await tx.hewanQurban.findFirst({
    where: {
      tipeId: 1,
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
  
  // Create new kolektif hewan with full slots
  return await tx.hewanQurban.create({
    data: {
      tipeId: 1,
      hewanId: await generateHewanId(tipeHewan, 0),
      isKolektif: true,
      slotTersisa: 7 - quantity  // Start with remaining slots
    }
  });
}

export async function getTipeHewan() {
  return await prisma.tipeHewan.findMany({
    orderBy: { id: "asc" },
  })
}

export async function createMudhohi(data: {
  userId?: string
  nama_pengqurban: string
  nama_peruntukan?: string
  email: string
  phone: string
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
  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Handle user creation/update
      let user = await tx.user.findFirst({
        where: { 
          OR: [
            { id: data.userId || '' },
            { name: data.nama_pengqurban },
            { email: data.email }
          ] 
        },
      });

      if (user) {
        user = await tx.user.update({
          where: { id: user.id },
          data: {
            ...(data.email && { email: data.email }),
            ...(data.phone && { phone: data.phone }),
          },
        });
      } else {
        user = await tx.user.create({
          data: {
            email: data.email,
            name: data.nama_pengqurban,
            phone: data.phone
          },
        });
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
          hargaKolektif: true
        }
      });

      if (!tipeHewan) {
        throw new Error("Tipe hewan tidak ditemukan");
      }

      const isKolektif = data.isKolektif //tipeHewan.nama.toLowerCase().includes("kolektif");
      const quantity = data.quantity || 1;
      
      // Calculate total amount based on animal type
      const unitPrice = isKolektif ? (tipeHewan.hargaKolektif || tipeHewan.harga) : tipeHewan.harga;
      const totalAmount = unitPrice * quantity;

      // 3. Handle animal allocation
      const hewanData = [];
      if (isKolektif) {
        const kolektifHewan = await findOrCreateKolektifHewan(tipeHewan, quantity, tx);
        hewanData.push({
          tipeId: data.tipeHewanId,
          hewanId: kolektifHewan.hewanId,
          isKolektif: true,
          slotTersisa: Math.max(0, Number(kolektifHewan.slotTersisa) - quantity),
          kolektifParentId: kolektifHewan.id,
          keterangan: data.keterangan || null
        });
      } else {
        for (let i = 0; i < quantity; i++) {
          const newHewanId = await generateHewanId(tipeHewan, i);
          hewanData.push({
            tipeId: data.tipeHewanId,
            hewanId: newHewanId,
            isKolektif: false,
            keterangan: data.keterangan || null
          });
        }
      }

      // 4. Create mudhohi record
      const mudhohi = await tx.mudhohi.create({
        data: {
          userId: user.id,
          nama_pengqurban: data.nama_pengqurban,
          nama_peruntukan: data.nama_peruntukan || null,
          pesan_khusus: data.pesan_khusus || null,
          keterangan: data.keterangan || null,
          potong_sendiri: data.potong_sendiri,
          ambil_daging: data.ambil_daging,
          dash_code: await generateDashCode(),
          payment: {
            create: {
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
          },
          hewan: {
            create: hewanData
          }
        },
        include: {
          payment: true,
          hewan: true
        }
      });

      // 5. Generate QR Code
      const qrFilePath = `./public/qr-codes/${mudhohi.dash_code}.png`;
      const qrcode_url = await generateQRCodeToFile(mudhohi, qrFilePath)
      await tx.mudhohi.update({
        where: { id: mudhohi.id },
        data: {
          qrcode_url
        }
      });

      // 6. Create or get Mudhohi distribution category
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

      // 7. Create penerima record for the mudhohi (mudhohi as recipient)
      const penerimaMudhohi = await tx.penerima.create({
        data: {
          distribusiId: distribusiMudhohi.id,
          nama: data.nama_pengqurban,
          jenis: "INDIVIDU" as JenisDistribusi,
          sudahMenerima: false,
          mudhohi: {
            connect: { id: mudhohi.id }
          }
        }
      });

      // 8. Update mudhohi with penerima connection
      await tx.mudhohi.update({
        where: { id: mudhohi.id },
        data: {
          jatahQurbanid: penerimaMudhohi.id
        }
      });

      // 9. Determine selected products
      let selectedProdukIds: number[] = [];
      if (data.jatahPengqurban && data.jatahPengqurban.length > 0) {
        // Validate selected products belong to the correct animal type
        const validProducts = await tx.produkHewan.findMany({
          where: {
            id: { in: data.jatahPengqurban },
            JenisHewan: tipeHewan.jenis
          }
        });
        
        if (validProducts.length !== data.jatahPengqurban.length) {
          throw new Error("Some selected products don't match the animal type");
        }
        
        // Limit to maximum 2 products
        selectedProdukIds = data.jatahPengqurban.slice(0, 2);
        
      } else {
        // Default product selection based on animal type
        const availableProducts = await tx.produkHewan.findMany({
          where: { JenisHewan: tipeHewan.jenis },
          take: 2 // Take first 2 products as default
        });
        selectedProdukIds = availableProducts.map(p => p.id);
      }

      // 10. Create single LogDistribusi for the mudhohi (as penerima)
      const logDistribusi = await tx.logDistribusi.create({
        data: {
          penerimaId: penerimaMudhohi.id,
        }
      });


      const isKambing = tipeHewan.jenis === 'KAMBING';
      const isDomba = tipeHewan.jenis === 'DOMBA';
      const jatahDagingKolektif = 2;
      if (isKolektif) {
        const existing = await tx.produkHewan.findFirst({
          where: {
            nama: {
              contains: 'daging', // case-sensitive fallback
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
      }
      else if(isKambing || isDomba) {
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
            jumlahPaket: quantity, // Always 1 per product per animal
          }
        });
      }
      else {
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
      // 12. Allocate 2 free coupons to mudhohi
      const availableCoupons = await tx.kupon.findMany({
        where: { status: "TERSEDIA" },
        take: 2,
        orderBy: { id: 'asc' }
      });
      const allocatedCoupons = [];

      if (availableCoupons.length === 2) {
        // ✅ Case: update both
        for (const coupon of availableCoupons) {
          const updated = await tx.kupon.update({
            where: { id: coupon.id },
            data: {
              status: data.cara_bayar === "TUNAI" ? "DISALURKAN" : "TERSEDIA",
              mudhohi: {
                connect: { id: mudhohi.id }
              }
            }
          });
          allocatedCoupons.push(updated);
        }
      } else if (availableCoupons.length === 1) {
        // ✅ Case: update 1 and create 1
        const updated = await tx.kupon.update({
          where: { id: availableCoupons[0].id },
          data: {
            status: data.cara_bayar === "TUNAI" ? "DISALURKAN" : "TERSEDIA",
            mudhohi: {
              connect: { id: mudhohi.id }
            }
          }
        });
        allocatedCoupons.push(updated);

        const created = await tx.kupon.create({
          data: {
            status: data.cara_bayar === "TUNAI" ? "DISALURKAN" : "TERSEDIA",
            mudhohi: {
              connect: { id: mudhohi.id }
            }
          }
        });
        allocatedCoupons.push(created);
      } else {
        // ✅ Case: create 2 new
        for (let i = 0; i < 2; i++) {
          const created = await tx.kupon.create({
            data: {
              status: data.cara_bayar === "TUNAI" ? "DISALURKAN" : "TERSEDIA",
              mudhohi: {
                connect: { id: mudhohi.id }
              }
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
            targetPaket: { increment: quantity }, // Increment target based on quantity of animals
          }
        });
      }

      return { 
        success: true, 
        error: "", 
        data: { 
          ...mudhohi,
          penerima: penerimaMudhohi,
          logDistribusi: logDistribusi,
          selectedProducts: selectedProdukIds
        }, 
        kupon: allocatedCoupons 
      };
    });

    return result;
  } catch (error) {
    console.error("Error creating mudhohi:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to create mudhohi", 
      data: {} as Mudhohi 
    };
  }
}

export async function mudhohiReceivedKupon(mudhohiId: string) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Cari mudhohi dan kupon yang terkait
      const mudhohi = await tx.mudhohi.findUnique({
        where: { id: mudhohiId },
        include: {
          kupon: true
        }
      });

      if (!mudhohi) {
        throw new Error("Mudhohi tidak ditemukan");
      }

      if (mudhohi.kupon.length === 0) {
        throw new Error("Tidak ada kupon yang terkait dengan mudhohi ini");
      }

      // Update status semua kupon menjadi TERSALURKAN
      const updatedKupons = await Promise.all(
        mudhohi.kupon.map(async (kupon) => {
          return await tx.kupon.update({
            where: { id: kupon.id },
            data: { status: 'DISALURKAN' }
          });
        })
      );

      return { 
        success: true, 
        message: `${updatedKupons.length} kupon berhasil diubah menjadi TERSALURKAN`,
        kupons: updatedKupons 
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      kupon: true,
      payment: true,
      // user: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  })
}

export async function getMudhohiList(status?: PaymentStatus, searchTerm?: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    await prisma.pembayaran.upsert({
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

    return { success: true }
  } catch (error) {
    console.error("Error updating payment status:", error)
    return { success: false, error: "Gagal mengupdate status pembayaran" }
  }
}

const HIJRI_MONTH_MAP: { [key: string]: string } = {
  'Muharram': 'Muharam',
  'Safar': 'Safar',
  "Rabi' al-Awwal": 'Rabiul Awal',
  "Rabi' al-Thani": 'Rabiul Akhir',
  'Jumada al-Ula': 'Jumadil Awal',
  'Jumada al-Alkhirah': 'Jumadil Akhir',
  'Rajab': 'Rajab',
  'Sha’ban': "Sya'ban",
  'Ramadhan': 'Ramadan',
  'Shawwal': 'Syawal',
  "Dhu al-Qi'dah": 'Dzulqodah',
  'Thul-Qi’dah': 'Dzulqodah',
  'Dhu al-Hijjah': 'Dzulhijjah',
  'Thul-Hijjah': 'Dzulhijjah',
};

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