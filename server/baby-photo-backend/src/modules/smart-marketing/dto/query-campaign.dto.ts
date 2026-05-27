import { Allow } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryCampaignDto {
  @Type(() => Number)
  @Allow()
  page?: number;

  @Type(() => Number)
  @Allow()
  pageSize?: number;

  @Allow()
  name?: string;

  @Allow()
  status?: string;

  @Allow()
  campaignType?: string;
}
