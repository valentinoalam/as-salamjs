/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useCallback, useEffect, useMemo, useRef } from "react"
import { Plus, Trash2, Save, Download, Clipboard, AlertCircle, CheckCircle2, CheckCircle, FileSpreadsheet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/hooks/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getTipeHewan } from "#@/lib/server/repositories/mudhohi.ts"
import { z } from "zod"
import type { CaraBayar, PaymentStatus, TipeHewan } from "@prisma/client"
import { useRouter } from "next/navigation"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { MultiSelect } from "#@/components/ui/multi-select.tsx"
import { getProdukForAnimal } from "#@/lib/server/services/tipe-hewan.ts"

// Enhanced validation schemas
const EmailSchema = z.string().email("Format email tidak valid").optional().or(z.literal(""))
const PhoneSchema = z.string().regex(/^[0-9+\-\s()]{10,15}$/, "Format nomor telepon tidak valid").optional().or(z.literal(""))

const MudhohiRowSchema = z.object({
  nama_pengqurban: z.string().min(1, "Nama pengqurban wajib diisi").max(100, "Nama terlalu panjang"),
  nama_peruntukan: z.string().max(100, "Nama peruntukan terlalu panjang").optional(),
  email: EmailSchema,
  phone: PhoneSchema,
  alamat: z.string().max(200, "Alamat terlalu panjang").optional(),
  pesan_khusus: z.string().max(500, "Pesan khusus terlalu panjang").optional(),
  keterangan: z.string().max(500, "Keterangan terlalu panjang").optional(),
  potong_sendiri: z.boolean(),
  ambil_daging: z.boolean(),
  createdAt: z.string().min(1, "Tanggal wajib diisi"),
  cara_bayar: z.enum(["TUNAI", "TRANSFER"], { required_error: "Cara bayar wajib dipilih" }),
  paymentStatus: z.enum(["BELUM_BAYAR", "MENUNGGU_KONFIRMASI", "LUNAS", "BATAL"], { 
    required_error: "Status pembayaran wajib dipilih" 
  }),
  hewan: z.enum(["sapi", "domba"], { required_error: "Jenis hewan wajib dipilih" }),
  jumlahHewan: z.number().min(1, "Jumlah hewan minimal 1").max(100, "Jumlah hewan maksimal 100"),
  jatah_pengqurban: z.array(z.string())
  .max(2, "Maksimal 2 jenis produk")
  .optional(),
})

export interface MudhohiData {
  id?: string
  nama_pengqurban: string
  nama_peruntukan: string
  email: string
  phone: string
  alamat: string
  pesan_khusus: string
  keterangan: string
  potong_sendiri: boolean
  ambil_daging: boolean
  createdAt: string
  cara_bayar: string
  paymentStatus: string
  hewan: string
  isKolektif: boolean
  jumlahHewan: number
  jatah_pengqurban: string[] // Tambahkan field baru
}

interface ValidationError {
  rowId: string
  field: keyof MudhohiData
  message: string
}

const defaultRow: MudhohiData = {
  nama_pengqurban: "",
  nama_peruntukan: "",
  email: "",
  phone: "",
  alamat: "",
  pesan_khusus: "",
  keterangan: "",
  potong_sendiri: false,
  ambil_daging: false,
  createdAt: new Date().toISOString().split("T")[0],
  cara_bayar: "",
  paymentStatus: "",
  hewan: "",
  isKolektif: false,
  jumlahHewan: 1,
  jatah_pengqurban: [],
}

const CARA_BAYAR_OPTIONS = [
  { value: "TUNAI", label: "Tunai" },
  { value: "TRANSFER", label: "Transfer" },
] as const

const PAYMENT_STATUS_OPTIONS = [
  { value: "BELUM_BAYAR", label: "Belum Bayar" },
  { value: "MENUNGGU_KONFIRMASI", label: "Menunggu Konfirmasi" },
  { value: "LUNAS", label: "Lunas" },
  { value: "BATAL", label: "Batal" },
] as const


export const getJenisProdukLabel = (jenis: string) => {
  switch (jenis) {
    case "Daging":
      return "default"
    case "Tulang":
      return "outline"
    case "Jeroan":
      return "secondary"
    case "Kulit":
      return "destructive"
    default:
      return "outline"
  }
}
// Daftar opsi jatah pengqurban
// const JATAH_PENGQURBAN_OPTIONS = Object.entries(JenisProduk).map(([key, value]) => ({
//   value: key,
//   label: value,
//   className: '',
//   variant: getJenisProdukLabel(value)
// }));

