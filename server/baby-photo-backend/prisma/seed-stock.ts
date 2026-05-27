import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('开始初始化库存管理测试数据...\n');

  // 1. 更新商品库存预警设置
  console.log('1. 更新商品库存预警设置...');
  
  // 获取所有商品
  const products = await prisma.product.findMany();
  
  for (const product of products) {
    await prisma.product.update({
      where: { id: product.id },
      data: {
        minStock: 10,      // 最低库存
        maxStock: 200,     // 最高库存
        reorderPoint: 20,  // 再订货点
      },
    });
  }
  console.log(`✓ 更新了 ${products.length} 个商品的库存预警设置\n`);

  // 2. 创建一些库存预警记录
  console.log('2. 创建库存预警记录...');
  
  // 找几个库存较低的商品创建预警
  const lowStockProducts = await prisma.product.findMany({
    where: {
      stockQuantity: { lt: 15 },
      isTrackStock: true,
    },
    take: 5,
  });

  let alertCount = 0;
  for (const product of lowStockProducts) {
    const alertNo = `ALT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(alertCount + 1).padStart(4, '0')}`;
    
    await prisma.stockAlert.create({
      data: {
        alertNo,
        productId: product.id,
        alertType: product.stockQuantity === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK',
        currentStock: product.stockQuantity,
        threshold: product.minStock || 10,
        status: 'PENDING',
        priority: product.stockQuantity === 0 ? 'HIGH' : product.stockQuantity < 5 ? 'HIGH' : 'MEDIUM',
      },
    });
    alertCount++;
  }
  console.log(`✓ 创建了 ${alertCount} 条库存预警记录\n`);

  // 3. 创建出库单示例
  console.log('3. 创建出库单示例...');
  
  // 获取第一个用户作为操作者
  const firstUser = await prisma.user.findFirst();
  if (!firstUser) {
    console.log('⚠ 没有找到用户，跳过出库单创建');
  } else {
    // 获取一些有库存的商品
    const availableProducts = await prisma.product.findMany({
      where: {
        stockQuantity: { gt: 0 },
        isTrackStock: true,
      },
      take: 3,
    });

    if (availableProducts.length > 0) {
      // 创建一个损耗出库单
      const outboundNo = `OUT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-0001`;
      
      const outbound = await prisma.stockOutbound.create({
        data: {
          outboundNo,
          outboundType: 'DAMAGE',
          outboundDate: new Date(),
          status: 'PENDING',
          totalQuantity: 0,
          totalAmount: 0,
          submitterId: firstUser.id,
          remark: '商品损耗出库测试',
        },
      });

      // 创建出库明细
      let totalQty = 0;
      let totalAmt = 0;

      for (let i = 0; i < availableProducts.length; i++) {
        const product = availableProducts[i];
        const qty = Math.min(2, product.stockQuantity); // 每个商品出库2个或当前库存
        const amount = parseFloat(product.costPrice.toString()) * qty;

        await prisma.stockOutboundItem.create({
          data: {
            outboundId: outbound.id,
            productId: product.id,
            quantity: qty,
            unitPrice: product.costPrice,
            amount,
            remark: `损耗出库 - ${product.name}`,
          },
        });

        totalQty += qty;
        totalAmt += amount;
      }

      // 更新出库单总计
      await prisma.stockOutbound.update({
        where: { id: outbound.id },
        data: {
          totalQuantity: totalQty,
          totalAmount: totalAmt,
        },
      });

      console.log(`✓ 创建了 1 个出库单，包含 ${availableProducts.length} 个明细项\n`);
    }
  }

  // 4. 创建盘点单示例
  console.log('4. 创建盘点单示例...');
  
  if (!firstUser) {
    console.log('⚠ 没有找到用户，跳过盘点单创建');
  } else {
    const checkNo = `CHK-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-0001`;
    
    const check = await prisma.stockCheck.create({
      data: {
        checkNo,
        checkType: 'PARTIAL',
        checkDate: new Date(),
        status: 'DRAFT',
        creatorId: firstUser.id,
        remark: '部分商品盘点测试',
      },
    });

    // 选择一些商品进行盘点
    const checkProducts = await prisma.product.findMany({
      where: {
        isTrackStock: true,
      },
      take: 5,
    });

    let profitItems = 0;
    let lossItems = 0;
    let profitQuantity = 0;
    let lossQuantity = 0;
    let profitAmount = 0;
    let lossAmount = 0;

    for (const product of checkProducts) {
      // 模拟盘点：实际数量 = 系统数量 + 随机差异 (-3 到 +3)
      const difference = Math.floor(Math.random() * 7) - 3;
      const actualQuantity = Math.max(0, product.stockQuantity + difference);
      const differenceQty = actualQuantity - product.stockQuantity;
      const unitPrice = parseFloat(product.costPrice.toString());
      const differenceAmount = differenceQty * unitPrice;

      let differenceType = 'NORMAL';
      if (differenceQty > 0) {
        differenceType = 'PROFIT';
        profitItems++;
        profitQuantity += differenceQty;
        profitAmount += differenceAmount;
      } else if (differenceQty < 0) {
        differenceType = 'LOSS';
        lossItems++;
        lossQuantity += Math.abs(differenceQty);
        lossAmount += Math.abs(differenceAmount);
      }

      await prisma.stockCheckItem.create({
        data: {
          checkId: check.id,
          productId: product.id,
          systemQuantity: product.stockQuantity,
          actualQuantity,
          differenceQty,
          unitPrice: product.costPrice,
          differenceAmount,
          differenceType,
          remark: differenceType === 'NORMAL' ? '正常' : differenceType === 'PROFIT' ? '盘盈' : '盘亏',
        },
      });
    }

    // 更新盘点单统计
    await prisma.stockCheck.update({
      where: { id: check.id },
      data: {
        totalItems: checkProducts.length,
        profitItems,
        lossItems,
        profitQuantity,
        lossQuantity,
        profitAmount,
        lossAmount,
      },
    });

    console.log(`✓ 创建了 1 个盘点单，包含 ${checkProducts.length} 个明细项`);
    console.log(`  - 盘盈商品: ${profitItems} 个，数量: ${profitQuantity}，金额: ${profitAmount.toFixed(2)}`);
    console.log(`  - 盘亏商品: ${lossItems} 个，数量: ${lossQuantity}，金额: ${lossAmount.toFixed(2)}\n`);
  }

  // 5. 创建一些库存流水记录
  console.log('5. 创建库存流水记录...');
  
  if (!firstUser) {
    console.log('⚠ 没有找到用户，跳过库存流水创建');
  } else {
    // 为前几个商品创建一些手工调整流水
    const transactionProducts = await prisma.product.findMany({
      take: 3,
    });

    for (let i = 0; i < transactionProducts.length; i++) {
      const product = transactionProducts[i];
      const transactionNo = `TXN-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(i + 1).padStart(6, '0')}`;
      
      const quantity = 10;
      const beforeStock = product.stockQuantity;
      const afterStock = beforeStock + quantity;

      await prisma.stockTransaction.create({
        data: {
          transactionNo,
          productId: product.id,
          transactionType: 'MANUAL_ADJUST',
          quantity,
          beforeStock,
          afterStock,
          refType: null,
          refId: null,
          operatorId: firstUser.id,
          remark: '手工调整库存 - 测试数据',
        },
      });

      // 同时更新商品库存
      await prisma.product.update({
        where: { id: product.id },
        data: {
          stockQuantity: afterStock,
        },
      });
    }

    console.log(`✓ 创建了 ${transactionProducts.length} 条库存流水记录\n`);
  }

  console.log('✅ 库存管理测试数据初始化完成！\n');

  console.log('统计：');
  const stats = {
    products: await prisma.product.count(),
    alerts: await prisma.stockAlert.count(),
    outbounds: await prisma.stockOutbound.count(),
    checks: await prisma.stockCheck.count(),
    transactions: await prisma.stockTransaction.count(),
  };
  
  console.log(`  - 商品: ${stats.products} 个`);
  console.log(`  - 库存预警: ${stats.alerts} 条`);
  console.log(`  - 出库单: ${stats.outbounds} 个`);
  console.log(`  - 盘点单: ${stats.checks} 个`);
  console.log(`  - 库存流水: ${stats.transactions} 条`);
}

main()
  .catch((e) => {
    console.error('❌ 错误:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
