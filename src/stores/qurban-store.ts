import { create } from "zustand"
import { subscribeWithSelector } from "zustand/middleware"
import type { HewanQurban, Mudhohi, Pembayaran, TipeHewan, ProdukHewan } from "@prisma/client"

interface QurbanData {
  hewanQurban: HewanQurban[]
  mudhohi: Mudhohi[]
  pembayaran: Pembayaran[]
  tipeHewan: TipeHewan[]
  produkHewan: ProdukHewan[]
}

interface QurbanStats {
  totalHewan: number
  hewanDisembelih: number
  totalPembayaran: number
  totalDibayarkan: number
  hewanByStatus: Record<string, number>
  hewanByType: Record<string, number>
}

interface QurbanState extends QurbanData {
  // Stats
  stats: QurbanStats

  // Loading states
  isLoading: boolean
  isRefreshing: boolean

  // Error states
  error: string | null

  // Actions
  setData: (key: keyof QurbanData, data: any[]) => void
  addItem: (key: keyof QurbanData, item: any) => void
  updateItem: (key: keyof QurbanData, id: string, updates: any) => void
  removeItem: (key: keyof QurbanData, id: string) => void
  setLoading: (isLoading: boolean) => void
  setRefreshing: (isRefreshing: boolean) => void
  setError: (error: string | null) => void
  calculateStats: () => void
  refreshData: () => Promise<void>
}

export const useQurbanStore = create<QurbanState>()(
  subscribeWithSelector((set, get) => ({
    // Initial data
    hewanQurban: [],
    mudhohi: [],
    pembayaran: [],
    tipeHewan: [],
    produkHewan: [],

    // Initial stats
    stats: {
      totalHewan: 0,
      hewanDisembelih: 0,
      totalPembayaran: 0,
      totalDibayarkan: 0,
      hewanByStatus: {},
      hewanByType: {},
    },

    // Initial states
    isLoading: false,
    isRefreshing: false,
    error: null,

    // Actions
    setData: (key, data) =>
      set((state) => {
        const newState = { ...state, [key]: data }
        // Recalculate stats when data changes
        const stats = calculateStatsFromData(newState)
        return { ...newState, stats }
      }),

    addItem: (key, item) =>
      set((state) => {
        const newData = [...state[key], item]
        const newState = { ...state, [key]: newData }
        const stats = calculateStatsFromData(newState)
        return { ...newState, stats }
      }),

    updateItem: (key, id, updates) =>
      set((state) => {
        const newData = state[key].map((item: any) => (item.id === id ? { ...item, ...updates } : item))
        const newState = { ...state, [key]: newData }
        const stats = calculateStatsFromData(newState)
        return { ...newState, stats }
      }),

    removeItem: (key, id) =>
      set((state) => {
        const newData = state[key].filter((item: any) => item.id !== id)
        const newState = { ...state, [key]: newData }
        const stats = calculateStatsFromData(newState)
        return { ...newState, stats }
      }),

    setLoading: (isLoading) => set({ isLoading }),

    setRefreshing: (isRefreshing) => set({ isRefreshing }),

    setError: (error) => set({ error }),

    calculateStats: () =>
      set((state) => ({
        stats: calculateStatsFromData(state),
      })),

    refreshData: async () => {
      const { setRefreshing, setError } = get()

      try {
        setRefreshing(true)
        setError(null)

        // Fetch all data from APIs
        const [hewanRes, mudhohiRes, pembayaranRes, tipeRes, produkRes] = await Promise.all([
          fetch("/api/hewan"),
          fetch("/api/mudhohi"),
          fetch("/api/pembayaran"),
          fetch("/api/tipe-hewan"),
          fetch("/api/produk-hewan"),
        ])

        const [hewanData, mudhohiData, pembayaranData, tipeData, produkData] = await Promise.all([
          hewanRes.json(),
          mudhohiRes.json(),
          pembayaranRes.json(),
          tipeRes.json(),
          produkRes.json(),
        ])

        // Update store with new data
        set((state) => {
          const newState = {
            ...state,
            hewanQurban: hewanData,
            mudhohi: mudhohiData,
            pembayaran: pembayaranData,
            tipeHewan: tipeData,
            produkHewan: produkData,
          }

          return {
            ...newState,
            stats: calculateStatsFromData(newState),
          }
        })
      } catch (error) {
        setError(error instanceof Error ? error.message : "Failed to refresh data")
      } finally {
        setRefreshing(false)
      }
    },
  })),
)

// Helper function to calculate stats from current data
function calculateStatsFromData(state: QurbanData): QurbanStats {
  const { hewanQurban, pembayaran, tipeHewan } = state

  const totalHewan = hewanQurban.length
  const hewanDisembelih = hewanQurban.filter((h) => h.slaughtered).length
  const totalPembayaran = pembayaran.length
  const totalDibayarkan = pembayaran.reduce((sum, p) => sum + p.dibayarkan, 0)

  const hewanByStatus = hewanQurban.reduce(
    (acc, hewan) => {
      acc[hewan.status] = (acc[hewan.status] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  const hewanByType = hewanQurban.reduce(
    (acc, hewan) => {
      const tipe = tipeHewan.find((t) => t.id === hewan.tipeId)
      if (tipe) {
        acc[tipe.nama] = (acc[tipe.nama] || 0) + 1
      }
      return acc
    },
    {} as Record<string, number>,
  )

  return {
    totalHewan,
    hewanDisembelih,
    totalPembayaran,
    totalDibayarkan,
    hewanByStatus,
    hewanByType,
  }
}

// Subscribe to data changes and auto-refresh stats
useQurbanStore.subscribe(
  (state) => [state.hewanQurban, state.mudhohi, state.pembayaran],
  () => {
    useQurbanStore.getState().calculateStats()
  },
)
