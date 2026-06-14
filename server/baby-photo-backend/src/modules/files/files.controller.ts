import { Controller, Post, UploadedFile, UseInterceptors, HttpException, Get, Param, Res, BadRequestException, Logger } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { FilesService } from './files.service';
import { extname, join } from 'path';
import { Response } from 'express';
import { randomUUID } from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';
import { unlink, existsSync } from 'fs';

const execAsync = promisify(exec);

const ALLOWED_MIMETYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp',
  'image/svg+xml',
  'application/pdf',
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/webm',
  'video/x-ms-wmv',
  'video/3gpp',
  'video/x-m4v',
];
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || String(200 * 1024 * 1024), 10);

// 需要转码的非 MP4 视频扩展名
const VIDEO_CONVERT_EXTS = ['.mov', '.avi', '.webm', '.wmv', '.3gp', '.m4v'];

// 所有视频都会经过 720p 压缩处理
const VIDEO_EXTS = ['.mp4', ...VIDEO_CONVERT_EXTS];

@Controller('files')
export class FilesController {
  private readonly logger = new Logger(FilesController.name);

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

    let filename = file.filename;
    const ext = extname(filename).toLowerCase();

    // 视频自动转码为 720p MP4（缩小体积 50%+）
    if (VIDEO_EXTS.includes(ext)) {
      try {
        const uploadPath = process.env.UPLOAD_PATH || './uploads';
        const inputPath = join(uploadPath, filename);
        const mp4Filename = `${filename.slice(0, -ext.length)}.mp4`;
        const outputPath = join(uploadPath, mp4Filename);

        this.logger.log(`开始转码视频: ${filename} -> ${mp4Filename}（720p）`);
        const ffmpegCmd = ext === '.mp4'
          ? `ffmpeg -i "${inputPath}" -c:v libx264 -crf 28 -c:a aac -b:a 64k -movflags +faststart -vf "scale=-2:'min(720,ih)'" -y "${outputPath}"`
          : `ffmpeg -i "${inputPath}" -c:v libx264 -crf 28 -c:a aac -b:a 64k -movflags +faststart -vf "scale=-2:'min(720,ih)'" -y "${outputPath}"`;
        await execAsync(ffmpegCmd, { timeout: 300000 }); // 5min timeout
        this.logger.log(`转码完成: ${mp4Filename}`);

        // 删除原始文件（仅当输出与输入不同名时）
        if (filename !== mp4Filename) {
          unlink(inputPath, (err) => {
            if (err) this.logger.error(`删除原始文件失败: ${inputPath}`, err);
          });
        } else {
          // MP4 输入：输出是新文件，删除原始文件
          unlink(inputPath, (err) => {
            if (err) this.logger.error(`删除原始文件失败: ${inputPath}`, err);
          });
        }

        filename = mp4Filename;
      } catch (err: any) {
        this.logger.error(`视频转码失败: ${filename}`, err.message || err);
        // 转码失败时仍然返回原始文件
      }
    }

    const publicUrl = this.filesService.getPublicUrl(filename);
    return { success: true, message: '上传成功', data: { filename, url: publicUrl } };
  }

  @SkipThrottle()
  @Get(':filename')
  async serveFile(@Param('filename') filename: string, @Res() res: Response) {
    const path = this.filesService.getFilePath(filename);
    return res.sendFile(path, { root: '.' });
  }
}
