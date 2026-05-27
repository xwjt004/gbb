import { IsArray, IsString, IsInt, Min, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class DiyItemDto {
  @IsString()
  productId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsString()
  type: 'PHOTO' | 'ALBUM' | 'FRAME' | 'VIDEO' | 'DESIGN' | 'OTHER';
}

export class CalculateDiyDto {
  @IsString()
  name: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DiyItemDto)
  items: DiyItemDto[];

  @IsString()
  @IsOptional()
  notes?: string;
}
