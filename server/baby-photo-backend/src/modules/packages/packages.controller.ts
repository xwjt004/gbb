import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Logger,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { PackagesService } from './packages.service';
import { BulkUpdateStatusDto } from './dto/bulk-update-status.dto';
import { CreatePackageDto } from './dto/create-package.dto';
import { UpdatePackageDto } from './dto/update-package.dto';
import { PackageSearchDto } from './dto/package-search.dto';
import { NullToUndefinedPipe } from '../../shared/pipes/null-to-undefined.pipe';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminJwtAuthGuard } from '../auth/guards/admin-jwt-auth.guard';

@ApiTags('packages')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
@Controller('packages')
export class PackagesController {
  private readonly logger = new Logger(PackagesController.name);

  constructor(private readonly packagesService: PackagesService) {}

  /**
   * 创建套餐
   */
  @Post()
  @ApiOperation({ summary: '创建套餐' })
  @ApiResponse({ status: 201, description: '套餐创建成功' })
  async create(@Body() createPackageDto: CreatePackageDto) {
    this.logger.log(`创建套餐: ${JSON.stringify(createPackageDto)}`);
    return this.packagesService.create(createPackageDto);
  }

  /**
   * 获取所有套餐（支持搜索和分页）
   */
  @Get()
  @ApiOperation({ summary: '获取套餐列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async findAll(@Query() searchDto: PackageSearchDto) {
    this.logger.log(`查询套餐列表: ${JSON.stringify(searchDto)}`);
    return this.packagesService.findAll(searchDto);
  }

  /**
   * 通过价格区间查找套餐
   */
  @Get('by-price-range')
  @ApiOperation({ summary: '通过价格区间查找套餐' })
  @ApiResponse({ status: 200, description: '查找成功' })
  async findByPriceRange(
    @Query('min_price') minPrice?: number,
    @Query('max_price') maxPrice?: number,
    @Query('sort') sort?: string,
  ) {
    this.logger.log(
      `通过价格区间查找套餐: ${minPrice}-${maxPrice}, 排序: ${sort}`,
    );
    return this.packagesService.findByPriceRange(minPrice, maxPrice, sort);
  }

  /**
   * 通过名称查找套餐
   */
  @Get('by-name')
  @ApiOperation({ summary: '通过名称查找套餐' })
  @ApiResponse({ status: 200, description: '查找成功' })
  async findByName(
    @Query('name') name: string,
    @Query('fuzzy') fuzzy?: string,
  ) {
    this.logger.log(`通过名称查找套餐: ${name}, 模糊搜索: ${fuzzy}`);
    const isFuzzy = fuzzy === 'true';
    return this.packagesService.findByName(name, isFuzzy);
  }

  /**
   * 获取热门套餐
   */
  @Get('popular')
  @ApiOperation({ summary: '获取热门套餐' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getPopularPackages(@Query('limit') limit?: string) {
    const numLimit = limit ? parseInt(limit, 10) : 10;
    this.logger.log(`获取热门套餐, 限制: ${numLimit}`);
    return this.packagesService.getPopularPackages(numLimit);
  }

  /**
   * 导出套餐数据
   */
  @Get('export/excel')
  @ApiOperation({ summary: '导出套餐数据到Excel' })
  @ApiResponse({ status: 200, description: '导出成功' })
  async exportToExcel(@Query() searchDto: PackageSearchDto, @Res() res: Response) {
    this.logger.log(`导出套餐数据到Excel: ${JSON.stringify(searchDto)}`);
    return this.packagesService.exportToExcel(searchDto, res);
  }

  /**
   * 导出套餐数据到CSV
   */
  @Get('export/csv')
  @ApiOperation({ summary: '导出套餐数据到CSV' })
  @ApiResponse({ status: 200, description: '导出成功' })
  async exportToCSV(@Query() searchDto: PackageSearchDto, @Res() res: Response) {
    this.logger.log(`导出套餐数据到CSV: ${JSON.stringify(searchDto)}`);
    return this.packagesService.exportToCSV(searchDto, res);
  }

  /**
   * 导出套餐数据到JSON
   */
  @Get('export/json')
  @ApiOperation({ summary: '导出套餐数据到JSON' })
  @ApiResponse({ status: 200, description: '导出成功' })
  async exportToJSON(@Query() searchDto: PackageSearchDto) {
    this.logger.log(`导出套餐数据到JSON: ${JSON.stringify(searchDto)}`);
    return this.packagesService.exportToJSON(searchDto);
  }

  /**
   * 获取套餐详情
   */
  @Get(':id')
  @ApiOperation({ summary: '获取套餐详情' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async findOne(@Param('id') id: string) {
    this.logger.log(`获取套餐详情: ${id}`);
    return this.packagesService.findOne(+id);
  }

  /**
   * 更新套餐
   */
  @Patch(':id')
  @ApiOperation({ summary: '更新套餐' })
  @ApiResponse({ status: 200, description: '更新成功' })
  async update(
    @Param('id') id: string,
    @Body(NullToUndefinedPipe) updatePackageDto: UpdatePackageDto,
  ) {
    this.logger.log(
      `更新套餐: ${id}, 数据: ${JSON.stringify(updatePackageDto)}`,
    );
    return this.packagesService.update(+id, updatePackageDto);
  }

  /**
   * 批量更新套餐状态
   */
  @Patch('bulk/status')
  @ApiOperation({ summary: '批量更新套餐状态' })
  @ApiResponse({ status: 200, description: '批量更新成功' })
  async bulkUpdateStatus(@Body() dto: BulkUpdateStatusDto) {
    this.logger.log(`批量更新套餐状态: ${dto.ids.join(',')} -> ${dto.status}`);
    return this.packagesService.bulkUpdateStatus(dto);
  }

  /**
   * 删除套餐
   */
  @Delete(':id')
  @ApiOperation({ summary: '删除套餐' })
  @ApiResponse({ status: 200, description: '删除成功' })
  async remove(@Param('id') id: string) {
    this.logger.log(`删除套餐: ${id}`);
    return this.packagesService.remove(+id);
  }

  /**
   * 获取套餐统计信息
   */
  @Get(':id/recommendations')
  @ApiOperation({ summary: '获取套餐关联推荐（交叉销售）' })
  @ApiResponse({ status: 200, description: '查询成功' })
  async getRecommendations(
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    const numLimit = limit ? parseInt(limit, 10) : 4;
    this.logger.log(`获取套餐推荐: ${id}, limit: ${numLimit}`);
    return this.packagesService.getRecommendations(+id, numLimit);
  }

  @Get(':id/statistics')
  @ApiOperation({ summary: '获取套餐统计信息' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getPackageStatistics(@Param('id') id: string) {
    this.logger.log(`获取套餐统计信息: ${id}`);
    return this.packagesService.getPackageStatistics(+id);
  }
}
