import api from './api'

export async function fetchProducts(params?: Record<string, any>) {
  const res: any = await api.get('/wx-mall/products', { params })
  return res.items || res.data?.items || res || []
}

export async function fetchProductDetail(id: number) {
  const res: any = await api.get(`/wx-mall/products/${id}`)
  return res.data || res
}
