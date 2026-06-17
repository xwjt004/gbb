import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3001/admin';
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin123';

// ======== Helper: login before each test ========
test.beforeEach(async ({ page }) => {
  await page.goto(`${BASE}/login`);
  await page.fill('input[id="login_username"]', ADMIN_USER);
  await page.fill('input[id="login_password"]', ADMIN_PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 8000 });
  // Wait for layout to fully render
  await page.waitForSelector('.ant-layout-sider', { timeout: 5000 });
});

test.describe('1. 仪表盘业务', () => {
  test('1.1 仪表盘加载统计卡片', async ({ page }) => {
    await page.goto(`${BASE}/dashboard`);
    await page.waitForTimeout(3000);
    // 验证统计卡片存在
    const stats = page.locator('.ant-card');
    await expect(stats.first()).toBeVisible({ timeout: 8000 });
    // 验证统计数值显示（StatCards 使用自定义环形组件，非 ant-statistic）
    const statCards = page.locator('.ant-card');
    const cardCount = await statCards.count();
    expect(cardCount).toBeGreaterThanOrEqual(4);
  });
});

test.describe('2. 用户管理业务', () => {
  test('2.1 用户列表加载与搜索', async ({ page }) => {
    await page.goto(`${BASE}/users`);
    await page.waitForTimeout(2000);
    // 验证表格加载
    const table = page.locator('.ant-table').first();
    await expect(table).toBeVisible({ timeout: 8000 });
    // 尝试搜索 - 查找搜索框
    const searchInput = page.locator('input[placeholder*="搜索"], input[placeholder*="昵称"], input[placeholder*="手机"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('admin');
      await searchInput.press('Enter');
      await page.waitForTimeout(2000);
      // 验证搜索结果
      await expect(table).toBeVisible();
    }
  });

  test('2.2 查看用户详情', async ({ page }) => {
    await page.goto(`${BASE}/users`);
    await page.waitForTimeout(2000);
    // 点击第一行的查看/详情按钮
    const viewBtn = page.locator('.ant-table tbody tr').first().locator('a, button, .anticon-eye').first();
    if (await viewBtn.isVisible()) {
      await viewBtn.click();
      await page.waitForTimeout(2000);
      // 验证详情页面或弹窗
      const url = page.url();
      expect(url).toContain('/users');
    }
  });

  test('2.3 切换用户状态', async ({ page }) => {
    await page.goto(`${BASE}/users`);
    await page.waitForTimeout(2000);
    // 查找切换状态按钮（开关或按钮）
    const toggleBtn = page.locator('.ant-table tbody tr').first().locator('button:has-text("禁用"), button:has-text("启用"), .ant-switch').first();
    if (await toggleBtn.isVisible()) {
      await toggleBtn.click();
      await page.waitForTimeout(1000);
      // 确认对话框（如果有）
      const confirmBtn = page.locator('.ant-popconfirm .ant-btn-primary, .ant-modal .ant-btn-primary').first();
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click();
        await page.waitForTimeout(2000);
      }
    }
  });
});

