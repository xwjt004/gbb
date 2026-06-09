import { Layout, Typography } from 'antd'
import { PhoneOutlined, EnvironmentOutlined, ClockCircleOutlined } from '@ant-design/icons'
import { STUDIO_NAME, PHONE, PHONE2, ADDRESS, BUSINESS_HOURS, ICP_BEIAN } from '../../utils/constants'

const { Footer: AntFooter } = Layout

export default function Footer() {
  return (
    <AntFooter
      style={{
        background: '#1a1a2e',
        color: '#ccc',
        textAlign: 'center',
        padding: '40px 24px 24px',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <Typography.Title level={4} style={{ color: '#fff', marginBottom: 16 }}>
          {STUDIO_NAME}
        </Typography.Title>

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 32,
            flexWrap: 'wrap',
            marginBottom: 16,
            fontSize: 14,
          }}
        >
          <span><PhoneOutlined /> {PHONE}</span>
          <span><PhoneOutlined /> {PHONE2}</span>
          <span><EnvironmentOutlined /> {ADDRESS}</span>
          <span><ClockCircleOutlined /> {BUSINESS_HOURS}</span>
        </div>

        <div style={{ borderTop: '1px solid #333', paddingTop: 16, fontSize: 12, color: '#666' }}>
          <p>本站仅提供信息展示，下单请前往微信小程序</p>
          <p>{ICP_BEIAN}</p>
          <p>&copy; {new Date().getFullYear()} {STUDIO_NAME} 版权所有</p>
        </div>
      </div>
    </AntFooter>
  )
}
