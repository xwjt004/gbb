import { PartialType } from '@nestjs/swagger';
import { CreatePackageCategoryDto } from './create-package-category.dto';

export class UpdatePackageCategoryDto extends PartialType(CreatePackageCategoryDto) {}
