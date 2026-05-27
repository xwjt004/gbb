import React, { useState } from 'react';
import {
  Modal,
  Form,
  DatePicker,
  InputNumber,
  Switch,
  message,
  Row,
  Col,
  Card,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import { TimeSlot } from '@/types/timeSlot';
import { request } from '@/services/api';

const { Text } = Typography;

interface CopyTimeSlotModalProps {
  visible: boolean;
  timeSlot?: TimeSlot;
  onCancel: () => void;
  onSuccess: () => void;
}

const CopyTimeSlotModal: React.FC<CopyTimeSlotModalProps> = ({
  visible,
  timeSlot,
  onCancel,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!timeSlot) return;

    try {
      const values = await form.validateFields();
      setLoading(true);

      // 生成要复制的日期列表
      const dates: string[] = [];
      const startDate = values.startDate;
      const endDate = values.endDate || startDate;
      const excludeWeekends = values.excludeWeekends || false;

      let currentDate = dayjs(startDate);
      const lastDate = dayjs(endDate);

      while (currentDate.isBefore(lastDate) || currentDate.isSame(lastDate, 'day')) {
        // 如果排除周末，跳过周六(6)和周日(0)
        if (!excludeWeekends || (currentDate.day() !== 0 && currentDate.day() !== 6)) {
          dates.push(currentDate.format('YYYY-MM-DD'));
        }
        currentDate = currentDate.add(1, 'day');
      }

      // 批量创建时间槽 - 匹配后端API格式
      const batchData = {
        dates,
        timeRanges: [{
          startTime: new Date(timeSlot.startTime).toISOString().slice(11, 19), // HH:mm:ss格式
          endTime: new Date(timeSlot.endTime).toISOString().slice(11, 19), // HH:mm:ss格式
        }]
      };
      
      // 使用request直接调用批量创建API
      await request.post('/time-slots/batch', batchData);
      
      message.success(`成功复制到 ${dates.length} 个日期`);
      form.resetFields();
      onSuccess();
    } catch (error) {
      console.error('复制时间槽失败:', error);
      message.error('复制时间槽失败');
    } finally {
      setLoading(false);
    }
  };

  const disabledDate = (current: dayjs.Dayjs) => {
    // 不能选择过去的日期
    return current && current < dayjs().startOf('day');
  };

  return (
    <Modal
      title="复制时间槽"
      open={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      confirmLoading={loading}
      width={600}
      destroyOnHidden
      styles={{ body: { maxHeight: '65vh', overflowY: 'auto' } }}
    >
      {timeSlot && (
        <>
          <Card size="small" style={{ marginBottom: 16 }}>
            <Text strong>原时间槽信息：</Text>
            <br />
            <Text>日期：{dayjs(timeSlot.date).format('YYYY-MM-DD')}</Text>
            <br />
            <Text>
              时间：{new Date(timeSlot.startTime).toISOString().slice(11, 16)} - 
              {new Date(timeSlot.endTime).toISOString().slice(11, 16)}
            </Text>
            <br />
            <Text>容量：{timeSlot.capacity}人</Text>
            <br />
            <Text>状态：{timeSlot.status}</Text>
            {timeSlot.notes && (
              <>
                <br />
                <Text>备注：{timeSlot.notes}</Text>
              </>
            )}
          </Card>

          <Form
            form={form}
            layout="vertical"
            initialValues={{
              capacity: timeSlot.capacity,
              excludeWeekends: false,
            }}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="startDate"
                  label="开始日期"
                  rules={[{ required: true, message: '请选择开始日期' }]}
                >
                  <DatePicker
                    style={{ width: '100%' }}
                    disabledDate={disabledDate}
                    placeholder="选择开始日期"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="endDate"
                  label="结束日期（可选）"
                >
                  <DatePicker
                    style={{ width: '100%' }}
                    disabledDate={disabledDate}
                    placeholder="选择结束日期"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="capacity"
              label="容量"
              rules={[
                { required: true, message: '请输入容量' },
                { type: 'number', min: 1, max: 100, message: '容量必须在1-100之间' }
              ]}
            >
              <InputNumber
                min={1}
                max={100}
                style={{ width: '100%' }}
                placeholder="请输入容量"
              />
            </Form.Item>

            <Form.Item
              name="excludeWeekends"
              label="排除周末"
              valuePropName="checked"
            >
              <Switch checkedChildren="是" unCheckedChildren="否" />
            </Form.Item>
          </Form>
        </>
      )}
    </Modal>
  );
};

export default CopyTimeSlotModal;
