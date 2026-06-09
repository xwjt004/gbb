import api from './api'

export async function fetchHomeData() {
  const res: any = await api.get('/wx-mall/home')
  return res.data || res
}
