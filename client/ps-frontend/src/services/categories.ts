import api from './api'

export async function fetchPackageCategories() {
  const res: any = await api.get('/wx-mall/categories')
  return res.data || res || []
}
