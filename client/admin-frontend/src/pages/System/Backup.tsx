import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Table,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  InputNumber,
  Switch,
  Select,
  Popconfirm,
  Progress,
  Alert,
  Typography,
  Tooltip,
  Row,
  Col,
  Statistic,
  Divider,
  App,
} from 'antd';
import {
  CloudDownloadOutlined,
  CloudUploadOutlined,
  DeleteOutlined,
  HistoryOutlined,
  SettingOutlined,
  SyncOutlined,
  DatabaseOutlined,
  FileOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import * as backupApi from '@/services/backup';
import type { BackupRecord, BackupConfig } from '@/services/backup';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const { Text } = Typography;
const { Option } = Select;

const SystemBackup: React.FC = () => {
  const { message } = App.useApp();
  const [backupRecords, setBackupRecords] = useState<BackupRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [configModalVisible, setConfigModalVisible] = useState(false);
  const [backupConfig, setBackupConfig] = useState<BackupConfig>({
    id: 1,
    autoBackup: false,
    backupFrequency: 'daily',
    backupTime: '02:00',
    retentionDays: 30,
    includeUploads: false,
    updatedAt: new Date(),
  });
  const [form] = Form.useForm();

  useEffect(() => {
    loadBackupRecords();
    loadBackupConfig();
  }, []);

  const loadBackupRecords = async () => {
    setLoading(true);
    try {
      const response = await backupApi.getBackups();
      setBackupRecords(response.data.data || []);
    } catch (error) {
      message.error('加载备份记录失败');
    } finally {
      setLoading(false);
    }
  };

  const loadBackupConfig = async () => {
    try {
      const response = await backupApi.getBackupConfig();
      const config = response.data.data;
      console.log('从后端加载的配置:', config);
      setBackupConfig(config);
    } catch (error) {
      message.error('加载备份配置失败');
    }
  };

  const handleBackup = async () => {
    setIsBackingUp(true);
    setBackupProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setBackupProgress((prev) => {
          if (prev >= 90) {
            return 90;
          }
          return prev + 10;
        });
      }, 300);

      await backupApi.createBackup({ description: '手动备份', includeUploads: backupConfig.includeUploads });
      
      clearInterval(progressInterval);
      setBackupProgress(100);
      message.success('备份完成！');
      setIsBackingUp(false);
      loadBackupRecords();
    } catch (error) {
      message.error('备份失败');
      setIsBackingUp(false);
      setBackupProgress(0);
    }
  };

  const handleDownload = (id: string) => {
    try {
      message.loading({ content: '正在准备下载...', key: 'download' });
      backupApi.downloadBackup(id);
      setTimeout(() => {
        message.success({ content: '下载已开始', key: 'download' });
      }, 500);
    } catch (error) {
      message.error({ content: '下载失败', key: 'download' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await backupApi.deleteBackup(id);
      message.success('删除成功');
      loadBackupRecords();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleSaveConfig = async (values: any) => {
    try {
      console.log('=== 表单提交调试 ===');
      console.log('1. 表单原始值:', values);
      console.log('2. autoBackup 原始值:', values.autoBackup, '类型:', typeof values.autoBackup);
      
      // 确保数据类型正确 - 关键修复点
      const config = {
        autoBackup: values.autoBackup === true || values.autoBackup === 'true' || values.autoBackup === 1,
        backupFrequency: values.autoBackup ? values.backupFrequency : 'daily',
        backupTime: values.autoBackup ? values.backupTime : '02:00',
        retentionDays: Number(values.retentionDays),
        includeUploads: values.includeUploads === true || values.includeUploads === 'true' || values.includeUploads === 1,
      };
      
      console.log('3. 处理后的配置:', config);
      console.log('4. autoBackup 最终值:', config.autoBackup, '类型:', typeof config.autoBackup);
      
      const response = await backupApi.updateBackupConfig(config);
      console.log('5. 后端返回:', response.data);
      
      message.success('配置已保存');
      setConfigModalVisible(false);
      
      // 重新加载配置
      await loadBackupConfig();
    } catch (error: any) {
      console.error('保存配置失败:', error);
      console.error('错误详情:', error.response?.data);
      message.error(`保存配置失败: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleOpenConfig = () => {
    console.log('打开配置对话框，当前配置:', backupConfig);
    form.setFieldsValue(backupConfig);
    setConfigModalVisible(true);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getStatusTag = (status: BackupRecord['status']) => {
    const statusMap = {
      success: { color: 'success', icon: <CheckCircleOutlined />, text: '成功' },
      failed: { color: 'error', icon: <ExclamationCircleOutlined />, text: '失败' },
      inProgress: { color: 'processing', icon: <SyncOutlined spin />, text: '进行中' },
    };
    const config = statusMap[status];
    return (
      <Tag color={config.color} icon={config.icon}>
        {config.text}
      </Tag>
    );
  };

  const getTypeTag = (type: BackupRecord['backupType']) => {
    const typeMap = {
      manual: { color: 'blue', text: '手动' },
      auto: { color: 'green', text: '自动' },
      scheduled: { color: 'orange', text: '计划' },
    };
    const config = typeMap[type];
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const columns: ColumnsType<BackupRecord> = [
    {
      title: '文件名',
      dataIndex: 'fileName',
      key: 'fileName',
      render: (text) => (
        <Space>
          <FileOutlined style={{ color: '#1890ff' }} />
          <Text code copyable style={{ fontSize: 12 }}>
            {text}
          </Text>
        </Space>
      ),
    },
    {
      title: '文件大小',
      dataIndex: 'fileSize',
      key: 'fileSize',
      width: 120,
      render: (size) => <Text>{formatFileSize(size)}</Text>,
    },
    {
      title: '备份类型',
      dataIndex: 'backupType',
      key: 'backupType',
      width: 100,
      render: (type) => getTypeTag(type),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => getStatusTag(status),
    },
    {
      title: '备份时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (time) => (
        <Tooltip title={dayjs(time).format('YYYY-MM-DD HH:mm:ss')}>
          <Space>
            <ClockCircleOutlined />
            {dayjs(time).format('MM-DD HH:mm')}
          </Space>
        </Tooltip>
      ),
    },
    {
      title: '耗时',
      dataIndex: 'duration',
      key: 'duration',
      width: 100,
      render: (duration) => duration ? `${duration}s` : '-',
    },
    {
      title: '说明',
      dataIndex: 'description',
      key: 'description',
      ellipsis: { showTitle: false },
      render: (text) => (
        <Tooltip title={text}>
          <Text ellipsis>{text || '-'}</Text>
        </Tooltip>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="下载">
            <Button
              type="link"
              size="small"
              icon={<CloudDownloadOutlined />}
              onClick={() => handleDownload(record.id)}
            />
          </Tooltip>
          <Popconfirm
            title="确定要删除此备份吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Tooltip title="删除">
              <Button
                type="link"
                size="small"
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="备份总数"
              value={backupRecords.length}
              prefix={<DatabaseOutlined />}
              suffix="个"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="总大小"
              value={formatFileSize(
                backupRecords.reduce((sum, item) => sum + item.fileSize, 0)
              )}
              prefix={<FileOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="最近备份"
              value={backupRecords[0] ? dayjs(backupRecords[0].createdAt).fromNow() : '-'}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="自动备份"
              value={backupConfig.autoBackup ? '已启用' : '未启用'}
              valueStyle={{ color: backupConfig.autoBackup ? '#3f8600' : '#cf1322' }}
              prefix={<SyncOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {backupConfig.autoBackup && (
        <Alert
          message="自动备份已启用"
          description={
            <div>
              <div>备份频率：{backupConfig.backupFrequency === 'daily' ? '每天' : backupConfig.backupFrequency === 'weekly' ? '每周' : '每月'}</div>
              <div>备份时间：{backupConfig.backupTime}</div>
              <div>保留天数：{backupConfig.retentionDays} 天</div>
              <div>包含上传文件：{backupConfig.includeUploads ? '是' : '否'}</div>
            </div>
          }
          type="info"
          showIcon
          icon={<SyncOutlined />}
          style={{ marginBottom: 16 }}
        />
      )}

      {isBackingUp && (
        <Alert
          message="正在执行备份..."
          description={
            <Progress
              percent={backupProgress}
              status={backupProgress === 100 ? 'success' : 'active'}
            />
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Card
        title={
          <Space>
            <HistoryOutlined />
            <span>备份记录</span>
          </Space>
        }
        extra={
          <Space>
            <Button
              type="primary"
              icon={<CloudUploadOutlined />}
              onClick={handleBackup}
              loading={isBackingUp}
            >
              立即备份
            </Button>
            <Button
              icon={<SettingOutlined />}
              onClick={handleOpenConfig}
            >
              备份配置
            </Button>
            <Button
              icon={<SyncOutlined />}
              onClick={loadBackupRecords}
              loading={loading}
            >
              刷新
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={backupRecords}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
        />
      </Card>

      <Modal
        title={
          <Space>
            <SettingOutlined />
            <span>备份配置</span>
          </Space>
        }
        open={configModalVisible}
        onCancel={() => setConfigModalVisible(false)}
        onOk={() => form.submit()}
        width={600}
        okText="保存"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSaveConfig}
          initialValues={backupConfig}
        >
          <Form.Item
            name="autoBackup"
            label="自动备份"
            valuePropName="checked"
          >
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) =>
              prevValues.autoBackup !== currentValues.autoBackup
            }
          >
            {({ getFieldValue }) =>
              getFieldValue('autoBackup') ? (
                <>
                  <Form.Item
                    name="backupFrequency"
                    label="备份频率"
                    rules={[
                      {
                        required: getFieldValue('autoBackup'),
                        message: '请选择备份频率',
                      },
                    ]}
                  >
                    <Select>
                      <Option value="daily">每天</Option>
                      <Option value="weekly">每周</Option>
                      <Option value="monthly">每月</Option>
                    </Select>
                  </Form.Item>

                  <Form.Item
                    name="backupTime"
                    label="备份时间"
                    rules={[
                      {
                        required: getFieldValue('autoBackup'),
                        message: '请输入备份时间',
                      },
                    ]}
                  >
                    <Input placeholder="例如: 02:00" />
                  </Form.Item>
                </>
              ) : null
            }
          </Form.Item>

          <Form.Item
            name="retentionDays"
            label="保留天数"
            rules={[{ required: true, message: '请输入保留天数' }]}
          >
            <InputNumber
              min={1}
              max={365}
              addonAfter="天"
              placeholder="备份文件保留天数"
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            name="includeUploads"
            label="包含上传文件"
            valuePropName="checked"
          >
            <Switch checkedChildren="是" unCheckedChildren="否" />
          </Form.Item>

          <Divider />

          <Alert
            message="备份说明"
            description={
              <ul style={{ paddingLeft: 20, margin: 0 }}>
                <li>备份将包含数据库的完整数据</li>
                <li>自动备份将在指定时间自动执行</li>
                <li>超过保留天数的备份将自动删除</li>
                <li>建议定期下载重要备份到本地保存</li>
              </ul>
            }
            type="info"
            showIcon
          />
        </Form>
      </Modal>
    </div>
  );
};

export default SystemBackup;
