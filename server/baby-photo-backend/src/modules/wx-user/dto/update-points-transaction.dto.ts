import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePointsTransactionDto {
  @ApiPropertyOptional({ description: '备注信息' })
  @IsOptional()
  @IsString()
  remark?: string;
}
