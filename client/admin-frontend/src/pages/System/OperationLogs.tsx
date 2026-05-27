import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, Card, Select, DatePicker, Button, Space, Tag, Row, Col, Input, message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { simple } from '@/services/api';

const { RangePicker } = DatePicker;

interface OperationLog {
  id: string;
  module: string;
  action: string;
  operatorName: string | null;
  targetDesc: string | null;
  method: string;
  path: string;
  ip: string | null;
  duration: number;
  statusCode: number;
  createdAt: string;
}

const methodColorMap: Record<string, string> = {
  POST: 'green',
  PUT: 'orange',
  PATCH: 'blue',
  DELETE: 'red',
};

const OperationLogs: React.FC = () => {
  const [list, setList] = useState<OperationLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [modules, setModules] = useState<string[]>([]);
  const [filters, setFilters] = useState<{
    module?: string;
    operatorName?: string;
    startDate?: string;
    endDate?: string;
  }>({});

  const fetchModules = useCallback(async () => {
    try {
      const res = await simple.get<string[]>('/operation-logs/modules');
      if (Array.isArray(res)) setModules(res);
    } catch {
      // silent
    }
  }, []);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await simple.get('/operation-logs', {
        params: {
          page: pagination.current,
          pageSize: pagination.pageSize,
          ...filters,
        },
      } as any);
      const d = res.data || res;
      setList(d.items || []);
      setPagination(prev => ({ ...prev, total: d.total || 0 }));
    } catch {
      message.error('获取操作日志失败');
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.pageSize, filters]);

  useEffect(() => { fetchModules(); }, []);
  useEffect(() => { fetchList(); }, [fetchList]);

  const columns: ColumnsType<OperationLog> = [
    { title: '时间', dataIndex: 'createdAt', width: 170, render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm:ss') },
    { title: '模块', dataIndex: 'module', width: 100, render: (v: string) => <Tag>{v}</Tag> },
    { title: '操作', dataIndex: 'action', width: 80 },
    { title: '操作人', dataIndex: 'operatorName', width: 100, render: (v: string | null) => v || '-' },
    {
      title: 'HTTP', width: 80,
      render: (_: any, r: OperationLog) => <Tag color={methodColorMap[r.method]}>{r.method}</Tag>,
    },
    { title: '路径', dataIndex: 'path', width: 300, render: (v: string) => <code style={{ fontSize: 12 }}>{v}</code> },
    { title: '状态', dataIndex: 'statusCode', width: 70, render: (v: number) => <Tag color={v >= 400 ? 'red' : 'green'}>{v}</Tag> },
    { title: '耗时', dataIndex: 'duration', width: 80, render: (v: number) => `${v}ms` },
    { title: 'IP', dataIndex: 'ip', width: 140, render: (v: string | null) => v || '-' },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card title="操作日志" style={{ marginBottom: 16 }}>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={4}>
            <Select
              placeholder="模块"
              allowClear
              style={{ width: '100%' }}
              value={filters.module}
              onChange={(v) => setFilters(prev => ({ ...prev, module: v }))}
            >
              {modules.map(m => (
                <Select.Option key={m} value={m}>{m}</Select.Option>
              ))}
            </Select>
          </Col>
          <Col span={4}>
            <Input
              placeholder="操作人"
              allowClear
              value={filters.operatorName}
              onChange={(e) => setFilters(prev => ({ ...prev, operatorName: e.target.value }))}
            />
          </Col>
          <Col span={8}>
            <RangePicker
              style={{ width: '100%' }}
              onChange={(dates) => {
                setFilters(prev => ({
                  ...prev,
                  startDate: dates?.[0]?.format('YYYY-MM-DD'),
                  endDate: dates?.[1]?.format('YYYY-MM-DD'),
                }));
              }}
            />
          </Col>
          <Col>
            <Space>
              <Button type="primary" onClick={() => { setPagination(p => ({ ...p, current: 1 })); fetchList(); }}>
                查询
              </Button>
              <Button onClick={() => {
                setFilters({});
                setPagination(p => ({ ...p, current: 1 }));
              }}>
                重置
              </Button>
            </Space>
          </Col>
        </Row>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={list}
          loading={loading}
          scroll={{ x: 1200 }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (t) => `共 ${t} 条`,
            onChange: (page, pageSize) => setPagination({ current: page, pageSize, total: pagination.total }),
          }}
        />
      </Card>
    </div>
  );
};

export default OperationLogs;
