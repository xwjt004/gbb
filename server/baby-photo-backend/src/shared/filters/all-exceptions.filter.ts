import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { BusinessException } from '../exceptions/business.exception';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  async catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = '服务器内部错误';
    let errorCode: string | undefined;

    if (exception instanceof BusinessException) {
      const res = exception.getResponse() as any;
      status = exception.getStatus();
      message = res.message || message;
      errorCode = res.errorCode;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object') {
        const obj = res as any;
        message = Array.isArray(obj.message)
          ? obj.message.join('; ')
          : obj.message || message;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    if (status >= 500) {
      this.logger.error(
        `[${request.method}] ${request.url} - ${status}: ${message}`,
        exception instanceof Error ? exception.stack : '',
      );
      if (process.env.SENTRY_DSN) {
        const Sentry = await import('@sentry/node');
        Sentry.captureException(exception);
      }
    } else if (status >= 400) {
      this.logger.warn(
        `[${request.method}] ${request.url} - ${status}: ${message}`,
      );
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      ...(errorCode && { errorCode }),
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
