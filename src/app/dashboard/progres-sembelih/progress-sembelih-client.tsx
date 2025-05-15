"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useSocket } from "@/contexts/socket-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/hooks/use-toast"
import { updateHewanStatus } from "./actions"
import { HewanStatus } from "@prisma/client"
import { Loader2 } from "lucide-react"

type HewanQurban = {
  id: string
  animalId: string
  status: HewanStatus
  slaughtered: boolean
  onInventory: boolean
  receivedByMdhohi: boolean
}

type TipeHewan = "Sapi" | "Domba"

type PaginationConfig = {
  useGroups: boolean
  itemsPerGroup?: number
  pageSize: number
}

interface ProgressSembelihProps {
  initialSapiData: HewanQurban[]
  initialDombaData: HewanQurban[]
}

interface ProgressProps {
  tipeHewan: TipeHewan
  socket?: any
  isConnected: boolean
  initialHewanData: HewanQurban[]
}

// Custom hook for pagination configuration only
const usePaginationConfig = (target: number, total: number): PaginationConfig => {
  return useMemo(() => {
    if (total > 100) {
      return { 
        useGroups: true, 
        itemsPerGroup: 50,
        pageSize: 10 
      }
    }
    if (target <= 100 && total <= 50) return { 
      useGroups: false, 
      pageSize: 10 
    }
    if (total > 50 && total <= 60) return { 
      useGroups: false, 
      pageSize: 15 
    }
    if (total > 60 && total <= 100) return { 
      useGroups: false, 
      pageSize: 20 
    }
    return { 
      useGroups: false, 
      pageSize: 10 
    }
  }, [target, total])
}

