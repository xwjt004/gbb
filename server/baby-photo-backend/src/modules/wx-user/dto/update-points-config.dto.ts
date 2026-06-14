import { IsOptional, IsInt, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePointsConfigDto {
  @ApiPropertyOptional({ description: '上传照片消耗积分', default: 50 })
  @IsOptional()
  @IsInt()
  @Min(0)
  photoUploadCost?: number;

  @ApiPropertyOptional({ description: '上传视频消耗积分', default: 50 })
  @IsOptional()
  @IsInt()
  @Min(0)
  videoUploadCost?: number;

  @ApiPropertyOptional({ description: '播放视频消耗积分', default: 50 })
  @IsOptional()
  @IsInt()
  @Min(0)
  videoPlayCost?: number;

  @ApiPropertyOptional({ description: '1元兑换积分数', default: 1000 })
  @IsOptional()
  @IsInt()
  @Min(1)
  purchaseRate?: number;
}
