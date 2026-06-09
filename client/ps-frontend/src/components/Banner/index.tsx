import { useEffect, useRef, useState, useCallback } from 'react'
import { formatImageUrl } from '../../utils/image'

interface BannerItem {
  image: string
  link?: string
  title?: string
}

interface Props {
  items: BannerItem[]
  interval?: number
}

const defaultFallback =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" fill="%23f0f0f0"%3E%3Crect width="200" height="200"/%3E%3C/svg%3E'

export default function Banner({ items, interval = 4000 }: Props) {
  const [current, setCurrent] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const len = items?.length || 0

  const goTo = useCallback((index: number) => {
    setCurrent(((index % len) + len) % len)
  }, [len])

  const next = useCallback(() => {
    goTo(current + 1)
  }, [current, goTo])

  // Auto-play
  useEffect(() => {
    if (len < 2) return
    timerRef.current = setInterval(next, interval)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [next, interval, len])

  if (len === 0) return null

  return (
    <div style={{ position: 'relative', width: '100%', overflow: 'hidden', background: '#f0f0f0' }}>
      {/* Slide container */}
      <div style={{ position: 'relative', width: '100%', height: 0, paddingBottom: '31.25%' /* 1920x600 比例 */ }}>
        {items.map((item, index) => (
          <a
            key={index}
            href={item.link || undefined}
            target={item.link ? '_blank' : undefined}
            rel="noopener noreferrer"
            style={{
              position: 'absolute',
              inset: 0,
              opacity: index === current ? 1 : 0,
              transition: 'opacity 0.6s ease-in-out',
              zIndex: index === current ? 1 : 0,
            }}
          >
            <img
              src={formatImageUrl(item.image) || defaultFallback}
              alt={item.title || 'banner'}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              onError={(e) => { (e.target as HTMLImageElement).src = defaultFallback }}
            />
          </a>
        ))}
      </div>

      {/* Dots */}
      {len > 1 && (
        <ul
          style={{
            position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
            display: 'flex', gap: 8, margin: 0, padding: 0, listStyle: 'none', zIndex: 2,
          }}
        >
          {items.map((_, index) => (
            <li key={index} style={{ cursor: 'pointer' }} onClick={() => goTo(index)}>
              <button
                aria-label={`切换到第 ${index + 1} 张`}
                style={{
                  width: index === current ? 24 : 8,
                  height: 8,
                  borderRadius: 4,
                  border: 'none',
                  background: index === current ? '#ff4d4f' : 'rgba(255,255,255,0.6)',
                  transition: 'all 0.3s',
                  cursor: 'pointer',
                  padding: 0,
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
