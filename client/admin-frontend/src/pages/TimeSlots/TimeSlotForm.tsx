import React, { useEffect, useState } from 'react';
import {
  Form,
  DatePicker,
  TimePicker,
  InputNumber,
  Switch,
  Input,
  message,
  Select,
  Button,
  Space,
} from 'antd';
import dayjs from 'dayjs';
import { TimeSlot } from '@/types/timeSlot';
import { timeSlotService } from '@/services/timeSlots';

const { TextArea } = Input;
const { Option } = Select;

interface TimeSlotFormProps {
  timeSlot?: TimeSlot;
  onCancel: () => void;
  onSubmit: () => void;
}

const TimeSlotForm: React.FC<TimeSlotFormProps> = ({
  timeSlot,
  onCancel,
  onSubmit,
}) => {
  console.log('TimeSlotForm 渲染，props:', { timeSlot, hasOnCancel: !!onCancel, hasOnSubmit: !!onSubmit });
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log('TimeSlotForm useEffect - timeSlot:', timeSlot);
    if (timeSlot) {
      // 处理时间格式
      const formatTimeForForm = (timeStr: string) => {
        if (!timeStr) return undefined;
        
        console.log('formatTimeForForm input:', timeStr);
        
        // 如果是 ISO 格式的完整日期时间字符串
        if (timeStr.includes('T')) {
          const date = new Date(timeStr);
          // 使用 UTC 时间 +8 转换为北京时间
          const hours = (date.getUTCHours() + 8) % 24;
          const minutes = date.getUTCMinutes();
          const result = dayjs().hour(hours).minute(minutes).second(0);
          console.log('ISO格式解析结果:', result.format('HH:mm'));
          return result;
        }
        
        // 如果是简单的时间格式如 "09:00:00" 或 "09:00"
        if (timeStr.includes(':')) {
          const timeParts = timeStr.split(':');
          if (timeParts.length >= 2) {
            const hour = timeParts[0].padStart(2, '0');
            const minute = timeParts[1].padStart(2, '0');
            // 使用当前日期加上时间来创建dayjs对象
            const timeString = `${hour}:${minute}`;
            const result = dayjs(timeString, 'HH:mm');
            console.log('时间格式解析结果:', timeString, '->', result.format('HH:mm'));
            return result;
          }
        }
        
        console.log('无法解析的时间格式:', timeStr);
        return undefined;
      };
      
      const formValues = {
        date: dayjs(timeSlot.date),
        startTime: formatTimeForForm(timeSlot.startTime),
        endTime: formatTimeForForm(timeSlot.endTime),
        capacity: timeSlot.capacity,
        status: timeSlot.status,
        isHoliday: timeSlot.isHoliday,
        priceMultiplier: timeSlot.priceMultiplier,
        notes: timeSlot.notes,
      };
      
      console.log('设置表单值:', formValues);
      form.setFieldsValue(formValues);
    } else {
      form.resetFields();
    }
  }, [timeSlot, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      console.log('表单验证后的值:', values);
      setLoading(true);

      const formData = {
        date: values.date.format('YYYY-MM-DD'),
        startTime: values.startTime ? values.startTime.format('HH:mm:ss') : '',
        endTime: values.endTime ? values.endTime.format('HH:mm:ss') : '',
        capacity: values.capacity || 1,
        status: values.status || 'AVAILABLE',
        isHoliday: values.isHoliday || false,
        priceMultiplier: values.priceMultiplier || 1,
        notes: values.notes || '',
      };

      console.log('准备提交的数据:', formData);

      if (timeSlot) {
        await timeSlotService.updateTimeSlot(timeSlot.id, formData);
        message.success('更新时间槽成功');
      } else {
        await timeSlotService.createTimeSlot(formData);
        message.success('创建时间槽成功');
      }

      onSubmit();
    } catch (error) {
      console.error('表单提交错误:', error);
      message.error(timeSlot ? '更新时间槽失败' : '创建时间槽失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          status: 'AVAILABLE',
          isHoliday: false,
          priceMultiplier: 1,
          capacity: 1,
        }}
        onFinish={handleSubmit}
      >
        <Form.Item
          name="date"
          label="日期"
          rules={[{ required: true, message: '请选择日期' }]}
        >
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item
          name="startTime"
          label="开始时间"
          rules={[{ required: true, message: '请选择开始时间' }]}
        >
          <TimePicker style={{ width: '100%' }} format="HH:mm" />
        </Form.Item>

        <Form.Item
          name="endTime"
          label="结束时间"
          rules={[{ required: true, message: '请选择结束时间' }]}
        >
          <TimePicker style={{ width: '100%' }} format="HH:mm" />
        </Form.Item>

        <Form.Item
          name="capacity"
          label="容量"
          rules={[{ required: true, message: '请输入容量' }]}
        >
          <InputNumber min={1} max={100} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item name="status" label="状态">
          <Select>
            <Option value="AVAILABLE">可用</Option>
            <Option value="UNAVAILABLE">不可用</Option>
            <Option value="BOOKED">已预订</Option>
          </Select>
        </Form.Item>

        <Form.Item name="priceMultiplier" label="价格倍数">
          <InputNumber min={0.1} max={10} step={0.1} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item name="isHoliday" label="节假日" valuePropName="checked">
          <Switch />
        </Form.Item>

        <Form.Item name="notes" label="备注">
          <TextArea rows={3} placeholder="请输入备注" />
        </Form.Item>

        <Form.Item style={{ marginTop: 24, textAlign: 'right' }}>
          <Space>
            <Button onClick={onCancel}>取消</Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              {timeSlot ? '更新' : '创建'}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </div>
  );
};

export default TimeSlotForm;
