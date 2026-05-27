import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateComplaintDto {
  @ApiProperty({ description: '微信用户 ID' })
  @IsNotEmpty({ message: '客户不能为空' })
  @IsString()
  wxUserId: string;

  @ApiProperty({ description: '关联订单 ID', required: false })
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiProperty({ description: '投诉标题' })
  @IsNotEmpty({ message: '投诉标题不能为空' })
  @IsString()
  title: string;

  @ApiProperty({ description: '投诉描述' })
  @IsNotEmpty({ message: '投诉描述不能为空' })
  @IsString()
  description: string;

  @ApiProperty({ description: '优先级', default: 'NORMAL' })
  @IsOptional()
  @IsString()
  priority?: string;
}
