import React, { useEffect, useState } from 'react';
import { Card, Form, InputNumber, Button, App, Spin, Typography, Row, Col, Statistic, Divider, Space, Table, Tag, Tooltip } from 'antd';
import { SaveOutlined, ThunderboltOutlined, ShoppingCartOutlined, PlayCircleOutlined, PictureOutlined, VideoCameraOutlined, QuestionCircleOutlined, HistoryOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { pointsConfigService, PointsConfig } from '@/services/pointsConfig';

const { Title, Text } = Typography;

const PointsConfigPage: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<PointsConfig | null>(null);
  const { message } = App.useApp();

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const data = await pointsConfigService.get();
      setConfig(data);
      form.setFieldsValue(data);
    } catch (err) {
      message.error('获取积分配置失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      await pointsConfigService.update(values);
      message.success('积分配置已保存');
      fetchConfig();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const costFields = [
    {
      name: 'photoUploadCost' as const,
      icon: <PictureOutlined style={{ color: '#52c41a' }} />,
      label: '上传照片',
      tooltip: '客户每次上传照片（一组最多10张）消耗的积分数',
      defaultValue: 50,
    },
    {
      name: 'videoUploadCost' as const,
      icon: <VideoCameraOutlined style={{ color: '#1890ff' }} />,
      label: '上传视频',
      tooltip: '客户每次上传视频消耗的积分数',
      defaultValue: 50,
    },
    {
      name: 'videoPlayCost' as const,
      icon: <PlayCircleOutlined style={{ color: '#faad14' }} />,
      label: '播放视频',
      tooltip: '客户每次播放视频消耗的积分数',
      defaultValue: 50,
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Spin spinning={loading} size="large">
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <Title level={2}>
            <ThunderboltOutlined style={{ marginRight: '12px', color: '#faad14' }} />
            积分配置
          </Title>
          <Text type="secondary">
            管理积分系统的消耗规则和购买汇率，客户上传照片/视频、播放视频时将自动扣除对应积分
          </Text>
        </div>

        <Row gutter={[24, 24]}>
          {/* 积分消耗配置 */}
          <Col xs={24} lg={14}>
            <Card
              title={
                <Space>
                  <ThunderboltOutlined style={{ color: '#faad14' }} />
                  <span>积分消耗规则</span>
                </Space>
              }
              extra={
                <Tag color="blue" style={{ fontSize: 12 }}>
                  客户操作时自动扣除
                </Tag>
              }
            >
              <Form
                form={form}
                layout="vertical"
                initialValues={{
                  photoUploadCost: 50,
                  videoUploadCost: 50,
                  videoPlayCost: 50,
                  purchaseRate: 1000,
                }}
              >
                <Row gutter={[24, 0]}>
                  {costFields.map((field) => (
                    <Col xs={24} sm={8} key={field.name}>
                      <Card
                        size="small"
                        style={{
                          border: '1px solid #f0f0f0',
                          borderRadius: 8,
                          height: '100%',
                        }}
                      >
                        <Space align="center" style={{ marginBottom: 12 }}>
                          {field.icon}
                          <Text strong>{field.label}</Text>
                          <Tooltip title={field.tooltip}>
                            <QuestionCircleOutlined style={{ color: '#999', cursor: 'help' }} />
                          </Tooltip>
                        </Space>
                        <Form.Item
                          name={field.name}
                          rules={[{ required: true, message: '请输入积分值' }]}
                          style={{ marginBottom: 0 }}
                        >
                          <InputNumber
                            min={0}
                            max={99999}
                            style={{ width: '100%' }}
                            addonAfter="积分/次"
                            size="large"
                          />
                        </Form.Item>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </Form>
            </Card>
          </Col>

          {/* 积分购买汇率 */}
          <Col xs={24} lg={10}>
            <Card
              title={
                <Space>
                  <ShoppingCartOutlined style={{ color: '#52c41a' }} />
                  <span>积分购买汇率</span>
                </Space>
              }
              extra={
                <Tag color="green" style={{ fontSize: 12 }}>
                  客户充值获得
                </Tag>
              }
            >
              <Form
                form={form}
                layout="vertical"
                initialValues={{
                  photoUploadCost: 50,
                  videoUploadCost: 50,
                  videoPlayCost: 50,
                  purchaseRate: 1000,
                }}
              >
                <Form.Item
                  name="purchaseRate"
                  label={
                    <Space>
                      <span style={{ fontWeight: 600 }}>每 1 元兑换积分数</span>
                      <Tooltip title="客户在商城购买积分时，1元人民币可兑换的积分数。例如设置为1000，则1元=1000积分">
                        <QuestionCircleOutlined style={{ color: '#999', cursor: 'help' }} />
                      </Tooltip>
                    </Space>
                  }
                  extra="客户下单时每100元自动获得 1000 积分（固定比例）"
                  rules={[{ required: true, message: '请输入汇率' }]}
                >
                  <InputNumber
                    min={1}
                    max={99999}
                    style={{ width: '100%' }}
                    addonAfter="积分/元"
                    size="large"
                  />
                </Form.Item>
              </Form>
            </Card>
          </Col>
        </Row>

        {/* 效果预览 */}
        <Row gutter={[24, 24]} style={{ marginTop: 8 }}>
          <Col xs={24}>
            <Card
              title={
                <Space>
                  <HistoryOutlined style={{ color: '#722ed1' }} />
                  <span>消费场景预览</span>
                </Space>
              }
            >
              <Row gutter={[24, 24]}>
                <Col xs={12} sm={6}>
                  <Card
                    size="small"
                    style={{
                      background: 'linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)',
                      border: 'none',
                      borderRadius: 8,
                    }}
                  >
                    <Statistic
                      title={<Space><PictureOutlined style={{ color: '#52c41a' }} />上传照片</Space>}
                      value={form.getFieldValue('photoUploadCost') ?? 50}
                      suffix="积分/次"
                      valueStyle={{ color: '#52c41a', fontWeight: 'bold' }}
                    />
                  </Card>
                </Col>
                <Col xs={12} sm={6}>
                  <Card
                    size="small"
                    style={{
                      background: 'linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)',
                      border: 'none',
                      borderRadius: 8,
                    }}
                  >
                    <Statistic
                      title={<Space><VideoCameraOutlined style={{ color: '#1890ff' }} />上传视频</Space>}
                      value={form.getFieldValue('videoUploadCost') ?? 50}
                      suffix="积分/次"
                      valueStyle={{ color: '#1890ff', fontWeight: 'bold' }}
                    />
                  </Card>
                </Col>
                <Col xs={12} sm={6}>
                  <Card
                    size="small"
                    style={{
                      background: 'linear-gradient(135deg, #fffbe6 0%, #fff1b8 100%)',
                      border: 'none',
                      borderRadius: 8,
                    }}
                  >
                    <Statistic
                      title={<Space><PlayCircleOutlined style={{ color: '#faad14' }} />播放视频</Space>}
                      value={form.getFieldValue('videoPlayCost') ?? 50}
                      suffix="积分/次"
                      valueStyle={{ color: '#faad14', fontWeight: 'bold' }}
                    />
                  </Card>
                </Col>
                <Col xs={12} sm={6}>
                  <Card
                    size="small"
                    style={{
                      background: 'linear-gradient(135deg, #f9f0ff 0%, #efdbff 100%)',
                      border: 'none',
                      borderRadius: 8,
                    }}
                  >
                    <Statistic
                      title={<Space><ShoppingCartOutlined style={{ color: '#722ed1' }} />购买积分</Space>}
                      value={form.getFieldValue('purchaseRate') ?? 1000}
                      suffix="积分/元"
                      valueStyle={{ color: '#722ed1', fontWeight: 'bold' }}
                    />
                  </Card>
                </Col>
              </Row>

              <Divider />

              <div style={{ color: '#666', fontSize: 13, background: '#fafafa', padding: '12px 16px', borderRadius: 6 }}>
                <Space direction="vertical" size={4}>
                  <Text type="secondary">
                    <ArrowUpOutlined style={{ color: '#52c41a' }} /> 客户下单：每 100 元订单完成时自动获得 1000 积分
                  </Text>
                  <Text type="secondary">
                    <ArrowDownOutlined style={{ color: '#ff4d4f' }} /> 积分消耗：上传照片/视频、播放视频时按以上规则自动扣除
                  </Text>
                  <Text type="secondary">
                    <QuestionCircleOutlined style={{ color: '#999' }} /> 积分不足时，操作将被拒绝并提示客户购买积分
                  </Text>
                </Space>
              </div>
            </Card>
          </Col>
        </Row>

        {/* Submit */}
        <div style={{ marginTop: 24, textAlign: 'right' }}>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            loading={saving}
            size="large"
            style={{ minWidth: 160, height: 44, fontSize: 16 }}
          >
            保存配置
          </Button>
        </div>
      </Spin>
    </div>
  );
};

export default PointsConfigPage;
