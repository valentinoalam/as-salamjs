import type { JenisDistribusi } from "@prisma/client"
import type { PenerimaQueryResult, DistribusiQueryResult, MudhohiQueryResult, Distribusi, Penerima, ProdukHewan, LogDistribusi } from "./qurban"

export interface DistribusiContextType {
  // Data states and loading
  penerimaQuery: PenerimaQueryResult
  distribusiQuery: DistribusiQueryResult
  mudhohiQuery: MudhohiQueryResult

  // Connection status
  isConnected: boolean

  // Distribution methods
  createDistribusi: (data: {
    kategori: string
    target: number
  }) => Promise<Distribusi>

  createPenerima: (data: {
    distribusiId: string
    nama: string
    diterimaOleh?: string
    noIdentitas?: string
    alamat?: string
    telepon?: string
    keterangan?: string
    jenis: JenisDistribusi
    kuponId?: string
    jumlahKupon?: number
    produkDistribusi: { produkId: number; jumlah: number }[]
  }) => Promise<Penerima>

  getAvailableProducts: ProdukHewan[]
  getPenerimaByJenis: (jenis: JenisDistribusi) => Penerima[]
  getLogDistribusiByPenerima: (penerimaId: string) => LogDistribusi[]
  updateLogDistribusi: (penerimaId: string, produk: { produkId: number; jumlah: number }[]) => Promise<void>
  updateKuponReceived: (args: { penerimaId: string; diterima: boolean }) => void
  updateMudhohi: (args: { hewanId: string; received: boolean }) => void
}