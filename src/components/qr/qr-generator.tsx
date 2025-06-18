"use client"

import React, { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { QrDataForm } from '@/components/qr/qr-data-form'
import { QrDesignOptions } from '@/components/qr/qr-design-options'
import { QrPreview } from '@/components/qr/qr-preview'
import { ExportButtons } from '@/components/qr/export-buttons'
import { Card, CardContent } from '@/components/ui/card'
import type { QrCodeData, QrDesignOptions as QrDesignOptionsType, QrType } from '@/types/qr'

export function QrGenerator() {
  // QR code data state
  const [qrData, setQrData] = useState<QrCodeData>({
    type: 'url' as QrType,
    url: 'https://example.com',
    text: '',
    wifi: {
      ssid: '',
      password: '',
      encryption: 'WPA'
    }
  })

  // QR code design options state
  const [designOptions, setDesignOptions] = useState<QrDesignOptionsType>({
    fgColor: '#000000',
    bgColor: '#FFFFFF',
    errorCorrectionLevel: 'M',
    size: 256,
    includeMargin: true,
    logo: null,
    logoSize: 20
  })

  // Active tab state
  const [activeTab, setActiveTab] = useState('data')

  // Logo state
  const [logoImage, setLogoImage] = useState<string | null>(null)

  // Handle logo upload
  const handleLogoUpload = (file: File | null) => {
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        if (e.target?.result) {
          setLogoImage(e.target.result as string)
          setDesignOptions({
            ...designOptions,
            logo: e.target.result as string
          })
        }
      }
      reader.readAsDataURL(file)
    } else {
      setLogoImage(null)
      setDesignOptions({
        ...designOptions,
        logo: null
      })
    }
  }

  // Get value for QR code based on type
  const getQrValue = (): string => {
    switch (qrData.type) {
      case 'url':
        return qrData.url || 'https://example.com'
      case 'text':
        return qrData.text || 'Sample text'
      case 'wifi':
        const { ssid, password, encryption } = qrData.wifi
        return `WIFI:T:${encryption};S:${ssid};P:${password};;`
      default:
        return 'https://example.com'
    }
  }

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="data">Data Input</TabsTrigger>
            <TabsTrigger value="design">Design Options</TabsTrigger>
          </TabsList>
          
          <TabsContent value="data" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                <QrDataForm 
                  qrData={qrData} 
                  setQrData={setQrData} 
                />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="design" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                <QrDesignOptions 
                  designOptions={designOptions} 
                  setDesignOptions={setDesignOptions}
                  onLogoUpload={handleLogoUpload}
                  logoImage={logoImage}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      <div className="flex flex-col space-y-6">
        <Card className="flex-1">
          <CardContent className="p-6 flex flex-col items-center justify-center">
            <QrPreview 
              value={getQrValue()} 
              options={designOptions}
              qrData={qrData}
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <ExportButtons 
              value={getQrValue()} 
              options={designOptions}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}