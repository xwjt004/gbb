import { Controller, Get, Post, Param, Query, Body, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { AutoPurchaseSuggestionService } from './auto-purchase-suggestion.service';

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
