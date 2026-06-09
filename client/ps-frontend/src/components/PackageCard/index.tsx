import { Card, Tag } from 'antd'
import { useNavigate } from 'react-router-dom'
import Image from '../Image'

interface Props {
  item: any
}

export default function PackageCard({ item }: Props) {
  const navigate = useNavigate()
  const coverImage = item.images?.[0] || item.coverImage
  const price = item.currentPrice ?? item.price ?? item.deposit ?? 0
  const originalPrice = item.originalPrice
  const categoryName = item.categoryName || item.category
  const salesCount = item.salesCount ?? item.salesVolume

  return (
    <Card
      hoverable
      style={{ width: 280 }}
      cover={
        <Image
          src={coverImage}
          alt={item.name}
          style={{ height: 200, objectFit: 'cover' }}
        />
      }
      onClick={() => navigate(`/packages/${item.id}`)}
    >
      <Card.Meta
        title={item.name}
        description={
          <div>
            {categoryName && <Tag color="blue">{categoryName}</Tag>}
            <div style={{ marginTop: 8 }}>
              <span style={{ color: '#ff4d4f', fontSize: 18, fontWeight: 'bold' }}>
                ¥{price}
              </span>
              {originalPrice && Number(originalPrice) > Number(price) && (
                <span style={{ color: '#999', textDecoration: 'line-through', marginLeft: 8, fontSize: 13 }}>
                  ¥{originalPrice}
                </span>
              )}
            </div>
            {salesCount !== undefined && (
              <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
                已售 {salesCount}
              </div>
            )}
          </div>
        }
      />
    </Card>
  )
}
