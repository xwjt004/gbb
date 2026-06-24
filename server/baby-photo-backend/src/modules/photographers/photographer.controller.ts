import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminJwtAuthGuard } from '../auth/guards/admin-jwt-auth.guard';
import { PhotographerService } from './photographer.service';
import { CreatePhotographerDto, QueryPhotographerDto } from './dto/create-photographer.dto';

@ApiTags('摄影师管理')
@Controller('photographers')
export class PhotographerController {
  constructor(private readonly service: PhotographerService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard)
  @ApiOperation({ summary: '创建摄影师' })
  async create(@Body() dto: CreatePhotographerDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: '获取摄影师列表（分页）' })
  async findAll(@Query() query: QueryPhotographerDto) {
    return this.service.findAll(query);
  }

  @Get('all')
  @ApiOperation({ summary: '获取所有摄影师（不分页，用于下拉选择）' })
  async findAllSimple() {
    return this.service.findAllSimple();
  }

  @Get(':id')
  @ApiOperation({ summary: '获取摄影师详情' })
  async findOne(@Param('id') id: string) {
    return this.service.findOne(Number(id));
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard)
  @ApiOperation({ summary: '更新摄影师' })
  async update(@Param('id') id: string, @Body() dto: Partial<CreatePhotographerDto>) {
    return this.service.update(Number(id), dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard)
  @ApiOperation({ summary: '删除摄影师' })
  async remove(@Param('id') id: string) {
    return this.service.remove(Number(id));
  }
}
