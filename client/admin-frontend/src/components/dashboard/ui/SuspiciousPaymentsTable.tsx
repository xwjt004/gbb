import React from 'react';
import { Table, Space, Button, Tag, Modal, message } from 'antd';
import dayjs from 'dayjs';
import { SuspiciousPayment } from '../../../pages/Dashboard/dashboardTypes';

interface Props {
  data: SuspiciousPayment[];
  onRefresh: () => void;
}

export const SuspiciousPaymentsTable: React.FC<Props> = ({ data, onRefresh }) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'red';
      case 'medium': return 'orange';
      case 'low': return 'blue';
      default: return 'default';
    }
  };

  const handleViewDetails = (record: SuspiciousPayment) => {
    Modal.info({
      title: '可疑支付详情',
      content: (
        <div>
          <p><strong>支付ID:</strong> {record.id}</p>
          <p><strong>订单ID:</strong> {record.orderId}</p>
          <p><strong>金额:</strong> ¥{record.amount}</p>
          <p><strong>问题描述:</strong> {record.description}</p>
          <p><strong>严重性:</strong> <Tag color={getSeverityColor(record.severity)}>{record.severity.toUpperCase()}</Tag></p>
          <p><strong>创建时间:</strong> {dayjs(record.createdAt).format('YYYY-MM-DD HH:mm:ss')}</p>
        </div>
      ),
    });
  };

  const handleMarkResolved = () => {
    message.success('已标记为已解决');
    onRefresh();
  };

  const columns = [
    { title: '支付ID', dataIndex: 'id', key: 'id' },
    { title: '订单ID', dataIndex: 'orderId', key: 'orderId' },
    { title: '金额', dataIndex: 'amount', key: 'amount', render: (a: number) => `¥${a.toFixed(2)}` },
    { title: '问题类型', dataIndex: 'issue', key: 'issue', render: (issue: string) => {
        const map = { duplicate: '重复支付', overpayment: '超额支付', system_error: '系统错误' } as any;
        return map[issue] || issue;
      }
    },
    { title: '严重性', dataIndex: 'severity', key: 'severity', render: (s: string) => <Tag color={getSeverityColor(s)}>{s.toUpperCase()}</Tag> },
    { title: '描述', dataIndex: 'description', key: 'description' },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', render: (d: string) => dayjs(d).format('YYYY-MM-DD HH:mm:ss') },
    { title: '操作', key: 'action', render: (_: any, record: SuspiciousPayment) => (
      <Space>
        <Button type="link" size="small" onClick={() => handleViewDetails(record)}>查看详情</Button>
        <Button type="link" size="small" danger onClick={() => handleMarkResolved()}>标记已解决</Button>
      </Space>
    ) }
  ];

  return (
    <Table
      columns={columns}
      dataSource={data}
      rowKey="id"
      pagination={{ pageSize: 10, showSizeChanger: true }}
    />
  );
};

export default SuspiciousPaymentsTable;
