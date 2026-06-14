import { Controller, Get, Post, Body, Patch, Param, Query, Delete, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { WxUserService } from './wx-user.service';
import { QueryWxUserDto } from './dto/query-wx-user.dto';
import { UpdateWxUserDto } from './dto/update-wx-user.dto';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';
import { UpdatePointsConfigDto } from './dto/update-points-config.dto';
import { QueryPointsTransactionsDto } from './dto/query-points-transactions.dto';
import { UpdatePointsTransactionDto } from './dto/update-points-transaction.dto';
import { WxAddressService } from '../wx-address/wx-address.service';

@ApiTags('客户管理')
@Controller('wx-users')
export class WxUserController {
  private readonly logger = new Logger(WxUserController.name);

  constructor(
    private readonly wxUserService: WxUserService,
    private readonly wxAddressService: WxAddressService,
  ) {}

  @Get('stats/overview')
  @ApiOperation({ summary: '客户统计概览' })
  async getStats() {
    return this.wxUserService.getStats();
  }

  // ==================== 积分配置（必须放在 :id 路由之前） ====================

  @Get('points-config')
  @ApiOperation({ summary: '获取积分配置' })
  async getPointsConfig() {
    return this.wxUserService.getPointsConfig();
  }

  @Patch('points-config')
  @ApiOperation({ summary: '更新积分配置（后台管理）' })
  async updatePointsConfig(
    @Body() dto: UpdatePointsConfigDto,
  ) {
    return this.wxUserService.updatePointsConfig(dto);
  }

  // ==================== 积分交易管理（全局） ====================

  @Get('points-transactions')
  @ApiOperation({ summary: '获取积分交易记录列表（分页）' })
  async listPointsTransactions(@Query() dto: QueryPointsTransactionsDto) {
    return this.wxUserService.listPointsTransactions(dto);
  }

  @Delete('points-transactions/:id')
  @ApiOperation({ summary: '删除积分交易记录（自动反转余额）' })
  async deletePointsTransaction(@Param('id') id: string) {
    return this.wxUserService.deletePointsTransaction(id);
  }

  @Patch('points-transactions/:id')
  @ApiOperation({ summary: '更新积分交易备注' })
  async updatePointsTransaction(@Param('id') id: string, @Body() dto: UpdatePointsTransactionDto) {
    return this.wxUserService.updatePointsTransaction(id, dto);
  }

  @Get()
  @ApiOperation({ summary: '获取客户列表（分页）' })
  async findAll(@Query() query: QueryWxUserDto) {
    return this.wxUserService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取客户详情' })
  async findOne(@Param('id') id: string) {
    return this.wxUserService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新客户信息' })
  async update(@Param('id') id: string, @Body() dto: UpdateWxUserDto) {
    return this.wxUserService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除客户' })
  async remove(@Param('id') id: string) {
    return this.wxUserService.remove(id);
  }

  // ==================== 成长里程碑 ====================

  @Get(':id/milestones')
  @ApiOperation({ summary: '获取客户的幸福空间记录' })
  async getMilestones(@Param('id') id: string) {
    return this.wxUserService.getMilestones(id);
  }

  @Post(':id/milestones')
  @ApiOperation({ summary: '新增幸福空间记录' })
  async createMilestone(@Param('id') id: string, @Body() dto: CreateMilestoneDto) {
    return this.wxUserService.createMilestone(id, dto);
  }

  @Patch(':id/milestones/:milestoneId')
  @ApiOperation({ summary: '更新幸福空间记录' })
  async updateMilestone(@Param('id') id: string, @Param('milestoneId') milestoneId: string, @Body() dto: UpdateMilestoneDto) {
    return this.wxUserService.updateMilestone(id, milestoneId, dto);
  }

  @Delete(':id/milestones/:milestoneId')
  @ApiOperation({ summary: '删除幸福空间记录' })
  async deleteMilestone(@Param('id') id: string, @Param('milestoneId') milestoneId: string) {
    return this.wxUserService.deleteMilestone(id, milestoneId);
  }

  @Get(':id/orders')
  @ApiOperation({ summary: '获取客户的订单列表' })
  async getOrders(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.wxUserService.getOrders(id, page ? parseInt(page) : 1, limit ? parseInt(limit) : 10);
  }

  @Get(':id/addresses')
  @ApiOperation({ summary: '获取客户的收货地址列表' })
  async getAddresses(@Param('id') id: string) {
    return this.wxAddressService.findAll(id);
  }

  // ==================== 幸福空间配额 ====================

  @Get(':id/milestone/quota')
  @ApiOperation({ summary: '获取幸福空间配额（上传和播放剩余次数）' })
  async getMilestoneQuota(@Param('id') id: string) {
    return this.wxUserService.getMilestoneQuota(id);
  }

  @Post(':id/milestone/upload-log')
  @ApiOperation({ summary: '记录幸福空间上传次数' })
  async recordMilestoneUpload(
    @Param('id') id: string,
    @Body('uploadType') uploadType: 'PHOTO' | 'VIDEO',
  ) {
    return this.wxUserService.recordMilestoneUpload(id, uploadType);
  }

  @Post(':id/milestone/play-log')
  @ApiOperation({ summary: '记录幸福空间视频播放' })
  async recordMilestonePlay(@Param('id') id: string) {
    return this.wxUserService.recordMilestonePlay(id);
  }

  // ==================== 积分 ====================

  @Get(':id/points')
  @ApiOperation({ summary: '获取用户积分余额和交易记录' })
  async getUserPoints(@Param('id') id: string) {
    return this.wxUserService.getUserPoints(id);
  }

  @Post(':id/points/deduct')
  @ApiOperation({ summary: '扣除积分' })
  async deductPoints(
    @Param('id') id: string,
    @Body('reason') reason: 'upload_photo' | 'upload_video' | 'play_video',
  ) {
    return this.wxUserService.deductPoints(id, reason);
  }

  @Post(':id/points/add')
  @ApiOperation({ summary: '增加积分（管理员操作或购买回调）' })
  async addPoints(
    @Param('id') id: string,
    @Body('amount') amount: number,
    @Body('reason') reason: string,
    @Body('remark') remark?: string,
  ) {
    return this.wxUserService.addPoints(id, amount, reason, remark);
  }
}
