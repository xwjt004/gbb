import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Typography, Tag, Descriptions, Button, Carousel, Divider } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { fetchPackageDetail } from '../../../services/packages'
import Image from '../../../components/Image'
import Loading from '../../../components/Loading'

export default function PackageDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [pkg, setPkg] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      fetchPackageDetail(Number(id))
        .then((res: any) => setPkg(res))
        .finally(() => setLoading(false))
    }
  }, [id])

  if (loading) return <Loading type="detail" />
  if (!pkg) return <Typography.Text type="secondary">套系不存在</Typography.Text>

  const images = pkg.images?.length ? pkg.images : []
  const price = pkg.currentPrice ?? pkg.price ?? pkg.deposit ?? 0
  const originalPrice = pkg.originalPrice
  const categoryName = pkg.categoryName || pkg.category
  const salesCount = pkg.salesCount ?? pkg.salesVolume

  return (
    <div style={{ padding: '24px 0' }}>
      <Button
        type="link"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/packages')}
        style={{ padding: 0, marginBottom: 16 }}
      >
        返回套系列表
      </Button>

      {/* Image carousel */}
      {images.length > 0 && (
        <div style={{ maxWidth: 600, margin: '0 auto 24px' }}>
          <Carousel autoplay>
            {images.map((img: string, i: number) => (
              <Image
                key={i}
                src={img}
                alt={`${pkg.name} - ${i + 1}`}
                style={{ width: '100%', height: 400, objectFit: 'cover', borderRadius: 8 }}
              />
            ))}
          </Carousel>
        </div>
      )}

      <Typography.Title level={2}>{pkg.name}</Typography.Title>

      {categoryName && <Tag color="blue">{categoryName}</Tag>}

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

      {salesCount !== undefined && (
        <Typography.Text type="secondary">已售 {salesCount} 单</Typography.Text>
      )}

      {pkg.description && (
        <>
          <Divider />
          <Typography.Title level={4}>套系介绍</Typography.Title>
          <Typography.Paragraph style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
            {pkg.description}
          </Typography.Paragraph>
        </>
      )}

      {/* 服务内容 */}
      {pkg.packageServices && pkg.packageServices.length > 0 ? (
        <>
          <Divider />
          <Typography.Title level={4}>服务内容</Typography.Title>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {pkg.packageServices.map((ps: any) => (
              <div
                key={ps.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 16px',
                  background: '#fafafa',
                  borderRadius: 8,
                  border: '1px solid #f0f0f0',
                }}
              >
                <Image
                  src={ps.service?.images?.[0]}
                  alt={ps.service?.name}
                  style={{ width: 64, height: 64, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: 15, marginBottom: 2 }}>{ps.service?.name}</div>
                  {ps.service?.description && (
                    <div style={{ color: '#888', fontSize: 13, lineHeight: 1.4 }}>{ps.service.description}</div>
                  )}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ color: '#ff4d4f', fontWeight: 600, fontSize: 15 }}>
                    ¥{ps.service?.basePrice ?? 0}
                  </div>
                  <div style={{ color: '#999', fontSize: 13 }}>
                    服务时长 {ps.service?.duration ?? '-'} 分钟
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : pkg.serviceItems && pkg.serviceItems.length > 0 ? (
        <>
          <Divider />
          <Typography.Title level={4}>服务内容</Typography.Title>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {pkg.serviceItems.map((item: string, i: number) => (
              <Tag key={i} color="purple">{item}</Tag>
            ))}
          </div>
        </>
      ) : pkg.includes && pkg.includes.length > 0 ? (
        <>
          <Divider />
          <Typography.Title level={4}>服务内容</Typography.Title>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {pkg.includes.map((item: string, i: number) => (
              <Tag key={i} color="purple">{item}</Tag>
            ))}
          </div>
        </>
      ) : null}

      {/* 商品内容 */}
      {pkg.packageProducts && pkg.packageProducts.length > 0 ? (
        <>
          <Divider />
          <Typography.Title level={4}>商品内容</Typography.Title>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {pkg.packageProducts.map((pp: any) => (
              <div
                key={pp.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 16px',
                  background: '#fafafa',
                  borderRadius: 8,
                  border: '1px solid #f0f0f0',
                }}
              >
                <Image
                  src={pp.product?.images?.[0]}
                  alt={pp.product?.name}
                  style={{ width: 64, height: 64, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: 15, marginBottom: 2 }}>{pp.product?.name}</div>
                  {pp.product?.specification && (
                    <div style={{ color: '#888', fontSize: 13 }}>规格：{pp.product.specification}</div>
                  )}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ color: '#ff4d4f', fontWeight: 600, fontSize: 15 }}>
                    ¥{pp.product?.salePrice ?? 0}
                  </div>
                  <div style={{ color: '#999', fontSize: 13 }}>× {pp.quantity}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : pkg.productItems && pkg.productItems.length > 0 ? (
        <>
          <Divider />
          <Typography.Title level={4}>商品内容</Typography.Title>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {pkg.productItems.map((item: string, i: number) => (
              <Tag key={i} color="orange">{item}</Tag>
            ))}
          </div>
        </>
      ) : null}

      <Descriptions title="详细信息" column={2} bordered size="small" style={{ marginTop: 16 }}>
        {pkg.durationMinutes && <Descriptions.Item label="拍摄时长">{pkg.durationMinutes} 分钟</Descriptions.Item>}
        {pkg.style && <Descriptions.Item label="拍摄风格">{pkg.style}</Descriptions.Item>}
        {pkg.deposit && Number(pkg.deposit) > 0 && <Descriptions.Item label="定金">¥{pkg.deposit}</Descriptions.Item>}
      </Descriptions>

      <div style={{ textAlign: 'center', marginTop: 32 }}>
        <Typography.Text type="secondary">
          如需下单，请前往微信小程序预约拍摄
        </Typography.Text>
      </div>
    </div>
  )
}
