import React, { useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Select, ColorPicker, message } from 'antd';
import type { PackageCategory, CreatePackageCategoryDto, UpdatePackageCategoryDto } from '../services/packageCategoryService';

const { TextArea } = Input;

interface CategoryModalProps {
  visible: boolean;
  category?: PackageCategory | null;
  onClose: () => void;
  onSuccess: () => void;
}

const CategoryModal: React.FC<CategoryModalProps> = ({
  visible,
  category,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const isEdit = !!category;

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
      const packageCategoryService = (await import('../services/packageCategoryService')).default;

      // 处理颜色值
      const formData: CreatePackageCategoryDto | UpdatePackageCategoryDto = {
        ...values,
        color: typeof values.color === 'string' ? values.color : values.color?.toHexString?.(),
      };

      if (isEdit && category) {
        await packageCategoryService.updateCategory(category.id, formData);
        message.success('分类更新成功');
      } else {
        await packageCategoryService.createCategory(formData as CreatePackageCategoryDto);
        message.success('分类创建成功');
      }

      form.resetFields();
      onSuccess();
      onClose();
    } catch (error: any) {
      if (error.errorFields) {
        // 表单验证错误
        return;
      }
      message.error(error.message || `分类${isEdit ? '更新' : '创建'}失败`);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title={isEdit ? '编辑套餐分类' : '新增套餐分类'}
      open={visible}
      onOk={handleSubmit}
      onCancel={handleCancel}
      width={600}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          status: 'ACTIVE',
          sortOrder: 0,
        }}
      >
        <Form.Item
          name="name"
          label="分类名称"
          rules={[
            { required: true, message: '请输入分类名称' },
            { max: 50, message: '分类名称不能超过50个字符' },
          ]}
        >
          <Input placeholder="请输入分类名称，如：儿童写真" />
        </Form.Item>

        <Form.Item
          name="description"
          label="分类描述"
          rules={[{ max: 200, message: '分类描述不能超过200个字符' }]}
        >
          <TextArea
            rows={3}
            placeholder="请输入分类描述，如：适合0-12岁儿童的写真套餐"
          />
        </Form.Item>

        <Form.Item
          name="icon"
          label="图标"
          tooltip="可输入图标名称或图标URL"
        >
          <Input placeholder="如：camera、star 等" />
        </Form.Item>

        <Form.Item
          name="color"
          label="分类颜色"
          tooltip="用于在界面上区分不同分类"
        >
          <ColorPicker showText />
        </Form.Item>

        <Form.Item
          name="sortOrder"
          label="排序顺序"
          tooltip="数字越小越靠前"
        >
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item
          name="status"
          label="状态"
          rules={[{ required: true, message: '请选择状态' }]}
        >
          <Select>
            <Select.Option value="ACTIVE">启用</Select.Option>
            <Select.Option value="INACTIVE">停用</Select.Option>
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CategoryModal;
