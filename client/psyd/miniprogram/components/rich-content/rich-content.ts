import { getImageUrl } from '../../utils/image';

Component({
  properties: {
    content: {
      type: Object,
      value: null
    }
  },

  data: {
    imageUrls: [] as string[],
    processedBlocks: [] as any[]
  },

  observers: {
    'content': function(content) {
      if (content && content.blocks) {
        // 处理所有块，转换图片和视频URL为完整HTTPS地址
        const processedBlocks = content.blocks.map((block: any) => {
          if (block.type === 'image') {
            return {
              ...block,
              url: getImageUrl(block.url)
            };
          } else if (block.type === 'video') {
            return {
              ...block,
              url: getImageUrl(block.url),
              poster: block.poster ? getImageUrl(block.poster) : undefined
            };
          }
          return block;
        });

        // 提取所有图片URL用于预览
        const imageUrls = processedBlocks
          .filter((block: any) => block.type === 'image')
          .map((block: any) => block.url);
        
        this.setData({
          processedBlocks: processedBlocks,
          imageUrls: imageUrls
        });
      }
    }
  },

  methods: {
    // 预览图片
    previewImage(e: any) {
      const url = e.currentTarget.dataset.url;
      const urls = this.data.imageUrls;
      
      if (urls.length > 0) {
        wx.previewImage({
          current: url,
          urls: urls
        });
      }
    }
  }
});
