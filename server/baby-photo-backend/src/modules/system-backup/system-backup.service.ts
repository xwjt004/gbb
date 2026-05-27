import { Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { Cron, SchedulerRegistry } from '@nestjs/schedule';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { CreateBackupDto, BackupConfigDto } from './dto/backup.dto';
import { BackupRecord, BackupType, BackupStatus, BackupConfig } from './entities/backup.entity';

const execAsync = promisify(exec);

@Injectable()
export class SystemBackupService {
  private readonly logger = new Logger(SystemBackupService.name);
  private readonly backupDir = path.join(process.cwd(), 'backups');
  private currentConfig: BackupConfig;
  private readonly pgBinPath: string;

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly schedulerRegistry?: SchedulerRegistry,
  ) {
    // 设置 PostgreSQL bin 路径
    this.pgBinPath = this.getPostgreSQLBinPath();
    this.ensureBackupDirectory();
    // 异步初始化定时任务
    this.initializeScheduledBackup().catch((error) => {
      this.logger.error('Failed to initialize scheduled backup', error);
    });
  }

  // 获取 PostgreSQL bin 目录路径
  private getPostgreSQLBinPath(): string {
    const isWindows = process.platform === 'win32';
    if (isWindows) {
      // Windows: 常见的 PostgreSQL 安装路径
      const possiblePaths = [
        'C:\\Program Files\\PostgreSQL\\17\\bin',
        'C:\\Program Files\\PostgreSQL\\16\\bin',
        'C:\\Program Files\\PostgreSQL\\15\\bin',
        'C:\\Program Files\\PostgreSQL\\14\\bin',
        'C:\\Program Files (x86)\\PostgreSQL\\17\\bin',
        'C:\\Program Files (x86)\\PostgreSQL\\16\\bin',
      ];
      
      // 尝试从环境变量获取
      const envPath = process.env.POSTGRESQL_BIN_PATH;
      if (envPath) {
        return envPath;
      }
      
      // 使用第一个可能的路径（后续可以改进为实际检测）
      return possiblePaths[0];
    }
    
    // Linux/Mac: pg_dump 和 psql 通常在 PATH 中
    return '';
  }

  // 确保备份目录存在
  private async ensureBackupDirectory() {
    try {
      await fs.access(this.backupDir);
    } catch {
      await fs.mkdir(this.backupDir, { recursive: true });
      this.logger.log(`Created backup directory: ${this.backupDir}`);
    }
  }

  // 初始化定时备份任务
  private async initializeScheduledBackup() {
    try {
      const config = await this.getConfig();
      this.currentConfig = config;
      if (config.autoBackup) {
        this.scheduleBackup(config);
      }
    } catch (error) {
      this.logger.error('Failed to initialize scheduled backup', error);
    }
  }

  // 调度备份任务
  private scheduleBackup(config: BackupConfig) {
    // 如果 schedulerRegistry 不可用，跳过定时任务配置
    if (!this.schedulerRegistry) {
      this.logger.warn('SchedulerRegistry not available, scheduled backup disabled');
      return;
    }

    // 删除旧的定时任务（如果存在）
    try {
      const existingJob = this.schedulerRegistry.getCronJob('auto-backup');
      if (existingJob) {
        existingJob.stop();
        this.schedulerRegistry.deleteCronJob('auto-backup');
      }
    } catch (error) {
      // 任务不存在，忽略
    }

    if (!config.autoBackup) {
      this.logger.log('Auto backup is disabled');
      return;
    }

    // 解析备份时间 (格式: "02:00")
    const [hour, minute] = config.backupTime.split(':').map(Number);
    
    // 根据频率设置 cron 表达式
    let cronExpression: string;
    switch (config.backupFrequency) {
      case 'daily':
        // 每天指定时间
        cronExpression = `${minute} ${hour} * * *`;
        break;
      case 'weekly':
        // 每周一指定时间
        cronExpression = `${minute} ${hour} * * 1`;
        break;
      case 'monthly':
        // 每月1号指定时间
        cronExpression = `${minute} ${hour} 1 * *`;
        break;
      default:
        cronExpression = `${minute} ${hour} * * *`;
    }

    this.logger.log(`Scheduling auto backup: ${cronExpression} (${config.backupFrequency})`);

    // 创建新的定时任务
    const callback = async () => {
      this.logger.log('Running scheduled backup...');
      try {
        await this.createBackup(
          { 
            description: `自动备份 - ${config.backupFrequency}`, 
            includeUploads: config.includeUploads 
          },
          BackupType.SCHEDULED
        );
        
        // 执行清理过期备份
        if (config.retentionDays > 0) {
          await this.cleanupOldBackups(config.retentionDays);
        }
      } catch (error) {
        this.logger.error('Scheduled backup failed', error);
      }
    };

    // 动态导入 cron 包
    const CronJob = require('cron').CronJob;
    const job = new CronJob(cronExpression, callback);

    this.schedulerRegistry.addCronJob('auto-backup', job);
    job.start();
    
    this.logger.log(`Auto backup scheduled successfully: ${config.backupFrequency} at ${config.backupTime}`);
  }

  // 每天凌晨2点执行清理（备用任务，确保定期清理）
  @Cron('0 2 * * *', {
    name: 'daily-cleanup',
  })
  async handleDailyCleanup() {
    try {
      const config = await this.getConfig();
      if (config.retentionDays > 0) {
        await this.cleanupOldBackups(config.retentionDays);
      }
    } catch (error) {
      this.logger.error('Daily cleanup failed', error);
    }
  }

  // 创建备份
  async createBackup(dto: CreateBackupDto, backupType: BackupType = BackupType.MANUAL): Promise<BackupRecord> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T').join('_').substring(0, 19);
    const fileName = `backup_${timestamp}.sql`;
    const filePath = path.join(this.backupDir, fileName);

    const backupRecord: BackupRecord = {
      id: `backup_${Date.now()}`,
      fileName,
      filePath,
      fileSize: 0,
      backupType,
      status: BackupStatus.IN_PROGRESS,
      createdAt: new Date(),
      description: dto.description,
    };

    try {
      this.logger.log(`Starting database backup: ${fileName}`);

      // 从环境变量获取数据库配置
      const dbHost = process.env.DATABASE_HOST || 'localhost';
      const dbPort = process.env.DATABASE_PORT || '5432';
      const dbName = process.env.DATABASE_NAME || 'baby_photo_db';
      const dbUser = process.env.DATABASE_USER || 'postgres';
      const dbPassword = process.env.DATABASE_PASSWORD || '';

      // Windows 系统需要特殊处理环境变量
      const isWindows = process.platform === 'win32';
      let command: string;
      
      if (isWindows) {
        // Windows: 使用完整路径和 SET 命令
        const pgDumpPath = path.join(this.pgBinPath, 'pg_dump.exe');
        command = `set PGPASSWORD=${dbPassword}&& "${pgDumpPath}" -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -F p -f "${filePath}"`;
      } else {
        // Linux/Mac: 使用 PGPASSWORD 前缀
        command = `PGPASSWORD="${dbPassword}" pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -F p -f "${filePath}"`;
      }

      await execAsync(command);

      // 获取文件大小
      const stats = await fs.stat(filePath);
      backupRecord.fileSize = stats.size;

      // 计算耗时
      const duration = Math.round((Date.now() - startTime) / 1000);
      backupRecord.duration = duration;
      backupRecord.status = BackupStatus.SUCCESS;

      // 获取数据库统计信息
      const tableCount = await this.getTableCount();
      const recordCount = await this.getRecordCount();
      backupRecord.tablesCount = tableCount;
      backupRecord.recordsCount = recordCount;

      this.logger.log(`Backup completed successfully: ${fileName} (${this.formatFileSize(stats.size)}, ${duration}s)`);

      // 保存备份记录到数据库（可选）
      await this.saveBackupRecord(backupRecord);

      return backupRecord;
    } catch (error) {
      backupRecord.status = BackupStatus.FAILED;
      backupRecord.error = error.message;
      this.logger.error(`Backup failed: ${error.message}`, error.stack);

      // 保存失败记录
      await this.saveBackupRecord(backupRecord);

      throw error;
    }
  }

  // 获取备份列表
  async getBackups(): Promise<BackupRecord[]> {
    try {
      // 读取备份目录
      const files = await fs.readdir(this.backupDir);
      const backupFiles = files.filter(file => file.endsWith('.sql') || file.endsWith('.zip'));

      const backupRecords: BackupRecord[] = [];

      for (const fileName of backupFiles) {
        const filePath = path.join(this.backupDir, fileName);
        const stats = await fs.stat(filePath);

        backupRecords.push({
          id: fileName.replace(/\.(sql|zip)$/, ''),
          fileName,
          filePath,
          fileSize: stats.size,
          backupType: fileName.includes('auto') ? BackupType.AUTO : BackupType.MANUAL,
          status: BackupStatus.SUCCESS,
          createdAt: stats.birthtime,
        });
      }

      // 按创建时间降序排序
      return backupRecords.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      this.logger.error(`Failed to get backups: ${error.message}`, error.stack);
      return [];
    }
  }

  // 获取单个备份
  async getBackup(id: string): Promise<BackupRecord> {
    const backups = await this.getBackups();
    const backup = backups.find(b => b.id === id);

    if (!backup) {
      throw new NotFoundException(`Backup not found: ${id}`);
    }

    return backup;
  }

  // 下载备份文件
  async downloadBackup(id: string): Promise<{ filePath: string; fileName: string }> {
    const backup = await this.getBackup(id);
    return {
      filePath: backup.filePath,
      fileName: backup.fileName,
    };
  }

  // 删除备份
  async deleteBackup(id: string): Promise<void> {
    const backup = await this.getBackup(id);

    try {
      await fs.unlink(backup.filePath);
      this.logger.log(`Backup deleted: ${backup.fileName}`);
    } catch (error) {
      this.logger.error(`Failed to delete backup: ${error.message}`, error.stack);
      throw error;
    }
  }

  // 恢复数据库
  async restoreBackup(backupId: string): Promise<void> {
    const backup = await this.getBackup(backupId);

    try {
      this.logger.log(`Starting database restore from: ${backup.fileName}`);

      const dbHost = process.env.DATABASE_HOST || 'localhost';
      const dbPort = process.env.DATABASE_PORT || '5432';
      const dbName = process.env.DATABASE_NAME || 'baby_photo_db';
      const dbUser = process.env.DATABASE_USER || 'postgres';
      const dbPassword = process.env.DATABASE_PASSWORD || '';

      // Windows 系统需要特殊处理环境变量
      const isWindows = process.platform === 'win32';
      let command: string;
      
      if (isWindows) {
        // Windows: 使用完整路径和 SET 命令
        const psqlPath = path.join(this.pgBinPath, 'psql.exe');
        command = `set PGPASSWORD=${dbPassword}&& "${psqlPath}" -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -f "${backup.filePath}"`;
      } else {
        // Linux/Mac: 使用 PGPASSWORD 前缀
        command = `PGPASSWORD="${dbPassword}" psql -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -f "${backup.filePath}"`;
      }

      await execAsync(command);

      this.logger.log(`Database restored successfully from: ${backup.fileName}`);
    } catch (error) {
      this.logger.error(`Failed to restore database: ${error.message}`, error.stack);
      throw error;
    }
  }

  // 上传并恢复备份
  async uploadAndRestore(filePath: string): Promise<void> {
    try {
      this.logger.log(`Starting database restore from uploaded file: ${filePath}`);

      const dbHost = process.env.DATABASE_HOST || 'localhost';
      const dbPort = process.env.DATABASE_PORT || '5432';
      const dbName = process.env.DATABASE_NAME || 'baby_photo_db';
      const dbUser = process.env.DATABASE_USER || 'postgres';
      const dbPassword = process.env.DATABASE_PASSWORD || '';

      // Windows 系统需要特殊处理环境变量
      const isWindows = process.platform === 'win32';
      let command: string;
      
      if (isWindows) {
        // Windows: 使用完整路径和 SET 命令
        const psqlPath = path.join(this.pgBinPath, 'psql.exe');
        command = `set PGPASSWORD=${dbPassword}&& "${psqlPath}" -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -f "${filePath}"`;
      } else {
        // Linux/Mac: 使用 PGPASSWORD 前缀
        command = `PGPASSWORD="${dbPassword}" psql -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -f "${filePath}"`;
      }

      await execAsync(command);

      this.logger.log(`Database restored successfully from uploaded file`);

      // 删除上传的临时文件
      await fs.unlink(filePath);
    } catch (error) {
      this.logger.error(`Failed to restore from upload: ${error.message}`, error.stack);
      throw error;
    }
  }

  // 获取备份配置
  async getConfig(): Promise<BackupConfig> {
    // 如果有保存的配置,返回保存的配置;否则返回默认配置
    if (this.currentConfig) {
      this.logger.log(`Returning saved config: ${JSON.stringify(this.currentConfig)}`);
      return this.currentConfig;
    }
    
    // 默认配置
    const defaultConfig: BackupConfig = {
      id: 1,
      autoBackup: true,
      backupFrequency: 'daily',
      backupTime: '02:00',
      retentionDays: 30,
      includeUploads: false,
      updatedAt: new Date(),
    };
    
    this.currentConfig = defaultConfig;
    this.logger.log(`Returning default config: ${JSON.stringify(defaultConfig)}`);
    return defaultConfig;
  }

  // 更新备份配置
  async updateConfig(config: BackupConfigDto): Promise<BackupConfig> {
    // 这里应该保存到数据库或配置文件
    this.logger.log(`Backup config updated: ${JSON.stringify(config)}`);

    const updatedConfig: BackupConfig = {
      id: 1,
      autoBackup: config.autoBackup,
      backupFrequency: config.backupFrequency || 'daily',
      backupTime: config.backupTime || '02:00',
      retentionDays: config.retentionDays,
      includeUploads: config.includeUploads,
      updatedAt: new Date(),
    };

    // 更新内存中的配置
    this.currentConfig = updatedConfig;

    // 重新调度备份任务
    this.scheduleBackup(updatedConfig);

    return updatedConfig;
  }

  // 清理过期备份
  async cleanupOldBackups(retentionDays: number): Promise<number> {
    const backups = await this.getBackups();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    let deletedCount = 0;

    for (const backup of backups) {
      if (backup.createdAt < cutoffDate) {
        try {
          await this.deleteBackup(backup.id);
          deletedCount++;
        } catch (error) {
          this.logger.error(`Failed to delete old backup: ${backup.fileName}`, error.stack);
        }
      }
    }

    if (deletedCount > 0) {
      this.logger.log(`Cleaned up ${deletedCount} old backups`);
    }

    return deletedCount;
  }

  // 获取定时任务状态
  getScheduleStatus() {
    if (!this.schedulerRegistry) {
      return {
        isScheduled: false,
        isRunning: false,
        nextRun: null,
        lastRun: null,
        config: this.currentConfig,
      };
    }

    try {
      const job = this.schedulerRegistry.getCronJob('auto-backup');
      return {
        isScheduled: !!job,
        isRunning: job ? true : false,
        nextRun: job ? job.nextDate()?.toJSDate() : null,
        lastRun: null,
        config: this.currentConfig,
      };
    } catch (error) {
      return {
        isScheduled: false,
        isRunning: false,
        nextRun: null,
        lastRun: null,
        config: this.currentConfig,
      };
    }
  }

  // 辅助方法：获取表数量
  private async getTableCount(): Promise<number> {
    try {
      const result = await this.prisma.$queryRaw<any[]>`
        SELECT COUNT(*) as count
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      `;
      return parseInt(result[0].count);
    } catch {
      return 0;
    }
  }

  // 辅助方法：获取记录总数（估算）
  private async getRecordCount(): Promise<number> {
    try {
      const result = await this.prisma.$queryRaw<any[]>`
        SELECT SUM(n_live_tup) as count
        FROM pg_stat_user_tables
      `;
      return parseInt(result[0].count) || 0;
    } catch {
      return 0;
    }
  }

  // 辅助方法：保存备份记录
  private async saveBackupRecord(record: BackupRecord): Promise<void> {
    // 这里可以保存到数据库的备份记录表
    // 暂时只记录日志
    this.logger.log(`Backup record saved: ${JSON.stringify(record)}`);
  }

  // 辅助方法：格式化文件大小
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
}
