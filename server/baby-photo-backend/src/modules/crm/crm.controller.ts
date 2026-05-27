import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  HttpCode, HttpStatus, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CrmService } from './crm.service';
import { CreateMemberLevelDto } from './dto/create-member-level.dto';
import { UpdateMemberLevelDto } from './dto/update-member-level.dto';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { UpdateComplaintDto } from './dto/update-complaint.dto';
import { QueryComplaintDto } from './dto/query-complaint.dto';

@ApiTags('CRM')
@Controller('crm')
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  // ==================== 会员等级 ====================

  @Get('member-levels')
  @ApiOperation({ summary: '会员等级列表' })
  getMemberLevels() {
    return this.crmService.getMemberLevels();
  }

  @Post('member-levels')
  @ApiOperation({ summary: '创建会员等级' })
  createMemberLevel(@Body() dto: CreateMemberLevelDto) {
    return this.crmService.createMemberLevel(dto);
  }

  @Patch('member-levels/:id')
  @ApiOperation({ summary: '更新会员等级' })
  updateMemberLevel(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateMemberLevelDto) {
    return this.crmService.updateMemberLevel(id, dto);
  }

  @Delete('member-levels/:id')
  @ApiOperation({ summary: '删除会员等级' })
  @HttpCode(HttpStatus.OK)
  deleteMemberLevel(@Param('id', ParseIntPipe) id: number) {
    return this.crmService.deleteMemberLevel(id);
  }

  @Get('growth-rules')
  @ApiOperation({ summary: '成长值规则' })
  getGrowthRules() {
    return this.crmService.getGrowthRules();
  }

  // ==================== 客户画像 ====================

  @Get('customers/:wxUserId/profile')
  @ApiOperation({ summary: '客户画像' })
  getCustomerProfile(@Param('wxUserId') wxUserId: string) {
    return this.crmService.getCustomerProfile(wxUserId);
  }

  // ==================== 客诉管理 ====================

  @Post('complaints')
  @ApiOperation({ summary: '创建投诉' })
  createComplaint(@Body() dto: CreateComplaintDto) {
    return this.crmService.createComplaint(dto);
  }

  @Get('complaints')
  @ApiOperation({ summary: '投诉列表' })
  findComplaints(@Query() query: QueryComplaintDto) {
    return this.crmService.findComplaints(query);
  }

  @Get('complaints/:id')
  @ApiOperation({ summary: '投诉详情' })
  findOneComplaint(@Param('id') id: string) {
    return this.crmService.findOneComplaint(id);
  }

  @Patch('complaints/:id')
  @ApiOperation({ summary: '更新投诉' })
  updateComplaint(@Param('id') id: string, @Body() dto: UpdateComplaintDto) {
    return this.crmService.updateComplaint(id, dto);
  }

  @Delete('complaints/:id')
  @ApiOperation({ summary: '删除投诉' })
  @HttpCode(HttpStatus.OK)
  deleteComplaint(@Param('id') id: string) {
    return this.crmService.deleteComplaint(id);
  }

  // ==================== 手动触发 ====================

  @Post('upgrade-all')
  @ApiOperation({ summary: '手动触发全部会员等级升级' })
  upgradeAll() {
    return this.crmService.autoUpgradeAll();
  }

  @Post('detect-churn')
  @ApiOperation({ summary: '手动触发流失检测' })
  detectChurn() {
    return this.crmService.detectChurnUsers();
  }

  @Post('birthday-reminders')
  @ApiOperation({ summary: '手动触发生日提醒' })
  birthdayReminders() {
    return this.crmService.sendBirthdayReminders();
  }
}
