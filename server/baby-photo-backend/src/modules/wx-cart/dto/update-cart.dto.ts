import { IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 更新购物车项 DTO
 */
export class UpdateCartDto {
  @ApiProperty({
    description: '数量',
    example: 2,
    minimum: 1,
  })
  @IsInt({ message: '数量必须是整数' })
  @Min(1, { message: '数量至少为1' })
  quantity: number;
}
