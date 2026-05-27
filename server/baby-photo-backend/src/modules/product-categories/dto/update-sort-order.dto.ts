import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

class SortItem {
  @ApiProperty({ description: '分类ID', example: 1 })
  @IsInt()
  id: number;

  @ApiProperty({ description: '排序值', example: 1 })
  @IsInt()
  sortOrder: number;
}

export class UpdateSortOrderDto {
  @ApiProperty({ 
    description: '排序数据', 
    type: [SortItem],
    example: [
      { id: 1, sortOrder: 1 },
      { id: 2, sortOrder: 2 }
    ]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SortItem)
  items: SortItem[];
}
