import { Test, TestingModule } from '@nestjs/testing';
import { AppService } from './app.service';
import { PrismaService } from './shared/prisma/prisma.service';
import { createMockPrismaService } from './shared/prisma/prisma.mock';

describe('AppService', () => {
  let service: AppService;
  let prisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(async () => {
    prisma = createMockPrismaService();
    prisma.$queryRaw.mockResolvedValue([{ 1: 1 }]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AppService>(AppService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getHello', () => {
    it('should return welcome message', () => {
      const result = service.getHello();
      expect(result).toContain('乖宝宝儿童影楼管理系统');
    });
  });

  describe('getHealth', () => {
    it('should return ok when database is connected', async () => {
      const result = await service.getHealth();

      expect(result.status).toBe('ok');
      expect(result.message).toBe('系统运行正常');
      expect(result.services.database).toBe('connected');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('uptime');
      expect(result).toHaveProperty('version');
      expect(result).toHaveProperty('environment');
    });

    it('should return degraded when database fails', async () => {
      prisma.$queryRaw.mockRejectedValueOnce(new Error('Connection refused'));

      const result = await service.getHealth();

      expect(result.status).toBe('degraded');
      expect(result.message).toBe('数据库连接异常');
      expect(result.services.database).toBe('disconnected');
    });
  });

  describe('getVersion', () => {
    it('should return version information', () => {
      const result = service.getVersion();

      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('version');
      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('startupTime');
      expect(result).toHaveProperty('nodeVersion');
      expect(result).toHaveProperty('platform');
    });
  });
});
