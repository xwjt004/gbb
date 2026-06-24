import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import AppLayout from './components/Layout'
import Home from './pages/Home'
import PackageList from './pages/Packages/List'
import PackageDetail from './pages/Packages/Detail'
import ProductList from './pages/Products/List'
import ProductDetail from './pages/Products/Detail'
import About from './pages/About'
import NotFound from './pages/NotFound'
import H5Bridge from './pages/H5Bridge'

export default function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/packages" element={<PackageList />} />
            <Route path="/packages/:id" element={<PackageDetail />} />
            <Route path="/products" element={<ProductList />} />
            <Route path="/products/:id" element={<ProductDetail />} />
            <Route path="/about" element={<About />} />
            {/* H5 bridge routes for 公众号 → 小程序跳转 */}
            <Route path="/h5/:page" element={<H5Bridge />} />
            {/* 兼容无前缀的公众号菜单链接 */}
            <Route path="/booking" element={<Navigate to="/h5/booking" replace />} />
            <Route path="/portfolio" element={<Navigate to="/h5/portfolio" replace />} />
            <Route path="/orders" element={<Navigate to="/h5/orders" replace />} />
            <Route path="/profile" element={<Navigate to="/h5/profile" replace />} />
            <Route path="/group-buys" element={<Navigate to="/h5/group-buys" replace />} />
            <Route path="/h5/error" element={
              <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>授权失败，请重试</div>
            } />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  )
}
