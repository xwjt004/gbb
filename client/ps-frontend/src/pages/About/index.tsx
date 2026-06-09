import { Typography, Descriptions, Card, Row, Col } from 'antd'
import { PhoneOutlined, EnvironmentOutlined, ClockCircleOutlined } from '@ant-design/icons'
import { STUDIO_NAME, PHONE, PHONE2, ADDRESS, BUSINESS_HOURS } from '../../utils/constants'

export default function About() {
  return (
    <div style={{ padding: '24px 0' }}>
      <Typography.Title level={2}>关于我们</Typography.Title>

      <Card style={{ marginBottom: 24 }}>
        <Typography.Paragraph style={{ fontSize: 16, lineHeight: 2, textIndent: '2em' }}>
          {STUDIO_NAME} 是一家专业从事儿童摄影的影楼，致力于用镜头记录每一个家庭的美满与幸福。
          我们拥有经验丰富的摄影团队，温馨舒适的拍摄环境，以及完善的客户服务体系。
        </Typography.Paragraph>
        <Typography.Paragraph style={{ fontSize: 16, lineHeight: 2, textIndent: '2em' }}>
          从新生儿的第一次微笑，到孩子的每一个成长里程碑，我们用专业的技术和满满的爱心，
          为您定格最珍贵的瞬间。我们相信，每一张照片都是一个故事，每一个瞬间都值得被珍藏。
        </Typography.Paragraph>
      </Card>

      <Card title="联系信息">
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
            <Descriptions column={1} size="large">
              <Descriptions.Item label={<><PhoneOutlined /> 电话</>}>{PHONE}</Descriptions.Item>
              <Descriptions.Item label={<><PhoneOutlined /> 座机</>}>{PHONE2}</Descriptions.Item>
            </Descriptions>
          </Col>
          <Col xs={24} sm={8}>
            <Descriptions column={1} size="large">
              <Descriptions.Item label={<><EnvironmentOutlined /> 地址</>}>{ADDRESS}</Descriptions.Item>
            </Descriptions>
          </Col>
          <Col xs={24} sm={8}>
            <Descriptions column={1} size="large">
              <Descriptions.Item label={<><ClockCircleOutlined /> 营业时间</>}>{BUSINESS_HOURS}</Descriptions.Item>
            </Descriptions>
          </Col>
        </Row>
      </Card>
    </div>
  )
}
