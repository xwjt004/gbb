import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { InboundService } from './inbound.service';
import {
  CreateInboundDto,
  StartQualityCheckDto,
  CompleteQualityCheckDto,
  ConfirmInboundDto,
  CancelInboundDto,
  QueryInboundDto,
  UpdateInboundDto,
} from './dto/create-inbound.dto';

@Controller('inbound')
export class InboundController {
  constructor(private readonly inboundService: InboundService) {}

  /**
   * 创建入库记录
   */
  @Post()
  create(@Body() createDto: CreateInboundDto): Promise<any> {
    return this.inboundService.create(createDto);
  }

  /**
   * 获取统计数据
   */
  @Get('statistics/summary')
  getStatistics(): Promise<any> {
    return this.inboundService.getStatistics();
  }

  /**
   * 查询入库记录列表
   */
  @Get('list')
  findAll(@Query() query: QueryInboundDto): Promise<any> {
    return this.inboundService.findAll(query);
  }

  /**
   * 查询入库记录详情
   */
  @Get(':id')
  findOne(@Param('id') id: string): Promise<any> {
    return this.inboundService.findOne(id);
  }

  /**
   * 开始质检
   */
  @Patch(':id/quality-check/start')
  startQualityCheck(
    @Param('id') id: string,
    @Body() startDto: StartQualityCheckDto,
  ): Promise<any> {
    return this.inboundService.startQualityCheck(id, startDto);
  }

  /**
   * 完成质检
   */
  @Patch(':id/quality-check/complete')
  completeQualityCheck(
    @Param('id') id: string,
    @Body() completeDto: CompleteQualityCheckDto,
  ): Promise<any> {
    return this.inboundService.completeQualityCheck(id, completeDto);
  }

  /**
   * 确认入库
   */
  @Patch(':id/confirm')
  confirmInbound(
    @Param('id') id: string,
    @Body() confirmDto: ConfirmInboundDto,
  ): Promise<any> {
    return this.inboundService.confirmInbound(id, confirmDto);
  }

  /**
   * 取消入库
   */
  @Patch(':id/cancel')
  cancelInbound(
    @Param('id') id: string,
    @Body() cancelDto: CancelInboundDto,
  ): Promise<any> {
    return this.inboundService.cancelInbound(id, cancelDto);
  }

  /**
   * 更新入库记录
   */
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateInboundDto,
  ): Promise<any> {
    return this.inboundService.update(id, updateDto);
  }

  /**
   * 删除入库记录
   */
  @Delete(':id')
  remove(@Param('id') id: string): Promise<any> {
    return this.inboundService.remove(id);
  }
}
