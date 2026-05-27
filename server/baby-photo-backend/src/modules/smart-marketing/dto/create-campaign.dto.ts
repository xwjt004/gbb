import { Allow } from 'class-validator';

export class CreateCampaignDto {
  @Allow()
  name: string;

  @Allow()
  description?: string;

  @Allow()
  segmentId?: string;

  @Allow()
  campaignType: string;

  @Allow()
  couponId?: string;

  @Allow()
  title?: string;

  @Allow()
  content?: string;

  @Allow()
  scheduledAt?: string;
}

export class UpdateCampaignDto {
  @Allow()
  name?: string;

  @Allow()
  description?: string;

  @Allow()
  segmentId?: string;

  @Allow()
  campaignType?: string;

  @Allow()
  couponId?: string;

  @Allow()
  title?: string;

  @Allow()
  content?: string;

  @Allow()
  scheduledAt?: string;

  @Allow()
  status?: string;
}
