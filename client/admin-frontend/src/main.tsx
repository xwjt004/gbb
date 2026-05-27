import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import App from './App.tsx'
import './styles/global.css'
import store from './store/index'
// 全局弹窗拖拽（让所有 Modal 均可通过标题栏拖动）
import './utils/globalDragModal'
import * as Sentry from '@sentry/react'

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || 'production',
    tracesSampleRate: 0.1,
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <Sentry.ErrorBoundary fallback={<div>页面发生错误，请刷新重试</div>}>
        <App />
      </Sentry.ErrorBoundary>
    </Provider>
  </React.StrictMode>,
)
