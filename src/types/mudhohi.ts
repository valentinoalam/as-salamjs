import { z } from "zod"
import type { TipeHewan } from "@/types/keuangan"
import { PaymentStatus, CaraBayar } from "@prisma/client"

export const jenisProduk = {
  "Daging": "Daging",
  "Kaki belakang": "Kaki Belakang",
  "Karkas": "Karkas",
  "Jeroan": "Jeroan",
  "Kulit": "Kulit",
  "Tulang": "Tulang",
  "Kepala": "Kepala",
  "Lemak": "Lemak",
  "Buntut": "Buntut",
  "Torpedo": "Torpedo"
} as const;

export type JenisProduk = keyof typeof jenisProduk;

// Zod Schemas
const PaymentStatusEnum = z.nativeEnum(PaymentStatus)
const CaraBayarEnum = z.nativeEnum(CaraBayar)

const PaymentSchema = z.object({
  id: z.string(),
  cara_bayar: CaraBayarEnum,
  paymentStatus: PaymentStatusEnum,
  dibayarkan: z.number().min(0),
  urlTandaBukti: z.string().nullable(),
  kodeResi: z.string().nullable(),
  // NEW FIELDS
  tipeid: z.number().optional().nullable(),
  quantity: z.number().optional().nullable(),
  isKolektif: z.boolean().optional().nullable(),
  totalAmount: z.number().optional().nullable(),
  updatedAt: z.date().optional().nullable()
});

const HewanTipeSchema = z.object({
  nama: z.string(),
  icon: z.string().nullable(),
})

const HewanSchema = z.object({
  id: z.string(),
  hewanId: z.string(),
  tipeId: z.number(),
  status: z.string(),
  slaughtered: z.boolean(),
  tipe: HewanTipeSchema,
})

const UserSchema = z.object({
  name: z.string().nullable(),
  email: z.string().email().nullable(),
})

export const MudhohiSchema = z.object({
  id: z.string(),
  nama_pengqurban: z.string(),
  nama_peruntukan: z.string().nullable(),
  pesan_khusus: z.string().nullable(),
  keterangan: z.string().nullable(),
  potong_sendiri: z.boolean(),
  ambil_daging: z.boolean().nullable(),
  dash_code: z.string(),
  createdAt: z.date(),
  payment: PaymentSchema.nullable(),
  hewan: z.array(HewanSchema),
  user: UserSchema,
});

export const MudhohiStatsSchema = z.object({
  totalMudhohi: z.number().min(0),
  totalHewan: z.number().min(0),
  statusCounts: z.object({
    BELUM_BAYAR: z.number().min(0),
    MENUNGGU_KONFIRMASI: z.number().min(0),
    LUNAS: z.number().min(0),
    BATAL: z.number().min(0),
  }),
})

export const PaymentConfirmationSchema = z.object({
  kodeResi: z.string().min(1, "Kode resi harus diisi"),
  amount: z.number().min(1, "Jumlah pembayaran harus lebih dari 0"),
  cara_bayar: CaraBayarEnum
})

export const MudhohiEditSchema = z.object({
  nama_pengqurban: z.string().min(1, "Nama pengqurban harus diisi"),
  nama_peruntukan: z.string().optional(),
  pesan_khusus: z.string().optional(),
  keterangan: z.string().optional(),
  potong_sendiri: z.boolean(),
  ambil_daging: z.boolean(),
})

export const SearchFilterSchema = z.object({
  searchTerm: z.string(),
  statusFilter: z.union([PaymentStatusEnum, z.literal("ALL")]),
})

// Types
export type MudhohiStats = z.infer<typeof MudhohiStatsSchema>
export type Mudhohi = z.infer<typeof MudhohiSchema>
export type MudhohiEdit = z.infer<typeof MudhohiEditSchema>
export type PaymentConfirmation = z.infer<typeof PaymentConfirmationSchema>
export type SearchFilter = z.infer<typeof SearchFilterSchema>

export interface MudhohiManagementProps {
  initialStats: MudhohiStats
  initialMudhohi: Mudhohi[]
  tipeHewan: TipeHewan[]
}

export interface PaymentUpdateParams {
  mudhohiId: string
  newStatus: PaymentStatus
  amount?: number
  kodeResi?: string
  caraBayar: CaraBayar
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  mudhohiId?: string
}