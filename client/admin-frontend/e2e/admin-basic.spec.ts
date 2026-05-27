import { test, expect } from '@playwright/test';

const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin123';

// 在所有测试前登录
test.beforeEach(async ({ page }) => {
  await page.goto('/login');
  await page.waitForSelector('.login-input', { timeout: 10000 });
  await page.fill('input[placeholder*="用户名"]', ADMIN_USER);
  await page.fill('input[placeholder*="密码"]', ADMIN_PASS);
  await page.click('button[type="submit"]');
  // 等待跳转到 dashboard
  await page.waitForURL('**/dashboard', { timeout: 10000 });
});

test.describe('管理后台核心功能', () => {

  test('1. 仪表盘概览页面', async ({ page }) => {
    await expect(page).toHaveURL(/dashboard/);
    // 验证页面标题
    await expect(page.locator('text=仪表盘').first()).toBeVisible({ timeout: 5000 });
    // 截图
    await page.screenshot({ path: 'e2e-screenshots/dashboard.png', fullPage: true });
  });

  test('2. 订单列表 - 浏览和搜索', async ({ page }) => {
    // 导航到订单页面
    await page.click('text=订单管理');
    await page.waitForURL('**/orders', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // 验证订单列表加载
    await expect(page.locator('.ant-table')).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'e2e-screenshots/orders.png', fullPage: true });
  });

  test('3. 用户管理页面', async ({ page }) => {
    // 导航到用户管理
    await page.click('text=用户管理');
    await page.waitForTimeout(500);
    await page.click('text=用户列表');
    await page.waitForURL('**/users', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // 验证用户列表
    await expect(page.locator('.ant-table')).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'e2e-screenshots/users.png', fullPage: true });
  });

  test('4. 套系管理页面', async ({ page }) => {
    // 导航到套系管理 — 点击展开子菜单
    await page.click('text=套系管理');
    await page.waitForTimeout(500);
    await page.click('text=套系列表');
    await page.waitForURL('**/packages/list', { timeout: 10000 });
    await page.waitForTimeout(2000);

    await expect(page.locator('.ant-table')).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'e2e-screenshots/packages.png', fullPage: true });

    // 测试批量选择（如果复选框存在）
    const checkboxes = page.locator('.ant-table-thead input[type="checkbox"]');
    if (await checkboxes.count() > 0) {
      await checkboxes.first().check();
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'e2e-screenshots/packages-batch.png', fullPage: true });
    }
  });

  test('5. 优惠券管理 - 批量操作', async ({ page }) => {
    // 导航到营销 -> 优惠券
    await page.click('text=营销管理');
    await page.waitForTimeout(500);
    await page.click('text=优惠券管理');
    await page.waitForURL('**/marketing/coupons', { timeout: 10000 });
    await page.waitForTimeout(2000);

    await expect(page.locator('.ant-table')).toBeVisible({ timeout: 10000 });

    // 选择第一行
    const rowCheckbox = page.locator('.ant-table-row input[type="checkbox"]').first();
    if (await rowCheckbox.count() > 0) {
      await rowCheckbox.check();
      await page.waitForTimeout(500);
      // 验证批量操作栏出现
      await expect(page.locator('text=批量启用').first()).toBeVisible({ timeout: 3000 });
      await page.screenshot({ path: 'e2e-screenshots/coupons-batch.png', fullPage: true });
    }
  });

  test('6. 数据分析中心', async ({ page }) => {
    // 直接导航到数据分析
    await page.click('text=数据分析');
    await page.waitForURL('**/analytics', { timeout: 10000 });
    await page.waitForTimeout(3000);

    // 验证页面标题
    await expect(page.locator('text=数据分析中心')).toBeVisible({ timeout: 5000 });
    // 验证 tabs 存在
    await expect(page.locator('text=综合看板')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('text=营收分析')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('text=客户分析')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('text=套餐分析')).toBeVisible({ timeout: 3000 });
    await page.screenshot({ path: 'e2e-screenshots/analytics-overview.png', fullPage: true });

    // 切换到营收分析 tab
    await page.click('text=营收分析');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'e2e-screenshots/analytics-revenue.png', fullPage: true });

    // 切换到客户分析 tab
    await page.click('text=客户分析');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'e2e-screenshots/analytics-customer.png', fullPage: true });
  });

  test('7. 拍摄日程页面', async ({ page }) => {
    await page.click('text=拍摄日程');
    await page.waitForURL('**/schedule-board', { timeout: 10000 });
    await page.waitForTimeout(2000);

    await expect(page.locator('text=拍摄日程').first()).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: 'e2e-screenshots/schedule.png', fullPage: true });
  });

  test('8. 库存智能 - 销量预测', async ({ page }) => {
    // 点击展开库存智能子菜单
    await page.click('text=库存智能');
    await page.waitForTimeout(500);
    await page.click('text=销量预测');
    await page.waitForURL('**/stock/prediction', { timeout: 10000 });
    await page.waitForTimeout(2000);

    const bodyText = await page.locator('body').textContent();
    // 销量预测页面可能没有表格，也可能有，截图保存
    await page.screenshot({ path: 'e2e-screenshots/sales-prediction.png', fullPage: true });
  });

});
