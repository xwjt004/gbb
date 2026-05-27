import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  InputNumber,
  Select,
  message,
  Card,
  Popconfirm,
  Switch,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import discountRulesService from '@/services/discountRules';
import type { DiscountRule, CreateDiscountRuleDto, UpdateDiscountRuleDto } from '@/types/diy-package';

const { Option } = Select;

const DiscountRulesList: React.FC = () => {
  const [discountRules, setDiscountRules] = useState<DiscountRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRule, setEditingRule] = useState<DiscountRule | null>(null);
  const [form] = Form.useForm();

  // 加载折扣规则列表
  const loadDiscountRules = async () => {
    setLoading(true);
    try {
      const response = await discountRulesService.getDiscountRules();
      setDiscountRules(response.list);
    } catch (error) {
      message.error('加载折扣规则失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDiscountRules();
  }, []);

  // 打开新增/编辑弹窗
  const handleOpenModal = (rule?: DiscountRule) => {
    setModalVisible(true);
    if (rule) {
      setEditingRule(rule);
      form.setFieldsValue({
        ...rule,
        name: [rule.name], // 转换为数组以适配tags模式
        minAmount: Number(rule.minAmount),
        maxAmount: rule.maxAmount ? Number(rule.maxAmount) : undefined,
        discountRate: Number(rule.discountRate),
      });
    } else {
      setEditingRule(null);
      form.resetFields();
    }
  };

  // 提交表单
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      // 确保name是字符串，如果是数组则取第一个元素
      const ruleName = Array.isArray(values.name) ? values.name[0] : values.name;
      
      if (editingRule) {
        // 更新
        const updateData: UpdateDiscountRuleDto = {
          name: ruleName,
          minAmount: values.minAmount,
          maxAmount: values.maxAmount,
          discountRate: values.discountRate,
          isActive: values.isActive,
        };
        await discountRulesService.updateDiscountRule(editingRule.id, updateData);
        message.success('更新成功');
      } else {
        // 新增
        const createData: CreateDiscountRuleDto = {
          name: ruleName,
          minAmount: values.minAmount,
          maxAmount: values.maxAmount,
          discountRate: values.discountRate,
          isActive: values.isActive ?? true,
        };
        await discountRulesService.createDiscountRule(createData);
        message.success('添加成功');
      }
      
      setModalVisible(false);
      loadDiscountRules();
    } catch (error: any) {
      if (error.errorFields) {
        return;
      }
      message.error(error.message || '操作失败');
      console.error(error);
    }
  };

  // 删除折扣规则
  const handleDelete = async (id: number) => {
    try {
      await discountRulesService.deleteDiscountRule(id);
      message.success('删除成功');
      loadDiscountRules();
    } catch (error: any) {
      message.error(error.message || '删除失败');
      console.error(error);
    }
  };

  // 表格列定义
  const columns: ColumnsType<DiscountRule> = [
    {
      title: '规则名称',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <strong>{text}</strong>,
    },
    {
      title: '最小金额',
      dataIndex: 'minAmount',
      key: 'minAmount',
      align: 'right',
      render: (amount) => `¥${Number(amount).toFixed(2)}`,
    },
    {
      title: '最大金额',
      dataIndex: 'maxAmount',
      key: 'maxAmount',
      align: 'right',
      render: (amount) => amount ? `¥${Number(amount).toFixed(2)}` : '无限制',
    },
    {
      title: '折扣率',
      dataIndex: 'discountRate',
      key: 'discountRate',
      align: 'center',
      render: (rate) => `${(Number(rate) * 100).toFixed(1)}%`,
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      align: 'center',
      render: (isActive) => (
        <span style={{ color: isActive ? '#52c41a' : '#999' }}>
          {isActive ? '启用' : '禁用'}
        </span>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => new Date(date).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleOpenModal(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个折扣规则吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title="折扣规则管理"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => handleOpenModal()}
          >
            新增规则
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={discountRules}
          rowKey="id"
          loading={loading}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      </Card>

      {/* 新增/编辑弹窗 */}
      <Modal
        title={editingRule ? '编辑折扣规则' : '新增折扣规则'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            isActive: true,
          }}
        >
          <Form.Item
            label="规则名称"
            name="name"
            rules={[{ required: true, message: '请输入规则名称' }]}
          >
            <Select placeholder="选择或输入规则名称" mode="tags" maxCount={1}>
              <Option value="小额套系">小额套系</Option>
              <Option value="标准套系">标准套系</Option>
              <Option value="高端套系">高端套系</Option>
              <Option value="豪华套系">豪华套系</Option>
              <Option value="至尊套系">至尊套系</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="最小金额"
            name="minAmount"
            rules={[
              { required: true, message: '请输入最小金额' },
              { type: 'number', min: 0, message: '最小金额不能小于0' },
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              precision={2}
              prefix="¥"
              placeholder="输入最小金额"
            />
          </Form.Item>

          <Form.Item
            label="最大金额"
            name="maxAmount"
            rules={[
              { type: 'number', min: 0, message: '最大金额不能小于0' },
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              precision={2}
              prefix="¥"
              placeholder="输入最大金额（留空表示无限制）"
            />
          </Form.Item>

          <Form.Item
            label="折扣率"
            name="discountRate"
            rules={[
              { required: true, message: '请输入折扣率' },
              { type: 'number', min: 0, max: 1, message: '折扣率应在0-1之间' },
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              max={1}
              step={0.01}
              precision={3}
              placeholder="输入折扣率（如0.98表示9.8折）"
            />
          </Form.Item>

          <Form.Item
            label="状态"
            name="isActive"
            valuePropName="checked"
          >
            <Switch
              checkedChildren="启用"
              unCheckedChildren="禁用"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DiscountRulesList;
