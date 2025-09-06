import { HewanStatus, type CaraBayar } from "@prisma/client"
import type { TipeHewan } from "@/types/qurban"

export enum PaymentStatus {
  BELUM_BAYAR = "BELUM_BAYAR",
  DOWN_PAYMENT = "DOWN_PAYMENT",
  MENUNGGU_KONFIRMASI = "MENUNGGU_KONFIRMASI",
  LUNAS = "LUNAS",
  BATAL = "BATAL",
}

export interface Pembayaran {
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

export interface HewanQurban {
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
  mudhohi?: Mudhohi[] | null
}

export interface Mudhohi {
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
