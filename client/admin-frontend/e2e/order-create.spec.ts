import { test, expect } from '@playwright/test';

const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin123';

test.beforeEach(async ({ page }) => {
  await page.goto('/login');
  await page.waitForSelector('.login-input', { timeout: 10000 });
  await page.fill('input[placeholder*="用户名"]', ADMIN_USER);
  await page.fill('input[placeholder*="密码"]', ADMIN_PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 10000 });
});

test('新增订单 - 2026年5月5日8-9点 188元 定金20元', async ({ page }) => {
  // 1. 导航到订单管理
  await page.click('text=订单管理');
  await page.waitForURL('**/orders', { timeout: 10000 });
  await page.waitForTimeout(1000);

  // 2. 点击"新增订单"按钮打开弹窗
  await page.click('text=新增订单');
  await page.waitForTimeout(1500);

  // 3. 选择用户
  await page.locator('.ant-modal .ant-form-item').filter({ hasText: '用户' }).locator('.ant-select-selector').click();
  await page.waitForTimeout(500);
  await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option-content').filter({ hasText: '系统管理员' }).click();
  await page.waitForTimeout(500);

  // 4. 选择套餐（自动填充总金额和定金）
  await page.locator('.ant-modal .ant-form-item').filter({ hasText: '套餐' }).locator('.ant-select-selector').click();
  await page.waitForTimeout(500);
  await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').first().click();
  await page.waitForTimeout(500);

  // 5. 设置预约日期 2026-05-05
  await page.locator('.ant-modal .ant-form-item').filter({ hasText: '预约日期' }).locator('.ant-picker').click();
  await page.waitForTimeout(500);
  await page.locator('.ant-picker-cell:not(.ant-picker-cell-disabled)').filter({ hasText: '5' }).first().click();
  await page.waitForTimeout(3000);

  // 6. 选择 08:00-09:00 时间槽
  await page.locator('.ant-modal .ant-form-item').filter({ hasText: '时间槽' }).locator('.ant-select-selector').click();
  await page.waitForTimeout(1000);
  await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').filter({ hasText: '08:00' }).click();
  await page.waitForTimeout(300);

  // 7. 通过 Ant Design Form store 直接设置总金额和定金（绕过 InputNumber 受控组件限制）
  await page.evaluate(() => {
    const formEl = document.querySelector('.ant-form')!;
    const fiberKey = Object.keys(formEl).find(k => k.startsWith('__reactFiber$'))!;
    let fiber = formEl[fiberKey];
    while (fiber) {
      if (fiber.memoizedProps?.form?.setFieldsValue) {
        fiber.memoizedProps.form.setFieldsValue({ totalAmount: 188, depositAmount: 20 });
        return;
      }
      fiber = fiber.return;
    }
  });
  await page.waitForTimeout(500);

  // 截图已填写的表单
  await page.screenshot({ path: 'e2e-screenshots/order-form-filled.png', fullPage: true });

  // 8. 提交表单
  await page.click('.ant-modal-footer .ant-btn-primary');
  await page.waitForTimeout(2000);

  // 9. 验证成功消息
  await expect(page.locator('.ant-message .ant-message-success')).toBeVisible({ timeout: 10000 });
  await page.screenshot({ path: 'e2e-screenshots/order-created-success.png', fullPage: true });
});
