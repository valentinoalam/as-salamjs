"use client"

import ReactDOMServer from 'react-dom/server'
import { Button } from '@/components/ui/button'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import type { QrDesignOptions } from '@/types/qr'
import { QRCodeSVG } from 'qrcode.react'
import { toast } from 'sonner'
import { Download } from 'lucide-react'
import { useState } from 'react'

interface ExportButtonsProps {
  value: string
  options: QrDesignOptions
}

export function ExportButtons({ value, options }: ExportButtonsProps) {
  const [exportSize, setExportSize] = useState<string>('512')

  const downloadPNG = () => {
    try {
      const size = parseInt(exportSize)
      const scaleFactor = window.devicePixelRatio || 1
      const canvas = document.createElement('canvas')
      canvas.width = size * scaleFactor
      canvas.height = size * scaleFactor

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        toast.error('Canvas context not supported')
        return
      }

      ctx.scale(scaleFactor, scaleFactor)
      ctx.fillStyle = options.bgColor
      ctx.fillRect(0, 0, size, size)

      const qrSize = size * 0.9
      const margin = (size - qrSize) / 2

      const svgString = ReactDOMServer.renderToStaticMarkup(
        <QRCodeSVG
          value={value}
          size={qrSize}
          level={options.errorCorrectionLevel}
          bgColor="transparent"
          fgColor={options.fgColor}
          includeMargin={false}
        />
      )

      const img = new Image()
      img.src = 'data:image/svg+xml;base64,' + btoa(svgString)

      img.onload = () => {
        ctx.drawImage(img, margin, margin, qrSize, qrSize)

        if (options.logo) {
          const logoImg = new Image()
          logoImg.src = options.logo

          logoImg.onload = () => {
            const logoSize = size * (options.logoSize / 100)
            const logoX = (size - logoSize) / 2
            const logoY = (size - logoSize) / 2

            ctx.fillStyle = '#FFFFFF'
            ctx.fillRect(logoX, logoY, logoSize, logoSize)
            ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize)

            triggerDownload(canvas)
          }

          logoImg.onerror = () => {
            triggerDownload(canvas, true)
          }
        } else {
          triggerDownload(canvas)
        }
      }

      img.onerror = () => {
        toast.error('Failed to render QR code image')
      }
    } catch (error) {
      console.error(error)
      toast.error('Error downloading PNG')
    }
  }

  const downloadSVG = () => {
    try {
      const size = parseInt(exportSize)
      const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      svgEl.setAttribute('width', size.toString())
      svgEl.setAttribute('height', size.toString())
      svgEl.setAttribute('viewBox', `0 0 ${size} ${size}`)

      const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      bg.setAttribute('width', size.toString())
      bg.setAttribute('height', size.toString())
      bg.setAttribute('fill', options.bgColor)
      svgEl.appendChild(bg)

      const qrSize = size * 0.9
      const margin = (size - qrSize) / 2

      const qrSVGString = ReactDOMServer.renderToStaticMarkup(
        <QRCodeSVG
          value={value}
          size={qrSize}
          level={options.errorCorrectionLevel}
          bgColor="transparent"
          fgColor={options.fgColor}
          includeMargin={false}
        />
      )

      const parser = new DOMParser()
      const qrDoc = parser.parseFromString(qrSVGString, 'image/svg+xml')
      const qrPaths = qrDoc.querySelectorAll('path')

      const group = document.createElementNS('http://www.w3.org/2000/svg', 'g')
      group.setAttribute('transform', `translate(${margin}, ${margin})`)

      qrPaths.forEach(path => {
        group.appendChild(path.cloneNode(true))
      })

      svgEl.appendChild(group)

      if (options.logo) {
        const logoSize = size * (options.logoSize / 100)
        const logoX = (size - logoSize) / 2
        const logoY = (size - logoSize) / 2

        const logoBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
        logoBg.setAttribute('x', logoX.toString())
        logoBg.setAttribute('y', logoY.toString())
        logoBg.setAttribute('width', logoSize.toString())
        logoBg.setAttribute('height', logoSize.toString())
        logoBg.setAttribute('fill', '#FFFFFF')
        svgEl.appendChild(logoBg)

        const logoImage = document.createElementNS('http://www.w3.org/2000/svg', 'image')
        logoImage.setAttribute('x', logoX.toString())
        logoImage.setAttribute('y', logoY.toString())
        logoImage.setAttribute('width', logoSize.toString())
        logoImage.setAttribute('height', logoSize.toString())
        logoImage.setAttributeNS('http://www.w3.org/1999/xlink', 'href', options.logo)
        svgEl.appendChild(logoImage)
      }

      const svgString = new XMLSerializer().serializeToString(svgEl)
      const a = document.createElement('a')
      a.href = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString)
      a.download = `qrcode-${Date.now()}.svg`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)

      toast.success('SVG Downloaded Successfully')
    } catch (error) {
      console.error(error)
      toast.error('Error downloading SVG')
    }
  }

  const triggerDownload = (canvas: HTMLCanvasElement, noLogo = false) => {
    const link = document.createElement('a')
    link.href = canvas.toDataURL('image/png')
    link.download = `qrcode-${Date.now()}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast.success(`PNG Downloaded Successfully${noLogo ? ' (without logo)' : ''}`)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-4">
        <div className="flex-1 space-y-2">
          <label htmlFor="export-size" className="text-sm font-medium">
            Export Size
          </label>
          <Select 
            value={exportSize} 
            onValueChange={setExportSize}
          >
            <SelectTrigger id="export-size">
              <SelectValue placeholder="Select size" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="256">256 x 256 px</SelectItem>
              <SelectItem value="512">512 x 512 px</SelectItem>
              <SelectItem value="1024">1024 x 1024 px</SelectItem>
              <SelectItem value="2048">2048 x 2048 px</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Button 
          onClick={downloadPNG}
          className="w-full"
        >
          <Download className="mr-2 h-4 w-4" />
          Download PNG
        </Button>
        <Button 
          onClick={downloadSVG}
          variant="outline"
          className="w-full"
        >
          <Download className="mr-2 h-4 w-4" />
          Download SVG
        </Button>
      </div>
    </div>
  )
}