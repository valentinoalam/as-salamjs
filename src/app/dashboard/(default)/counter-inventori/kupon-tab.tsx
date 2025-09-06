import React, { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { exportToExcel } from '#@/lib/utils/excel.ts'
import type { Penerima } from '@/types/qurban'
import { Download } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { JenisDistribusi } from '@prisma/client'
import { useDistribusi } from '@/hooks/qurban/use-distribusi'

const KuponContentTab = () => {
  const {
    penerimaQuery,
    getPenerimaByJenis,
    updateKuponReceived
  } = useDistribusi()
  const penerimaIndividu = useMemo(() => 
    getPenerimaByJenis(JenisDistribusi.INDIVIDU), 
    [getPenerimaByJenis]
  );
  // Handle kupon received status update
  const handleKuponReceived = async (penerimaId: string) => {
    updateKuponReceived({ penerimaId, diterima: true })
    toast({
      title: "Kupon Dikembalikan",
      description: "Status kupon telah diperbarui",
    });
  }
    // Export penerima data to Excel
  const handleExportPenerimaToExcel = () => {
    const data = penerimaQuery.data
      .filter((p: Penerima) => p.kuponId)
      .map((p: Penerima) => ({
        ID: p.id,
        "No Kupon": p.kuponId || "-",
        Penerima: p.diterimaOleh || "-",
        Kategori: p.distribusi?.kategori || "-",
        Status: p.logDistribusi ? "Sudah DiRETURNEDkan" : "Belum DiRETURNEDkan",
      }))

    exportToExcel(data, "penerima_kupon")
  }

  if (penerimaQuery.isLoading) {
    return <div>Loading...</div>
  }
  
  if (penerimaQuery.isError) {
    return <div>Error loading data</div>
  }
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Pengembalian Kupon</CardTitle>
            <CardDescription>Pencatatan pengembalian kupon oleh penerima</CardDescription>
          </div>
          <Button variant="outline" onClick={handleExportPenerimaToExcel}>
            <Download size={16} className="mr-2" /> Ekspor
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nomor Kupon</TableHead>
                <TableHead>Penerima</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {penerimaIndividu.map((penerima: Penerima) => (
                <TableRow key={penerima.id}>
                  <TableCell className="font-medium">{penerima.kuponId || "-"}</TableCell>
                  <TableCell>{penerima.nama}</TableCell>
                  <TableCell>{penerima.distribusi?.kategori || "-"}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={penerima.logDistribusi ? "default" : "outline"}
                    >
                      {penerima.logDistribusi ? "Terverifikasi" : "Belum Diverifikasi"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {!penerima.logDistribusi && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleKuponReceived(penerima.id)}
                      >
                        Tandai DiRETURNEDkan
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              
              {penerimaIndividu.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Tidak ada data kupon
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

export default KuponContentTab