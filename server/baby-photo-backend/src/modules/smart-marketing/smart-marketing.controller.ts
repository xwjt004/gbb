import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AdminJwtAuthGuard } from '../auth/guards/admin-jwt-auth.guard';
import { SmartMarketingService } from './smart-marketing.service';
import { CreateSegmentDto, UpdateSegmentDto } from './dto/create-segment.dto';
import { QuerySegmentDto } from './dto/query-segment.dto';
import { CreateCampaignDto, UpdateCampaignDto } from './dto/create-campaign.dto';
import { QueryCampaignDto } from './dto/query-campaign.dto';
import { TrackEventDto } from './dto/track-event.dto';

@ApiTags('智能营销')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
@Controller('smart-marketing')
export class SmartMarketingController {
  constructor(private readonly service: SmartMarketingService) {}

  // ==================== 客户分群 ====================

  @Get('segments')
  findSegments(@Query() query: QuerySegmentDto) {
    return this.service.findSegments(query);
  }

  @Post('segments')
  createSegment(@Body() dto: CreateSegmentDto) {
    return this.service.createSegment(dto);
  }

  @Get('segments/presets')
  getPresetSegments() {
    return this.service.getPresetSegments();
  }

  @Get('segments/:id')
  findSegment(@Param('id') id: string) {
    return this.service.findSegment(id);
  }

  @Patch('segments/:id')
  updateSegment(@Param('id') id: string, @Body() dto: UpdateSegmentDto) {
    return this.service.updateSegment(id, dto);
  }

  @Delete('segments/:id')
  removeSegment(@Param('id') id: string) {
    return this.service.removeSegment(id);
  }

  @Get('segments/:id/members')
  getSegmentMembers(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.service.getSegmentMembers(id, Number(page) || 1, Number(pageSize) || 20);
  }

  @Post('segments/:id/refresh')
  refreshSegment(@Param('id') id: string) {
    return this.service.refreshSegmentMemberCount(id);
  }

  // ==================== 营销活动 ====================

  @Get('campaigns')
  findCampaigns(@Query() query: QueryCampaignDto) {
    return this.service.findCampaigns(query);
  }

  @Post('campaigns')
  createCampaign(@Body() dto: CreateCampaignDto) {
    return this.service.createCampaign(dto);
  }

  @Get('campaigns/:id')
  findCampaign(@Param('id') id: string) {
    return this.service.findCampaign(id);
  }

  @Patch('campaigns/:id')
  updateCampaign(@Param('id') id: string, @Body() dto: UpdateCampaignDto) {
    return this.service.updateCampaign(id, dto);
  }

  @Delete('campaigns/:id')
  removeCampaign(@Param('id') id: string) {
    return this.service.removeCampaign(id);
  }

  @Post('campaigns/:id/send')
  sendCampaign(@Param('id') id: string) {
    return this.service.sendCampaign(id);
  }

  @Get('campaigns/:id/funnel')
  getCampaignFunnel(@Param('id') id: string) {
    return this.service.getCampaignFunnel(id);
  }

  // ==================== 事件追踪 ====================

  @Post('tracks')
  trackEvent(@Body() dto: TrackEventDto) {
    return this.service.trackEvent(dto);
  }
}
