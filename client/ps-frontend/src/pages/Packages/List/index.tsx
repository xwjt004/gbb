import { useEffect, useState } from 'react'
import { Row, Col, Menu, Typography } from 'antd'
import { fetchPackages } from '../../../services/packages'
import { fetchPackageCategories } from '../../../services/categories'
import PackageCard from '../../../components/PackageCard'
import Loading from '../../../components/Loading'

export default function PackageList() {
  const [packages, setPackages] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryId, setCategoryId] = useState<number | undefined>()

  useEffect(() => {
    Promise.all([
      fetchPackages().then((res: any) => setPackages(Array.isArray(res) ? res : [])),
      fetchPackageCategories().then((res: any) => setCategories(Array.isArray(res) ? res : [])),
    ]).finally(() => setLoading(false))
  }, [])

  const filtered = categoryId
    ? packages.filter((p) => p.categoryId === categoryId)
    : packages

  if (loading) return <Loading type="card" />

  return (
    <div style={{ padding: '24px 0' }}>
      <Typography.Title level={2} style={{ marginBottom: 24 }}>全部套系</Typography.Title>

      {categories.length > 0 && (
        <Menu
          mode="horizontal"
          selectedKeys={categoryId ? [String(categoryId)] : ['all']}
          onClick={({ key }) => setCategoryId(key === 'all' ? undefined : Number(key))}
          style={{ marginBottom: 24, border: 'none' }}
          items={[
            { key: 'all', label: '全部' },
            ...categories.map((c: any) => ({ key: String(c.id), label: c.name })),
          ]}
        />
      )}

      {filtered.length === 0 ? (
        <Typography.Text type="secondary">暂无套系数据</Typography.Text>
      ) : (
        <Row gutter={[16, 16]}>
          {filtered.map((pkg) => (
            <Col key={pkg.id} xs={12} sm={8} md={6}>
              <PackageCard item={pkg} />
            </Col>
          ))}
        </Row>
      )}
    </div>
  )
}
