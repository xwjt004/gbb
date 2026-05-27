import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './shared/filters/all-exceptions.filter';
import { RolesService } from './modules/roles/roles.service';
import { validateEnv } from './shared/config/env-validator';
import * as Sentry from '@sentry/node';

async function bootstrap() {
  validateEnv();

  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
    });
  }

  const logger = new Logger('Bootstrap');

  try {
    const app = await NestFactory.create(AppModule);

    // 安全启动检查：生产环境禁止使用默认密钥
    if (
      process.env.NODE_ENV === 'production' &&
      (!process.env.JWT_SECRET ||
        process.env.JWT_SECRET === 'change-me-in-production' ||
        process.env.JWT_SECRET === 'your-super-secret-jwt-key-change-this-in-production')
    ) {
      throw new Error(
        'JWT_SECRET 仍为默认值，请在 .env 中设置一个安全的随机密钥后再启动生产环境',
      );
    }

    // CORS 配置 — 从环境变量读取（逗号分隔），支持部署时动态配置
    const corsOrigin = process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim())
      : [
          'http://localhost:3000',
          'http://localhost:3001',
          'http://127.0.0.1:3001',
          'http://localhost:8080',
        ];

    app.enableCors({
      origin: corsOrigin,
      credentials: true,
    });

    // 全局异常过滤器 — 统一错误响应格式
    app.useGlobalFilters(new AllExceptionsFilter());

    // 全局验证管道
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        disableErrorMessages: process.env.NODE_ENV === 'production',
        enableDebugMessages: process.env.NODE_ENV !== 'production',
      }),
    );

    // API 版本前缀
    app.setGlobalPrefix('api/v1');

    // Swagger 文档 — 仅开发环境开启
    if (process.env.NODE_ENV !== 'production') {
      const config = new DocumentBuilder()
        .setTitle('乖宝宝儿童影楼管理系统 API')
        .setDescription('婴儿摄影工作室管理系统的后端 API 文档')
        .setVersion('1.0.0')
        .addTag('users', '用户管理')
        .addTag('packages', '套餐管理')
        .addTag('orders', '订单管理')
        .addTag('payments', '支付管理')
        .addTag('time-slots', '时间槽管理')
        .addBearerAuth()
        .build();

      const document = SwaggerModule.createDocument(app, config);
      SwaggerModule.setup('api/docs', app, document, {
        swaggerOptions: {
          persistAuthorization: true,
        },
      });
    }

    // 初始化默认角色
    const rolesService = app.get(RolesService);
    await rolesService.seedDefaultRoles();

    const port = process.env.PORT || 3000;
    // Docker 环境始终监听 0.0.0.0，nginx 反向代理处理外部访问
    const listenHost = '0.0.0.0';
    await app.listen(port, listenHost);

    logger.log(`服务启动成功`);
    logger.log(`服务地址: http://localhost:${port}`);
    logger.log(`监听地址: ${listenHost} (Docker + nginx 反向代理)`);
    if (process.env.NODE_ENV !== 'production') {
      logger.log(`API 文档: http://localhost:${port}/api/docs`);
    }
    logger.log(`健康检查: http://localhost:${port}/api/v1/health`);
  } catch (error) {
    logger.error('启动应用失败:', error);
    process.exit(1);
  }
}

// 启动应用
void bootstrap();
