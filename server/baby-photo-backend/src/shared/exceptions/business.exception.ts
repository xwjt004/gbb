import { HttpException, HttpStatus } from '@nestjs/common';

export class BusinessException extends HttpException {
  constructor(
    message: string,
    code: number = HttpStatus.BAD_REQUEST,
    public readonly errorCode?: string,
  ) {
    super({ message, errorCode, statusCode: code }, code);
  }
}

export class NotFoundException extends BusinessException {
  constructor(msg = '资源不存在') {
    super(msg, HttpStatus.NOT_FOUND, 'NOT_FOUND');
  }
}

export class ConflictException extends BusinessException {
  constructor(msg = '资源冲突') {
    super(msg, HttpStatus.CONFLICT, 'CONFLICT');
  }
}

export class ValidateException extends BusinessException {
  constructor(msg = '参数校验失败') {
    super(msg, HttpStatus.UNPROCESSABLE_ENTITY, 'VALIDATE_FAILED');
  }
}

export class UnauthorizedException extends BusinessException {
  constructor(msg = '未授权访问') {
    super(msg, HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED');
  }
}

export class ForbiddenException extends BusinessException {
  constructor(msg = '权限不足') {
    super(msg, HttpStatus.FORBIDDEN, 'FORBIDDEN');
  }
}
