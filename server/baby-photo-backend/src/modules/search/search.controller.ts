import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AdminJwtAuthGuard } from '../auth/guards/admin-jwt-auth.guard';
import { SearchService } from './search.service';

@ApiTags('搜索')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('global')
  @ApiOperation({ summary: '全局搜索(用户/订单/套餐)' })
  @ApiQuery({ name: 'keyword', required: true, description: '关键字(昵称/手机号/订单号/套餐名称)' })
  @ApiQuery({ name: 'limit', required: false, description: '每类返回条数(默认5)' })
  @ApiQuery({ name: 'page', required: false, description: '页码(默认1)' })
  @ApiQuery({ name: 'type', required: false, description: '限定类型: user|order|package|payment (为空表示全部)' })
  async global(
    @Query('keyword') keyword: string,
    @Query('limit') limit?: string,
    @Query('page') page?: string,
    @Query('type') type?: string,
  ) {
    return this.searchService.global({
      keyword,
      limit: limit ? parseInt(limit) : 5,
      page: page ? parseInt(page) : 1,
      type: type || undefined,
    });
  }
}
