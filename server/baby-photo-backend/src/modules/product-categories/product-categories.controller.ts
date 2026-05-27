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
import { ProductCategoriesService } from './product-categories.service';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';
import { QueryProductCategoryDto } from './dto/query-product-category.dto';
import { UpdateSortOrderDto } from './dto/update-sort-order.dto';

@ApiTags('product-categories')
@Controller('product-categories')
export class ProductCategoriesController {
  private readonly logger = new Logger(ProductCategoriesController.name);

  constructor(
    private readonly productCategoriesService: ProductCategoriesService,
  ) {}

  @Post()
  @ApiOperation({ summary: '创建商品分类' })
  @ApiResponse({ status: 201, description: '分类创建成功' })
  @ApiResponse({ status: 409, description: '分类名称或编码已存在' })
  create(@Body() createDto: CreateProductCategoryDto) {
    this.logger.log(`创建商品分类: ${createDto.name}`);
    return this.productCategoriesService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: '获取商品分类列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  findAll(@Query() query: QueryProductCategoryDto) {
    return this.productCategoriesService.findAll(query);
  }

  @Get('active')
  @ApiOperation({ summary: '获取所有启用的分类（用于选择器）' })
  @ApiResponse({ status: 200, description: '获取成功' })
  findAllActive() {
    return this.productCategoriesService.findAllActive();
  }

  @Get(':id')
  @ApiOperation({ summary: '获取分类详情' })
  @ApiParam({ name: 'id', description: '分类ID', type: 'number' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 404, description: '分类不存在' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productCategoriesService.findOne(id);
  }

  @Patch('sort')
  @ApiOperation({ summary: '批量更新分类排序' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 400, description: '参数错误' })
  updateSortOrder(@Body() updateDto: UpdateSortOrderDto) {
    return this.productCategoriesService.updateSortOrder(updateDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新分类' })
  @ApiParam({ name: 'id', description: '分类ID', type: 'number' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 404, description: '分类不存在' })
  @ApiResponse({ status: 409, description: '分类名称或编码已存在' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateProductCategoryDto,
  ) {
    this.logger.log(`更新商品分类: ID=${id}`);
    return this.productCategoriesService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除分类' })
  @ApiParam({ name: 'id', description: '分类ID', type: 'number' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '分类不存在' })
  @ApiResponse({ status: 400, description: '该分类下有商品，无法删除' })
  remove(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`删除商品分类: ID=${id}`);
    return this.productCategoriesService.remove(id);
  }
}
