import { Controller, Get, Post, Param, Query, Body, ParseIntPipe, DefaultValuePipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AdminJwtAuthGuard } from '../auth/guards/admin-jwt-auth.guard';
import { AutoPurchaseSuggestionService } from './auto-purchase-suggestion.service';

@ApiTags('自动采购建议')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
@Controller('auto-purchase-suggestions')
export class AutoPurchaseSuggestionController {
  constructor(private readonly service: AutoPurchaseSuggestionService) {}

  @Get()
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
    @Query('status') status?: string,
  ) {
    return this.service.findAll(page, pageSize, status);
  }

  @Post(':id/ignore')
  markIgnored(@Param('id') id: string) {
    return this.service.markIgnored(id);
  }

  @Post(':id/convert')
  convertToPO(@Param('id') id: string, @Body('supplierId') supplierId: string) {
    return this.service.convertToPurchaseOrder(id, supplierId);
  }
}
