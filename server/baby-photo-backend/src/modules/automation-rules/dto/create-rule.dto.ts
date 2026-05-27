import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsArray, IsNumber } from 'class-validator';

export class CreateRuleDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  trigger: string;

  @IsArray()
  @IsOptional()
  conditions?: any[];

  @IsArray()
  @IsNotEmpty()
  actions: any[];

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsNumber()
  @IsOptional()
  sortOrder?: number;
}
