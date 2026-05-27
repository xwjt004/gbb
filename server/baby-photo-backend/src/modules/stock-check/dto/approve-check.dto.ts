import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsBoolean, IsString, IsOptional } from 'class-validator';

/**
 * 审批盘点单DTO
 */
export class ApproveCheckDto {
  @ApiProperty({ description: '是否批准', example: true })
  @IsNotEmpty({ message: '是否批准不能为空' })
  @IsBoolean({ message: '是否批准必须是布尔值' })
  approved: boolean;

  @ApiProperty({ description: '审批备注', example: '盘点数据准确，同意调整库存', required: false })
  @IsOptional()
  @IsString({ message: '审批备注必须是字符串' })
  note?: string;

  @ApiProperty({ 
    description: '是否自动调整库存', 
    example: true,
    default: true,
    required: false
  })
  @IsOptional()
  @IsBoolean({ message: '是否自动调整库存必须是布尔值' })
  autoAdjust?: boolean;
}
