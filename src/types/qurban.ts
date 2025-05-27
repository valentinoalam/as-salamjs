export type perHewanSalesStat = {
  tipeHewanId: number;
  nama: string;
  jenis: string;
  harga: number;
  count: number;
  totalAmount: number;
}

export type QurbanSalesStats = {
  totalSales: number
  totalCount: number
  perTipeHewan: perHewanSalesStat[]
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

export interface TransactionDetail {
  id: string
  nama_pengqurban: string | null
  createdAt: Date
  totalAmount: number
  hewanTypes: Array<{
    nama: string
    harga: number
    count: number
  }>
  paymentStatus: string
}

export type TipeHewan = {
  id: number
  nama: string
  icon: string | null
  harga: number
  hargaKolektif?: number | null
  note?: string | null
  jenis?: string
}