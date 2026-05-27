import { IsString, IsOptional, IsBoolean, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum BackupFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

export class CreateBackupDto {
  @ApiPropertyOptional({ description: '备份说明' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '是否包含上传文件', default: false })
  @IsOptional()
  @IsBoolean()
  includeUploads?: boolean;
}

export class BackupConfigDto {
  @ApiProperty({ description: '是否启用自动备份' })
  @IsBoolean()
  autoBackup: boolean;

  @ApiPropertyOptional({ description: '备份频率', enum: BackupFrequency })
  @IsOptional()
  @IsEnum(BackupFrequency)
  backupFrequency?: BackupFrequency;

  @ApiPropertyOptional({ description: '备份时间，格式：HH:mm' })
  @IsOptional()
  @IsString()
  backupTime?: string;

  @ApiProperty({ description: '保留天数' })
  @IsNumber()
  @Min(1)
  @Max(365)
  retentionDays: number;

  @ApiProperty({ description: '是否包含上传文件' })
  @IsBoolean()
  includeUploads: boolean;
}

export class RestoreBackupDto {
  @ApiProperty({ description: '备份文件ID' })
  @IsString()
  backupId: string;
}
