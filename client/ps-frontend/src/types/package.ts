export interface PackageCategory {
  id: number
  name: string
  icon?: string
  color?: string
  sortOrder?: number
}

export interface PackageItem {
  id: number
  name: string
  description?: string
  price: string
  deposit?: string
  images: string[]
  category: string
  categoryId?: number
  isPopular?: boolean
  salesVolume?: number
  baseSales?: number
  includes?: string[]
  durationMinutes?: number
  status?: string
  style?: string
  tags?: string[]
  sortOrder?: number
}
