import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedProductsAndServices() {
  console.log('开始初始化商品和服务数据...');

  // 1. 创建商品分类
  console.log('\n1. 创建商品分类...');
  const categories = await Promise.all([
    prisma.productCategory.upsert({
      where: { code: 'ALBUM' },
      update: {},
      create: {
        name: '相册类',
        code: 'ALBUM',
        description: '各类相册产品',
        sortOrder: 1,
      },
    }),
    prisma.productCategory.upsert({
      where: { code: 'FRAME' },
      update: {},
      create: {
        name: '相框类',
        code: 'FRAME',
        description: '各尺寸相框',
        sortOrder: 2,
      },
    }),
    prisma.productCategory.upsert({
      where: { code: 'DESK_STAND' },
      update: {},
      create: {
        name: '摆台类',
        code: 'DESK_STAND',
        description: '摆台系列',
        sortOrder: 3,
      },
    }),
    prisma.productCategory.upsert({
      where: { code: 'PHOTO' },
      update: {},
      create: {
        name: '照片类',
        code: 'PHOTO',
        description: '精修照片、数码底片',
        sortOrder: 4,
      },
    }),
    prisma.productCategory.upsert({
      where: { code: 'ID_PHOTO' },
      update: {},
      create: {
        name: '证件照类',
        code: 'ID_PHOTO',
        description: '各尺寸证件照',
        sortOrder: 5,
      },
    }),
    prisma.productCategory.upsert({
      where: { code: 'OTHER' },
      update: {},
      create: {
        name: '其他类',
        code: 'OTHER',
        description: '画报等其他产品',
        sortOrder: 6,
      },
    }),
  ]);

  console.log(`✓ 创建了 ${categories.length} 个商品分类`);

  // 2. 创建商品
  console.log('\n2. 创建商品...');
  const albumCategory = categories.find(c => c.code === 'ALBUM')!;
  const frameCategory = categories.find(c => c.code === 'FRAME')!;
  const standCategory = categories.find(c => c.code === 'DESK_STAND')!;
  const photoCategory = categories.find(c => c.code === 'PHOTO')!;
  const idPhotoCategory = categories.find(c => c.code === 'ID_PHOTO')!;
  const otherCategory = categories.find(c => c.code === 'OTHER')!;

  const products = await Promise.all([
    // 相册类
    prisma.product.upsert({
      where: { productNo: 'PROD-ALBUM-8F' },
      update: {},
      create: {
        productNo: 'PROD-ALBUM-8F',
        name: '8寸方相册',
        categoryId: albumCategory.id,
        specification: '8寸',
        unit: '本',
        costPrice: 50.00,
        salePrice: 150.00,
        marketPrice: 200.00,
        stockQuantity: 100,
        description: '高质量8寸方形相册，精美装帧',
        attributes: {
          material: 'PU皮',
          pages: 20,
          colors: ['黑色', '白色', '棕色'],
        },
      },
    }),
    prisma.product.upsert({
      where: { productNo: 'PROD-ALBUM-8T' },
      update: {},
      create: {
        productNo: 'PROD-ALBUM-8T',
        name: '8寸条相册',
        categoryId: albumCategory.id,
        specification: '8寸',
        unit: '本',
        costPrice: 55.00,
        salePrice: 160.00,
        marketPrice: 210.00,
        stockQuantity: 80,
        description: '8寸条形相册，适合宽幅照片',
        attributes: {
          material: 'PU皮',
          pages: 20,
        },
      },
    }),
    prisma.product.upsert({
      where: { productNo: 'PROD-ALBUM-10F' },
      update: {},
      create: {
        productNo: 'PROD-ALBUM-10F',
        name: '10寸方相册',
        categoryId: albumCategory.id,
        specification: '10寸',
        unit: '本',
        costPrice: 80.00,
        salePrice: 220.00,
        marketPrice: 280.00,
        stockQuantity: 60,
        description: '10寸方形相册，更大展示空间',
        attributes: {
          material: 'PU皮',
          pages: 24,
        },
      },
    }),
    prisma.product.upsert({
      where: { productNo: 'PROD-ALBUM-10T' },
      update: {},
      create: {
        productNo: 'PROD-ALBUM-10T',
        name: '10寸条相册',
        categoryId: albumCategory.id,
        specification: '10寸',
        unit: '本',
        costPrice: 85.00,
        salePrice: 230.00,
        marketPrice: 290.00,
        stockQuantity: 50,
        description: '10寸条形相册',
      },
    }),
    prisma.product.upsert({
      where: { productNo: 'PROD-ALBUM-12F' },
      update: {},
      create: {
        productNo: 'PROD-ALBUM-12F',
        name: '12寸方相册',
        categoryId: albumCategory.id,
        specification: '12寸',
        unit: '本',
        costPrice: 120.00,
        salePrice: 320.00,
        marketPrice: 400.00,
        stockQuantity: 40,
        description: '12寸方形相册，豪华版',
        attributes: {
          material: '真皮',
          pages: 30,
        },
      },
    }),
    prisma.product.upsert({
      where: { productNo: 'PROD-ALBUM-12T' },
      update: {},
      create: {
        productNo: 'PROD-ALBUM-12T',
        name: '12寸条相册',
        categoryId: albumCategory.id,
        specification: '12寸',
        unit: '本',
        costPrice: 125.00,
        salePrice: 330.00,
        marketPrice: 410.00,
        stockQuantity: 35,
        description: '12寸条形相册',
      },
    }),

    // 摆台类
    prisma.product.upsert({
      where: { productNo: 'PROD-STAND-5' },
      update: {},
      create: {
        productNo: 'PROD-STAND-5',
        name: '5寸摆台',
        categoryId: standCategory.id,
        specification: '5寸',
        unit: '个',
        costPrice: 20.00,
        salePrice: 60.00,
        marketPrice: 80.00,
        stockQuantity: 150,
        description: '5寸精美摆台，桌面装饰',
        attributes: {
          material: '实木',
          style: '简约',
        },
      },
    }),
    prisma.product.upsert({
      where: { productNo: 'PROD-STAND-8' },
      update: {},
      create: {
        productNo: 'PROD-STAND-8',
        name: '8寸摆台',
        categoryId: standCategory.id,
        specification: '8寸',
        unit: '个',
        costPrice: 35.00,
        salePrice: 90.00,
        marketPrice: 120.00,
        stockQuantity: 100,
        description: '8寸摆台，经典尺寸',
      },
    }),
    prisma.product.upsert({
      where: { productNo: 'PROD-STAND-10' },
      update: {},
      create: {
        productNo: 'PROD-STAND-10',
        name: '10寸摆台',
        categoryId: standCategory.id,
        specification: '10寸',
        unit: '个',
        costPrice: 50.00,
        salePrice: 130.00,
        marketPrice: 160.00,
        stockQuantity: 80,
        description: '10寸摆台，大气优雅',
      },
    }),

    // 相框类
    prisma.product.upsert({
      where: { productNo: 'PROD-FRAME-18' },
      update: {},
      create: {
        productNo: 'PROD-FRAME-18',
        name: '18寸相框',
        categoryId: frameCategory.id,
        specification: '18寸',
        unit: '个',
        costPrice: 40.00,
        salePrice: 120.00,
        marketPrice: 150.00,
        stockQuantity: 70,
        description: '18寸相框，墙面装饰',
        attributes: {
          material: '实木',
          color: ['原木色', '黑色', '白色'],
        },
      },
    }),
    prisma.product.upsert({
      where: { productNo: 'PROD-FRAME-20' },
      update: {},
      create: {
        productNo: 'PROD-FRAME-20',
        name: '20寸相框',
        categoryId: frameCategory.id,
        specification: '20寸',
        unit: '个',
        costPrice: 55.00,
        salePrice: 150.00,
        marketPrice: 180.00,
        stockQuantity: 60,
        description: '20寸相框，大幅展示',
      },
    }),

    // 照片类
    prisma.product.upsert({
      where: { productNo: 'PROD-PHOTO-DIGITAL' },
      update: {},
      create: {
        productNo: 'PROD-PHOTO-DIGITAL',
        name: '数码底片',
        categoryId: photoCategory.id,
        specification: '高清',
        unit: '张',
        costPrice: 2.00,
        salePrice: 10.00,
        marketPrice: 15.00,
        stockQuantity: 9999,
        isTrackStock: false,
        description: '高清数码底片，无限次打印',
      },
    }),
    prisma.product.upsert({
      where: { productNo: 'PROD-PHOTO-REFINED' },
      update: {},
      create: {
        productNo: 'PROD-PHOTO-REFINED',
        name: '精修照片',
        categoryId: photoCategory.id,
        specification: '7寸',
        unit: '张',
        costPrice: 8.00,
        salePrice: 30.00,
        marketPrice: 40.00,
        stockQuantity: 9999,
        isTrackStock: false,
        description: '专业精修照片，色彩还原完美',
      },
    }),

    // 证件照类
    prisma.product.upsert({
      where: { productNo: 'PROD-ID-2' },
      update: {},
      create: {
        productNo: 'PROD-ID-2',
        name: '2寸证件照',
        categoryId: idPhotoCategory.id,
        specification: '2寸',
        unit: '张',
        costPrice: 3.00,
        salePrice: 15.00,
        marketPrice: 20.00,
        stockQuantity: 9999,
        isTrackStock: false,
        description: '标准2寸证件照',
      },
    }),
    prisma.product.upsert({
      where: { productNo: 'PROD-ID-4' },
      update: {},
      create: {
        productNo: 'PROD-ID-4',
        name: '4寸证件照',
        categoryId: idPhotoCategory.id,
        specification: '4寸',
        unit: '张',
        costPrice: 4.00,
        salePrice: 20.00,
        marketPrice: 25.00,
        stockQuantity: 9999,
        isTrackStock: false,
        description: '标准4寸证件照',
      },
    }),

    // 其他类
    prisma.product.upsert({
      where: { productNo: 'PROD-OTHER-POSTER' },
      update: {},
      create: {
        productNo: 'PROD-OTHER-POSTER',
        name: '画报',
        categoryId: otherCategory.id,
        specification: 'A3',
        unit: '张',
        costPrice: 10.00,
        salePrice: 35.00,
        marketPrice: 50.00,
        stockQuantity: 200,
        description: 'A3画报，精美印刷',
      },
    }),
  ]);

  console.log(`✓ 创建了 ${products.length} 个商品`);

  // 3. 创建服务项目
  console.log('\n3. 创建服务项目...');
  const services = await Promise.all([
    // 拍摄场地类
    prisma.serviceItem.upsert({
      where: { serviceNo: 'SRV-STUDIO' },
      update: {},
      create: {
        serviceNo: 'SRV-STUDIO',
        name: '室内影棚',
        category: '拍摄场地',
        basePrice: 500.00,
        duration: 120,
        description: '专业室内影棚，配备专业灯光设备',
        requirements: {
          space: '100平米',
          equipment: ['灯光', '背景布', '道具'],
        },
      },
    }),
    prisma.serviceItem.upsert({
      where: { serviceNo: 'SRV-OUTDOOR' },
      update: {},
      create: {
        serviceNo: 'SRV-OUTDOOR',
        name: '外景拍摄',
        category: '拍摄场地',
        basePrice: 800.00,
        duration: 180,
        description: '外景拍摄服务，自然光拍摄',
        requirements: {
          weather: '晴天或阴天',
          location: '公园、海滩、古镇等',
        },
      },
    }),
    prisma.serviceItem.upsert({
      where: { serviceNo: 'SRV-HOME' },
      update: {},
      create: {
        serviceNo: 'SRV-HOME',
        name: '上门拍摄',
        category: '拍摄场地',
        basePrice: 1000.00,
        duration: 150,
        description: '上门拍摄服务，方便快捷',
        requirements: {
          area: '市区内免费，郊区需加收路费',
        },
      },
    }),

    // 造型服务类
    prisma.serviceItem.upsert({
      where: { serviceNo: 'SRV-MAKEUP' },
      update: {},
      create: {
        serviceNo: 'SRV-MAKEUP',
        name: '化妆',
        category: '造型服务',
        basePrice: 300.00,
        duration: 60,
        description: '专业化妆服务',
      },
    }),
    prisma.serviceItem.upsert({
      where: { serviceNo: 'SRV-STYLING' },
      update: {},
      create: {
        serviceNo: 'SRV-STYLING',
        name: '造型设计',
        category: '造型服务',
        basePrice: 400.00,
        duration: 90,
        description: '专业造型设计，打造完美形象',
      },
    }),

    // 技术服务类
    prisma.serviceItem.upsert({
      where: { serviceNo: 'SRV-LIGHT' },
      update: {},
      create: {
        serviceNo: 'SRV-LIGHT',
        name: '灯光',
        category: '技术服务',
        basePrice: 200.00,
        duration: 0,
        description: '专业灯光布置',
      },
    }),
    prisma.serviceItem.upsert({
      where: { serviceNo: 'SRV-PHOTOGRAPHER' },
      update: {},
      create: {
        serviceNo: 'SRV-PHOTOGRAPHER',
        name: '摄影师',
        category: '技术服务',
        basePrice: 600.00,
        unitPrice: 300.00,
        priceUnit: '小时',
        description: '专业摄影师服务',
      },
    }),

    // 道具服装类
    prisma.serviceItem.upsert({
      where: { serviceNo: 'SRV-COSTUME' },
      update: {},
      create: {
        serviceNo: 'SRV-COSTUME',
        name: '服装',
        category: '道具服装',
        basePrice: 150.00,
        description: '提供多套服装选择',
      },
    }),
    prisma.serviceItem.upsert({
      where: { serviceNo: 'SRV-PROPS' },
      update: {},
      create: {
        serviceNo: 'SRV-PROPS',
        name: '道具',
        category: '道具服装',
        basePrice: 100.00,
        description: '提供拍摄道具',
      },
    }),

    // 配送服务类
    prisma.serviceItem.upsert({
      where: { serviceNo: 'SRV-DELIVERY' },
      update: {},
      create: {
        serviceNo: 'SRV-DELIVERY',
        name: '送件',
        category: '配送服务',
        basePrice: 50.00,
        description: '免费市区送件服务',
      },
    }),
    prisma.serviceItem.upsert({
      where: { serviceNo: 'SRV-EXPRESS' },
      update: {},
      create: {
        serviceNo: 'SRV-EXPRESS',
        name: '快递',
        category: '配送服务',
        basePrice: 20.00,
        description: '全国快递服务',
      },
    }),
  ]);

  console.log(`✓ 创建了 ${services.length} 个服务项目`);

  console.log('\n✅ 商品和服务数据初始化完成！');
  console.log('\n统计：');
  console.log(`  - 商品分类: ${categories.length} 个`);
  console.log(`  - 商品: ${products.length} 个`);
  console.log(`  - 服务项目: ${services.length} 个`);
}

seedProductsAndServices()
  .catch((e) => {
    console.error('❌ 初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
