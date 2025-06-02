'use server'
import prisma from "@/lib/prisma"
import { JenisHewan, PaymentStatus, Prisma, PrismaClient, type CaraBayar, type Mudhohi } from "@prisma/client"

import { differenceInDays, format, startOfDay, subDays } from "date-fns"
import moment from "moment-hijri"
import "moment/locale/id"
import type { DefaultArgs } from "@prisma/client/runtime/library"
import { getPaymentStatusFromAmount } from "@/lib/zod/qurban-form"
import { revalidatePath } from "next/cache"

type TipeHewan = {id: number, nama:string, jenis: JenisHewan, target:number }

function generateDashCode(): string {
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
  mengambilDaging: boolean
  tipeHewanId: number
  quantity: number
  cara_bayar: CaraBayar
  paymentStatus?: PaymentStatus
  urlTandaBukti?: string
  dibayarkan?: number
  kodeResi?: string
}) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      let user = await prisma.user.findFirst({
        where: { OR: [
          {id: data.userId},
          {name: data.nama_pengqurban},
        ] },
      })
      if (user) {
        user = await tx.user.update({
          where: { id: user.id },
          data: {
            ...(data.email && { email: data.email }),
            ...(data.phone && { phone: data.phone }),
          },
        });
      } 
      if(!user) {
        user = await tx.user.create({
          data: {
            email: data.email,
            name: data.nama_pengqurban,
            phone: data.phone
          },
        });
      }
      const userId = user.id

      // Get tipe hewan
      const tipeHewan = await tx.tipeHewan.findUnique({
        where: { id: data.tipeHewanId },
        select: {
          id: true,
          nama: true,
          jenis: true,
          target: true,
          harga: true
        }
      });

      if (!tipeHewan) {
        // Throwing an error within a transaction will cause a rollback
        throw new Error("Tipe hewan tidak ditemukan");
      }

      const isKolektif = tipeHewan.nama === "Sapi Kolektif";
      const quantity = data.quantity || 1;  // Default to 1 if not specified
      const hewanData = [];

      if (isKolektif) {
        const kolektifHewan = await findOrCreateKolektifHewan(tipeHewan, quantity, tx);
        hewanData.push({
          tipeId: 1,
          hewanId: kolektifHewan.hewanId,
          isKolektif: true,
          slotTersisa: Math.max(0, Number(kolektifHewan.slotTersisa) - quantity),
          kolektifParentId: kolektifHewan.id,
          keterangan: data.keterangan || null
        });
      } else {
        for (let i = 0; i < quantity; i++) {
          const newHewanId = await generateHewanId(tipeHewan, i); // Sequential call
          hewanData.push({
            tipeId: data.tipeHewanId,
            hewanId: newHewanId,
            isKolektif: false,
            keterangan: data.keterangan || null
          });
        }
      }
      // Create mudhohi
      const mudhohi = await tx.mudhohi.create({
        data: {
          userId,
          nama_pengqurban: data.nama_pengqurban,
          nama_peruntukan: data.nama_peruntukan || undefined,
          pesan_khusus: data.pesan_khusus || undefined,
          keterangan: data.keterangan || undefined,
          potong_sendiri: data.potong_sendiri,
          mengambilDaging: data.mengambilDaging,
          ambil_daging: data.mengambilDaging,
          dash_code: generateDashCode(),
          payment: {
            create: {
              cara_bayar: data.cara_bayar,
              paymentStatus: data.paymentStatus || PaymentStatus.BELUM_BAYAR,
              urlTandaBukti: data?.urlTandaBukti || null,
              dibayarkan: data.dibayarkan || 0,
              kodeResi: data.kodeResi || undefined,
              quantity: quantity,
              isKolektif: isKolektif,
              totalAmount: (tipeHewan.harga || 0) * quantity,
              tipeid: data.tipeHewanId
            }
          },
          hewan: {
            create: await Promise.all(
              Array.from({ length: isKolektif ? 1 : quantity }, async (_, index) => {
                if (isKolektif) {
                  const kolektifHewan = await findOrCreateKolektifHewan(tipeHewan, quantity, tx);
                  return {
                    tipeId: 1,
                    hewanId: kolektifHewan.hewanId,
                    isKolektif: true,
                    slotTersisa: Math.max(0, Number(kolektifHewan.slotTersisa) - quantity),
                    kolektifParentId: kolektifHewan.id,
                    keterangan: data.keterangan || null
                  };
                }
                return {
                  tipeId: data.tipeHewanId,
                  hewanId: await generateHewanId(tipeHewan, index),
                  isKolektif: false,
                  keterangan: data.keterangan || null
                };
              })
            )
          }
        },
        include: {
          payment: true,
          hewan: true
        }
      });
      return { success: true, error: "", data:{ ...mudhohi } };
    });

    return result
  } catch (error) {
    console.error("Error creating mudhohi:", error)
    return { success: false, error: "Failed to create mudhohi", data: {} as Mudhohi }
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
      payment: true,
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

export async function updatePaymentStatus(
  mudhohiId: string,
  status: PaymentStatus,
  kodeResi?: string,
  dibayarkan?: number,
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

    // Ambil nilai pembayaran sebelumnya dan tambahkan yang baru jika ada
    const existingPaid = mudhohi.payment?.dibayarkan || 0;
    const newPaid = dibayarkan || 0;
    const totalPaid = existingPaid + newPaid;

    // Tentukan status berdasarkan total yang sudah dibayarkan
    const finalStatus = getPaymentStatusFromAmount(totalPaid, totalAmount);

    await prisma.pembayaran.update({
      where: { mudhohiId },
      data: {
        paymentStatus: finalStatus,
        kodeResi: kodeResi || undefined,
        dibayarkan: totalPaid,
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

// export async function updatePaymentStatus(
//   mudhohiId: string,
//   status: PaymentStatus,
//   amount?: number,
//   kodeResi?: string,
// ) {
//   try {
    // Check if payment exists
//     const payment = await prisma.pembayaran.findUnique({
//       where: { mudhohiId },
//     })

//     if (!payment) {
//       return { success: false, error: "Payment not found" }
//     }

//     // Update payment status
// await prisma.pembayaran.update({
//       where: { mudhohiId },
//       data: {
//         paymentStatus: finalStatus,
//         kodeResi: kodeResi || undefined,
//         dibayarkan: finalDibayarkan,
//         updatedAt: new Date(),
//       },
//     })

//     return { success: true }
//   } catch (error) {
//     console.error("Error updating payment status:", error)
//     return { success: false, error: "Failed to update payment status" }
//   }
// }

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