export default function MudhohiSheet({availableHewan}: {availableHewan: TipeHewan[]}) {
  const router = useRouter()
  const HEWAN_OPTIONS = availableHewan.map(h => ({
    value: h.jenis.toLowerCase(),
    label: h.jenis.charAt(0).toUpperCase() + h.jenis.slice(1)
  }));
  const [data, setData] = useState<MudhohiData[]>([
    { ...defaultRow, id: "temp_1" },
    { ...defaultRow, id: "temp_2" },
    { ...defaultRow, id: "temp_3" },
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const [showValidationErrors, setShowValidationErrors] = useState(false) // State baru untuk kontrol tampilan error
  const [isDirty, setIsDirty] = useState(false)
  const [isPasteDialogOpen, setIsPasteDialogOpen] = useState(false)
  const [pastePreview, setPastePreview] = useState<string[][]>([])
  const [pasteError, setPasteError] = useState<string | null>(null)
  const [columnMapping, setColumnMapping] = useState<Record<number, keyof MudhohiData>>({})
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false)
  const tableRef = useRef<HTMLDivElement>(null)
  const generateId = () => `temp_${Math.random().toString(36).slice(2, 9)}`

  // Memoized validation results
  const validationResults = useMemo(() => {
    const errors: ValidationError[] = []
    const validRows: string[] = []

    data.forEach((row) => {
      try {
        MudhohiRowSchema.parse({
          ...row,
          cara_bayar: row.cara_bayar.toUpperCase(),
        })
        validRows.push(row.id!)
      } catch (error) {
        if (error instanceof z.ZodError) {
          error.errors.forEach((err) => {
            // Sederhanakan pesan error untuk select
            let message = err.message;
            if (err.message.includes("enum") || err.message.includes("invalid_type")) {
              message = "harus dipilih";
            }
            errors.push({
              rowId: row.id!,
              field: err.path[0] as keyof MudhohiData,
              message,
            })
          })
        }
      }
    })

    return { errors, validRows }
  }, [data])

  // Update validation errors when data changes
  useEffect(() => {
    setValidationErrors(validationResults.errors)
  }, [validationResults.errors])

  useEffect(() => {
    // Handle paste from clipboard
    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault()

      const clipboardData = e.clipboardData
      if (!clipboardData) return

      const text = clipboardData.getData("text")
      if (!text) return

      try {
        // Parse clipboard text
        const rows = parseClipboardText(text)

        if (rows.length === 0) {
          setPasteError("No data found in clipboard")
          return
        }

        // Show preview dialog
        setPastePreview(rows)
        setIsPasteDialogOpen(true)
        setPasteError(null)

        // Auto-detect column mapping
        const detectedMapping = detectColumnMapping(rows[0])
        setColumnMapping(detectedMapping)
      } catch (error) {
        console.error("Error parsing clipboard data:", error)
        setPasteError("Failed to parse clipboard data. Make sure it's in a valid format.")
      }
    }
    // Add paste event listener to the table
    const handleGlobalPaste = (e: ClipboardEvent) => {
      // Only handle paste if the target is inside the table
      if (tableRef.current && tableRef.current.contains(e.target as Node)) {
        handlePaste(e)
      }
    }

    fetchMudhohiData()
    document.addEventListener("paste", handleGlobalPaste)
    return () => {
      document.removeEventListener("paste", handleGlobalPaste)
    }
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
        const formattedData = result.data.map((item: any) => ({
          id: item.id,
          nama_pengqurban: item.nama_pengqurban || "",
          nama_peruntukan: item.nama_peruntukan || "",
          email: item.user?.email || "",
          phone: item.user?.phone || "",
          alamat: item.alamat || "",
          pesan_khusus: item.pesan_khusus || "",
          keterangan: item.keterangan || "",
          potong_sendiri: Boolean(item.potong_sendiri),
          ambil_daging: Boolean(item.ambil_daging || item.ambil_daging),
          createdAt: new Date(item.createdAt).toISOString().split("T")[0],
          cara_bayar: item.payment?.cara_bayar || "",
          paymentStatus: item.payment?.paymentStatus || "",
          hewan: item.hewan && item.hewan.length > 0 
            ? item.hewan[0].tipe?.nama?.toLowerCase() || "" 
            : "",
          isKolektif: item.isKolektif || false,
          jumlahHewan: item.hewan ? item.hewan.length : 1,
          jatah_pengqurban: item.jatah_pengqurban || [],
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
    setIsDirty(true)
  }, [])

  const removeRow = useCallback((id: string) => {
    setData((prev) => prev.filter((row) => row.id !== id))
    setIsDirty(true)
  }, [])

  const updateCell = useCallback((id: string, field: keyof MudhohiData, value: any) => {
    setData((prev) => prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)))
    setIsDirty(true)
  }, [])

  const addMultipleRows = useCallback(() => {
    const newRows = Array.from({ length: 5 }, () => ({ ...defaultRow, id: generateId() }))
    setData((prev) => [...prev, ...newRows])
    setIsDirty(true)
  }, [])

  const getRowErrors = (rowId: string) => {
    return validationErrors.filter(error => error.rowId === rowId)
  }

  const getFieldError = (rowId: string, field: keyof MudhohiData) => {
    return validationErrors.find(error => error.rowId === rowId && error.field === field)
  }

  const isRowValid = (rowId: string) => {
    return validationResults.validRows.includes(rowId)
  }

  const saveData = async () => {
    if (validationErrors.length > 0) {
      toast({
        title: "Validasi Gagal",
        description: `Ditemukan ${validationErrors.length} kesalahan. Periksa Kembali data Anda.`,
        variant: "destructive",
      })
      setShowValidationErrors(true); // Tampilkan error saat tombol simpan ditekan
    
      return
    }

    // Only save new rows (temporary IDs)
    const newRows = data.filter(row => row.id?.startsWith('temp_'))
    
    if (newRows.length === 0) {
      toast({
        title: "Tidak Ada Data Baru",
        description: "Semua data sudah tersimpan di database.",
      })
      return
    }

    setIsLoading(true)

    try {
      const allTipeHewan = await getTipeHewan()
      
      for (const row of newRows) {
        const tipeHewan = allTipeHewan.find(
          (tipe) => tipe.nama.toUpperCase() === row.hewan.toUpperCase()
        )
        
        if (!tipeHewan) {
          throw new Error(`Tipe hewan tidak ditemukan: ${row.hewan}`)
        }

        const mudhohiData = {
          nama_pengqurban: row.nama_pengqurban,
          nama_peruntukan: row.nama_peruntukan,
          email: row.email || undefined,
          phone: row.phone || undefined,
          alamat: row.alamat,
          pesan_khusus: row.pesan_khusus,
          keterangan: row.keterangan,
          potong_sendiri: row.potong_sendiri,
          ambil_daging: row.ambil_daging,
          tipeHewanId: tipeHewan.id,
          isKolektif: row.isKolektif,
          quantity: row.jumlahHewan,
          cara_bayar: row.cara_bayar as CaraBayar,
          paymentStatus: row.paymentStatus as PaymentStatus,
          dibayarkan: 0,
          urlTandaBukti: null,
          kodeResi: null,
          jatah_pengqurban: row.jatah_pengqurban,
        }

        const response = await fetch("/api/mudhohi", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(mudhohiData),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Failed to save data")
        }
      }

      toast({
        title: "Data Berhasil Disimpan",
        description: `${newRows.length} data mudhohi berhasil disimpan`,
      })

      setIsDirty(false)
      setShowValidationErrors(false)
      router.push(`/dashboard/mudhohi`)
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

  const exportToCSV = () => {
    const headers = [
      "Nama Pengqurban",
      "Nama Peruntukan", 
      "Email",
      "Phone",
      "Alamat",
      "Pesan Khusus",
      "Keterangan",
      "Potong Sendiri",
      "Ambil Daging",
      "Tanggal",
      "Cara Bayar",
      "Status Pembayaran",
      "Jenis Hewan",
      "Jumlah Hewan",
      "Jatah Qurban"
    ]

    const csvContent = [
      headers.join(","),
      ...data.map((row) =>
        [
          `"${row.nama_pengqurban}"`,
          `"${row.nama_peruntukan}"`,
          `"${row.email}"`,
          `"${row.phone}"`,
          `"${row.alamat}"`,
          `"${row.pesan_khusus}"`,
          `"${row.keterangan}"`,
          row.potong_sendiri,
          row.ambil_daging,
          row.createdAt,
          row.cara_bayar,
          row.paymentStatus,
          row.hewan,
          row.isKolektif,
          row.jumlahHewan,
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `data-mudhohi-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const newRowsCount = data.filter(row => row.id?.startsWith('temp_')).length
  const validRowsCount = validationResults.validRows.length

  // Parse clipboard text into rows and columns
  const parseClipboardText = (text: string): string[][] => {
    // Split by newline to get rows
    const rows = text.split(/\r?\n/).filter((row) => row.trim() !== "")

    // Detect delimiter (tab or comma)
    const delimiter = rows[0].includes("\t") ? "\t" : ","

    // Parse each row
    return rows.map((row) => row.split(delimiter))
  }

  // Auto-detect column mapping based on header row
  const detectColumnMapping = (headerRow: string[]): Record<number, keyof MudhohiData> => {
    const mapping: Record<number, keyof MudhohiData> = {}
    const headerMap: Record<string, keyof MudhohiData> = {
      // Map common header names to our data structure
      "nama pengqurban": "nama_pengqurban",
      nama: "nama_pengqurban",
      pengqurban: "nama_pengqurban",
      "nama peruntukan": "nama_peruntukan",
      peruntukan: "nama_peruntukan",
      alamat: "alamat",
      "pesan khusus": "pesan_khusus",
      pesan: "pesan_khusus",
      keterangan: "keterangan",
      "potong sendiri": "potong_sendiri",
      "ambil daging": "ambil_daging",
      tanggal: "createdAt",
      "created at": "createdAt",
      "cara bayar": "cara_bayar",
      pembayaran: "cara_bayar",
      "status pembayaran": "paymentStatus",
      "status bayar": "paymentStatus",
      status: "paymentStatus",
      "jenis hewan": "hewan",
      hewan: "hewan",
      kolektif: "isKolektif",
      "jumlah hewan": "jumlahHewan",
      jumlah: "jumlahHewan",
    }

    // Try to match headers
    headerRow.forEach((header, index) => {
      const normalizedHeader = header.toLowerCase().trim()
      if (headerMap[normalizedHeader]) {
        mapping[index] = headerMap[normalizedHeader]
      }
    })

    return mapping
  }

  // Update column mapping
  const updateColumnMapping = (columnIndex: number, field: keyof MudhohiData | "") => {
    if (field === "") {
      // Remove mapping if empty
      const newMapping = { ...columnMapping }
      delete newMapping[columnIndex]
      setColumnMapping(newMapping)
    } else {
      setColumnMapping((prev) => ({
        ...prev,
        [columnIndex]: field,
      }))
    }
  }

  // Apply pasted data to create new rows
  const applyPastedData = () => {
    try {
      // Skip header row, process data rows
      const dataRows = pastePreview.slice(1)

      if (dataRows.length === 0) {
        toast({
          title: "No Data",
          description: "No data rows found to import",
          variant: "destructive",
        })
        return
      }

      // Create new rows from pasted data
      const newRows = dataRows.map((row) => {
        const newRow = { ...defaultRow, id: generateId() }

        // Apply column mapping
        Object.entries(columnMapping).forEach(([colIndex, field]) => {
          const value = row[Number.parseInt(colIndex)];
          if (value !== undefined) {
            // Convert value based on field type
            switch (field) {
              case "isKolektif":
              case "potong_sendiri":
              case "ambil_daging":
                newRow[field] = convertToBoolean(value);
                break;
              case "jumlahHewan":
                newRow[field] = Number.parseInt(value) || 1;
                break;
              case "createdAt":
                // Try to parse date
                try {
                  const date = new Date(value);
                  if (!isNaN(date.getTime())) {
                    newRow[field] = date.toISOString().split("T")[0];
                  }
                } catch {
                  newRow[field] = new Date().toISOString().split("T")[0];
                }
                break;
              case "jatah_pengqurban":
                // Handle array type separately
                newRow[field] = value.split(",").map(item => item.trim());
                break;
              default:
                // Use type assertion for string fields
                (newRow as Record<string, any>)[field] = value;
            }
          }
        });

        // Generate dash_code if not provided
        // if (!newRow.dash_code) {
        //   newRow.dash_code = `DASH-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
        // }

        return newRow
      })

      // Add new rows to data
      setData((prev) => [...prev, ...newRows])

      // Close dialog and show success message
      setIsPasteDialogOpen(false)
      toast({
        title: "Data Imported",
        description: `${newRows.length} rows imported successfully`,
      })
    } catch (error) {
      console.error("Error applying pasted data:", error)
      toast({
        title: "Import Failed",
        description: "Failed to import data. Please check the format.",
        variant: "destructive",
      })
    }
  }

  // Convert string values to boolean
  const convertToBoolean = (value: string): boolean => {
    const normalizedValue = value.toLowerCase().trim()
    return (
      normalizedValue === "true" ||
      normalizedValue === "ya" ||
      normalizedValue === "y" ||
      normalizedValue === "1" ||
      normalizedValue === "yes"
    )
  }

  // Get field options for column mapping
  const getFieldOptions = (): { value: string; label: string }[] => {
    return [
      { value: "", label: "-- Pilih Field --" },
      { value: "nama_pengqurban", label: "Nama Pengqurban" },
      { value: "nama_peruntukan", label: "Nama Peruntukan" },
      { value: "alamat", label: "Alamat" },
      { value: "pesan_khusus", label: "Pesan Khusus" },
      { value: "keterangan", label: "Keterangan" },
      { value: "potong_sendiri", label: "Potong Sendiri" },
      { value: "ambil_daging", label: "Ambil Daging" },
      { value: "ambil_daging", label: "Sudah Ambil Daging" },
      { value: "dash_code", label: "Kode Dash" },
      { value: "qrcode_url", label: "QR Image" },
      { value: "createdAt", label: "Tanggal" },
      { value: "cara_bayar", label: "Cara Bayar" },
      { value: "paymentStatus", label: "Status Pembayaran" },
      { value: "hewan", label: "Jenis Hewan" },
      { value: "isKolektif", label: "Kolektif" },
      { value: "jumlahHewan", label: "Jumlah Hewan" },
      { value: "jatahHewan", label: "Jatah Hewan" },
    ]
  }

  // Open paste dialog manually
  const openPasteDialog = () => {
    navigator.clipboard
      .readText()
      .then((text) => {
        if (!text) {
          toast({
            title: "Clipboard Empty",
            description: "No text found in clipboard",
            variant: "destructive",
          })
          return
        }

        try {
          // Parse clipboard text
          const rows = parseClipboardText(text)

          if (rows.length === 0) {
            setPasteError("No data found in clipboard")
            return
          }

          // Show preview dialog
          setPastePreview(rows)
          setIsPasteDialogOpen(true)
          setPasteError(null)

          // Auto-detect column mapping
          const detectedMapping = detectColumnMapping(rows[0])
          setColumnMapping(detectedMapping)
        } catch (error) {
          console.error("Error parsing clipboard data:", error)
          setPasteError("Failed to parse clipboard data. Make sure it's in a valid format.")
          setIsPasteDialogOpen(true)
        }
      })
      .catch((err) => {
        console.error("Error reading clipboard:", err)
        toast({
          title: "Clipboard Error",
          description: "Failed to read from clipboard. Make sure you've granted permission.",
          variant: "destructive",
        })
      })
  }

  // Create Google Sheets template
  const createGoogleSheetsTemplate = async () => {
    setIsCreatingTemplate(true)

    try {
      const response = await fetch("/api/create-template", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          templateType: "googlesheets",
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to create template")
      }

      // Open the created Google Sheets template in a new tab
      window.open(result.templateUrl, "_blank")

      toast({
        title: "Template Berhasil Dibuat",
        description: "Template Google Sheets telah dibuat dan dibuka di tab baru",
      })
    } catch (error: any) {
      console.error("Error creating template:", error)
      toast({
        title: "Gagal Membuat Template",
        description: error.message || "Terjadi kesalahan saat membuat template",
        variant: "destructive",
      })
    } finally {
      setIsCreatingTemplate(false)
    }
  }

  // Download CSV template
  const downloadCSVTemplate = () => {
    const headers = [
      "Nama Pengqurban",
      "Nama Peruntukan",
      "Alamat",
      "Jenis Hewan",
      "Jumlah Hewan",
      "Cara Bayar",
      "Status Pembayaran",
      "Kode Dash",
      "Tanggal",
      "Potong Sendiri",
      "Ambil Daging",
      "Sudah Ambil Daging",
      "Pesan Khusus",
      "Keterangan",
      "Barcode Image",
    ]

    // Sample data for template
    const sampleData = [
      [
        "Ahmad Fauzi",
        "Keluarga Ahmad",
        "Jl. Merdeka No. 123",
        "sapi",
        "1",
        "transfer",
        "lunas",
        "DASH001",
        "2024-01-15",
        "tidak",
        "ya",
        "tidak",
        "Untuk keluarga",
        "Qurban tahun ini",
        "",
      ],
      [
        "Siti Aminah",
        "Almarhum Bapak",
        "Jl. Sudirman No. 456",
        "kambing",
        "2",
        "tunai",
        "lunas",
        "DASH002",
        "2024-01-15",
        "ya",
        "tidak",
        "tidak",
        "Untuk arwah bapak",
        "",
        "",
      ],
      [
        "Budi Santoso",
        "Keluarga Besar",
        "Jl. Gatot Subroto No. 789",
        "sapi",
        "1",
        "transfer",
        "menunggu",
        "DASH003",
        "2024-01-16",
        "tidak",
        "ya",
        "tidak",
        "",
        "Qurban bersama",
        "",
      ],
    ]

    const csvContent = [headers.join(","), ...sampleData.map((row) => row.join(","))].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "template-data-mudhohi.csv"
    a.click()
    window.URL.revokeObjectURL(url)

    toast({
      title: "Template Downloaded",
      description: "Template CSV telah diunduh. Isi data sesuai format dan copy-paste ke sini.",
    })
  }

  // Download Excel template
  const downloadExcelTemplate = () => {
    const headers = [
      "Nama Pengqurban",
      "Nama Peruntukan",
      "Alamat",
      "Jenis Hewan",
      "Jumlah Hewan",
      "Cara Bayar",
      "Status Pembayaran",
      "Kode Dash",
      "Tanggal",
      "Potong Sendiri",
      "Ambil Daging",
      "Sudah Ambil Daging",
      "Pesan Khusus",
      "Keterangan",
      "Barcode Image",
    ]

    // Sample data for template
    const sampleData = [
      [
        "Ahmad Fauzi",
        "Keluarga Ahmad",
        "Jl. Merdeka No. 123",
        "sapi",
        "1",
        "transfer",
        "lunas",
        "DASH001",
        "2024-01-15",
        "tidak",
        "ya",
        "tidak",
        "Untuk keluarga",
        "Qurban tahun ini",
        "",
      ],
      [
        "Siti Aminah",
        "Almarhum Bapak",
        "Jl. Sudirman No. 456",
        "kambing",
        "2",
        "tunai",
        "lunas",
        "DASH002",
        "2024-01-15",
        "ya",
        "tidak",
        "tidak",
        "Untuk arwah bapak",
        "",
        "",
      ],
      [
        "Budi Santoso",
        "Keluarga Besar",
        "Jl. Gatot Subroto No. 789",
        "sapi",
        "1",
        "transfer",
        "menunggu",
        "DASH003",
        "2024-01-16",
        "tidak",
        "ya",
        "tidak",
        "",
        "Qurban bersama",
        "",
      ],
    ]

    // Create Excel-compatible CSV with UTF-8 BOM
    const BOM = "\uFEFF"
    const csvContent = BOM + [headers.join("\t"), ...sampleData.map((row) => row.join("\t"))].join("\n")

    const blob = new Blob([csvContent], { type: "application/vnd.ms-excel;charset=utf-8;" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "template-data-mudhohi.xls"
    a.click()
    window.URL.revokeObjectURL(url)

    toast({
      title: "Template Downloaded",
      description: "Template Excel telah diunduh. Buka dengan Excel, isi data, dan copy-paste ke sini.",
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span>Sheet Data Mudhohi</span>
              {isDirty && (
                <Badge variant="secondary" className="text-orange-600">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Belum Disimpan
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={addRow} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Tambah Baris
              </Button>
              <Button onClick={addMultipleRows} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Tambah 5 Baris
              </Button>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button onClick={openPasteDialog} variant="outline" size="sm">
                      <Clipboard className="h-4 w-4 mr-2" />
                      Paste dari Spreadsheet
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Copy data dari Excel/Google Sheets dan paste di sini</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              {/* Template Download Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Template
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={createGoogleSheetsTemplate} disabled={isCreatingTemplate}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    {isCreatingTemplate ? "Membuat..." : "Buat Google Sheets"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={downloadExcelTemplate}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Excel Template
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={downloadCSVTemplate}>
                    <Download className="h-4 w-4 mr-2" />
                    Download CSV Template
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button onClick={exportToCSV} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button 
                onClick={saveData} 
                disabled={isLoading || validationErrors.length > 0 || newRowsCount === 0} 
                size="sm"
                className="relative"
              >
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? "Menyimpan..." : `Simpan ${newRowsCount} Data Baru`}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Validation Summary */}
          {showValidationErrors && validationErrors.length > 0 && (
            <Alert className="mb-4 border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>Ditemukan {validationErrors.length} kesalahan validasi:</strong>
                <ul className="mt-2 ml-4 list-disc space-y-1">
                  {validationErrors.slice(0, 5).map((error, index) => (
                    <li key={index} className="text-sm">
                      Baris {data.findIndex(row => row.id === error.rowId) + 1} - {error.field}: {error.message}
                    </li>
                  ))}
                  {validationErrors.length > 5 && (
                    <li className="text-sm italic">...dan {validationErrors.length - 5} kesalahan lainnya</li>
                  )}
                </ul>
              </AlertDescription>
            </Alert>
          )}
          {isFetching ? (
            <div className="flex justify-center items-center py-20">
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-4"></div>
                <p className="text-muted-foreground">Memuat data...</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto" ref={tableRef}>
              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Tip: Copy-Paste dari Spreadsheet</AlertTitle>
                <AlertDescription>
                  Anda dapat menyalin (Ctrl+C) data dari Excel atau Google Sheets dan tempel (Ctrl+V) langsung ke tabel
                  ini, atau gunakan tombol &quot;Paste dari Spreadsheet&quot;. 
                  Gunakan tombol &quot;Template&quot; untuk mengunduh format yang benar.
                </AlertDescription>
              </Alert>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[70px]">Status</TableHead>
                    <TableHead className="w-[50px]">No</TableHead>
                    <TableHead className="min-w-[200px]">Nama Pengqurban*</TableHead>
                    <TableHead className="min-w-[180px]">Nama Peruntukan</TableHead>
                    <TableHead className="min-w-[180px]">Email</TableHead>
                    <TableHead className="min-w-[180px]">Phone</TableHead>
                    <TableHead className="min-w-[200px]">Alamat</TableHead>
                    <TableHead className="min-w-[150px]">Jenis Hewan*</TableHead>
                    <TableHead className="min-w-[100px]">Kolektif</TableHead>
                    <TableHead className="min-w-[100px]">Jumlah</TableHead>
                    <TableHead className="min-w-[150px]">Cara Bayar*</TableHead>
                    <TableHead className="min-w-[150px]">Status Bayar*</TableHead>
                    <TableHead className="min-w-[130px]">Tanggal*</TableHead>
                    <TableHead className="min-w-[100px]">Potong Sendiri</TableHead>
                    <TableHead className="min-w-[100px]">Ambil Daging</TableHead>
                    <TableHead className="min-w-[200px]">Jatah Pengqurban</TableHead>
                    <TableHead className="min-w-[200px]">Pesan Khusus</TableHead>
                    <TableHead className="min-w-[200px]">Keterangan</TableHead>
                    <TableHead className="w-[80px]">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((row, index) => {
                    const rowErrors = getRowErrors(row.id!)
                    const isValid = isRowValid(row.id!)
                    const isNewRow = row.id?.startsWith('temp_')

                    return (
                      <TableRow key={row.id} className={showValidationErrors && rowErrors.length > 0 ? "bg-red-50 border-red-200" : ""}>
                        <TableCell>
                          <div className="flex items-center justify-center">
                            {isValid ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-red-600" />
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {index + 1}
                            {isNewRow && (
                              <Badge variant="secondary" className="text-xs">
                                Baru
                              </Badge>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="space-y-1">
                            <Input
                              value={row.nama_pengqurban}
                              onChange={(e) => updateCell(row.id!, "nama_pengqurban", e.target.value)}
                              placeholder="Nama pengqurban"
                              className={`min-w-[180px] ${
                                showValidationErrors && getFieldError(row.id!, "nama_pengqurban") ? "border-red-500" : ""
                              }`}
                            />
                            {showValidationErrors && getFieldError(row.id!, "nama_pengqurban") && (
                              <p className="text-xs text-red-600">
                                {getFieldError(row.id!, "nama_pengqurban")?.message}
                              </p>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="space-y-1">
                            <Input
                              value={row.nama_peruntukan}
                              onChange={(e) => updateCell(row.id!, "nama_peruntukan", e.target.value)}
                              placeholder="Nama peruntukan"
                              className={`min-w-[160px] ${
                                showValidationErrors && getFieldError(row.id!, "nama_peruntukan") ? "border-red-500" : ""
                              }`}
                            />
                            {showValidationErrors && getFieldError(row.id!, "nama_peruntukan") && (
                              <p className="text-xs text-red-600">
                                {getFieldError(row.id!, "nama_peruntukan")?.message}
                              </p>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="space-y-1">
                            <Input
                              type="email"
                              value={row.email}
                              onChange={(e) => updateCell(row.id!, "email", e.target.value)}
                              placeholder="pengqurban@gmail.com"
                              className={`min-w-[180px] ${
                                showValidationErrors && getFieldError(row.id!, "email") ? "border-red-500" : ""
                              }`}
                            />
                            {getFieldError(row.id!, "email") && (
                              <p className="text-xs text-red-600">
                                {getFieldError(row.id!, "email")?.message}
                              </p>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="space-y-1">
                            <Input
                              type="tel"
                              value={row.phone}
                              onChange={(e) => updateCell(row.id!, "phone", e.target.value)}
                              placeholder="081234567890"
                              className={`min-w-[180px] ${
                                showValidationErrors && getFieldError(row.id!, "phone") ? "border-red-500" : ""
                              }`}
                            />
                            {showValidationErrors && getFieldError(row.id!, "phone") && (
                              <p className="text-xs text-red-600">
                                {getFieldError(row.id!, "phone")?.message}
                              </p>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="space-y-1">
                            <Textarea
                              value={row.alamat}
                              onChange={(e) => updateCell(row.id!, "alamat", e.target.value)}
                              placeholder="Alamat lengkap"
                              className={`min-w-[180px] min-h-[60px] ${
                                showValidationErrors && getFieldError(row.id!, "alamat") ? "border-red-500" : ""
                              }`}
                            />
                            {showValidationErrors && getFieldError(row.id!, "alamat") && (
                              <p className="text-xs text-red-600">
                                {getFieldError(row.id!, "alamat")?.message}
                              </p>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="space-y-1">
                            <Select 
                              value={row.hewan} 
                              onValueChange={(value) => updateCell(row.id!, "hewan", value)}
                            >
                              <SelectTrigger className={`min-w-[130px] ${
                                showValidationErrors && getFieldError(row.id!, "hewan") ? "border-red-500" : ""
                              }`}>
                                <SelectValue placeholder="Pilih hewan" />
                              </SelectTrigger>
                              <SelectContent>
                                {HEWAN_OPTIONS.map(option => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {showValidationErrors && getFieldError(row.id!, "hewan") && (
                              <p className="text-xs text-red-600">
                                {getFieldError(row.id!, "hewan")?.message}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-center">
                            <Checkbox
                              checked={row.isKolektif}
                              onCheckedChange={(checked) => updateCell(row.id!, "isKolektif", checked)}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Input
                              type="number"
                              min="1"
                              max="100"
                              value={row.jumlahHewan}
                              onChange={(e) => updateCell(row.id!, "jumlahHewan", Math.max(1, parseInt(e.target.value) || 1))}
                              className={`min-w-[80px] ${
                                showValidationErrors && getFieldError(row.id!, "jumlahHewan") ? "border-red-500" : ""
                              }`}
                            />
                            {showValidationErrors && getFieldError(row.id!, "jumlahHewan") && (
                              <p className="text-xs text-red-600">
                                {getFieldError(row.id!, "jumlahHewan")?.message}
                              </p>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="space-y-1">
                            <Select
                              value={row.cara_bayar}
                              onValueChange={(value) => updateCell(row.id!, "cara_bayar", value)}
                            >
                              <SelectTrigger className={`min-w-[130px] ${
                                showValidationErrors && getFieldError(row.id!, "cara_bayar") ? "border-red-500" : ""
                              }`}>
                                <SelectValue placeholder="Cara bayar" />
                              </SelectTrigger>
                              <SelectContent>
                                {CARA_BAYAR_OPTIONS.map(option => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {showValidationErrors && getFieldError(row.id!, "cara_bayar") && (
                              <p className="text-xs text-red-600">
                                {getFieldError(row.id!, "cara_bayar")?.message}
                              </p>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="space-y-1">
                            <Select
                              value={row.paymentStatus}
                              onValueChange={(value) => updateCell(row.id!, "paymentStatus", value)}
                            >
                              <SelectTrigger className={`min-w-[130px] ${
                                showValidationErrors && getFieldError(row.id!, "paymentStatus") ? "border-red-500" : ""
                              }`}>
                                <SelectValue placeholder="Status" />
                              </SelectTrigger>
                              <SelectContent>
                                {PAYMENT_STATUS_OPTIONS.map(option => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {showValidationErrors && getFieldError(row.id!, "paymentStatus") && (
                              <p className="text-xs text-red-600">
                                {getFieldError(row.id!, "paymentStatus")?.message}
                              </p>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="space-y-1">
                            <Input
                              type="date"
                              value={row.createdAt}
                              onChange={(e) => updateCell(row.id!, "createdAt", e.target.value)}
                              className={`min-w-[120px] ${
                                showValidationErrors && getFieldError(row.id!, "createdAt") ? "border-red-500" : ""
                              }`}
                            />
                            {showValidationErrors && getFieldError(row.id!, "createdAt") && (
                              <p className="text-xs text-red-600">
                                {getFieldError(row.id!, "createdAt")?.message}
                              </p>
                            )}
                          </div>
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
                          <div className="space-y-1">
                            <div className="flex flex-wrap gap-1 min-w-[250px] max-w-xl">
                              <MultiSelect asChild
                                options={getProdukForAnimal(row.hewan.toUpperCase()).map((h) => ({
                                  value: h,
                                  label: h,
                                  className: '',
                                  variant: getJenisProdukLabel(h)
                                }))}
                                onValueChange={(selected) => {
                                  updateCell(row.id!, "jatah_pengqurban", selected);
                                }}
                                value={row.jatah_pengqurban || []}
                                placeholder="Pilih jatah daging (maks. 2)"
                                variant="inverted"
                                animation={2}
                                maxCount={2}
                              />
                            </div>
                            {showValidationErrors && getFieldError(row.id!, "jatah_pengqurban") && (
                              <p className="text-xs text-red-600">
                                {getFieldError(row.id!, "jatah_pengqurban")?.message}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Textarea
                              value={row.pesan_khusus}
                              onChange={(e) => updateCell(row.id!, "pesan_khusus", e.target.value)}
                              placeholder="Pesan khusus"
                              className={`min-w-[180px] min-h-[60px] ${
                                showValidationErrors && getFieldError(row.id!, "pesan_khusus") ? "border-red-500" : ""
                              }`}
                            />
                            {getFieldError(row.id!, "pesan_khusus") && (
                              <p className="text-xs text-red-600">
                                {showValidationErrors && getFieldError(row.id!, "pesan_khusus")?.message}
                              </p>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="space-y-1">
                            <Textarea
                              value={row.keterangan}
                              onChange={(e) => updateCell(row.id!, "keterangan", e.target.value)}
                              placeholder="Keterangan"
                              className={`min-w-[180px] min-h-[60px] ${
                                showValidationErrors && getFieldError(row.id!, "keterangan") ? "border-red-500" : ""
                              }`}
                            />
                            {showValidationErrors && getFieldError(row.id!, "keterangan") && (
                              <p className="text-xs text-red-600">
                                {getFieldError(row.id!, "keterangan")?.message}
                              </p>
                            )}
                          </div>
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
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
              <span>Total Baris: <strong>{data.length}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded"></div>
              <span>Data Baru: <strong>{newRowsCount}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span>Valid: <strong>{validRowsCount}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span>Error: <strong>{data.length - validRowsCount}</strong></span>
            </div>
          </div>

          <div className="mt-4 text-center text-sm text-muted-foreground">
            <p>* Field wajib diisi | Hanya data baru yang akan disimpan ke database</p>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Aksi Cepat</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              onClick={() => {
                const validData = data.filter(row => isRowValid(row.id!))
                if (validData.length === 0) {
                  toast({
                    title: "Tidak Ada Data Valid",
                    description: "Perbaiki kesalahan validasi terlebih dahulu",
                    variant: "destructive",
                  })
                  return
                }
                
                // Set all valid rows to "LUNAS"
                const updatedData = data.map(row => 
                  isRowValid(row.id!) 
                    ? { ...row, paymentStatus: "LUNAS" }
                    : row
                )
                setData(updatedData)
                setIsDirty(true)
                
                toast({
                  title: "Status Diperbarui",
                  description: `${validData.length} data diubah ke status Lunas`,
                })
              }}
              variant="outline"
              className="w-full"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Set Semua Valid ke Lunas
            </Button>

            <Button 
              onClick={() => {
                const today = new Date().toISOString().split("T")[0]
                const updatedData = data.map(row => ({ ...row, createdAt: today }))
                setData(updatedData)
                setIsDirty(true)
                
                toast({
                  title: "Tanggal Diperbarui",
                  description: "Semua tanggal diubah ke hari ini",
                })
              }}
              variant="outline"
              className="w-full"
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              Set Tanggal Hari Ini
            </Button>

            <Button 
              onClick={() => {
                if (window.confirm("Apakah Anda yakin ingin menghapus semua data baru yang belum disimpan?")) {
                  const existingData = data.filter(row => !row.id?.startsWith('temp_'))
                  setData(existingData.length > 0 ? existingData : [{ ...defaultRow, id: generateId() }])
                  setIsDirty(false)
                  
                  toast({
                    title: "Data Baru Dihapus",
                    description: "Semua data baru telah dihapus",
                  })
                }
              }}
              variant="destructive"
              className="w-full"
              disabled={newRowsCount === 0}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Hapus Semua Data Baru
            </Button>
          </div>
        </CardContent>
      </Card>
      {/* Paste Dialog */}
      <Dialog open={isPasteDialogOpen} onOpenChange={setIsPasteDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Import Data dari Spreadsheet</DialogTitle>
            <DialogDescription>
              Data telah dideteksi dari clipboard. Silakan konfirmasi pemetaan kolom dan preview data di bawah ini.
            </DialogDescription>
          </DialogHeader>

          {pasteError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{pasteError}</AlertDescription>
            </Alert>
          ) : (
            <>
              {/* Column Mapping */}
              <div className="mb-4">
                <h3 className="text-sm font-medium mb-2">Pemetaan Kolom</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {pastePreview[0]?.map((header, index) => (
                    <div key={index} className="flex flex-col space-y-1">
                      <label className="text-xs font-medium text-muted-foreground truncate" title={header}>
                        {header}
                      </label>
                      <Select
                        value={columnMapping[index] || ""}
                        onValueChange={(value) => updateColumnMapping(index, value as keyof MudhohiData | "")}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Pilih field" />
                        </SelectTrigger>
                        <SelectContent>
                          {getFieldOptions().map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Data Preview */}
              <div className="border rounded-md overflow-hidden">
                <div className="text-sm font-medium p-2 bg-muted">Preview Data ({pastePreview.length - 1} baris)</div>
                <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50">
                        {pastePreview[0]?.map((header, index) => (
                          <th key={index} className="p-2 text-left border-b font-medium text-xs">
                            {header}
                            {columnMapping[index] && (
                              <span className="block text-xs text-green-600 font-normal">
                                →{" "}
                                {getFieldOptions().find((opt) => opt.value === columnMapping[index])?.label ||
                                  columnMapping[index]}
                              </span>
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pastePreview.slice(1).map((row, rowIndex) => (
                        <tr key={rowIndex} className={rowIndex % 2 === 0 ? "bg-muted/20" : ""}>
                          {row.map((cell, cellIndex) => (
                            <td key={cellIndex} className="p-2 border-b text-xs">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mapping Status */}
              <div className="flex items-center space-x-2 text-sm">
                {Object.keys(columnMapping).length > 0 ? (
                  <div className="flex items-center text-green-600">
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    <span>{Object.keys(columnMapping).length} kolom terpetakan</span>
                  </div>
                ) : (
                  <div className="flex items-center text-amber-600">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    <span>Belum ada kolom yang terpetakan</span>
                  </div>
                )}
              </div>
            </>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPasteDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={applyPastedData} disabled={pasteError !== null || Object.keys(columnMapping).length === 0}>
              Import Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}