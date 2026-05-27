import React, { useState } from 'react';
import {
  Card,
  Button,
  Alert,
  Space,
  Statistic,
  Row,
  Col,
  Typography,
  Divider,
  message,
  Modal,
  Timeline,
} from 'antd';
import {
  CheckCircleOutlined,
  SyncOutlined,
  HistoryOutlined,
  WarningOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { paymentService } from '@/services/payments';
import dayjs from 'dayjs';

const { Title, Paragraph, Text } = Typography;

const ReconciliationManagement: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [lastRun, setLastRun] = useState<string | null>(null);

  // 手动触发对账
  const handleTriggerReconciliation = () => {
    Modal.confirm({
      title: '确认执行对账任务',
      content: '对账任务将检测所有订单-支付金额差异，可能需要几分钟时间。是否继续？',
      okText: '确认执行',
      cancelText: '取消',
      onOk: async () => {
        setLoading(true);
        try {
          await paymentService.triggerReconciliation();
          message.success('对账任务已提交，请查看服务器日志获取详细结果');
          setLastRun(new Date().toISOString());
        } catch (error: any) {
          console.error('触发对账任务失败:', error);
          message.error(error.message || '触发对账任务失败');
        } finally {
          setLoading(false);
        }
      },
    });
  };

  // 模拟对账历史数据（实际应从后端获取）
  const reconciliationHistory = [
    {
      id: 1,
      executedAt: dayjs().subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss'),
      status: 'completed',
      duration: '1.23秒',
      discrepancies: 3,
      highRisk: 2,
      mediumRisk: 1,
      lowRisk: 0,
    },
    {
      id: 2,
      executedAt: dayjs().subtract(2, 'day').format('YYYY-MM-DD HH:mm:ss'),
      status: 'completed',
      duration: '1.15秒',
      discrepancies: 0,
      highRisk: 0,
      mediumRisk: 0,
      lowRisk: 0,
    },
    {
      id: 3,
      executedAt: dayjs().subtract(3, 'day').format('YYYY-MM-DD HH:mm:ss'),
      status: 'completed',
      duration: '1.28秒',
      discrepancies: 5,
      highRisk: 1,
      mediumRisk: 2,
      lowRisk: 2,
    },
  ];

  return (
    <div>
      <Card>
        <Title level={3}>
          <CheckCircleOutlined /> 对账管理
        </Title>
        <Paragraph>
          系统每日凌晨3点自动执行对账任务，检测订单-支付金额差异。您也可以手动触发对账任务。
        </Paragraph>
      </Card>

      {/* 对账信息卡片 */}
      <Card style={{ marginTop: 16 }}>
        <Row gutter={16}>
          <Col span={8}>
            <Card>
              <Statistic
                title="自动对账时间"
                value="每日凌晨 3:00"
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: '#1890ff', fontSize: 20 }}
              />
              <div style={{ marginTop: 12, fontSize: 12, color: '#999' }}>
                北京时间（Asia/Shanghai）
              </div>
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="上次执行时间"
                value={lastRun ? dayjs(lastRun).format('MM-DD HH:mm') : '暂无记录'}
                prefix={<HistoryOutlined />}
                valueStyle={{ fontSize: 20 }}
              />
              <div style={{ marginTop: 12, fontSize: 12, color: '#999' }}>
                {lastRun ? dayjs(lastRun).fromNow() : '-'}
              </div>
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="差异检测类型"
                value={3}
                suffix="种"
                prefix={<WarningOutlined />}
                valueStyle={{ fontSize: 20 }}
              />
              <div style={{ marginTop: 12, fontSize: 12, color: '#999' }}>
                金额不匹配、状态不一致、支付状态不匹配
              </div>
            </Card>
          </Col>
        </Row>
      </Card>

      {/* 操作说明 */}
      <Card style={{ marginTop: 16 }}>
        <Title level={4}>差异检测规则</Title>
        <Row gutter={16}>
          <Col span={8}>
            <Alert
              message="类型1: 金额不匹配"
              description="订单状态为已支付，但实际支付金额与订单总额不一致（容忍误差0.01元）"
              type="warning"
              showIcon
              icon={<WarningOutlined />}
            />
          </Col>
          <Col span={8}>
            <Alert
              message="类型2: 状态不一致"
              description="订单状态为部分支付，但实际已支付金额大于等于订单总额"
              type="error"
              showIcon
              icon={<WarningOutlined />}
            />
          </Col>
          <Col span={8}>
            <Alert
              message="类型3: 支付状态不匹配"
              description="存在已完成的支付记录，但订单状态仍为待支付"
              type="error"
              showIcon
              icon={<WarningOutlined />}
            />
          </Col>
        </Row>

        <Divider />

        <Title level={4}>严重级别判定</Title>
        <Space size="large">
          <Text>
            <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>●</span> 高风险：状态不一致 or 差额 &gt; 100元
          </Text>
          <Text>
            <span style={{ color: '#faad14', fontWeight: 'bold' }}>●</span> 中风险：10元 &lt; 差额 ≤ 100元
          </Text>
          <Text>
            <span style={{ color: '#1890ff', fontWeight: 'bold' }}>●</span> 低风险：0.01元 &lt; 差额 ≤ 10元
          </Text>
        </Space>
      </Card>

      {/* 操作按钮 */}
      <Card style={{ marginTop: 16 }}>
        <Space size="large">
          <Button
            type="primary"
            size="large"
            icon={<SyncOutlined spin={loading} />}
            onClick={handleTriggerReconciliation}
            loading={loading}
          >
            手动执行对账
          </Button>
          <Button
            size="large"
            icon={<HistoryOutlined />}
            onClick={() => setHistoryVisible(true)}
          >
            查看对账历史
          </Button>
        </Space>

        <Alert
          message="提示"
          description='手动执行对账任务将检测所有订单的支付差异，执行结果将显示在服务器日志中。差异记录可在"可疑支付"页面查看。'
          type="info"
          showIcon
          style={{ marginTop: 16 }}
        />
      </Card>

      {/* 对账历史模态框 */}
      <Modal
        title="对账历史"
        open={historyVisible}
        onCancel={() => setHistoryVisible(false)}
        footer={[
          <Button key="close" onClick={() => setHistoryVisible(false)}>
            关闭
          </Button>,
        ]}
        width={800}
      >
        <Timeline>
          {reconciliationHistory.map((record) => (
            <Timeline.Item
              key={record.id}
              color={record.discrepancies > 0 ? 'red' : 'green'}
              dot={
                record.discrepancies > 0 ? (
                  <WarningOutlined style={{ fontSize: 16 }} />
                ) : (
                  <CheckCircleOutlined style={{ fontSize: 16 }} />
                )
              }
            >
              <Card size="small" styles={{ body: { padding: 12 } }}>
                <Row gutter={16}>
                  <Col span={8}>
                    <Text strong>执行时间</Text>
                    <div>{record.executedAt}</div>
                  </Col>
                  <Col span={4}>
                    <Text strong>耗时</Text>
                    <div>{record.duration}</div>
                  </Col>
                  <Col span={4}>
                    <Text strong>差异数</Text>
                    <div style={{ color: record.discrepancies > 0 ? '#ff4d4f' : '#52c41a' }}>
                      {record.discrepancies} 条
                    </div>
                  </Col>
                  <Col span={8}>
                    <Text strong>风险分布</Text>
                    <div>
                      <Space>
                        <Text type="danger">高: {record.highRisk}</Text>
                        <Text type="warning">中: {record.mediumRisk}</Text>
                        <Text>低: {record.lowRisk}</Text>
                      </Space>
                    </div>
                  </Col>
                </Row>
              </Card>
            </Timeline.Item>
          ))}
        </Timeline>
        
        <Alert
          message="说明"
          description="对账历史记录来自服务器日志，当前为示例数据。完整的对账历史需要后端支持持久化存储。"
          type="info"
          showIcon
          style={{ marginTop: 16 }}
        />
      </Modal>
    </div>
  );
};

export default ReconciliationManagement;
