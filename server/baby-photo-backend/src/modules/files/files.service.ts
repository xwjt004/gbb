import { Injectable } from '@nestjs/common';
import { join } from 'path';

@Injectable()
export class FilesService {
  getFilePath(filename: string) {
    const uploadPath = process.env.UPLOAD_PATH || './uploads';
    return join(uploadPath, filename);
  }

  getPublicUrl(filename: string) {
  // 默认返回相对/前缀路径，避免在前端以局域网 IP 访问时指向 localhost 导致无法加载
  // 可通过环境变量 FILE_BASE_URL 覆盖（例如在生产中使用完整域名）
  const base = process.env.FILE_BASE_URL || '/api/v1/files';
  return `${base}/${filename}`;
  }
}
