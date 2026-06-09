import { Controller, Post, UploadedFile, UseInterceptors, HttpException, Get, Param, Res, BadRequestException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { FilesService } from './files.service';
import { extname } from 'path';
import { Response } from 'express';
import { randomUUID } from 'crypto';

const ALLOWED_MIMETYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp',
  'image/svg+xml',
  'application/pdf',
];
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || String(10 * 1024 * 1024), 10);

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => cb(null, process.env.UPLOAD_PATH || './uploads'),
        filename: (req, file, cb) => {
          const ext = extname(file.originalname).toLowerCase();
          const name = `${randomUUID()}${ext}`;
          cb(null, name);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!ALLOWED_MIMETYPES.includes(file.mimetype)) {
          return cb(new BadRequestException(`不支持的文件类型: ${file.mimetype}，仅允许图片和 PDF 文件`), false);
        }
        cb(null, true);
      },
      limits: { fileSize: MAX_FILE_SIZE },
    }),
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new HttpException('No file uploaded', 400);
    if (file.size > MAX_FILE_SIZE) {
      throw new HttpException(`文件大小不能超过 ${MAX_FILE_SIZE / 1024 / 1024}MB`, 400);
    }
    const publicUrl = this.filesService.getPublicUrl(file.filename);
    return { success: true, message: '上传成功', data: { filename: file.filename, url: publicUrl } };
  }

  @SkipThrottle()
  @Get(':filename')
  async serveFile(@Param('filename') filename: string, @Res() res: Response) {
    const path = this.filesService.getFilePath(filename);
    return res.sendFile(path, { root: '.' });
  }
}
