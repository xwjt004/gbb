import { test, expect } from '@playwright/test';

const API = '/api/v1';

/** 默认角色列表 */
const DEFAULT_ROLES = [
  { id: 1, name: '超级管理员', description: '系统最高权限，可执行所有操作', isSystem: true, status: 'ACTIVE', _count: { users: 1 } },
  { id: 2, name: '管理员', description: '日常运营管理权限', isSystem: true, status: 'ACTIVE', _count: { users: 2 } },
  { id: 3, name: '财务', description: '财务相关操作权限', isSystem: true, status: 'ACTIVE', _count: { users: 1 } },
  { id: 4, name: '客服', description: '客户服务相关权限', isSystem: true, status: 'ACTIVE', _count: { users: 0 } },
  { id: 5, name: '测试角色', description: 'Playwright 自动创建的测试角色', isSystem: false, status: 'ACTIVE', _count: { users: 0 } },
];

/** 权限树 */
const PERMISSION_TREE = [
  { key: 'dashboard', label: '仪表盘', children: [{ key: 'dashboard:view', label: '查看' }] },
  {
    key: 'orders', label: '订单管理', children: [
      { key: 'orders:view', label: '查看' },
      { key: 'orders:create', label: '创建' },
      { key: 'orders:edit', label: '编辑' },
    ],
  },
];

/**
 * 设置 API 路由拦截（所有 /api/v1/ 请求走 mock）
 */
async function setupApiMocks(page: any, roles: any[], nextId: { value: number }) {
  await page.route('**/api/v1/**', async (route: any) => {
    const url = route.request().url();
    const method = route.request().method();
    const path = new URL(url).pathname;

    // --- 登录 ---
    if (path.endsWith('/users/admin-login') && method === 'POST') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true, message: '登录成功',
          data: { id: 1, openid: '', nickname: '超级管理员', phone: '', isAdmin: true, token: 'mock-jwt-token-for-test' },
        }),
      });
    }

    // --- 权限树 ---
    if (path.endsWith('/permission-tree')) {
      return route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true, data: PERMISSION_TREE }),
      });
    }

    // --- 角色集合 (GET 列表 / POST 创建) ---
    if (path.replace(/\/+$/, '').endsWith('/roles') && !path.includes('permission-tree')) {
      if (method === 'GET') {
        return route.fulfill({
          status: 200, contentType: 'application/json',
          body: JSON.stringify({ success: true, data: roles }),
        });
      }
      if (method === 'POST') {
        const body = JSON.parse(route.request().postData() || '{}');
        const newRole = {
          id: nextId.value++,
          name: body.name,
          description: body.description,
          isSystem: false,
          status: 'ACTIVE',
          _count: { users: 0 },
          permissions: (body.permissions || []).map((p: string) => ({ permission: p })),
        };
        roles.push(newRole);
        return route.fulfill({
          status: 200, contentType: 'application/json',
          body: JSON.stringify({ success: true, data: newRole }),
        });
      }
    }

    // --- 单个角色 (PATCH 更新 / DELETE 删除) ---
    const roleMatch = path.match(/\/roles\/(\d+)$/);
    if (roleMatch) {
      const roleId = parseInt(roleMatch[1]);
      if (method === 'PATCH') {
        const body = JSON.parse(route.request().postData() || '{}');
        const idx = roles.findIndex((r: any) => r.id === roleId);
        if (idx >= 0) roles[idx] = { ...roles[idx], ...body };
        return route.fulfill({
          status: 200, contentType: 'application/json',
          body: JSON.stringify({ success: true, data: roles.find((r: any) => r.id === roleId) }),
        });
      }
      if (method === 'DELETE') {
        const idx = roles.findIndex((r: any) => r.id === roleId);
        if (idx >= 0 && roles[idx].isSystem) {
          return route.fulfill({
            status: 400, contentType: 'application/json',
            body: JSON.stringify({ success: false, message: '系统角色不可删除' }),
          });
        }
        roles.splice(idx, 1);
        return route.fulfill({
          status: 200, contentType: 'application/json',
          body: JSON.stringify({ success: true, message: '删除成功' }),
        });
      }
    }

    // --- 修改密码 ---
    if (path.endsWith('/auth/change-password') && method === 'POST') {
      return route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true, message: '密码修改成功' }),
      });
    }

    // --- 忘记密码 ---
    if (path.endsWith('/auth/forgot-password') && method === 'POST') {
      return route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true, message: '重置邮件已发送，请检查邮箱' }),
      });
    }

    // --- 重置密码 ---
    if (path.endsWith('/auth/reset-password') && method === 'POST') {
      return route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true, message: '密码重置成功' }),
      });
    }

    // --- 兜底：其它 API 调用返回空成功 (dashboard 等) ---
    return route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ success: true, data: {} }),
    });
  });
}

