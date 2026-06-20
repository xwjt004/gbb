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
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { AdminJwtAuthGuard } from '../auth/guards/admin-jwt-auth.guard';
import { ServiceItemsService } from './service-items.service';
import { CreateServiceItemDto } from './dto/create-service-item.dto';
import { UpdateServiceItemDto } from './dto/update-service-item.dto';
import { QueryServiceItemDto } from './dto/query-service-item.dto';

@ApiTags('service-items')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
@Controller('service-items')
export class ServiceItemsController {
  private readonly logger = new Logger(ServiceItemsController.name);

  constructor(private readonly serviceItemsService: ServiceItemsService) {}

  @Post()
  @ApiOperation({ summary: '创建服务项目' })
  @ApiResponse({ status: 201, description: '创建成功' })
  @ApiResponse({ status: 409, description: '服务编号已存在' })
  create(@Body() createDto: CreateServiceItemDto) {
    this.logger.log(`创建服务项目: ${createDto.name}`);
    return this.serviceItemsService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: '获取服务项目列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  findAll(@Query() query: QueryServiceItemDto) {
    return this.serviceItemsService.findAll(query);
  }

  @Get('categories')
  @ApiOperation({ summary: '获取所有服务分类' })
  @ApiResponse({ status: 200, description: '获取成功' })
  getCategories() {
    return this.serviceItemsService.getCategories();
  }

  @Get('statistics')
  @ApiOperation({ summary: '获取服务统计' })
  @ApiResponse({ status: 200, description: '获取成功' })
  getStatistics() {
    return this.serviceItemsService.getStatistics();
  }

  @Get('by-category/:category')
  @ApiOperation({ summary: '按分类查询服务项目' })
  @ApiParam({ name: 'category', description: '服务分类', type: 'string' })
  @ApiResponse({ status: 200, description: '获取成功' })
  findByCategory(@Param('category') category: string) {
    return this.serviceItemsService.findByCategory(category);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取服务项目详情' })
  @ApiParam({ name: 'id', description: '服务项目ID', type: 'number' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 404, description: '服务项目不存在' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.serviceItemsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新服务项目' })
  @ApiParam({ name: 'id', description: '服务项目ID', type: 'number' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 404, description: '服务项目不存在' })
  @ApiResponse({ status: 409, description: '服务编号已存在' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateServiceItemDto,
  ) {
    this.logger.log(`更新服务项目: ID=${id}`);
    return this.serviceItemsService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除服务项目' })
  @ApiParam({ name: 'id', description: '服务项目ID', type: 'number' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '服务项目不存在' })
  remove(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`删除服务项目: ID=${id}`);
    return this.serviceItemsService.remove(id);
  }
}
