import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import * as ExcelJS from 'exceljs';
import { Response } from 'express';
import dayjs from 'dayjs';

export interface OrderExportQuery {
  startDate?: string;
  endDate?: string;
  orderStatus?: string;
  paymentStatus?: string;
  userId?: string;
  packageId?: string;
}

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 导出订单数据
   */
  async exportOrders(query: OrderExportQuery, res: Response) {
    this.logger.log(`导出订单数据: ${JSON.stringify(query)}`);

    // 构建查询条件
    const where: any = {};
    if (query.startDate && query.endDate) {
      where.createdAt = {
        gte: new Date(query.startDate),
        lte: new Date(query.endDate),
      };
    }
    if (query.orderStatus) {
      where.orderStatus = query.orderStatus;
    }
    if (query.paymentStatus) {
      where.paymentStatus = query.paymentStatus;
    }
    if (query.userId) {
      where.userId = Number(query.userId);
    }
    if (query.packageId) {
      where.packageId = Number(query.packageId);
    }

    // 查询订单数据
    const orders = await this.prisma.order.findMany({
      where,
      include: {
        user: true,
        package: true,
        timeSlot: true,
        payments: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 创建Excel工作簿
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('订单数据');

    // 设置列
    worksheet.columns = [
      { header: '订单号', key: 'orderNo', width: 25 },
      { header: '用户姓名', key: 'userName', width: 15 },
      { header: '用户手机', key: 'userPhone', width: 15 },
      { header: '套餐名称', key: 'packageName', width: 30 },
      { header: '套餐价格', key: 'packagePrice', width: 12 },
      { header: '预约日期', key: 'appointmentDate', width: 15 },
      { header: '预约时间', key: 'appointmentTime', width: 20 },
      { header: '订单状态', key: 'orderStatus', width: 12 },
      { header: '支付状态', key: 'paymentStatus', width: 12 },
      { header: '订单金额', key: 'totalAmount', width: 12 },
      { header: '已支付', key: 'paidAmount', width: 12 },
      { header: '支付方式', key: 'paymentMethod', width: 15 },
      { header: '第三方订单号', key: 'thirdPartyOrderNo', width: 30 },
      { header: '创建时间', key: 'createdAt', width: 20 },
      { header: '备注', key: 'notes', width: 30 },
    ];

    // 设置表头样式
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // 添加数据
    orders.forEach(order => {
      const firstPayment = order.payments?.[0];
      worksheet.addRow({
        orderNo: order.orderNo,
        userName: order.user?.nickname || '未设置',
        userPhone: order.user?.phone || '',
        packageName: order.package?.name || '',
        packagePrice: Number(order.package?.price || 0),
        appointmentDate: order.timeSlot ? dayjs(order.timeSlot.date).format('YYYY-MM-DD') : '',
        appointmentTime: order.timeSlot ? `${order.timeSlot.startTime}-${order.timeSlot.endTime}` : '',
        orderStatus: this.getOrderStatusText(order.orderStatus),
        paymentStatus: this.getPaymentStatusText(order.paymentStatus),
        totalAmount: Number(order.totalAmount || 0),
        paidAmount: Number(order.paidAmount || 0),
        paymentMethod: firstPayment?.paymentType || '',
        thirdPartyOrderNo: firstPayment?.transactionId || '',
        createdAt: dayjs(order.createdAt).format('YYYY-MM-DD HH:mm:ss'),
        notes: order.notes || '',
      });
    });

    // 设置自动筛选
    worksheet.autoFilter = {
      from: 'A1',
      to: `O${orders.length + 1}`,
    };

    // 设置响应头
    const filename = `订单数据_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.xlsx`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);

    // 写入响应
    await workbook.xlsx.write(res);
    res.end();
  }

  /**
   * 导出用户数据
   */
  async exportUsers(res: Response) {
    this.logger.log('导出用户数据');

    const users = await this.prisma.user.findMany({
      include: {
        _count: {
          select: {
            orders: true,
          },
        },
      },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('用户数据');

    worksheet.columns = [
      { header: '用户ID', key: 'id', width: 10 },
      { header: 'OpenID', key: 'openid', width: 30 },
      { header: '昵称', key: 'nickname', width: 20 },
      { header: '手机号', key: 'phone', width: 15 },
      { header: '订单数量', key: 'orderCount', width: 12 },
      { header: '注册时间', key: 'createdAt', width: 20 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    users.forEach(user => {
      worksheet.addRow({
        id: user.id,
        openid: user.openid,
        nickname: user.nickname || '未设置',
        phone: user.phone || '',
        orderCount: user._count?.orders || 0,
        createdAt: dayjs(user.createdAt).format('YYYY-MM-DD HH:mm:ss'),
      });
    });

    const filename = `用户数据_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.xlsx`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);

    await workbook.xlsx.write(res);
    res.end();
  }

  /**
   * 导出财务数据
   */
  async exportFinancial(startDate: string, endDate: string, res: Response) {
    this.logger.log(`导出财务数据: ${startDate} - ${endDate}`);

    const payments = await this.prisma.payment.findMany({
      where: {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      include: {
        order: {
          include: {
            user: true,
            package: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('财务明细');

    worksheet.columns = [
      { header: '支付单号', key: 'paymentId', width: 25 },
      { header: '订单号', key: 'orderNo', width: 25 },
      { header: '用户', key: 'userName', width: 15 },
      { header: '套餐', key: 'packageName', width: 30 },
      { header: '支付金额', key: 'amount', width: 12 },
      { header: '支付方式', key: 'paymentType', width: 15 },
      { header: '支付状态', key: 'status', width: 12 },
      { header: '第三方交易号', key: 'transactionId', width: 30 },
      { header: '支付时间', key: 'paidAt', width: 20 },
      { header: '创建时间', key: 'createdAt', width: 20 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    let totalAmount = 0;
    payments.forEach(payment => {
      worksheet.addRow({
        paymentId: payment.id,
        orderNo: payment.order?.orderNo || '',
        userName: payment.order?.user?.nickname || '',
        packageName: payment.order?.package?.name || '',
        amount: Number(payment.amount),
        paymentType: payment.paymentType,
        status: this.getPaymentStatusText(payment.status),
        transactionId: payment.transactionId || '',
        paidAt: payment.paidAt ? dayjs(payment.paidAt).format('YYYY-MM-DD HH:mm:ss') : '',
        createdAt: dayjs(payment.createdAt).format('YYYY-MM-DD HH:mm:ss'),
      });
      
      if (payment.status === 'FULLY_PAID') {
        totalAmount += Number(payment.amount);
      }
    });

    // 添加汇总行
    worksheet.addRow({});
    const summaryRow = worksheet.addRow({
      paymentNo: '总计',
      amount: totalAmount,
    });
    summaryRow.font = { bold: true };
    summaryRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFF0E0' },
    };

    const filename = `财务明细_${dayjs(startDate).format('YYYYMMDD')}-${dayjs(endDate).format('YYYYMMDD')}.xlsx`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);

    await workbook.xlsx.write(res);
    res.end();
  }

  /**
   * 导出全部数据(多Sheet)
   */
  async exportAll(res: Response) {
    this.logger.log('导出全部数据');

    const workbook = new ExcelJS.Workbook();

    // Sheet 1: 订单数据
    const ordersSheet = workbook.addWorksheet('订单数据');
    const orders = await this.prisma.order.findMany({
      include: { user: true, package: true, timeSlot: true, payments: true },
      take: 10000, // 限制数量
    });
    
    ordersSheet.columns = [
      { header: '订单号', key: 'orderNo', width: 25 },
      { header: '用户', key: 'userName', width: 15 },
      { header: '套餐', key: 'packageName', width: 30 },
      { header: '金额', key: 'totalAmount', width: 12 },
      { header: '状态', key: 'orderStatus', width: 12 },
      { header: '创建时间', key: 'createdAt', width: 20 },
    ];
    ordersSheet.getRow(1).font = { bold: true };
    orders.forEach(order => {
      ordersSheet.addRow({
        orderNo: order.orderNo,
        userName: order.user?.nickname || '',
        packageName: order.package?.name || '',
        totalAmount: Number(order.totalAmount),
        orderStatus: this.getOrderStatusText(order.orderStatus),
        createdAt: dayjs(order.createdAt).format('YYYY-MM-DD HH:mm:ss'),
      });
    });

    // Sheet 2: 用户数据
    const usersSheet = workbook.addWorksheet('用户数据');
    const users = await this.prisma.user.findMany({
      take: 10000,
    });
    
    usersSheet.columns = [
      { header: '用户ID', key: 'id', width: 10 },
      { header: '昵称', key: 'nickname', width: 20 },
      { header: '手机号', key: 'phone', width: 15 },
      { header: '注册时间', key: 'createdAt', width: 20 },
    ];
    usersSheet.getRow(1).font = { bold: true };
    users.forEach(user => {
      usersSheet.addRow({
        id: user.id,
        nickname: user.nickname || '未设置',
        phone: user.phone || '',
        createdAt: dayjs(user.createdAt).format('YYYY-MM-DD HH:mm:ss'),
      });
    });

    // Sheet 3: 财务数据
    const paymentsSheet = workbook.addWorksheet('财务数据');
    const payments = await this.prisma.payment.findMany({
      include: { order: { include: { user: true } } },
      take: 10000,
    });
    
    paymentsSheet.columns = [
      { header: '支付单号', key: 'paymentId', width: 25 },
      { header: '订单号', key: 'orderNo', width: 25 },
      { header: '金额', key: 'amount', width: 12 },
      { header: '状态', key: 'status', width: 12 },
      { header: '支付时间', key: 'paidAt', width: 20 },
    ];
    paymentsSheet.getRow(1).font = { bold: true };
    payments.forEach(payment => {
      paymentsSheet.addRow({
        paymentId: payment.id,
        orderNo: payment.order?.orderNo || '',
        amount: Number(payment.amount),
        status: this.getPaymentStatusText(payment.status),
        paidAt: payment.paidAt ? dayjs(payment.paidAt).format('YYYY-MM-DD HH:mm:ss') : '',
      });
    });

    const filename = `完整数据导出_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.xlsx`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);

    await workbook.xlsx.write(res);
    res.end();
  }

  // 辅助方法
  private getOrderStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      PENDING: '待确认',
      CONFIRMED: '已确认',
      COMPLETED: '已完成',
      CANCELLED: '已取消',
    };
    return statusMap[status] || status;
  }

  private getPaymentStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      PENDING: '待支付',
      PAID: '已支付',
      REFUNDED: '已退款',
      FAILED: '支付失败',
    };
    return statusMap[status] || status;
  }
}
