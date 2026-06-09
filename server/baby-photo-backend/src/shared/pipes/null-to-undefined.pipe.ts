import { PipeTransform, Injectable } from '@nestjs/common';

/**
 * 将请求体中的 null 值转换为 undefined
 * class-validator 的 @IsOptional() 只跳过 undefined，不跳过 null
 * 前端提交空字段时常发 null，这个 pipe 在验证前做一层兼容
 */
@Injectable()
export class NullToUndefinedPipe implements PipeTransform {
  transform(value: any) {
    if (typeof value === 'object' && value !== null) {
      Object.keys(value).forEach(key => {
        if (value[key] === null) {
          value[key] = undefined;
        }
      });
    }
    return value;
  }
}
