import { useState } from 'react'
import { formatImageUrl } from '../../utils/image'

interface Props {
  src?: string
  alt?: string
  className?: string
  style?: React.CSSProperties
  fallback?: string
}

const defaultFallback =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" fill="%23f0f0f0"%3E%3Crect width="200" height="200"/%3E%3Ctext x="50%25" y="50%25" fill="%23ccc" text-anchor="middle" dy=".3em" font-size="14"%3E暂无图片%3C/text%3E%3C/svg%3E'

export default function Image({ src, alt = '', className, style, fallback }: Props) {
  const [error, setError] = useState(false)
  const url = formatImageUrl(src)

  return (
    <img
      src={error || !url ? fallback || defaultFallback : url}
      alt={alt}
      className={className}
      style={style}
      onError={() => setError(true)}
    />
  )
}
