import React, { useEffect, useState, useCallback } from "react";
import {
  Modal,
  Form,
  Select,
  Input,
  DatePicker,
  InputNumber,
  message,
  Row,
  Col,
  Card,
  Descriptions,
  Image,
  Button,
} from "antd";
import { Order } from "@/types/order";
import { User } from "@/types/user";
import { Package } from "@/types/package";
import { TimeSlot } from "@/types/timeSlot";
import { Status } from "@/types/common";
import { userService } from "@/services/users";
import { packageService } from "@/services/packages";
import { timeSlotService } from "@/services/timeSlots";
import { orderService } from "@/services/orders";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

// 扩展dayjs以支持UTC
dayjs.extend(utc);

const { Option } = Select;
const { TextArea } = Input;

interface OrderFormProps {
  visible?: boolean;
  order?: Order;
  onCancel: () => void;
  onSubmit: () => void;
  mode?: 'modal' | 'page';
}

const OrderForm: React.FC<OrderFormProps> = ({
  visible = false,
  order,
  onCancel,
  onSubmit,
  mode = 'modal',
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [loadingTimeSlots, setLoadingTimeSlots] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);

  useEffect(() => {
    // 在 modal 模式依赖 visible；在 page 模式始终加载
    if (visible || mode === 'page') {
      loadInitialData().then(() => {
        // 数据加载完成后再设置表单值
        if (order) {
          const packageItem = packages.find(p => p.id.toString() === order.package?.id?.toString());
          setSelectedPackage(packageItem || null);
          
          form.setFieldsValue({
            userId: order.user?.id?.toString(),
            packageId: order.package?.id?.toString(),
            timeSlotId: order.timeSlot?.id?.toString(),
            totalAmount: order.totalAmount,
            customerPhone: order.customerPhone || order.user?.phone,
            customerName: order.customerName || order.user?.nickname,
            notes: order.notes,
            bookingDate: order.timeSlot?.date ? dayjs(order.timeSlot.date) : undefined,
          });
        } else {
          form.resetFields();
          setSelectedPackage(null);
        }
      });
    }
  }, [visible, order, mode]); // 移除 packages 和 form 依赖，避免循环更新

  const loadInitialData = async () => {
    try {
      setLoadingPackages(true);
      
      // 加载用户列表
      const usersRes = await userService.getUsers({ page: 1, pageSize: 100 });
      setUsers(usersRes.data.list);

      // 加载套餐列表 - 只获取激活状态的套餐
      const packagesRes = await packageService.getPackages({ 
        page: 1, 
        limit: 100,
        status: Status.ACTIVE 
      });
      setPackages(packagesRes.list);
    } catch (error) {
      message.error("加载数据失败");
    } finally {
      setLoadingPackages(false);
    }
  };

  const loadTimeSlots = useCallback(async (date: string) => {
    try {
      setLoadingTimeSlots(true);
      console.log('开始加载时间槽，日期:', date);
      
      // 获取指定日期的可用时间槽
      const availableSlots = await timeSlotService.getAvailableSlots({ date });
      console.log('获取到的可用时间槽:', availableSlots);
      
      setTimeSlots(availableSlots || []);
      
      if (!availableSlots || availableSlots.length === 0) {
        message.info(`${date} 当天暂无可用时间槽`);
      }
    } catch (error) {
      console.error("加载时间槽失败:", error);
      message.error("加载时间槽失败，请检查网络连接或联系管理员");
      setTimeSlots([]);
    } finally {
      setLoadingTimeSlots(false);
    }
  }, []);

  const handleDateChange = useCallback((date: dayjs.Dayjs | null) => {
    console.log('日期变化:', date?.format('YYYY-MM-DD'));
    if (date) {
      const dateStr = date.format("YYYY-MM-DD");
      console.log('加载时间槽，日期:', dateStr);
      loadTimeSlots(dateStr);
      form.setFieldValue("timeSlotId", undefined);
    } else {
      console.log('日期清空，清空时间槽');
      setTimeSlots([]);
      form.setFieldValue("timeSlotId", undefined);
    }
  }, [form, loadTimeSlots]);

  const handlePackageChange = useCallback((packageId: string) => {
    const packageItem = packages.find(p => p.id.toString() === packageId);
    
    setSelectedPackage(packageItem || null);
    
    // 自动设置总金额和定金
    if (packageItem) {
      form.setFieldValue('totalAmount', packageItem.price);
      
      // 计算定金（优先使用套餐设置的定金，否则使用30%）
      const defaultDeposit = packageItem.price * 0.3;
      const depositAmount = packageItem.deposit || defaultDeposit;
      form.setFieldValue('depositAmount', Math.round(depositAmount * 100) / 100); // 保留2位小数
      
      // 如果有套餐描述中的儿童数量信息，可以设置默认值
      if (packageItem.description && packageItem.description.includes('儿童')) {
        // 简单的正则匹配儿童数量（这里可以根据实际描述格式调整）
        const childrenMatch = packageItem.description.match(/(\d+).*?儿童|儿童.*?(\d+)/);
        if (childrenMatch) {
          const childrenCount = parseInt(childrenMatch[1] || childrenMatch[2]);
          form.setFieldValue('childrenCount', childrenCount);
        }
      }
    } else {
      // 清空相关字段
      form.setFieldValue('totalAmount', undefined);
      form.setFieldValue('depositAmount', undefined);
    }
    
    // 套餐选择不影响时间槽，保持用户的选择
  }, [packages, form]);

  const handleTotalAmountChange = (value: number | null) => {
    if (value && selectedPackage) {
      // 当总金额改变时，按30%重新计算定金
      const depositAmount = value * 0.3;
      form.setFieldValue('depositAmount', Math.round(depositAmount * 100) / 100);
    }
  };

  const handleSubmit = async () => {
    try {
      console.log('开始提交订单...');
      const values = await form.validateFields();
      console.log('表单验证通过，表单数据:', values);
      setLoading(true);

      // 获取选中用户的 openid (这里暂时使用 phone 作为标识)
      const selectedUser = users.find(u => u.id.toString() === values.userId?.toString());
      console.log('选中的用户:', selectedUser);
      if (!selectedUser) {
        message.error("请选择有效的用户");
        return;
      }

      const formData: any = {
        userOpenid: selectedUser.openid || selectedUser.id, // 优先使用openid，否则使用id
        packageId: parseInt(values.packageId),
        timeSlotId: values.timeSlotId ? parseInt(values.timeSlotId) : undefined,
        appointmentDate: values.bookingDate ? values.bookingDate.format('YYYY-MM-DD') : undefined,
        totalAmount: values.totalAmount,
        depositAmount: values.depositAmount,
        customerName: values.customerName,
        customerPhone: values.customerPhone,
        childrenCount: values.childrenCount,
        notes: values.notes,
        paymentType: 'DEPOSIT', // 默认定金支付
      };

      console.log('准备发送的订单数据:', formData);

      if (order) {
        console.log('更新现有订单:', order.id);
        const { userOpenid, paymentType, ...updateData } = formData;
        await orderService.updateOrder(order.id, updateData);
        message.success("更新订单成功");
      } else {
        console.log('创建新订单');
        const result = await orderService.createOrder(formData);
        console.log('订单创建响应:', result);
        message.success("创建订单成功");
      }

      onSubmit();
    } catch (error) {
      console.error("订单操作失败:", error);
      console.error("错误详情:", error instanceof Error ? error.message : error);
      if (error instanceof Error && error.message) {
        message.error(`订单操作失败: ${error.message}`);
      } else {
        message.error(order ? "更新订单失败" : "创建订单失败");
      }
    } finally {
      setLoading(false);
    }
  };
  // form 内容片段（可在 modal 或 page 模式复用）
  const formContent = (
    <Form form={form} layout="vertical">
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="userId"
            label="用户"
            rules={[{ required: true, message: '请选择用户' }]}
          >
            <Select placeholder="请选择用户" showSearch optionFilterProp="children">
              {users.map(u => (
                <Option key={u.id} value={u.id?.toString()}>{u.nickname || u.phone || u.id}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="packageId"
            label="套餐"
            rules={[{ required: true, message: '请选择套餐' }]}
          >
            <Select
              placeholder="请选择套餐"
              onChange={handlePackageChange}
              loading={loadingPackages}
              optionFilterProp="children"
            >
              {packages.map(p => (
                <Option key={p.id} value={p.id?.toString()}>{p.name}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="bookingDate" label="预约日期">
            <DatePicker 
              onChange={handleDateChange}
              disabledDate={current => current && current < dayjs().startOf('day')}
            />
          </Form.Item>

          <Form.Item name="timeSlotId" label="时间槽">
            <Select placeholder="请选择时间槽" loading={loadingTimeSlots}>
              {timeSlots
                .filter(ts => {
                  // 只显示当前时间之后的时间槽
                  const now = dayjs();
                  const today = now.format('YYYY-MM-DD');
                  const slotDate = dayjs(ts.date).format('YYYY-MM-DD');
                  
                  // 如果选择的是未来日期，显示所有时间槽
                  if (slotDate > today) {
                    return true;
                  }
                  
                  // 如果选择的是今天，只显示当前时间之后的时间槽
                  if (slotDate === today) {
                    try {
                      // 解析时间槽的开始时间
                      const startTimeStr = dayjs.utc(ts.startTime).local().format('HH:mm');
                      const [hours, minutes] = startTimeStr.split(':').map(Number);
                      
                      // 构建今天的时间槽开始时间
                      const slotStart = now.clone().hour(hours).minute(minutes).second(0);
                      
                      // 只显示开始时间晚于当前时间的时间槽
                      return slotStart.isAfter(now);
                    } catch (error) {
                      console.error('解析时间槽时间失败:', error);
                      return false;
                    }
                  }
                  
                  // 过去的日期不显示
                  return false;
                })
                .map(ts => {
                  const formatTime = (timeStr: string) => {
                    if (!timeStr) return '';
                    try {
                      return dayjs.utc(timeStr).local().format('HH:mm');
                    } catch {
                      return timeStr;
                    }
                  };
                  const displayText = `${formatTime(ts.startTime)} - ${formatTime(ts.endTime)}`;
                  return (
                    <Option key={ts.id} value={ts.id?.toString()}>
                      {displayText}
                    </Option>
                  );
                })}
            </Select>
          </Form.Item>
        </Col>

        <Col span={12}>
          {selectedPackage && (
            <Card title={selectedPackage.name} variant="borderless">
              {selectedPackage.images && selectedPackage.images.length > 0 && (
                <Image src={selectedPackage.images[0]} width={120} />
              )}
              <Descriptions column={1} size="small">
                <Descriptions.Item label="价格">{selectedPackage.price}</Descriptions.Item>
                <Descriptions.Item label="定金">{selectedPackage.deposit}</Descriptions.Item>
                <Descriptions.Item label="描述">{selectedPackage.description}</Descriptions.Item>
              </Descriptions>
            </Card>
          )}

          <Form.Item name="totalAmount" label="总金额">
            <InputNumber style={{ width: '100%' }} onChange={handleTotalAmountChange} />
          </Form.Item>

          <Form.Item name="depositAmount" label="定金">
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="customerName" label="客户姓名">
            <Input />
          </Form.Item>

          <Form.Item name="customerPhone" label="联系电话">
            <Input />
          </Form.Item>

          <Form.Item name="childrenCount" label="儿童数量">
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="notes" label="备注">
            <TextArea rows={3} />
          </Form.Item>
        </Col>
      </Row>
    </Form>
  );

  // 根据 mode 返回不同的渲染
  if (mode === 'page') {
    return (
      <div>
        <div style={{ marginBottom: 16 }}>
          <h2>{order ? '编辑订单' : '新增订单'}</h2>
        </div>
        <div>{formContent}</div>
        <div style={{ marginTop: 16, textAlign: 'right' }}>
          <Button style={{ marginRight: 8 }} onClick={onCancel}>取消</Button>
          <Button type="primary" loading={loading} onClick={handleSubmit}>保存</Button>
        </div>
      </div>
    );
  }

  return (
    <Modal
      title={order ? "编辑订单" : "新增订单"}
      open={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      confirmLoading={loading}
      destroyOnHidden
      width={800}
      styles={{ body: { maxHeight: '65vh', overflowY: 'auto' } }}
    >
      {formContent}
    </Modal>
  );
};

export default OrderForm;