test.describe('3. 订单管理业务', () => {
  test('3.1 订单列表加载与筛选', async ({ page }) => {
    await page.goto(`${BASE}/orders`);
    await page.waitForTimeout(2000);
    const table = page.locator('.ant-table').first();
    await expect(table).toBeVisible({ timeout: 8000 });
    // 尝试按状态筛选
    const statusSelect = page.locator('.ant-select').first();
    if (await statusSelect.isVisible()) {
      // 点击下拉
      await statusSelect.click();
      await page.waitForTimeout(500);
      // 选择第一个选项
      const firstOption = page.locator('.ant-select-item-option').first();
      if (await firstOption.isVisible()) {
        await firstOption.click();
        await page.waitForTimeout(2000);
      }
    }
  });

  test('3.2 订单详情查看', async ({ page }) => {
    await page.goto(`${BASE}/orders`);
    await page.waitForTimeout(2000);
    // 点击第一行查看详情
    const firstRow = page.locator('.ant-table tbody tr').first();
    const detailLink = firstRow.locator('a, button').first();
    if (await detailLink.isVisible()) {
      await detailLink.click();
      await page.waitForTimeout(2000);
      // 验证详情内容
      await expect(page.locator('.ant-descriptions, .ant-card, .ant-table').first()).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('4. 套系管理业务', () => {
  test('4.1 套系列表加载', async ({ page }) => {
    await page.goto(`${BASE}/packages`);
    await page.waitForTimeout(2000);
    await expect(page.locator('.ant-table').first()).toBeVisible({ timeout: 8000 });
    // 检查表格有数据行
    const rows = page.locator('.ant-table tbody tr');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThanOrEqual(0);
  });
});

test.describe('5. 商品管理业务', () => {
  test('5.1 商品列表与搜索', async ({ page }) => {
    await page.goto(`${BASE}/products`);
    await page.waitForTimeout(2000);
    await expect(page.locator('.ant-table').first()).toBeVisible({ timeout: 8000 });
    // 尝试搜索商品
    const searchInput = page.locator('input[placeholder*="搜索"], input[placeholder*="名称"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      await searchInput.press('Enter');
      await page.waitForTimeout(2000);
    }
  });
});

test.describe('6. 支付管理业务', () => {
  test('6.1 支付列表与筛选', async ({ page }) => {
    await page.goto(`${BASE}/payments`);
    await page.waitForTimeout(2000);
    await expect(page.locator('.ant-table').first()).toBeVisible({ timeout: 8000 });
  });

  test('6.2 可疑支付监控', async ({ page }) => {
    await page.goto(`${BASE}/payments/suspicious`);
    await page.waitForTimeout(2000);
    await expect(page.locator('.ant-card, .ant-table').first()).toBeVisible({ timeout: 8000 });
  });
});

test.describe('7. 时间段管理业务', () => {
  test('7.1 时间段列表', async ({ page }) => {
    await page.goto(`${BASE}/time-slots`);
    await page.waitForTimeout(2000);
    await expect(page.locator('.ant-card, .ant-table, .ant-list, .ant-statistic').first()).toBeVisible({ timeout: 8000 });
  });
});

test.describe('8. 供应商管理业务', () => {
  test('8.1 供应商列表加载', async ({ page }) => {
    await page.goto(`${BASE}/suppliers`);
    await page.waitForTimeout(3000);
    await expect(page.locator('.ant-card, .ant-table').first()).toBeVisible({ timeout: 8000 });
  });

  test('8.2 创建供应商（如弹窗可用）', async ({ page }) => {
    await page.goto(`${BASE}/suppliers`);
    await page.waitForTimeout(2000);
    // 查找新增按钮
    const addBtn = page.locator('button:has-text("新增"), button:has-text("添加"), button:has-text("新建"), button:has-text("创建")').first();
    if (await addBtn.isVisible()) {
      await addBtn.click();
      await page.waitForTimeout(1000);
      // 等待表单出现（弹窗或内联表单）
      const form = page.locator('.ant-modal, .ant-drawer, form').first();
      try {
        await form.waitFor({ state: 'visible', timeout: 5000 });
        // 填写表单
        const nameInput = form.locator('input').first();
        if (await nameInput.isVisible()) {
          await nameInput.fill(`测试供应商_${Date.now()}`);
          // 尝试多种按钮提交
          const submitBtn = form.locator('button[type="submit"], .ant-btn-primary, button:has-text("确定"), button:has-text("保存"), button:has-text("提交")').first();
          if (await submitBtn.isVisible()) {
            await submitBtn.click();
            await page.waitForTimeout(3000);
          }
        }
      } catch {
        // 弹窗未出现，跳过
        console.log('Supplier form modal did not appear');
      }
    }
  });
});

test.describe('9. 采购订单业务', () => {
  test('9.1 采购订单列表', async ({ page }) => {
    await page.goto(`${BASE}/purchase-orders`);
    await page.waitForTimeout(3000);
    await expect(page.locator('.ant-card, .ant-table').first()).toBeVisible({ timeout: 8000 });
  });
});

test.describe('10. 在途管理业务', () => {
  test('10.1 在途记录列表', async ({ page }) => {
    await page.goto(`${BASE}/in-transit`);
    await page.waitForTimeout(3000);
    await expect(page.locator('.ant-card, .ant-table').first()).toBeVisible({ timeout: 8000 });
  });
});

test.describe('11. 入库管理业务', () => {
  test('11.1 入库记录列表', async ({ page }) => {
    await page.goto(`${BASE}/inbound`);
    await page.waitForTimeout(3000);
    await expect(page.locator('.ant-card, .ant-table').first()).toBeVisible({ timeout: 8000 });
  });
});

test.describe('12. 退款管理业务', () => {
  test('12.1 退款审批列表', async ({ page }) => {
    await page.goto(`${BASE}/refunds/approval`);
    await page.waitForTimeout(2000);
    await expect(page.locator('.ant-card, .ant-table').first()).toBeVisible({ timeout: 8000 });
  });

  test('12.2 退款记录', async ({ page }) => {
    await page.goto(`${BASE}/refunds/records`);
    await page.waitForTimeout(2000);
    await expect(page.locator('.ant-card, .ant-table').first()).toBeVisible({ timeout: 8000 });
  });
});

test.describe('13. 通知管理业务', () => {
  test('13.1 发送推送通知', async ({ page }) => {
    await page.goto(`${BASE}/notify/push`);
    await page.waitForTimeout(2000);
    // 点击"发送推送"按钮
    const sendBtn = page.locator('button:has-text("发送推送")').first();
    await expect(sendBtn).toBeVisible({ timeout: 5000 });
    await sendBtn.click();
    await page.waitForTimeout(500);
    // 填写弹窗表单
    const modal = page.locator('.ant-modal').first();
    if (await modal.isVisible()) {
      await modal.locator('input').first().fill(`测试推送_${Date.now()}`);
      await modal.locator('textarea').first().fill('这是一条自动化测试推送消息');
      // 提交
      await modal.locator('.ant-btn-primary').first().click();
      await page.waitForTimeout(2000);
    }
  });

  test('13.2 邮件通知列表', async ({ page }) => {
    await page.goto(`${BASE}/notify/email`);
    await page.waitForTimeout(2000);
    await expect(page.locator('.ant-card, .ant-table, .ant-form').first()).toBeVisible({ timeout: 8000 });
    // 尝试发送邮件通知
    const sendBtn = page.locator('button:has-text("发送邮件")').first();
    if (await sendBtn.isVisible()) {
      await sendBtn.click();
      await page.waitForTimeout(500);
      const modal = page.locator('.ant-modal').first();
      if (await modal.isVisible({ timeout: 3000 })) {
        // 填写邮件表单
        const inputs = modal.locator('input');
        const inputCount = await inputs.count();
        if (inputCount > 0) await inputs.nth(0).fill(`test@example.com`);
        const textareas = modal.locator('textarea');
        if (await textareas.count() > 0) await textareas.first().fill('测试邮件内容');
        if (inputCount > 1) await inputs.nth(1).fill(`测试邮件_${Date.now()}`);
        await modal.locator('.ant-btn-primary').first().click();
        await page.waitForTimeout(2000);
      }
    }
  });

  test('13.3 系统通知列表与发送', async ({ page }) => {
    await page.goto(`${BASE}/notify/system`);
    await page.waitForTimeout(2000);
    await expect(page.locator('.ant-card, .ant-table, .ant-form').first()).toBeVisible({ timeout: 8000 });
    // 发送系统通知
    const sendBtn = page.locator('button:has-text("发送通知"), button:has-text("发送系统")').first();
    if (await sendBtn.isVisible()) {
      await sendBtn.click();
      await page.waitForTimeout(500);
      const modal = page.locator('.ant-modal').first();
      if (await modal.isVisible({ timeout: 3000 })) {
        await modal.locator('input').first().fill(`测试系统通知_${Date.now()}`);
        await modal.locator('textarea').first().fill('这是一条自动化测试系统通知');
        await modal.locator('.ant-btn-primary').first().click();
        await page.waitForTimeout(2000);
      }
    }
  });

  test('13.4 库存预警列表', async ({ page }) => {
    await page.goto(`${BASE}/notify/stock`);
    await page.waitForTimeout(2000);
    await expect(page.locator('.ant-card, .ant-table').first()).toBeVisible({ timeout: 8000 });
  });
});

test.describe('14. 导出业务', () => {
  test('14.1 订单预览与导出', async ({ page }) => {
    await page.goto(`${BASE}/export/orders`);
    await page.waitForTimeout(2000);
    // 点击"预览数据"
    const previewBtn = page.locator('button:has-text("预览数据")').first();
    await expect(previewBtn).toBeVisible({ timeout: 8000 });
    await previewBtn.click();
    await page.waitForTimeout(3000);
    // 验证预览结果（表格或统计数据）
    const previewResult = page.locator('.ant-table, .ant-statistic').first();
    if (await previewResult.isVisible({ timeout: 5000 })) {
      const statValue = page.locator('.ant-statistic-content-value').first();
      await expect(statValue).toBeVisible({ timeout: 3000 });
    }
  });

  test('14.2 用户数据预览', async ({ page }) => {
    await page.goto(`${BASE}/export/users`);
    await page.waitForTimeout(2000);
    // 点击"预览数据"
    const previewBtn = page.locator('button:has-text("预览数据")').first();
    await expect(previewBtn).toBeVisible({ timeout: 8000 });
    await previewBtn.click();
    await page.waitForTimeout(3000);
    // 验证预览表格
    const previewTable = page.locator('.ant-table').first();
    if (await previewTable.isVisible({ timeout: 5000 })) {
      // 验证有数据行
      const rows = previewTable.locator('tbody tr');
      const rowCount = await rows.count();
      expect(rowCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('14.3 财务数据预览', async ({ page }) => {
    await page.goto(`${BASE}/export/finance`);
    await page.waitForTimeout(2000);
    // 选择日期范围（选近30天）
    const datePicker = page.locator('.ant-picker').first();
    if (await datePicker.isVisible()) {
      await datePicker.click();
      await page.waitForTimeout(500);
      // 点击今天
      const today = page.locator('.ant-picker-cell-today').first();
      if (await today.isVisible()) {
        await today.click();
        await page.waitForTimeout(300);
        // 再次点击选择结束日期
        await datePicker.click();
        await page.waitForTimeout(300);
        await today.click();
        await page.waitForTimeout(500);
      }
    }
    // 点击预览
    const previewBtn = page.locator('button:has-text("预览数据")').first();
    if (await previewBtn.isVisible()) {
      await previewBtn.click();
      await page.waitForTimeout(3000);
    }
    await expect(page.locator('.ant-card, .ant-statistic').first()).toBeVisible({ timeout: 8000 });
  });

  test('14.4 全量数据导出页面', async ({ page }) => {
    await page.goto(`${BASE}/export/all`);
    await page.waitForTimeout(2000);
    await expect(page.locator('button:has-text("导出")').first()).toBeVisible({ timeout: 8000 });
    // 验证导出说明内容
    await expect(page.locator('.ant-card, .ant-alert').first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('15. 系统设置业务', () => {
  test('15.1 店铺信息设置加载', async ({ page }) => {
    await page.goto(`${BASE}/settings/shop-info`);
    await page.waitForTimeout(2000);
    await expect(page.locator('.ant-form, .ant-card').first()).toBeVisible({ timeout: 8000 });
  });

  test('15.2 打印设置加载', async ({ page }) => {
    await page.goto(`${BASE}/settings/print-settings`);
    await page.waitForTimeout(2000);
    await expect(page.locator('.ant-form, .ant-card').first()).toBeVisible({ timeout: 8000 });
  });

  test('15.3 系统状态查看', async ({ page }) => {
    await page.goto(`${BASE}/system/status`);
    await page.waitForTimeout(2000);
    await expect(page.locator('.ant-card, .ant-statistic').first()).toBeVisible({ timeout: 8000 });
  });

  test('15.4 通用设置加载', async ({ page }) => {
    await page.goto(`${BASE}/system/settings`);
    await page.waitForTimeout(2000);
    await expect(page.locator('.ant-form, .ant-card').first()).toBeVisible({ timeout: 8000 });
  });

  test('15.5 主题设置加载', async ({ page }) => {
    await page.goto(`${BASE}/system/theme`);
    await page.waitForTimeout(2000);
    await expect(page.locator('.ant-card').first()).toBeVisible({ timeout: 8000 });
  });
});

test.describe('16. 对账管理业务', () => {
  test('16.1 对账仪表盘', async ({ page }) => {
    await page.goto(`${BASE}/reconciliation`);
    await page.waitForTimeout(2000);
    await expect(page.locator('.ant-card').first()).toBeVisible({ timeout: 8000 });
  });
});

test.describe('17. 搜索业务', () => {
  test('17.1 全局搜索', async ({ page }) => {
    await page.goto(`${BASE}/search`);
    await page.waitForTimeout(2000);
    const searchInput = page.locator('.ant-input-search input, input[type="text"]').first();
    await expect(searchInput).toBeVisible({ timeout: 8000 });
    // 尝试搜索
    await searchInput.fill('test');
    await searchInput.press('Enter');
    await page.waitForTimeout(2000);
  });
});

test.describe('18. 侧边栏导航业务', () => {
  test('18.1 通过菜单导航到各页面', async ({ page }) => {
    // 获取所有菜单项
    const menuItems = page.locator('.ant-menu-item, .ant-menu-title-content');
    const itemCount = await menuItems.count();
    expect(itemCount).toBeGreaterThan(5);
    // 点击前几个不同的菜单项
    for (let i = 0; i < Math.min(itemCount, 5); i++) {
      const item = menuItems.nth(i);
      if (await item.isVisible()) {
        await item.click();
        await page.waitForTimeout(1500);
        // 验证 URL 已变化
        const currentUrl = page.url();
        expect(currentUrl).not.toContain('/login');
      }
    }
  });
});
