/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  Counter,
  HewanQurban,
  HewanStatus,
  JenisHewan,
  JenisProduk,
  ProductLog,
  StatusKupon
} from "@prisma/client"
import type { UseQueryOptions } from "@tanstack/react-query";

export interface QueryResult<T> {
  data: T[]
  isLoading: boolean
  isError: boolean
  isEmpty?: boolean
  message?: string
  refetch: () => Promise<any>
  pagination?: PaginationData
}

// Add paginated query result interfaces
export interface PaginatedQueryResult<T> extends QueryResult<T> {
  pagination: PaginationData
  refetch: (options?: { page?: number; pageSize?: number }) => Promise<any>
}
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
export type TipeHewan = "sapi" | "domba" 

export type ProdukHewan = {
  id: number
  nama: string
  berat: number | null
  avgProdPerHewan?: number | null
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
  dibuatPada: Date
  diperbaruiPada: Date
}

export type logDistribusi = {
  id: string;
  dibuatPada: Date;
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
  dibuatPada: Date;
  listProduk: ProdukDiterima[];
}

export interface Penerima {
  id: string;
  distribusiId: string;
  kuponId?: string | null;
  diterimaOleh?: string | null;
  nama?: string | null;
  noIdentitas?: string | null;
  jenisId?: string | null;
  alamat?: string | null;
  telepon?: string | null;
  dibuatPada: Date;
  waktuTerima?: Date | null;
  sudahMenerima: boolean;
  keterangan?: string | null;
  jenis: "KELOMPOK" | "INDIVIDU";
  logDistribusi: LogDistribusi | null;
  distribusi: {
    id: string;
    kategori: string;
  };
  kupon: {
    id: number;
    status: StatusKupon
  }[]
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
// Define pagination configuration type
interface PaginationConfig {
  useGroups: boolean
  itemsPerGroup?: number
  pageSize: number
}

// Update PaginationData interface
export interface PaginationData {
  currentPage: number
  totalPages: number
  pageSize: number
  total: number
  hasNext: boolean
  hasPrev: boolean
  currentGroup?: string
  totalGroups?: number
  useGroups?: boolean
  itemsPerGroup?: number
}

export type PaginationDataOld = PaginationConfig & {
  currentPage: number
  totalPages: number
  currentGroup?: string
  totalGroups?: number
}
export type QueryWithToastOptions<TData, TError> = UseQueryOptions<TData, TError> & {
  errorMessage?: string
}

// // Add localStorage utility functions
// export const getCachedData = <T,>(key: string): { data: T } | null => {
//   if (typeof window === 'undefined') return null;
//   const data = localStorage.getItem(key);
//   return data ? JSON.parse(data) : null;
// };

// export const setCachedData = (key: string, data: any, ttl = 5 * 60 * 1000) => {
//   if (typeof window === 'undefined') return;
//   const item = {
//     data,
//     timestamp: Date.now(),
//     ttl
//   };
//   localStorage.setItem(key, JSON.stringify(item));
// };

// export const isCacheValid = (key: string): boolean => {
//   if (typeof window === 'undefined') return false;
//   const item = localStorage.getItem(key);
//   if (!item) return false;
  
//   const { timestamp, ttl } = JSON.parse(item);
//   return Date.now() - timestamp < ttl;
// };

// export function getValidCacheData<T>(cacheKey: string) {
//   if (isCacheValid(cacheKey)) {
//     const cached = getCachedData<T>(cacheKey);
//     if (cached) return cached.data;
//   }
//   return null;
// }

// Custom hook for determining pagination configuration
export const getPaginationConfig = (target: number, total: number): PaginationConfig => {
  if (total > 100) {
    return { 
      useGroups: true, 
      itemsPerGroup: 50,
      pageSize: 10, 
    }
  }
  if (target <= 100 && total <= 50) return { 
    useGroups: false, 
    pageSize: 10,
  }
  if (total > 50 && total <= 60) return { 
    useGroups: false, 
    pageSize: 15, 
  }
  if (total > 60 && total <= 100) return { 
    useGroups: false, 
    pageSize: 20,
  }
  return { 
    useGroups: false, 
    pageSize: 10,
  }
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

  // getAvailableProducts: ProdukHewan[];
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
