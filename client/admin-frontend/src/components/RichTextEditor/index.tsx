import React, { useState, useMemo } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Button, Space, message, Modal } from 'antd';
import { PlusOutlined, PictureOutlined, VideoCameraOutlined, DeleteOutlined } from '@ant-design/icons';
import ImageUpload from '../ImageUpload';
import './RichTextEditor.css';

interface Block {
  type: 'text' | 'image' | 'video';
  content?: string;
  url?: string;
  poster?: string;
  caption?: string;
}

interface RichTextEditorProps {
  value?: { blocks: Block[] };
  onChange?: (value: { blocks: Block[] }) => void;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange }) => {
  const [blocks, setBlocks] = useState<Block[]>(value?.blocks || []);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [tempImages, setTempImages] = useState<string[]>([]);
  const [tempVideoUrl, setTempVideoUrl] = useState('');
  const [tempPosterUrl, setTempPosterUrl] = useState('');
  const [tempCaption, setTempCaption] = useState('');

  // Quill 编辑器配置
  const modules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'align': [] }],
      ['link'],
      ['clean']
    ],
  }), []);

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'list', 'bullet',
    'align',
    'link'
  ];

  const handleBlocksChange = (newBlocks: Block[]) => {
    setBlocks(newBlocks);
    onChange?.({ blocks: newBlocks });
  };

  const addTextBlock = () => {
    const newBlocks = [...blocks, { type: 'text' as const, content: '' }];
    handleBlocksChange(newBlocks);
  };

  const handleTextChange = (index: number, content: string) => {
    const newBlocks = [...blocks];
    newBlocks[index] = { ...newBlocks[index], type: 'text', content };
    handleBlocksChange(newBlocks);
  };

  const openImageModal = () => {
    setTempImages([]);
    setTempCaption('');
    setImageModalVisible(true);
  };

  const handleImageAdd = () => {
    if (tempImages.length === 0) {
      message.warning('请至少上传一张图片');
      return;
    }

    tempImages.forEach(url => {
      const newBlocks = [...blocks, { type: 'image' as const, url, caption: tempCaption }];
      handleBlocksChange(newBlocks);
    });

    setImageModalVisible(false);
    setTempImages([]);
    setTempCaption('');
    message.success('图片添加成功');
  };

  const openVideoModal = () => {
    setTempVideoUrl('');
    setTempPosterUrl('');
    setTempCaption('');
    setVideoModalVisible(true);
  };

  const handleVideoAdd = () => {
    if (!tempVideoUrl) {
      message.warning('请输入视频URL');
      return;
    }

    const newBlocks = [...blocks, { 
      type: 'video' as const, 
      url: tempVideoUrl, 
      poster: tempPosterUrl,
      caption: tempCaption 
    }];
    handleBlocksChange(newBlocks);

    setVideoModalVisible(false);
    setTempVideoUrl('');
    setTempPosterUrl('');
    setTempCaption('');
    message.success('视频添加成功');
  };

  const removeBlock = (index: number) => {
    const newBlocks = blocks.filter((_, i) => i !== index);
    handleBlocksChange(newBlocks);
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === blocks.length - 1)
    ) {
      return;
    }

    const newBlocks = [...blocks];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newBlocks[index], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[index]];
    handleBlocksChange(newBlocks);
  };

  return (
    <div className="rich-text-editor">
      {blocks.map((block, index) => (
        <div key={index} className="editor-block">
          <div className="block-content">
            {block.type === 'text' && (
              <ReactQuill
                theme="snow"
                value={block.content || ''}
                onChange={(content) => handleTextChange(index, content)}
                modules={modules}
                formats={formats}
                placeholder="请输入文本内容..."
              />
            )}
            {block.type === 'image' && (
              <div className="block-media">
                <img src={block.url} alt={block.caption || ''} style={{ maxWidth: '100%', borderRadius: 4 }} />
                {block.caption && <div className="media-caption">{block.caption}</div>}
              </div>
            )}
            {block.type === 'video' && (
              <div className="block-media">
                <video 
                  src={block.url} 
                  poster={block.poster}
                  controls 
                  style={{ maxWidth: '100%', borderRadius: 4 }} 
                />
                {block.caption && <div className="media-caption">{block.caption}</div>}
              </div>
            )}
          </div>
          <div className="block-actions">
            <Space size="small">
              <Button 
                size="small" 
                onClick={() => moveBlock(index, 'up')}
                disabled={index === 0}
              >
                ↑
              </Button>
              <Button 
                size="small" 
                onClick={() => moveBlock(index, 'down')}
                disabled={index === blocks.length - 1}
              >
                ↓
              </Button>
              <Button 
                size="small" 
                danger 
                icon={<DeleteOutlined />}
                onClick={() => removeBlock(index)}
              >
                删除
              </Button>
            </Space>
          </div>
        </div>
      ))}

      <div className="editor-toolbar">
        <Space wrap>
          <Button icon={<PlusOutlined />} onClick={addTextBlock}>
            添加文本块
          </Button>
          <Button icon={<PictureOutlined />} onClick={openImageModal}>
            添加图片
          </Button>
          <Button icon={<VideoCameraOutlined />} onClick={openVideoModal}>
            添加视频
          </Button>
        </Space>
      </div>

      {/* 图片上传弹窗 */}
      <Modal
        title="添加图片"
        open={imageModalVisible}
        onOk={handleImageAdd}
        onCancel={() => setImageModalVisible(false)}
        okText="添加"
        cancelText="取消"
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <label>选择图片：</label>
            <ImageUpload 
              value={tempImages}
              onChange={setTempImages}
              maxCount={5}
            />
          </div>
          <div>
            <label>图片说明（可选）：</label>
            <input
              type="text"
              className="ant-input"
              placeholder="请输入图片说明"
              value={tempCaption}
              onChange={(e) => setTempCaption(e.target.value)}
              style={{ width: '100%', marginTop: 8 }}
            />
          </div>
        </Space>
      </Modal>

      {/* 视频添加弹窗 */}
      <Modal
        title="添加视频"
        open={videoModalVisible}
        onOk={handleVideoAdd}
        onCancel={() => setVideoModalVisible(false)}
        okText="添加"
        cancelText="取消"
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <label>视频URL：</label>
            <input
              type="text"
              className="ant-input"
              placeholder="请输入视频URL"
              value={tempVideoUrl}
              onChange={(e) => setTempVideoUrl(e.target.value)}
              style={{ width: '100%', marginTop: 8 }}
            />
          </div>
          <div>
            <label>封面图URL（可选）：</label>
            <input
              type="text"
              className="ant-input"
              placeholder="请输入封面图URL"
              value={tempPosterUrl}
              onChange={(e) => setTempPosterUrl(e.target.value)}
              style={{ width: '100%', marginTop: 8 }}
            />
          </div>
          <div>
            <label>视频说明（可选）：</label>
            <input
              type="text"
              className="ant-input"
              placeholder="请输入视频说明"
              value={tempCaption}
              onChange={(e) => setTempCaption(e.target.value)}
              style={{ width: '100%', marginTop: 8 }}
            />
          </div>
        </Space>
      </Modal>
    </div>
  );
};

export default RichTextEditor;
