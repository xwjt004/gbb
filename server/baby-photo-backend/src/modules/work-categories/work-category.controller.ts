import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminJwtAuthGuard } from '../auth/guards/admin-jwt-auth.guard';
import { WorkCategoryService } from './work-category.service';
import { CreateWorkCategoryDto, QueryWorkCategoryDto } from './dto/create-work-category.dto';

@ApiTags('作品分类管理')
@Controller('work-categories')
export class WorkCategoryController {
  constructor(private readonly service: WorkCategoryService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard)
  @ApiOperation({ summary: '创建作品分类' })
  async create(@Body() dto: CreateWorkCategoryDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: '获取作品分类列表（分页）' })
  async findAll(@Query() query: QueryWorkCategoryDto) {
    return this.service.findAll(query);
  }

  @Get('all')
  @ApiOperation({ summary: '获取所有分类（不分页，用于下拉选择）' })
  async findAllSimple() {
    return this.service.findAllSimple();
  }

  @Get(':id')
  @ApiOperation({ summary: '获取分类详情' })
  async findOne(@Param('id') id: string) {
    return this.service.findOne(Number(id));
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard)
  @ApiOperation({ summary: '更新分类' })
  async update(@Param('id') id: string, @Body() dto: Partial<CreateWorkCategoryDto>) {
    return this.service.update(Number(id), dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard)
  @ApiOperation({ summary: '删除分类' })
  async remove(@Param('id') id: string) {
    return this.service.remove(Number(id));
  }
}
