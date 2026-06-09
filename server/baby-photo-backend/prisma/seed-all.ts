/**
 * 微信小程序测试数据种子脚本
 *
 * 功能：初始化套系分类、套系、优惠券等数据
 * 运行：npx ts-node prisma/seed-all.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('========================================');
  console.log('🚀 开始初始化微信小程序测试数据');
  console.log('========================================\n');

  // ========================
  // 1. 套系分类
  // ========================
  console.log('1️⃣  创建套系分类...');
  const pkgCategories = await Promise.all([
    prisma.packageCategory.upsert({
      where: { name: '新生儿/满月' },
      update: {},
      create: { name: '新生儿/满月', description: '记录宝宝初生模样', icon: '👶', color: '#FF9FF3', sortOrder: 1 },
    }),
    prisma.packageCategory.upsert({
      where: { name: '百天/周岁' },
      update: {},
      create: { name: '百天/周岁', description: '定格成长每一刻', icon: '🎂', color: '#54A0FF', sortOrder: 2 },
    }),
    prisma.packageCategory.upsert({
      where: { name: '亲子时光' },
      update: {},
      create: { name: '亲子时光', description: '温馨亲子互动拍摄', icon: '👨‍👩‍👧', color: '#5F27CD', sortOrder: 3 },
    }),
    prisma.packageCategory.upsert({
      where: { name: '全家福' },
      update: {},
      create: { name: '全家福', description: '幸福一家人的纪念', icon: '👪', color: '#FF6348', sortOrder: 4 },
    }),
    prisma.packageCategory.upsert({
      where: { name: '外景拍摄' },
      update: {},
      create: { name: '外景拍摄', description: '大自然中的美好', icon: '🌳', color: '#2ED573', sortOrder: 5 },
    }),
    prisma.packageCategory.upsert({
      where: { name: '证件照/形象照' },
      update: {},
      create: { name: '证件照/形象照', description: '专业拍摄形象照', icon: '📸', color: '#747D8C', sortOrder: 6 },
    }),
  ]);
  console.log(`   ✅ 创建了 ${pkgCategories.length} 个套系分类`);

  // ========================
  // 2. 套系
  // ========================
  console.log('\n2️⃣  创建套系...');

  const catNewborn = pkgCategories.find(c => c.name === '新生儿/满月')!;
  const catHundred = pkgCategories.find(c => c.name === '百天/周岁')!;
  const catFamily = pkgCategories.find(c => c.name === '亲子时光')!;
  const catGroup = pkgCategories.find(c => c.name === '全家福')!;
  const catOutdoor = pkgCategories.find(c => c.name === '外景拍摄')!;
  const catId = pkgCategories.find(c => c.name === '证件照/形象照')!;

  const packages = await Promise.all([
    // --- 新生儿/满月 ---
    prisma.package.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        name: '新生初见',
        description: '记录宝宝出生后最初的珍贵模样，柔和光线搭配专业安抚，让宝宝在舒适状态完成拍摄',
        price: 599.00,
        deposit: 200.00,
        durationMinutes: 60,
        includes: ['精选精修照片10张', '精美摆台1个', '8寸相册1本', '宝宝造型服装2套', '电子底片全部赠送'],
        category: '新生儿/满月',
        categoryId: catNewborn.id,
        isPopular: true,
        isOnSale: true,
        baseSales: 268,
        salesVolume: 89,
        sortOrder: 1,
        style: '自然温馨',
        tags: ['新生儿', '满月', '经典'],
        images: ['/images/placeholder.png'],
      },
    }),
    prisma.package.upsert({
      where: { id: 2 },
      update: {},
      create: {
        id: 2,
        name: '满月纪念',
        description: '宝宝满月重要时刻，记录从襁褓中到满月的成长变化',
        price: 899.00,
        deposit: 300.00,
        durationMinutes: 90,
        includes: ['精选精修照片20张', '10寸摆台1个', '10寸方相册1本', '宝宝造型服装3套', '全家福合影3张', '电子底片全部赠送'],
        category: '新生儿/满月',
        categoryId: catNewborn.id,
        isPopular: true,
        isOnSale: true,
        baseSales: 356,
        salesVolume: 123,
        sortOrder: 2,
        style: '温馨可爱',
        tags: ['满月', '热销', '超高性价比'],
        images: ['/images/placeholder.png'],
      },
    }),
    prisma.package.upsert({
      where: { id: 3 },
      update: {},
      create: {
        id: 3,
        name: '成长记录（新生儿+百天）',
        description: '新生儿+百天双次拍摄套餐，完整记录宝宝从出生到百天的珍贵成长历程',
        price: 1599.00,
        deposit: 500.00,
        durationMinutes: 180,
        includes: ['新生儿拍摄1次', '百天拍摄1次', '精修照片40张', '12寸豪华相册1本', '摆台2个', '16寸放大框1个', '服装6套', '电子底片全部赠送'],
        category: '新生儿/满月',
        categoryId: catNewborn.id,
        isPopular: false,
        isOnSale: true,
        baseSales: 189,
        salesVolume: 56,
        sortOrder: 3,
        style: '豪华精选',
        tags: ['新生儿', '百天', '成长记录'],
        images: ['/images/placeholder.png'],
      },
    }),

    // --- 百天/周岁 ---
    prisma.package.upsert({
      where: { id: 4 },
      update: {},
      create: {
        id: 4,
        name: '百天喜乐',
        description: '宝宝百天纪念，捕捉宝宝最灿烂的笑容，记录这个充满喜悦的里程碑',
        price: 699.00,
        deposit: 200.00,
        durationMinutes: 90,
        includes: ['精选精修照片15张', '8寸摆台1个', '8寸方相册1本', '宝宝造型服装2套', '电子底片全部赠送'],
        category: '百天/周岁',
        categoryId: catHundred.id,
        isPopular: true,
        isOnSale: true,
        baseSales: 412,
        salesVolume: 156,
        sortOrder: 4,
        style: '可爱清新',
        tags: ['百天', '经典', '热销'],
        images: ['/images/placeholder.png'],
      },
    }),
    prisma.package.upsert({
      where: { id: 5 },
      update: {},
      create: {
        id: 5,
        name: '周岁庆典',
        description: '宝宝一周岁啦！记录抓周、学步的精彩瞬间，留下最美好的周岁回忆',
        price: 999.00,
        deposit: 300.00,
        durationMinutes: 120,
        includes: ['精选精修照片25张', '10寸摆台1个', '10寸方相册1本', '宝宝造型服装3套', '抓周道具使用', '亲子合影5张', '电子底片全部赠送'],
        category: '百天/周岁',
        categoryId: catHundred.id,
        isPopular: true,
        isOnSale: true,
        baseSales: 523,
        salesVolume: 201,
        sortOrder: 5,
        style: '欢乐庆典',
        tags: ['周岁', '抓周', '热销'],
        images: ['/images/placeholder.png'],
      },
    }),

    // --- 亲子时光 ---
    prisma.package.upsert({
      where: { id: 6 },
      update: {},
      create: {
        id: 6,
        name: '温馨亲子',
        description: '记录父母与孩子的温馨互动，自然光线下的真实情感，留下最温暖的亲子时光',
        price: 799.00,
        deposit: 300.00,
        durationMinutes: 90,
        includes: ['精选精修照片20张', '8寸摆台1个', '8寸方相册1本', '亲子造型2组', '电子底片全部赠送'],
        category: '亲子时光',
        categoryId: catFamily.id,
        isPopular: true,
        isOnSale: true,
        baseSales: 334,
        salesVolume: 98,
        sortOrder: 6,
        style: '自然温暖',
        tags: ['亲子', '温馨', '室内'],
        images: ['/images/placeholder.png'],
      },
    }),
    prisma.package.upsert({
      where: { id: 7 },
      update: {},
      create: {
        id: 7,
        name: '亲子户外野餐',
        description: '户外野餐主题亲子拍摄，在大自然中尽情玩耍，捕捉最自然的笑容',
        price: 1199.00,
        deposit: 400.00,
        durationMinutes: 120,
        includes: ['精选精修照片30张', '10寸摆台1个', '10寸方相册1本', '亲子造型2组', '野餐道具提供', '电子底片全部赠送'],
        category: '亲子时光',
        categoryId: catFamily.id,
        isPopular: false,
        isOnSale: true,
        baseSales: 178,
        salesVolume: 45,
        sortOrder: 7,
        style: '户外自然',
        tags: ['亲子', '户外', '野餐'],
        images: ['/images/placeholder.png'],
      },
    }),

    // --- 全家福 ---
    prisma.package.upsert({
      where: { id: 8 },
      update: {},
      create: {
        id: 8,
        name: '幸福全家福',
        description: '全家总动员，记录三代同堂的幸福时刻，附赠精修大尺寸全家福挂画',
        price: 1299.00,
        deposit: 400.00,
        durationMinutes: 90,
        includes: ['精选精修照片25张', '12寸摆台1个', '12寸方相册1本', '16寸放大全家福挂画1个', '服装每人1套', '电子底片全部赠送'],
        category: '全家福',
        categoryId: catGroup.id,
        isPopular: true,
        isOnSale: true,
        baseSales: 287,
        salesVolume: 89,
        sortOrder: 8,
        style: '端庄温馨',
        tags: ['全家福', '三代同堂', '经典'],
        images: ['/images/placeholder.png'],
      },
    }),
    prisma.package.upsert({
      where: { id: 9 },
      update: {},
      create: {
        id: 9,
        name: '尊享全家福',
        description: '高端全家福拍摄，多组造型切换，精美相册+大幅挂画，打造家庭形象大片',
        price: 1999.00,
        deposit: 600.00,
        durationMinutes: 150,
        includes: ['精选精修照片40张', '16寸豪华相册1本', '20寸豪华挂画1个', '10寸摆台2个', '服装每人2套', '精美电子请柬设计', '电子底片全部赠送'],
        category: '全家福',
        categoryId: catGroup.id,
        isPopular: false,
        isOnSale: true,
        baseSales: 145,
        salesVolume: 38,
        sortOrder: 9,
        style: '豪华尊享',
        tags: ['全家福', '尊享', '豪华'],
        images: ['/images/placeholder.png'],
      },
    }),

    // --- 外景拍摄 ---
    prisma.package.upsert({
      where: { id: 10 },
      update: {},
      create: {
        id: 10,
        name: '公园时光',
        description: '公园主题外景拍摄，绿树成荫，鸟语花香，记录宝宝在大自然中的快乐时光',
        price: 899.00,
        deposit: 300.00,
        durationMinutes: 120,
        includes: ['精选精修照片20张', '8寸摆台1个', '8寸相册1本', '服装2套', '电子底片全部赠送'],
        category: '外景拍摄',
        categoryId: catOutdoor.id,
        isPopular: true,
        isOnSale: true,
        baseSales: 201,
        salesVolume: 67,
        sortOrder: 10,
        style: '自然清新',
        tags: ['外景', '公园', '自然'],
        images: ['/images/placeholder.png'],
      },
    }),
    prisma.package.upsert({
      where: { id: 11 },
      update: {},
      create: {
        id: 11,
        name: '海滩度假',
        description: '海滩主题外景拍摄，金色沙滩，碧海蓝天，给宝贝一个浪漫的海边回忆',
        price: 1399.00,
        deposit: 500.00,
        durationMinutes: 150,
        includes: ['精选精修照片30张', '10寸摆台1个', '12寸相册1本', '服装3套', '亲子合影5张', '电子底片全部赠送'],
        category: '外景拍摄',
        categoryId: catOutdoor.id,
        isPopular: false,
        isOnSale: true,
        baseSales: 89,
        salesVolume: 23,
        sortOrder: 11,
        style: '浪漫唯美',
        tags: ['外景', '海滩', '夏季'],
        images: ['/images/placeholder.png'],
      },
    }),

    // --- 证件照/形象照 ---
    prisma.package.upsert({
      where: { id: 12 },
      update: {},
      create: {
        id: 12,
        name: '标准证件照',
        description: '专业拍摄标准证件照，精修出片，适用于身份证、护照、学生证等各类证件',
        price: 49.00,
        deposit: 20.00,
        durationMinutes: 20,
        includes: ['精修照片1版', '电子版1份', '纸质版1版（含6张）'],
        category: '证件照/形象照',
        categoryId: catId.id,
        isPopular: true,
        isOnSale: true,
        baseSales: 1890,
        salesVolume: 567,
        sortOrder: 12,
        style: '简约专业',
        tags: ['证件照', '快捷', '精修'],
        images: ['/images/placeholder.png'],
      },
    }),
    prisma.package.upsert({
      where: { id: 13 },
      update: {},
      create: {
        id: 13,
        name: '最美证件照',
        description: '精致妆容+专业灯光+精修，打造最美证件照，让证件照也出众',
        price: 129.00,
        deposit: 50.00,
        durationMinutes: 40,
        includes: ['精致化妆1次', '精修照片2版', '电子版2份', '纸质版2版'],
        category: '证件照/形象照',
        categoryId: catId.id,
        isPopular: true,
        isOnSale: true,
        baseSales: 756,
        salesVolume: 234,
        sortOrder: 13,
        style: '精致唯美',
        tags: ['证件照', '最美', '化妆'],
        images: ['/images/placeholder.png'],
      },
    }),
  ]);

  console.log(`   ✅ 创建了 ${packages.length} 个套系`);

  // ========================
  // 3. 优惠券
  // ========================
  console.log('\n3️⃣  创建优惠券...');

  const now = new Date();

  const coupons = await Promise.all([
    prisma.coupon.upsert({
      where: { couponCode: 'REGISTER50' },
      update: {},
      create: {
        couponCode: 'REGISTER50',
        couponName: '新人专享50元券',
        couponType: 'REGISTER',
        discountType: 'FIXED',
        discountValue: 50.00,
        minAmount: 200.00,
        totalCount: 1000,
        perUserLimit: 1,
        applicableType: 'ALL',
        applicableIds: [],
        startTime: new Date(now.getFullYear(), now.getMonth(), 1),
        endTime: new Date(now.getFullYear() + 1, 11, 31),
        description: '新用户注册即送，满200元可用',
        status: 'ACTIVE',
      },
    }),
    prisma.coupon.upsert({
      where: { couponCode: 'BIRTHDAY100' },
      update: {},
      create: {
        couponCode: 'BIRTHDAY100',
        couponName: '生日祝福100元券',
        couponType: 'BIRTHDAY',
        discountType: 'FIXED',
        discountValue: 100.00,
        minAmount: 500.00,
        totalCount: 500,
        perUserLimit: 1,
        applicableType: 'ALL',
        applicableIds: [],
        startTime: new Date(now.getFullYear(), now.getMonth(), 1),
        endTime: new Date(now.getFullYear() + 1, 11, 31),
        description: '会员生日当月可使用，满500元可用',
        status: 'ACTIVE',
      },
    }),
    prisma.coupon.upsert({
      where: { couponCode: 'SUMMER85' },
      update: {},
      create: {
        couponCode: 'SUMMER85',
        couponName: '暑期特惠85折券',
        couponType: 'PROMOTION',
        discountType: 'PERCENT',
        discountValue: 85.00,
        minAmount: 300.00,
        maxDiscount: 300.00,
        totalCount: 2000,
        perUserLimit: 2,
        applicableType: 'ALL',
        applicableIds: [],
        startTime: new Date(now.getFullYear(), 6, 1),
        endTime: new Date(now.getFullYear(), 8, 30),
        description: '暑期特惠，全场套系通用，最高减300元',
        status: 'ACTIVE',
      },
    }),
    prisma.coupon.upsert({
      where: { couponCode: 'GROUP200' },
      update: {},
      create: {
        couponCode: 'GROUP200',
        couponName: '团购专享200元券',
        couponType: 'PROMOTION',
        discountType: 'FIXED',
        discountValue: 200.00,
        minAmount: 800.00,
        totalCount: 500,
        perUserLimit: 1,
        applicableType: 'ALL',
        applicableIds: [],
        startTime: new Date(now.getFullYear(), now.getMonth(), 1),
        endTime: new Date(now.getFullYear() + 1, 11, 31),
        description: '3人成团即送每人一张，满800元可用',
        status: 'ACTIVE',
      },
    }),
    prisma.coupon.upsert({
      where: { couponCode: 'REBATE10' },
      update: {},
      create: {
        couponCode: 'REBATE10',
        couponName: '消费返券10%',
        couponType: 'REBATE',
        discountType: 'PERCENT',
        discountValue: 10.00,
        minAmount: 0,
        maxDiscount: 500.00,
        totalCount: 9999,
        perUserLimit: 9999,
        applicableType: 'ALL',
        applicableIds: [],
        startTime: new Date(now.getFullYear(), now.getMonth(), 1),
        endTime: new Date(now.getFullYear() + 1, 11, 31),
        description: '消费后可获得消费金额10%的返券，下次使用',
        status: 'ACTIVE',
      },
    }),
  ]);

  console.log(`   ✅ 创建了 ${coupons.length} 张优惠券`);

  // ========================
  // 4. 运行商品和服务种子
  // ========================
  console.log('\n4️⃣  跳过商品和服务种子（已有 seed-products.ts，如需运行请单独执行）');

  // ========================
  // 统计
  // ========================
  console.log('\n========================================');
  console.log('📊 数据统计');
  console.log('========================================');
  console.log(`  套系分类: ${await prisma.packageCategory.count()}`);
  console.log(`  套系: ${await prisma.package.count()}`);
  console.log(`  优惠券: ${await prisma.coupon.count()}`);
  console.log(`  商品分类: ${await prisma.productCategory.count()}`);
  console.log(`  商品: ${await prisma.product.count()}`);
  console.log(`  服务项目: ${await prisma.serviceItem.count()}`);
  console.log('\n✅ 测试数据初始化完成！');
}

main()
  .catch((e) => {
    console.error('❌ 初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
