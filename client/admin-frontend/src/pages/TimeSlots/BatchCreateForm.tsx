import React, { useState } from 'react';
import {
  Form,
  DatePicker,
  TimePicker,
  InputNumber,
  Switch,
  Input,
  Button,
  Row,
  Col,
  Card,
  message,
  Divider,
  Space,
} from 'antd';
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { timeSlotService } from '@/services/timeSlots';
import type { Dayjs } from 'dayjs';

const { TextArea } = Input;
const { RangePicker } = DatePicker;

interface BatchCreateFormProps {
  onSuccess: () => void;
}

const BatchCreateForm: React.FC<BatchCreateFormProps> = ({ onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      
      const { dateRange, templates, ...commonSettings } = values;
      const [startDate, endDate]: [Dayjs, Dayjs] = dateRange;
      
      const requests = [];
      
      // 遍历日期范围
      let currentDate = startDate;
      while (currentDate.isBefore(endDate) || currentDate.isSame(endDate, 'day')) {
        // 为每个日期创建所有时间模板的时间槽
        for (const template of templates) {
          requests.push(timeSlotService.createTimeSlot({
            date: currentDate.format('YYYY-MM-DD'),
            startTime: template.startTime,
            endTime: template.endTime,
            capacity: template.capacity || commonSettings.capacity,
            status: 'AVAILABLE' as any,
            isHoliday: commonSettings.isHoliday || false,
            priceMultiplier: template.priceMultiplier || commonSettings.priceMultiplier,
            notes: template.notes || commonSettings.notes,
          }));
        }
        currentDate = currentDate.add(1, 'day');
      }
      
      await Promise.all(requests);
      
      message.success(`成功创建 ${requests.length} 个时间槽`);
      form.resetFields();
      onSuccess();
    } catch (error) {
      console.error('批量创建时间槽失败:', error);
      message.error('批量创建失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      initialValues={{
        capacity: 10,
        priceMultiplier: 1,
        isHoliday: false,
        templates: [
          { startTime: '09:00:00', endTime: '11:00:00', capacity: 10, priceMultiplier: 1 },
          { startTime: '14:00:00', endTime: '16:00:00', capacity: 10, priceMultiplier: 1 },
        ],
      }}
    >
      <Card title="日期设置" size="small" style={{ marginBottom: 16 }}>
        <Form.Item
          name="dateRange"
          label="日期范围"
          rules={[{ required: true, message: '请选择日期范围' }]}
        >
          <RangePicker style={{ width: '100%' }} />
        </Form.Item>
      </Card>

      <Card title="通用设置" size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              name="capacity"
              label="默认容量"
              rules={[{ required: true, message: '请输入容量' }]}
            >
              <InputNumber min={1} max={100} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="priceMultiplier"
              label="默认价格倍数"
            >
              <InputNumber 
                min={0.1} 
                max={10} 
                step={0.1} 
                style={{ width: '100%' }} 
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="isHoliday"
              label="节假日"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          </Col>
        </Row>
        
        <Form.Item
          name="notes"
          label="默认备注"
        >
          <TextArea rows={2} placeholder="输入默认备注信息" />
        </Form.Item>
      </Card>

      <Card title="时间模板" size="small" style={{ marginBottom: 16 }}>
        <div style={{ maxHeight: '450px', overflowY: 'auto' }}>
        <Form.List name="templates">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...restField }) => (
                <Card 
                  key={key} 
                  size="small" 
                  style={{ marginBottom: 8 }}
                  title={`模板 ${name + 1}`}
                  extra={
                    fields.length > 1 && (
                      <Button
                        type="text"
                        danger
                        icon={<MinusCircleOutlined />}
                        onClick={() => remove(name)}
                      />
                    )
                  }
                >
                  <Row gutter={16}>
                    <Col span={6}>
                      <Form.Item
                        {...restField}
                        name={[name, 'startTime']}
                        label="开始时间"
                        rules={[{ required: true, message: '请选择开始时间' }]}
                      >
                        <TimePicker format="HH:mm:ss" style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col span={6}>
                      <Form.Item
                        {...restField}
                        name={[name, 'endTime']}
                        label="结束时间"
                        rules={[{ required: true, message: '请选择结束时间' }]}
                      >
                        <TimePicker format="HH:mm:ss" style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Form.Item
                        {...restField}
                        name={[name, 'capacity']}
                        label="容量"
                      >
                        <InputNumber min={1} max={100} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Form.Item
                        {...restField}
                        name={[name, 'priceMultiplier']}
                        label="价格倍数"
                      >
                        <InputNumber 
                          min={0.1} 
                          max={10} 
                          step={0.1} 
                          style={{ width: '100%' }} 
                        />
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Form.Item
                        {...restField}
                        name={[name, 'notes']}
                        label="备注"
                      >
                        <Input placeholder="备注" />
                      </Form.Item>
                    </Col>
                  </Row>
                </Card>
              ))}
              <Button
                type="dashed"
                onClick={() => add({ startTime: '09:00:00', endTime: '11:00:00', capacity: 10, priceMultiplier: 1 })}
                block
                icon={<PlusOutlined />}
              >
                添加时间模板
              </Button>
            </>
          )}
        </Form.List>
        </div>
      </Card>

      <Divider />
      
      <div style={{ textAlign: 'right' }}>
        <Space>
          <Button onClick={() => form.resetFields()}>
            重置
          </Button>
          <Button type="primary" htmlType="submit" loading={loading}>
            批量创建
          </Button>
        </Space>
      </div>
    </Form>
  );
};

export default BatchCreateForm;
