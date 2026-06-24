import React, { useEffect, useState } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  message,
  Divider,
  Typography,
} from 'antd';
import { User } from '@/types/user';
import { userService } from '@/services/users';
import { Status } from '@/types/common';
import { simple } from '@/services/api';
import dayjs from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;
const { Text } = Typography;

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
        // 编辑模式：回填数据
        const roleIds = user.roleIds || [];
        form.setFieldsValue({
          username: user.username,
          nickname: user.nickname,
          phone: user.phone,
          realName: user.realName,
          gender: user.gender,
          birthDate: user.birthDate ? dayjs(user.birthDate) : undefined,
          education: user.education,
          address: user.address,
          skills: user.skills,
          workHistory: user.workHistory,
          wechatOfficialId: user.wechatOfficialId,
          remarks: user.remarks,
          status: user.status,
          roleIds,
        });
      } else {
        form.resetFields();
        form.setFieldsValue({
          status: Status.ACTIVE,
        });
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

      const statusMapping: Record<string, string> = {
        'active': 'ACTIVE',
        'inactive': 'INACTIVE',
        'pending': 'PENDING',
        'deleted': 'DELETED'
      };

      const apiData: any = {
        username: values.username,
        nickname: values.nickname,
        phone: values.phone,
        realName: values.realName,
        gender: values.gender,
        birthDate: values.birthDate ? values.birthDate.format('YYYY-MM-DD') : undefined,
        education: values.education,
        address: values.address,
        skills: values.skills,
        workHistory: values.workHistory,
        wechatOfficialId: values.wechatOfficialId,
        remarks: values.remarks,
        roleIds: values.roleIds && values.roleIds.length > 0 ? values.roleIds : undefined,
      };

      // 只有在创建或填写了密码时才传
      if (values.password) {
        apiData.password = values.password;
      }

      if (values.status) {
        apiData.status = statusMapping[values.status as keyof typeof statusMapping];
      }

      if (user) {
        await userService.updateUser(user.id, apiData);
        message.success('更新员工成功');
      } else {
        await userService.createUser(apiData);
        message.success('创建员工成功');
      }

      onSubmit();
    } catch (error) {
      console.error('User operation error:', error);
      message.error(user ? '更新员工失败' : '创建员工失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={user ? '编辑员工' : '新增员工'}
      open={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      confirmLoading={loading}
      destroyOnHidden
      width={640}
      styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ status: Status.ACTIVE }}
      >
        {/* ===== 登录信息 ===== */}
        <Divider orientation="left" plain>
          <Text type="secondary">登录信息</Text>
        </Divider>

        <Form.Item
          name="username"
          label="用户名"
          rules={[
            { required: true, message: '请输入用户名' },
            { min: 3, message: '用户名至少3个字符' },
            { pattern: /^[a-zA-Z0-9_-]+$/, message: '用户名只能包含字母、数字、下划线和连字符' },
          ]}
        >
          <Input placeholder="登录用户名" disabled={!!user} />
        </Form.Item>

        {!user && (
          <Form.Item
            name="password"
            label="密码"
            rules={[
              { required: true, message: '请设置密码' },
              { min: 6, message: '密码长度不能少于6位' },
            ]}
          >
            <Input.Password placeholder="登录密码" />
          </Form.Item>
        )}

        {/* ===== 基础信息 ===== */}
        <Divider orientation="left" plain>
          <Text type="secondary">基础信息</Text>
        </Divider>

        <Form.Item name="realName" label="真实姓名">
          <Input placeholder="请输入真实姓名" />
        </Form.Item>

        <Form.Item name="gender" label="性别">
          <Select placeholder="请选择性别" allowClear>
            <Option value="MALE">男</Option>
            <Option value="FEMALE">女</Option>
          </Select>
        </Form.Item>

        <Form.Item name="birthDate" label="出生日期">
          <DatePicker style={{ width: '100%' }} placeholder="请选择出生日期" />
        </Form.Item>

        <Form.Item name="education" label="学历">
          <Select placeholder="请选择学历" allowClear>
            <Option value="高中">高中</Option>
            <Option value="大专">大专</Option>
            <Option value="本科">本科</Option>
            <Option value="硕士">硕士</Option>
            <Option value="博士">博士</Option>
          </Select>
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
          <Input placeholder="请输入昵称（选填）" />
        </Form.Item>

        {/* ===== 档案信息 ===== */}
        <Divider orientation="left" plain>
          <Text type="secondary">档案信息</Text>
        </Divider>

        <Form.Item name="address" label="家庭住址">
          <TextArea rows={2} placeholder="请输入家庭住址" />
        </Form.Item>

        <Form.Item name="skills" label="技能特长">
          <TextArea rows={3} placeholder="请输入技能特长，如：摄影、修图、客服等" />
        </Form.Item>

        <Form.Item name="workHistory" label="工作履历">
          <TextArea rows={4} placeholder="请输入工作履历" />
        </Form.Item>

        <Form.Item name="remarks" label="备注">
          <TextArea rows={2} placeholder="备注信息" />
        </Form.Item>

        <Form.Item name="wechatOfficialId" label="公众号 OpenID">
          <Input placeholder="微信公众号 OpenID（选填）" />
        </Form.Item>

        {/* ===== 系统设置 ===== */}
        <Divider orientation="left" plain>
          <Text type="secondary">系统设置</Text>
        </Divider>

        <Form.Item name="roleIds" label="管理角色">
          <Select
            mode="multiple"
            placeholder="选择管理角色（可多选）"
            allowClear
          >
            {roles.map(r => (
              <Option key={r.id} value={r.id}>{r.name}</Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item name="status" label="状态">
          <Select>
            <Option value={Status.ACTIVE}>正常</Option>
            <Option value={Status.INACTIVE}>禁用</Option>
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default UserForm;
