import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminJwtAuthGuard } from '../auth/guards/admin-jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import { TemplatesService } from './templates.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { QueryNotificationDto } from './dto/query-notification.dto';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { QueryTemplateDto } from './dto/query-template.dto';

@ApiTags('通知管理')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly templatesService: TemplatesService,
  ) {}

  // ---- 通知 CRUD ----

  @Post()
  @ApiOperation({ summary: '创建并发送通知' })
  create(@Body() dto: CreateNotificationDto) {
    return this.notificationsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: '查询通知列表' })
  findAll(@Query() query: QueryNotificationDto) {
    return this.notificationsService.findAll(query);
  }

  // ---- 模板管理 (声明在 :id 之前以避免路由冲突) ----

  @Post('templates')
  @ApiOperation({ summary: '创建通知模板' })
  createTemplate(@Body() dto: CreateTemplateDto) {
    return this.templatesService.create(dto);
  }

  @Get('templates')
  @ApiOperation({ summary: '查询通知模板列表' })
  findAllTemplates(@Query() query: QueryTemplateDto) {
    return this.templatesService.findAll(query);
  }

  @Get('templates/:id')
  @ApiOperation({ summary: '查询通知模板详情' })
  findOneTemplate(@Param('id') id: string) {
    return this.templatesService.findOne(id);
  }

  @Post('templates/:id')
  @ApiOperation({ summary: '更新通知模板' })
  updateTemplate(@Param('id') id: string, @Body() dto: UpdateTemplateDto) {
    return this.templatesService.update(id, dto);
  }

  @Delete('templates/:id')
  @ApiOperation({ summary: '删除通知模板' })
  @HttpCode(HttpStatus.OK)
  removeTemplate(@Param('id') id: string) {
    return this.templatesService.remove(id);
  }

  @Get(':id')
  @ApiOperation({ summary: '查询通知详情' })
  findOne(@Param('id') id: string) {
    return this.notificationsService.findOne(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除通知记录' })
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string) {
    return this.notificationsService.remove(id);
  }

  // ---- 重试 ----

  @Post(':id/retry')
  @ApiOperation({ summary: '重试发送失败的通知' })
  retry(@Param('id') id: string) {
    return this.notificationsService.retry(id);
  }

  @Post('retry-batch')
  @ApiOperation({ summary: '批量重试所有失败通知' })
  retryAllFailed() {
    return this.notificationsService.retryAllFailed();
  }
}
