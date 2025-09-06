/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PaginatedQueryResult, PaginationData, QueryResult } from "#@/lib/DTOs/global.ts";
import type {
  Counter,
  HewanQurban,
  HewanStatus,
  JenisHewan,
  JenisProduk
} from "@prisma/client"

export type StatusKupon = "AVAILABLE" | "DISTRIBUTED" | "RETURNED" | "NOT_BACK"
export const StatusKupon = {
  AVAILABLE: "AVAILABLE" as const,
  DISTRIBUTED: "DISTRIBUTED" as const,
  RETURNED: "RETURNED" as const,
  NOT_BACK: "NOT_BACK" as const,
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
  createdAt: Date
  updatedAt: Date
}
export interface TipeHewanWithImages extends TipeHewan {
  images: TipeHewanImage[]
}

// Add paginated query result interfaces
export interface HewanQueryResult extends PaginatedQueryResult<HewanQurban> {
  refetch: (options?: { page?: number, group?: string }) => Promise<any>
  pagination: PaginationData
}

export type PenerimaQueryResult = PaginatedQueryResult<Penerima>
export type MudhohiQueryResult = PaginatedQueryResult<Mudhohi>
export type ProductQueryResult = QueryResult<ProdukHewan>
export type DistribusiQueryResult = QueryResult<Distribusi>
export type ShipmentQueryResult = QueryResult<Shipment>
export type ErrorLogQueryResult = QueryResult<ErrorLog>
export interface ProductLogQueryResult extends QueryResult<ProductLogWithProduct> {
  refetch: (filters?: { produkId?: number; place?: Counter }) => Promise<any>
}
export type PengirimanStatus = "DIKIRIM" | "DITERIMA";

export interface ProductLog {
  id: number;
  timestamp: number;
  produkId: number;
  event: "menambahkan" | "memindahkan" | "mengkoreksi";
  place: Counter;
  value: number;
  note?: string;
}

export type ProdukHewan = {
  id: number
  nama: string
  berat: number | null
  avgProdPerHewan: number | null
  kumulatif: number
  targetPaket: number
  diTimbang: number
  diInventori: number
  sdhDiserahkan: number
  JenisHewan: JenisHewan
  JenisProduk: JenisProduk
}
export interface HewanQurbanResponse {
  data: HewanQurban[];
  pagination: {
    currentPage: number
    totalPages: number
    currentGroup?: string
    totalGroups?: number
    pageSize: number
    total: number,
    hasNext: boolean
    hasPrev: boolean
    useGroups: boolean
    itemsPerGroup: number
  };
}
// Add ProductLog type
export type ProductLogWithProduct = ProductLog & {
  produk: {
    id: number
    nama: string
  }
}
// Add shipment types
export interface ShipmentProduct {
  id: number
  produkId: number
  jumlah: number
  produk: {
    id: number
    nama: string
  } | ProdukHewan
}

export interface Shipment {
  id: number
  statusPengiriman: PengirimanStatus
  daftarProdukHewan: ShipmentProduct[]
  waktuPengiriman: Date | string
  waktuDiterima?: Date | string | null
  catatan?: string | null
}

export type Distribusi = {
  id: string
  kategori: string
  target: number
  realisasi: number
  createdAt: Date
  updatedAt: Date
}

export type logDistribusi = {
  id: string;
  createdAt: Date;
  penerimaId: string;
  distributionId: string;
  jumlahPaket: number;
  diterima: boolean;
  produkQurban: {
    id: number;
    nama:string;
  }
}

export type Mudhohi = {
  id: string
  nama_pengqurban: string | null
  nama_peruntukan: string | null
  hewan: {
    hewanId: string
    receivedByMdhohi: boolean
  }[]
}

export interface ProdukDiterima {
  logDistribusiId: string;
  jenisProdukId: number;
  jumlahPaket: number;
  jenisProduk: ProdukHewan;
}

export interface LogDistribusi {
  id: string;
  penerimaId: string;
  distribusiId: string;
  createdAt: Date;
  listProduk: ProdukDiterima[];
}

export type Kupon = {
  id: number;
  status: StatusKupon;
  createdAt?: Date;
  updatedAt?: Date;
};
export interface Penerima {
  id: string;
  distribusiId: string;
  kuponId?: string | null;
  jumlahKupon?: number | null;       
  sudah_terima_kupon?:  boolean | null;
  diterimaOleh?: string | null;
  nama?: string | null;
  noIdentitas?: string | null;
  jenisId?: string | null;
  alamat?: string | null;
  telepon?: string | null;
  createdAt: Date;
  waktuTerima?: Date | null;
  sudahMenerima: boolean;
  keterangan?: string | null;
  jenis: "KELOMPOK" | "INDIVIDU";
  logDistribusi: LogDistribusi | null;
  distribusi: {
    id: string;
    kategori: string;
  };
}

export type ErrorLog = {
  id: number
  produkId: number
  diTimbang: number
  diInventori: number
  selesai: boolean
  note: string
  timestamp: Date
  produk: {
    id: number
    nama: string
  } | ProdukHewan
}

// Define the shape of our context
export interface QurbanContextType {
  // Data states and loading
  sapiQuery: HewanQueryResult
  dombaQuery: HewanQueryResult
  productsQuery: ProductQueryResult
  errorLogsQuery: ErrorLogQueryResult
  // Product logs query
  productLogsQuery: ProductLogQueryResult
  shipmentsQuery: ShipmentQueryResult
  // Pagination metadata
  meta: {
    sapi: { total: number; target: number; slaughtered: number }
    domba: { total: number; target: number; slaughtered: number }
  }

  // Connection status
  isConnected: boolean
  // Shipment methods
  createShipment: (products: ShipmentProduct[], note?: string) => Promise<Shipment | void>
  receiveShipment: (shipmentId: number, receivedProducts: { produkId: number; jumlah: number }[]) => Promise<{ success: boolean; discrepancies?: { produkId: number; expected: number; received: number }[] }>

  // Utility methods
  getProductById: (id: number) => ProdukHewan | undefined
  getProductsByType: (type: "daging" | "all") => ProdukHewan[]
  getProductLogsByPlace: (place: Counter) => ProductLogWithProduct[]
  getProductLogsByProduct: (produkId: number) => ProductLogWithProduct[]

  // Methods for updating data
  updateHewan: (data: {
    hewanId: string
    status: HewanStatus
    slaughtered?: boolean
    receivedByMdhohi?: boolean
    onInventory?: boolean
    tipeId: number
  }) => void
  updateProduct: (data: {
    produkId: number
    event: "menambahkan" | "memindahkan" | "mengkoreksi"
    place: Counter
    value: number
    note?: string
  }) => void
  updateErrorLogNote: (args:{ id: number; selesai?: boolean; note: string }) => void;
}
