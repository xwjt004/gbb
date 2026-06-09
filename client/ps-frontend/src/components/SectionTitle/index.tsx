import { Typography } from 'antd'
import { RightOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'

interface Props {
  title: string
  moreLink?: string
  moreText?: string
}

export default function SectionTitle({ title, moreLink, moreText = '查看更多' }: Props) {
  const navigate = useNavigate()

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '24px 24px 16px',
      }}
    >
      <Typography.Title level={3} style={{ margin: 0 }}>
        {title}
      </Typography.Title>
      {moreLink && (
        <span
          onClick={() => navigate(moreLink)}
          style={{ color: '#999', cursor: 'pointer', fontSize: 14 }}
        >
          {moreText} <RightOutlined />
        </span>
      )}
    </div>
  )
}
