import React, { useState, useEffect } from 'react';
import { Upload, message, Modal } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import axios from 'axios';

interface ImageUploadProps {
  value?: string[];
  onChange?: (value: string[]) => void;
  maxCount?: number;
  listType?: 'picture-card' | 'picture' | 'text';
}

const ImageUpload: React.FC<ImageUploadProps> = ({ 
  value, 
  onChange, 
  maxCount = 5,
  listType = 'picture-card'
}) => {
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [initialized, setInitialized] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  // 初始化和同步外部 value
  useEffect(() => {
    const urls = value || [];
    
    // 首次初始化
    if (!initialized) {
      setFileList(
        urls.map((url, index) => ({
          uid: `init-${index}-${Date.now()}`,
          name: `image-${index}`,
          status: 'done',
          url,
        }))
      );
      setInitialized(true);
      return;
    }
    
    // 只有当所有文件都已完成上传时才同步外部 value
    const allDone = fileList.every(f => f.status === 'done' || f.status === 'error' || f.status === 'removed');
    if (allDone) {
      const currentUrls = fileList
        .filter(f => f.status === 'done')
        .map(f => f.url || f.response?.data?.url)
        .filter(Boolean);
      
      const valueChanged = urls.length !== currentUrls.length || 
        urls.some((url, index) => url !== currentUrls[index]);
      
      if (valueChanged) {
        setFileList(
          urls.map((url, index) => ({
            uid: `sync-${index}-${Date.now()}`,
            name: `image-${index}`,
            status: 'done',
            url,
          }))
        );
      }
    }
  }, [value]);

  const handlePreview = (file: UploadFile) => {
  // 预览优先使用服务器返回的 url 字段
  const preview = file.response?.data?.url || file.url || '';
  setPreviewImage(preview);
    setPreviewVisible(true);
  };

  const handleChange: UploadProps['onChange'] = ({ fileList: newFileList }) => {
    // 把服务器返回的 url 写入 file.url，确保缩略图能正确显示
    const normalized = newFileList.map(f => {
      if (f.response && f.response.data && f.response.data.url) {
        return { ...f, url: f.response.data.url };
      }
      return f;
    });

    setFileList(normalized);

    // 只返回已上传成功的图片URL
    const urls = normalized
      .filter(file => file.status === 'done')
      .map(file => file.url || file.response?.data?.url)
      .filter(Boolean) as string[];

    onChange?.(urls);
  };

  const customRequest = async (options: any) => {
    const { file, onSuccess, onError, onProgress } = options;
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('/api/v1/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (e) => {
          const percent = e.total ? Math.round((e.loaded / e.total) * 100) : 0;
          onProgress({ percent });
        },
      });

      if (response.data.success) {
        // 手动更新上传文件的 url 字段，AntD Upload 会使用 file.url 显示缩略图
        onSuccess(response.data, file);
        message.success('上传成功');
      } else {
        onError(new Error(response.data.message || '上传失败'));
      }
    } catch (error: any) {
      onError(error);
      message.error(error.message || '上传失败');
    }
  };

  const beforeUpload = (file: File) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('只能上传图片文件！');
      return false;
    }
    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      message.error('图片大小不能超过 5MB！');
      return false;
    }
    return true;
  };

  const uploadButton = (
    <div>
      <PlusOutlined />
      <div style={{ marginTop: 8 }}>上传图片</div>
    </div>
  );

  return (
    <>
      <Upload
        listType={listType}
        fileList={fileList}
        onPreview={handlePreview}
        onChange={handleChange}
        customRequest={customRequest}
        beforeUpload={beforeUpload}
        maxCount={maxCount}
      >
        {fileList.length >= maxCount ? null : uploadButton}
      </Upload>
      <Modal
        open={previewVisible}
        footer={null}
        onCancel={() => setPreviewVisible(false)}
      >
        <img alt="preview" style={{ width: '100%' }} src={previewImage} />
      </Modal>
    </>
  );
};

export default ImageUpload;
