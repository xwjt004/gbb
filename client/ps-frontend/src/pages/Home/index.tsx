import { useEffect, useState } from 'react'
import { Row, Col, Card, Statistic } from 'antd'
import { CameraOutlined, ShoppingOutlined, SmileOutlined } from '@ant-design/icons'
import { fetchHomeData } from '../../services/home'
import Banner from '../../components/Banner'
import SectionTitle from '../../components/SectionTitle'
import PackageCard from '../../components/PackageCard'
import ProductCard from '../../components/ProductCard'
import Loading from '../../components/Loading'
import { STUDIO_NAME } from '../../utils/constants'

export default function Home() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchHomeData()
      .then((res: any) => setData(res))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Loading type="card" />

  const { banners = [], hotPackages = [], recommendProducts = [], stats, bannerInterval } = data || {}

  return (
    <div>
      {/* Banner */}
      <Banner items={banners} interval={bannerInterval} />

      {/* Stats */}
      <Card style={{ margin: '24px 0', textAlign: 'center' }}>
        <Row gutter={48} justify="center">
          <Col span={6} xs={8}>
            <Statistic title="累计服务" value={stats?.totalOrders ?? 0} prefix={<SmileOutlined />} />
          </Col>
          <Col span={6} xs={8}>
            <Statistic title="精选套系" value={stats?.totalPackages ?? 0} prefix={<CameraOutlined />} />
          </Col>
          <Col span={6} xs={8}>
            <Statistic title="优质商品" value={stats?.totalProducts ?? 0} prefix={<ShoppingOutlined />} />
          </Col>
        </Row>
      </Card>

      {/* Hot Packages */}
      {hotPackages.length > 0 && (
        <div>
          <SectionTitle title="热门套系" moreLink="/packages" />
          <div style={{ display: 'flex', gap: 16, overflowX: 'auto', padding: '0 24px 24px' }}>
            {hotPackages.map((pkg: any) => (
              <PackageCard key={pkg.id} item={pkg} />
            ))}
          </div>
        </div>
      )}

      {/* Recommend Products */}
      {recommendProducts.length > 0 && (
        <div>
          <SectionTitle title="推荐商品" moreLink="/products" />
          <div style={{ padding: '0 24px 24px' }}>
            <Row gutter={[16, 16]}>
              {recommendProducts.map((product: any) => (
                <Col key={product.id} xs={12} sm={8} md={6}>
                  <ProductCard item={product} />
                </Col>
              ))}
            </Row>
          </div>
        </div>
      )}

      {/* About teaser */}
      <Card style={{ margin: '0 0 24px', textAlign: 'center' }}>
        <Card.Meta
          title={`关于 ${STUDIO_NAME}`}
          description="我们专注于儿童摄影多年，用镜头记录每一个家庭的幸福瞬间。专业摄影团队、温馨拍摄环境、优质服务体验，为您的孩子留下最珍贵的成长记忆。"
        />
      </Card>
    </div>
  )
}
