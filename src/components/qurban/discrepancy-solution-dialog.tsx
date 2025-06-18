import { useState, useCallback, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { AlertTriangle, CheckCircle, Info } from "lucide-react"

// Types untuk discrepancy resolution
interface DiscrepancyData {
  produkId: number
  productName: string
  kumulatif: number
  diTimbang: number
  diInventori: number
  expectedInventori: number // Seharusnya berapa di inventori berdasarkan kumulatif - diTimbang
}

interface ResolutionOption {
  id: string
  label: string
  description: string
  action: {
    updateKumulatif?: number
    updateDiTimbang?: number
    updateDiInventori?: number
    reason: string
  }
}

const DiscrepancyResolutionDialog = ({ 
  open, 
  onOpenChange, 
  discrepancy, 
  onResolve 
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  discrepancy: DiscrepancyData | null
  onResolve: (resolution: ResolutionOption, customValues?: Partial<DiscrepancyData>, note?: string) => Promise<void>
}) => {
  const [selectedResolution, setSelectedResolution] = useState<string>("")
  const [customValues, setCustomValues] = useState<Partial<DiscrepancyData>>({})
  const [resolutionNote, setResolutionNote] = useState("")
  const [isResolving, setIsResolving] = useState(false)

  // Reset state when dialog opens
  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setSelectedResolution("")
      setCustomValues({})
      setResolutionNote("")
    }
    onOpenChange(open)
  }, [onOpenChange])

  // Calculate discrepancy analysis
  const analysis = useMemo(() => {
    if (!discrepancy) return null

    const { kumulatif, diTimbang, diInventori } = discrepancy
    const expectedInventori = kumulatif - diTimbang
    const inventoriDiscrepancy = diInventori - expectedInventori
    const totalAccountedFor = diTimbang + diInventori

    return {
      expectedInventori,
      inventoriDiscrepancy,
      totalAccountedFor,
      kumulatifDiscrepancy: totalAccountedFor - kumulatif,
      isInventoriOver: inventoriDiscrepancy > 0,
      isInventoriUnder: inventoriDiscrepancy < 0,
      isTotalOver: totalAccountedFor > kumulatif,
      isTotalUnder: totalAccountedFor < kumulatif
    }
  }, [discrepancy])

  // Generate resolution options based on the discrepancy type
  const resolutionOptions = useMemo((): ResolutionOption[] => {
    if (!discrepancy || !analysis) return []

    const options: ResolutionOption[] = []

    // Option 1: Adjust Inventori to match expected (most common)
    options.push({
      id: "adjust-inventori",
      label: "Sesuaikan Inventori",
      description: `Ubah inventori menjadi ${analysis.expectedInventori} (sesuai kumulatif - timbang)`,
      action: {
        updateDiInventori: analysis.expectedInventori,
        reason: "Menyesuaikan inventori dengan perhitungan yang benar"
      }
    })

    // Option 2: Adjust Timbang if inventori is correct
    if (analysis.inventoriDiscrepancy !== 0) {
      const adjustedTimbang = discrepancy.kumulatif - discrepancy.diInventori
      options.push({
        id: "adjust-timbang",
        label: "Sesuaikan Timbang",
        description: `Ubah timbang menjadi ${adjustedTimbang} (jika inventori sudah benar)`,
        action: {
          updateDiTimbang: adjustedTimbang,
          reason: "Menyesuaikan timbang karena inventori sudah benar"
        }
      })
    }

    // Option 3: Adjust Kumulatif if both timbang and inventori are correct
    if (analysis.kumulatifDiscrepancy !== 0) {
      options.push({
        id: "adjust-kumulatif",
        label: "Sesuaikan Kumulatif",
        description: `Ubah kumulatif menjadi ${analysis.totalAccountedFor} (jika timbang & inventori benar)`,
        action: {
          updateKumulatif: analysis.totalAccountedFor,
          reason: "Menyesuaikan kumulatif dengan total aktual"
        }
      })
    }

    // Option 4: Recount/Audit - when unsure
    options.push({
      id: "recount",
      label: "Lakukan Recount",
      description: "Hitung ulang fisik inventori dan perbarui semua nilai",
      action: {
        reason: "Melakukan penghitungan ulang untuk memastikan akurasi"
      }
    })

    // Option 5: Custom adjustment
    options.push({
      id: "custom",
      label: "Penyesuaian Manual",
      description: "Atur nilai secara manual dengan alasan spesifik",
      action: {
        reason: "Penyesuaian manual berdasarkan investigasi"
      }
    })

    return options
  }, [discrepancy, analysis])

  const handleResolve = async () => {
    if (!selectedResolution || !discrepancy) return

    const option = resolutionOptions.find(opt => opt.id === selectedResolution)
    if (!option) return

    setIsResolving(true)
    try {
      await onResolve(option, customValues, resolutionNote)
      handleOpenChange(false)
    } catch (error) {
      console.error('Error resolving discrepancy:', error)
    } finally {
      setIsResolving(false)
    }
  }

  if (!discrepancy || !analysis) return null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Penyelesaian Ketidaksesuaian - {discrepancy.productName}
          </DialogTitle>
          <DialogDescription>
            Pilih metode penyelesaian untuk ketidaksesuaian jumlah produk
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Values Display */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Nilai Saat Ini</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <Label className="text-sm text-muted-foreground">Kumulatif</Label>
                  <div className="text-2xl font-bold">{discrepancy.kumulatif}</div>
                </div>
                <div className="text-center">
                  <Label className="text-sm text-muted-foreground">Di Timbang</Label>
                  <div className="text-2xl font-bold">{discrepancy.diTimbang}</div>
                </div>
                <div className="text-center">
                  <Label className="text-sm text-muted-foreground">Di Inventori</Label>
                  <div className="text-2xl font-bold text-red-600">{discrepancy.diInventori}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Analysis Display */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Analisis Ketidaksesuaian</AlertTitle>
            <AlertDescription className="space-y-2">
              <div>• Inventori seharusnya: <strong>{analysis.expectedInventori}</strong> (Kumulatif - Timbang)</div>
              <div>• Selisih inventori: <strong className={analysis.inventoriDiscrepancy > 0 ? "text-red-600" : analysis.inventoriDiscrepancy < 0 ? "text-yellow-600" : "text-green-600"}>
                {analysis.inventoriDiscrepancy > 0 ? '+' : ''}{analysis.inventoriDiscrepancy}
              </strong></div>
              <div>• Total terakumulasi: <strong>{analysis.totalAccountedFor}</strong> vs Kumulatif: <strong>{discrepancy.kumulatif}</strong></div>
              {analysis.kumulatifDiscrepancy !== 0 && (
                <div>• Selisih kumulatif: <strong className="text-red-600">
                  {analysis.kumulatifDiscrepancy > 0 ? '+' : ''}{analysis.kumulatifDiscrepancy}
                </strong></div>
              )}
            </AlertDescription>
          </Alert>

          {/* Resolution Options */}
          <div>
            <Label className="text-base font-medium">Pilih Metode Penyelesaian</Label>
            <RadioGroup value={selectedResolution} onValueChange={setSelectedResolution} className="mt-2">
              {resolutionOptions.map((option) => (
                <div key={option.id} className="flex items-start space-x-2 p-3 border rounded-lg">
                  <RadioGroupItem value={option.id} id={option.id} className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor={option.id} className="font-medium cursor-pointer">
                      {option.label}
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {option.description}
                    </p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Custom Values Input (when custom or recount is selected) */}
          {(selectedResolution === "custom" || selectedResolution === "recount") && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {selectedResolution === "recount" ? "Hasil Recount" : "Nilai Manual"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="custom-kumulatif">Kumulatif Baru</Label>
                    <Input
                      id="custom-kumulatif"
                      type="number"
                      min="0"
                      value={customValues.kumulatif ?? discrepancy.kumulatif}
                      onChange={(e) => setCustomValues(prev => ({
                        ...prev,
                        kumulatif: parseInt(e.target.value) || 0
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="custom-timbang">Di Timbang Baru</Label>
                    <Input
                      id="custom-timbang"
                      type="number"
                      min="0"
                      value={customValues.diTimbang ?? discrepancy.diTimbang}
                      onChange={(e) => setCustomValues(prev => ({
                        ...prev,
                        diTimbang: parseInt(e.target.value) || 0
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="custom-inventori">Di Inventori Baru</Label>
                    <Input
                      id="custom-inventori"
                      type="number"
                      min="0"
                      value={customValues.diInventori ?? discrepancy.diInventori}
                      onChange={(e) => setCustomValues(prev => ({
                        ...prev,
                        diInventori: parseInt(e.target.value) || 0
                      }))}
                    />
                  </div>
                </div>

                {/* Live calculation preview for custom values */}
                {(customValues.kumulatif !== undefined || customValues.diTimbang !== undefined || customValues.diInventori !== undefined) && (
                  <Alert className="mt-4">
                    <CheckCircle className="h-4 w-4" />
                    <AlertTitle>Preview Hasil</AlertTitle>
                    <AlertDescription>
                      {(() => {
                        const newKumulatif = customValues.kumulatif ?? discrepancy.kumulatif
                        const newTimbang = customValues.diTimbang ?? discrepancy.diTimbang
                        const newInventori = customValues.diInventori ?? discrepancy.diInventori
                        const newExpected = newKumulatif - newTimbang
                        const newDiscrepancy = newInventori - newExpected
                        
                        return (
                          <div>
                            <div>Inventori seharusnya: <strong>{newExpected}</strong></div>
                            <div>Selisih baru: <strong className={newDiscrepancy === 0 ? "text-green-600" : "text-red-600"}>
                              {newDiscrepancy === 0 ? "Seimbang ✓" : `${newDiscrepancy > 0 ? '+' : ''}${newDiscrepancy}`}
                            </strong></div>
                          </div>
                        )
                      })()}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {/* Resolution Note */}
          <div>
            <Label htmlFor="resolution-note">Catatan Penyelesaian</Label>
            <Textarea
              id="resolution-note"
              placeholder="Jelaskan alasan dan detail penyelesaian..."
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Batal
          </Button>
          <Button 
            onClick={handleResolve} 
            disabled={!selectedResolution || isResolving}
            className="min-w-[120px]"
          >
            {isResolving ? "Menyimpan..." : "Selesaikan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Usage example component
const DiscrepancyManagementExample = () => {
  const [showDialog, setShowDialog] = useState(false)
  const [sampleDiscrepancy] = useState<DiscrepancyData>({
    produkId: 1,
    productName: "Daging Sapi Premium",
    kumulatif: 100,
    diTimbang: 70,
    diInventori: 25, // Should be 30 (100-70)
    expectedInventori: 30
  })

  const handleResolveDiscrepancy = async (
    resolution: ResolutionOption, 
    customValues?: Partial<DiscrepancyData>, 
    note?: string
  ) => {
    console.log('Resolution:', resolution)
    console.log('Custom values:', customValues)
    console.log('Note:', note)

    // Here you would implement the actual resolution logic:
    // 1. Update the Counter values based on the resolution
    // 2. Create audit logs
    // 3. Update error logs as resolved
    // 4. Refresh queries

    // Example implementation:
    /*
    const updates = []
    
    if (resolution.action.updateKumulatif !== undefined) {
      updates.push({
        produkId: sampleDiscrepancy.produkId,
        event: "koreksi",
        place: Counter.KUMULATIF,
        value: resolution.action.updateKumulatif,
        note: `${resolution.action.reason}. ${note || ''}`
      })
    }
    
    if (resolution.action.updateDiTimbang !== undefined) {
      updates.push({
        produkId: sampleDiscrepancy.produkId,
        event: "koreksi",
        place: Counter.TIMBANG,
        value: resolution.action.updateDiTimbang,
        note: `${resolution.action.reason}. ${note || ''}`
      })
    }
    
    if (resolution.action.updateDiInventori !== undefined) {
      updates.push({
        produkId: sampleDiscrepancy.produkId,
        event: "koreksi",
        place: Counter.INVENTORY,
        value: resolution.action.updateDiInventori,
        note: `${resolution.action.reason}. ${note || ''}`
      })
    }

    // Apply custom values if provided
    if (customValues) {
      if (customValues.kumulatif !== undefined) {
        updates.push({
          produkId: sampleDiscrepancy.produkId,
          event: "koreksi",
          place: Counter.KUMULATIF,
          value: customValues.kumulatif,
          note: `Manual adjustment. ${note || ''}`
        })
      }
      // ... similar for diTimbang and diInventori
    }

    // Execute all updates
    for (const update of updates) {
      await updateProduct(update)
    }

    // Mark error log as resolved
    await updateErrorLogNote({
      id: errorLogId,
      note: `Resolved: ${resolution.action.reason}. ${note || ''}`,
      selesai: true
    })
    */

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    alert(`Ketidaksesuaian berhasil diselesaikan dengan metode: ${resolution.label}`)
  }

  return (
    <div className="p-4">
      <Card>
        <CardHeader>
          <CardTitle>Contoh Ketidaksesuaian</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p><strong>Produk:</strong> {sampleDiscrepancy.productName}</p>
            <p><strong>Kumulatif:</strong> {sampleDiscrepancy.kumulatif}</p>
            <p><strong>Di Timbang:</strong> {sampleDiscrepancy.diTimbang}</p>
            <p><strong>Di Inventori:</strong> {sampleDiscrepancy.diInventori} <Badge variant="destructive">Seharusnya: {sampleDiscrepancy.expectedInventori}</Badge></p>
          </div>
          <Button className="mt-4" onClick={() => setShowDialog(true)}>
            Selesaikan Ketidaksesuaian
          </Button>
        </CardContent>
      </Card>

      <DiscrepancyResolutionDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        discrepancy={sampleDiscrepancy}
        onResolve={handleResolveDiscrepancy}
      />
    </div>
  )
}

export default DiscrepancyManagementExample