import { Card, Tag } from 'antd'
import { useNavigate } from 'react-router-dom'
import Image from '../Image'

interface Props {
  item: any
}

export default function ProductCard({ item }: Props) {
  const navigate = useNavigate()
  const coverImage = item.thumbnail || item.coverImage || item.images?.[0]
  const price = item.salePrice ?? item.price ?? 0
  const originalPrice = item.marketPrice ?? item.originalPrice
  const stock = item.stockQuantity ?? item.stock
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
      onClick={() => navigate(`/products/${item.id}`)}
    >
      <Card.Meta
        title={item.name}
        description={
          <div>
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
            <div style={{ color: '#999', fontSize: 12, marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
              <span>已售 {salesCount ?? 0}</span>
              {stock !== undefined && <span>库存 {stock}</span>}
            </div>
          </div>
        }
      />
    </Card>
  )
}
