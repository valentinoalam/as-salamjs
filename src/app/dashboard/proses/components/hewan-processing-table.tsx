"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { type HewanQurban, HewanStatus } from "@prisma/client"
import { toast } from "sonner"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { markAsSembelih, markAsCacah } from "../actions"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface HewanProcessingTableProps {
  data: HewanQurban[]
}

export function HewanProcessingTable({ data }: HewanProcessingTableProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [selectedHewan, setSelectedHewan] = useState<HewanQurban | null>(null)
  const [dialogAction, setDialogAction] = useState<"sembelih" | "cacah" | null>(null)
  const [meatPackageCount, setMeatPackageCount] = useState<number>(0)

  const handleMarkAsSembelih = async () => {
    if (!selectedHewan) return

    setIsLoading(true)
    try {
      await markAsSembelih(selectedHewan.id)
      toast.success(`Hewan ID ${selectedHewan.hewanId} berhasil ditandai sebagai sudah disembelih`)
      router.refresh()
    } catch (error) {
      toast.error("Gagal mengubah status hewan")
      console.error(error)
    } finally {
      setIsLoading(false)
      setSelectedHewan(null)
      setDialogAction(null)
    }
  }

  const handleMarkAsCacah = async () => {
    if (!selectedHewan) return

    setIsLoading(true)
    try {
      await markAsCacah(selectedHewan.id, meatPackageCount)
      toast.success(`Hewan ID ${selectedHewan.hewanId} berhasil ditandai sebagai sudah dicacah`)
      router.refresh()
    } catch (error) {
      toast.error("Gagal mengubah status hewan")
      console.error(error)
    } finally {
      setIsLoading(false)
      setSelectedHewan(null)
      setDialogAction(null)
      setMeatPackageCount(0)
    }
  }

  const getStatusBadge = (status: HewanStatus) => {
    switch (status) {
      case HewanStatus.TIBA:
        return <Badge variant="outline">Tiba</Badge>
      case HewanStatus.SEHAT:
        return <Badge variant="secondary">Sehat</Badge>
      case HewanStatus.DISEMBELIH:
        return <Badge variant="warning">Disembelih</Badge>
      case HewanStatus.DICACAH:
        return <Badge variant="success">Dicacah</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID Hewan</TableHead>
            <TableHead>Jenis</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                Tidak ada data hewan
              </TableCell>
            </TableRow>
          ) : (
            data.map((hewan) => (
              <TableRow key={hewan.id}>
                <TableCell className="font-medium">{hewan.hewanId}</TableCell>
                <TableCell>{hewan.type}</TableCell>
                <TableCell>{getStatusBadge(hewan.status)}</TableCell>
                <TableCell className="text-right">
                  {(hewan.status === HewanStatus.TIBA || hewan.status === HewanStatus.SEHAT) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedHewan(hewan)
                        setDialogAction("sembelih")
                      }}
                    >
                      Tandai Sembelih
                    </Button>
                  )}

                  {hewan.status === HewanStatus.DISEMBELIH && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedHewan(hewan)
                        setDialogAction("cacah")
                      }}
                    >
                      Tandai Cacah
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Confirmation Dialog for Sembelih */}
      <AlertDialog
        open={dialogAction === "sembelih" && !!selectedHewan}
        onOpenChange={(open) => !open && setSelectedHewan(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Penyembelihan</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menandai hewan {selectedHewan?.hewanId} sebagai sudah disembelih?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleMarkAsSembelih} disabled={isLoading}>
              {isLoading ? "Memproses..." : "Konfirmasi"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation Dialog for Cacah with Package Count */}
      <AlertDialog
        open={dialogAction === "cacah" && !!selectedHewan}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedHewan(null)
            setDialogAction(null)
            setMeatPackageCount(0)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Pencacahan</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menandai hewan {selectedHewan?.hewanId} sebagai sudah dicacah?
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4">
            <Label htmlFor="packageCount">Jumlah Paket Daging</Label>
            <Input
              id="packageCount"
              type="number"
              min={0}
              value={meatPackageCount}
              onChange={(e) => setMeatPackageCount(Number.parseInt(e.target.value) || 0)}
              className="mt-2"
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleMarkAsCacah} disabled={isLoading}>
              {isLoading ? "Memproses..." : "Konfirmasi"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
