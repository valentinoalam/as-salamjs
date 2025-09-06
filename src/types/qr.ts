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
export interface QRCodeMudhohi {
  mudhohi_id: string;
  dash_code: string;
  nama_pengqurban: string;
  quantity: number;
  tipe_hewan: string;
  created_at: string;
}

export interface QRCodeOptions {
  format?: 'png' | 'svg';
  size?: number;
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
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