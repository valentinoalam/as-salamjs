"use client"

import React, { useRef } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { type QrDesignOptions as QrDesignOptionsType } from '@/types/qr'
import { Upload, X } from 'lucide-react'
import Image from 'next/image'

interface QrDesignOptionsProps {
  designOptions: QrDesignOptionsType
  setDesignOptions: (options: QrDesignOptionsType) => void
  onLogoUpload: (file: File | null) => void
  logoImage: string | null
}

export function QrDesignOptions({ 
  designOptions, 
  setDesignOptions,
  onLogoUpload,
  logoImage
}: QrDesignOptionsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFgColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDesignOptions({
      ...designOptions,
      fgColor: e.target.value
    })
  }

  const handleBgColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDesignOptions({
      ...designOptions,
      bgColor: e.target.value
    })
  }

  const handleErrorCorrectionLevelChange = (value: string) => {
    setDesignOptions({
      ...designOptions,
      errorCorrectionLevel: value as 'L' | 'M' | 'Q' | 'H'
    })
  }

  const handleLogoSizeChange = (value: number[]) => {
    setDesignOptions({
      ...designOptions,
      logoSize: value[0]
    })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0]
    onLogoUpload(file || null)
  }

  const handleRemoveLogo = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onLogoUpload(null)
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="fg-color">Foreground Color</Label>
          <div className="flex items-center space-x-2">
            <div 
              className="w-8 h-8 rounded border" 
              style={{ backgroundColor: designOptions.fgColor }}
            />
            <Input
              id="fg-color"
              type="color"
              value={designOptions.fgColor}
              onChange={handleFgColorChange}
              className="w-20 h-10 p-1"
            />
            <Input
              type="text"
              value={designOptions.fgColor}
              onChange={handleFgColorChange}
              className="w-24 uppercase"
              maxLength={7}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bg-color">Background Color</Label>
          <div className="flex items-center space-x-2">
            <div 
              className="w-8 h-8 rounded border" 
              style={{ backgroundColor: designOptions.bgColor }}
            />
            <Input
              id="bg-color"
              type="color"
              value={designOptions.bgColor}
              onChange={handleBgColorChange}
              className="w-20 h-10 p-1"
            />
            <Input
              type="text"
              value={designOptions.bgColor}
              onChange={handleBgColorChange}
              className="w-24 uppercase"
              maxLength={7}
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="correction-level">Error Correction Level</Label>
        <Select 
          value={designOptions.errorCorrectionLevel} 
          onValueChange={handleErrorCorrectionLevelChange}
        >
          <SelectTrigger id="correction-level">
            <SelectValue placeholder="Select error correction level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="L">
              Low (7% recovery)
            </SelectItem>
            <SelectItem value="M">
              Medium (15% recovery)
            </SelectItem>
            <SelectItem value="Q">
              Quartile (25% recovery)
            </SelectItem>
            <SelectItem value="H">
              High (30% recovery)
            </SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Higher levels allow more damage/logo coverage but make QR denser
        </p>
      </div>

      <div className="space-y-4">
        <Label>Logo</Label>
        <div className="flex flex-col items-center justify-center space-y-4 p-4 border-2 border-dashed border-muted-foreground/20 rounded-lg">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/png, image/jpeg, image/svg+xml"
            onChange={handleFileChange}
            className="hidden"
          />

          {logoImage ? (
            <div className="relative">
              <Image width={96} height={96} 
                src={logoImage} 
                alt="Logo" 
                className="w-24 h-24 object-contain"
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute -top-3 -right-3 h-6 w-6 rounded-full"
                onClick={handleRemoveLogo}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload Logo
            </Button>
          )}
        </div>

        {logoImage && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="logo-size">Logo Size ({designOptions.logoSize}%)</Label>
            </div>
            <Slider
              id="logo-size"
              value={[designOptions.logoSize]}
              min={10}
              max={30}
              step={1}
              onValueChange={handleLogoSizeChange}
            />
            <p className="text-xs text-muted-foreground">
              Adjust logo size as percentage of QR code (10-30%)
            </p>
          </div>
        )}
      </div>
    </div>
  )
}