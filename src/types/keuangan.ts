import type { TipeHewan, TransactionType } from "@prisma/client";

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
  createdAt?: Date
  updatedAt?: Date
}

export interface ProcessedData {
  pemasukanData: Array<{
    name: string;
    value: number;
    fill: string;
  }>;
  pengeluaranData: Array<{
    name: string;
    value: number;
    fill: string;
  }>;
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
  receiptUrl: Image[]
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
  balance: number
}

export interface QurbanSalesStats {
  perTipeHewan: Array<{
    tipeHewanId: number
    nama: string
    jenis: string
    harga: number
    count: number
    totalAmount: number
  }>
  totalCount: number
  totalSales: number
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
  paymentStatus: "PAID" | "PENDING"
}

export interface WeeklySalesData {
  week: string
  weekNumber: number
  [key: string]: string | number
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


interface KeuanganDashboardProps {
  initialStats: TransactionStats
  initialTransactions: Transaction[]
  initialCategories: Category[]
  initialBudgets: Budget[]
  initialTipeHewan?: TipeHewan[]
}