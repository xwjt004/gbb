import api from './api'

export async function fetchPackages(params?: Record<string, any>) {
  const res: any = await api.get('/wx-mall/packages', { params })
  return res.packages || res.data?.packages || res || []
}

export async function fetchPackageDetail(id: number) {
  const res: any = await api.get(`/wx-mall/packages/${id}`)
  return res.data || res
}
