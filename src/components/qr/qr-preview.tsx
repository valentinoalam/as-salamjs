"use client"

import React, { useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import type { QrDesignOptions, QrCodeData } from '@/types/qr'
import { Card } from '@/components/ui/card'

interface QrPreviewProps {
  value: string
  options: QrDesignOptions
  qrData: QrCodeData
}

export function QrPreview({ value, options, qrData }: QrPreviewProps) {
  const qrContainerRef = useRef<HTMLDivElement>(null)
  const qrSize = options.size || 256

  const renderQrType = () => {
    switch (qrData.type) {
      case 'url':
        return 'URL'
      case 'text':
        return 'Text'
      case 'wifi':
        return 'Wi-Fi'
      default:
        return 'QR Code'
    }
  }

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto">
      <Card className="p-6 mb-4 w-full flex items-center justify-center bg-white rounded-xl shadow-sm transition-all duration-300 relative overflow-hidden">
        <div ref={qrContainerRef} className="relative">
          <QRCodeSVG
            value={value}
            size={qrSize}
            level={options.errorCorrectionLevel}
            bgColor={options.bgColor}
            fgColor={options.fgColor}
            includeMargin={options.includeMargin}
            className="transition-all duration-300"
          />
          
          {options.logo && (
            <div
              className="absolute pointer-events-none flex items-center justify-center"
              style={{
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: `${options.logoSize}%`,
                height: `${options.logoSize}%`,
              }}
            >
              <div className="bg-white p-1 rounded-md w-full h-full flex items-center justify-center">
                <img
                  src={options.logo}
                  alt="Logo"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            </div>
          )}
        </div>
      </Card>
      
      <div className="text-lg font-medium mb-2">
        {renderQrType()} QR Code Preview
      </div>
      <p className="text-sm text-muted-foreground text-center max-w-xs">
        This preview updates automatically as you change content or design options
      </p>
    </div>
  )
}