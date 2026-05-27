import { PartialType } from '@nestjs/mapped-types';
import { CreateSeasonalPriceDto } from './create-seasonal-price.dto';

export class UpdateSeasonalPriceDto extends PartialType(CreateSeasonalPriceDto) {}
