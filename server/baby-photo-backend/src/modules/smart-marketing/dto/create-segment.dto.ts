import { Allow } from 'class-validator';

export class CreateSegmentDto {
  @Allow()
  name: string;

  @Allow()
  description?: string;

  @Allow()
  rules: Record<string, any>[];
}

export class UpdateSegmentDto {
  @Allow()
  name?: string;

  @Allow()
  description?: string;

  @Allow()
  rules?: Record<string, any>[];

  @Allow()
  status?: string;
}
