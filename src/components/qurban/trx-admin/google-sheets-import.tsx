/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState } from "react"
import { FileSpreadsheet, Upload, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

interface GoogleSheetsImportProps {
  onImportSuccess?: (data: any) => void
}

export default function GoogleSheetsImport({ onImportSuccess }: GoogleSheetsImportProps) {
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [googleSheetsUrl, setGoogleSheetsUrl] = useState("")
  const [sheetName, setSheetName] = useState("Sheet1")
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<any>(null)
  const [importError, setImportError] = useState<string | null>(null)

  const extractSheetIdFromUrl = (url: string): string | null => {
    // Extract Google Sheets ID from various URL formats
    const patterns = [/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/, /^([a-zA-Z0-9-_]+)$/]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) return match[1]
    }
    return null
  }

  const importFromGoogleSheets = async () => {
    if (!googleSheetsUrl.trim()) {
      toast({
        title: "URL Tidak Valid",
        description: "Silakan masukkan URL Google Sheets yang valid",
        variant: "destructive",
      })
      return
    }

    const sheetId = extractSheetIdFromUrl(googleSheetsUrl)
    if (!sheetId) {
      toast({
        title: "URL Tidak Valid",
        description: "Format URL Google Sheets tidak valid",
        variant: "destructive",
      })
      return
    }

    setIsImporting(true)
    setImportError(null)
    setImportResult(null)

    try {
      const response = await fetch("/api/import-googlesheets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sheetId,
          sheetName,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to import data")
      }

      setImportResult(result)

      toast({
        title: "Import Berhasil",
        description: result.message,
      })

      if (onImportSuccess) {
        onImportSuccess(result.data)
      }
    } catch (error: any) {
      console.error("Import error:", error)
      setImportError(error.message || "Terjadi kesalahan saat mengimpor data")

      toast({
        title: "Import Gagal",
        description: error.message || "Terjadi kesalahan saat mengimpor data dari Google Sheets",
        variant: "destructive",
      })
    } finally {
      setIsImporting(false)
    }
  }

  const closeDialog = () => {
    setIsImportDialogOpen(false)
    setGoogleSheetsUrl("")
    setSheetName("Sheet1")
    setImportResult(null)
    setImportError(null)
  }

  return (
    <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Import Google Sheets
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Import dari Google Sheets</DialogTitle>
          <DialogDescription>
            Masukkan URL Google Sheets untuk mengimpor data mudhohi. Pastikan sheet dapat diakses publik atau bagikan
            dengan akses &quot;Anyone with the link can view&quot;.
          </DialogDescription>
        </DialogHeader>

        {!importResult && !importError && (
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="sheets-url">URL Google Sheets</Label>
              <Input
                id="sheets-url"
                placeholder="https://docs.google.com/spreadsheets/d/your-sheet-id/edit..."
                value={googleSheetsUrl}
                onChange={(e) => setGoogleSheetsUrl(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sheet-name">Nama Sheet</Label>
              <Input
                id="sheet-name"
                placeholder="Sheet1"
                value={sheetName}
                onChange={(e) => setSheetName(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">Nama tab sheet yang berisi data (default: Sheet1)</p>
            </div>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                <strong>Format yang didukung:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>URL lengkap Google Sheets</li>
                <li>ID Sheet saja (contoh: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms)</li>
              </ul>
              <p>
                <strong>Kolom yang akan diimpor:</strong>
              </p>
              <p className="text-xs">
                Nama Pengqurban, Nama Peruntukan, Alamat, Jenis Hewan, Jumlah Hewan, Cara Bayar, Status Pembayaran, Kode
                Dash, dll.
              </p>
            </div>
          </div>
        )}

        {importResult && (
          <Card>
            <CardHeader className="bg-green-50 dark:bg-green-900/20">
              <CardTitle className="text-green-600 dark:text-green-400 flex items-center">
                <FileSpreadsheet className="h-5 w-5 mr-2" />
                Import Berhasil
              </CardTitle>
              <CardDescription>{importResult.message}</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-sm">
                <p>
                  <strong>Total data berhasil diimpor:</strong> {importResult.data?.length || 0}
                </p>
                <p className="mt-2 text-muted-foreground">Data telah disimpan ke database dan siap digunakan.</p>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4 flex justify-between">
              <Button variant="outline" onClick={closeDialog}>
                Tutup
              </Button>
              <Button onClick={closeDialog}>Selesai</Button>
            </CardFooter>
          </Card>
        )}

        {importError && (
          <Card className="border-red-200">
            <CardHeader className="bg-red-50 dark:bg-red-900/20">
              <CardTitle className="text-red-600 dark:text-red-400">Import Gagal</CardTitle>
              <CardDescription className="text-red-600 dark:text-red-400">
                Terjadi kesalahan saat mengimpor data
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="text-sm text-red-600 dark:text-red-400">{importError}</p>
            </CardContent>
            <CardFooter className="border-t pt-4">
              <Button variant="outline" onClick={closeDialog} className="mr-2">
                Tutup
              </Button>
              <Button
                onClick={() => {
                  setImportError(null)
                  setImportResult(null)
                }}
              >
                Coba Lagi
              </Button>
            </CardFooter>
          </Card>
        )}

        {!importResult && !importError && (
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Batal
            </Button>
            <Button onClick={importFromGoogleSheets} disabled={isImporting}>
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Mengimpor...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Import Data
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
