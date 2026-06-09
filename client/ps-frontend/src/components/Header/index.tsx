import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Button, Drawer } from 'antd'
import { MenuOutlined, UserOutlined, CameraOutlined } from '@ant-design/icons'
import { STUDIO_NAME } from '../../utils/constants'

const { Header: AntHeader } = Layout

const menuItems = [
  { key: '/', label: '首页' },
  { key: '/packages', label: '全部套系' },
  { key: '/products', label: '全部商品' },
  { key: '/about', label: '关于我们' },
]

export default function Header() {
  const navigate = useNavigate()
  const location = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const currentKey = '/' + location.pathname.split('/').filter(Boolean)[0] || '/'

  return (
    <>
      <AntHeader
        style={{
          background: '#fff',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div
          onClick={() => navigate('/')}
          style={{ cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <CameraOutlined style={{ fontSize: 24, color: '#ff4d4f' }} />
          <span style={{ fontSize: 20, fontWeight: 'bold', background: 'linear-gradient(135deg, #ff4d4f, #ff85a0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {STUDIO_NAME}
          </span>
        </div>

        {/* Desktop menu */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Menu
            mode="horizontal"
            selectedKeys={[currentKey]}
            items={menuItems}
            onClick={({ key }) => navigate(key)}
            style={{ border: 'none', flex: 1, minWidth: 0 }}
            disabledOverflow
          />
          <Button
            type="text"
            icon={<UserOutlined />}
            onClick={() => window.open('/admin/', '_blank')}
          >
            管理后台
          </Button>
          {/* Mobile menu toggle */}
          <Button
            type="text"
            icon={<MenuOutlined />}
            className="mobile-menu-btn"
            onClick={() => setDrawerOpen(true)}
            style={{ display: 'none' }}
          />
        </div>
      </AntHeader>

      {/* Mobile drawer */}
      <Drawer
        title="菜单"
        placement="right"
        onClose={() => setDrawerOpen(false)}
        open={drawerOpen}
        width={250}
      >
        <Menu
          mode="vertical"
          selectedKeys={[currentKey]}
          items={[
            ...menuItems,
            { key: '/admin', label: '管理后台', icon: <UserOutlined /> },
          ]}
          onClick={({ key }) => {
            setDrawerOpen(false)
            if (key === '/admin') {
              window.open('/admin/', '_blank')
            } else {
              navigate(key)
            }
          }}
        />
      </Drawer>

      <style>{`
        @media (max-width: 768px) {
          .mobile-menu-btn { display: inline-flex !important; }
          .ant-menu-horizontal { display: none !important; }
          .ant-btn:has(.anticon-user) { display: none !important; }
        }
      `}</style>
    </>
  )
}
