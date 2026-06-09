import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { join } from 'path';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './modules/users/users.module';
import { PackagesModule } from './modules/packages/packages.module';
import { PackageCategoriesModule } from './modules/package-categories/package-categories.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { TimeSlotsModule } from './modules/time-slots/time-slots.module';
import { SearchModule } from './modules/search/search.module';
import { StatusMonitoringModule } from './modules/status-monitoring/status-monitoring.module';
import { StatisticsAnalysisModule } from './modules/statistics-analysis/statistics-analysis.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { PrismaModule } from './shared/prisma/prisma.module';
import { FilesModule } from './modules/files/files.module';
import { SystemBackupModule } from './modules/system-backup/system-backup.module';
import { OrderTimeoutScheduler } from './shared/schedulers/order-timeout.scheduler';
import { CrmScheduler } from './shared/schedulers/crm.scheduler';
import { AutoStatusTransitionService } from './shared/services/auto-status-transition.service';
import { StatusChangeLogService } from './shared/services/status-change-log.service';
import { AppointmentReminderScheduler } from './shared/schedulers/appointment-reminder.scheduler';
import { PhotoPickReminderScheduler } from './shared/schedulers/photo-pick-reminder.scheduler';
import { DailyReportScheduler } from './shared/schedulers/daily-report.scheduler';
import { ExportModule } from './modules/export/export.module';
import { StockOutboundModule } from './modules/stock-outbound/stock-outbound.module';
import { StockCheckModule } from './modules/stock-check/stock-check.module';
import { StockAlertModule } from './modules/stock-alert/stock-alert.module';
import { InventoryIntelligenceModule } from './modules/inventory-intelligence/inventory-intelligence.module';
import { StockTransferModule } from './modules/stock-transfer/stock-transfer.module';
import { StockTransactionModule } from './modules/stock-transaction/stock-transaction.module';
import { SupplierModule } from './supplier/supplier.module';
import { ProductCategoriesModule } from './modules/product-categories/product-categories.module';
import { ProductsModule } from './modules/products/products.module';
import { ServiceItemsModule } from './modules/service-items/service-items.module';
import { DiscountRulesModule } from './modules/discount-rules/discount-rules.module';
import { DiyPackagesModule } from './modules/diy-packages/diy-packages.module';
import { ShopInfoModule } from './modules/shop-info/shop-info.module';
import { PrintSettingsModule } from './modules/print-settings/print-settings.module';
import { WxAuthModule } from './modules/wx-auth/wx-auth.module';
import { WxMallModule } from './modules/wx-mall/wx-mall.module';
import { WxCartModule } from './modules/wx-cart/wx-cart.module';
import { WxOrderModule } from './modules/wx-order/wx-order.module';
import { WxCouponModule } from './modules/wx-coupon/wx-coupon.module';
import { WxAddressModule } from './modules/wx-address/wx-address.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AuthModule } from './modules/auth/auth.module';
import { OperationLogsModule } from './modules/operation-logs/operation-logs.module';
import { RolesModule } from './modules/roles/roles.module';
import { CrmModule } from './modules/crm/crm.module';
import { SeasonalPricesModule } from './modules/seasonal-prices/seasonal-prices.module';
import { CouponsModule } from './modules/coupons/coupons.module';
import { AutomationRulesModule } from './modules/automation-rules/automation-rules.module';
import { SmartMarketingModule } from './modules/smart-marketing/smart-marketing.module';
import { WxUserModule } from './modules/wx-user/wx-user.module';
import { WxFavoriteModule } from './modules/wx-favorite/wx-favorite.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { OperationLogInterceptor } from './shared/interceptors/operation-log.interceptor';

@Module({
  imports: [
    // 全局配置模块
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      cache: true,
    }),

    // 调度模块 - 用于定时任务（如对账任务）
    ScheduleModule.forRoot(),

    // 全局请求频率限制
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 10,   // 每秒最多10次
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 50,   // 每10秒最多50次
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 200,  // 每分钟最多200次
      },
    ]),

    // 数据库模块
    PrismaModule,
    // 静态文件服务（上传文件）
    // 静态文件服务
    // 原配置 serveRoot 为 '/files'，而前端与上传接口实际返回的路径是 '/uploads/...'，导致访问 404。
    // 此处改为直接映射 '/uploads'，保持与后端返回的相对路径一致，避免再做前端 URL 拼接转换错误。
    // 若生产环境需要自定义域名或 CDN，可通过 FILE_BASE_URL 生成完整 URL（见 FilesService）。
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), process.env.UPLOAD_PATH || './uploads'),
      serveRoot: '/uploads',
    }),

    // 业务模块
    UsersModule,
    PackagesModule,
    PackageCategoriesModule,
    OrdersModule,
    PaymentsModule,
    TimeSlotsModule,
    SearchModule,
    StatusMonitoringModule,
    StatisticsAnalysisModule,
    AnalyticsModule,
    FilesModule,
    SystemBackupModule,
    ExportModule,
    
    // 库存管理模块
    StockOutboundModule,
    StockCheckModule,
    StockAlertModule,
    StockTransferModule,
    StockTransactionModule,
    InventoryIntelligenceModule,
    
    // 供应链管理模块
    SupplierModule,
    
    // 商品管理模块
    ProductCategoriesModule,
    ProductsModule,
    ServiceItemsModule,
    
    // DIY套系管理模块
    DiscountRulesModule,
    DiyPackagesModule,
    ShopInfoModule,
    PrintSettingsModule,
    AuthModule,
    WxAuthModule,
    WxMallModule,
    WxCartModule,
    WxOrderModule,
    WxCouponModule,
    WxAddressModule,
    NotificationsModule,
    OperationLogsModule,
    RolesModule,
    CrmModule,
    SeasonalPricesModule,
    CouponsModule,
    AutomationRulesModule,
    SmartMarketingModule,
    WxUserModule,
    WxFavoriteModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: OperationLogInterceptor,
    },
    AppService,
    OrderTimeoutScheduler,
    CrmScheduler,
    AutoStatusTransitionService,
    StatusChangeLogService,
    AppointmentReminderScheduler,
    PhotoPickReminderScheduler,
    DailyReportScheduler,
  ],
})
export class AppModule { }
