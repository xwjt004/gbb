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
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { AdminJwtAuthGuard } from '../auth/guards/admin-jwt-auth.guard';
import { DiscountRulesService } from './discount-rules.service';
import { CreateDiscountRuleDto } from './dto/create-discount-rule.dto';
import { UpdateDiscountRuleDto } from './dto/update-discount-rule.dto';
import { QueryDiscountRuleDto } from './dto/query-discount-rule.dto';

@ApiTags('折扣规则管理')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
@Controller('discount-rules')
export class DiscountRulesController {
  private readonly logger = new Logger(DiscountRulesController.name);

  constructor(private readonly discountRulesService: DiscountRulesService) {}

  @Post()
  @ApiOperation({ summary: '创建折扣规则' })
  @ApiResponse({ status: 201, description: '创建成功' })
  create(@Body() createDto: CreateDiscountRuleDto) {
    this.logger.log(`创建折扣规则: ${createDto.name}`);
    return this.discountRulesService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: '获取折扣规则列表' })
  @ApiResponse({ status: 200, description: '查询成功' })
  findAll(@Query() query: QueryDiscountRuleDto) {
    return this.discountRulesService.findAll(query);
  }

  @Get('calculate/:amount')
  @ApiOperation({ summary: '根据金额计算折扣' })
  @ApiParam({ name: 'amount', description: '金额', type: 'number' })
  @ApiResponse({ status: 200, description: '计算成功' })
  calculateDiscount(@Param('amount', ParseIntPipe) amount: number) {
    return this.discountRulesService.calculateDiscount(amount);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取折扣规则详情' })
  @ApiParam({ name: 'id', description: '规则ID', type: 'number' })
  @ApiResponse({ status: 200, description: '查询成功' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.discountRulesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新折扣规则' })
  @ApiParam({ name: 'id', description: '规则ID', type: 'number' })
  @ApiResponse({ status: 200, description: '更新成功' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateDiscountRuleDto,
  ) {
    this.logger.log(`更新折扣规则: ID=${id}`);
    return this.discountRulesService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除折扣规则' })
  @ApiParam({ name: 'id', description: '规则ID', type: 'number' })
  @ApiResponse({ status: 200, description: '删除成功' })
  remove(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`删除折扣规则: ID=${id}`);
    return this.discountRulesService.remove(id);
  }
}
