import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Table,
  Space,
  Tag,
  message,
  Modal,
  Upload,
  Progress,
  Alert,
  Typography,
  Tooltip,
  Row,
  Col,
  Statistic,
  Steps,
  Result,
  Descriptions,
} from 'antd';
import {
  CloudUploadOutlined,
  RollbackOutlined,
  HistoryOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  FileOutlined,
  ClockCircleOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { UploadProps } from 'antd';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import * as backupApi from '@/services/backup';
import type { BackupRecord } from '@/services/backup';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const { Text, Paragraph } = Typography;
const { Step } = Steps;
const { Dragger } = Upload;

const SystemRestore: React.FC = () => {
  const [backupRecords, setBackupRecords] = useState<BackupRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoreModalVisible, setRestoreModalVisible] = useState(false);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<BackupRecord | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<any>(null);

  useEffect(() => {
    loadBackupRecords();
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

  const handleRestoreFromBackup = (record: BackupRecord) => {
    setSelectedBackup(record);
    setRestoreModalVisible(true);
    setCurrentStep(0);
  };

  const confirmRestore = async () => {
    if (!selectedBackup) return;

    setIsRestoring(true);
    setRestoreProgress(0);
    setCurrentStep(1);

    try {
      const progressInterval = setInterval(() => {
        setRestoreProgress((prev) => Math.min(prev + 5, 90));
      }, 400);

      await backupApi.restoreBackup({ backupId: selectedBackup.id });
      
      clearInterval(progressInterval);
      setRestoreProgress(100);
      setCurrentStep(2);
      message.success('数据恢复完成！');
      setIsRestoring(false);
      loadBackupRecords();
    } catch (error) {
      message.error('数据恢复失败');
      setIsRestoring(false);
      setCurrentStep(0);
      setRestoreProgress(0);
    }
  };

  const handleUploadRestore = () => {
    setUploadModalVisible(true);
    setCurrentStep(0);
    setUploadedFile(null);
  };

  const confirmUploadRestore = async () => {
    if (!uploadedFile) {
      message.warning('请先上传备份文件');
      return;
    }

    setIsRestoring(true);
    setRestoreProgress(0);
    setCurrentStep(1);

    try {
      const progressInterval = setInterval(() => {
        setRestoreProgress((prev) => Math.min(prev + 5, 90));
      }, 500);

      await backupApi.uploadAndRestore(uploadedFile);
      
      clearInterval(progressInterval);
      setRestoreProgress(100);
      setCurrentStep(2);
      message.success('数据恢复完成！');
      setIsRestoring(false);
      loadBackupRecords();
    } catch (error) {
      message.error('数据恢复失败');
      setIsRestoring(false);
      setCurrentStep(0);
      setRestoreProgress(0);
    }
  };

  const uploadProps: UploadProps = {
    name: 'file',
    multiple: false,
    accept: '.sql,.zip',
    beforeUpload: (file) => {
      const isSQLOrZip = file.type === 'application/sql' || 
                         file.type === 'application/x-sql' ||
                         file.type === 'application/zip' ||
                         file.type === 'application/x-zip-compressed' ||
                         file.name.endsWith('.sql') ||
                         file.name.endsWith('.zip');
      
      if (!isSQLOrZip) {
        message.error('只能上传 .sql 或 .zip 格式的备份文件！');
        return false;
      }

      const isLt500M = file.size / 1024 / 1024 < 500;
      if (!isLt500M) {
        message.error('文件大小不能超过 500MB！');
        return false;
      }

      setUploadedFile(file);
      message.success(`${file.name} 文件已选择`);
      return false;
    },
    onDrop(e) {
      console.log('Dropped files', e.dataTransfer.files);
    },
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
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
          <Text code style={{ fontSize: 12 }}>
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
      title: '数据量',
      key: 'dataInfo',
      width: 150,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.tablesCount} 张表
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {(record.recordsCount || 0).toLocaleString()} 条记录
          </Text>
        </Space>
      ),
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
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Button
          type="link"
          icon={<RollbackOutlined />}
          onClick={() => handleRestoreFromBackup(record)}
        >
          恢复
        </Button>
      ),
    },
  ];

  const renderRestoreSteps = () => (
    <Steps current={currentStep} style={{ marginBottom: 24 }}>
      <Step title="确认备份" icon={<CheckCircleOutlined />} />
      <Step title="恢复中" icon={<DatabaseOutlined />} />
      <Step title="完成" icon={<CheckCircleOutlined />} />
    </Steps>
  );

  return (
    <div style={{ padding: 24 }}>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="可用备份"
              value={backupRecords.length}
              prefix={<DatabaseOutlined />}
              suffix="个"
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="最新备份"
              value={backupRecords[0] ? dayjs(backupRecords[0].createdAt).fromNow() : '-'}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="备份数据量"
              value={backupRecords[0]?.recordsCount?.toLocaleString() || '-'}
              prefix={<FileOutlined />}
              suffix="条"
            />
          </Card>
        </Col>
      </Row>

      <Alert
        message={
          <Space>
            <WarningOutlined />
            <Text strong>重要提示</Text>
          </Space>
        }
        description={
          <ul style={{ paddingLeft: 20, margin: '8px 0 0 0' }}>
            <li>数据恢复将会覆盖当前数据库中的所有数据，请谨慎操作</li>
            <li>建议在恢复前先创建当前数据的备份</li>
            <li>恢复过程中请勿关闭浏览器或刷新页面</li>
            <li>数据恢复完成后，建议重新登录系统</li>
          </ul>
        }
        type="warning"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Card
        title={
          <Space>
            <HistoryOutlined />
            <span>可用备份</span>
          </Space>
        }
        extra={
          <Space>
            <Button
              type="primary"
              icon={<CloudUploadOutlined />}
              onClick={handleUploadRestore}
            >
              上传备份文件
            </Button>
            <Button
              icon={<DatabaseOutlined />}
              onClick={loadBackupRecords}
              loading={loading}
            >
              刷新列表
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
            showTotal: (total) => `共 ${total} 个备份`,
          }}
        />
      </Card>

      <Modal
        title={
          <Space>
            <RollbackOutlined />
            <span>数据恢复</span>
          </Space>
        }
        open={restoreModalVisible}
        onCancel={() => {
          if (!isRestoring) {
            setRestoreModalVisible(false);
            setCurrentStep(0);
          }
        }}
        footer={null}
        width={700}
        closable={!isRestoring}
        maskClosable={!isRestoring}
      >
        {renderRestoreSteps()}

        {currentStep === 0 && selectedBackup && (
          <>
            <Alert
              message="请确认以下备份信息"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Descriptions bordered column={2}>
              <Descriptions.Item label="文件名" span={2}>
                <Text code>{selectedBackup.fileName}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="备份时间">
                {dayjs(selectedBackup.createdAt).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              <Descriptions.Item label="文件大小">
                {formatFileSize(selectedBackup.fileSize)}
              </Descriptions.Item>
              <Descriptions.Item label="数据表数量">
                {selectedBackup.tablesCount} 张
              </Descriptions.Item>
              <Descriptions.Item label="记录数量">
                {selectedBackup.recordsCount?.toLocaleString()} 条
              </Descriptions.Item>
              <Descriptions.Item label="备份类型" span={2}>
                {getTypeTag(selectedBackup.backupType)}
              </Descriptions.Item>
              <Descriptions.Item label="说明" span={2}>
                {selectedBackup.description || '-'}
              </Descriptions.Item>
            </Descriptions>

            <div style={{ marginTop: 24, textAlign: 'right' }}>
              <Space>
                <Button onClick={() => setRestoreModalVisible(false)}>
                  取消
                </Button>
                <Button
                  type="primary"
                  danger
                  icon={<RollbackOutlined />}
                  onClick={confirmRestore}
                >
                  确认恢复
                </Button>
              </Space>
            </div>
          </>
        )}

        {currentStep === 1 && (
          <>
            <Alert
              message="正在恢复数据..."
              description="请勿关闭此窗口，恢复过程可能需要几分钟时间"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Progress
              percent={restoreProgress}
              status={restoreProgress === 100 ? 'success' : 'active'}
              strokeColor={{
                '0%': '#108ee9',
                '100%': '#87d068',
              }}
            />
            <Paragraph style={{ marginTop: 16, textAlign: 'center' }}>
              <Text type="secondary">
                正在恢复数据库... {restoreProgress}%
              </Text>
            </Paragraph>
          </>
        )}

        {currentStep === 2 && (
          <Result
            status="success"
            title="数据恢复成功！"
            subTitle="数据已成功恢复到指定备份点，建议重新登录系统以确保数据正确加载。"
            extra={[
              <Button
                type="primary"
                key="close"
                onClick={() => {
                  setRestoreModalVisible(false);
                  setCurrentStep(0);
                  loadBackupRecords();
                }}
              >
                关闭
              </Button>,
            ]}
          />
        )}
      </Modal>

      <Modal
        title={
          <Space>
            <CloudUploadOutlined />
            <span>上传备份文件</span>
          </Space>
        }
        open={uploadModalVisible}
        onCancel={() => {
          if (!isRestoring) {
            setUploadModalVisible(false);
            setCurrentStep(0);
            setUploadedFile(null);
          }
        }}
        footer={null}
        width={700}
        closable={!isRestoring}
        maskClosable={!isRestoring}
      >
        {renderRestoreSteps()}

        {currentStep === 0 && (
          <>
            <Alert
              message="上传备份文件并恢复"
              description="支持 .sql 和 .zip 格式的备份文件，最大支持 500MB"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />

            <Dragger {...uploadProps}>
              <p className="ant-upload-drag-icon">
                <CloudUploadOutlined style={{ color: '#1890ff' }} />
              </p>
              <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
              <p className="ant-upload-hint">
                支持 .sql 和 .zip 格式，单个文件不超过 500MB
              </p>
            </Dragger>

            {uploadedFile && (
              <Card size="small" style={{ marginTop: 16 }}>
                <Space>
                  <FileOutlined style={{ color: '#1890ff' }} />
                  <Text>{uploadedFile.name}</Text>
                  <Text type="secondary">
                    ({formatFileSize(uploadedFile.size)})
                  </Text>
                </Space>
              </Card>
            )}

            <div style={{ marginTop: 24, textAlign: 'right' }}>
              <Space>
                <Button onClick={() => setUploadModalVisible(false)}>
                  取消
                </Button>
                <Button
                  type="primary"
                  danger
                  icon={<RollbackOutlined />}
                  onClick={confirmUploadRestore}
                  disabled={!uploadedFile}
                >
                  开始恢复
                </Button>
              </Space>
            </div>
          </>
        )}

        {currentStep === 1 && (
          <>
            <Alert
              message="正在恢复数据..."
              description="请勿关闭此窗口，恢复过程可能需要几分钟时间"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Progress
              percent={restoreProgress}
              status={restoreProgress === 100 ? 'success' : 'active'}
              strokeColor={{
                '0%': '#108ee9',
                '100%': '#87d068',
              }}
            />
            <Paragraph style={{ marginTop: 16, textAlign: 'center' }}>
              <Text type="secondary">
                正在恢复数据库... {restoreProgress}%
              </Text>
            </Paragraph>
          </>
        )}

        {currentStep === 2 && (
          <Result
            status="success"
            title="数据恢复成功！"
            subTitle="数据已成功恢复，建议重新登录系统以确保数据正确加载。"
            extra={[
              <Button
                type="primary"
                key="close"
                onClick={() => {
                  setUploadModalVisible(false);
                  setCurrentStep(0);
                  setUploadedFile(null);
                  loadBackupRecords();
                }}
              >
                关闭
              </Button>,
            ]}
          />
        )}
      </Modal>
    </div>
  );
};

export default SystemRestore;