export type QrType = 'url' | 'text' | 'wifi'

export interface QrCodeData {
  type: QrType
  url: string
  text: string
  wifi: {
    ssid: string
    password: string
    encryption: 'WPA' | 'WEP' | 'nopass'
  }
}

export interface QrDesignOptions {
  fgColor: string
  bgColor: string
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H'
  size: number
  includeMargin: boolean
  logo: string | null
  logoSize: number
}