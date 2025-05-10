"use client"

import { useState, useEffect } from "react"
import { useSocket } from "@/lib/socket"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import { updateHewanStatus, updateMudhohiReceived } from "./actions"
import { HewanStatus } from "@prisma/client"
import { Download } from "lucide-react"
import { exportToExcel } from "@/lib/excel"
type HewanQurban = {
  id: string
  animalId: number
  status: HewanStatus
  slaughtered: boolean
  receivedByMdhohi: boolean
}

interface ProgressSembelihProps {
  initialSapiData: HewanQurban[]
  initialKambingData: HewanQurban[]
  sapiPages: number
  kambingPages: number
  kambingGroups: string[]
}

export default function ProgressSembelih({
  initialSapiData,
  initialKambingData,
  sapiPages,
  kambingPages,
  kambingGroups,
}: ProgressSembelihProps) {
  const [sapiData, setSapiData] = useState<HewanQurban[]>(initialSapiData)
  const [kambingData, setKambingData] = useState<HewanQurban[]>(initialKambingData)
  const [sapiPage, setSapiPage] = useState(1)
  const [kambingPage, setKambingPage] = useState(1)
  const [kambingGroup, setKambingGroup] = useState("A")
  const [loading, setLoading] = useState(false)
  const { socket, isConnected } = useSocket()

  useEffect(() => {
    if (!socket) return

    const handleUpdateHewan = (data: {
      animalId: number
      status: HewanStatus
      slaughtered: boolean
      receivedByMdhohi: boolean
      tipeId: number
    }) => {
      if (data.tipeId === 1) {
        // Sapi
        setSapiData((prev) =>
          prev.map((item) =>
            item.animalId === data.animalId
              ? { ...item, status: data.status, slaughtered: data.slaughtered, receivedByMdhohi: data.receivedByMdhohi }
              : item,
          ),
        )
      } else if (data.tipeId === 2) {
        // Kambing
        setKambingData((prev) =>
          prev.map((item) =>
            item.animalId === data.animalId
              ? { ...item, status: data.status, slaughtered: data.slaughtered, receivedByMdhohi: data.receivedByMdhohi }
              : item,
          ),
        )
      }
    }

    socket.on("update-hewan", handleUpdateHewan)

    return () => {
      socket.off("update-hewan", handleUpdateHewan)
    }
  }, [socket])

  const fetchSapiPage = async (page: number) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/hewan?type=sapi&page=${page}&pageSize=10`)
      const data = await res.json()
      setSapiData(data)
      setSapiPage(page)
    } catch (error) {
      console.error("Error fetching sapi data:", error)
      toast({
        title: "Error",
        description: "Failed to fetch sapi data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchKambingPage = async (page: number, group?: string) => {
    setLoading(true)
    try {
      // Calculate the actual page based on the group and page
      let actualPage = page
      if (group) {
        const groupIndex = group.charCodeAt(0) - 65 // A=0, B=1, etc.
        actualPage = groupIndex * 5 + page // 5 pages per group (50 kambing / 10 per page)
      }

      const res = await fetch(`/api/hewan?type=kambing&page=${actualPage}&pageSize=10`)
      const data = await res.json()
      setKambingData(data)
      setKambingPage(page)
      if (group) setKambingGroup(group)
    } catch (error) {
      console.error("Error fetching kambing data:", error)
      toast({
        title: "Error",
        description: "Failed to fetch kambing data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSlaughteredChange = async (animalId: number, checked: boolean, type: "sapi" | "kambing") => {
    try {
      // Update local state immediately for responsive UI
      if (type === "sapi") {
        setSapiData((prev) =>
          prev.map((item) =>
            item.animalId === animalId
              ? { ...item, slaughtered: checked, status: checked ? HewanStatus.DISEMBELIH : HewanStatus.TERDAFTAR }
              : item,
          ),
        )
      } else {
        setKambingData((prev) =>
          prev.map((item) =>
            item.animalId === animalId
              ? { ...item, slaughtered: checked, status: checked ? HewanStatus.DISEMBELIH : HewanStatus.TERDAFTAR }
              : item,
          ),
        )
      }

      // Send to server
      const status = checked ? HewanStatus.DISEMBELIH : HewanStatus.TERDAFTAR
      await updateHewanStatus(animalId, status, checked)

      // Emit socket event
      if (socket && isConnected) {
        socket.emit("update-hewan", {
          animalId,
          status,
          slaughtered: checked,
          tipeId: type === "sapi" ? 1 : 2,
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
      if (type === "sapi") {
        setSapiData((prev) =>
          prev.map((item) =>
            item.animalId === animalId
              ? { ...item, slaughtered: !checked, status: !checked ? HewanStatus.DISEMBELIH : HewanStatus.TERDAFTAR }
              : item,
          ),
        )
      } else {
        setKambingData((prev) =>
          prev.map((item) =>
            item.animalId === animalId
              ? { ...item, slaughtered: !checked, status: !checked ? HewanStatus.DISEMBELIH : HewanStatus.TERDAFTAR }
              : item,
          ),
        )
      }
    }
  }

  const handleReceivedChange = async (animalId: number, checked: boolean, type: "sapi" | "kambing") => {
    try {
      // Update local state immediately for responsive UI
      if (type === "sapi") {
        setSapiData((prev) =>
          prev.map((item) => (item.animalId === animalId ? { ...item, receivedByMdhohi: checked } : item)),
        )
      } else {
        setKambingData((prev) =>
          prev.map((item) => (item.animalId === animalId ? { ...item, receivedByMdhohi: checked } : item)),
        )
      }

      // Send to server
      await updateMudhohiReceived(animalId, checked)

      // Emit socket event
      if (socket && isConnected) {
        socket.emit("update-hewan", {
          animalId,
          receivedByMdhohi: checked,
          tipeId: type === "sapi" ? 1 : 2,
        })
      }
    } catch (error) {
      console.error("Error updating received status:", error)
      toast({
        title: "Error",
        description: "Failed to update received status. Please try again.",
        variant: "destructive",
      })

      // Revert local state on error
      if (type === "sapi") {
        setSapiData((prev) =>
          prev.map((item) => (item.animalId === animalId ? { ...item, receivedByMdhohi: !checked } : item)),
        )
      } else {
        setKambingData((prev) =>
          prev.map((item) => (item.animalId === animalId ? { ...item, receivedByMdhohi: !checked } : item)),
        )
      }
    }
  }

  const handleExportSapiToExcel = () => {
    const data = sapiData.map((s) => ({
      ID: s.animalId,
      Status: s.status,
      "Sudah Disembelih": s.slaughtered ? "Ya" : "Tidak",
      "Jatah Diambil": s.receivedByMdhohi ? "Ya" : "Tidak",
    }))

    exportToExcel(data, "progres_sembelih_sapi")
  }

  const handleExportKambingToExcel = () => {
    const data = kambingData.map((k) => ({
      ID: k.animalId,
      Status: k.status,
      "Sudah Disembelih": k.slaughtered ? "Ya" : "Tidak",
      "Jatah Diambil": k.receivedByMdhohi ? "Ya" : "Tidak",
    }))

    exportToExcel(data, "progres_sembelih_kambing")
  }
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2">
        <div className={`h-3 w-3 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}></div>
        <span className="text-sm">{isConnected ? "Connected" : "Disconnected"}</span>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Progres Sapi</CardTitle>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={handleExportSapiToExcel}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            {Array.from({ length: sapiPages }, (_, i) => (
              <Button
                key={i}
                variant={sapiPage === i + 1 ? "default" : "outline"}
                size="sm"
                onClick={() => fetchSapiPage(i + 1)}
                disabled={loading}
              >
                {i * 10 + 1}-{Math.min((i + 1) * 10, sapiPages * 10)}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sapiData.map((sapi) => (
              <div key={sapi.id} className="flex items-center justify-between p-2 border rounded-md">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🐮 {sapi.animalId}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={sapi.slaughtered}
                      onCheckedChange={(checked) => handleSlaughteredChange(sapi.animalId, checked, "sapi")}
                    />
                    <Label>{sapi.slaughtered ? "Sudah" : "Belum"}</Label>
                  </div>

                  {sapi.slaughtered && (
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={sapi.receivedByMdhohi}
                        onCheckedChange={(checked) => handleReceivedChange(sapi.animalId, checked, "sapi")}
                      />
                      <Label>{sapi.receivedByMdhohi ? "Diambil" : "Belum"}</Label>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Progres Kambing</CardTitle>
          <div className="flex flex-col space-y-2">
            <div className="flex space-x-2 justify-end">
              <Button variant="outline" size="sm" onClick={handleExportKambingToExcel}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              {kambingGroups.map((group) => (
                <Button
                  key={group}
                  variant={kambingGroup === group ? "default" : "outline"}
                  size="sm"
                  onClick={() => fetchKambingPage(1, group)}
                  disabled={loading}
                >
                  {group}
                </Button>
              ))}
            </div>
            <div className="flex space-x-2 justify-end">
              {Array.from({ length: 5 }, (_, i) => (
                <Button
                  key={i}
                  variant={kambingPage === i + 1 ? "default" : "outline"}
                  size="sm"
                  onClick={() => fetchKambingPage(i + 1, kambingGroup)}
                  disabled={loading}
                >
                  {i * 10 + 1}-{Math.min((i + 1) * 10, 50)}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {kambingData.map((kambing) => (
              <div key={kambing.id} className="flex items-center justify-between p-2 border rounded-md">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🐐 {kambing.animalId}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={kambing.slaughtered}
                      onCheckedChange={(checked) => handleSlaughteredChange(kambing.animalId, checked, "kambing")}
                    />
                    <Label>{kambing.slaughtered ? "Sudah" : "Belum"}</Label>
                  </div>

                  {kambing.slaughtered && (
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={kambing.receivedByMdhohi}
                        onCheckedChange={(checked) => handleReceivedChange(kambing.animalId, checked, "kambing")}
                      />
                      <Label>{kambing.receivedByMdhohi ? "Diambil" : "Belum"}</Label>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
