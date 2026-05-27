import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Input,
  Modal,
  Form,
  message,
  Card,
  Switch,
  Popconfirm,
  Tag,
  Row,
  Col,
  InputNumber,
  Select,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined,
  CalculatorOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import discountRulesService from '@/services/discountRules';
import type {
  DiscountRule,
  CreateDiscountRuleDto,
  UpdateDiscountRuleDto,
} from '@/types/diy-package';

const { Search } = Input;
const { Option } = Select;

const DiscountRulesList: React.FC = () => {
  const [discountRules, setDiscountRules] = useState<DiscountRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [calculatorVisible, setCalculatorVisible] = useState(false);
  const [editingRule, setEditingRule] = useState<DiscountRule | null>(null);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<boolean | undefined>();
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  const [calculatorResult, setCalculatorResult] = useState<any>(null);
  const [form] = Form.useForm();
  const [calculatorForm] = Form.useForm();

  // 加载折扣规则列表
  const loadDiscountRules = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.current,
        pageSize: pagination.pageSize,
        keyword: searchText || undefined,
        isActive: statusFilter,
      };

      const response = await discountRulesService.getDiscountRules(params);
      setDiscountRules(response.list);
      setPagination({
        ...pagination,
        total: response.pagination.total,
      });
    } catch (error) {
      message.error('加载折扣规则列表失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDiscountRules();
  }, [pagination.current, pagination.pageSize, searchText, statusFilter]);

  // 打开新增/编辑弹窗
  const handleOpenModal = (rule?: DiscountRule) => {
    setModalVisible(true);
    if (rule) {
      setEditingRule(rule);
      form.setFieldsValue({
        ...rule,
        discountRate: rule.discountRate * 100, // 转换为百分比显示
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
      
      // 转换折扣比例为小数
      const submitData: CreateDiscountRuleDto | UpdateDiscountRuleDto = {
        ...values,
        discountRate: values.discountRate / 100,
      };
      
      if (editingRule) {
        await discountRulesService.updateDiscountRule(editingRule.id, submitData as UpdateDiscountRuleDto);
        message.success('更新成功');
      } else {
        await discountRulesService.createDiscountRule(submitData as CreateDiscountRuleDto);
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

  // 搜索
  const handleSearch = (value: string) => {
    setSearchText(value);
    setPagination({ ...pagination, current: 1 });
  };

  // 计算折扣
  const handleCalculateDiscount = async () => {
    try {
      const values = await calculatorForm.validateFields();
      const result = await discountRulesService.calculateDiscount(values.amount);
      setCalculatorResult(result);
    } catch (error: any) {
      if (error.errorFields) {
        return;
      }
      message.error('计算失败');
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
      title: '价格区间',
      key: 'priceRange',
      render: (_, record) => (
        <span>
          ¥{record.minAmount} - ¥{record.maxAmount}
        </span>
      ),
    },
    {
      title: '折扣比例',
      dataIndex: 'discountRate',
      key: 'discountRate',
      render: (rate) => (
        <Tag color="orange">
          {((1 - rate) * 100).toFixed(1)}折 ({(rate * 100).toFixed(1)}%)
        </Tag>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive) => (
        <Tag color={isActive ? 'success' : 'default'}>
          {isActive ? '启用' : '禁用'}
        </Tag>
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
      <Card>
        <Space style={{ marginBottom: 16 }} wrap>
          <Search
            placeholder="搜索规则名称或描述"
            allowClear
            onSearch={handleSearch}
            style={{ width: 300 }}
            enterButton={<SearchOutlined />}
          />
          <Select
            placeholder="规则状态"
            allowClear
            style={{ width: 120 }}
            onChange={(value) => {
              let parsed: boolean | undefined = undefined;
              if (value === null || value === undefined || value === '') parsed = undefined;
              else if (typeof value === 'boolean') parsed = value;
              else if (typeof value === 'string') parsed = value === 'true';
              
              setStatusFilter(parsed);
              setPagination({ ...pagination, current: 1 });
            }}
          >
            <Option value={'true'}>启用</Option>
            <Option value={'false'}>禁用</Option>
          </Select>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => handleOpenModal()}
          >
            新增规则
          </Button>
          <Button
            icon={<CalculatorOutlined />}
            onClick={() => setCalculatorVisible(true)}
          >
            折扣计算器
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={loadDiscountRules}
          >
            刷新
          </Button>
        </Space>

        <Table
          columns={columns}
          dataSource={discountRules}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, pageSize) => {
              setPagination({ ...pagination, current: page, pageSize });
            },
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
            discountRate: 95, // 默认95%（5%折扣）
          }}
        >
          <Form.Item
            label="规则名称"
            name="name"
            rules={[{ required: true, message: '请输入规则名称' }]}
          >
            <Input placeholder="例如：中等价位折扣" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="价格区间起始值"
                name="minAmount"
                rules={[{ required: true, message: '请输入起始价格' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  precision={2}
                  prefix="¥"
                  placeholder="0.00"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="价格区间结束值"
                name="maxAmount"
                rules={[{ required: true, message: '请输入结束价格' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  precision={2}
                  prefix="¥"
                  placeholder="0.00"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="折扣比例"
            name="discountRate"
            rules={[{ required: true, message: '请输入折扣比例' }]}
            extra="100%表示不打折，95%表示95折"
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              max={100}
              precision={1}
              suffix="%"
              placeholder="95.0"
            />
          </Form.Item>

          <Form.Item
            label="规则描述"
            name="description"
          >
            <Input.TextArea
              placeholder="请输入规则描述（可选）"
              rows={3}
            />
          </Form.Item>

          <Form.Item
            label="是否启用"
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

      {/* 折扣计算器弹窗 */}
      <Modal
        title="折扣计算器"
        open={calculatorVisible}
        onOk={handleCalculateDiscount}
        onCancel={() => {
          setCalculatorVisible(false);
          setCalculatorResult(null);
          calculatorForm.resetFields();
        }}
        width={500}
      >
        <Form form={calculatorForm} layout="vertical">
          <Form.Item
            label="输入金额"
            name="amount"
            rules={[{ required: true, message: '请输入金额' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              precision={2}
              prefix="¥"
              placeholder="0.00"

            />
          </Form.Item>
        </Form>

        {calculatorResult && (
          <Card title="计算结果" style={{ marginTop: 16 }}>
            <Row gutter={16}>
              <Col span={12}>
                <div>
                  <strong>原始金额：</strong>
                  <span style={{ color: '#666' }}>¥{calculatorResult.originalAmount}</span>
                </div>
              </Col>
              <Col span={12}>
                <div>
                  <strong>折扣后金额：</strong>
                  <span style={{ color: '#f50', fontSize: '16px' }}>¥{calculatorResult.discountAmount}</span>
                </div>
              </Col>
            </Row>
            <Row gutter={16} style={{ marginTop: 8 }}>
              <Col span={12}>
                <div>
                  <strong>折扣比例：</strong>
                  <Tag color="orange">{(calculatorResult.discountRate * 100).toFixed(1)}%</Tag>
                </div>
              </Col>
              <Col span={12}>
                <div>
                  <strong>节省金额：</strong>
                  <span style={{ color: '#52c41a' }}>¥{calculatorResult.savedAmount}</span>
                </div>
              </Col>
            </Row>
            {calculatorResult.rule && (
              <div style={{ marginTop: 8 }}>
                <strong>应用规则：</strong>
                <Tag color="blue">{calculatorResult.rule.name}</Tag>
              </div>
            )}
            {!calculatorResult.rule && (
              <div style={{ marginTop: 8, color: '#999' }}>
                该金额无适用的折扣规则
              </div>
            )}
          </Card>
        )}
      </Modal>
    </div>
  );
};

export default DiscountRulesList;
