"use client"

import { useState, useEffect } from "react"
import { Html5QrcodeScanner } from "html5-qrcode"
import { toast } from "sonner"
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function QRScanner() {
  const [scanResult, setScanResult] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [lastScanned, setLastScanned] = useState<{
    hewanId: string
    status: string
    previousStatus: string
    timestamp: Date
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Initialize QR scanner
    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      /* verbose= */ false,
    )

    let mounted = true

    function onScanSuccess(decodedText: string) {
      if (mounted && !isProcessing) {
        setScanResult(decodedText)
        processQrCode(decodedText)
      }
    }

    function onScanFailure(error: any) {
      // Handle scan failure if needed
      console.warn(`QR scan error: ${error}`)
    }

    scanner.render(onScanSuccess, onScanFailure)

    return () => {
      mounted = false
      scanner.clear().catch((error) => {
        console.error("Failed to clear scanner", error)
      })
    }
  }, [isProcessing])

  const processQrCode = async (qrData: string) => {
    setIsProcessing(true)
    setError(null)

    try {
      // Extract hewanId from QR code
      // Assuming QR format is "SMQ-{id}-{hewanId}" or just the hewanId
      let hewanId = qrData
      if (qrData.startsWith("SMQ-")) {
        const parts = qrData.split("-")
        if (parts.length >= 3) {
          hewanId = parts[2]
        }
      }

      // Call API to update status
      const response = await fetch("/api/hewan/update-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ hewanId }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(result.message)
        setLastScanned({
          hewanId: result.data.hewanId,
          status: result.data.status,
          previousStatus: result.data.previousStatus,
          timestamp: new Date(),
        })
      } else {
        setError(result.message)
        toast.error(result.message)
      }
    } catch (error) {
      console.error("Error processing QR code:", error)
      setError("Terjadi kesalahan saat memproses QR code")
      toast.error("Terjadi kesalahan saat memproses QR code")
    } finally {
      // Reset after a delay to allow for next scan
      setTimeout(() => {
        setIsProcessing(false)
        setScanResult(null)
      }, 3000)
    }
  }

  const resetScanner = () => {
    setIsProcessing(false)
    setScanResult(null)
    setError(null)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-6">
          <div className="text-center mb-4">
            <h3 className="text-lg font-medium">Scanner QR Code</h3>
            <p className="text-sm text-muted-foreground">Arahkan kamera ke QR code pada hewan qurban</p>
          </div>

          {isProcessing ? (
            <div className="flex flex-col items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p>Memproses QR code...</p>
            </div>
          ) : (
            <div id="qr-reader" className="w-full"></div>
          )}
        </CardContent>
        <CardFooter className="bg-muted/50 px-6 py-4">
          <div className="w-full text-center">
            {isProcessing ? (
              <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                Sedang Memproses
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-green-100 text-green-800">
                Siap Scan
              </Badge>
            )}
          </div>
        </CardFooter>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {lastScanned && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <CheckCircle className="h-6 w-6 text-green-500 mt-1" />
              <div>
                <h4 className="font-medium">Berhasil Update Status</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  ID Hewan: <span className="font-medium">{lastScanned.hewanId}</span>
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline">{lastScanned.previousStatus}</Badge>
                  <span className="text-muted-foreground">→</span>
                  <Badge>{lastScanned.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-3">{lastScanned.timestamp.toLocaleTimeString()}</p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/50 px-6 py-3">
            <Button variant="ghost" size="sm" className="ml-auto" onClick={resetScanner}>
              Scan Lagi
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  )
}
