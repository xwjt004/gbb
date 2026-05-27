import { IsString, IsOptional, IsEnum, IsInt, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class QuerySupplierDto {
  @IsString()
  @IsOptional()
  supplierNo?: string; // 供应商编号

  @IsString()
  @IsOptional()
  name?: string; // 供应商名称（模糊查询）

  @IsString()
  @IsOptional()
  contactPerson?: string; // 联系人（模糊查询）

  @IsString()
  @IsOptional()
  contactPhone?: string; // 联系电话

  @IsEnum(['PRODUCT', 'SERVICE', 'BOTH'])
  @IsOptional()
  supplierType?: string; // 供应商类型

  @IsString()
  @IsOptional()
  category?: string; // 供应商类别

  @IsEnum(['ACTIVE', 'INACTIVE', 'BLACKLIST'])
  @IsOptional()
  status?: string; // 状态

  @IsEnum(['A+', 'A', 'B', 'C', 'D'])
  @IsOptional()
  creditLevel?: string; // 信用等级

  @IsDateString()
  @IsOptional()
  startDate?: string; // 创建开始日期

  @IsDateString()
  @IsOptional()
  endDate?: string; // 创建结束日期

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  page?: number = 1; // 页码

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  pageSize?: number = 20; // 每页数量

  @IsString()
  @IsOptional()
  sortBy?: string = 'createdAt'; // 排序字段

  @IsEnum(['asc', 'desc'])
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'desc'; // 排序方向
}
