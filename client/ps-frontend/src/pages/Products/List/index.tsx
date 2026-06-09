import { useEffect, useState } from 'react'
import { Row, Col, Typography } from 'antd'
import { fetchProducts } from '../../../services/products'
import ProductCard from '../../../components/ProductCard'
import Loading from '../../../components/Loading'

export default function ProductList() {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProducts()
      .then((res: any) => setProducts(Array.isArray(res) ? res : []))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Loading type="card" />

  return (
    <div style={{ padding: '24px 0' }}>
      <Typography.Title level={2} style={{ marginBottom: 24 }}>全部商品</Typography.Title>

      {products.length === 0 ? (
        <Typography.Text type="secondary">暂无商品数据</Typography.Text>
      ) : (
        <Row gutter={[16, 16]}>
          {products.map((product) => (
            <Col key={product.id} xs={12} sm={8} md={6}>
              <ProductCard item={product} />
            </Col>
          ))}
        </Row>
      )}
    </div>
  )
}
