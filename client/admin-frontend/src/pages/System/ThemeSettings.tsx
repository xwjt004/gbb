import React, { useState } from 'react';
import { Card, Row, Col, Button, Input, Form, message, Modal, Typography } from 'antd';
import { CheckCircleOutlined, BgColorsOutlined, EditOutlined } from '@ant-design/icons';
import { useTheme, PRESET_THEMES, ThemeConfig } from '@/contexts/ThemeContext';

const { Title, Text } = Typography;

const ThemeSettings: React.FC = () => {
  const { theme, setTheme, updateThemeTitle } = useTheme();
  const [titleModalVisible, setTitleModalVisible] = useState(false);
  const [form] = Form.useForm();

  const handleThemeChange = (newTheme: ThemeConfig) => {
    setTheme(newTheme);
    message.success(`主题已切换为：${newTheme.name}`);
  };

  const handleTitleUpdate = () => {
    form.validateFields().then((values) => {
      updateThemeTitle(values.systemTitle, values.systemTitleShort);
      setTitleModalVisible(false);
      message.success('标题已更新');
    });
  };

  const openTitleModal = () => {
    form.setFieldsValue({
      systemTitle: theme.systemTitle,
      systemTitleShort: theme.systemTitleShort,
    });
    setTitleModalVisible(true);
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>
          <BgColorsOutlined style={{ marginRight: '12px' }} />
          主题设置
        </Title>
        <Text type="secondary">
          选择您喜欢的主题风格，个性化您的管理后台界面
        </Text>
      </div>

      {/* 当前主题 */}
      <Card
        title="当前主题"
        extra={
          <Button type="primary" icon={<EditOutlined />} onClick={openTitleModal}>
            编辑标题
          </Button>
        }
        style={{ marginBottom: '24px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div
            style={{
              width: '120px',
              height: '80px',
              background: theme.siderBg,
              borderRadius: '8px',
              border: '2px solid #d9d9d9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: theme.siderTextColor,
              fontWeight: 'bold',
            }}
          >
            {theme.systemTitleShort}
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>
              {theme.name}
            </div>
            <div style={{ color: '#666' }}>
              <div>系统标题：{theme.systemTitle}</div>
              <div>主色调：{theme.primaryColor}</div>
            </div>
          </div>
        </div>
      </Card>

      {/* 预设主题 */}
      <Card title="选择预设主题">
        <Row gutter={[16, 16]}>
          {PRESET_THEMES.map((presetTheme) => (
            <Col xs={24} sm={12} md={8} lg={6} key={presetTheme.id}>
              <Card
                hoverable
                onClick={() => handleThemeChange(presetTheme)}
                style={{
                  border: theme.id === presetTheme.id ? `2px solid ${presetTheme.primaryColor}` : '1px solid #d9d9d9',
                  position: 'relative',
                }}
              >
                {theme.id === presetTheme.id && (
                  <CheckCircleOutlined
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      fontSize: '24px',
                      color: presetTheme.primaryColor,
                    }}
                  />
                )}

                {/* 主题预览 */}
                <div style={{ marginBottom: '12px' }}>
                  <div
                    style={{
                      height: '100px',
                      borderRadius: '4px',
                      overflow: 'hidden',
                      border: '1px solid #d9d9d9',
                    }}
                  >
                    {/* 侧边栏预览 */}
                    <div style={{ display: 'flex', height: '100%' }}>
                      <div
                        style={{
                          width: '40%',
                          background: presetTheme.siderBg,
                          display: 'flex',
                          flexDirection: 'column',
                          padding: '8px',
                        }}
                      >
                        <div
                          style={{
                            background: 'rgba(255, 255, 255, 0.2)',
                            borderRadius: '4px',
                            padding: '4px',
                            color: presetTheme.siderTextColor,
                            fontSize: '10px',
                            textAlign: 'center',
                            marginBottom: '6px',
                            fontWeight: 'bold',
                          }}
                        >
                          {presetTheme.systemTitleShort}
                        </div>
                        <div
                          style={{
                            background: presetTheme.siderSelectedBg,
                            borderRadius: '2px',
                            padding: '3px 6px',
                            color: presetTheme.siderTextColor,
                            fontSize: '9px',
                            marginBottom: '3px',
                          }}
                        >
                          菜单项
                        </div>
                        <div
                          style={{
                            padding: '3px 6px',
                            color: presetTheme.siderTextColor,
                            fontSize: '9px',
                            opacity: 0.6,
                          }}
                        >
                          菜单项
                        </div>
                      </div>

                      {/* 内容区预览 */}
                      <div
                        style={{
                          width: '60%',
                          display: 'flex',
                          flexDirection: 'column',
                        }}
                      >
                        {/* 头部 */}
                        <div
                          style={{
                            height: '25%',
                            background: presetTheme.headerBg,
                            borderBottom: '1px solid #e8e8e8',
                            display: 'flex',
                            alignItems: 'center',
                            padding: '0 8px',
                            color: presetTheme.headerTextColor,
                            fontSize: '9px',
                          }}
                        >
                          Header
                        </div>

                        {/* 内容 */}
                        <div
                          style={{
                            flex: 1,
                            background: presetTheme.contentBg,
                            padding: '6px',
                          }}
                        >
                          <div
                            style={{
                              background: '#fff',
                              height: '100%',
                              borderRadius: '2px',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 主题名称 */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                    {presetTheme.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#999' }}>
                    {presetTheme.systemTitle}
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      {/* 自定义标题弹窗 */}
      <Modal
        title="编辑系统标题"
        open={titleModalVisible}
        onOk={handleTitleUpdate}
        onCancel={() => setTitleModalVisible(false)}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="系统标题（完整）"
            name="systemTitle"
            rules={[
              { required: true, message: '请输入系统标题' },
              { max: 30, message: '标题不能超过30个字符' },
            ]}
          >
            <Input placeholder="例如：GBB管理后台" />
          </Form.Item>

          <Form.Item
            label="系统标题（缩略）"
            name="systemTitleShort"
            rules={[
              { required: true, message: '请输入缩略标题' },
              { max: 10, message: '缩略标题不能超过10个字符' },
            ]}
          >
            <Input placeholder="例如：GBB" />
          </Form.Item>

          <div style={{ color: '#999', fontSize: '12px' }}>
            提示：缩略标题会在侧边栏收起时显示
          </div>
        </Form>
      </Modal>

      {/* 使用说明 */}
      <Card title="使用说明" style={{ marginTop: '24px' }}>
        <ul style={{ paddingLeft: '20px', margin: 0 }}>
          <li>点击任意主题卡片即可切换主题</li>
          <li>主题设置会自动保存到浏览器本地存储</li>
          <li>点击"编辑标题"按钮可以自定义系统名称</li>
          <li>每个主题都有独特的颜色搭配和视觉风格</li>
          <li>主题切换会立即生效，无需刷新页面</li>
        </ul>
      </Card>
    </div>
  );
};

export default ThemeSettings;
