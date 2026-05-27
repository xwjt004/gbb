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
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { DiyPackagesService } from './diy-packages.service';
import { CreateDiyPackageDto } from './dto/create-diy-package.dto';
import { UpdateDiyPackageDto } from './dto/update-diy-package.dto';
import { QueryDiyPackageDto } from './dto/query-diy-package.dto';

@ApiTags('DIY套系管理')
@Controller('diy-packages')
export class DiyPackagesController {
  private readonly logger = new Logger(DiyPackagesController.name);

  constructor(private readonly diyPackagesService: DiyPackagesService) {}

  @Post()
  @ApiOperation({ summary: '创建DIY套系' })
  @ApiResponse({ status: 201, description: '创建成功' })
  create(@Body() createDto: CreateDiyPackageDto) {
    this.logger.log(`创建DIY套系: ${createDto.packageName}`);
    return this.diyPackagesService.create(createDto);
  }

  @Post('preview-pricing')
  @ApiOperation({ summary: '预览价格计算' })
  @ApiResponse({ status: 200, description: '计算成功' })
  previewPricing(@Body() body: { selectedItems: any[]; originalAmount: number }) {
    return this.diyPackagesService.previewPricing(body.selectedItems, body.originalAmount);
  }

  @Get()
  @ApiOperation({ summary: '获取DIY套系列表' })
  @ApiResponse({ status: 200, description: '查询成功' })
  findAll(@Query() query: QueryDiyPackageDto) {
    return this.diyPackagesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取DIY套系详情' })
  @ApiParam({ name: 'id', description: '套系ID', type: 'number' })
  @ApiResponse({ status: 200, description: '查询成功' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.diyPackagesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新DIY套系' })
  @ApiParam({ name: 'id', description: '套系ID', type: 'number' })
  @ApiResponse({ status: 200, description: '更新成功' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateDiyPackageDto,
  ) {
    this.logger.log(`更新DIY套系: ID=${id}`);
    return this.diyPackagesService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除DIY套系' })
  @ApiParam({ name: 'id', description: '套系ID', type: 'number' })
  @ApiResponse({ status: 200, description: '删除成功' })
  remove(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`删除DIY套系: ID=${id}`);
    return this.diyPackagesService.remove(id);
  }

  @Post(':id/create-order')
  @ApiOperation({ summary: '从DIY套系创建订单' })
  @ApiParam({ name: 'id', description: '套系ID', type: 'number' })
  @ApiResponse({ status: 201, description: '订单创建成功' })
  createOrder(
    @Param('id', ParseIntPipe) id: number,
    @Body() createOrderData: {
      userOpenid: string;
      timeSlotId?: number;
      appointmentDate?: string;
      childrenCount?: number;
      customerName?: string;
      notes?: string;
    }
  ) {
    this.logger.log(`从DIY套系创建订单: packageId=${id}`);
    return this.diyPackagesService.createOrderFromDiyPackage(id, {
      ...createOrderData,
      appointmentDate: createOrderData.appointmentDate 
        ? new Date(createOrderData.appointmentDate)
        : undefined,
    });
  }
}
