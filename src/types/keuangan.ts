import type { JenisHewan, TransactionType } from "@prisma/client";

export enum PaymentStatus {
  BELUM_BAYAR = "BELUM_BAYAR",
  DOWN_PAYMENT = "DOWN_PAYMENT",
  MENUNGGU_KONFIRMASI = "MENUNGGU_KONFIRMASI",
  LUNAS = "LUNAS",
  BATAL = "BATAL",
}

export type perHewanSalesStat = {
  tipeHewanId: number;
  nama: string;
  jenis: string;
  harga: number;
  count: number;
  totalAmount: number;
  currentAmount: number;
}

export type QurbanSalesStats = {
  currentIncome: number
  totalSales: number
  totalCount: number
  perTipeHewan: perHewanSalesStat[]
  animalCount: number
}

export interface ChartDataResponse {
  data: WeeklySalesData[]
  animalTypes: string[]
  totalSales: number
  transactions: TransactionDetail[]
  totalRevenue: number
}

export interface TransactionDetail {
  id: string
  nama_pengqurban: string
  createdAt: Date
  totalAmount: number
  hewanTypes: Array<{
    nama: string
    harga: number
    count: number
  }>
  paymentStatus: string //"PAID" | "PENDING"
}

type TipeHewanImage = {
  id: string
  url: string
  alt: string
}

export type TipeHewan = {
  id: number
  nama: string
  icon: string | null
  target?: number
  harga: number
  hargaKolektif?: number | null
  note?: string | null
  jenis: JenisHewan
}
export interface TipeHewanWithImages extends TipeHewan {
  images: TipeHewanImage[]
}
export interface DataPoint {
  name: string;
  value: number
  // income: number;
  // expense: number;
}

export interface CategoryDistribution {
  name: string
  value: number
  color: string
}

export interface CategoryFormValues {
  name: string
  type: TransactionType
}

export interface Category {
  id: number
  name: string
  type: TransactionType
  trxCount?: number
  createdAt?: Date
  updatedAt?: Date
}

export interface ProcessedData {
  pemasukanData: CategoryDistribution[];
  pengeluaranData: CategoryDistribution[];
  totalPemasukan: number;
  totalPengeluaran: number;
}


export interface Image {
  id: string
  url: string
  transactionId: string
  createdAt: Date
  updatedAt: Date
}

export interface Transaction {
  id: string
  amount: number
  description: string
  type: TransactionType
  categoryId: number
  category: Category
  date: Date
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export interface TransactionFormValues {
  amount: number
  description: string
  type: TransactionType
  categoryId: number
  date: Date
}

export type TransactionStats = {
  totalIncome: number
  totalExpense: number
  incomeTransactionCount: number  // New
  expenseTransactionCount: number  // New
  balance: number
}

export interface WeeklySalesData {
  week: string
  weekNumber: number
  [animalType: string]: number | string
}
export interface ChartDataResponse {
  data: WeeklySalesData[]
  animalTypes: string[]
  totalSales: number
  transactions: TransactionDetail[]
  totalRevenue: number
}

export interface Budget {
  id: string
  amount: number
  categoryId: number
  category: Category
  startDate: Date
  endDate: Date
  createdAt: Date
  updatedAt: Date
}

export interface BudgetFormValues {
  amount: number
  categoryId: number
  startDate: Date
  endDate: Date
}