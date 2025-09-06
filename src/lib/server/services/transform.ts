/* eslint-disable @typescript-eslint/no-explicit-any */

import prisma from "#@/lib/server/prisma.ts"
import { generateHewanId } from "./id"
import { convertToBoolean } from "#@/lib/utils/formatters.ts"


export async function mapToHewanQurbanSchema(rowData: Record<string, any>, tx: any) {
  // If there's no hewan data, return empty array
  if (!rowData.hewan && !rowData.jenis_hewan) {
    return []
  }

  const jenisHewan = (rowData.hewan || rowData.jenis_hewan || "").toLowerCase()
  const jumlahHewan = Number.parseInt(rowData.jumlah_hewan || "1", 10) || 1
  const isKolektif = convertToBoolean(rowData.is_kolektif || rowData.kolektif)

  // Determine tipeId based on jenis hewan
  let tipeId = 1 // default
  if (jenisHewan.includes("sapi")) {
    tipeId = 1 // assuming 1 is for sapi
  } else if (jenisHewan.includes("domba") || jenisHewan.includes("kambing")) {
    tipeId = 2 // assuming 2 is for domba/kambing
  }
  const totalHewan = await prisma.hewanQurban.count({
    where: { tipeId },
  });
  const hewanRecords = []

  if (isKolektif) {
    let remainingQuantity = jumlahHewan
    while (remainingQuantity > 0) {
      // Find existing kolektif HewanQurban with available slots for the same tipe
      const existingKolektif = await tx.hewanQurban.findFirst({
        where: {
          tipeId: tipeId,
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
            tipeId: tipeId,
            hewanId: await generateHewanId(jenisHewan, totalHewan, 0),
            isKolektif: true,
            slotTersisa: 7 - slotsToUse, // 7 total slots minus used slots
            keterangan: rowData.keterangan || null,
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
          tipeId: tipeId,
          hewanId: await generateHewanId(jenisHewan, totalHewan, i),
          isKolektif: false,
          slotTersisa: null, // Individual hewan don't have slots
          keterangan: rowData.keterangan || null,
        },
        quantity: 1
      })
    }
  }

  return hewanRecords
}
