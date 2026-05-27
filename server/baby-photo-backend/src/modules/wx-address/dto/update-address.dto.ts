import { PartialType } from '@nestjs/swagger';
import { CreateAddressDto } from './create-address.dto';

/**
 * 更新收货地址 DTO
 * 所有字段都是可选的
 */
export class UpdateAddressDto extends PartialType(CreateAddressDto) {}
