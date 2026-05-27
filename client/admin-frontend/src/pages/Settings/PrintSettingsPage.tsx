import React, { useState, useEffect } from 'react';
import { Card, Form, Switch, Button, message, Divider, Row, Col, Space } from 'antd';
import { getPrintSettings, updatePrintSettings } from '@/services/printSettingsService';

const PrintSettingsPage: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 加载打印设置
  const loadPrintSettings = async () => {
    try {
      setLoading(true);
      const data = await getPrintSettings();
      form.setFieldsValue(data);
    } catch (error: any) {
      message.error(error.response?.data?.message || '加载打印设置失败');
    } finally {
      setLoading(false);
    }
  };

  // 页面加载时获取打印设置
  useEffect(() => {
    loadPrintSettings();
  }, []);

  // 提交表单
  const handleSubmit = async (values: any) => {
    try {
      setSubmitting(true);
      await updatePrintSettings(values);
      message.success('保存成功');
      await loadPrintSettings(); // 重新加载最新数据
    } catch (error: any) {
      message.error(error.response?.data?.message || '保存失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 重置为默认值（全部显示）
  const handleResetToDefault = () => {
    form.setFieldsValue({
      showShopName: true,
      showAddress: true,
      showPhone: true,
      showTelephone: true,
      showWechatId: true,
      showDouyinId: true,
      showKuaishouId: true,
      showXiaohongshuId: true,
      showBusinessScope: true,
      showBusinessHours: true,
    });
    message.info('已重置为默认设置（全部显示）');
  };

  return (
    <Card title="打印设置配置" loading={loading}>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          showShopName: true,
          showAddress: true,
          showPhone: true,
          showTelephone: true,
          showWechatId: true,
          showDouyinId: true,
          showKuaishouId: true,
          showXiaohongshuId: true,
          showBusinessScope: true,
          showBusinessHours: true,
        }}
      >
        <p style={{ marginBottom: 24, color: '#666' }}>
          配置订单打印模板中需要显示的店铺信息字段。关闭的字段将不会在打印订单时显示。
        </p>

        <Divider orientation="left">基本信息显示控制</Divider>

        <Row gutter={[24, 16]}>
          <Col span={12}>
            <Form.Item
              name="showShopName"
              label="店铺名称"
              valuePropName="checked"
              tooltip="是否在打印订单时显示店铺名称"
            >
              <Switch checkedChildren="显示" unCheckedChildren="隐藏" />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              name="showAddress"
              label="店铺地址"
              valuePropName="checked"
              tooltip="是否在打印订单时显示店铺地址"
            >
              <Switch checkedChildren="显示" unCheckedChildren="隐藏" />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              name="showPhone"
              label="手机号码"
              valuePropName="checked"
              tooltip="是否在打印订单时显示手机号码"
            >
              <Switch checkedChildren="显示" unCheckedChildren="隐藏" />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              name="showTelephone"
              label="固定电话"
              valuePropName="checked"
              tooltip="是否在打印订单时显示固定电话"
            >
              <Switch checkedChildren="显示" unCheckedChildren="隐藏" />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              name="showBusinessHours"
              label="营业时间"
              valuePropName="checked"
              tooltip="是否在打印订单时显示营业时间"
            >
              <Switch checkedChildren="显示" unCheckedChildren="隐藏" />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              name="showBusinessScope"
              label="经营范围"
              valuePropName="checked"
              tooltip="是否在打印订单时显示经营范围"
            >
              <Switch checkedChildren="显示" unCheckedChildren="隐藏" />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left">社交媒体账号显示控制</Divider>

        <Row gutter={[24, 16]}>
          <Col span={12}>
            <Form.Item
              name="showWechatId"
              label="微信号"
              valuePropName="checked"
              tooltip="是否在打印订单时显示微信号"
            >
              <Switch checkedChildren="显示" unCheckedChildren="隐藏" />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              name="showDouyinId"
              label="抖音号"
              valuePropName="checked"
              tooltip="是否在打印订单时显示抖音号"
            >
              <Switch checkedChildren="显示" unCheckedChildren="隐藏" />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              name="showKuaishouId"
              label="快手号"
              valuePropName="checked"
              tooltip="是否在打印订单时显示快手号"
            >
              <Switch checkedChildren="显示" unCheckedChildren="隐藏" />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              name="showXiaohongshuId"
              label="小红书号"
              valuePropName="checked"
              tooltip="是否在打印订单时显示小红书号"
            >
              <Switch checkedChildren="显示" unCheckedChildren="隐藏" />
            </Form.Item>
          </Col>
        </Row>

        <Divider />

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={submitting}>
              保存设置
            </Button>
            <Button onClick={() => form.resetFields()}>
              取消修改
            </Button>
            <Button onClick={handleResetToDefault}>
              恢复默认
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default PrintSettingsPage;
