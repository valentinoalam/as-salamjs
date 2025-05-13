// src/lib/animalId.ts
import { PrismaClient, JenisHewan } from '@prisma/client';

const prisma = new PrismaClient();

export async function generateAnimalId(tipeId: number): Promise<string> {
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