const API_BASE = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || ''

export function formatImageUrl(url?: string): string | undefined {
  if (!url) return undefined
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `${API_BASE}${url}`
}
