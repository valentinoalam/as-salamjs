"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useSocket } from "@/contexts/socket-context"
import type {
  HewanQurban,
  ProdukHewan,
  Distribution,
  Penerima,
  Mudhohi,
  ErrorLog,
  ProgresSapi,
  ProgresDomba,
  HasilTimbang,
  Inventory,
  HewanStatus,
} from "@prisma/client"

// Define extended types with relationships
type HewanQurbanWithRelations = HewanQurban & {
  tipe?: {
    id: number
    nama: string
    icon: string | null
  }
}

type ProdukHewanWithRelations = ProdukHewan & {
  tipe_hewan?: {
    id: number
    nama: string
    icon: string | null
  } | null
}

type PenerimaWithRelations = Penerima & {
  category: {
    category: string
  }
  DistribusiLog?: any[]
}

type MudhohiWithRelations = Mudhohi & {
  hewan: HewanQurbanWithRelations[]
  payment?: any
}

type ErrorLogWithRelations = ErrorLog & {
  produk: ProdukHewanWithRelations
}

// Define the context state type
interface QurbanContextState {
  // Animals
  sapiData: HewanQurbanWithRelations[]
  dombaData: HewanQurbanWithRelations[]

  // Products
  produkHewan: ProdukHewanWithRelations[]
  produkDaging: ProdukHewanWithRelations[]

  // Distribution
  distributions: Distribution[]
  penerima: PenerimaWithRelations[]

  // Mudhohi (donors)
  mudhohi: MudhohiWithRelations[]

  // Progress tracking
  progresSapi: ProgresSapi[]
  progresDomba: ProgresDomba[]

  // Weight and inventory
  hasilTimbang: HasilTimbang[]
  inventory: Inventory[]

  // Error logs
  errorLogs: ErrorLogWithRelations[]

  // Loading states
  loading: {
    hewan: boolean
    produk: boolean
    distribution: boolean
    mudhohi: boolean
    progres: boolean
    timbang: boolean
    inventory: boolean
    errorLogs: boolean
  }

  // Pagination metadata
  meta: {
    sapi: { total: number; target: number }
    domba: { total: number; target: number }
    mudhohi: { total: number; pages: number }
    penerima: { total: number; pages: number }
  }

  // Refresh functions
  refreshHewan: (type: "Sapi" | "Domba", page?: number, pageSize?: number) => Promise<void>
  refreshProduk: () => Promise<void>
  refreshDistribution: () => Promise<void>
  refreshMudhohi: (page?: number, pageSize?: number) => Promise<void>
  refreshPenerima: (distributionId?: string) => Promise<void>
  refreshProgres: () => Promise<void>
  refreshTimbang: () => Promise<void>
  refreshInventory: () => Promise<void>
  refreshErrorLogs: () => Promise<void>
}

// Create the context with default values
const QurbanContext = createContext<QurbanContextState>({
  sapiData: [],
  dombaData: [],
  produkHewan: [],
  produkDaging: [],
  distributions: [],
  penerima: [],
  mudhohi: [],
  progresSapi: [],
  progresDomba: [],
  hasilTimbang: [],
  inventory: [],
  errorLogs: [],
  loading: {
    hewan: false,
    produk: false,
    distribution: false,
    mudhohi: false,
    progres: false,
    timbang: false,
    inventory: false,
    errorLogs: false,
  },
  meta: {
    sapi: { total: 0, target: 0 },
    domba: { total: 0, target: 0 },
    mudhohi: { total: 0, pages: 0 },
    penerima: { total: 0, pages: 0 },
  },
  refreshHewan: async () => {},
  refreshProduk: async () => {},
  refreshDistribution: async () => {},
  refreshMudhohi: async () => {},
  refreshPenerima: async () => {},
  refreshProgres: async () => {},
  refreshTimbang: async () => {},
  refreshInventory: async () => {},
  refreshErrorLogs: async () => {},
})

