import { PartialType } from '@nestjs/swagger';
import { CreateOutboundDto } from './create-outbound.dto';

export class UpdateOutboundDto extends PartialType(CreateOutboundDto) {}
