import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Headers,
  Logger,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { AdminJwtAuthGuard } from '../auth/guards/admin-jwt-auth.guard';
import { Public } from '../../shared/decorators/public.decorator';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto, PaymentChannel } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { PaymentSearchDto } from './dto/payment-search.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { CollectBalanceDto } from './dto/collect-balance.dto';
import { CreateRefundRequestDto } from './dto/create-refund-request.dto';
import { 
  RefundRequestSearchDto, 
  ApproveRefundRequestDto, 
  RejectRefundRequestDto, 
  ProcessRefundRequestDto 
} from './dto/refund-request-search.dto';
import { QuerySuspiciousPaymentsDto } from './dto/query-suspicious-payments.dto';
import { ReconciliationTask } from './tasks/reconciliation.task';

@ApiTags('支付管理')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly reconciliationTask: ReconciliationTask,
  ) {}

  /**
   * 创建支付订单
   */
  @Post()
  @ApiOperation({ summary: '创建支付记录' })
  @ApiResponse({ status: 201, description: '支付记录创建成功' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 404, description: '订单不存在' })
  async create(
    @Body() createPaymentDto: CreatePaymentDto,
    @Headers('Idempotency-Key') idempotencyKey?: string,
  ) {
    const key = idempotencyKey || createPaymentDto.idempotencyKey;
    if (key) this.logger.log(`收到幂等请求 Key=${key}`);
    this.logger.log(`创建支付订单: ${JSON.stringify(createPaymentDto)}`);
    return this.paymentsService.create({ ...createPaymentDto, idempotencyKey: key });
  }

  /**
   * 支付元数据：状态枚举、渠道枚举、描述映射
   */
  @Get('meta')
  @ApiOperation({ summary: '获取支付元数据（状态与渠道）' })
  async getPaymentMeta() {
    return this.paymentsService.getPaymentMeta();
  }

  /**
   * 获取可用支付渠道列表
   */
  @Get('methods')
  @ApiOperation({ summary: '获取可用支付渠道列表' })
  async getPaymentMethods() {
    return {
      code: 200,
      message: '渠道列表获取成功',
      data: Object.values(PaymentChannel),
    };
  }

  /**
   * 微信支付回调
   */
  @Public()
  @Post('wx-notify')
  async wxPayNotify(
    @Body() body: any,
    @Headers() headers: Record<string, string>,
  ) {
    this.logger.log('收到微信支付回调');
    return this.paymentsService.handleWxPayNotify(body, headers);
  }

  /**
   * 获取支付列表（支持搜索和分页）
   */
  @Get()
  @ApiOperation({ summary: '获取所有支付记录' })
  @ApiResponse({ status: 200, description: '成功获取支付记录列表' })
  async findAll(@Query() searchDto: PaymentSearchDto) {
    this.logger.log(`查询支付列表: ${JSON.stringify(searchDto)}`);
    return this.paymentsService.findAll(searchDto);
  }

  /**
   * 通过手机号查找支付记录
   */
  @Get('by-phone/:phone')
  async findByPhone(@Param('phone') phone: string, @Query() query: any) {
    this.logger.log(`通过手机号查找支付记录: ${phone}`);
    const { page = 1, limit = 20 } = query;
    return this.paymentsService.findByPhone(phone, {
      page: +page,
      limit: +limit,
    });
  }

  /**
   * 获取支付统计信息
   */
  @Get('statistics/overview')
  async getPaymentStatistics(@Query() query: any) {
    this.logger.log('获取支付统计信息');
    return this.paymentsService.getPaymentStatistics(query);
  }

  /**
   * 导出支付数据
   */
  @Get('export')
  @ApiOperation({ summary: '导出支付数据' })
  async exportPayments(@Query() searchDto: PaymentSearchDto) {
    this.logger.log(`导出支付数据: ${JSON.stringify(searchDto)}`);
    return this.paymentsService.exportPayments(searchDto);
  }

  /**
   * 获取支付趋势数据
   */
  @Get('trends')
  @ApiOperation({ summary: '获取支付趋势数据' })
  async getPaymentTrends(@Query('period') period: string = '7d') {
    this.logger.log(`获取支付趋势数据: ${period}`);
    return this.paymentsService.getPaymentTrends(period);
  }

  /**
   * 检测可疑支付
   */
  @Get('suspicious')
  @ApiOperation({ summary: '检测可疑支付（支持分页与严重性筛选）' })
  @ApiResponse({ status: 200, description: '检测成功，返回可疑支付列表' })
  async getSuspiciousPayments(@Query() query: QuerySuspiciousPaymentsDto) {
    this.logger.log(`检测可疑支付: type=${query.type} severity=${query.severity} page=${query.page} limit=${query.limit}`);
    return this.paymentsService.getSuspiciousPayments(query);
  }

  /**
   * 标记解决可疑支付
   */
  @Patch('suspicious/:paymentId/resolve')
  @ApiOperation({ summary: '标记可疑支付已处理/忽略' })
  @ApiResponse({ status: 200, description: '处理成功' })
  async resolveSuspiciousPayment(@Param('paymentId') paymentId: string) {
    this.logger.log(`解决可疑支付: ${paymentId}`);
    return this.paymentsService.resolveSuspiciousPayment(paymentId);
  }

  /**
   * 通过订单号查找支付记录
   */
  @Get('by-order/:orderNo')
  async findByOrderNo(@Param('orderNo') orderNo: string) {
    this.logger.log(`通过订单号查找支付记录: ${orderNo}`);
    return this.paymentsService.findByOrderNo(orderNo);
  }

  // ==================== 退款申请管理 (移到 :id 路由之前) ====================

  /**
   * 创建退款申请
   */
  @Post('refund-requests')
  @ApiOperation({ summary: '创建退款申请' })
  @ApiResponse({ status: 201, description: '退款申请创建成功' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 404, description: '订单不存在' })
  async createRefundRequest(@Body() createDto: CreateRefundRequestDto) {
    this.logger.log(`创建退款申请: ${createDto.orderNo}`);
    return this.paymentsService.createRefundRequest(createDto);
  }

  /**
   * 获取退款申请列表
   */
  @Get('refund-requests')
  @ApiOperation({ summary: '获取退款申请列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async findAllRefundRequests(@Query() searchDto: RefundRequestSearchDto) {
    this.logger.log(`查询退款申请列表: ${JSON.stringify(searchDto)}`);
    return this.paymentsService.findAllRefundRequests(searchDto);
  }

  /**
   * 获取退款统计信息
   */
  @Get('refund-requests/statistics/summary')
  @ApiOperation({ summary: '获取退款统计信息' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getRefundStatistics(@Query() query: RefundRequestSearchDto) {
    this.logger.log('获取退款统计信息');
    return this.paymentsService.getRefundStatistics(query);
  }

  /**
   * 获取订单的退款申请列表
   */
  @Get('refund-requests/order/:orderNo')
  @ApiOperation({ summary: '获取订单的退款申请列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getRefundRequestsByOrderNo(@Param('orderNo') orderNo: string) {
    this.logger.log(`获取订单退款申请: ${orderNo}`);
    return this.paymentsService.getRefundRequestsByOrderNo(orderNo);
  }

  /**
   * 获取退款申请详情
   */
  @Get('refund-requests/:id')
  @ApiOperation({ summary: '获取退款申请详情' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 404, description: '退款申请不存在' })
  async findOneRefundRequest(@Param('id') id: string) {
    this.logger.log(`获取退款申请详情: ${id}`);
    return this.paymentsService.findOneRefundRequest(id);
  }

  /**
   * 获取退款申请的审计记录
   */
  @Get('refund-requests/:id/audits')
  @ApiOperation({ summary: '获取退款申请审计记录' })
  async getRefundAudits(@Param('id') id: string) {
    this.logger.log(`获取退款申请审计记录: ${id}`);
    return this.paymentsService.getRefundAuditsByRefundRequestId(id);
  }

  /**
   * 审批通过退款申请
   */
  @Put('refund-requests/:id/approve')
  @ApiOperation({ summary: '审批通过退款申请' })
  @ApiResponse({ status: 200, description: '审批成功' })
  @ApiResponse({ status: 400, description: '状态错误' })
  @ApiResponse({ status: 404, description: '退款申请不存在' })
  async approveRefundRequest(
    @Param('id') id: string,
    @Body() approveDto: ApproveRefundRequestDto,
  ) {
    this.logger.log(`审批退款申请: ${id}`);
    return this.paymentsService.approveRefundRequest(id, approveDto);
  }

  /**
   * 拒绝退款申请
   */
  @Put('refund-requests/:id/reject')
  @ApiOperation({ summary: '拒绝退款申请' })
  @ApiResponse({ status: 200, description: '拒绝成功' })
  @ApiResponse({ status: 400, description: '状态错误' })
  @ApiResponse({ status: 404, description: '退款申请不存在' })
  async rejectRefundRequest(
    @Param('id') id: string,
    @Body() rejectDto: RejectRefundRequestDto,
  ) {
    this.logger.log(`拒绝退款申请: ${id}`);
    return this.paymentsService.rejectRefundRequest(id, rejectDto);
  }

  /**
   * 执行退款
   */
  @Post('refund-requests/:id/process')
  @ApiOperation({ summary: '执行退款' })
  @ApiResponse({ status: 200, description: '退款成功' })
  @ApiResponse({ status: 400, description: '状态错误' })
  @ApiResponse({ status: 404, description: '退款申请不存在' })
  async processRefundRequest(
    @Param('id') id: string,
    @Body() processDto: ProcessRefundRequestDto,
  ) {
    this.logger.log(`执行退款: ${id}`);
    return this.paymentsService.processRefundRequest(id, processDto);
  }

  /**
   * 取消退款申请
   */
  @Put('refund-requests/:id/cancel')
  @ApiOperation({ summary: '取消退款申请' })
  @ApiResponse({ status: 200, description: '取消成功' })
  @ApiResponse({ status: 400, description: '状态错误' })
  @ApiResponse({ status: 404, description: '退款申请不存在' })
  async cancelRefundRequest(@Param('id') id: string) {
    this.logger.log(`取消退款申请: ${id}`);
    return this.paymentsService.cancelRefundRequest(id);
  }

  // ==================== 支付详情相关路由 ====================

  /**
   * 查询支付状态
   */
  @Get(':id/status')
  async getPaymentStatus(@Param('id') id: string) {
    this.logger.log(`查询支付状态: ${id}`);
    return this.paymentsService.getPaymentStatus(id);
  }

  /**
   * 获取支付详情
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    this.logger.log(`获取支付详情: ${id}`);
    return this.paymentsService.findOne(id);
  }

  /**
   * 更新支付信息
   */
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updatePaymentDto: UpdatePaymentDto,
  ) {
    this.logger.log(
      `更新支付信息: ${id}, 数据: ${JSON.stringify(updatePaymentDto)}`,
    );
    return this.paymentsService.update(id, updatePaymentDto);
  }

  /**
   * 申请退款
   */
  @Post(':id/refund')
  @ApiOperation({ summary: '申请退款' })
  @ApiResponse({ status: 200, description: '退款申请成功' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 404, description: '支付记录不存在' })
  async refund(
    @Param('id') id: string,
    @Body() refundPaymentDto: RefundPaymentDto,
  ) {
    this.logger.log(
      `申请退款: ${id}, 数据: ${JSON.stringify(refundPaymentDto)}`,
    );
    return this.paymentsService.refund(id, refundPaymentDto);
  }

  /**
   * 处理退款
   */
  @Post(':id/process-refund')
  @ApiOperation({ summary: '处理退款' })
  @ApiResponse({ status: 200, description: '退款处理成功' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 404, description: '支付记录不存在' })
  async processRefund(
    @Param('id') id: string,
    @Body() body: { reason?: string; notes?: string },
  ) {
    this.logger.log(`处理退款: ${id}, 原因: ${body.reason || '无'}`);
    return this.paymentsService.processRefund(id, body.reason, body.notes);
  }

  /**
   * 取消支付
   */
  @Post(':id/cancel')
  async cancel(@Param('id') id: string) {
    this.logger.log(`取消支付: ${id}`);
    return this.paymentsService.cancel(id);
  }

  /**
   * 删除支付记录
   */
  @Delete(':id')
  async remove(@Param('id') id: string) {
    this.logger.log(`删除支付记录: ${id}`);
    return this.paymentsService.remove(id);
  }

  /**
   * 手动同步支付状态
   */
  @Post(':id/sync-status')
  async syncPaymentStatus(@Param('id') id: string) {
    this.logger.log(`手动同步支付状态: ${id}`);
    return this.paymentsService.syncPaymentStatus(id);
  }

  /**
   * 获取订单余额信息
   */
  @Get('orders/:orderId/balance')
  @ApiOperation({ summary: '获取订单余额信息' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 404, description: '订单不存在' })
  async getOrderBalance(@Param('orderId') orderId: string) {
    this.logger.log(`获取订单余额信息: ${orderId}`);
    return this.paymentsService.getOrderBalance(orderId);
  }

  /**
   * 收取尾款
   */
  @Post('collect-balance')
  @ApiOperation({ summary: '收取尾款' })
  @ApiResponse({ status: 200, description: '尾款收取成功' })
  @ApiResponse({ status: 400, description: '请求参数错误或金额超限' })
  @ApiResponse({ status: 404, description: '订单不存在' })
  async collectBalance(@Body() collectBalanceDto: CollectBalanceDto) {
    this.logger.log(`收取尾款: ${JSON.stringify(collectBalanceDto)}`);
    return this.paymentsService.collectBalance(collectBalanceDto);
  }

  /**
   * 确认支付(手动确认)
   */
  @Post(':id/confirm')
  @ApiOperation({ summary: '确认支付(手动确认)' })
  @ApiResponse({ status: 200, description: '支付确认成功' })
  @ApiResponse({ status: 404, description: '支付记录不存在' })
  @ApiResponse({ status: 400, description: '支付已确认或状态异常' })
  async confirmPayment(@Param('id') id: string) {
    this.logger.log(`确认支付: ${id}`);
    return this.paymentsService.confirmPayment(id);
  }

  /**
   * 获取订单支付记录
   */
  @Get('orders/:orderId/history')
  @ApiOperation({ summary: '获取订单支付记录' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 404, description: '订单不存在' })
  async getOrderPaymentHistory(@Param('orderId') orderId: string) {
    this.logger.log(`获取订单支付记录: ${orderId}`);
    return this.paymentsService.getOrderPaymentHistory(orderId);
  }

  /**
   * 手动触发对账任务
   */
  @Post('reconciliation/manual')
  @ApiOperation({ summary: '手动触发对账任务（检测订单-支付差异）' })
  @ApiResponse({ status: 200, description: '对账完成' })
  async manualReconciliation() {
    this.logger.log('手动触发对账任务');
    await this.reconciliationTask.manualReconciliation();
    return {
      code: 200,
      message: '对账任务执行完成，请查看日志获取详细结果',
    };
  }
}
