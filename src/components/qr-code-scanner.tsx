"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Camera, CameraOff } from "lucide-react"

interface QRCodeScannerProps {
  onScan: (data: string) => void
  onError: (error: string) => void
}

export function QRCodeScanner({ onScan, onError }: QRCodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [stream])

  const startScanning = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }, // Use back camera if available
      })

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        setStream(mediaStream)
        setIsScanning(true)

        // Start scanning loop
        scanQRCode()
      }
    } catch (error) {
      onError("Failed to access camera")
    }
  }

  const stopScanning = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }
    setIsScanning(false)
  }

  const scanQRCode = () => {
    if (!videoRef.current || !canvasRef.current || !isScanning) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext("2d")

    if (!context) return

    // Set canvas size to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Get image data
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height)

    // Here you would typically use a QR code library like jsQR
    // For now, we'll simulate QR code detection
    // In a real implementation, you'd use: const code = jsQR(imageData.data, imageData.width, imageData.height)

    // Simulate QR code detection (replace with actual QR library)
    setTimeout(() => {
      if (isScanning) {
        scanQRCode()
      }
    }, 100)
  }

  // Manual input fallback
  const [manualInput, setManualInput] = useState("")

  const handleManualSubmit = () => {
    if (manualInput.trim()) {
      onScan(manualInput.trim())
      setManualInput("")
    }
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        {isScanning ? (
          <div className="space-y-4">
            <video ref={videoRef} autoPlay playsInline className="w-full max-w-md mx-auto rounded-lg" />
            <canvas ref={canvasRef} className="hidden" />
            <Button onClick={stopScanning} variant="outline" className="w-full bg-transparent">
              <CameraOff className="h-4 w-4 mr-2" />
              Stop Scanning
            </Button>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <div className="w-full max-w-md mx-auto h-48 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
              <Camera className="h-12 w-12 text-gray-400" />
            </div>
            <Button onClick={startScanning} className="w-full">
              <Camera className="h-4 w-4 mr-2" />
              Start Camera
            </Button>
          </div>
        )}
      </div>

      <div className="border-t pt-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Manual Input</label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="Enter coupon number"
              className="flex-1 px-3 py-2 border rounded-md"
              onKeyPress={(e) => e.key === "Enter" && handleManualSubmit()}
            />
            <Button onClick={handleManualSubmit} disabled={!manualInput.trim()}>
              Submit
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
