import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Table, Tag, Button, Space, Modal, Form, Select, Input, InputNumber, DatePicker, message, Spin, Divider, Image, Tabs } from 'antd';
import { ArrowLeftOutlined, EditOutlined } from '@ant-design/icons';
import { WxUser } from '@/types/wxUser';
import { wxUserService } from '@/services/wxUser';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const memberLevelColor: Record<string, string> = {
  VIP: 'gold', GOLD: 'orange', SILVER: 'geekblue', REGULAR: 'default', NEW: 'cyan',
};

const churnStatusMap: Record<string, { text: string; color: string }> = {
  ACTIVE: { text: '活跃', color: 'green' },
  AT_RISK: { text: '有流失风险', color: 'orange' },
  CHURNED: { text: '已流失', color: 'red' },
};

const statusMap: Record<string, { text: string; color: string }> = {
  ACTIVE: { text: '正常', color: 'green' },
  INACTIVE: { text: '未激活', color: 'default' },
  BANNED: { text: '禁用', color: 'red' },
};

const zodiacOptions = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
const constellationOptions = ['白羊座', '金牛座', '双子座', '巨蟹座', '狮子座', '处女座', '天秤座', '天蝎座', '射手座', '摩羯座', '水瓶座', '双鱼座'];

const WxUserDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<WxUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editForm] = Form.useForm();

  const fetchDetail = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await wxUserService.getById(id);
      setUser(data);
    } catch {
      message.error('获取客户详情失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDetail(); }, [id]);

  const handleEdit = async () => {
    try {
      const values = await editForm.validateFields();
      const payload: any = { ...values };
      // 日期字段转换
      if (values.birthday) payload.birthday = values.birthday.toISOString();
      if (values.hundredDaysDate) payload.hundredDaysDate = values.hundredDaysDate.toISOString();
      if (values.firstBirthdayDate) payload.firstBirthdayDate = values.firstBirthdayDate.toISOString();
      // 数字字段
      if (values.height !== undefined && values.height !== null) payload.height = Number(values.height);
      if (values.weight !== undefined && values.weight !== null) payload.weight = Number(values.weight);

      await wxUserService.update(id!, payload);
      message.success('更新成功');
      setEditModalVisible(false);
      fetchDetail();
    } catch {
      // validation failed
    }
  };

  const openEditModal = () => {
    if (user) {
      editForm.setFieldsValue({
        ...user,
        birthday: user.birthday ? dayjs(user.birthday) : null,
        hundredDaysDate: user.hundredDaysDate ? dayjs(user.hundredDaysDate) : null,
        firstBirthdayDate: user.firstBirthdayDate ? dayjs(user.firstBirthdayDate) : null,
      });
      setEditModalVisible(true);
    }
  };

  const orderColumns: ColumnsType<any> = [
    { title: '订单号', dataIndex: 'orderNo', width: 180 },
    { title: '套餐', dataIndex: ['package', 'name'], width: 140 },
    {
      title: '预约时间', width: 160,
      render: (_, r) => {
        if (!r.timeSlot) return '-';
        return `${r.timeSlot.date?.slice(0, 10) || ''} ${r.timeSlot.startTime?.slice(11, 16) || ''}-${r.timeSlot.endTime?.slice(11, 16) || ''}`;
      },
    },
    { title: '金额', dataIndex: 'totalAmount', width: 100, render: (v: number) => `¥${Number(v || 0).toFixed(2)}` },
    { title: '状态', dataIndex: 'orderStatus', width: 100 },
    { title: '创建时间', dataIndex: 'createdAt', width: 160, render: (v: string) => v ? new Date(v).toLocaleString('zh-CN') : '-' },
  ];

  if (loading) return <Spin style={{ display: 'block', margin: '80px auto' }} />;
  if (!user) return <div style={{ padding: 24 }}>客户不存在</div>;

  return (
    <div style={{ padding: 24 }}>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/wx-users')} style={{ marginBottom: 16 }}>
        返回客户列表
      </Button>

      <Tabs
        defaultActiveKey="basic"
        tabBarExtraContent={
          <Button type="primary" icon={<EditOutlined />} onClick={openEditModal}>编辑资料</Button>
        }
        items={[
          {
            key: 'basic',
            label: '基本信息',
            children: (
              <>
                <Card style={{ marginBottom: 16 }}>
                  <Descriptions column={2} title="账户信息">
                    <Descriptions.Item label="昵称">{user.nickname || '-'}</Descriptions.Item>
                    <Descriptions.Item label="OpenID">{user.openid}</Descriptions.Item>
                    <Descriptions.Item label="真实姓名">{user.realName || '-'}</Descriptions.Item>
                    <Descriptions.Item label="性别">
                      {user.gender === 1 ? '男' : user.gender === 2 ? '女' : '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="状态">
                      <Tag color={statusMap[user.status]?.color}>{statusMap[user.status]?.text || user.status}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="注册时间">{user.createdAt ? new Date(user.createdAt).toLocaleString('zh-CN') : '-'}</Descriptions.Item>
                  </Descriptions>
                </Card>

                <Card style={{ marginBottom: 16 }}>
                  <Descriptions column={2} title="联系方式">
                    <Descriptions.Item label="手机号">{user.phone || '-'}</Descriptions.Item>
                    <Descriptions.Item label="家庭住址">{user.address || '-'}</Descriptions.Item>
                  </Descriptions>
                </Card>

                <Card style={{ marginBottom: 16 }}>
                  <Descriptions column={2} title="宝宝信息">
                    <Descriptions.Item label="出生日期">{user.birthday ? new Date(user.birthday).toLocaleDateString('zh-CN') : '-'}</Descriptions.Item>
                    <Descriptions.Item label="身高">{user.height ? `${user.height} cm` : '-'}</Descriptions.Item>
                    <Descriptions.Item label="体重">{user.weight ? `${user.weight} kg` : '-'}</Descriptions.Item>
                    <Descriptions.Item label="生肖">{user.zodiac || '-'}</Descriptions.Item>
                    <Descriptions.Item label="星座">{user.constellation || '-'}</Descriptions.Item>
                    <Descriptions.Item label="学校名称">{user.schoolName || '-'}</Descriptions.Item>
                    <Descriptions.Item label="宝宝特长">{user.talent || '-'}</Descriptions.Item>
                  </Descriptions>
                </Card>

                <Card style={{ marginBottom: 16 }}>
                  <Descriptions column={2} title="重要日期">
                    <Descriptions.Item label="百天日期">{user.hundredDaysDate ? new Date(user.hundredDaysDate).toLocaleDateString('zh-CN') : '-'}</Descriptions.Item>
                    <Descriptions.Item label="周岁日期">{user.firstBirthdayDate ? new Date(user.firstBirthdayDate).toLocaleDateString('zh-CN') : '-'}</Descriptions.Item>
                  </Descriptions>
                </Card>

                <Card style={{ marginBottom: 16 }}>
                  <Descriptions column={2} title="成长记录">
                    <Descriptions.Item label="抓周礼物">{user.graspGift || '-'}</Descriptions.Item>
                    <Descriptions.Item label="手脚印图">
                      {user.handFootPrint ? <Image width={80} src={user.handFootPrint} /> : '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="钱包照">
                      {user.walletPhoto ? <Image width={80} src={user.walletPhoto} /> : '-'}
                    </Descriptions.Item>
                  </Descriptions>
                </Card>
              </>
            ),
          },
          {
            key: 'member',
            label: '会员信息',
            children: (
              <Card>
                <Descriptions column={3}>
                  <Descriptions.Item label="会员等级">
                    <Tag color={memberLevelColor[user.memberLevel]}>{user.memberLevel}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="活跃状态">
                    <Tag color={churnStatusMap[user.churnStatus]?.color}>{churnStatusMap[user.churnStatus]?.text || user.churnStatus}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="成长值">{user.growthPoints}</Descriptions.Item>
                  <Descriptions.Item label="总订单数">{user.totalOrders}</Descriptions.Item>
                  <Descriptions.Item label="总消费">¥{Number(user.totalAmount || 0).toFixed(2)}</Descriptions.Item>
                  <Descriptions.Item label="最后下单">
                    {user.lastOrderAt ? new Date(user.lastOrderAt).toLocaleString('zh-CN') : '-'}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            ),
          },
          {
            key: 'orders',
            label: `最近订单 (${user._count?.orders || user.totalOrders || 0})`,
            children: (
              <Card>
                <Table
                  columns={orderColumns}
                  dataSource={user.orders || []}
                  rowKey="id"
                  pagination={false}
                  scroll={{ x: 800 }}
                />
              </Card>
            ),
          },
        ]}
      />

      <Modal
        title="编辑客户资料"
        open={editModalVisible}
        onOk={handleEdit}
        onCancel={() => setEditModalVisible(false)}
        width={720}
      >
        <Form form={editForm} layout="vertical" style={{ maxHeight: 500, overflow: 'auto' }}>
          <Divider orientation="left" plain>基本信息</Divider>
          <Form.Item name="realName" label="真实姓名">
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="手机号">
            <Input />
          </Form.Item>
          <Form.Item name="address" label="家庭住址">
            <Input />
          </Form.Item>

          <Divider orientation="left" plain>宝宝信息</Divider>
          <Space style={{ width: '100%' }} size="middle">
            <Form.Item name="height" label="身高(cm)">
              <InputNumber min={0} max={200} step={0.1} />
            </Form.Item>
            <Form.Item name="weight" label="体重(kg)">
              <InputNumber min={0} max={100} step={0.1} />
            </Form.Item>
          </Space>
          <Space style={{ width: '100%' }} size="middle">
            <Form.Item name="zodiac" label="生肖">
              <Select style={{ width: 130 }}>
                {zodiacOptions.map(z => <Select.Option key={z} value={z}>{z}</Select.Option>)}
              </Select>
            </Form.Item>
            <Form.Item name="constellation" label="星座">
              <Select style={{ width: 130 }}>
                {constellationOptions.map(c => <Select.Option key={c} value={c}>{c}</Select.Option>)}
              </Select>
            </Form.Item>
          </Space>
          <Form.Item name="schoolName" label="学校名称">
            <Input />
          </Form.Item>
          <Form.Item name="talent" label="宝宝特长">
            <Input />
          </Form.Item>

          <Divider orientation="left" plain>重要日期</Divider>
          <Space style={{ width: '100%' }} size="middle">
            <Form.Item name="birthday" label="出生日期">
              <DatePicker />
            </Form.Item>
            <Form.Item name="hundredDaysDate" label="百天日期">
              <DatePicker />
            </Form.Item>
            <Form.Item name="firstBirthdayDate" label="周岁日期">
              <DatePicker />
            </Form.Item>
          </Space>

          <Divider orientation="left" plain>成长记录</Divider>
          <Form.Item name="graspGift" label="抓周礼物">
            <Input />
          </Form.Item>
          <Form.Item name="handFootPrint" label="手脚印图(图片URL)">
            <Input placeholder="https://..." />
          </Form.Item>
          <Form.Item name="walletPhoto" label="钱包照(图片URL)">
            <Input placeholder="https://..." />
          </Form.Item>

          <Divider orientation="left" plain>会员设置</Divider>
          <Space style={{ width: '100%' }} size="middle">
            <Form.Item name="memberLevel" label="会员等级" rules={[{ required: true }]}>
              <Select style={{ width: 130 }}>
                <Select.Option value="VIP">VIP</Select.Option>
                <Select.Option value="GOLD">GOLD</Select.Option>
                <Select.Option value="SILVER">SILVER</Select.Option>
                <Select.Option value="REGULAR">REGULAR</Select.Option>
                <Select.Option value="NEW">NEW</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="status" label="状态" rules={[{ required: true }]}>
              <Select style={{ width: 120 }}>
                <Select.Option value="ACTIVE">正常</Select.Option>
                <Select.Option value="INACTIVE">未激活</Select.Option>
                <Select.Option value="BANNED">禁用</Select.Option>
              </Select>
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </div>
  );
};

export default WxUserDetail;
