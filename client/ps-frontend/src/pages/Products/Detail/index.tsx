import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Typography, Tag, Button, Carousel, Divider } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { fetchProductDetail } from '../../../services/products'
import Image from '../../../components/Image'
import Loading from '../../../components/Loading'

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [product, setProduct] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      fetchProductDetail(Number(id))
        .then((res: any) => setProduct(res))
        .finally(() => setLoading(false))
    }
  }, [id])

  if (loading) return <Loading type="detail" />
  if (!product) return <Typography.Text type="secondary">商品不存在</Typography.Text>

  const images = product.images?.length ? product.images : product.thumbnail ? [product.thumbnail] : []
  const price = product.salePrice ?? product.price ?? 0
  const originalPrice = product.marketPrice ?? product.originalPrice
  const stock = product.stockQuantity ?? product.stock
  const salesCount = product.salesCount ?? product.salesVolume

  return (
    <div style={{ padding: '24px 0' }}>
      <Button
        type="link"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/products')}
        style={{ padding: 0, marginBottom: 16 }}
      >
        返回商品列表
      </Button>

      {images.length > 0 && (
        <div style={{ maxWidth: 600, margin: '0 auto 24px' }}>
          <Carousel autoplay>
            {images.map((img: string, i: number) => (
              <Image
                key={i}
                src={img}
                alt={`${product.name} - ${i + 1}`}
                style={{ width: '100%', height: 400, objectFit: 'cover', borderRadius: 8 }}
              />
            ))}
          </Carousel>
        </div>
      )}

      <Typography.Title level={2}>{product.name}</Typography.Title>

      <div style={{ margin: '16px 0' }}>
        <span style={{ color: '#ff4d4f', fontSize: 28, fontWeight: 'bold' }}>
          ¥{price}
        </span>
        {originalPrice && Number(originalPrice) > Number(price) && (
          <span style={{ color: '#999', textDecoration: 'line-through', marginLeft: 12, fontSize: 16 }}>
            ¥{originalPrice}
          </span>
        )}
      </div>

      {product.specification && <Tag color="blue">规格: {product.specification}</Tag>}
      {product.unit && <Tag color="green" style={{ marginLeft: 4 }}>单位: {product.unit}</Tag>}

      <div style={{ color: '#999', fontSize: 14, marginTop: 8 }}>
        <span>已售 {salesCount ?? 0}</span>
        {stock !== undefined && <span style={{ marginLeft: 16 }}>库存 {stock}</span>}
      </div>

      {product.description && (
        <>
          <Divider />
          <Typography.Title level={4}>商品介绍</Typography.Title>
          <Typography.Paragraph style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
            {product.description}
          </Typography.Paragraph>
        </>
      )}

      <div style={{ textAlign: 'center', marginTop: 32 }}>
        <Typography.Text type="secondary">
          如需购买，请前往微信小程序下单
        </Typography.Text>
      </div>
    </div>
  )
}
