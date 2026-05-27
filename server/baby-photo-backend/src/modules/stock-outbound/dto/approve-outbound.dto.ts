import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApproveOutboundDto {
  @ApiProperty({ description: '是否通过审批', example: true })
  @IsBoolean()
  @IsNotEmpty()
  approved: boolean;

  @ApiPropertyOptional({ description: '审批备注' })
  @IsOptional()
  @IsString()
  note?: string;
}
