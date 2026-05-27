import React, { useState } from 'react';
import {
  Card, Button, Space, Table, message, Statistic, Row, Col,
  Divider, Alert,
} from 'antd';
import {
  DownloadOutlined, UserOutlined, EyeOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { exportService } from '@/services/export';
import { userService } from '@/services/users';

interface UserRecord {
  id: number;
  nickname: string;
  phone: string;
  openid: string;
  createdAt: string;
  orderCount?: number;
}

const ExportUsers: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [previewData, setPreviewData] = useState<UserRecord[]>([]);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const columns: ColumnsType<UserRecord> = [
    { title: '用户ID', dataIndex: 'id', width: 80 },
    { title: '昵称', dataIndex: 'nickname', width: 150 },
    { title: '手机号', dataIndex: 'phone', width: 130 },
    { title: '订单数', dataIndex: 'orderCount', width: 80 },
    {
      title: '注册时间', dataIndex: 'createdAt', width: 180,
      render: (v: string) => v ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : '-',
    },
  ];

  const handlePreview = async () => {
    setLoading(true);
    try {
      const res = await userService.getUsers({ page: 1, pageSize: 100 });
      const d = (res as any).data || res;
      setPreviewData(d.list || []);
      setTotalCount(d.pagination?.total || d.list?.length || 0);
      setPreviewVisible(true);
    } catch {
      message.error('获取用户数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportService.exportUsers();
      message.success('用户数据导出已开始，文件正在下载...');
    } catch {
      message.error('导出失败');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Card title="导出用户数据" variant="borderless">
        <Alert
          message="功能说明"
          description="导出系统中所有注册用户的基本信息，包含用户ID、昵称、手机号、注册时间等字段，生成 Excel 文件。"
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />

        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={8}>
            <Card size="small">
              <Statistic title="用户总数" value={totalCount || '-'} prefix={<UserOutlined />} />
            </Card>
          </Col>
        </Row>

        <Space size="middle">
          <Button icon={<EyeOutlined />} onClick={handlePreview} loading={loading}>
            预览数据
          </Button>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={handleExport}
            loading={exporting}
          >
            导出 Excel
          </Button>
        </Space>

        {previewVisible && (
          <>
            <Divider />
            <Table
              rowKey="id"
              columns={columns}
              dataSource={previewData}
              loading={loading}
              scroll={{ x: 700 }}
              pagination={{
                pageSize: 10,
                showTotal: (t) => `共 ${t} 条`,
                showSizeChanger: true,
              }}
            />
          </>
        )}
      </Card>
    </div>
  );
};

export default ExportUsers;