// Provider component
export const QurbanProvider = ({
  children,
  initialData,
}: {
  children: ReactNode
  initialData?: Partial<QurbanContextState>
}) => {
  // State for all data
  const [sapiData, setSapiData] = useState<HewanQurbanWithRelations[]>(initialData?.sapiData || [])
  const [dombaData, setDombaData] = useState<HewanQurbanWithRelations[]>(initialData?.dombaData || [])
  const [produkHewan, setProdukHewan] = useState<ProdukHewanWithRelations[]>(initialData?.produkHewan || [])
  const [produkDaging, setProdukDaging] = useState<ProdukHewanWithRelations[]>(initialData?.produkDaging || [])
  const [distributions, setDistributions] = useState<Distribution[]>(initialData?.distributions || [])
  const [penerima, setPenerima] = useState<PenerimaWithRelations[]>(initialData?.penerima || [])
  const [mudhohi, setMudhohi] = useState<MudhohiWithRelations[]>(initialData?.mudhohi || [])
  const [progresSapi, setProgresSapi] = useState<ProgresSapi[]>(initialData?.progresSapi || [])
  const [progresDomba, setProgresDomba] = useState<ProgresDomba[]>(initialData?.progresDomba || [])
  const [hasilTimbang, setHasilTimbang] = useState<HasilTimbang[]>(initialData?.hasilTimbang || [])
  const [inventory, setInventory] = useState<Inventory[]>(initialData?.inventory || [])
  const [errorLogs, setErrorLogs] = useState<ErrorLogWithRelations[]>(initialData?.errorLogs || [])

  // Loading states
  const [loading, setLoading] = useState({
    hewan: false,
    produk: false,
    distribution: false,
    mudhohi: false,
    progres: false,
    timbang: false,
    inventory: false,
    errorLogs: false,
  })

  // Metadata for pagination
  const [meta, setMeta] = useState({
    sapi: { total: 0, target: 0 },
    domba: { total: 0, target: 0 },
    mudhohi: { total: 0, pages: 0 },
    penerima: { total: 0, pages: 0 },
  })

  const { socket, isConnected } = useSocket()

  // Socket event handlers
  useEffect(() => {
    if (!socket) return

    // Hewan (animal) updates
    const handleSapiDataUpdated = (data: HewanQurbanWithRelations[]) => {
      setSapiData(data)
    }

    const handleDombaDataUpdated = (data: HewanQurbanWithRelations[]) => {
      setDombaData(data)
    }

    const handleHewanUpdated = (data: {
      animalId: string
      status?: HewanStatus
      slaughtered?: boolean
      onInventory?: boolean
      receivedByMdhohi?: boolean
      tipeId: number
    }) => {
      // Update the appropriate list based on animal type
      if (data.tipeId === 1) {
        // Sapi
        setSapiData((prev) =>
          prev.map((item) =>
            item.animalId === data.animalId
              ? {
                  ...item,
                  status: data.status !== undefined ? data.status : item.status,
                  slaughtered: data.slaughtered !== undefined ? data.slaughtered : item.slaughtered,
                  onInventory: data.onInventory !== undefined ? data.onInventory : item.onInventory,
                  receivedByMdhohi: data.receivedByMdhohi !== undefined ? data.receivedByMdhohi : item.receivedByMdhohi,
                }
              : item,
          ),
        )
      } else if (data.tipeId === 2) {
        // Domba
        setDombaData((prev) =>
          prev.map((item) =>
            item.animalId === data.animalId
              ? {
                  ...item,
                  status: data.status !== undefined ? data.status : item.status,
                  slaughtered: data.slaughtered !== undefined ? data.slaughtered : item.slaughtered,
                  onInventory: data.onInventory !== undefined ? data.onInventory : item.onInventory,
                  receivedByMdhohi: data.receivedByMdhohi !== undefined ? data.receivedByMdhohi : item.receivedByMdhohi,
                }
              : item,
          ),
        )
      }
    }

    // Product updates
    const handleProductsUpdated = (data: ProdukHewanWithRelations[]) => {
      setProdukHewan(data)
      setProdukDaging(data.filter((p) => p.jenisProduk === "DAGING"))
    }

    const handleProductUpdated = (data: ProdukHewanWithRelations) => {
      setProdukHewan((prev) => prev.map((item) => (item.id === data.id ? data : item)))
      setProdukDaging((prev) => {
        if (data.jenisProduk === "DAGING") {
          return prev.map((item) => (item.id === data.id ? data : item))
        }
        return prev
      })
    }

    // Distribution updates
    const handleDistributionsUpdated = (data: Distribution[]) => {
      setDistributions(data)
    }

    const handlePenerimaUpdated = (data: PenerimaWithRelations[]) => {
      setPenerima(data)
    }

    // Mudhohi updates
    const handleMudhohiUpdated = (data: MudhohiWithRelations[]) => {
      setMudhohi(data)
    }

    // Progress updates
    const handleProgresSapiUpdated = (data: ProgresSapi[]) => {
      setProgresSapi(data)
    }

    const handleProgresDombaUpdated = (data: ProgresDomba[]) => {
      setProgresDomba(data)
    }

    // Weight and inventory updates
    const handleHasilTimbangUpdated = (data: HasilTimbang[]) => {
      setHasilTimbang(data)
    }

    const handleInventoryUpdated = (data: Inventory[]) => {
      setInventory(data)
    }

    // Error logs updates
    const handleErrorLogsUpdated = (data: ErrorLogWithRelations[]) => {
      setErrorLogs(data)
    }

    // Register socket event listeners
    socket.on("Sapi-data-updated", handleSapiDataUpdated)
    socket.on("Domba-data-updated", handleDombaDataUpdated)
    socket.on("hewan-updated", handleHewanUpdated)
    socket.on("products-updated", handleProductsUpdated)
    socket.on("product-updated", handleProductUpdated)
    socket.on("distributions-updated", handleDistributionsUpdated)
    socket.on("penerima-updated", handlePenerimaUpdated)
    socket.on("mudhohi-updated", handleMudhohiUpdated)
    socket.on("progres-sapi-updated", handleProgresSapiUpdated)
    socket.on("progres-domba-updated", handleProgresDombaUpdated)
    socket.on("hasil-timbang-updated", handleHasilTimbangUpdated)
    socket.on("inventory-updated", handleInventoryUpdated)
    socket.on("error-logs-updated", handleErrorLogsUpdated)

    // Clean up event listeners on unmount
    return () => {
      socket.off("Sapi-data-updated", handleSapiDataUpdated)
      socket.off("Domba-data-updated", handleDombaDataUpdated)
      socket.off("hewan-updated", handleHewanUpdated)
      socket.off("products-updated", handleProductsUpdated)
      socket.off("product-updated", handleProductUpdated)
      socket.off("distributions-updated", handleDistributionsUpdated)
      socket.off("penerima-updated", handlePenerimaUpdated)
      socket.off("mudhohi-updated", handleMudhohiUpdated)
      socket.off("progres-sapi-updated", handleProgresSapiUpdated)
      socket.off("progres-domba-updated", handleProgresDombaUpdated)
      socket.off("hasil-timbang-updated", handleHasilTimbangUpdated)
      socket.off("inventory-updated", handleInventoryUpdated)
      socket.off("error-logs-updated", handleErrorLogsUpdated)
    }
  }, [socket])

  // Refresh functions
  const refreshHewan = async (type: "Sapi" | "Domba", page = 1, pageSize = 10) => {
    setLoading((prev) => ({ ...prev, hewan: true }))
    try {
      // Fetch metadata
      const metaRes = await fetch(`/api/hewan/meta?type=${type}`)
      const metaData = await metaRes.json()

      if (Array.isArray(metaData)) {
        const typeData = metaData.find((item: any) => item.typeName === type)
        if (typeData) {
          setMeta((prev) => ({
            ...prev,
            [type.toLowerCase()]: { total: typeData.total, target: typeData.target },
          }))
        }
      } else {
        setMeta((prev) => ({
          ...prev,
          [type.toLowerCase()]: { total: metaData.total || 0, target: metaData.target || 0 },
        }))
      }

      // Fetch hewan data
      const res = await fetch(`/api/hewan?type=${type}&page=${page}&pageSize=${pageSize}`)
      const data = await res.json()

      if (type === "Sapi") {
        setSapiData(data)
      } else {
        setDombaData(data)
      }
    } catch (error) {
      console.error(`Error fetching ${type} data:`, error)
    } finally {
      setLoading((prev) => ({ ...prev, hewan: false }))
    }
  }

  const refreshProduk = async () => {
    setLoading((prev) => ({ ...prev, produk: true }))
    try {
      const res = await fetch("/api/products")
      const data = await res.json()
      setProdukHewan(data)
      setProdukDaging(data.filter((p: ProdukHewanWithRelations) => p.jenisProduk === "DAGING"))
    } catch (error) {
      console.error("Error fetching products:", error)
    } finally {
      setLoading((prev) => ({ ...prev, produk: false }))
    }
  }

  const refreshDistribution = async () => {
    setLoading((prev) => ({ ...prev, distribution: true }))
    try {
      const res = await fetch("/api/distributions")
      const data = await res.json()
      setDistributions(data)
    } catch (error) {
      console.error("Error fetching distributions:", error)
    } finally {
      setLoading((prev) => ({ ...prev, distribution: false }))
    }
  }

  const refreshMudhohi = async (page = 1, pageSize = 10) => {
    setLoading((prev) => ({ ...prev, mudhohi: true }))
    try {
      // Fetch metadata
      const metaRes = await fetch("/api/mudhohi/count")
      const metaData = await metaRes.json()
      setMeta((prev) => ({
        ...prev,
        mudhohi: {
          total: metaData.count || 0,
          pages: Math.ceil((metaData.count || 0) / pageSize),
        },
      }))

      // Fetch mudhohi data
      const res = await fetch(`/api/mudhohi?page=${page}&pageSize=${pageSize}`)
      const data = await res.json()
      setMudhohi(data)
    } catch (error) {
      console.error("Error fetching mudhohi:", error)
    } finally {
      setLoading((prev) => ({ ...prev, mudhohi: false }))
    }
  }

  const refreshPenerima = async (distributionId?: string) => {
    setLoading((prev) => ({ ...prev, distribution: true }))
    try {
      const url = distributionId ? `/api/penerima?distributionId=${distributionId}` : "/api/penerima"

      const res = await fetch(url)
      const data = await res.json()
      setPenerima(data)

      // Update metadata
      setMeta((prev) => ({
        ...prev,
        penerima: {
          total: data.length,
          pages: Math.ceil(data.length / 10),
        },
      }))
    } catch (error) {
      console.error("Error fetching penerima:", error)
    } finally {
      setLoading((prev) => ({ ...prev, distribution: false }))
    }
  }

  const refreshProgres = async () => {
    setLoading((prev) => ({ ...prev, progres: true }))
    try {
      const sapiRes = await fetch("/api/progres/sapi")
      const sapiData = await sapiRes.json()
      setProgresSapi(sapiData)

      const dombaRes = await fetch("/api/progres/domba")
      const dombaData = await dombaRes.json()
      setProgresDomba(dombaData)
    } catch (error) {
      console.error("Error fetching progres:", error)
    } finally {
      setLoading((prev) => ({ ...prev, progres: false }))
    }
  }

  const refreshTimbang = async () => {
    setLoading((prev) => ({ ...prev, timbang: true }))
    try {
      const res = await fetch("/api/timbang")
      const data = await res.json()
      setHasilTimbang(data)
    } catch (error) {
      console.error("Error fetching hasil timbang:", error)
    } finally {
      setLoading((prev) => ({ ...prev, timbang: false }))
    }
  }

  const refreshInventory = async () => {
    setLoading((prev) => ({ ...prev, inventory: true }))
    try {
      const res = await fetch("/api/inventory")
      const data = await res.json()
      setInventory(data)
    } catch (error) {
      console.error("Error fetching inventory:", error)
    } finally {
      setLoading((prev) => ({ ...prev, inventory: false }))
    }
  }

  const refreshErrorLogs = async () => {
    setLoading((prev) => ({ ...prev, errorLogs: true }))
    try {
      const res = await fetch("/api/error-logs")
      const data = await res.json()
      setErrorLogs(data)
    } catch (error) {
      console.error("Error fetching error logs:", error)
    } finally {
      setLoading((prev) => ({ ...prev, errorLogs: false }))
    }
  }

  // Initial data loading
  useEffect(() => {
    const loadInitialData = async () => {
      if (!initialData) {
        await Promise.all([
          refreshHewan("Sapi"),
          refreshHewan("Domba"),
          refreshProduk(),
          refreshDistribution(),
          refreshMudhohi(),
          refreshPenerima(),
          refreshProgres(),
          refreshTimbang(),
          refreshInventory(),
          refreshErrorLogs(),
        ])
      }
    }

    loadInitialData()
  }, [])

  const contextValue: QurbanContextState = {
    sapiData,
    dombaData,
    produkHewan,
    produkDaging,
    distributions,
    penerima,
    mudhohi,
    progresSapi,
    progresDomba,
    hasilTimbang,
    inventory,
    errorLogs,
    loading,
    meta,
    refreshHewan,
    refreshProduk,
    refreshDistribution,
    refreshMudhohi,
    refreshPenerima,
    refreshProgres,
    refreshTimbang,
    refreshInventory,
    refreshErrorLogs,
  }

  return <QurbanContext.Provider value={contextValue}>{children}</QurbanContext.Provider>
}

// Custom hook to use the context
export const useQurban = () => useContext(QurbanContext)
