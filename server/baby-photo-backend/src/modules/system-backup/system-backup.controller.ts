import {
  Controller,
  Get,
  Post,
  Delete,
  Put,
  Body,
  Param,
  Res,
  UseInterceptors,
  UploadedFile,
  HttpStatus,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { AdminJwtAuthGuard } from '../auth/guards/admin-jwt-auth.guard';
import { SystemBackupService } from './system-backup.service';
import { CreateBackupDto, BackupConfigDto, RestoreBackupDto } from './dto/backup.dto';
import { diskStorage } from 'multer';
import { extname } from 'path';

@ApiTags('系统备份')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
@Controller('system/backup')
export class SystemBackupController {
  constructor(private readonly backupService: SystemBackupService) {}

  @Post()
  @ApiOperation({ summary: '创建数据库备份' })
  @ApiResponse({ status: 201, description: '备份创建成功' })
  @ApiResponse({ status: 500, description: '备份失败' })
  async createBackup(@Body() dto: CreateBackupDto) {
    const backup = await this.backupService.createBackup(dto);
    return {
      code: 0,
      message: '备份创建成功',
      data: backup,
    };
  }

  @Get('list')
  @ApiOperation({ summary: '获取备份列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getBackups() {
    const backups = await this.backupService.getBackups();
    return {
      code: 0,
      message: '获取成功',
      data: backups,
    };
  }

  @Get(':id/download')
  @ApiOperation({ summary: '下载备份文件' })
  @ApiResponse({ status: 200, description: '下载成功' })
  @ApiResponse({ status: 404, description: '备份不存在' })
  async downloadBackup(@Param('id') id: string, @Res() res: Response) {
    const { filePath, fileName } = await this.backupService.downloadBackup(id);
    
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    
    return res.sendFile(filePath);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '删除备份' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '备份不存在' })
  async deleteBackup(@Param('id') id: string) {
    await this.backupService.deleteBackup(id);
    return {
      code: 0,
      message: '备份删除成功',
    };
  }

  @Post('restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '恢复数据库' })
  @ApiResponse({ status: 200, description: '恢复成功' })
  @ApiResponse({ status: 404, description: '备份不存在' })
  @ApiResponse({ status: 500, description: '恢复失败' })
  async restoreBackup(@Body() dto: RestoreBackupDto) {
    await this.backupService.restoreBackup(dto.backupId);
    return {
      code: 0,
      message: '数据库恢复成功',
    };
  }

  @Post('restore/upload')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './temp',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `backup-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (file.originalname.match(/\.(sql|zip)$/)) {
          cb(null, true);
        } else {
          cb(new Error('只支持 .sql 和 .zip 文件'), false);
        }
      },
      limits: {
        fileSize: 500 * 1024 * 1024, // 500MB
      },
    }),
  )
  @ApiOperation({ summary: '上传备份文件并恢复' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: '上传并恢复成功' })
  @ApiResponse({ status: 400, description: '文件格式不支持' })
  @ApiResponse({ status: 500, description: '恢复失败' })
  async uploadAndRestore(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      return {
        code: 1,
        message: '请上传备份文件',
      };
    }

    await this.backupService.uploadAndRestore(file.path);
    
    return {
      code: 0,
      message: '数据库恢复成功',
    };
  }

  @Get('config')
  @ApiOperation({ summary: '获取备份配置' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getConfig() {
    const config = await this.backupService.getConfig();
    return {
      code: 0,
      message: '获取成功',
      data: config,
    };
  }

  @Put('config')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '更新备份配置' })
  @ApiResponse({ status: 200, description: '更新成功' })
  async updateConfig(@Body() dto: BackupConfigDto) {
    const config = await this.backupService.updateConfig(dto);
    return {
      code: 0,
      message: '配置更新成功',
      data: config,
    };
  }

  @Post('cleanup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '清理过期备份' })
  @ApiResponse({ status: 200, description: '清理成功' })
  async cleanupOldBackups(@Body() body: { retentionDays: number }) {
    const deletedCount = await this.backupService.cleanupOldBackups(
      body.retentionDays || 30,
    );
    return {
      code: 0,
      message: '清理完成',
      data: { deletedCount },
    };
  }

  @Get('schedule/status')
  @ApiOperation({ summary: '获取定时任务状态' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getScheduleStatus() {
    const status = this.backupService.getScheduleStatus();
    return {
      code: 0,
      message: '获取成功',
      data: status,
    };
  }
}