const ProgressTab = ({ tipeHewan, socket, isConnected, initialHewanData }: ProgressProps) => {
  const [currentPage, setCurrentPage] = useState(1)
  const [currentGroup, setCurrentGroup] = useState('A')
  const [isUpdating, setIsUpdating] = useState<string | null>(null)
  const [meta, setMeta] = useState({ target: 0, total: 0 })
  const [data, setData] = useState<HewanQurban[]>(initialHewanData)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const paginationConfig = usePaginationConfig(meta.target, meta.total)

  const fetchHewanPage = useCallback(async (
    page: number, 
    group?: string
  ): Promise<HewanQurban[]> => {
    setLoading(true)
    setError(null)
    
    try {
      // Fetch metadata if needed
      let currentMeta = meta
      
      if (meta.total === 0) {
        const metaRes = await fetch(`/api/hewan/meta?type=${tipeHewan}`)
        if (!metaRes.ok) throw new Error('Failed to fetch metadata')
        
        const metaData = await metaRes.json()
        
        let actualTarget = 0
        let actualTotal = 0
        
        if (Array.isArray(metaData)) {
          const typeData = metaData.find((item: any) => item.typeName === tipeHewan)
          if (typeData) {
            actualTarget = typeData.target
            actualTotal = typeData.total
          }
        } else {
          actualTarget = metaData.target || 0
          actualTotal = metaData.total || 0
        }
        
        currentMeta = { target: actualTarget, total: actualTotal }
        setMeta(currentMeta)
      }
      
      let actualPage = page
      
      if (paginationConfig.useGroups && group) {
        const groupIndex = group.charCodeAt(0) - 65
        const groupOffset = groupIndex * 50
        actualPage = Math.floor(groupOffset / paginationConfig.pageSize) + page
      }

      const res = await fetch(
        `/api/hewan?type=${tipeHewan}&page=${actualPage}&pageSize=${paginationConfig.pageSize}`
      )
      
      if (!res.ok) throw new Error('Failed to fetch data')
      
      const data: HewanQurban[] = await res.json()
      return data
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setError(errorMessage)
      toast({
        title: "Error",
        description: `Gagal memuat data ${tipeHewan}: ${errorMessage}`,
        variant: "destructive",
      })
      return []
    } finally {
      setLoading(false)
    }
  }, [tipeHewan, meta, paginationConfig])

  // Load metadata on mount
  useEffect(() => {
    const loadMeta = async () => {
      try {
        const res = await fetch(`/api/hewan/meta?type=${tipeHewan}`)
        const metaData = await res.json()
        
        if (Array.isArray(metaData)) {
          const typeData = metaData.find((item: any) => item.typeName === tipeHewan)
          if (typeData) {
            setMeta({ target: typeData.target, total: typeData.total })
          }
        } else {
          setMeta({ target: metaData.target || 0, total: metaData.total || 0 })
        }
      } catch (error) {
        console.error('Error loading metadata:', error)
        setMeta({ target: 0, total: 0 })
      }
    }
    loadMeta()
  }, [tipeHewan, setMeta])

  // Optimized socket handler
  useEffect(() => {
    if (!socket) return

    const handleUpdateHewan = (updateData: {
      animalId: string
      slaughtered: boolean
      tipeId: number
    }) => {
      console.log('Emitting test data:', updateData)
      // Only update if it's the correct animal type
      const correctType = (tipeHewan === "Sapi" && updateData.tipeId === 1) || 
                        (tipeHewan === "Domba" && updateData.tipeId === 2)
      
      if (!correctType) return
      
      setData((prev) => {
        const updatedIndex = prev.findIndex(item => item.animalId === updateData.animalId)
        if (updatedIndex === -1) return prev
        
        const newData = [...prev]
        newData[updatedIndex] = {
          ...newData[updatedIndex],
          slaughtered: updateData.slaughtered,
        }
        return newData
      })
    }

    socket.on("update-hewan", handleUpdateHewan)
    return () => {
      socket.off("update-hewan", handleUpdateHewan)
    }
  }, [socket, tipeHewan, setData])

  const handleSlaughteredChange = useCallback(async (
    animalId: string, 
    checked: boolean, 
    type: TipeHewan
  ) => {
    setIsUpdating(animalId)
    const previousData = [...data]
    
    try {
      // Optimistic update
      setData((prev) => {
        const index = prev.findIndex(item => item.animalId === animalId)
        if (index === -1) return prev
        
        const newData = [...prev]
        newData[index] = {
          ...newData[index],
          slaughtered: checked,
          status: checked ? HewanStatus.DISEMBELIH : HewanStatus.TERDAFTAR
        }
        return newData
      })
      
      // Send to server
      const status = checked ? HewanStatus.DISEMBELIH : HewanStatus.TERDAFTAR
      await updateHewanStatus(animalId, status, checked)

      // Emit socket event
      if (socket && isConnected) {
        console.log("sending data")
        socket.emit("update-hewan", {
          animalId,
          status,
          slaughtered: checked,
          tipeId: type === "Sapi" ? 1 : 2,
        })
      }
    } catch (error) {
      console.error("Error updating slaughtered status:", error)
      
      // Revert on error
      setData(previousData)
      
      toast({
        title: "Error",
        description: "Failed to update status. Please try again.",
        variant: "destructive",
      })
      // Revert local state on error
      setData((prev) =>
        prev.map((item) =>
          item.animalId === animalId
            ? { ...item, slaughtered: !checked, status: !checked ? HewanStatus.DISEMBELIH : HewanStatus.TERDAFTAR }
            : item
        )
      )
    } finally {
      setIsUpdating(null)
    }
  }, [data, socket, isConnected, setData])

  const loadData = useCallback(async (page: number, group?: string) => {
    const newData = await fetchHewanPage(page, group)
    setData(newData)
  }, [fetchHewanPage, setData])

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page)
    loadData(page, paginationConfig.useGroups ? currentGroup : undefined)
  }, [loadData, paginationConfig.useGroups, currentGroup])

  const handleGroupChange = useCallback((group: string) => {
    setCurrentGroup(group)
    setCurrentPage(1)
    loadData(1, group)
  }, [loadData])

  // Calculate total groups
  const totalGroups = Math.ceil(meta.total / 50)
  const groupButtons = useMemo(() => 
    Array.from({ length: totalGroups }, (_, i) => String.fromCharCode(65 + i)),
    [totalGroups]
  )

  // Calculate pages for current context
  const totalPages = paginationConfig.useGroups
    ? Math.ceil((paginationConfig.itemsPerGroup ?? 50) / paginationConfig.pageSize)
    : Math.ceil(meta.total / paginationConfig.pageSize)

  if (error) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-red-500">Error: {error}</p>
          <Button 
            onClick={() => loadData(currentPage, paginationConfig.useGroups ? currentGroup : undefined)}
            className="mt-4"
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Progres {tipeHewan}</CardTitle>
        
        {/* Pagination Controls */}
        <div className="space-y-4">
          {paginationConfig.useGroups && (
            <div className="flex gap-2 flex-wrap">
              {groupButtons.map((group) => (
                <Button
                  key={group}
                  variant={currentGroup === group ? "default" : "outline"}
                  onClick={() => handleGroupChange(group)}
                  disabled={loading}
                >
                  {group}
                </Button>
              ))}
            </div>
          )}
          
          <div className="flex gap-2 flex-wrap">
            {Array.from({ length: totalPages }, (_, i) => {
              const pageNum = i + 1
              const start = i * paginationConfig.pageSize + 1
              const end = Math.min(
                (i + 1) * paginationConfig.pageSize, 
                paginationConfig.useGroups 
                  ? paginationConfig.itemsPerGroup! 
                  : meta.total
              )
              
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  onClick={() => handlePageChange(pageNum)}
                  disabled={loading}
                >
                  {start} - {end}
                </Button>
              )
            })}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.map((hewan) => (
              <div 
                key={hewan.animalId} 
                className="p-4 border rounded-lg flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl" aria-label={tipeHewan}>
                    {tipeHewan === 'Sapi' ? '🐄' : '🐏'}
                  </span>
                  <span className="font-medium">{hewan.animalId}</span>
                </div>

                <StatusSwitch
                  label="Disembelih"
                  checked={hewan.slaughtered}
                  onCheckedChange={(checked) => 
                    handleSlaughteredChange(hewan.animalId, checked, tipeHewan)
                  }
                  disabled={isUpdating === hewan.animalId}
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

const StatusSwitch = ({ 
  label, 
  checked, 
  onCheckedChange, 
  disabled = false 
}: { 
  label: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
}) => (
  <div className="flex items-center gap-2">
    <Switch 
      checked={checked} 
      onCheckedChange={onCheckedChange} 
      disabled={disabled}
    />
    <Label className="text-sm select-none">
      {checked ? `Sudah ${label}` : `Belum ${label}`}
    </Label>
  </div>
)

export default function ProgressSembelih({
  initialSapiData,
  initialDombaData,
}: ProgressSembelihProps) {
  const [activeTab, setActiveTab] = useState<TipeHewan>('Sapi')
  const [tipeHewanList, setTipeHewanList] = useState<TipeHewan[]>(['Sapi', 'Domba'])
  const { socket, isConnected } = useSocket()

  // Load available animal types
  useEffect(() => {
    const loadTipeHewan = async () => {
      try {
        const res = await fetch('/api/hewan/meta')
        
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`)
        }
        
        const data = await res.json()
        
        if (!Array.isArray(data)) {
          throw new Error('Invalid response format')
        }
        
        const validTypes = data
          .filter((item: any) => item.typeName === 'Sapi' || item.typeName === 'Domba')
          .map((item: any) => item.typeName as TipeHewan)
        
        if (validTypes.length > 0) {
          setTipeHewanList(validTypes)
        }
      } catch (error) {
        console.error('Error loading tipe hewan:', error)
        // Keep default values on error
      }
    }
    loadTipeHewan()
  }, [])

  const connectionStatus = useMemo(() => (
    <div className="flex items-center gap-2">
      <div className={`h-3 w-3 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}></div>
      <span className="text-sm">{isConnected ? "Connected" : "Disconnected"}</span>
    </div>
  ), [isConnected])

  return (
    <div className="space-y-8">
      {connectionStatus}
      
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TipeHewan)}>
        <TabsList className="grid w-full grid-cols-2">
          {tipeHewanList.map((tipe) => (
            <TabsTrigger key={tipe} value={tipe}>
              {tipe}
            </TabsTrigger>
          ))}
        </TabsList>

        {tipeHewanList.map((tipe) => (
          <TabsContent key={tipe} value={tipe}>
            <ProgressTab 
              tipeHewan={tipe} 
              socket={socket} 
              isConnected={isConnected} 
              initialHewanData={tipe === 'Sapi' ? initialSapiData : initialDombaData} 
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}