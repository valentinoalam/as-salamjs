/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server"
import { CaraBayar, PaymentStatus } from "@prisma/client"
import { generateHewanId } from "@/services/mudhohi"
import { GoogleSpreadsheet } from "google-spreadsheet"
import { getGoogleClient } from "@/lib/gClient";
import prisma from "@/lib/prisma";


export async function POST(request: Request) {
  try {
    const { sheetId, sheetName = "Sheet1", userId } = await request.json()

    if (!sheetId) {
      return NextResponse.json({ error: "Sheet ID is required" }, { status: 400 })
    }

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Initialize Google Sheets API
    const client = await getGoogleClient(["https://www.googleapis.com/auth/spreadsheets.readonly"])
    const doc = new GoogleSpreadsheet(sheetId, client)
    await doc.loadInfo()
    const sheet = doc.sheetsByTitle[sheetName]
    if (!sheet) {
      return NextResponse.json({ error: `Sheet "${sheetName}" not found` }, { status: 404 });
    }
    // Extract headers directly from sheet.headerValues
    // sheet.headerValues automatically contains the values from the first row
    const headers = sheet.headerValues.map((header: string) => header.toLowerCase().trim().replace(/\s+/g, "_"));
    const rows = await sheet.getRows()

    if (!rows || rows.length === 0) {
      if (headers.length === 0) {
        return NextResponse.json({ error: "Sheet is empty, no headers or data found" }, { status: 404 });
      }
      return NextResponse.json({ error: "No data found in the sheet" }, { status: 404 })
    }

    // Process data rows (skip header row)
    const results = await processSheetData(rows.slice(1), headers, userId)

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${results.success} records. Failed: ${results.failed}`,
      data: results.data,
    })
  } catch (error: any) {
    console.error("Error importing from Google Sheets:", error)
    return NextResponse.json({ error: error.message || "Failed to import data from Google Sheets" }, { status: 500 })
  }
}

async function processSheetData(rows: any[], headers: string[], userId: string) {
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

      // Map Google Sheets data to Prisma schema
      const mudhohiData = mapToMudhohiSchema(rowData, userId)
      const pembayaranData = mapToPembayaranSchema(rowData)

      // Create records in database with transaction
      const result = await prisma.$transaction(async (tx) => {
        // Get hewan data and handle kolektif logic
        const hewanData = await mapToHewanQurbanSchema(rowData, tx)

        // Create Mudhohi record
        const mudhohi = await tx.mudhohi.create({
          data: {
            ...mudhohiData,
            // Create related Pembayaran record
            payment: {
              create: pembayaranData,
            },
          },
          include: {
            payment: true,
          },
        })

        // Handle hewan relationships
        if (hewanData.length > 0) {
          for (const [index, hewan] of hewanData.entries()) {
            if (hewan.isExisting) {
              // Connect to existing HewanQurban and update slot
              await tx.hewanQurban.update({
                where: { id: hewan.id },
                data: {
                  slotTersisa: { decrement: hewan.quantity },
                  mudhohi: { connect: { id: mudhohi.id } }
                }
              })
            } else {
              const tipeHewan = await tx.tipeHewan.findUnique({
                where: {
                  id: Number(hewan.data!.tipeId)  // Assuming 'id' is the primary key
                },
                select: {
                  id: true,
                  nama: true,
                  jenis: true,
                  target: true
                }
              });
              // Create new HewanQurban and connect to mudhohi
              await tx.hewanQurban.create({
                data: {
                  ...hewan.data,
                  tipeId: hewan.data!.tipeId,
                  hewanId: await generateHewanId(tipeHewan!, index),
                  // tipe: { connect: {id: hewan.data!.tipeId}},
                  mudhohi: { connect: { id: mudhohi.id } }
                }
              })
            }
          }
        }

        // Fetch the complete mudhohi with hewan data
        const completeMudhohi = await tx.mudhohi.findUnique({
          where: { id: mudhohi.id },
          include: {
            payment: true,
            hewan: true,
          }
        })

        return completeMudhohi
      })

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

function mapToMudhohiSchema(rowData: Record<string, any>, userId: string) {
  return {
    userId: userId,
    nama_pengqurban: rowData.nama_pengqurban || rowData.nama || "",
    nama_peruntukan: rowData.nama_peruntukan || rowData.peruntukan || null,
    alamat: rowData.alamat || null,
    pesan_khusus: rowData.pesan_khusus || rowData.pesan || null,
    keterangan: rowData.keterangan || null,
    potong_sendiri: convertToBoolean(rowData.potong_sendiri),
    ambil_daging: convertToBoolean(rowData.ambil_daging),
    ambil_daging: convertToBoolean(rowData.mengambil_daging || rowData.sudah_ambil),
    dash_code: rowData.dash_code || rowData.kode || generateDashCode(),
    qrcode_url: rowData.qrcode_url || rowData.barcode || null,
  }
}

function mapToPembayaranSchema(rowData: Record<string, any>) {
  // Map cara_bayar to enum
  let caraBayar: CaraBayar
  const caraBayarValue = (rowData.cara_bayar || "").toUpperCase()
  if (caraBayarValue === "TRANSFER" || caraBayarValue.includes("TRANSFER")) {
    caraBayar = CaraBayar.TRANSFER
  } else {
    caraBayar = CaraBayar.TUNAI
  }

  // Map payment_status to enum
  let paymentStatus: PaymentStatus
  const statusValue = (rowData.payment_status || rowData.status || "").toUpperCase()

  if (statusValue.includes("LUNAS") || statusValue.includes("PAID")) {
    paymentStatus = PaymentStatus.LUNAS
  } else if (statusValue.includes("MENUNGGU") || statusValue.includes("KONFIRMASI")) {
    paymentStatus = PaymentStatus.MENUNGGU_KONFIRMASI
  } else if (statusValue.includes("BATAL") || statusValue.includes("CANCEL")) {
    paymentStatus = PaymentStatus.BATAL
  } else {
    paymentStatus = PaymentStatus.BELUM_BAYAR
  }

  return {
    cara_bayar: caraBayar,
    paymentStatus: paymentStatus,
    dibayarkan: Number.parseInt(rowData.dibayarkan || rowData.jumlah_bayar || "0", 10) || 0,
    urlTandaBukti: rowData.url_tanda_bukti || rowData.bukti_bayar || null,
    kodeResi: rowData.kode_resi || rowData.resi || null,
  }
}

async function mapToHewanQurbanSchema(rowData: Record<string, any>, tx: any) {
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
            hewanId: await generateHewanId(jenisHewan, 0),
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
          hewanId: await generateHewanId(jenisHewan, i),
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

function convertToBoolean(value: any): boolean {
  if (typeof value === "boolean") return value
  if (typeof value === "string") {
    const lowercased = value.toLowerCase()
    return lowercased === "true" || lowercased === "ya" || lowercased === "y" || lowercased === "1"
  }
  if (typeof value === "number") return value === 1
  return false
}

function generateDashCode(): string {
  return `QRB-${Math.floor(Math.random() * 10000)
      .toString(36).substring(2, 8).toUpperCase()
      .padStart(4, "0")}`
}