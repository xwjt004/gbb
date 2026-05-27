import React, { useEffect, useState, useRef } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Space, 
  message, 
  Modal, 
  Descriptions, 
  Tag,
  Statistic,
  Row,
  Col,
  Input,
  DatePicker,
  Tooltip,
  Select
} from 'antd';
import Draggable from 'react-draggable';
import { 
  EyeOutlined, 
  DeleteOutlined,
  ShoppingCartOutlined,
  DollarOutlined,
  FileTextOutlined,
  SearchOutlined,
  SortAscendingOutlined,
  SortDescendingOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import diyPackagesService from '@/services/diyPackages';
import type { DiyPackage } from '@/types/diy-package';

const { RangePicker } = DatePicker;

interface DiyPackageWithStats extends DiyPackage {
  orderCount?: number;
  totalSalesAmount?: number;
}

const DiyPackageList: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState<DiyPackageWithStats[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<DiyPackageWithStats | null>(null);

  // 拖动相关状态
  const [dragDisabled, setDragDisabled] = useState(true);
  const [dragBounds, setDragBounds] = useState({ left: 0, top: 0, bottom: 0, right: 0 });
  const draggleRef = useRef<HTMLDivElement>(null);

  // 搜索条件
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchCustomerId, setSearchCustomerId] = useState<number | undefined>();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  
  // 排序条件
  const [sortBy, setSortBy] = useState<string>(''); // 'orderCount' | 'totalSalesAmount' | ''
  const [sortOrder, setSortOrder] = useState<string>('desc'); // 'asc' | 'desc'

  // 加载列表数据
  const loadData = async () => {
    setLoading(true);
    try {
      const params: any = {
        page: currentPage,
        pageSize,
      };

      if (searchKeyword) {
        params.packageName = searchKeyword;
      }
      if (searchCustomerId) {
        params.customerId = searchCustomerId;
      }
      if (dateRange && dateRange[0] && dateRange[1]) {
        params.startDate = dateRange[0].format('YYYY-MM-DD');
        params.endDate = dateRange[1].format('YYYY-MM-DD');
      }
      
      // 添加排序参数
      if (sortBy) {
        params.sortBy = sortBy;
        params.sortOrder = sortOrder;
      }

      const response = await diyPackagesService.getDiyPackages(params);
      setDataSource(response.list || []);
      setTotal(response.pagination?.total || 0);
    } catch (error: any) {
      message.error(error.message || '加载DIY套系列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageSize, sortBy, sortOrder]);

  // 查看详情
  const handleViewDetail = async (record: DiyPackageWithStats) => {
    try {
      setLoading(true);
      // 调用详情 API 获取完整数据(包括 selectedItems)
      const detailData = await diyPackagesService.getDiyPackageById(record.id);
      console.log('详情数据:', detailData); // 添加调试日志
      setSelectedPackage(detailData as any);
      setDetailModalVisible(true);
    } catch (error: any) {
      message.error(error.message || '获取详情失败');
    } finally {
      setLoading(false);
    }
  };

  // 删除套系
  const handleDelete = (id: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '删除后将无法恢复，确定要删除这个DIY套系吗？',
      okText: '确定',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        try {
          await diyPackagesService.deleteDiyPackage(id);
          message.success('删除成功');
          loadData();
        } catch (error: any) {
          message.error(error.message || '删除失败');
        }
      },
    });
  };

  // 搜索
  const handleSearch = () => {
    setCurrentPage(1);
    loadData();
  };

  // 重置搜索
  const handleReset = () => {
    setSearchKeyword('');
    setSearchCustomerId(undefined);
    setDateRange(null);
    setSortBy('');
    setSortOrder('desc');
    setCurrentPage(1);
    loadData();
  };

  const columns: ColumnsType<DiyPackageWithStats> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      fixed: 'left',
    },
    {
      title: '套系名称',
      dataIndex: 'packageName',
      key: 'packageName',
      width: 200,
      fixed: 'left',
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: '客户信息',
      key: 'customerInfo',
      width: 150,
      render: (_, record) => {
        const info = record.customerInfo as any;
        return info ? (
          <div>
            <div>{info.name || '-'}</div>
            <div style={{ fontSize: '12px', color: '#888' }}>{info.phone || '-'}</div>
          </div>
        ) : '-';
      },
    },
    {
      title: '原价',
      dataIndex: 'originalAmount',
      key: 'originalAmount',
      width: 120,
      align: 'right',
      render: (value: any) => {
        const num = Number(value);
        return `¥${!isNaN(num) ? num.toFixed(2) : '0.00'}`;
      },
    },
    {
      title: '折扣金额',
      dataIndex: 'discountAmount',
      key: 'discountAmount',
      width: 120,
      align: 'right',
      render: (value: any) => {
        const num = Number(value);
        return (
          <span style={{ color: '#ff4d4f' }}>
            -¥{!isNaN(num) ? num.toFixed(2) : '0.00'}
          </span>
        );
      },
    },
    {
      title: '最终价格',
      key: 'finalAmount',
      width: 120,
      align: 'right',
      render: (_, record) => {
        const final = (record.originalAmount || 0) - (record.discountAmount || 0);
        return <strong style={{ color: '#52c41a' }}>¥{final.toFixed(2)}</strong>;
      },
    },
    {
      title: '销售次数',
      dataIndex: 'orderCount',
      key: 'orderCount',
      width: 120,
      align: 'center',
      render: (count: number | undefined) => (
        <Tooltip title="该套系创建的订单数量">
          <Tag color="blue" icon={<ShoppingCartOutlined />}>
            {count || 0} 单
          </Tag>
        </Tooltip>
      ),
    },
    {
      title: '销售金额',
      dataIndex: 'totalSalesAmount',
      key: 'totalSalesAmount',
      width: 140,
      align: 'right',
      render: (amount: any) => {
        const num = Number(amount);
        return (
          <Tooltip title="该套系创建订单的总金额">
            <Tag color="green" icon={<DollarOutlined />}>
              ¥{!isNaN(num) ? num.toFixed(2) : '0.00'}
            </Tag>
          </Tooltip>
        );
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            详情
          </Button>
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  // 计算统计数据
  const totalOrderCount = dataSource.reduce((sum, item) => sum + (item.orderCount || 0), 0);
  const totalSalesAmount = dataSource.reduce((sum, item) => sum + (item.totalSalesAmount || 0), 0);

  return (
    <div style={{ padding: '24px' }}>
      <Card 
        title={
          <Space>
            <FileTextOutlined />
            <span>DIY套系列表</span>
          </Space>
        }
        extra={
          <Button type="primary" href="#/diy-packages/builder">
            新建DIY套系
          </Button>
        }
      >
        {/* 统计卡片 */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={8}>
            <Card>
              <Statistic
                title="总套系数量"
                value={total}
                prefix={<FileTextOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="总销售次数"
                value={totalOrderCount}
                prefix={<ShoppingCartOutlined />}
                suffix="单"
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="总销售金额"
                value={totalSalesAmount.toFixed(2)}
                prefix="¥"
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
        </Row>

        {/* 搜索条件 */}
        <Card size="small" style={{ marginBottom: 16 }}>
          <Space wrap>
            <Input
              placeholder="搜索套系名称"
              prefix={<SearchOutlined />}
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onPressEnter={handleSearch}
              style={{ width: 200 }}
              allowClear
            />
            <RangePicker
              value={dateRange}
              onChange={(dates) => setDateRange(dates as any)}
              format="YYYY-MM-DD"
              style={{ width: 260 }}
              placeholder={['开始日期', '结束日期']}
            />
            <Select
              placeholder="排序方式"
              value={sortBy || undefined}
              onChange={(value) => {
                setSortBy(value || '');
                if (value) {
                  setCurrentPage(1); // 切换排序时重置到第一页
                }
              }}
              style={{ width: 140 }}
              allowClear
              options={[
                { label: '销售次数', value: 'orderCount' },
                { label: '销售金额', value: 'totalSalesAmount' },
              ]}
            />
            {sortBy && (
              <Select
                value={sortOrder}
                onChange={(value) => {
                  setSortOrder(value);
                  setCurrentPage(1); // 切换排序时重置到第一页
                }}
                style={{ width: 100 }}
                options={[
                  { 
                    label: (
                      <span>
                        <SortDescendingOutlined /> 降序
                      </span>
                    ), 
                    value: 'desc' 
                  },
                  { 
                    label: (
                      <span>
                        <SortAscendingOutlined /> 升序
                      </span>
                    ), 
                    value: 'asc' 
                  },
                ]}
              />
            )}
            <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
              搜索
            </Button>
            <Button onClick={handleReset}>重置</Button>
          </Space>
        </Card>

        {/* 列表 */}
        <Table
          columns={columns}
          dataSource={dataSource}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1600, y: 'calc(100vh - 420px)' }}
          sticky={{ offsetHeader: 0 }}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, size) => {
              setCurrentPage(page);
              setPageSize(size);
            },
          }}
        />
      </Card>

      {/* 详情弹窗 */}
      <Modal
        title={
          <div
            style={{
              width: '100%',
              cursor: 'move',
            }}
            onMouseOver={() => {
              setDragDisabled(false);
            }}
            onMouseOut={() => {
              setDragDisabled(true);
            }}
          >
            DIY套系详情
          </div>
        }
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={900}
        style={{ top: 20 }}
        styles={{
          body: {
            maxHeight: 'calc(100vh - 200px)',
            overflowY: 'auto',
            fontSize: '15px'
          }
        }}
        modalRender={(modal) => (
          <Draggable
            disabled={dragDisabled}
            bounds={dragBounds}
            nodeRef={draggleRef}
            onStart={(_event, uiData) => {
              const { clientWidth, clientHeight } = window.document.documentElement;
              const targetRect = draggleRef.current?.getBoundingClientRect();
              if (!targetRect) {
                return;
              }
              setDragBounds({
                left: -targetRect.left + uiData.x,
                right: clientWidth - (targetRect.right - uiData.x),
                top: -targetRect.top + uiData.y,
                bottom: clientHeight - (targetRect.bottom - uiData.y),
              });
            }}
          >
            <div ref={draggleRef}>{modal}</div>
          </Draggable>
        )}
      >
        {selectedPackage && (
          <>
            <Descriptions bordered column={2} size="middle" labelStyle={{ fontSize: '15px', fontWeight: 'bold' }} contentStyle={{ fontSize: '15px' }}>
              <Descriptions.Item label="套系ID">{selectedPackage.id}</Descriptions.Item>
              <Descriptions.Item label="套系名称">
                <strong style={{ fontSize: '16px' }}>{selectedPackage.packageName}</strong>
              </Descriptions.Item>
              <Descriptions.Item label="客户姓名">
                {(selectedPackage.customerInfo as any)?.name || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="客户电话">
                {(selectedPackage.customerInfo as any)?.phone || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="原价">
                <span style={{ fontSize: '15px' }}>¥{Number(selectedPackage.originalAmount || 0).toFixed(2)}</span>
              </Descriptions.Item>
              <Descriptions.Item label="折扣金额">
                <span style={{ color: '#ff4d4f', fontSize: '15px' }}>
                  -¥{Number(selectedPackage.discountAmount || 0).toFixed(2)}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="最终价格">
                <strong style={{ color: '#52c41a', fontSize: '18px' }}>
                  ¥{(Number(selectedPackage.originalAmount || 0) - Number(selectedPackage.discountAmount || 0)).toFixed(2)}
                </strong>
              </Descriptions.Item>
              <Descriptions.Item label="折扣率">
                <span style={{ fontSize: '15px' }}>{Number(selectedPackage.discountRate || 0).toFixed(2)}%</span>
              </Descriptions.Item>
              <Descriptions.Item label="销售次数" span={1}>
                <Tag color="blue" icon={<ShoppingCartOutlined />} style={{ fontSize: '14px', padding: '4px 10px' }}>
                  {selectedPackage.orderCount || 0} 单
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="销售金额" span={1}>
                <Tag color="green" icon={<DollarOutlined />} style={{ fontSize: '14px', padding: '4px 10px' }}>
                  ¥{Number(selectedPackage.totalSalesAmount || 0).toFixed(2)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="创建时间" span={2}>
                <span style={{ fontSize: '14px' }}>{dayjs(selectedPackage.createdAt).format('YYYY-MM-DD HH:mm:ss')}</span>
              </Descriptions.Item>
              <Descriptions.Item label="更新时间" span={2}>
                <span style={{ fontSize: '14px' }}>{dayjs(selectedPackage.updatedAt).format('YYYY-MM-DD HH:mm:ss')}</span>
              </Descriptions.Item>
            </Descriptions>

            {/* 套系明细 */}
            <Card 
              title={<span style={{ fontSize: '16px', fontWeight: 'bold' }}>套系明细</span>}
              size="small" 
              style={{ marginTop: 16 }}
            >
              {(() => {
                console.log('selectedPackage:', selectedPackage);
                
                // 尝试从多个可能的位置获取 selectedItems
                let items = null;
                
                // 优先从 savedRequest.customOptions.selectedItems 获取
                if ((selectedPackage as any).savedRequest?.customOptions?.selectedItems) {
                  items = (selectedPackage as any).savedRequest.customOptions.selectedItems;
                  console.log('从 savedRequest.customOptions.selectedItems 获取:', items);
                }
                // 备用: 直接从 selectedItems 获取
                else if (selectedPackage.selectedItems) {
                  items = selectedPackage.selectedItems;
                  console.log('从 selectedItems 获取:', items);
                }
                
                if (!items || !Array.isArray(items) || items.length === 0) {
                  return (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                      暂无明细数据
                    </div>
                  );
                }

                // 注意: 后端返回的 type 是小写的 "product" 和 "service"
                const products = items.filter((item: any) => 
                  item.type?.toLowerCase() === 'product'
                );
                const services = items.filter((item: any) => 
                  item.type?.toLowerCase() === 'service'
                );

                console.log('商品数量:', products.length, '服务数量:', services.length);

                return (
                  <div>
                    {/* 商品列表 */}
                    {products.length > 0 && (
                      <div style={{ marginBottom: services.length > 0 ? 20 : 0 }}>
                        <div style={{ 
                          fontWeight: 'bold', 
                          fontSize: '16px',
                          marginBottom: 12, 
                          paddingBottom: 10,
                          borderBottom: '2px solid #1890ff',
                          color: '#1890ff'
                        }}>
                          📦 商品 ({products.length})
                        </div>
                        {products.map((item: any, index: number) => (
                          <div
                            key={`product-${index}`}
                            style={{
                              padding: '12px 16px',
                              borderBottom: '1px solid #f0f0f0',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <div>
                              <Tag color="blue" style={{ fontSize: '13px' }}>商品</Tag>
                              <span style={{ marginLeft: 8, fontSize: '15px' }}>{item.name}</span>
                            </div>
                            <div>
                              <span style={{ marginRight: 20, color: '#888', fontSize: '14px' }}>
                                数量: {item.quantity}
                              </span>
                              <span style={{ color: '#1890ff', fontWeight: 'bold', fontSize: '15px' }}>
                                ¥{Number(item.price || 0).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 服务列表 */}
                    {services.length > 0 && (
                      <div>
                        <div style={{ 
                          fontWeight: 'bold', 
                          fontSize: '16px',
                          marginBottom: 12,
                          paddingBottom: 10,
                          borderBottom: '2px solid #52c41a',
                          color: '#52c41a'
                        }}>
                          🛠️ 服务 ({services.length})
                        </div>
                        {services.map((item: any, index: number) => (
                          <div
                            key={`service-${index}`}
                            style={{
                              padding: '12px 16px',
                              borderBottom: '1px solid #f0f0f0',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <div>
                              <Tag color="green" style={{ fontSize: '13px' }}>服务</Tag>
                              <span style={{ marginLeft: 8, fontSize: '15px' }}>{item.name}</span>
                            </div>
                            <div>
                              <span style={{ marginRight: 20, color: '#888', fontSize: '14px' }}>
                                数量: {item.quantity}
                              </span>
                              <span style={{ color: '#52c41a', fontWeight: 'bold', fontSize: '15px' }}>
                                ¥{Number(item.price || 0).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 如果既没有商品也没有服务 */}
                    {products.length === 0 && services.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                        暂无商品或服务数据
                      </div>
                    )}
                  </div>
                );
              })()}
            </Card>
          </>
        )}
      </Modal>
    </div>
  );
};

export default DiyPackageList;
