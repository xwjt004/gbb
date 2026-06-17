import React, { useEffect, useState } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  Switch,
  InputNumber,
  message,
  Alert,
} from 'antd';
import { User } from '@/types/user';
import { userService } from '@/services/users';
import { Status } from '@/types/common';
import { simple } from '@/services/api';

const { Option } = Select;

interface UserFormProps {
  visible: boolean;
  user?: User;
  onCancel: () => void;
  onSubmit: () => void;
}

interface Role {
  id: number;
  name: string;
}

const UserForm: React.FC<UserFormProps> = ({
  visible,
  user,
  onCancel,
  onSubmit,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);

  useEffect(() => {
    if (visible) {
      if (user) {
        form.setFieldsValue({
          openid: user.openid,
          phone: user.phone,
          nickname: user.nickname,
          wechatId: user.wechatId,
          status: user.status,
          isVip: user.isVip,
          vipLevel: user.vipLevel,
          tags: user.tags,
          roleId: (user as any).roleId,
        });
      } else {
        form.resetFields();
      }
      // 加载角色列表
      simple.get<any>('/roles').then((res: any) => {
        const data = res.data || res;
        setRoles(Array.isArray(data) ? data : []);
      }).catch(() => {});
    }
  }, [visible, user, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      // 状态映射：前端小写转后端大写
      const statusMapping = {
        'active': 'ACTIVE',
        'inactive': 'INACTIVE',
        'pending': 'PENDING',
        'deleted': 'DELETED'
      };

      // 创建API调用的数据格式，只包含后端支持的字段
      const apiData: any = {
        openid: values.openid,
        phone: values.phone,
        nickname: values.nickname,
        avatar: values.avatar,
      };

      // 只有当status有值时才添加到apiData中
      if (values.status) {
        apiData.status = statusMapping[values.status as keyof typeof statusMapping];
      }

      // 角色分配
      if (values.roleId) {
        apiData.roleId = values.roleId;
      }

      console.log('更新用户:', { id: user?.id, data: apiData });

      if (user) {
        await userService.updateUser(user.id, apiData);
        message.success('更新用户成功');
      } else {
        await userService.createUser(apiData);
        message.success('创建用户成功');
      }

      onSubmit();
    } catch (error) {
      console.error('User operation error:', error);
      message.error(user ? '更新用户失败' : '创建用户失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={user ? '编辑用户' : '新增用户'}
      open={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      confirmLoading={loading}
      destroyOnHidden
      width={600}
      styles={{ body: { maxHeight: '65vh', overflowY: 'auto' } }}
    >
      <Alert
        message="功能说明"
        description="微信号、VIP状态、VIP等级和用户标签功能暂未开放，无法编辑。VIP状态基于用户订单数量自动判断（≥3个订单为VIP）。"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />
      
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          status: Status.ACTIVE,
          isVip: false,
          vipLevel: 1,
        }}
      >
        <Form.Item name="openid" label="员工ID">
          <Input placeholder="可选，留空则自动生成" />
        </Form.Item>

        <Form.Item
          name="phone"
          label="手机号"
          rules={[
            { required: true, message: '请输入手机号' },
            { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号' },
          ]}
        >
          <Input placeholder="请输入手机号" />
        </Form.Item>

        <Form.Item name="nickname" label="昵称">
          <Input placeholder="请输入昵称" />
        </Form.Item>

        <Form.Item name="wechatId" label="微信号">
          <Input placeholder="请输入微信号" disabled />
        </Form.Item>

        <Form.Item name="status" label="状态">
          <Select>
            <Option value={Status.ACTIVE}>正常</Option>
            <Option value={Status.INACTIVE}>禁用</Option>
          </Select>
        </Form.Item>

        <Form.Item name="roleId" label="管理角色">
          <Select placeholder="选择管理角色（仅管理员用户）" allowClear>
            {roles.map(r => (
              <Option key={r.id} value={r.id}>{r.name}</Option>
            ))}
          </Select>
        </Form.Item>

        {/* VIP相关字段 - 暂时禁用，因为后端不支持 */}
        <Form.Item name="isVip" label="VIP用户" valuePropName="checked">
          <Switch disabled />
        </Form.Item>

        <Form.Item
          name="vipLevel"
          label="VIP等级"
          dependencies={['isVip']}
          style={{
            display: Form.useWatch('isVip', form) ? 'block' : 'none',
          }}
        >
          <InputNumber min={1} max={10} disabled />
        </Form.Item>

        <Form.Item name="tags" label="用户标签">
          <Select
            mode="tags"
            placeholder="用户标签功能暂未开放"
            style={{ width: '100%' }}
            disabled
          >
            <Option value="新用户">新用户</Option>
            <Option value="活跃用户">活跃用户</Option>
            <Option value="高价值">高价值</Option>
            <Option value="流失风险">流失风险</Option>
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default UserForm;