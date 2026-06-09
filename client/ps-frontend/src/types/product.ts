export interface ProductCategory {
  id: number
  name: string
  code?: string
  sortOrder?: number
}

export interface ProductItem {
  id: number
  name: string
  description?: string
  salePrice: string
  marketPrice?: string
  images: string[]
  thumbnail?: string
  stockQuantity?: number
  salesVolume?: number
  unit?: string
  specification?: string
  status?: string
  // alias fields returned by API
  price?: string
  stock?: number
  salesCount?: number
}
