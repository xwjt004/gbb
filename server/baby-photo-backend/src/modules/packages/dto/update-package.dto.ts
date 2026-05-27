import { PartialType } from '@nestjs/mapped-types';
import { CreatePackageDto } from './create-package.dto';
import { IsOptional, IsString } from 'class-validator';

export class UpdatePackageDto extends PartialType(CreatePackageDto) {
	@IsOptional()
	@IsString()
	status?: string;
}
