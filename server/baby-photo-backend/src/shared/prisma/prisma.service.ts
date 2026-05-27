import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// 类型增强：若 TS 尚未识别新 model，可通过声明合并方式提示编译器。
// 正常情况下 prisma generate 后会自动带出属性，无需手动扩展；此处保留注释用于后续删除。
// declare module '@prisma/client' {
//   interface PrismaClient {
//     supplierRatingHistory: PrismaClient['supplierRatingHistory'];
//   }
// }

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
  // 可选：后续可添加查询日志/慢查询检测
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
