import { Layout } from 'antd'
import { Outlet } from 'react-router-dom'
import Header from '../Header'
import Footer from '../Footer'

const { Content } = Layout

export default function AppLayout() {
  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <Header />
      <Content style={{ maxWidth: 1200, width: '100%', margin: '0 auto', padding: '0 24px' }}>
        <Outlet />
      </Content>
      <Footer />
    </Layout>
  )
}
