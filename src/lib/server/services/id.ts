import type { TipeHewanInputDTO } from "#@/lib/DTOs/mudhohi.ts"
import prisma from "#@/lib/server/prisma.ts";
import { JenisHewan } from "@prisma/client";
export async function generateDashCode(): Promise<string> {
  return `QRB-${Math.floor(Math.random() * 10000)
      .toString(36).substring(2, 8).toUpperCase()
      .padStart(4, "0")}`
}

export async function generateHewanId(
  tipeHewan: TipeHewanInputDTO, 
  totalHewan: number, 
  index: number,
  group?: string
): Promise<string> {
  const settingData = await prisma.setting.findUnique({where:{key: "itemsPerGroup"}})
  console.log(settingData)
  const itemsPerGroup = Number.parseInt(settingData?.value || '50')
  // 3. Tentukan apakah perlu grup khusus
  type SingleQurban = 'DOMBA' | 'KAMBING';
  const isSingleQurban = (jenis: JenisHewan): jenis is SingleQurban => {
    return jenis === JenisHewan.DOMBA || jenis === JenisHewan.KAMBING;
  };
  
  // Kemudian di dalam fungsi:
  const inLargeQuota =  isSingleQurban(tipeHewan.jenis) || tipeHewan.target > 100;

  // 4. Generate ID sesuai logika
  if (inLargeQuota) {
    const groupIndex = Math.floor(totalHewan / itemsPerGroup);
    const remainder = totalHewan % itemsPerGroup;
    const currentNumber = remainder + (index+1);
    
    const groupChar = group ?? String.fromCharCode(65 + groupIndex);
    const formattedNumber = currentNumber.toString().padStart(2, '0');
    
    return `${tipeHewan.nama}_${groupChar}-${formattedNumber}`;
  }
  
  // Untuk kasus normal (non-domba/domba dan target ≤ 100)
  return `${tipeHewan.nama}_${totalHewan + (index+1)}`;
}

export async function renameAllHewanWithGroups(itemsPerGroup: number) {
  // Get itemsPerGroup setting
  const result = await prisma.$transaction(async (tx) => {
    const setting = await tx.setting.upsert({
      where: { key: "itemsPerGroup" },
      update: { value: itemsPerGroup.toString() },
      create: { key: "itemsPerGroup", value: itemsPerGroup.toString() }
    });

    // Get all tipeHewan records
    const allTipeHewan = await tx.tipeHewan.findMany();

    // Process each tipeHewan type
    for (const tipe of allTipeHewan) {
      // Get all hewan for this tipe, ordered by creation time
      const allHewan = await tx.hewanQurban.findMany({
        where: { tipeId: tipe.id },
        orderBy: { createdAt: "asc" }
      });

      // Rename hewan with group-based IDs
      for (let i = 0; i < allHewan.length; i++) {
        const hewan = allHewan[i];
        const groupIndex = Math.floor(i / itemsPerGroup);
        const groupChar = String.fromCharCode(65 + groupIndex); // A, B, C, ...
        const numberInGroup = (i % itemsPerGroup) + 1;
        const formattedNumber = numberInGroup.toString().padStart(2, '0');
        
        const newHewanId = `${tipe.nama}_${groupChar}-${formattedNumber}`;

        // Update the hewan record
        await tx.hewanQurban.update({
          where: { id: hewan.id },
          data: { hewanId: newHewanId }
        });
      }
      return setting
    }
  });
  return result
}
