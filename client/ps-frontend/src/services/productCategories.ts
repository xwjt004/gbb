import api from './api'

export async function fetchProductCategories() {
  const res: any = await api.get('/wx-mall/product-categories')
  return res.data || res || []
}
