/**
 * 图片 URL 处理工具函数
 */

// 获取服务器基础 URL
const getServerBaseUrl = () => {
  // 后端端口，优先从环境变量读取
  const backendPort = import.meta.env.VITE_BACKEND_PORT || '3000';
  // 从环境变量获取 API URL
  const apiUrl = import.meta.env.VITE_API_URL || '';

  // 如果是完整的 URL,提取协议+域名+端口
  if (/^https?:\/\//i.test(apiUrl)) {
    const url = new URL(apiUrl);
    return `${url.protocol}//${url.host}`;
  }

  // 如果是相对路径,使用当前页面的协议+域名+端口
  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}:${backendPort}`;
};

/**
 * 格式化图片 URL
 * 如果是相对路径,则添加服务器地址前缀
 * @param url 图片 URL
 * @returns 完整的图片 URL
 */
export const formatImageUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  
  // 如果已经是完整的 URL,直接返回
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // 如果是相对路径,添加服务器地址前缀
  const baseUrl = getServerBaseUrl();
  return `${baseUrl}${url.startsWith('/') ? url : `/${url}`}`;
};

/**
 * 格式化图片数组
 * @param images 图片 URL 数组
 * @returns 格式化后的图片 URL 数组
 */
export const formatImageUrls = (images: string[] | null | undefined): string[] => {
  if (!images || !Array.isArray(images)) return [];
  return images.map(formatImageUrl);
};

/**
 * 获取第一张图片的 URL
 * @param images 图片 URL 数组
 * @returns 第一张图片的完整 URL,如果没有则返回空字符串
 */
export const getFirstImageUrl = (images: string[] | null | undefined): string => {
  const formattedImages = formatImageUrls(images);
  return formattedImages[0] || '';
};
