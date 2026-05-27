import React, { useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Select, ColorPicker, message } from 'antd';
import { PackageCategory, CreatePackageCategoryDto, UpdatePackageCategoryDto } from '../services/packageCategoryService';

interface CategoryFormModalProps {
  visible: boolean;
  category?: PackageCategory;
  onCancel: () => void;
  onSuccess: () => void;
}

const CategoryFormModal: React.FC<CategoryFormModalProps> = ({
  visible,
  category,
  onCancel,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = React.useState(false);

  useEffect(() => {
    if (visible && category) {
      form.setFieldsValue({
        name: category.name,
        description: category.description,
        icon: category.icon,
        color: category.color,
        sortOrder: category.sortOrder,
        status: category.status,
      });
    } else if (visible) {
      form.resetFields();
    }
  }, [visible, category, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      // 处理颜色值
      const formData: CreatePackageCategoryDto | UpdatePackageCategoryDto = {
        ...values,
        color: typeof values.color === 'string' ? values.color : values.color?.toHexString?.(),
      };

      if (category) {
        // 更新
        const packageCategoryService = (await import('../services/packageCategoryService')).default;
        await packageCategoryService.updateCategory(category.id, formData);
        message.success('分类更新成功');
      } else {
        // 创建
        const packageCategoryService = (await import('../services/packageCategoryService')).default;
        await packageCategoryService.createCategory(formData as CreatePackageCategoryDto);
        message.success('分类创建成功');
      }

      form.resetFields();
      onSuccess();
    } catch (error: any) {
      console.error('操作失败:', error);
      if (error.response?.data?.message) {
        message.error(error.response.data.message);
      } else if (error.errorFields) {
        message.error('请检查表单填写是否正确');
      } else {
        message.error('操作失败，请稍后重试');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={category ? '编辑分类' : '新增分类'}
      open={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      confirmLoading={loading}
      width={600}
      destroyOnHidden
      styles={{ body: { maxHeight: '65vh', overflowY: 'auto' } }}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          sortOrder: 0,
          status: 'ACTIVE',
        }}
      >
        <Form.Item
          label="分类名称"
          name="name"
          rules={[
            { required: true, message: '请输入分类名称' },
            { min: 1, max: 50, message: '分类名称长度应在1-50个字符之间' },
          ]}
        >
          <Input placeholder="例如：儿童写真、全家福等" />
        </Form.Item>

        <Form.Item
          label="分类描述"
          name="description"
          rules={[
            { max: 200, message: '描述不能超过200个字符' },
          ]}
        >
          <Input.TextArea
            rows={3}
            placeholder="简单描述该分类的特点（可选）"
          />
        </Form.Item>

        <Form.Item label="图标" name="icon">
          <Input placeholder="图标名称，例如：camera、star 等（可选）" />
        </Form.Item>

        <Form.Item label="分类颜色" name="color">
          <ColorPicker
            showText
            format="hex"
            presets={[
              {
                label: '推荐颜色',
                colors: [
                  '#1890ff',
                  '#52c41a',
                  '#faad14',
                  '#f5222d',
                  '#722ed1',
                  '#13c2c2',
                  '#eb2f96',
                  '#fa8c16',
                ],
              },
            ]}
          />
        </Form.Item>

        <Form.Item
          label="排序顺序"
          name="sortOrder"
          tooltip="数字越小越靠前"
          rules={[{ type: 'number', min: 0, message: '排序必须为非负整数' }]}
        >
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item
          label="状态"
          name="status"
          rules={[{ required: true, message: '请选择状态' }]}
        >
          <Select>
            <Select.Option value="ACTIVE">启用</Select.Option>
            <Select.Option value="INACTIVE">禁用</Select.Option>
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CategoryFormModal;
