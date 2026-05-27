import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let controller: AppController;
  let service: AppService;

  const mockAppService = {
    getHello: jest.fn().mockReturnValue('🎉 欢迎使用乖宝宝儿童影楼管理系统！'),
    getHealth: jest.fn().mockResolvedValue({
      status: 'ok',
      message: '系统运行正常',
      timestamp: new Date().toISOString(),
      uptime: '100秒',
      version: '1.0.0',
      environment: 'test',
      services: { database: 'connected', redis: 'disconnected', disk: {} },
    }),
    getVersion: jest.fn().mockReturnValue({
      name: '乖宝宝儿童影楼管理系统',
      version: '1.0.0',
      description: '专业的婴儿摄影工作室管理解决方案',
      startupTime: new Date().toISOString(),
      nodeVersion: process.version,
      platform: process.platform,
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [{ provide: AppService, useValue: mockAppService }],
    }).compile();

    controller = module.get<AppController>(AppController);
    service = module.get<AppService>(AppService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getHello', () => {
    it('should return welcome message', () => {
      const result = controller.getHello();
      expect(result).toContain('乖宝宝');
      expect(mockAppService.getHello).toHaveBeenCalled();
    });
  });

  describe('getHealth', () => {
    it('should return health status', async () => {
      const result = await controller.getHealth();
      expect(result.status).toBe('ok');
      expect(result.services.database).toBe('connected');
      expect(mockAppService.getHealth).toHaveBeenCalled();
    });
  });

  describe('getVersion', () => {
    it('should return version info', () => {
      const result = controller.getVersion();
      expect(result).toHaveProperty('version');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('nodeVersion');
      expect(mockAppService.getVersion).toHaveBeenCalled();
    });
  });
});
