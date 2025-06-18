"use client"

import React from 'react'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import type { QrCodeData, QrType } from '@/types/qr'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

interface QrDataFormProps {
  qrData: QrCodeData
  setQrData: (data: QrCodeData) => void
}

export function QrDataForm({ qrData, setQrData }: QrDataFormProps) {
  const handleTypeChange = (value: QrType) => {
    setQrData({
      ...qrData,
      type: value
    })
  }

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQrData({
      ...qrData,
      url: e.target.value
    })
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setQrData({
      ...qrData,
      text: e.target.value
    })
  }

  const handleWifiChange = (field: keyof typeof qrData.wifi, value: string) => {
    setQrData({
      ...qrData,
      wifi: {
        ...qrData.wifi,
        [field]: value
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="qr-type">QR Code Type</Label>
        <Select 
          value={qrData.type} 
          onValueChange={handleTypeChange as (value: string) => void}
        >
          <SelectTrigger id="qr-type">
            <SelectValue placeholder="Select QR code type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="url">URL</SelectItem>
            <SelectItem value="text">Text</SelectItem>
            <SelectItem value="wifi">Wi-Fi</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {qrData.type === 'url' && (
        <div className="space-y-2">
          <Label htmlFor="url-input">URL</Label>
          <Input
            id="url-input"
            type="url"
            placeholder="https://example.com"
            value={qrData.url}
            onChange={handleUrlChange}
          />
          <p className="text-xs text-muted-foreground">
            Enter a valid web address including http:// or https://
          </p>
        </div>
      )}

      {qrData.type === 'text' && (
        <div className="space-y-2">
          <Label htmlFor="text-input">Text</Label>
          <Textarea
            id="text-input"
            placeholder="Enter your text message"
            value={qrData.text}
            onChange={handleTextChange}
            rows={5}
          />
          <p className="text-xs text-muted-foreground">
            Enter any text that you want to encode in the QR code
          </p>
        </div>
      )}

      {qrData.type === 'wifi' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="wifi-ssid">Network Name (SSID)</Label>
            <Input
              id="wifi-ssid"
              placeholder="Your Wi-Fi network name"
              value={qrData.wifi.ssid}
              onChange={(e) => handleWifiChange('ssid', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="wifi-password">Password</Label>
            <Input
              id="wifi-password"
              type="password"
              placeholder="Wi-Fi password"
              value={qrData.wifi.password}
              onChange={(e) => handleWifiChange('password', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Encryption Type</Label>
            <RadioGroup 
              value={qrData.wifi.encryption}
              onValueChange={(value) => handleWifiChange('encryption', value)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="WPA" id="encryption-wpa" />
                <Label htmlFor="encryption-wpa" className="cursor-pointer">WPA/WPA2</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="WEP" id="encryption-wep" />
                <Label htmlFor="encryption-wep" className="cursor-pointer">WEP</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="nopass" id="encryption-none" />
                <Label htmlFor="encryption-none" className="cursor-pointer">None</Label>
              </div>
            </RadioGroup>
          </div>
        </div>
      )}
    </div>
  )
}