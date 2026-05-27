import React, { useState } from 'react';
import {
  Modal,
  Form,
  DatePicker,
  TimePicker,
  InputNumber,
  Switch,
  Button,
  Space,
  List,
  message,
  Card,
} from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { request } from '@/services/api';

const { RangePicker } = DatePicker;

interface TimeSlotTemplate {
  startTime: string;
  endTime: string;
  capacity: number;
}

interface BatchCreateModalProps {
  visible: boolean;
  onCancel: () => void;
  onSubmit: () => void;
}

const BatchCreateModal: React.FC<BatchCreateModalProps> = ({
  visible,
  onCancel,
  onSubmit,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [timeSlots, setTimeSlots] = useState<TimeSlotTemplate[]>([
    { startTime: '09:00', endTime: '10:00', capacity: 1 },
  ]);

  const handleAddTimeSlot = () => {
    setTimeSlots([
      ...timeSlots,
      { startTime: '10:00', endTime: '11:00', capacity: 1 },
    ]);
  };

  const handleRemoveTimeSlot = (index: number) => {
    if (timeSlots.length > 1) {
      setTimeSlots(timeSlots.filter((_, i) => i !== index));
    }
  };

  const handleTimeSlotChange = (index: number, field: keyof TimeSlotTemplate, value: any) => {
    const newTimeSlots = [...timeSlots];
    newTimeSlots[index] = { ...newTimeSlots[index], [field]: value };
    setTimeSlots(newTimeSlots);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      // 生成日期列表
      const dates: string[] = [];
      const startDate = values.dateRange[0];
      const endDate = values.dateRange[1];
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

      // 准备批量创建数据，匹配后端API格式
      const batchData = {
        dates,
        timeRanges: timeSlots.map(slot => ({
          startTime: slot.startTime + ':00', // 转换为HH:mm:ss格式
          endTime: slot.endTime + ':00', // 转换为HH:mm:ss格式
          capacity: slot.capacity || 1,
        }))
      };

      // 调用批量创建API
      await request.post('/time-slots/batch', batchData);
      message.success(`批量创建 ${dates.length * timeSlots.length} 个时间槽成功`);
      onSubmit();
    } catch (error) {
      console.error('批量创建失败:', error);
      message.error('批量创建时间槽失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="批量创建时间槽"
      open={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      confirmLoading={loading}
      destroyOnHidden
      width={700}
      styles={{ body: { maxHeight: '65vh', overflowY: 'auto' } }}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          excludeWeekends: false,
        }}
      >
        <Form.Item
          name="dateRange"
          label="日期范围"
          rules={[{ required: true, message: '请选择日期范围' }]}
        >
          <RangePicker style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item name="excludeWeekends" label="排除周末" valuePropName="checked">
          <Switch />
        </Form.Item>

        <Card title="时间段设置" size="small" style={{ maxHeight: '400px', overflow: 'auto' }}>
          <List
            dataSource={timeSlots}
            renderItem={(item, index) => (
              <List.Item
                actions={[
                  <Button
                    type="link"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleRemoveTimeSlot(index)}
                    disabled={timeSlots.length === 1}
                  />,
                ]}
              >
                <Space>
                  <TimePicker
                    value={dayjs(item.startTime, 'HH:mm')}
                    format="HH:mm"
                    onChange={(time) =>
                      handleTimeSlotChange(index, 'startTime', time?.format('HH:mm'))
                    }
                  />
                  <span>至</span>
                  <TimePicker
                    value={dayjs(item.endTime, 'HH:mm')}
                    format="HH:mm"
                    onChange={(time) =>
                      handleTimeSlotChange(index, 'endTime', time?.format('HH:mm'))
                    }
                  />
                  <span>容量:</span>
                  <InputNumber
                    value={item.capacity}
                    min={1}
                    max={100}
                    onChange={(value) =>
                      handleTimeSlotChange(index, 'capacity', value || 1)
                    }
                  />
                </Space>
              </List.Item>
            )}
          />
          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={handleAddTimeSlot}
            block
            style={{ marginTop: 16 }}
          >
            添加时间段
          </Button>
        </Card>
      </Form>
    </Modal>
  );
};

export default BatchCreateModal;
