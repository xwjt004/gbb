import { Transform } from 'class-transformer';
import { IsInt, IsString, IsEnum, IsOptional, IsDateString, Min, Max } from 'class-validator';

export class QueryTransferDto {
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  pageSize?: number = 10;

  @IsEnum(['PENDING', 'APPROVED', 'REJECTED', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED'])
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  fromWarehouse?: string;

  @IsString()
  @IsOptional()
  toWarehouse?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @IsOptional()
  productId?: number;

  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @IsOptional()
  submitterId?: number;
}
