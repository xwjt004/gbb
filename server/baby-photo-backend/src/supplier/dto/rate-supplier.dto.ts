import { IsNumber, IsNotEmpty, IsString, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class RateSupplierDto {
  @IsString()
  @IsNotEmpty()
  supplierId: string; // 供应商ID

  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  rating: number; // 分页累计平均 1-5

  @IsString()
  @IsOptional()
  remark?: string; // 评价备注
}
