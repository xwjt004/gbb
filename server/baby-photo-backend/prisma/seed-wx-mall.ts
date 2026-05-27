import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 开始添加测试数据...\n');

  // 1. 创建商品分类
  console.log('📁 创建商品分类...');
  const categories = await Promise.all([
    prisma.productCategory.upsert({
      where: { name: '相册类' },
      update: {},
      create: {
        name: '相册类',
        description: '各种规格的相册产品',
        sortOrder: 1,
        status: 'ACTIVE',
      },
    }),
    prisma.productCategory.upsert({
      where: { name: '相框类' },
      update: {},
      create: {
        name: '相框类',
        description: '精美相框产品',
        sortOrder: 2,
        status: 'ACTIVE',
      },
    }),
    prisma.productCategory.upsert({
      where: { name: '摆件类' },
      update: {},
      create: {
        name: '摆件类',
        description: '创意摆件产品',
        sortOrder: 3,
        status: 'ACTIVE',
      },
    }),
    prisma.productCategory.upsert({
      where: { name: '服饰类' },
      update: {},
      create: {
        name: '服饰类',
        description: '儿童拍摄服装',
        sortOrder: 4,
        status: 'ACTIVE',
      },
    }),
    prisma.productCategory.upsert({
      where: { name: '数码产品' },
      update: {},
      create: {
        name: '数码产品',
        description: 'U盘、光盘等数码产品',
        sortOrder: 5,
        status: 'ACTIVE',
      },
    }),
  ]);
  console.log(`✅ 创建了 ${categories.length} 个分类\n`);

  // 2. 创建测试商品
  console.log('📦 创建测试商品...');
  const [albumCat, frameCat, ornamentCat, clothingCat, digitalCat] = categories;

  // 相册类商品
  const albums = await Promise.all([
    prisma.product.upsert({
      where: { productNo: 'PRD-A001' },
      update: {},
      create: {
        productNo: 'PRD-A001',
        name: '精装相册20寸',
        categoryId: albumCat.id,
        specification: '20寸精装',
        unit: '本',
        costPrice: 150.00,
        salePrice: 299.00,
        marketPrice: 399.00,
        stockQuantity: 50,
        description: '20寸精装相册,精选进口纸张,装帧精美',
        status: 'ACTIVE',
        isOnSale: true,
        salesVolume: 89,
        sortOrder: 1,
        isTrackStock: true,
      },
    }),
    prisma.product.upsert({
      where: { productNo: 'PRD-A002' },
      update: {},
      create: {
        productNo: 'PRD-A002',
        name: '精装相册24寸',
        categoryId: albumCat.id,
        specification: '24寸精装',
        unit: '本',
        costPrice: 200.00,
        salePrice: 399.00,
        marketPrice: 499.00,
        stockQuantity: 30,
        description: '24寸精装相册,大尺寸更震撼',
        status: 'ACTIVE',
        isOnSale: true,
        salesVolume: 67,
        sortOrder: 2,
        isTrackStock: true,
      },
    }),
    prisma.product.upsert({
      where: { productNo: 'PRD-A003' },
      update: {},
      create: {
        productNo: 'PRD-A003',
        name: '水晶相册12寸',
        categoryId: albumCat.id,
        specification: '12寸水晶',
        unit: '本',
        costPrice: 100.00,
        salePrice: 199.00,
        marketPrice: 259.00,
        stockQuantity: 80,
        description: '12寸水晶相册,晶莹剔透',
        status: 'ACTIVE',
        isOnSale: true,
        salesVolume: 156,
        sortOrder: 3,
        isTrackStock: true,
      },
    }),
    prisma.product.upsert({
      where: { productNo: 'PRD-A004' },
      update: {},
      create: {
        productNo: 'PRD-A004',
        name: '皮质相册16寸',
        categoryId: albumCat.id,
        specification: '16寸皮质',
        unit: '本',
        costPrice: 120.00,
        salePrice: 249.00,
        marketPrice: 329.00,
        stockQuantity: 45,
        description: '16寸皮质相册,经典优雅',
        status: 'ACTIVE',
        isOnSale: true,
        salesVolume: 92,
        sortOrder: 4,
        isTrackStock: true,
      },
    }),
  ]);

  // 相框类商品
  const frames = await Promise.all([
    prisma.product.upsert({
      where: { productNo: 'PRD-F001' },
      update: {},
      create: {
        productNo: 'PRD-F001',
        name: '实木相框7寸',
        categoryId: frameCat.id,
        specification: '7寸实木',
        unit: '个',
        costPrice: 30.00,
        salePrice: 69.00,
        marketPrice: 89.00,
        stockQuantity: 100,
        description: '7寸实木相框,挂墙桌面两用',
        status: 'ACTIVE',
        isOnSale: true,
        salesVolume: 234,
        sortOrder: 1,
        isTrackStock: true,
      },
    }),
    prisma.product.upsert({
      where: { productNo: 'PRD-F002' },
      update: {},
      create: {
        productNo: 'PRD-F002',
        name: '水晶相框10寸',
        categoryId: frameCat.id,
        specification: '10寸水晶',
        unit: '个',
        costPrice: 50.00,
        salePrice: 99.00,
        marketPrice: 129.00,
        stockQuantity: 80,
        description: '10寸水晶相框,透明质感',
        status: 'ACTIVE',
        isOnSale: true,
        salesVolume: 178,
        sortOrder: 2,
        isTrackStock: true,
      },
    }),
  ]);

  // 摆件类商品
  const ornaments = await Promise.all([
    prisma.product.upsert({
      where: { productNo: 'PRD-O001' },
      update: {},
      create: {
        productNo: 'PRD-O001',
        name: '水晶球摆件',
        categoryId: ornamentCat.id,
        specification: '直径10cm',
        unit: '个',
        costPrice: 60.00,
        salePrice: 129.00,
        marketPrice: 169.00,
        stockQuantity: 35,
        description: '水晶球摆件,含照片定制',
        status: 'ACTIVE',
        isOnSale: true,
        salesVolume: 87,
        sortOrder: 1,
        isTrackStock: true,
      },
    }),
  ]);

  // 数码产品
  const digital = await Promise.all([
    prisma.product.upsert({
      where: { productNo: 'PRD-D001' },
      update: {},
      create: {
        productNo: 'PRD-D001',
        name: '定制U盘16GB',
        categoryId: digitalCat.id,
        specification: '16GB',
        unit: '个',
        costPrice: 20.00,
        salePrice: 49.00,
        marketPrice: 69.00,
        stockQuantity: 200,
        description: '16GB定制U盘,含照片',
        status: 'ACTIVE',
        isOnSale: true,
        salesVolume: 267,
        sortOrder: 1,
        isTrackStock: true,
      },
    }),
    prisma.product.upsert({
      where: { productNo: 'PRD-D002' },
      update: {},
      create: {
        productNo: 'PRD-D002',
        name: '定制U盘32GB',
        categoryId: digitalCat.id,
        specification: '32GB',
        unit: '个',
        costPrice: 30.00,
        salePrice: 69.00,
        marketPrice: 89.00,
        stockQuantity: 150,
        description: '32GB定制U盘,含照片',
        status: 'ACTIVE',
        isOnSale: true,
        salesVolume: 189,
        sortOrder: 2,
        isTrackStock: true,
      },
    }),
  ]);

  const allProducts = [...albums, ...frames, ...ornaments, ...digital];
  console.log(`✅ 创建了 ${allProducts.length} 个商品\n`);

  // 3. 创建测试套系
  console.log('📸 创建测试套系...');
  const packages = await Promise.all([
    prisma.package.upsert({
      where: { name: '宝宝百日照经典套系' },
      update: {},
      create: {
        name: '宝宝百日照经典套系',
        description: '记录宝宝百天珍贵时刻,包含多套服装和精美相册',
        price: 1299.00,
        deposit: 300.00,
        durationMinutes: 120,
        includes: ['精选服装5套', '底片30张', '精修20张', '20寸精装相册1本', '7寸实木相框2个'],
        category: 'BABY',
        coverImage: '/images/packages/baby-100day.jpg',
        detailImages: ['/images/packages/baby-100day-1.jpg', '/images/packages/baby-100day-2.jpg'],
        status: 'ACTIVE',
        isOnSale: true,
        salesVolume: 156,
        sortOrder: 1,
      },
    }),
    prisma.package.upsert({
      where: { name: '宝宝周岁照豪华套系' },
      update: {},
      create: {
        name: '宝宝周岁照豪华套系',
        description: '宝宝周岁纪念,豪华套系留住成长每一刻',
        price: 1899.00,
        deposit: 500.00,
        durationMinutes: 150,
        includes: ['精选服装8套', '底片50张', '精修30张', '24寸精装相册1本', '20寸精装相册1本', '10寸水晶相框3个', '定制U盘32GB'],
        category: 'BABY',
        coverImage: '/images/packages/baby-1year.jpg',
        detailImages: ['/images/packages/baby-1year-1.jpg', '/images/packages/baby-1year-2.jpg'],
        status: 'ACTIVE',
        isOnSale: true,
        salesVolume: 234,
        sortOrder: 2,
      },
    }),
    prisma.package.upsert({
      where: { name: '儿童成长记录套系' },
      update: {},
      create: {
        name: '儿童成长记录套系',
        description: '记录孩子成长的每一个精彩瞬间',
        price: 1599.00,
        deposit: 400.00,
        durationMinutes: 120,
        includes: ['服装6套', '底片40张', '精修25张', '20寸精装相册1本'],
        category: 'CHILDREN',
        coverImage: '/images/packages/children-growth.jpg',
        detailImages: ['/images/packages/children-1.jpg'],
        status: 'ACTIVE',
        isOnSale: true,
        salesVolume: 187,
        sortOrder: 3,
      },
    }),
    prisma.package.upsert({
      where: { name: '全家福经典套系' },
      update: {},
      create: {
        name: '全家福经典套系',
        description: '记录家庭温馨时光,适合3-5人拍摄',
        price: 1899.00,
        deposit: 400.00,
        durationMinutes: 150,
        includes: ['服装搭配建议', '底片50张', '精修30张', '24寸精装相册1本', '定制U盘16GB'],
        category: 'FAMILY',
        coverImage: '/images/packages/family-classic.jpg',
        detailImages: ['/images/packages/family-1.jpg'],
        status: 'ACTIVE',
        isOnSale: true,
        salesVolume: 267,
        sortOrder: 4,
      },
    }),
    prisma.package.upsert({
      where: { name: '亲子照套系' },
      update: {},
      create: {
        name: '亲子照套系',
        description: '温馨亲子时光记录',
        price: 1199.00,
        deposit: 300.00,
        durationMinutes: 90,
        includes: ['亲子装搭配', '底片30张', '精修20张', '20寸精装相册1本', '10寸水晶相框2个'],
        category: 'FAMILY',
        coverImage: '/images/packages/parent-child.jpg',
        detailImages: ['/images/packages/parent-child-1.jpg'],
        status: 'ACTIVE',
        isOnSale: true,
        salesVolume: 198,
        sortOrder: 5,
      },
    }),
  ]);
  console.log(`✅ 创建了 ${packages.length} 个套系\n`);

  // 4. 创建套系和商品的关联
  console.log('🔗 创建套系商品关联...');
  const [pkg1, pkg2, pkg3, pkg4, pkg5] = packages;
  const [album20, album24, album12, album16] = albums;
  const [frame7, frame10] = frames;
  const [crystal] = ornaments;
  const [usb16, usb32] = digital;

  await Promise.all([
    // 宝宝百日照
    prisma.packageProduct.upsert({
      where: {
        packageId_productId: {
          packageId: pkg1.id,
          productId: album20.id,
        },
      },
      update: {},
      create: {
        packageId: pkg1.id,
        productId: album20.id,
        quantity: 1,
      },
    }),
    prisma.packageProduct.upsert({
      where: {
        packageId_productId: {
          packageId: pkg1.id,
          productId: frame7.id,
        },
      },
      update: {},
      create: {
        packageId: pkg1.id,
        productId: frame7.id,
        quantity: 2,
      },
    }),

    // 宝宝周岁照
    prisma.packageProduct.upsert({
      where: {
        packageId_productId: {
          packageId: pkg2.id,
          productId: album24.id,
        },
      },
      update: {},
      create: {
        packageId: pkg2.id,
        productId: album24.id,
        quantity: 1,
      },
    }),
    prisma.packageProduct.upsert({
      where: {
        packageId_productId: {
          packageId: pkg2.id,
          productId: album20.id,
        },
      },
      update: {},
      create: {
        packageId: pkg2.id,
        productId: album20.id,
        quantity: 1,
      },
    }),
    prisma.packageProduct.upsert({
      where: {
        packageId_productId: {
          packageId: pkg2.id,
          productId: frame10.id,
        },
      },
      update: {},
      create: {
        packageId: pkg2.id,
        productId: frame10.id,
        quantity: 3,
      },
    }),
    prisma.packageProduct.upsert({
      where: {
        packageId_productId: {
          packageId: pkg2.id,
          productId: usb32.id,
        },
      },
      update: {},
      create: {
        packageId: pkg2.id,
        productId: usb32.id,
        quantity: 1,
      },
    }),

    // 儿童成长记录
    prisma.packageProduct.upsert({
      where: {
        packageId_productId: {
          packageId: pkg3.id,
          productId: album20.id,
        },
      },
      update: {},
      create: {
        packageId: pkg3.id,
        productId: album20.id,
        quantity: 1,
      },
    }),

    // 全家福
    prisma.packageProduct.upsert({
      where: {
        packageId_productId: {
          packageId: pkg4.id,
          productId: album24.id,
        },
      },
      update: {},
      create: {
        packageId: pkg4.id,
        productId: album24.id,
        quantity: 1,
      },
    }),
    prisma.packageProduct.upsert({
      where: {
        packageId_productId: {
          packageId: pkg4.id,
          productId: usb16.id,
        },
      },
      update: {},
      create: {
        packageId: pkg4.id,
        productId: usb16.id,
        quantity: 1,
      },
    }),

    // 亲子照
    prisma.packageProduct.upsert({
      where: {
        packageId_productId: {
          packageId: pkg5.id,
          productId: album20.id,
        },
      },
      update: {},
      create: {
        packageId: pkg5.id,
        productId: album20.id,
        quantity: 1,
      },
    }),
    prisma.packageProduct.upsert({
      where: {
        packageId_productId: {
          packageId: pkg5.id,
          productId: frame10.id,
        },
      },
      update: {},
      create: {
        packageId: pkg5.id,
        productId: frame10.id,
        quantity: 2,
      },
    }),
  ]);
  console.log('✅ 创建了套系商品关联\n');

  // 5. 统计数据
  console.log('📊 数据统计:');
  const productCount = await prisma.product.count({ where: { isOnSale: true } });
  const packageCount = await prisma.package.count({ where: { isOnSale: true } });
  const categoryCount = await prisma.productCategory.count();
  
  console.log(`  - 商品分类: ${categoryCount} 个`);
  console.log(`  - 在售商品: ${productCount} 个`);
  console.log(`  - 在售套系: ${packageCount} 个`);
  
  console.log('\n✨ 测试数据添加完成!');
}

main()
  .catch((e) => {
    console.error('❌ 错误:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
