import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AdminJwtAuthGuard } from '../modules/auth/guards/admin-jwt-auth.guard';
import { SupplierService } from './supplier.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { QuerySupplierDto } from './dto/query-supplier.dto';
import { RateSupplierDto } from './dto/rate-supplier.dto';
import { QueryRatingHistoryDto } from './dto/query-rating-history.dto';

@ApiTags('供应商管理')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
@Controller('supplier')
export class SupplierController {
  constructor(private readonly supplierService: SupplierService) {}

  /**
   * 创建供应商
   */
  @Post()
  create(@Body() createSupplierDto: CreateSupplierDto) {
    return this.supplierService.create(createSupplierDto);
  }

  /**
   * 查询供应商列表
   */
  @Get()
  findAll(@Query() queryDto: QuerySupplierDto) {
    return this.supplierService.findAll(queryDto);
  }

  /**
   * 获取供应商统计数据
   */
  @Get('statistics')
  getStatistics() {
    return this.supplierService.getStatistics();
  }

  /**
   * 搜索供应商
   */
  @Get('search')
  searchByName(@Query('name') name: string) {
    return this.supplierService.searchByName(name);
  }

  /**
   * 查询供应商详情
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.supplierService.findOne(id);
  }

  /**
   * 更新供应商
   */
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSupplierDto: UpdateSupplierDto) {
    return this.supplierService.update(id, updateSupplierDto);
  }

  /**
   * 更新供应商状态
   */
  @Put(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.supplierService.updateStatus(id, status);
  }

  /**
   * 切换供应商状态
   */
  @Patch(':id/toggle-status')
  toggleStatus(@Param('id') id: string) {
    return this.supplierService.toggleStatus(id);
  }

  /**
   * 删除供应商
   */
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.supplierService.remove(id);
  }

  /**
   * 评价供应商
   */
  @Post('rate')
  rateSupplier(@Body() rateDto: RateSupplierDto) {
    return this.supplierService.rateSupplier(rateDto);
  }

  @Get(':id/rating-history')
  getRatingHistory(@Param('id') id: string, @Query() query: QueryRatingHistoryDto) {
    return this.supplierService.getRatingHistory(id, query);
  }
}
