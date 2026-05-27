import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/shared/prisma/prisma.service';
import { createMockPrismaService } from '../src/shared/prisma/prisma.mock';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let prisma: ReturnType<typeof createMockPrismaService>;

  beforeAll(async () => {
    prisma = createMockPrismaService();
    prisma.$queryRaw.mockResolvedValue([{ 1: 1 }]);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/v1', () => {
    it('should return welcome message', () => {
      return request(app.getHttpServer())
        .get('/api/v1')
        .expect(200)
        .expect((res) => {
          expect(res.text).toContain('乖宝宝');
        });
    });
  });

  describe('GET /api/v1/health', () => {
    it('should return ok status', () => {
      return request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('ok');
          expect(res.body.services.database).toBe('connected');
          expect(res.body).toHaveProperty('timestamp');
          expect(res.body).toHaveProperty('uptime');
          expect(res.body).toHaveProperty('version');
        });
    });

    it('should return degraded when database is down', async () => {
      prisma.$queryRaw.mockRejectedValueOnce(new Error('DB down'));

      return request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('degraded');
          expect(res.body.services.database).toBe('disconnected');
        });
    });
  });

  describe('GET /api/v1/version', () => {
    it('should return version info', () => {
      return request(app.getHttpServer())
        .get('/api/v1/version')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('name');
          expect(res.body).toHaveProperty('version');
          expect(res.body).toHaveProperty('nodeVersion');
          expect(res.body).toHaveProperty('platform');
        });
    });
  });
});
