import {
  IsOptional,
  IsNumber,
  IsString,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class PaginationDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class UserSearchDto extends PaginationDto {
  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  nickname?: string;

  @IsOptional()
  @IsString()
  fuzzy?: string;
}

export class OrderSearchDto extends PaginationDto {
  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  start_date?: string;

  @IsOptional()
  @IsString()
  end_date?: string;

  @IsOptional()
  @IsEnum(['PENDING', 'PAID', 'PARTIAL', 'REFUNDED', 'FAILED'])
  payment_status?: string;

  @IsOptional()
  @IsString()
  package_name?: string;

  @IsOptional()
  @IsString()
  order_status?: string;
}

export class PackageSearchDto extends PaginationDto {
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  @Min(0)
  min_price?: number;

  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  @Min(0)
  max_price?: number;

  @IsOptional()
  @IsEnum(['price_asc', 'price_desc', 'name_asc', 'name_desc'])
  sort?: string;
}

export class PaymentSearchDto extends PaginationDto {
  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEnum(['PENDING', 'PAID', 'FAILED', 'REFUNDED'])
  status?: string;

  @IsOptional()
  @IsString()
  start_date?: string;

  @IsOptional()
  @IsString()
  end_date?: string;
}

export class AnalyticsTimeRangeDto {
  @IsOptional()
  @IsEnum(['week', 'month', 'quarter', 'year'])
  time_range?: string = 'month';

  @IsOptional()
  @IsString()
  start_date?: string;

  @IsOptional()
  @IsString()
  end_date?: string;
}

export class UserPackageSearchDto extends PaginationDto {
  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  user_id?: string;
}
