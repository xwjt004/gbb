import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { WxFavoriteService } from './wx-favorite.service';
import { ToggleFavoriteDto, CheckFavoriteDto } from './dto/toggle-favorite.dto';
import { WxJwtAuthGuard } from '../wx-auth/guards/wx-jwt-auth.guard';

@ApiTags('微信收藏')
@Controller('wx-favorite')
@UseGuards(WxJwtAuthGuard)
@ApiBearerAuth()
export class WxFavoriteController {
  constructor(private readonly wxFavoriteService: WxFavoriteService) {}

  @Post('toggle')
  @ApiOperation({ summary: '切换收藏状态' })
  @ApiResponse({ status: 201, description: '操作成功' })
  @ApiResponse({ status: 404, description: '套系或商品不存在' })
  async toggle(@Req() req: any, @Body() dto: ToggleFavoriteDto) {
    return this.wxFavoriteService.toggle(req.user.id, dto);
  }

  @Get('mine')
  @ApiOperation({ summary: '获取我的收藏列表' })
  @ApiResponse({ status: 200, description: '返回收藏列表' })
  async getMyFavorites(
    @Req() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.wxFavoriteService.getMyFavorites(
      req.user.id,
      page || 1,
      limit || 10,
    );
  }

  @Get('check')
  @ApiOperation({ summary: '检查是否已收藏' })
  @ApiResponse({ status: 200, description: '返回收藏状态' })
  async check(
    @Req() req: any,
    @Query('packageId') packageId?: string,
    @Query('productId') productId?: string,
  ) {
    const dto: CheckFavoriteDto = {
      packageId: packageId ? Number(packageId) : undefined,
      productId: productId ? Number(productId) : undefined,
    };
    return this.wxFavoriteService.check(req.user.id, dto);
  }

  @Get('batch-check')
  @ApiOperation({ summary: '批量检查收藏状态' })
  @ApiResponse({ status: 200, description: '返回收藏状态映射' })
  async batchCheck(
    @Req() req: any,
    @Query('packageIds') packageIds?: string,
  ) {
    const ids = packageIds
      ? packageIds.split(',').map(Number).filter(Boolean)
      : [];
    return this.wxFavoriteService.batchCheck(req.user.id, ids);
  }
}
