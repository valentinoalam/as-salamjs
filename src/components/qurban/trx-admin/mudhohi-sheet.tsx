/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useCallback, useEffect } from "react"
import { Plus, Trash2, Save, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/hooks/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { generateHewanId, getTipeHewan } from "@/services/mudhohi"

export interface MudhohiData {
  id?: string
  nama_pengqurban: string
  nama_peruntukan: string
  alamat: string
  pesan_khusus: string
  keterangan: string
  potong_sendiri: boolean
  ambil_daging: boolean
  mengambilDaging: boolean
  dash_code: string
  barcode_image: string
  createdAt: string
  cara_bayar: string
  paymentStatus: string
  hewan: string
  jumlahHewan: number
}

const defaultRow: MudhohiData = {
  nama_pengqurban: "",
  nama_peruntukan: "",
  alamat: "",
  pesan_khusus: "",
  keterangan: "",
  potong_sendiri: false,
  ambil_daging: false,
  mengambilDaging: false,
  dash_code: "",
  barcode_image: "",
  createdAt: new Date().toISOString().split("T")[0],
  cara_bayar: "",
  paymentStatus: "",
  hewan: "",
  jumlahHewan: 1,
}

export default function MudhohiSheet() {
  const [data, setData] = useState<MudhohiData[]>([
    { ...defaultRow, id: "1" },
    { ...defaultRow, id: "2" },
    { ...defaultRow, id: "3" },
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(false)

  const generateId = () => Math.random().toString(36).substr(2, 9)

  useEffect(() => {
    // Fetch existing data when component mounts
    fetchMudhohiData()
  }, [])

  const fetchMudhohiData = async () => {

    setIsFetching(true)
    try {
      const response = await fetch(`/api/mudhohi`)

      if (!response.ok) {
        throw new Error("Failed to fetch data")
      }

      const result = await response.json()

      if (result.data && result.data.length > 0) {
        // Transform data to match our component's format
        const formattedData = result.data.map((item: any) => ({
          id: item.id,
          nama_pengqurban: item.nama_pengqurban,
          nama_peruntukan: item.nama_peruntukan || "",
          alamat: item.alamat || "",
          pesan_khusus: item.pesan_khusus || "",
          keterangan: item.keterangan || "",
          potong_sendiri: item.potong_sendiri,
          ambil_daging: item.ambil_daging || false,
          mengambilDaging: item.mengambilDaging,
          dash_code: item.dash_code,
          barcode_image: item.barcode_image || "",
          createdAt: new Date(item.createdAt).toISOString().split("T")[0],
          cara_bayar: item.payment?.cara_bayar || "",
          paymentStatus: item.payment?.paymentStatus || "",
          hewan: item.hewan && item.hewan.length > 0 ? item.hewan[0].jenis.toLowerCase() : "",
          jumlahHewan: item.hewan ? item.hewan.length : 1,
        }))

        setData(formattedData)
      }
    } catch (error) {
      console.error("Error fetching data:", error)
      toast({
        title: "Error",
        description: "Failed to fetch existing data",
        variant: "destructive",
      })
    } finally {
      setIsFetching(false)
    }
  }

  const addRow = useCallback(() => {
    const newRow = { ...defaultRow, id: generateId() }
    setData((prev) => [...prev, newRow])
  }, [])

  const removeRow = useCallback((id: string) => {
    setData((prev) => prev.filter((row) => row.id !== id))
  }, [])

  const updateCell = useCallback((id: string, field: keyof MudhohiData, value: any) => {
    setData((prev) => prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)))
  }, [])

  const validateData = () => {
    const errors: string[] = []

    data.forEach((row, index) => {
      if (!row.nama_pengqurban.trim()) {
        errors.push(`Baris ${index + 1}: Nama pengqurban harus diisi`)
      }
      if (!row.dash_code.trim()) {
        errors.push(`Baris ${index + 1}: Kode dash harus diisi`)
      }
      if (!row.cara_bayar) {
        errors.push(`Baris ${index + 1}: Cara bayar harus dipilih`)
      }
      if (!row.paymentStatus) {
        errors.push(`Baris ${index + 1}: Status pembayaran harus dipilih`)
      }
      if (!row.hewan) {
        errors.push(`Baris ${index + 1}: Jenis hewan harus dipilih`)
      }
      if (row.jumlahHewan < 1) {
        errors.push(`Baris ${index + 1}: Jumlah hewan minimal 1`)
      }
    })

    return errors
  }

  /**
   *   const router = useRouter()
   * @returns   const handleSubmit = async (data: AdminQurbanFormValues) => {
         try {
           const result = await createMudhohi({
             ...data,
             tipeHewanId: Number.parseInt(data.tipeHewanId),
           })
           
           if (result.success) {
             toast({
               title: "Pengqurban Ditambahkan",
               description: "Data pengqurban berhasil ditambahkan ke sistem.",
             })
             router.push(`/dashboard/mudhohi`)
             return { success: true, mudhohiId: result.data.mudhohi.id }
           } else {
             throw new Error(`Failed to create qurban entry: ${result.error}`)
           }
         } catch (error) {
           console.error("Error submitting form:", error)
           toast({
             title: "Error",
             description: "Gagal menambahkan data pengqurban. Silahkan coba lagi.",
             variant: "destructive",
           })
           return { success: false, error: "Gagal menambahkan data pengqurban" }
         }
       }
   */
  const saveData = async () => {
    const errors = validateData()

    if (errors.length > 0) {
      toast({
        title: "Validasi Gagal",
        description: errors.join(", "),
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      // Process each row and save to database
      for (const row of data) {
        // Prepare data for API
        const mudhohiData = {
          nama_pengqurban: row.nama_pengqurban,
          nama_peruntukan: row.nama_peruntukan,
          alamat: row.alamat,
          pesan_khusus: row.pesan_khusus,
          keterangan: row.keterangan,
          potong_sendiri: row.potong_sendiri,
          ambil_daging: row.ambil_daging,
          mengambilDaging: row.mengambilDaging,
          dash_code: row.dash_code,
          barcode_image: row.barcode_image,
        }

        const pembayaranData = {
          cara_bayar: row.cara_bayar.toUpperCase(),
          paymentStatus: mapPaymentStatus(row.paymentStatus),
          dibayarkan: 0, // You might want to add a field for this
          urlTandaBukti: null,
          kodeResi: null,
        }
        const allTipeHewan = await getTipeHewan();
        
        // Create hewan records based on jumlahHewan
        const hewanData = [];
        for (let i = 0; i < row.jumlahHewan; i++) {
          const tipeHewan = allTipeHewan.find(
            (tipe) => tipe.nama.toUpperCase() === row.hewan.toUpperCase()
          );
          if (!tipeHewan) throw new Error(`Tipe hewan not found for: ${row.hewan}`);
          hewanData.push({
            status: "TERDAFTAR",
            keterangan: null,
            tipeId: tipeHewan.id,
            hewanId: await generateHewanId(tipeHewan, i),
            isKolektif: false,
          });
        }

        // Skip existing records (those with real IDs from database)
        if (row.id && row.id.length > 10) {
          continue
        }
        const data = {       
          ...mudhohiData,
          ...pembayaranData,
          ...hewanData
        }
        // Send to API
        const response = await fetch("/api/mudhohi", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Failed to save data")
        }
      }

      toast({
        title: "Data Berhasil Disimpan",
        description: `${data.length} data mudhohi berhasil disimpan`,
      })

      // Refresh data
      fetchMudhohiData()
    } catch (error: any) {
      console.error("Error saving data:", error)
      toast({
        title: "Gagal Menyimpan",
        description: error.message || "Terjadi kesalahan saat menyimpan data",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const mapPaymentStatus = (status: string): string => {
    const statusMap: Record<string, string> = {
      pending: "BELUM_BAYAR",
      partial: "MENUNGGU_KONFIRMASI",
      paid: "LUNAS",
      failed: "BATAL",
      lunas: "LUNAS",
      belum: "BELUM_BAYAR",
      menunggu: "MENUNGGU_KONFIRMASI",
      batal: "BATAL",
    }

    const normalizedStatus = status.toLowerCase()

    for (const [key, value] of Object.entries(statusMap)) {
      if (normalizedStatus.includes(key)) {
        return value
      }
    }

    return "BELUM_BAYAR" // Default
  }

  const exportToCSV = () => {
    const headers = [
      "Nama Pengqurban",
      "Nama Peruntukan",
      "Alamat",
      "Pesan Khusus",
      "Keterangan",
      "Potong Sendiri",
      "Ambil Daging",
      "Mengambil Daging",
      "Kode Dash",
      "Barcode Image",
      "Tanggal",
      "Cara Bayar",
      "Status Pembayaran",
      "Jenis Hewan",
      "Jumlah Hewan",
    ]

    const csvContent = [
      headers.join(","),
      ...data.map((row) =>
        [
          row.nama_pengqurban,
          row.nama_peruntukan,
          row.alamat,
          row.pesan_khusus,
          row.keterangan,
          row.potong_sendiri,
          row.ambil_daging,
          row.mengambilDaging,
          row.dash_code,
          row.barcode_image,
          row.createdAt,
          row.cara_bayar,
          row.paymentStatus,
          row.hewan,
          row.jumlahHewan,
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "data-mudhohi.csv"
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const addMultipleRows = () => {
    const newRows = Array.from({ length: 5 }, () => ({ ...defaultRow, id: generateId() }))
    setData((prev) => [...prev, ...newRows])
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Sheet Data Mudhohi</span>
            <div className="flex gap-2">
              <Button onClick={addRow} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Tambah Baris
              </Button>
              <Button onClick={addMultipleRows} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Tambah 5 Baris
              </Button>
              <Button onClick={exportToCSV} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button onClick={saveData} disabled={isLoading} size="sm">
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? "Menyimpan..." : "Simpan Semua"}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isFetching ? (
            <div className="flex justify-center items-center py-20">
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-4"></div>
                <p className="text-muted-foreground">Memuat data...</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">No</TableHead>
                    <TableHead className="min-w-[200px]">Nama Pengqurban*</TableHead>
                    <TableHead className="min-w-[180px]">Nama Peruntukan</TableHead>
                    <TableHead className="min-w-[200px]">Alamat</TableHead>
                    <TableHead className="min-w-[150px]">Jenis Hewan*</TableHead>
                    <TableHead className="min-w-[100px]">Jumlah</TableHead>
                    <TableHead className="min-w-[150px]">Cara Bayar*</TableHead>
                    <TableHead className="min-w-[150px]">Status Bayar*</TableHead>
                    <TableHead className="min-w-[120px]">Kode Dash*</TableHead>
                    <TableHead className="min-w-[100px]">Tanggal</TableHead>
                    <TableHead className="min-w-[120px]">Potong Sendiri</TableHead>
                    <TableHead className="min-w-[120px]">Ambil Daging</TableHead>
                    <TableHead className="min-w-[150px]">Sudah Ambil</TableHead>
                    <TableHead className="min-w-[200px]">Pesan Khusus</TableHead>
                    <TableHead className="min-w-[200px]">Keterangan</TableHead>
                    <TableHead className="min-w-[200px]">URL Barcode</TableHead>
                    <TableHead className="w-[80px]">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((row, index) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{index + 1}</TableCell>

                      <TableCell>
                        <Input
                          value={row.nama_pengqurban}
                          onChange={(e) => updateCell(row.id!, "nama_pengqurban", e.target.value)}
                          placeholder="Nama pengqurban"
                          className="min-w-[180px]"
                        />
                      </TableCell>

                      <TableCell>
                        <Input
                          value={row.nama_peruntukan}
                          onChange={(e) => updateCell(row.id!, "nama_peruntukan", e.target.value)}
                          placeholder="Nama peruntukan"
                          className="min-w-[160px]"
                        />
                      </TableCell>

                      <TableCell>
                        <Textarea
                          value={row.alamat}
                          onChange={(e) => updateCell(row.id!, "alamat", e.target.value)}
                          placeholder="Alamat"
                          className="min-w-[180px] min-h-[60px]"
                        />
                      </TableCell>

                      <TableCell>
                        <Select value={row.hewan} onValueChange={(value) => updateCell(row.id!, "hewan", value)}>
                          <SelectTrigger className="min-w-[130px]">
                            <SelectValue placeholder="Pilih hewan" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sapi">Sapi</SelectItem>
                            <SelectItem value="domba">Domba</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>

                      <TableCell>
                        <Input
                          type="number"
                          min="1"
                          value={row.jumlahHewan}
                          onChange={(e) => updateCell(row.id!, "jumlahHewan", Number.parseInt(e.target.value) || 1)}
                          className="min-w-[80px]"
                        />
                      </TableCell>

                      <TableCell>
                        <Select
                          value={row.cara_bayar}
                          onValueChange={(value) => updateCell(row.id!, "cara_bayar", value)}
                        >
                          <SelectTrigger className="min-w-[130px]">
                            <SelectValue placeholder="Cara bayar" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="tunai">Tunai</SelectItem>
                            <SelectItem value="transfer">Transfer</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>

                      <TableCell>
                        <Select
                          value={row.paymentStatus}
                          onValueChange={(value) => updateCell(row.id!, "paymentStatus", value)}
                        >
                          <SelectTrigger className="min-w-[130px]">
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="belum">Belum Bayar</SelectItem>
                            <SelectItem value="menunggu">Menunggu Konfirmasi</SelectItem>
                            <SelectItem value="lunas">Lunas</SelectItem>
                            <SelectItem value="batal">Batal</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>

                      <TableCell>
                        <Input
                          value={row.dash_code}
                          onChange={(e) => updateCell(row.id!, "dash_code", e.target.value)}
                          placeholder="Kode dash"
                          className="min-w-[100px]"
                        />
                      </TableCell>

                      <TableCell>
                        <Input
                          type="date"
                          value={row.createdAt}
                          onChange={(e) => updateCell(row.id!, "createdAt", e.target.value)}
                          className="min-w-[120px]"
                        />
                      </TableCell>

                      <TableCell>
                        <div className="flex justify-center">
                          <Checkbox
                            checked={row.potong_sendiri}
                            onCheckedChange={(checked) => updateCell(row.id!, "potong_sendiri", checked)}
                          />
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex justify-center">
                          <Checkbox
                            checked={row.ambil_daging}
                            onCheckedChange={(checked) => updateCell(row.id!, "ambil_daging", checked)}
                          />
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex justify-center">
                          <Checkbox
                            checked={row.mengambilDaging}
                            onCheckedChange={(checked) => updateCell(row.id!, "mengambilDaging", checked)}
                          />
                        </div>
                      </TableCell>

                      <TableCell>
                        <Textarea
                          value={row.pesan_khusus}
                          onChange={(e) => updateCell(row.id!, "pesan_khusus", e.target.value)}
                          placeholder="Pesan khusus"
                          className="min-w-[180px] min-h-[60px]"
                        />
                      </TableCell>

                      <TableCell>
                        <Textarea
                          value={row.keterangan}
                          onChange={(e) => updateCell(row.id!, "keterangan", e.target.value)}
                          placeholder="Keterangan"
                          className="min-w-[180px] min-h-[60px]"
                        />
                      </TableCell>

                      <TableCell>
                        <Input
                          value={row.barcode_image}
                          onChange={(e) => updateCell(row.id!, "barcode_image", e.target.value)}
                          placeholder="URL barcode"
                          className="min-w-[180px]"
                        />
                      </TableCell>

                      <TableCell>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removeRow(row.id!)}
                          disabled={data.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="mt-4 flex justify-between items-center text-sm text-muted-foreground">
            <span>Total: {data.length} baris data</span>
            <span>* Field wajib diisi</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
