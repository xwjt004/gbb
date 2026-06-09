export interface Banner {
  id: number | string
  image: string
  link?: string
  title?: string
}

export interface HomeData {
  banners: Banner[]
  hotPackages: any[]
  recommendProducts: any[]
  stats: {
    totalOrders: number
    totalPackages: number
    totalProducts: number
  }
}
