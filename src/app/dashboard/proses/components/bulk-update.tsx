"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Search, ArrowRight, Loader2 } from "lucide-react"
import { HewanStatus } from "@prisma/client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface HewanQurban {
  id: string
  animalId: string
  type: string
  status: HewanStatus
}

export function BulkUpdateStatus() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [searchResults, setSearchResults] = useState<HewanQurban[]>([])
  const [selectedHewan, setSelectedHewan] = useState<string[]>([])

  const handleSearch = async () => {
    if (!searchTerm.trim()) return

    setIsSearching(true)
    try {
      // Simulate API call to search for animals
      // In a real app, you would call your API endpoint
      const response = await fetch(`/api/hewan/search?term=${encodeURIComponent(searchTerm)}`)
      const data = await response.json()

      if (data.success) {
        setSearchResults(data.data)
      } else {
        toast.error(data.message || "Gagal mencari hewan")
      }
    } catch (error) {
      console.error("Error searching for animals:", error)
      toast.error("Terjadi kesalahan saat mencari hewan")
    } finally {
      setIsSearching(false)
    }
  }

  const toggleSelectHewan = (animalId: string) => {
    setSelectedHewan((prev) => (prev.includes(animalId) ? prev.filter((id) => id !== animalId) : [...prev, animalId]))
  }

  const selectAll = () => {
    if (selectedHewan.length === searchResults.length) {
      setSelectedHewan([])
    } else {
      setSelectedHewan(searchResults.map((hewan) => hewan.animalId))
    }
  }

  const updateStatus = async () => {
    if (selectedHewan.length === 0) {
      toast.error("Pilih minimal satu hewan untuk diupdate")
      return
    }

    setIsUpdating(true)
    try {
      // Process each selected animal
      const results = await Promise.all(
        selectedHewan.map((animalId) =>
          fetch("/api/hewan/update-status", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ animalId }),
          }).then((res) => res.json()),
        ),
      )

      const successCount = results.filter((result) => result.success).length
      const failCount = results.length - successCount

      if (successCount > 0) {
        toast.success(`Berhasil mengupdate ${successCount} hewan`)
        // Refresh the page to show updated data
        router.refresh()
        // Clear selection
        setSelectedHewan([])
        // Refresh search results
        if (searchTerm) handleSearch()
      }

      if (failCount > 0) {
        toast.error(`Gagal mengupdate ${failCount} hewan`)
      }
    } catch (error) {
      console.error("Error updating animal status:", error)
      toast.error("Terjadi kesalahan saat mengupdate status hewan")
    } finally {
      setIsUpdating(false)
    }
  }

  const getStatusBadge = (status: HewanStatus) => {
    switch (status) {
      case HewanStatus.TERDAFTAR:
        return <Badge variant="outline">Terdaftar</Badge>
      case HewanStatus.TIBA:
        return <Badge variant="outline">Tiba</Badge>
      case HewanStatus.SEHAT:
        return <Badge variant="secondary">Sehat</Badge>
      case HewanStatus.SAKIT:
        return <Badge variant="destructive">Sakit</Badge>
      case HewanStatus.DISEMBELIH:
        return <Badge variant="warning">Disembelih</Badge>
      case HewanStatus.DICACAH:
        return <Badge variant="success">Dicacah</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getNextStatus = (status: HewanStatus) => {
    const statusProgression: HewanStatus[] = [
      HewanStatus.TERDAFTAR,
      HewanStatus.TIBA,
      HewanStatus.SEHAT,
      HewanStatus.DISEMBELIH,
      HewanStatus.DICACAH,
    ]

    const currentIndex = statusProgression.indexOf(status)
    if (currentIndex === -1 || currentIndex === statusProgression.length - 1) {
      return null
    }

    return statusProgression[currentIndex + 1]
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Update Status Hewan</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Cari berdasarkan ID hewan..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} disabled={isSearching}>
              {isSearching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Mencari...
                </>
              ) : (
                "Cari"
              )}
            </Button>
          </div>

          {searchResults.length > 0 && (
            <div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300"
                          checked={selectedHewan.length === searchResults.length && searchResults.length > 0}
                          onChange={selectAll}
                        />
                      </TableHead>
                      <TableHead>ID Hewan</TableHead>
                      <TableHead>Jenis</TableHead>
                      <TableHead>Status Saat Ini</TableHead>
                      <TableHead>Status Berikutnya</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searchResults.map((hewan) => {
                      const nextStatus = getNextStatus(hewan.status)
                      return (
                        <TableRow key={hewan.id}>
                          <TableCell>
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-gray-300"
                              checked={selectedHewan.includes(hewan.animalId)}
                              onChange={() => toggleSelectHewan(hewan.animalId)}
                              disabled={!nextStatus}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{hewan.animalId}</TableCell>
                          <TableCell>{hewan.type}</TableCell>
                          <TableCell>{getStatusBadge(hewan.status)}</TableCell>
                          <TableCell>
                            {nextStatus ? (
                              <div className="flex items-center gap-2">
                                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                {getStatusBadge(nextStatus)}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">Status akhir</span>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      </CardContent>
      {searchResults.length > 0 && (
        <CardFooter className="bg-muted/50 flex justify-between">
          <div className="text-sm text-muted-foreground">
            {selectedHewan.length} dari {searchResults.length} hewan dipilih
          </div>
          <Button onClick={updateStatus} disabled={selectedHewan.length === 0 || isUpdating}>
            {isUpdating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Mengupdate...
              </>
            ) : (
              "Update Status"
            )}
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}
