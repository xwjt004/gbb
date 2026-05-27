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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { ProductBatchUpdateStatusDto } from './dto/batch-update-status.dto';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  private readonly logger = new Logger(ProductsController.name);

  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @ApiOperation({ summary: '创建商品' })
  @ApiResponse({ status: 201, description: '创建成功' })
  @ApiResponse({ status: 409, description: '商品编号已存在' })
  create(@Body() createDto: CreateProductDto) {
    this.logger.log(`创建商品: ${createDto.name}`);
    return this.productsService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: '获取商品列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  findAll(@Query() query: QueryProductDto) {
    return this.productsService.findAll(query);
  }

  @Get('statistics')
  @ApiOperation({ summary: '获取商品统计' })
  @ApiResponse({ status: 200, description: '获取成功' })
  getStatistics() {
    return this.productsService.getStatistics();
  }

  @Get(':id')
  @ApiOperation({ summary: '获取商品详情' })
  @ApiParam({ name: 'id', description: '商品ID', type: 'number' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 404, description: '商品不存在' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.findOne(id);
  }

  @Patch('batch/status')
  @ApiOperation({ summary: '批量更新商品状态' })
  @ApiResponse({ status: 200, description: '更新成功' })
  batchUpdateStatus(@Body() batchDto: ProductBatchUpdateStatusDto) {
    return this.productsService.batchUpdateStatus(batchDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新商品' })
  @ApiParam({ name: 'id', description: '商品ID', type: 'number' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 404, description: '商品不存在' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateProductDto,
  ) {
    this.logger.log(`更新商品: ID=${id}`);
    return this.productsService.update(id, updateDto);
  }

  @Patch(':id/stock')
  @ApiOperation({ summary: '更新商品库存' })
  @ApiParam({ name: 'id', description: '商品ID', type: 'number' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 400, description: '库存不足' })
  updateStock(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateStockDto,
  ) {
    return this.productsService.updateStock(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除商品' })
  @ApiParam({ name: 'id', description: '商品ID', type: 'number' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '商品不存在' })
  remove(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`删除商品: ID=${id}`);
    return this.productsService.remove(id);
  }
}
