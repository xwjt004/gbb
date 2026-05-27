import { Allow } from 'class-validator';

export class TrackEventDto {
  @Allow()
  campaignId: string;

  @Allow()
  wxUserId: string;

  @Allow()
  event: string;

  @Allow()
  orderId?: string;

  @Allow()
  metadata?: Record<string, any>;
}
