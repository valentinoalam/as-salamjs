export interface HeroImage {
  id: string
  url: string
  filename: string
  uploadedAt: string
  width?: number
  height?: number
  size?: number
  type?: string
}

export interface SettingValue {
  // Logo settings
  logoImage: string
  logoTitle: string

  // Hero settings
  useCarousel: boolean
  selectedHeroImageIds: string[]
  heroTitle: string
  heroSubtitle: string

  // Group settings
  itemsPerGroup: number
  customGroups: CustomGroup[]
}

export interface CustomGroup {
  id: string;
  name: string;
  itemCount: number;
  description?: string | null;
  order?: number | null;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date | null;
  animalType?: 'HEWAN_BESAR' | 'HEWAN_KECIL' | 'ALL' | null;
}

export interface GroupSettings {
  itemsPerGroup: number
}

export interface LogoSettings {
  logoImage?: string
  logoTitle?: string
}
