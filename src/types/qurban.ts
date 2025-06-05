/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  Counter,
  HewanQurban,
  HewanStatus,
  JenisDistribusi,
  JenisHewan,
  JenisProduk,
  ProductLog
} from "@prisma/client"
import type { UseQueryOptions } from "@tanstack/react-query";

export type PengirimanStatus = "PENDING" | "DIKIRIM" | "DITERIMA";
export type TipeHewan = "sapi" | "domba" 

export type ProdukHewan = {
  id: number
  nama: string
  tipeId: number | null
  berat: number | null
  avgProdPerHewan: number
  kumulatif: number
  targetPaket: number
  diTimbang: number
  diInventori: number
  sdhDiserahkan: number
  JenisProduk: JenisProduk
  tipe_hewan?: {
    id: number
    nama: string
    icon: string | null
    jenis: JenisHewan
  } | null
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
  waktuDiterima: Date | string | null
  catatan: string | null
}

export type Distribusi = {
  id: string
  kategori: string
  target: number
  realisasi: number
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
  waktuTerima?: Date | null;
  sudahMenerima: boolean;
  listProduk: ProdukDiterima[];
}

export interface Penerima {
  id: string;
  distribusiId: string;
  noKupon?: string | null;
  diterimaOleh?: string | null;
  nama?: string | null;
  noIdentitas?: string | null;
  jenisId?: string | null;
  alamat?: string | null;
  telepon?: string | null;
  dibuatPada: Date;
  keterangan?: string | null;
  jenis: "KELOMPOK" | "INDIVIDU";
  logDistribusi: LogDistribusi | null;
  distribusi: {
    id: string;
    kategori: string;
  }
}

export type ErrorLog = {
  id: number
  produkId: number
  event: string
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
export type PaginationData = 
  PaginationConfig & {
    currentPage: number
    totalPages: number
    currentGroup?: string
    totalGroups?: number
  }
export interface HewanQuery {
  data: HewanQurban[]
  isLoading: boolean
  isError: boolean
  refetch: (options?: { page?: number, group?: string }) => Promise<any>
  pagination: PaginationData
}

export type QueryWithToastOptions<TData, TError> = UseQueryOptions<TData, TError> & {
  errorMessage?: string
}

// Add localStorage utility functions
export const getCachedData = <T,>(key: string): { data: T } | null => {
  if (typeof window === 'undefined') return null;
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : null;
};

export const setCachedData = (key: string, data: any, ttl = 5 * 60 * 1000) => {
  if (typeof window === 'undefined') return;
  const item = {
    data,
    timestamp: Date.now(),
    ttl
  };
  localStorage.setItem(key, JSON.stringify(item));
};

export const isCacheValid = (key: string): boolean => {
  if (typeof window === 'undefined') return false;
  const item = localStorage.getItem(key);
  if (!item) return false;
  
  const { timestamp, ttl } = JSON.parse(item);
  return Date.now() - timestamp < ttl;
};

export function getValidCacheData<T>(cacheKey: string) {
  if (isCacheValid(cacheKey)) {
    const cached = getCachedData<T>(cacheKey);
    if (cached) return cached.data;
  }
  return null;
}

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
  sapiQuery: HewanQuery 
  dombaQuery: HewanQuery
  productsQuery: {
    data: ProdukHewan[]
    isLoading: boolean
    isError: boolean
    refetch: () => Promise<any>
  }
  errorLogsQuery: {
    data: ErrorLog[]
    isLoading: boolean
    isError: boolean
    refetch: () => Promise<any>
  }
  // Product logs query
  productLogsQuery: {
    data: ProductLogWithProduct[]
    isLoading: boolean
    isError: boolean
    refetch: (options?: { produkId?: number; place?: Counter }) => Promise<any>
  }
  
  shipmentsQuery: {
    data: Shipment[]
    isLoading: boolean
    isError: boolean
    refetch: () => Promise<any>
  }
  penerimaQuery: {
    data: Penerima[]
    isLoading: boolean
    isError: boolean
    refetch: () => Promise<any>
  },
  distribusiQuery: {
    data: Distribusi[]
    isLoading: boolean
    isError: boolean
    refetch: () => Promise<any>
  },
  // Pagination metadata
  meta: {
    sapi: { total: number; target: number; slaughtered: number }
    domba: { total: number; target: number; slaughtered: number }
  }

  // Connection status
  isConnected: boolean
  // Methods for updating data
  updateHewan: (data: {
    hewanId: string
    status: HewanStatus
    slaughtered: boolean
    receivedByMdhohi?: boolean
    onInventory?: boolean
    tipeId: number
  }) => void

  updateProduct: (data: {
    productId: number
    operation: "menambahkan" | "memindahkan" | "mengkoreksi"
    place: Counter
    value: number
    note?: string
  }) => void

  // Shipment methods
  createShipment: (products: ShipmentProduct[], note?: string) => Promise<Shipment | void>
  receiveShipment: (shipmentId: number, receivedProducts: { produkId: number; jumlah: number }[]) => Promise<{ success: boolean; discrepancies?: { produkId: number; expected: number; received: number }[] }>

  // Utility methods
  getProductById: (id: number) => ProdukHewan | undefined
  getProductsByType: (type: "daging" | "all") => ProdukHewan[]
  getProductLogsByPlace: (place: Counter) => ProductLogWithProduct[]
  getProductLogsByProduct: (produkId: number) => ProductLogWithProduct[]

  // Distribution methods
  createDistribusi: (data: {
    kategori: string;
    target: number;
  }) => Promise<Distribusi>;
  
  createPenerima: (data: {
    distribusiId: string;
    nama: string;
    diterimaOleh?: string;
    noIdentitas?: string;
    alamat?: string;
    telepon?: string;
    keterangan?: string;
    jenis: JenisDistribusi;
    noKupon?: string;
    produkDistribusi: { produkId: number; jumlah: number }[];
  }) => Promise<Penerima>;
  getAvailableProducts: () => ProdukHewan[];
  getPenerimaByJenis: (jenis: JenisDistribusi) => Penerima[];
  getLogDistribusiByPenerima: (penerimaId: string) => LogDistribusi[];
  updateLogDistribusi: (penerimaId: string, produk: { produkId: number; jumlah: number }[]) => Promise<void>;
   // Group proposal functions
  // getGroupProposals: () => Penerima[];
  // submitGroupProposal: (data: {
  //   distribusiId: string;
  //   namaKelompok: string;
  //   penanggungJawab: string;
  //   produkDistribusi: { produkId: number; jumlah: number }[];
  //   alamat?: string;
  //   telepon?: string;
  //   keterangan?: string;
  // }) => Promise<void>;
  updateKuponReceived: (args: { penerimaId: string; diterima: boolean }) => void;
  updateMudhohi: (args: {hewanId: string, received: boolean}) => void;

}
