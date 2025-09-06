/* eslint-disable @typescript-eslint/no-explicit-any */
import { convertToBoolean } from "#@/lib/utils/formatters.ts"
import type { PaymentStatus, CaraBayar, JenisHewan } from "@prisma/client"


export type TipeHewanInputDTO = {
  id: number, 
  nama:string, 
  jenis: JenisHewan, 
  target:number 
}

export type JenisHewanInputDTO = "sapi" | "domba" 
export interface PaymentUpdateParams {
  mudhohiId: string
  newStatus: PaymentStatus
  amount?: number
  kodeResi?: string
  caraBayar: CaraBayar
}


// Helper function to map spreadsheet data to mudhohi input structure
export async function mapToMudhohiInputData(rowData: Record<string, any>, userId: string) {
   // Extract animal type information for proper mapping
  const jenisHewan = (rowData.hewan || rowData.jenis_hewan || "").toLowerCase();
  let tipeHewanId = 1; // default
  
  if (jenisHewan.includes("sapi")) {
    tipeHewanId = 1; // assuming 1 is for sapi
  } else if (jenisHewan.includes("domba") || jenisHewan.includes("kambing")) {
    tipeHewanId = 2; // assuming 2 is for domba/kambing
  }

  // Map cara_bayar to enum
  let cara_bayar: CaraBayar
  const caraBayarValue = (rowData.cara_bayar || "").toUpperCase()
  if (caraBayarValue === "TRANSFER" || caraBayarValue.includes("TRANSFER")) {
    cara_bayar = "TRANSFER"
  } else {
    cara_bayar = "TUNAI"
  }

  // Map payment_status to enum
  let paymentStatus: PaymentStatus
  const statusValue = (rowData.payment_status || rowData.status || "").toUpperCase()

  if (statusValue.includes("LUNAS") || statusValue.includes("PAID")) {
    paymentStatus = "LUNAS"
  } else if (statusValue.includes("MENUNGGU") || statusValue.includes("KONFIRMASI")) {
    paymentStatus = "MENUNGGU_KONFIRMASI"
  } else if (statusValue.includes("BATAL") || statusValue.includes("CANCEL")) {
    paymentStatus = "BATAL"
  } else {
    paymentStatus = "BELUM_BAYAR"
  }

  return {
    userId: userId,
    accountProviderId: rowData.accountProviderId,
    accountProvider: rowData.accountProvider,
    nama_pengqurban: rowData.nama_pengqurban || rowData.nama || '',
    nama_peruntukan: rowData.nama_peruntukan,
    email: rowData.email || '',
    phone: rowData.phone || rowData.telepon || '',
    pesan_khusus: rowData.pesan_khusus,
    keterangan: rowData.keterangan,
    potong_sendiri: convertToBoolean(rowData.potong_sendiri),
    ambil_daging: convertToBoolean(rowData.ambil_daging),
    tipeHewanId,
    jenisHewan,
    isKolektif: convertToBoolean(rowData.is_kolektif || rowData.kolektif),
    quantity: Number.parseInt(rowData.jumlah_hewan || rowData.quantity || rowData.jumlah || "1", 10) || 1,
    cara_bayar,
    paymentStatus,
    urlTandaBukti: rowData.url_tanda_bukti || rowData.bukti_bayar || null,
    dibayarkan: Number.parseInt(rowData.dibayarkan || rowData.jumlah_bayar || "0", 10) || 0,
    kodeResi: rowData.kode_resi || rowData.resi || null,
    jatahPengqurban: rowData.jatahPengqurban ? 
      (Array.isArray(rowData.jatahPengqurban) ? rowData.jatahPengqurban : [rowData.jatahPengqurban]) : 
      undefined
  };
}