/**
 * 通过 UI 登录（填写表单 → 提交 → 等待跳转 dashboard）
 * 注意：Vite dev server 使用 base: /admin/，所以路径需要包含 /admin 前缀
 */
async function doLogin(page: any) {
  await page.goto('/admin/login');
  await page.waitForSelector('.login-input', { timeout: 15000 });
  await page.fill('input[placeholder*="用户名"]', 'admin');
  await page.fill('input[placeholder*="密码"]', 'admin123');
  await page.click('button[type="submit"]');
  try {
    await page.waitForURL('**/dashboard', { timeout: 15000 });
  } catch {
    await page.screenshot({ path: 'e2e-screenshots/login-failed.png', fullPage: true });
    throw new Error('登录失败 - 无法跳转到仪表盘');
  }
}

/* ============================================================
   角色管理（已登录状态）
   ============================================================ */
test.describe('角色权限管理', () => {

  test.describe('角色管理（已登录）', () => {

    test.beforeEach(async ({ page }) => {
      const roles: any[] = JSON.parse(JSON.stringify(DEFAULT_ROLES));
      const nextId = { value: 6 };
      await setupApiMocks(page, roles, nextId);
      await doLogin(page);
    });

    test('1. 角色管理页面加载', async ({ page }) => {
      await page.goto('/admin/system/roles');
      await page.waitForTimeout(2000);

      await expect(page.locator('text=角色管理').first()).toBeVisible({ timeout: 5000 });
      await expect(page.locator('.ant-table')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('text=超级管理员')).toBeVisible({ timeout: 3000 });
      await expect(page.getByRole('cell', { name: '管理员', exact: true })).toBeVisible({ timeout: 3000 });
      await expect(page.getByRole('cell', { name: '财务', exact: true })).toBeVisible({ timeout: 3000 });
      await expect(page.locator('button:has-text("新建角色")')).toBeVisible();

      await page.screenshot({ path: 'e2e-screenshots/roles-list.png', fullPage: true });
    });

    test('2. 创建新角色并分配权限', async ({ page }) => {
      await page.goto('/admin/system/roles');
      await page.waitForTimeout(1500);

      await page.click('button:has-text("新建角色")');
      await page.waitForTimeout(800);

      // 填写表单
      await page.fill('.ant-modal input[id$="name"]', '新建测试角色');
      await page.fill('.ant-modal textarea[id$="description"]', 'Playwright 新建的测试角色');

      // 在权限树中选择权限
      const treeNodes = page.locator('.ant-tree-treenode');
      const nodeCount = await treeNodes.count();
      expect(nodeCount).toBeGreaterThan(0);

      // 勾选第一个 checkbox（仪表盘-查看）
      const firstCheckbox = page.locator('.ant-tree-checkbox').first();
      await firstCheckbox.click();
      await page.waitForTimeout(300);

      // 提交
      await page.click('.ant-modal .ant-btn-primary:has-text("确 定")');
      await page.waitForTimeout(2000);

      // 验证成功消息
      await expect(page.locator('.ant-message')).toBeVisible({ timeout: 5000 });

      await page.screenshot({ path: 'e2e-screenshots/role-created.png', fullPage: true });
    });

    test('3. 编辑角色权限', async ({ page }) => {
      await page.goto('/admin/system/roles');
      await page.waitForTimeout(1500);

      // 找到测试角色行，点击编辑
      const editBtn = page.locator('tr:has-text("测试角色") button:has-text("编辑")');
      if (await editBtn.count() > 0) {
        await editBtn.click();
      } else {
        const firstEdit = page.locator('.ant-btn-link:has-text("编辑")').first();
        await firstEdit.click();
      }
      await page.waitForTimeout(500);

      // 修改描述
      const descInput = page.locator('.ant-modal textarea[id$="description"]');
      if (await descInput.count() > 0) {
        await descInput.fill('编辑后的角色描述');
      }

      // 提交
      await page.click('.ant-modal .ant-btn-primary:has-text("确 定")');
      await page.waitForTimeout(1500);

      await expect(page.locator('.ant-message')).toBeVisible({ timeout: 5000 });

      await page.screenshot({ path: 'e2e-screenshots/role-edited.png', fullPage: true });
    });

    test('4. 系统角色不可删除', async ({ page }) => {
      await page.goto('/admin/system/roles');
      await page.waitForTimeout(1500);

      // 超级管理员行不应有删除按钮
      const superAdminRow = page.locator('tr:has-text("超级管理员")');
      const deleteBtn = superAdminRow.locator('button:has-text("删除")');
      await expect(deleteBtn).toHaveCount(0);

      await page.screenshot({ path: 'e2e-screenshots/role-sysnodelete.png', fullPage: true });
    });

    test('5. 删除自定义角色', async ({ page }) => {
      await page.goto('/admin/system/roles');
      await page.waitForTimeout(1500);

      const deleteBtn = page.locator('tr:has-text("测试角色") button:has-text("删除")');
      if (await deleteBtn.count() > 0) {
        await deleteBtn.click();
        await page.waitForTimeout(500);

        const confirmBtn = page.locator('.ant-popconfirm .ant-btn-primary');
        if (await confirmBtn.count() > 0) {
          await confirmBtn.click();
          await page.waitForTimeout(1500);
          await expect(page.locator('.ant-message')).toBeVisible({ timeout: 5000 });
        }
      }

      await page.screenshot({ path: 'e2e-screenshots/role-deleted.png', fullPage: true });
    });

    test('6. 修改密码页面加载', async ({ page }) => {
      await page.goto('/admin/system/change-password');
      await page.waitForTimeout(1500);

      await expect(page.locator('text=修改密码').first()).toBeVisible({ timeout: 5000 });
      await expect(page.locator('text=当前密码')).toBeVisible();
      await expect(page.getByText('新密码', { exact: true })).toBeVisible();
      await expect(page.locator('text=确认新密码')).toBeVisible();
      await expect(page.locator('button:has-text("确认修改")')).toBeVisible();

      await page.screenshot({ path: 'e2e-screenshots/change-password.png', fullPage: true });
    });

    test('7. 修改密码 - 空验证', async ({ page }) => {
      await page.goto('/admin/system/change-password');
      await page.waitForTimeout(1000);

      await page.click('button:has-text("确认修改")');
      await page.waitForTimeout(500);

      const errorMsgs = page.locator('.ant-form-item-explain-error');
      await expect(errorMsgs.first()).toBeVisible({ timeout: 3000 });

      await page.screenshot({ path: 'e2e-screenshots/change-password-validation.png', fullPage: true });
    });

    test('8. 修改密码 - 两次密码不一致', async ({ page }) => {
      await page.goto('/admin/system/change-password');
      await page.waitForTimeout(1000);

      await page.fill('input[placeholder="请输入当前密码"]', 'admin123');
      await page.fill('input[placeholder="请输入新密码"]', 'newpass123');
      await page.fill('input[placeholder="请再次输入新密码"]', 'different456');

      await page.click('button:has-text("确认修改")');
      await page.waitForTimeout(500);

      const errorMsg = page.locator('.ant-form-item-explain-error');
      await expect(errorMsg).toBeVisible({ timeout: 3000 });

      await page.screenshot({ path: 'e2e-screenshots/change-password-mismatch.png', fullPage: true });
    });

    test('14. 用户菜单 - 修改密码入口', async ({ page }) => {
      await page.goto('/admin/dashboard');
      await page.waitForTimeout(1500);

      // 点击用户头像区域（触发下拉菜单）
      const userArea = page.locator('.ant-dropdown-trigger').last();
      if (await userArea.isVisible()) {
        await userArea.click();
        await page.waitForTimeout(500);

        const changePwdItem = page.locator('text=修改密码').last();
        await expect(changePwdItem).toBeVisible({ timeout: 3000 });

        await changePwdItem.click();
        await page.waitForURL('**/change-password', { timeout: 5000 });
      }

      await page.screenshot({ path: 'e2e-screenshots/user-menu-password.png', fullPage: true });
    });
  });

  /* ============================================================
     密码管理（未登录状态）
     ============================================================ */
  test.describe('密码管理（未登录）', () => {

    test.beforeEach(async ({ page }) => {
      const roles: any[] = JSON.parse(JSON.stringify(DEFAULT_ROLES));
      const nextId = { value: 6 };
      await setupApiMocks(page, roles, nextId);
    });

    test('9. 忘记密码页面加载', async ({ page }) => {
      await page.goto('/admin/forgot-password');
      await page.waitForTimeout(1000);

      await expect(page.locator('text=忘记密码').first()).toBeVisible({ timeout: 5000 });
      await expect(page.locator('input[placeholder*="邮箱"]')).toBeVisible();
      await expect(page.locator('button:has-text("发送重置邮件")')).toBeVisible();
      await expect(page.locator('a:has-text("返回登录")')).toBeVisible();

      await page.screenshot({ path: 'e2e-screenshots/forgot-password.png', fullPage: true });
    });

    test('10. 忘记密码 - 邮箱格式验证', async ({ page }) => {
      await page.goto('/admin/forgot-password');
      await page.waitForTimeout(1000);

      await page.fill('input[placeholder*="邮箱"]', 'not-an-email');
      await page.click('button:has-text("发送重置邮件")');
      await page.waitForTimeout(500);

      const errorMsg = page.locator('.ant-form-item-explain-error');
      await expect(errorMsg).toBeVisible({ timeout: 3000 });

      await page.screenshot({ path: 'e2e-screenshots/forgot-password-validation.png', fullPage: true });
    });

    test('11. 重置密码页面 - 无token参数', async ({ page }) => {
      await page.goto('/admin/reset-password');
      await page.waitForTimeout(1000);

      const errorText = page.locator('text=重置链接无效');
      await expect(errorText).toBeVisible({ timeout: 3000 });

      await expect(page.locator('a:has-text("重新发送")')).toBeVisible();

      await page.screenshot({ path: 'e2e-screenshots/reset-password-notoken.png', fullPage: true });
    });

    test('12. 重置密码页面 - 有token参数', async ({ page }) => {
      await page.goto('/admin/reset-password?token=test-reset-token-123');
      await page.waitForTimeout(1000);

      await expect(page.locator('text=设置新密码').first()).toBeVisible({ timeout: 5000 });
      await expect(page.locator('input[placeholder="请输入新密码"]')).toBeVisible();
      await expect(page.locator('input[placeholder="请再次输入新密码"]')).toBeVisible();
      await expect(page.locator('button:has-text("确认重置")')).toBeVisible();

      await page.screenshot({ path: 'e2e-screenshots/reset-password-form.png', fullPage: true });
    });

    test('13. 登录页 - 忘记密码链接', async ({ page }) => {
      await page.goto('/admin/login');
      await page.waitForTimeout(1000);

      const forgotLink = page.locator('a:has-text("忘记密码")');
      await expect(forgotLink).toBeVisible({ timeout: 3000 });

      const href = await forgotLink.getAttribute('href');
      expect(href).toContain('forgot-password');

      await page.screenshot({ path: 'e2e-screenshots/login-forgot-link.png', fullPage: true });
    });
  });

});
