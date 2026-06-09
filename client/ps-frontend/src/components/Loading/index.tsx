import { Skeleton, Card } from 'antd'

interface Props {
  type?: 'card' | 'list' | 'detail'
}

export default function Loading({ type = 'card' }: Props) {
  if (type === 'detail') {
    return (
      <div style={{ padding: 24 }}>
        <Skeleton active paragraph={{ rows: 1 }} />
        <br />
        <Skeleton.Image style={{ width: '100%', height: 300 }} />
        <br /><br />
        <Skeleton active paragraph={{ rows: 6 }} />
      </div>
    )
  }

  if (type === 'list') {
    return (
      <div style={{ padding: 24 }}>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} active avatar style={{ marginBottom: 16 }} />
        ))}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 16, padding: 24 }}>
      {[1, 2, 3].map((i) => (
        <Card key={i} style={{ width: 280 }}>
          <Skeleton active />
        </Card>
      ))}
    </div>
  )
}
