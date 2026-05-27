import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3001';
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin123';

test.describe('GBB Admin Frontend', () => {

  test('1. 登录页面加载正常', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await expect(page).toHaveTitle(/管理后台/);
    await expect(page.locator('.login-brand h1')).toContainText('GBB 管理后台');
    await expect(page.locator('input[id="login_username"]')).toBeVisible();
    await expect(page.locator('input[id="login_password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('2. 登录失败显示错误提示', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.fill('input[id="login_username"]', 'wrong');
    await page.fill('input[id="login_password"]', 'wrong');
    await page.click('button[type="submit"]');
    // 等待错误提示出现（antd message）
    await expect(page.locator('.ant-message')).toBeVisible({ timeout: 5000 });
  });

  test('3. 成功登录并跳转仪表盘', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.fill('input[id="login_username"]', ADMIN_USER);
    await page.fill('input[id="login_password"]', ADMIN_PASS);
    await page.click('button[type="submit"]');
    // 等待跳转到仪表盘
    await page.waitForURL('**/dashboard', { timeout: 8000 });
    // 验证侧边栏显示
    await expect(page.locator('.ant-layout-sider')).toBeVisible();
    // 验证仪表盘内容加载
    await expect(page.locator('.ant-layout-content')).toBeVisible({ timeout: 5000 });
  });

  test.describe('登录后页面导航', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`${BASE}/login`);
      await page.fill('input[id="login_username"]', ADMIN_USER);
      await page.fill('input[id="login_password"]', ADMIN_PASS);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard', { timeout: 8000 });
    });

    test('4. 用户管理页面', async ({ page }) => {
      await page.goto(`${BASE}/users`);
      await page.waitForTimeout(2000);
      // 验证页面内容已加载
      await expect(page.locator('.ant-table, .ant-card, .ant-list, .ant-table-wrapper').first()).toBeVisible({ timeout: 8000 });
    });

    test('5. 订单管理页面', async ({ page }) => {
      await page.goto(`${BASE}/orders`);
      await page.waitForTimeout(2000);
      await expect(page.locator('.ant-table, .ant-card').first()).toBeVisible({ timeout: 5000 });
    });

    test('6. 套系管理页面', async ({ page }) => {
      await page.goto(`${BASE}/packages`);
      await page.waitForTimeout(2000);
      await expect(page.locator('.ant-table, .ant-card').first()).toBeVisible({ timeout: 5000 });
    });

    test('7. 商品管理页面', async ({ page }) => {
      await page.goto(`${BASE}/products`);
      await page.waitForTimeout(2000);
      await expect(page.locator('.ant-table, .ant-card').first()).toBeVisible({ timeout: 5000 });
    });

    test('8. 支付管理页面', async ({ page }) => {
      await page.goto(`${BASE}/payments`);
      await page.waitForTimeout(2000);
      await expect(page.locator('.ant-table, .ant-card').first()).toBeVisible({ timeout: 5000 });
    });

    test('9. 时间段管理页面', async ({ page }) => {
      await page.goto(`${BASE}/time-slots`);
      await page.waitForTimeout(2000);
      await expect(page.locator('.ant-table, .ant-card').first()).toBeVisible({ timeout: 5000 });
    });

    test('10. 供应商管理页面', async ({ page }) => {
      await page.goto(`${BASE}/suppliers`);
      await page.waitForTimeout(2000);
      await expect(page.locator('.ant-table, .ant-card').first()).toBeVisible({ timeout: 5000 });
    });

    test('11. 采购订单页面', async ({ page }) => {
      await page.goto(`${BASE}/purchase-orders`);
      await page.waitForTimeout(2000);
      await expect(page.locator('.ant-table, .ant-card').first()).toBeVisible({ timeout: 5000 });
    });

    test('12. 在途管理页面', async ({ page }) => {
      await page.goto(`${BASE}/in-transit`);
      await page.waitForTimeout(2000);
      await expect(page.locator('.ant-table, .ant-card').first()).toBeVisible({ timeout: 5000 });
    });

    test('13. 入库管理页面', async ({ page }) => {
      await page.goto(`${BASE}/inbound`);
      await page.waitForTimeout(2000);
      await expect(page.locator('.ant-table, .ant-card').first()).toBeVisible({ timeout: 5000 });
    });

    test('14. 退款管理页面', async ({ page }) => {
      await page.goto(`${BASE}/refunds/approval`);
      await page.waitForTimeout(2000);
      await expect(page.locator('.ant-table, .ant-card').first()).toBeVisible({ timeout: 5000 });
    });

    test('15. 搜索页面', async ({ page }) => {
      await page.goto(`${BASE}/search`);
      await page.waitForTimeout(2000);
      await expect(page.locator('.ant-input-search, input[type="text"]').first()).toBeVisible({ timeout: 5000 });
    });

    test('16. 系统状态页面', async ({ page }) => {
      await page.goto(`${BASE}/system/status`);
      await page.waitForTimeout(2000);
      await expect(page.locator('.ant-card, .ant-statistic').first()).toBeVisible({ timeout: 5000 });
    });

    test('17. 通知-推送页面', async ({ page }) => {
      await page.goto(`${BASE}/notify/push`);
      await page.waitForTimeout(2000);
      await expect(page.locator('.ant-table, .ant-card, .ant-form').first()).toBeVisible({ timeout: 5000 });
    });

    test('18. 通知-邮件页面', async ({ page }) => {
      await page.goto(`${BASE}/notify/email`);
      await page.waitForTimeout(2000);
      await expect(page.locator('.ant-table, .ant-card, .ant-form').first()).toBeVisible({ timeout: 5000 });
    });

    test('19. 通知-系统页面', async ({ page }) => {
      await page.goto(`${BASE}/notify/system`);
      await page.waitForTimeout(2000);
      await expect(page.locator('.ant-table, .ant-card, .ant-form').first()).toBeVisible({ timeout: 5000 });
    });

    test('20. 通知-库存预警页面', async ({ page }) => {
      await page.goto(`${BASE}/notify/stock`);
      await page.waitForTimeout(2000);
      await expect(page.locator('.ant-table, .ant-card').first()).toBeVisible({ timeout: 5000 });
    });

    test('21. 导出-订单页面', async ({ page }) => {
      await page.goto(`${BASE}/export/orders`);
      await page.waitForTimeout(2000);
      await expect(page.locator('.ant-table, .ant-card, .ant-btn').first()).toBeVisible({ timeout: 5000 });
    });

    test('22. 导出-用户页面', async ({ page }) => {
      await page.goto(`${BASE}/export/users`);
      await page.waitForTimeout(2000);
      await expect(page.locator('.ant-table, .ant-card').first()).toBeVisible({ timeout: 5000 });
    });

    test('23. 导出-财务页面', async ({ page }) => {
      await page.goto(`${BASE}/export/finance`);
      await page.waitForTimeout(2000);
      await expect(page.locator('.ant-table, .ant-card').first()).toBeVisible({ timeout: 5000 });
    });

    test('24. 店铺信息设置页面', async ({ page }) => {
      await page.goto(`${BASE}/settings/shop-info`);
      await page.waitForTimeout(2000);
      await expect(page.locator('.ant-form, .ant-card').first()).toBeVisible({ timeout: 5000 });
    });

    test('25. 打印设置页面', async ({ page }) => {
      await page.goto(`${BASE}/settings/print-settings`);
      await page.waitForTimeout(2000);
      await expect(page.locator('.ant-form, .ant-card').first()).toBeVisible({ timeout: 5000 });
    });

    test('26. 系统设置页面', async ({ page }) => {
      await page.goto(`${BASE}/system/settings`);
      await page.waitForTimeout(2000);
      await expect(page.locator('.ant-form, .ant-card').first()).toBeVisible({ timeout: 5000 });
    });

    test('27. 主题设置页面', async ({ page }) => {
      await page.goto(`${BASE}/system/theme`);
      await page.waitForTimeout(2000);
      await expect(page.locator('.ant-card, .ant-form').first()).toBeVisible({ timeout: 5000 });
    });

    test('28. 数据备份页面', async ({ page }) => {
      await page.goto(`${BASE}/system/backup`);
      await page.waitForTimeout(2000);
      await expect(page.locator('.ant-card, .ant-table').first()).toBeVisible({ timeout: 5000 });
    });

    test('29. 侧边栏菜单导航', async ({ page }) => {
      // 验证侧边栏中的菜单项
      const menu = page.locator('.ant-menu');
      await expect(menu).toBeVisible();
      // 检查关键菜单项
      const menuTexts = await menu.allInnerTexts();
      const allText = menuTexts.join(' ');
      expect(allText).toContain('仪表盘');
      expect(allText).toContain('用户');
      expect(allText).toContain('订单');
      expect(allText).toContain('套系');
      expect(allText).toContain('商品');
      expect(allText).toContain('支付');
    });

    test('30. 退出登录', async ({ page }) => {
      // 点击用户头像/退出按钮
      const logoutBtn = page.locator('span:has-text("退出"), .anticon-logout, button:has-text("退出")').first();
      if (await logoutBtn.isVisible()) {
        await logoutBtn.click();
        await page.waitForURL('**/login', { timeout: 5000 });
        await expect(page.locator('.login-brand h1')).toBeVisible();
      }
    });
  });
});
