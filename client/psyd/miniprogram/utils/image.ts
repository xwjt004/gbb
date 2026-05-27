/**
 * 图片 URL 处理工具
 */

import config from '../config/index';

/**
 * 将相对路径转换为完整的图片 URL
 * @param path 图片路径（可能是相对路径或完整 URL）
 * @returns 完整的图片 URL（始终使用HTTPS）
 */
export function getImageUrl(path: string | undefined | null): string {
  if (!path) {
    return ''; // 返回空字符串，让小程序显示默认占位图
  }

  // 如果已经是完整的 HTTP URL，转换为HTTPS
  if (path.startsWith('http://')) {
    // 提取路径部分（去掉 http://域名）
    const urlPath = path.replace(/^http:\/\/[^\/]+/, '');
    // 拼接HTTPS域名
    const baseWithoutApi = config.BASE_URL.replace('/api/v1', '');
    return `${baseWithoutApi}${urlPath}`;
  }

  // 如果已经是 HTTPS URL，直接返回
  if (path.startsWith('https://')) {
    return path;
  }

  // 如果路径以 /api/v1 开头，说明是完整的API路径
  if (path.startsWith('/api/v1')) {
    const baseWithoutApi = config.BASE_URL.replace('/api/v1', '');
    return `${baseWithoutApi}${path}`;
  }

  // 如果是以 / 开头的其他相对路径（如 /uploads/xxx.jpg）
  if (path.startsWith('/')) {
    const baseWithoutApi = config.BASE_URL.replace('/api/v1', '');
    return `${baseWithoutApi}${path}`;
  }

  // 其他情况（相对路径），也拼接 BASE_URL
  const baseWithoutApi = config.BASE_URL.replace('/api/v1', '');
  return `${baseWithoutApi}/${path}`;
}

/**
 * 批量转换图片 URL 数组
 * @param paths 图片路径数组
 * @returns 完整的图片 URL 数组
 */
export function getImageUrls(paths: (string | undefined | null)[] | undefined | null): string[] {
  if (!paths || !Array.isArray(paths)) {
    return [];
  }

  return paths
    .filter(path => path) // 过滤掉空值
    .map(path => getImageUrl(path));
}

/**
 * 获取缩略图 URL（优先使用 thumbnail，否则使用第一张图片）
 * @param thumbnail 缩略图路径
 * @param images 图片数组
 * @returns 完整的图片 URL
 */
export function getThumbnailUrl(
  thumbnail: string | undefined | null,
  images: (string | undefined | null)[] | undefined | null
): string {
  if (thumbnail) {
    return getImageUrl(thumbnail);
  }

  if (images && images.length > 0) {
    return getImageUrl(images[0]);
  }

  return '';
}
