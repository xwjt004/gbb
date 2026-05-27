import React, { useEffect, useState } from 'react';
import { Card, Table, Tag, Space, Button, message, Switch, Popconfirm } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { automationRuleService } from '@/services/automationRules';

const triggerMap: Record<string, string> = {
  ORDER_COMPLETED: '订单完成',
  APPOINTMENT_CONFIRMED: '预约确认',
  STOCK_LOW: '库存偏低',
};

const actionTypeMap: Record<string, string> = {
  SEND_NOTIFICATION: '发送通知',
  UPDATE_ORDER_STATUS: '更新订单状态',
  CREATE_STOCK_ALERT: '创建库存预警',
};

const AutomationRules: React.FC = () => {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const navigate = useNavigate();

  const fetchData = async (page = 1, pageSize = 20) => {
    setLoading(true);
    try {
      const res = await automationRuleService.getList({ page, pageSize }) as any;
      const d = res?.data || res;
      setList(d?.items || []);
      if (d?.pagination) setPagination({ current: d.pagination.page || 1, pageSize: d.pagination.pageSize || 20, total: d.pagination.total || 0 });
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleToggle = async (id: number) => {
    try {
      await automationRuleService.toggle(id);
      message.success('状态已切换');
      fetchData(pagination.current);
    } catch {
      message.error('操作失败');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await automationRuleService.remove(id);
      message.success('删除成功');
      fetchData(pagination.current);
    } catch {
      message.error('删除失败');
    }
  };

  const columns = [
    { title: '规则名称', dataIndex: 'name', key: 'name' },
    { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true },
    {
      title: '触发事件', dataIndex: 'trigger', key: 'trigger',
      render: (v: string) => <Tag>{triggerMap[v] || v}</Tag>,
    },
    {
      title: '动作', key: 'actions',
      render: (_: any, r: any) => {
        const actions: any[] = r.actions || [];
        return actions.map((a: any, i: number) => (
          <Tag key={i} color="blue">{actionTypeMap[a.type] || a.type}</Tag>
        ));
      },
    },
    {
      title: '启用', dataIndex: 'enabled', key: 'enabled',
      render: (_: boolean, r: any) => (
        <Switch checked={r.enabled} onChange={() => handleToggle(r.id)} />
      ),
    },
    {
      title: '操作', key: 'action',
      render: (_: any, r: any) => (
        <Space>
          <Button size="small" onClick={() => navigate(`/settings/automation-rules/edit/${r.id}`)}>编辑</Button>
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(r.id)}>
            <Button size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="自动化规则"
      extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/settings/automation-rules/new')}>新建规则</Button>}
    >
      <Table
        dataSource={list}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{
          ...pagination,
          onChange: (page, pageSize) => fetchData(page, pageSize),
        }}
      />
    </Card>
  );
};

export default AutomationRules;
