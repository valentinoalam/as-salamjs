import { z } from "zod"
import { CaraBayar, PaymentStatus } from "@prisma/client"

// Base schema for both forms
export const baseQurbanSchema = z.object({
  // Animal Selection
  tipeHewanId: z.string().min(1, "Pilih jenis hewan terlebih dahulu"),
  quantity: z.coerce.number().min(1, "Jumlah minimal 1 ekor"),
  isKolektif: z.boolean(),

  // Personal Information
  nama_pengqurban: z.string().min(2, "Nama pengqurban minimal 2 karakter"),
  nama_peruntukan: z.string().optional(),
  email: z.string().email("Format email tidak valid"),
  phone: z.string().min(10, "Nomor telepon minimal 10 digit"),
  alamat: z.string().min(5, "Alamat minimal 5 karakter"),

  // Qurban Preferences
  pesan_khusus: z.string().optional(),
  keterangan: z.string().optional(),
  potong_sendiri: z.boolean(),
  mengambilDaging: z.boolean(),
})

// User-facing form schema
export const userQurbanSchema = baseQurbanSchema.extend({
  cara_bayar: z.nativeEnum(CaraBayar),
  // These will be set automatically by the form
  paymentStatus: z.nativeEnum(PaymentStatus).optional(),
  dibayarkan: z.coerce.number().optional(),
  createdAt: z.date().optional(),
})

// Admin form schema with additional fields
export const adminQurbanSchema = baseQurbanSchema.extend({
  createdAt: z.date({
    required_error: "Tanggal transaksi harus diisi",
  }),
  cara_bayar: z.nativeEnum(CaraBayar),
  paymentStatus: z.nativeEnum(PaymentStatus),
  dibayarkan: z.coerce.number().min(0, "Jumlah pembayaran tidak boleh negatif"),
  kodeResi: z.string().optional(),
})

export type UserQurbanFormValues = z.infer<typeof userQurbanSchema>
export type AdminQurbanFormValues = z.infer<typeof adminQurbanSchema>

export const getPaymentStatusFromAmount = (dibayarkan: number, totalAmount: number): PaymentStatus => {
  if (dibayarkan === 0) return PaymentStatus.BELUM_BAYAR
  if (dibayarkan >= totalAmount) return PaymentStatus.LUNAS
  if (dibayarkan > 0 && dibayarkan < totalAmount) return PaymentStatus.DOWN_PAYMENT
  return PaymentStatus.BELUM_BAYAR
}