import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './shared/prisma/prisma.service';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as net from 'net';

const START_TIME = new Date().toISOString();
const PKG = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8'),
);

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(private readonly prisma: PrismaService) {}

  getHello(): string {
    return '🎉 欢迎使用乖宝宝儿童影楼管理系统！';
  }

  async getHealth() {
    const currentTime = new Date().toISOString();
    const uptime = process.uptime();

    let dbStatus = 'disconnected';
    let redisStatus = 'disconnected';
    let diskStatus: { total?: string; used?: string; free?: string; usagePercent?: number } = {};

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
    } catch (e) {
      this.logger.error(`数据库健康检查失败: ${e.message}`);
    }

    try {
      // 通过 TCP 连接检测 Redis 是否可用（无需密码，仅验证端口可达）
      const host = process.env.REDIS_HOST || 'localhost';
      const port = parseInt(process.env.REDIS_PORT || '6379', 10);
      await new Promise<void>((resolve, reject) => {
        const socket = net.createConnection(port, host, () => {
          socket.destroy();
          resolve();
        });
        socket.on('error', reject);
        socket.setTimeout(2000, () => {
          socket.destroy();
          reject(new Error('timeout'));
        });
      });
      redisStatus = 'connected';
    } catch (e) {
      // Redis 不可用不报错
    }

    try {
      const df = execSync('df -k / | tail -1', { encoding: 'utf8', timeout: 3000 });
      const parts = df.trim().split(/\s+/);
      if (parts.length >= 4) {
        const totalKb = parseInt(parts[1]) || 0;
        const usedKb = parseInt(parts[2]) || 0;
        const freeKb = parseInt(parts[3]) || 0;
        diskStatus = {
          total: `${(totalKb / 1024 / 1024).toFixed(1)}GB`,
          used: `${(usedKb / 1024 / 1024).toFixed(1)}GB`,
          free: `${(freeKb / 1024 / 1024).toFixed(1)}GB`,
          usagePercent: totalKb > 0 ? Math.round((usedKb / totalKb) * 100) : 0,
        };
      }
    } catch (e) {
      // 非 Linux 环境跳过磁盘检查
    }

    return {
      status: dbStatus === 'connected' ? 'ok' : 'degraded',
      message: dbStatus === 'connected' ? '系统运行正常' : '数据库连接异常',
      timestamp: currentTime,
      uptime: `${Math.floor(uptime)}秒`,
      version: PKG.version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: dbStatus,
        redis: redisStatus,
        disk: diskStatus,
      },
    };
  }

  getVersion() {
    return {
      name: PKG.name || '乖宝宝儿童影楼管理系统',
      version: PKG.version || '1.0.0',
      description: PKG.description || '专业的婴儿摄影工作室管理解决方案',
      startupTime: START_TIME,
      nodeVersion: process.version,
      platform: process.platform,
    };
  }
}
