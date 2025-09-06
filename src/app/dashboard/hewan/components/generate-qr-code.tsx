"use client"

import { useState } from "react"
import { QRCodeSVG } from "qrcode.react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { QrCode, Download, Printer } from "lucide-react"
import { useReactToPrint } from "react-to-print"
import { useRef } from "react"

interface GenerateQRCodeProps {
  hewan: {
    id: string
    hewanId: string
    type: string
  }
}

export function GenerateQRCode({ hewan }: GenerateQRCodeProps) {
  const [isOpen, setIsOpen] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  const qrValue = `SMQ-${hewan.id}-${hewan.hewanId}`

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `QR_Code_${hewan.hewanId}`,
  })

  const downloadQRCode = () => {
    const canvas = document.getElementById("qr-canvas") as HTMLCanvasElement
    if (canvas) {
      const pngUrl = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream")

      const downloadLink = document.createElement("a")
      downloadLink.href = pngUrl
      downloadLink.download = `QR_Code_${hewan.hewanId}.png`
      document.body.appendChild(downloadLink)
      downloadLink.click()
      document.body.removeChild(downloadLink)
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <QrCode className="h-4 w-4 mr-2" />
            QR Code
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>QR Code Hewan Qurban</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-4">
            <div ref={printRef} className="p-6 bg-white rounded-lg">
              <div className="text-center mb-4">
                <h3 className="font-bold">ID: {hewan.hewanId}</h3>
                <p className="text-sm text-muted-foreground">{hewan.type}</p>
              </div>
              <div className="flex justify-center">
                <QRCodeSVG
                  id="qr-svg"
                  value={qrValue}
                  size={200}
                  level="H"
                  includeMargin
                  imageSettings={{
                    src: "/placeholder.svg?height=24&width=24",
                    height: 24,
                    width: 24,
                    excavate: true,
                  }}
                />
                <canvas id="qr-canvas" style={{ display: "none" }} />
              </div>
              <p className="text-xs text-center mt-4 text-muted-foreground">Scan untuk update status hewan qurban</p>
            </div>
          </div>
          <div className="flex justify-center gap-4 mt-2">
            <Button variant="outline" onClick={downloadQRCode}>
              <Download className="h-4 w-4 mr-2" />
              Unduh
            </Button>
            <Button onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Cetak
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
