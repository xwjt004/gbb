import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminJwtAuthGuard } from '../auth/guards/admin-jwt-auth.guard';
import { PackageCategoriesService } from './package-categories.service';
import { CreatePackageCategoryDto } from './dto/create-package-category.dto';
import { UpdatePackageCategoryDto } from './dto/update-package-category.dto';
import { PackageCategoryQueryDto } from './dto/package-category-query.dto';

@ApiTags('package-categories')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
@Controller('package-categories')
export class PackageCategoriesController {
  private readonly logger = new Logger(PackageCategoriesController.name);

  constructor(
    private readonly packageCategoriesService: PackageCategoriesService,
  ) {}

  @Post()
  @ApiOperation({ summary: '创建套餐分类' })
  @ApiResponse({ status: 201, description: '分类创建成功' })
  @ApiResponse({ status: 409, description: '分类名称已存在' })
  create(@Body() createDto: CreatePackageCategoryDto) {
    this.logger.log(`创建套餐分类: ${createDto.name}`);
    return this.packageCategoriesService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: '获取套餐分类列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  findAll(@Query() query: PackageCategoryQueryDto) {
    return this.packageCategoriesService.findAll(query);
  }

  @Get('active')
  @ApiOperation({ summary: '获取所有启用的分类（用于选择器）' })
  @ApiResponse({ status: 200, description: '获取成功' })
  findAllActive() {
    return this.packageCategoriesService.findAllActive();
  }

  @Get(':id')
  @ApiOperation({ summary: '获取分类详情' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 404, description: '分类不存在' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.packageCategoriesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新套餐分类' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 404, description: '分类不存在' })
  @ApiResponse({ status: 409, description: '分类名称已存在' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdatePackageCategoryDto,
  ) {
    this.logger.log(`更新套餐分类: ${id}`);
    return this.packageCategoriesService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除套餐分类' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '分类不存在' })
  @ApiResponse({ status: 400, description: '分类下有套餐，无法删除' })
  remove(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`删除套餐分类: ${id}`);
    return this.packageCategoriesService.remove(id);
  }

  @Post('sort')
  @ApiOperation({ summary: '批量更新分类排序' })
  @ApiResponse({ status: 200, description: '排序更新成功' })
  updateSortOrder(@Body() sortData: { id: number; sortOrder: number }[]) {
    this.logger.log(`批量更新排序，共 ${sortData.length} 条`);
    return this.packageCategoriesService.updateSortOrder(sortData);
  }
}
