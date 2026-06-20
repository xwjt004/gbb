import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import * as QRCode from 'qrcode';
import { GroupBuyService } from './group-buy.service';
import { StartGroupBuyDto } from './dto/start-group-buy.dto';
import { AdminCreateGroupBuyDto } from './dto/admin-create-group-buy.dto';
import { UpdateGroupBuyDto } from './dto/update-group-buy.dto';
import { QueryGroupBuyDto } from './dto/query-group-buy.dto';
import { CreateGroupBuyTierDto, UpdateGroupBuyTierDto } from './dto/group-buy-tier.dto';
import { WxJwtAuthGuard } from '../wx-auth/guards/wx-jwt-auth.guard';
import { AdminJwtAuthGuard } from '../auth/guards/admin-jwt-auth.guard';
import { Public } from '../../shared/decorators/public.decorator';
import { WxAuthService } from '../wx-auth/wx-auth.service';

@ApiTags('团购管理')
@Controller('group-buy')
export class GroupBuyController {
  constructor(
    private readonly groupBuyService: GroupBuyService,
    private readonly wxAuthService: WxAuthService,
  ) {}

  // ==================== 小程序端 ====================

  @Post('start')
  @UseGuards(WxJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '开团（小程序端）' })
  async start(@Req() req: any, @Body() dto: StartGroupBuyDto) {
    const wxUserId = req.user?.wxUserId || req.user?.id;
    return this.groupBuyService.start(wxUserId, dto);
  }

  @Post(':id/join')
  @UseGuards(WxJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '参团（小程序端）' })
  async join(@Param('id') id: string, @Req() req: any) {
    const wxUserId = req.user?.wxUserId || req.user?.id;
    return this.groupBuyService.join(id, wxUserId);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: '获取团购详情（无需登录）' })
  async getDetail(@Param('id') id: string) {
    return this.groupBuyService.getDetail(id);
  }

  @Get('user/my')
  @UseGuards(WxJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '我参与的团购（小程序端）' })
  async myActivities(@Req() req: any) {
    const wxUserId = req.user?.wxUserId || req.user?.id;
    return this.groupBuyService.getUserActivities(wxUserId);
  }

  @Post(':id/leave')
  @UseGuards(WxJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '退团（小程序端，仅非团长）' })
  async leave(@Param('id') id: string, @Req() req: any) {
    const wxUserId = req.user?.wxUserId || req.user?.id;
    return this.groupBuyService.leave(id, wxUserId);
  }

  @Public()
  @Get(':id/qrcode')
  @ApiOperation({ summary: '获取团购小程序码（扫码跳转团购详情）' })
  async getQrCode(@Param('id') id: string, @Res() res: Response) {
    // UUID 共 36 字符（含横线），去横线后 32 字节，正好满足微信 scene 参数 32 字节限制
    const scene = id.replace(/-/g, '');
    const imageBuffer = await this.wxAuthService.generateWxaCode(scene, 'pages/group-buy/detail/detail');
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(imageBuffer);
  }

  @Public()
  @Get(':id/qrcode/standard')
  @ApiOperation({ summary: '获取团购标准二维码（微信扫码跳转）' })
  async getStandardQrCode(@Param('id') id: string, @Res() res: Response) {
    // 普通 URL 链接，配合微信"扫普通链接二维码打开小程序"功能跳转小程序
    const url = `https://guaibaobao.cn/s/group-buy/${id}`;
    const qrBuffer = await QRCode.toBuffer(url, {
      type: 'png',
      width: 280,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    });
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(qrBuffer);
  }

  // ==================== 后台管理 ====================

  @UseGuards(AdminJwtAuthGuard)
  @ApiBearerAuth()
  @Get('admin/list')
  @ApiOperation({ summary: '团购活动列表（后台管理）' })
  async getList(@Query() query: QueryGroupBuyDto) {
    return this.groupBuyService.getList(query);
  }

  @UseGuards(AdminJwtAuthGuard)
  @ApiBearerAuth()
  @Get('admin/stats')
  @ApiOperation({ summary: '团购数据统计（后台管理）' })
  async getStats() {
    return this.groupBuyService.getStats();
  }

  @UseGuards(AdminJwtAuthGuard)
  @ApiBearerAuth()
  @Patch('admin/:id/cancel')
  @ApiOperation({ summary: '取消/过期团购活动（后台管理）' })
  async cancel(@Param('id') id: string) {
    return this.groupBuyService.cancel(id);
  }

  @UseGuards(AdminJwtAuthGuard)
  @ApiBearerAuth()
  @Patch('admin/:id/restore')
  @ApiOperation({ summary: '恢复已撤销的团购（后台管理）' })
  async restore(@Param('id') id: string) {
    return this.groupBuyService.adminRestore(id);
  }

  @UseGuards(AdminJwtAuthGuard)
  @ApiBearerAuth()
  @Delete('admin/:id')
  @ApiOperation({ summary: '删除团购活动（后台管理）' })
  async delete(@Param('id') id: string) {
    return this.groupBuyService.adminDelete(id);
  }

  @UseGuards(AdminJwtAuthGuard)
  @ApiBearerAuth()
  @Patch('admin/:id')
  @ApiOperation({ summary: '编辑团购（后台管理）' })
  async update(@Param('id') id: string, @Body() dto: UpdateGroupBuyDto) {
    return this.groupBuyService.adminUpdate(id, dto);
  }

  @UseGuards(AdminJwtAuthGuard)
  @ApiBearerAuth()
  @Post('admin/create')
  @ApiOperation({ summary: '手动创建团购（后台管理）' })
  async adminCreate(@Body() dto: AdminCreateGroupBuyDto) {
    return this.groupBuyService.adminCreate(dto);
  }

  // ==================== 阶梯价格管理 ====================

  @UseGuards(AdminJwtAuthGuard)
  @ApiBearerAuth()
  @Get('admin/tiers/package/:packageId')
  @ApiOperation({ summary: '获取套餐阶梯团购价列表（后台管理）' })
  async getPackageTiers(@Param('packageId') packageId: string) {
    return this.groupBuyService.getTiers('package', Number(packageId));
  }

  @UseGuards(AdminJwtAuthGuard)
  @ApiBearerAuth()
  @Post('admin/tiers/package/:packageId')
  @ApiOperation({ summary: '添加套餐阶梯团购价（后台管理）' })
  async addPackageTier(@Param('packageId') packageId: string, @Body() dto: CreateGroupBuyTierDto) {
    return this.groupBuyService.addTier('package', Number(packageId), dto);
  }

  @UseGuards(AdminJwtAuthGuard)
  @ApiBearerAuth()
  @Get('admin/tiers/product/:productId')
  @ApiOperation({ summary: '获取商品阶梯团购价列表（后台管理）' })
  async getProductTiers(@Param('productId') productId: string) {
    return this.groupBuyService.getTiers('product', Number(productId));
  }

  @UseGuards(AdminJwtAuthGuard)
  @ApiBearerAuth()
  @Post('admin/tiers/product/:productId')
  @ApiOperation({ summary: '添加商品阶梯团购价（后台管理）' })
  async addProductTier(@Param('productId') productId: string, @Body() dto: CreateGroupBuyTierDto) {
    return this.groupBuyService.addTier('product', Number(productId), dto);
  }

  @UseGuards(AdminJwtAuthGuard)
  @ApiBearerAuth()
  @Patch('admin/tiers/:tierId')
  @ApiOperation({ summary: '更新阶梯团购价（后台管理）' })
  async updateTier(@Param('tierId') tierId: string, @Body() dto: UpdateGroupBuyTierDto) {
    return this.groupBuyService.updateTier(Number(tierId), dto);
  }

  @UseGuards(AdminJwtAuthGuard)
  @ApiBearerAuth()
  @Delete('admin/tiers/:tierId')
  @ApiOperation({ summary: '删除阶梯团购价（后台管理）' })
  async deleteTier(@Param('tierId') tierId: string) {
    return this.groupBuyService.deleteTier(Number(tierId));
  }
}
