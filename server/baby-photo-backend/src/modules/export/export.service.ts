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
    res.setHeader('Content-Disposition', `attachment; filename="export.xlsx"`);

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
    res.setHeader('Content-Disposition', `attachment; filename="export.xlsx"`);

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
    res.setHeader('Content-Disposition', `attachment; filename="export.xlsx"`);

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
    res.setHeader('Content-Disposition', `attachment; filename="export.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();
  }

  /**
   * 导出套系数据
   */
  async exportPackages(res: Response) {
    this.logger.log('导出套系数据');

    const packages = await this.prisma.package.findMany({
      include: { packageCategory: true },
      orderBy: { sortOrder: 'asc' },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('套系数据');

    worksheet.columns = [
      { header: '套系ID', key: 'id', width: 10 },
      { header: '套系名称', key: 'name', width: 30 },
      { header: '套系价格', key: 'price', width: 12 },
      { header: '定金', key: 'deposit', width: 12 },
      { header: '分类', key: 'category', width: 15 },
      { header: '类型', key: 'packageType', width: 12 },
      { header: '状态', key: 'status', width: 10 },
      { header: '销量', key: 'salesVolume', width: 10 },
      { header: '排序', key: 'sortOrder', width: 8 },
      { header: '创建时间', key: 'createdAt', width: 20 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

    packages.forEach(pkg => {
      worksheet.addRow({
        id: pkg.id,
        name: pkg.name,
        price: Number(pkg.price),
        deposit: Number(pkg.deposit),
        category: pkg.packageCategory?.name || '',
        packageType: pkg.packageType,
        status: pkg.status === 'ACTIVE' ? '上架' : '下架',
        salesVolume: pkg.salesVolume,
        sortOrder: pkg.sortOrder,
        createdAt: dayjs(pkg.createdAt).format('YYYY-MM-DD HH:mm:ss'),
      });
    });

    const filename = `套系数据_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="export.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  }

  /**
   * 导出商品数据
   */
  async exportProducts(res: Response) {
    this.logger.log('导出商品数据');

    const products = await this.prisma.product.findMany({
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('商品数据');

    worksheet.columns = [
      { header: '商品ID', key: 'id', width: 10 },
      { header: '商品编号', key: 'productNo', width: 20 },
      { header: '商品名称', key: 'name', width: 30 },
      { header: '分类', key: 'category', width: 15 },
      { header: '规格', key: 'specification', width: 15 },
      { header: '单位', key: 'unit', width: 8 },
      { header: '成本价', key: 'costPrice', width: 12 },
      { header: '售价', key: 'salePrice', width: 12 },
      { header: '库存数量', key: 'stockQuantity', width: 10 },
      { header: '状态', key: 'status', width: 10 },
      { header: '创建时间', key: 'createdAt', width: 20 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

    products.forEach(product => {
      worksheet.addRow({
        id: product.id,
        productNo: product.productNo,
        name: product.name,
        category: product.category?.name || '',
        specification: product.specification || '',
        unit: product.unit,
        costPrice: Number(product.costPrice),
        salePrice: Number(product.salePrice),
        stockQuantity: product.stockQuantity,
        status: product.status === 'ACTIVE' ? '上架' : '下架',
        createdAt: dayjs(product.createdAt).format('YYYY-MM-DD HH:mm:ss'),
      });
    });

    const filename = `商品数据_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="export.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  }

  /**
   * 导出服务项目数据
   */
  async exportServiceItems(res: Response) {
    this.logger.log('导出服务项目数据');

    const items = await this.prisma.serviceItem.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('服务项目数据');

    worksheet.columns = [
      { header: '服务ID', key: 'id', width: 10 },
      { header: '服务编号', key: 'serviceNo', width: 20 },
      { header: '服务名称', key: 'name', width: 30 },
      { header: '分类', key: 'category', width: 15 },
      { header: '基础价格', key: 'basePrice', width: 12 },
      { header: '时长(分钟)', key: 'duration', width: 10 },
      { header: '是否启用', key: 'isActive', width: 10 },
      { header: '创建时间', key: 'createdAt', width: 20 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

    items.forEach(item => {
      worksheet.addRow({
        id: item.id,
        serviceNo: item.serviceNo,
        name: item.name,
        category: item.category,
        basePrice: Number(item.basePrice),
        duration: item.duration || '',
        isActive: item.isActive ? '是' : '否',
        createdAt: dayjs(item.createdAt).format('YYYY-MM-DD HH:mm:ss'),
      });
    });

    const filename = `服务项目数据_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="export.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  }

  /**
   * 导出顾客数据
   */
  async exportCustomers(res: Response) {
    this.logger.log('导出顾客数据');

    const customers = await this.prisma.wxUser.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('顾客数据');

    worksheet.columns = [
      { header: 'OpenID', key: 'openid', width: 30 },
      { header: '昵称', key: 'nickname', width: 20 },
      { header: '手机号', key: 'phone', width: 15 },
      { header: '姓名', key: 'realName', width: 12 },
      { header: '性别', key: 'gender', width: 8 },
      { header: '生日', key: 'birthday', width: 15 },
      { header: '会员等级', key: 'memberLevel', width: 12 },
      { header: '积分余额', key: 'pointsBalance', width: 10 },
      { header: '总订单数', key: 'totalOrders', width: 10 },
      { header: '消费总额', key: 'totalAmount', width: 14 },
      { header: '注册时间', key: 'createdAt', width: 20 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

    customers.forEach(c => {
      const genderMap: Record<number, string> = { 0: '未知', 1: '男', 2: '女' };
      worksheet.addRow({
        openid: c.openid,
        nickname: c.nickname || '',
        phone: c.phone || '',
        realName: c.realName || '',
        gender: genderMap[c.gender ?? 0] || '未知',
        birthday: c.birthday ? dayjs(c.birthday).format('YYYY-MM-DD') : '',
        memberLevel: c.memberLevel,
        pointsBalance: c.pointsBalance,
        totalOrders: c.totalOrders,
        totalAmount: Number(c.totalAmount),
        createdAt: dayjs(c.createdAt).format('YYYY-MM-DD HH:mm:ss'),
      });
    });

    const filename = `顾客数据_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="export.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  }

  /**
   * 导出团购数据
   */
  async exportGroupBuys(res: Response) {
    this.logger.log('导出团购数据');

    const activities = await this.prisma.groupBuyActivity.findMany({
      include: {
        package: { select: { name: true } },
        product: { select: { name: true } },
        creator: { select: { nickname: true } },
        participants: { select: { id: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('团购数据');

    worksheet.columns = [
      { header: '活动ID', key: 'id', width: 35 },
      { header: '关联套餐', key: 'packageName', width: 25 },
      { header: '关联商品', key: 'productName', width: 25 },
      { header: '创建人', key: 'creator', width: 15 },
      { header: '最少成团', key: 'minCount', width: 10 },
      { header: '最多人数', key: 'maxCount', width: 10 },
      { header: '参团人数', key: 'participantCount', width: 10 },
      { header: '状态', key: 'status', width: 10 },
      { header: '到期时间', key: 'expiredAt', width: 20 },
      { header: '创建时间', key: 'createdAt', width: 20 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

    const statusMap: Record<string, string> = { ACTIVE: '进行中', SUCCESS: '已成团', FAILED: '未成团' };

    activities.forEach(a => {
      worksheet.addRow({
        id: a.id,
        packageName: a.package?.name || '',
        productName: a.product?.name || '',
        creator: a.creator?.nickname || '',
        minCount: a.minCount,
        maxCount: a.maxCount || '',
        participantCount: a.participants?.length || 0,
        status: statusMap[a.status] || a.status,
        expiredAt: a.expiredAt ? dayjs(a.expiredAt).format('YYYY-MM-DD HH:mm:ss') : '',
        createdAt: dayjs(a.createdAt).format('YYYY-MM-DD HH:mm:ss'),
      });
    });

    const filename = `团购数据_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="export.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  }

  /**
   * 导出积分/优惠券数据
   */
  async exportPoints(res: Response) {
    this.logger.log('导出积分/优惠券数据');

    const coupons = await this.prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('优惠券数据');

    worksheet.columns = [
      { header: '优惠券ID', key: 'id', width: 35 },
      { header: '优惠码', key: 'couponCode', width: 20 },
      { header: '名称', key: 'couponName', width: 25 },
      { header: '类型', key: 'couponType', width: 15 },
      { header: '折扣类型', key: 'discountType', width: 12 },
      { header: '折扣值', key: 'discountValue', width: 12 },
      { header: '最低消费', key: 'minAmount', width: 12 },
      { header: '发放总数', key: 'totalCount', width: 10 },
      { header: '已使用', key: 'usedCount', width: 10 },
      { header: '状态', key: 'status', width: 10 },
      { header: '开始时间', key: 'startTime', width: 20 },
      { header: '结束时间', key: 'endTime', width: 20 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

    const typeMap: Record<string, string> = { REGISTER: '注册', PROMOTION: '促销', REBATE: '返利', BIRTHDAY: '生日', GROUP_BUY: '团购' };
    const discountTypeMap: Record<string, string> = { PERCENT: '百分比', FIXED: '固定金额' };
    const statusMap: Record<string, string> = { ACTIVE: '启用', INACTIVE: '停用', EXPIRED: '过期' };

    coupons.forEach(c => {
      worksheet.addRow({
        id: c.id,
        couponCode: c.couponCode,
        couponName: c.couponName,
        couponType: typeMap[c.couponType] || c.couponType,
        discountType: discountTypeMap[c.discountType] || c.discountType,
        discountValue: Number(c.discountValue),
        minAmount: c.minAmount ? Number(c.minAmount) : '',
        totalCount: c.totalCount,
        usedCount: c.usedCount,
        status: statusMap[c.status] || c.status,
        startTime: dayjs(c.startTime).format('YYYY-MM-DD HH:mm:ss'),
        endTime: dayjs(c.endTime).format('YYYY-MM-DD HH:mm:ss'),
      });
    });

    const filename = `优惠券数据_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="export.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  }

  /**
   * 导出拍摄日程数据
   */
  async exportTimeSlots(res: Response) {
    this.logger.log('导出拍摄日程数据');

    const slots = await this.prisma.timeSlot.findMany({
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('拍摄日程数据');

    worksheet.columns = [
      { header: '日期', key: 'date', width: 15 },
      { header: '开始时间', key: 'startTime', width: 12 },
      { header: '结束时间', key: 'endTime', width: 12 },
      { header: '容量', key: 'capacity', width: 8 },
      { header: '已预约', key: 'bookedCount', width: 8 },
      { header: '价格倍率', key: 'priceMultiplier', width: 10 },
      { header: '是否节假日', key: 'isHoliday', width: 10 },
      { header: '状态', key: 'status', width: 12 },
      { header: '备注', key: 'notes', width: 30 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

    const statusMap: Record<string, string> = { AVAILABLE: '可预约', BOOKED: '已约满', UNAVAILABLE: '不可约' };

    slots.forEach(s => {
      worksheet.addRow({
        date: dayjs(s.date).format('YYYY-MM-DD'),
        startTime: dayjs(s.startTime).format('HH:mm'),
        endTime: dayjs(s.endTime).format('HH:mm'),
        capacity: s.capacity,
        bookedCount: s.bookedCount,
        priceMultiplier: s.priceMultiplier,
        isHoliday: s.isHoliday ? '是' : '否',
        status: statusMap[s.status] || s.status,
        notes: s.notes || '',
      });
    });

    const filename = `拍摄日程数据_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="export.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  }

  /**
   * 导出退款数据
   */
  async exportRefunds(res: Response) {
    this.logger.log('导出退款数据');

    const refunds = await this.prisma.refundRequest.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('退款数据');

    worksheet.columns = [
      { header: '退款编号', key: 'refundNo', width: 25 },
      { header: '订单号', key: 'orderNo', width: 25 },
      { header: '退款类型', key: 'refundType', width: 12 },
      { header: '退款金额', key: 'refundAmount', width: 12 },
      { header: '退款原因', key: 'refundReason', width: 30 },
      { header: '状态', key: 'status', width: 12 },
      { header: '审核人', key: 'approvedBy', width: 15 },
      { header: '创建时间', key: 'createdAt', width: 20 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

    const typeMap: Record<string, string> = { FULL: '全额退款', PARTIAL: '部分退款', DEPOSIT_ONLY: '仅退定金' };
    const statusMap: Record<string, string> = { PENDING: '待审核', APPROVED: '已通过', REJECTED: '已拒绝', PROCESSING: '处理中', COMPLETED: '已完成', FAILED: '失败', CANCELLED: '已取消' };

    refunds.forEach(r => {
      worksheet.addRow({
        refundNo: r.refundNo,
        orderNo: r.orderNo,
        refundType: typeMap[r.refundType] || r.refundType,
        refundAmount: Number(r.refundAmount),
        refundReason: r.refundReason || '',
        status: statusMap[r.status] || r.status,
        approvedBy: r.approvedBy || '',
        createdAt: dayjs(r.createdAt).format('YYYY-MM-DD HH:mm:ss'),
      });
    });

    const filename = `退款数据_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="export.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  }

  /**
   * 导出采购订单数据
   */
  async exportPurchaseOrders(res: Response) {
    this.logger.log('导出采购订单数据');

    const orders = await this.prisma.purchaseOrder.findMany({
      include: { supplier: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('采购订单数据');

    worksheet.columns = [
      { header: '采购单号', key: 'purchaseNo', width: 25 },
      { header: '供应商', key: 'supplierName', width: 25 },
      { header: '总数量', key: 'totalQuantity', width: 10 },
      { header: '总金额', key: 'totalAmount', width: 14 },
      { header: '折后金额', key: 'finalAmount', width: 14 },
      { header: '运费', key: 'shippingFee', width: 10 },
      { header: '订单状态', key: 'status', width: 12 },
      { header: '物流状态', key: 'shippingStatus', width: 12 },
      { header: '备注', key: 'remark', width: 30 },
      { header: '创建时间', key: 'createdAt', width: 20 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

    const statusMap: Record<string, string> = { DRAFT: '草稿', PENDING: '待审核', APPROVED: '已通过', REJECTED: '已拒绝', PARTIALLY_RECEIVED: '部分收货', FULLY_RECEIVED: '已收货', CANCELLED: '已取消' };
    const shippingMap: Record<string, string> = { PENDING: '待发货', SHIPPED: '已发货', RECEIVED: '已收货' };

    orders.forEach(o => {
      worksheet.addRow({
        purchaseNo: o.purchaseNo,
        supplierName: o.supplier?.name || '',
        totalQuantity: o.totalQuantity,
        totalAmount: Number(o.totalAmount),
        finalAmount: Number(o.finalAmount),
        shippingFee: Number(o.shippingFee),
        status: statusMap[o.status] || o.status,
        shippingStatus: shippingMap[o.shippingStatus] || o.shippingStatus,
        remark: o.remark || '',
        createdAt: dayjs(o.createdAt).format('YYYY-MM-DD HH:mm:ss'),
      });
    });

    const filename = `采购订单数据_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="export.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  }

  /**
   * 导出库存商品数据
   */
  async exportStockItems(res: Response) {
    this.logger.log('导出库存商品数据');

    const products = await this.prisma.product.findMany({
      include: { category: { select: { name: true } } },
      orderBy: { stockQuantity: 'asc' },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('库存商品数据');

    worksheet.columns = [
      { header: '商品编号', key: 'productNo', width: 20 },
      { header: '商品名称', key: 'name', width: 30 },
      { header: '分类', key: 'category', width: 15 },
      { header: '库存数量', key: 'stockQuantity', width: 10 },
      { header: '最低库存', key: 'minStock', width: 10 },
      { header: '安全库存', key: 'safetyStock', width: 10 },
      { header: '日均消耗', key: 'dailyConsumption', width: 10 },
      { header: '补货点', key: 'reorderPoint', width: 10 },
      { header: '售价', key: 'salePrice', width: 12 },
      { header: '状态', key: 'status', width: 10 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

    products.forEach(p => {
      worksheet.addRow({
        productNo: p.productNo,
        name: p.name,
        category: p.category?.name || '',
        stockQuantity: p.stockQuantity,
        minStock: p.minStock ?? p.lowStock,
        safetyStock: p.safetyStock,
        dailyConsumption: p.dailyConsumption,
        reorderPoint: p.reorderPoint || '',
        salePrice: Number(p.salePrice),
        status: p.status === 'ACTIVE' ? '上架' : '下架',
      });
    });

    const filename = `库存商品数据_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="export.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  }

  /**
   * 导出供应商数据
   */
  async exportSuppliers(res: Response) {
    this.logger.log('导出供应商数据');

    const suppliers = await this.prisma.supplier.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('供应商数据');

    worksheet.columns = [
      { header: '供应商编号', key: 'supplierNo', width: 20 },
      { header: '供应商名称', key: 'name', width: 25 },
      { header: '联系人', key: 'contactPerson', width: 15 },
      { header: '联系电话', key: 'contactPhone', width: 15 },
      { header: '分类', key: 'category', width: 15 },
      { header: '类型', key: 'supplierType', width: 12 },
      { header: '状态', key: 'status', width: 10 },
      { header: '信用等级', key: 'creditLevel', width: 10 },
      { header: '总订单数', key: 'totalOrders', width: 10 },
      { header: '总金额', key: 'totalAmount', width: 14 },
      { header: '创建时间', key: 'createdAt', width: 20 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

    suppliers.forEach(s => {
      worksheet.addRow({
        supplierNo: s.supplierNo,
        name: s.name,
        contactPerson: s.contactPerson,
        contactPhone: s.contactPhone,
        category: s.category || '',
        supplierType: s.supplierType,
        status: s.status === 'ACTIVE' ? '启用' : '停用',
        creditLevel: s.creditLevel || '',
        totalOrders: s.totalOrders,
        totalAmount: Number(s.totalAmount),
        createdAt: dayjs(s.createdAt).format('YYYY-MM-DD HH:mm:ss'),
      });
    });

    const filename = `供应商数据_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="export.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  }

  /**
   * 导出在途商品数据
   */
  async exportInTransit(res: Response) {
    this.logger.log('导出在途商品数据');

    const items = await this.prisma.inTransitGoods.findMany({
      include: { purchaseOrder: { select: { purchaseNo: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('在途商品');

    worksheet.columns = [
      { header: '在途编号', key: 'transitNo', width: 25 },
      { header: '采购单号', key: 'purchaseNo', width: 25 },
      { header: '总数量', key: 'totalQuantity', width: 10 },
      { header: '总金额', key: 'totalAmount', width: 12 },
      { header: '发货日期', key: 'shippedDate', width: 12 },
      { header: '承运方', key: 'shippingCompany', width: 15 },
      { header: '运单号', key: 'trackingNo', width: 20 },
      { header: '物流状态', key: 'shippingStatus', width: 12 },
      { header: '预计到货', key: 'expectedDate', width: 12 },
      { header: '实际到货', key: 'actualDate', width: 12 },
      { header: '是否延迟', key: 'isDelayed', width: 8 },
      { header: '异常', key: 'hasException', width: 8 },
      { header: '当前位置', key: 'currentLocation', width: 20 },
      { header: '创建时间', key: 'createdAt', width: 20 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

    const statusMap: Record<string, string> = {
      PREPARING: '准备中', SHIPPED: '已发货', IN_TRANSIT: '运输中',
      ARRIVED: '已到达', CHECKING: '验收中', COMPLETED: '已完成', EXCEPTION: '异常',
    };

    items.forEach(item => {
      worksheet.addRow({
        transitNo: item.transitNo,
        purchaseNo: item.purchaseOrder?.purchaseNo || '',
        totalQuantity: item.totalQuantity,
        totalAmount: Number(item.totalAmount),
        shippedDate: item.shippedDate ? dayjs(item.shippedDate).format('YYYY-MM-DD') : '',
        shippingCompany: item.shippingCompany || '',
        trackingNo: item.trackingNo || '',
        shippingStatus: statusMap[item.shippingStatus] || item.shippingStatus,
        expectedDate: item.expectedDate ? dayjs(item.expectedDate).format('YYYY-MM-DD') : '',
        actualDate: item.actualDate ? dayjs(item.actualDate).format('YYYY-MM-DD') : '',
        isDelayed: item.isDelayed ? '是' : '否',
        hasException: item.hasException ? '是' : '否',
        currentLocation: item.currentLocation || '',
        createdAt: dayjs(item.createdAt).format('YYYY-MM-DD HH:mm:ss'),
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="export.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  }

  /**
   * 导出入库记录数据
   */
  async exportInbound(res: Response) {
    this.logger.log('导出入库记录数据');

    const records = await this.prisma.inboundRecord.findMany({
      include: {
        purchaseOrder: { select: { purchaseNo: true } },
        inTransit: { select: { transitNo: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('入库记录');

    worksheet.columns = [
      { header: '入库编号', key: 'inboundNo', width: 25 },
      { header: '采购单号', key: 'purchaseNo', width: 25 },
      { header: '在途编号', key: 'transitNo', width: 25 },
      { header: '入库日期', key: 'inboundDate', width: 15 },
      { header: '入库类型', key: 'inboundType', width: 12 },
      { header: '预期数量', key: 'expectedQuantity', width: 10 },
      { header: '实际数量', key: 'actualQuantity', width: 10 },
      { header: '合格数量', key: 'qualifiedQuantity', width: 10 },
      { header: '不合格数量', key: 'defectiveQuantity', width: 10 },
      { header: '质检状态', key: 'qualityCheckStatus', width: 10 },
      { header: '入库状态', key: 'inboundStatus', width: 10 },
      { header: '总金额', key: 'totalAmount', width: 12 },
      { header: '确认人', key: 'confirmedBy', width: 12 },
      { header: '创建时间', key: 'createdAt', width: 20 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

    const typeMap: Record<string, string> = { PURCHASE: '采购入库', RETURN: '退货入库', TRANSFER: '调拨入库' };
    const qcMap: Record<string, string> = { PENDING: '待质检', PASSED: '已通过', FAILED: '未通过' };
    const statusMap: Record<string, string> = { PENDING: '待处理', CONFIRMED: '已确认', CANCELLED: '已取消' };

    records.forEach(r => {
      worksheet.addRow({
        inboundNo: r.inboundNo,
        purchaseNo: r.purchaseOrder?.purchaseNo || '',
        transitNo: r.inTransit?.transitNo || '',
        inboundDate: r.inboundDate ? dayjs(r.inboundDate).format('YYYY-MM-DD HH:mm:ss') : '',
        inboundType: typeMap[r.inboundType] || r.inboundType,
        expectedQuantity: r.expectedQuantity,
        actualQuantity: r.actualQuantity,
        qualifiedQuantity: r.qualifiedQuantity,
        defectiveQuantity: r.defectiveQuantity,
        qualityCheckStatus: qcMap[r.qualityCheckStatus] || r.qualityCheckStatus,
        inboundStatus: statusMap[r.inboundStatus] || r.inboundStatus,
        totalAmount: Number(r.totalAmount),
        confirmedBy: r.confirmedBy || '',
        createdAt: dayjs(r.createdAt).format('YYYY-MM-DD HH:mm:ss'),
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="export.xlsx"`);
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
