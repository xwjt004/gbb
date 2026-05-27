import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsEnum, IsNotEmpty, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateStockDto {
  @ApiProperty({ description: '数量', example: 50 })
  @IsInt({ message: '数量必须是整数' })
  @IsNotEmpty({ message: '数量不能为空' })
  @Min(0)
  @Type(() => Number)
  quantity: number;

  @ApiProperty({ 
    description: '操作类型', 
    enum: ['ADD', 'SUBTRACT', 'SET'],
    example: 'ADD'
  })
  @IsEnum(['ADD', 'SUBTRACT', 'SET'])
  @IsNotEmpty({ message: '操作类型不能为空' })
  operation: 'ADD' | 'SUBTRACT' | 'SET';
}
