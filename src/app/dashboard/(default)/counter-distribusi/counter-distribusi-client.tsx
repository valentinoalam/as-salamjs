/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { QrCode, Search, Clock, AlertTriangle } from "lucide-react"
import { QRCodeScanner } from "@/components/qr-code-scanner"
import {
  returnCoupon as apiReturnCoupon, // Renamed to avoid conflict with local function
  distributeMeat,
  startEvent,
  endEvent,
  requestRedoCode as apiRequestRedoCode, // Renamed
  verifyRedoCode as apiVerifyRedoCode, // Renamed
  getEventStatus,
} from "./actions"
import { type Kupon, type ProdukHewan, StatusKupon } from "#@/types/qurban.ts" // Import Kupon and StatusKupon


type EventStatus = {
  isActive: boolean
  startTime: Date | null
  endTime: Date | null
  totalCouponsReturned: number
  totalMeatDistributed: number
}

interface CounterDistribusiProps {
  initialCoupons: Kupon[] // Changed from initialPenerima
  meatProducts: ProdukHewan[]
}

export default function CounterDistribusi({ initialCoupons, meatProducts }: CounterDistribusiProps) {
  const [coupons, setCoupons] = useState<Kupon[]>(initialCoupons) // Changed state name
  const [filteredCoupons, setFilteredCoupons] = useState<Kupon[]>(initialCoupons) // Changed state name
  const [searchTerm, setSearchTerm] = useState("")
  const [gridColumns, setGridColumns] = useState(3)
  const [isTestMode, setIsTestMode] = useState(true)
  const [eventStatus, setEventStatus] = useState<EventStatus>({
    isActive: false,
    startTime: null,
    endTime: null,
    totalCouponsReturned: 0,
    totalMeatDistributed: 0,
  })

  // QR Scanner state
  const [showQRScanner, setShowQRScanner] = useState(false)

  // Redo dialog state
  const [showRedoDialog, setShowRedoDialog] = useState(false)
  const [redoTargetKuponId, setRedoTargetKuponId] = useState<number | null>(null) // Changed target to Kupon ID
  const [redoCode, setRedoCode] = useState("")
  const [redoCount, setRedoCount] = useState(0)

  // Meat distribution state
  const [totalMeatAvailable, setTotalMeatAvailable] = useState(0)
  const [meatPerCoupon, setMeatPerCoupon] = useState(2) // kg per coupon

  useEffect(() => {
    // Calculate total meat available
    const total = meatProducts.reduce((sum, product) => sum + product.diInventori, 0)
    setTotalMeatAvailable(total)
  }, [meatProducts])

  useEffect(() => {
    // Filter coupons based on search term (now typically Kupon ID)
    if (searchTerm) {
      const filtered = coupons.filter(
        (kupon) =>
          kupon.id.toString().includes(searchTerm) // Search by recipient name
      )
      setFilteredCoupons(filtered)
    } else {
      setFilteredCoupons(coupons)
    }
  }, [searchTerm, coupons])

  useEffect(() => {
    // Load event status on mount
    loadEventStatus()
  }, [])

  const loadEventStatus = async () => {
    try {
      const status = await getEventStatus()
      setEventStatus(status)
    } catch (error) {
      console.error("Error loading event status:", error)
    }
  }

  const handleModeSwitch = async (testMode: boolean) => {
    setIsTestMode(testMode)

    if (!testMode && !eventStatus.isActive) {
      // Starting event mode
      try {
        await startEvent()
        await loadEventStatus()
        toast({
          title: "Event Started",
          description: "Distribution event has been activated",
        })
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to start event",
          variant: "destructive",
        })
      }
    }
  }

  const handleEndEvent = async () => {
    try {
      await endEvent()
      await loadEventStatus()
      setIsTestMode(true)
      toast({
        title: "Event Ended",
        description: "Distribution event has been completed",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to end event",
        variant: "destructive",
      })
    }
  }

  // Renamed from penerimaId to kuponId and adjusted logic for Kupon status
  const handleCouponStatusChange = async (kuponId: number, currentStatus: StatusKupon, isUndo = false) => {
    const kupon_item = coupons.find((k) => k.id === kuponId)

    if (!kupon_item) return

    const targetStatus: StatusKupon = currentStatus === StatusKupon.RETURNED ? StatusKupon.AVAILABLE : StatusKupon.RETURNED;

    // Check if trying to undo in event mode
    // Only allow redo request if trying to change from RETURNED to AVAILABLE in event mode
    if (isUndo && !isTestMode && currentStatus === StatusKupon.RETURNED) {
      setRedoTargetKuponId(kuponId)
      setShowRedoDialog(true)
      return
    }

    try {
      // Call the API action to update coupon status
      await apiReturnCoupon(kuponId, targetStatus) // This action needs to be updated to accept kuponId and targetStatus

      // Update local state
      setCoupons((prev) =>
        prev.map((k) =>
          k.id === kuponId
            ? {
                ...k,
                status: targetStatus,
                // If you need `returnedAt` on Kupon, add it to your Kupon model
                // and update it here. Based on schema, Penerima has `waktuTerima`.
                // For simplicity, we are managing `Kupon.status` here.
                // If `waktuTerima` is still relevant for the *recipient* of this specific coupon,
                // you would update the related Penerima record, which is a more complex operation
                // involving finding the correct Penerima and updating it.
                // For now, let's assume `Kupon.status` is the primary tracking.
              }
            : k,
        ),
      )

      // Distribute meat if coupon is being marked as RETURNED
      if (targetStatus === StatusKupon.RETURNED) {
        await distributeMeat(meatPerCoupon) // This still uses fixed meatPerCoupon
        await loadEventStatus()
      }

      toast({
        title: "Success",
        description: `Kupon ${kupon_item.id} status updated to ${targetStatus}`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update coupon status",
        variant: "destructive",
      })
    }
  }

  const handleQRScan = (data: string) => {
    // Assume QR code contains coupon ID (which is an Int)
    const couponId = Number.parseInt(data.trim(), 10)

    if (isNaN(couponId)) {
        toast({
            title: "Invalid QR",
            description: `QR code data is not a valid coupon ID: ${data}`,
            variant: "destructive",
        });
        return;
    }

    const kupon_item = coupons.find((k) => k.id === couponId)

    if (kupon_item) {
      // Call the status change handler to mark as RETURNED
      handleCouponStatusChange(kupon_item.id, kupon_item.status)
      setShowQRScanner(false)
    } else {
      toast({
        title: "Kupon Tidak Ditemukan",
        description: `Tidak ada kupon ditemukan dengan ID: ${couponId}`,
        variant: "destructive",
      })
    }
  }

  const handleRedoRequest = async () => {
    if (!redoTargetKuponId) return

    try {
      const result = await apiRequestRedoCode(redoTargetKuponId) // This action needs to be updated for kuponId
      setRedoCount(result.redoCount)
      toast({
        title: "Redo Code Sent",
        description: `Verification code sent to admin email. Redo count: ${result.redoCount}`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send redo code",
        variant: "destructive",
      })
    }
  }

  const handleRedoVerify = async () => {
    if (!redoTargetKuponId || !redoCode) return

    try {
      const isValid = await apiVerifyRedoCode(redoTargetKuponId, redoCode) // This action needs to be updated for kuponId

      if (isValid) {
        // After successful verification, perform the "undo" (change to AVAILABLE)
        await handleCouponStatusChange(redoTargetKuponId, StatusKupon.RETURNED, false) // Mark as not undoing here, as redo is the "permission"
        setShowRedoDialog(false)
        setRedoTargetKuponId(null)
        setRedoCode("")
        toast({
          title: "Redo Successful",
          description: "Kupon status has been updated",
        })
      } else {
        toast({
          title: "Invalid Code",
          description: "The verification code is incorrect",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to verify redo code",
        variant: "destructive",
      })
    }
  }

  const returnedCouponsCount = coupons.filter((k) => k.status === StatusKupon.RETURNED).length // Changed from `sudahMenerima`
  const totalCoupons = coupons.length // Total coupons are simply the length of the coupons array
  const estimatedMeatDistributed = returnedCouponsCount * meatPerCoupon

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Counter Distribusi Kupon</CardTitle>
              <CardDescription>Kelola pengembalian kupon dan distribusi daging</CardDescription>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Label htmlFor="mode-switch">Test Mode</Label>
                <Switch id="mode-switch" checked={isTestMode} onCheckedChange={handleModeSwitch} />
                <Label>Event Mode</Label>
              </div>

              {!isTestMode && eventStatus.isActive && (
                <Button variant="destructive" onClick={handleEndEvent}>
                  End Event
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{returnedCouponsCount}</div>
              <div className="text-sm text-muted-foreground">Kupon Dikembalikan</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{totalCoupons}</div>
              <div className="text-sm text-muted-foreground">Total Kupon</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{estimatedMeatDistributed}kg</div>
              <div className="text-sm text-muted-foreground">Daging Terdistribusi</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{totalMeatAvailable}kg</div>
              <div className="text-sm text-muted-foreground">Daging Tersedia</div>
            </div>
          </div>

          {!isTestMode && eventStatus.isActive && (
            <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-green-600" />
                <span className="font-medium text-green-800 dark:text-green-200">Event Active</span>
              </div>
              {eventStatus.startTime && (
                <div className="text-sm text-green-700 dark:text-green-300 mt-1">
                  Started: {new Date(eventStatus.startTime).toLocaleString()}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search and Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari ID kupon atau nama penerima..." // Adjusted placeholder
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Button variant="outline" onClick={() => setShowQRScanner(true)} className="flex items-center space-x-2">
                <QrCode className="h-4 w-4" />
                <span>Scan QR</span>
              </Button>

              <Select value={gridColumns.toString()} onValueChange={(value) => setGridColumns(Number(value))}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 Col</SelectItem>
                  <SelectItem value="3">3 Col</SelectItem>
                  <SelectItem value="4">4 Col</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Coupon Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Kupon ({filteredCoupons.length})</CardTitle> {/* Changed from filteredPenerima */}
        </CardHeader>
        <CardContent>
          <div
            className={`grid gap-4 ${
              gridColumns === 2 ? "grid-cols-2" : gridColumns === 3 ? "grid-cols-3" : "grid-cols-4"
            }`}
          >
            {/* Iterate over filteredCoupons */}
            {filteredCoupons.map((kupon_item) => (
                <div
                    key={kupon_item.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        kupon_item.status === StatusKupon.RETURNED
                            ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                            : "bg-white border-gray-200 hover:border-gray-300 dark:bg-gray-800 dark:border-gray-700"
                    }`}
                    // Pass current coupon ID and status
                    onClick={() => handleCouponStatusChange(kupon_item.id, kupon_item.status, kupon_item.status === StatusKupon.RETURNED)}
                >
                    <div className="flex items-center justify-between mb-2">
                        <div className="font-mono text-lg font-bold">Kupon ID: {kupon_item.id}</div>
                        <div className="flex items-center space-x-1">
                            {kupon_item.status === StatusKupon.RETURNED && (
                                <Badge variant="default" className="text-xs">
                                    ✓ Returned
                                </Badge>
                            )}
                            {/* Display current status if not returned */}
                            {kupon_item.status !== StatusKupon.RETURNED && (
                                <Badge variant="secondary" className="text-xs">
                                    {kupon_item.status}
                                </Badge>
                            )}
                        </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                        <Checkbox
                            checked={kupon_item.status === StatusKupon.RETURNED}
                            onChange={() => {}} // Handled by parent click
                            className="pointer-events-none"
                        />
                        <div className="text-xs text-muted-foreground">{meatPerCoupon}kg daging</div>
                    </div>
                </div>
            ))}
          </div>

          {filteredCoupons.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? "Tidak ada kupon yang sesuai dengan pencarian" : "Tidak ada kupon tersedia"}
            </div>
          )}
        </CardContent>
      </Card>


      {/* Meat Distribution Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Pengaturan Distribusi Daging</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="meat-per-coupon">Daging per Kupon (kg)</Label>
              <Input
                id="meat-per-coupon"
                type="number"
                min="0.5"
                step="0.5"
                value={meatPerCoupon}
                onChange={(e) => setMeatPerCoupon(Number(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label>Status Stok Daging</Label>
              <div className="text-sm">
                <div>Tersedia: {totalMeatAvailable}kg</div>
                <div>Akan Terdistribusi: {estimatedMeatDistributed}kg</div>
                <div
                  className={`font-medium ${
                    totalMeatAvailable >= estimatedMeatDistributed ? "text-green-600" : "text-red-600"
                  }`}
                >
                  Sisa: {totalMeatAvailable - estimatedMeatDistributed}kg
                </div>
              </div>
            </div>
          </div>

          {totalMeatAvailable < estimatedMeatDistributed && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="font-medium text-red-800 dark:text-red-200">
                  Peringatan: Stok daging tidak mencukupi!
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* QR Scanner Dialog */}
      <Dialog open={showQRScanner} onOpenChange={setShowQRScanner}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Scan QR Code Kupon</DialogTitle>
            <DialogDescription>Arahkan kamera ke QR code pada kupon untuk memindai</DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <QRCodeScanner
              onScan={handleQRScan}
              onError={(error) => {
                toast({
                  title: "Scan Error",
                  description: error,
                  variant: "destructive",
                })
              }}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQRScanner(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Redo Verification Dialog */}
      <Dialog open={showRedoDialog} onOpenChange={setShowRedoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verifikasi Redo</DialogTitle>
            <DialogDescription>
              Untuk mengubah status kupon yang sudah diRETURNEDkan dalam mode event, masukkan kode verifikasi yang telah
              dikirim ke email admin.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {redoCount > 0 && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="text-sm text-yellow-800 dark:text-yellow-200">
                  Jumlah redo yang telah dilakukan: {redoCount}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="redo-code">Kode Verifikasi</Label>
              <Input
                id="redo-code"
                value={redoCode}
                onChange={(e) => setRedoCode(e.target.value)}
                placeholder="Masukkan 6 digit kode"
                maxLength={6}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRedoDialog(false)}>
              Batal
            </Button>
            <Button variant="outline" onClick={handleRedoRequest}>
              Kirim Kode
            </Button>
            <Button onClick={handleRedoVerify} disabled={!redoCode}>
              Verifikasi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}