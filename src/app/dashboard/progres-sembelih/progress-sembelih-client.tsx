"use client"

import { useState, useEffect } from "react"
import { useSocket } from "@/lib/socket"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { updateHewanStatus, updateMudhohiReceived } from "./actions"
import { HewanStatus } from "@prisma/client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type HewanQurban = {
  id: string
  animalId: string
  status: HewanStatus
  slaughtered: boolean
  onInventory: boolean
  receivedByMdhohi: boolean
}

interface ProgressSembelihProps {
  initialSapiData: HewanQurban[]
  initialDombaData: HewanQurban[]
}

interface ProgressProps {
  tipeHewan: "Sapi" | "Domba"
  socket?: any
  isConnected: boolean
  initialHewanData: HewanQurban[]
}

const ProgressTab = ({ tipeHewan, socket, isConnected, initialHewanData }: ProgressProps) => {
  const [data, setData] = useState<HewanQurban[]>(initialHewanData)
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [currentGroup, setCurrentGroup] = useState('A')
  const [meta, setMeta] = useState({ target: 0, total: 0 })

  // Fungsi untuk menghitung paginasi dinamis
  const calculatePagination = (target: number, total: number) => {
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
  }

  // Modifikasi fetch function untuk SAPI
  const fetchHewanPage = async (
    tipeHewan: string, 
    page: number, 
    group?: string
  ): Promise<HewanQurban[]> => {
    setLoading(true)
    console.log(tipeHewan)
    try {
      const metaRes = await fetch(`/api/hewan/meta?type=${tipeHewan}`)
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
      
      const { useGroups, pageSize } = calculatePagination(actualTarget, actualTotal)
      let actualPage = page
      
      if (useGroups && group) {
        const groupIndex = group.charCodeAt(0) - 65
        const groupOffset = groupIndex * 50
        actualPage = Math.floor(groupOffset / pageSize) + page
      }

      const res = await fetch(
        `/api/hewan?type=${tipeHewan}&page=${actualPage}&pageSize=${pageSize}`
      )
      const data: HewanQurban[] = await res.json()
      console.log(data)
      return data
    } catch (error) {
      toast({
        title: "Error",
        description: `Gagal memuat data ${tipeHewan}`,
        variant: "destructive",
      })
      return []
    } finally {
      setLoading(false)
    }
  }

  const handleSlaughteredChange = async (animalId: string, checked: boolean, type: "Sapi" | "Domba") => {
    try {
      setData((prev) =>
        prev.map((item) =>
          item.animalId === animalId
            ? { ...item, slaughtered: checked, status: checked ? HewanStatus.DISEMBELIH : HewanStatus.TERDAFTAR }
            : item
        )
      )
      
      // Send to server
      const status = checked ? HewanStatus.DISEMBELIH : HewanStatus.TERDAFTAR
      await updateHewanStatus(animalId, status, checked)

      // Emit socket event
      if (socket && isConnected) {
        socket.emit("update-hewan", {
          animalId,
          status,
          slaughtered: checked,
          tipeId: type === "Sapi" ? 1 : 2,
        })
      }
    } catch (error) {
      console.error("Error updating slaughtered status:", error)
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
    }
  }

  useEffect(() => {
    const loadMeta = async () => {
      try {
        const res = await fetch(`/api/hewan/meta?type=${tipeHewan}`)
        const metaData = await res.json()
        console.log(metaData)
        if (Array.isArray(metaData)) {
          const typeData = metaData.find((item: any) => item.typeName === tipeHewan)
          if (typeData) {
            setMeta({ target: typeData.target, total: typeData.total })
          }
        } else {
          setMeta({ target: metaData.target || 0, total: metaData.total || 0 })
        }
      } catch (error) {
        setMeta({ target: 0, total: 0 })
      }
    }
    loadMeta()
  }, [tipeHewan])

  useEffect(() => {
    if (!socket) return

    const handleUpdateHewan = (data: {
      animalId: string
      status: HewanStatus
      slaughtered: boolean
      receivedByMdhohi: boolean
      tipeId: number
    }) => {
      setData((prev) =>
        prev.map((item) =>
          item.animalId === data.animalId
            ? { ...item, status: data.status, slaughtered: data.slaughtered, receivedByMdhohi: data.receivedByMdhohi }
            : item
        )
      )
    }

    socket.on("update-hewan", handleUpdateHewan)

    return () => {
      socket.off("update-hewan", handleUpdateHewan)
    }
  }, [socket])

  useEffect(() => {
    if (paginationConfig.useGroups && currentGroup !== 'A') {
      loadData(currentPage, currentGroup)
    }
  }, [currentGroup])

  const paginationConfig = calculatePagination(meta.target, meta.total)

  const loadData = async (page: number, group?: string) => {
    const newData = await fetchHewanPage(tipeHewan, page, group)
    setData(newData)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Progres {tipeHewan}</CardTitle>
        
        {/* Group Selector */}
        {paginationConfig.useGroups ? (
          <>
            <div className="flex gap-2 mb-4">
              {Array.from({ length: Math.ceil(meta.total / 50) }, (_, i) => {
                const group = String.fromCharCode(65 + i)
                return (
                  <Button
                    key={group}
                    variant={currentGroup === group ? "default" : "outline"}
                    onClick={() => {
                      setCurrentGroup(group)
                      setCurrentPage(1)
                      loadData(1, group)
                    }}
                    disabled={loading}
                  >
                    {group}
                  </Button>
                )
              })}
            </div>
            {/* Page Selection dalam Group */}
            <div className="flex gap-2">
              {Array.from(
                { length: Math.ceil(paginationConfig.itemsPerGroup! / paginationConfig.pageSize) }, 
                (_, i) => (
                  <Button
                    key={i + 1}
                    variant={currentPage === i + 1 ? "default" : "outline"}
                    onClick={() => {
                      setCurrentPage(i + 1)
                      loadData(i + 1, currentGroup)
                    }}
                    disabled={loading}
                  >
                    {i * paginationConfig.pageSize + 1} - 
                    {Math.min((i + 1) * paginationConfig.pageSize, paginationConfig.itemsPerGroup!)}
                  </Button>
                )
              )}
            </div>
          </>
        ) : (
          <div className="flex gap-2">
            {Array.from({ length: Math.ceil(meta.total / paginationConfig.pageSize) }, (_, i) => (
              <Button
                key={i + 1}
                variant={currentPage === i + 1 ? "default" : "outline"}
                onClick={() => {
                  setCurrentPage(i + 1)
                  loadData(i + 1)
                }}
                disabled={loading}
              >
                {i * paginationConfig.pageSize + 1} - 
                {Math.min((i + 1) * paginationConfig.pageSize, meta.total)}
              </Button>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="text-center py-4">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.map((hewan) => (
              <div key={hewan.id} className="p-4 border rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="font-medium">
                    {tipeHewan === 'Sapi' ? '🐄' : '🐏'} {hewan.animalId}
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <StatusSwitch
                    label="Disembelih"
                    checked={hewan.slaughtered}
                    onCheckedChange={(checked) => 
                      handleSlaughteredChange(hewan.animalId, checked, tipeHewan)
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function ProgressSembelih({
  initialSapiData,
  initialDombaData,
}: ProgressSembelihProps) {
  const [activeTab, setActiveTab] = useState('Sapi')
  const [tipeHewanList, setTipeHewanList] = useState<('Sapi' | 'Domba')[]>(['Sapi', 'Domba'])
  const { socket, isConnected } = useSocket()

  useEffect(() => {
    const loadTipeHewan = async () => {
      try {
        const res = await fetch('/api/hewan/meta')
        
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`)
        }
        
        const data = await res.json()
        
        // Validasi response
        if (!Array.isArray(data)) {
          throw new Error('Invalid response format')
        }
        
        const validTypes = data
          .filter((item: any) => item.typeName === 'Sapi' || item.typeName === 'Domba')
          .map((item: any) => item.typeName as 'Sapi' | 'Domba')
        
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

  return (
    <div className="space-y-8">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
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

      <Legend />
    </div>
  )
}

const StatusSwitch = ({ label, checked, onCheckedChange }: { 
  label: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) => (
  <div className="flex items-center gap-2">
    <Switch checked={checked} onCheckedChange={onCheckedChange} />
    <Label className="text-sm">{checked ? `Sudah ${label}` : `Belum ${label}`}</Label>
  </div>
)

const Legend = () => (
  <div className="p-4 border rounded-lg bg-muted flex gap-6">
    <div className="flex items-center gap-2">
      <div className="w-3 h-3 bg-green-500 rounded-full" />
      <span className="text-sm">Sudah Disembelih</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="w-3 h-3 bg-blue-500 rounded-full" />
      <span className="text-sm">Tersedia di Inventori</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="w-3 h-3 bg-purple-500 rounded-full" />
      <span className="text-sm">Sudah Diambil</span>
    </div>
  </div>
)