import { IsInt, IsString, IsOptional, Min } from 'class-validator';

export class CreateTransferDto {
  @IsInt()
  @Min(1, { message: '商品ID必须大于0' })
  productId: number;

  @IsInt()
  @Min(1, { message: '调拨数量必须大于0' })
  quantity: number;

  @IsString()
  @IsOptional()
  fromWarehouse?: string = 'MAIN';

  @IsString()
  @IsOptional()
  toWarehouse?: string = 'BRANCH';

  @IsString()
  @IsOptional()
  reason?: string;
}
