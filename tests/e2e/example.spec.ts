import { test, expect } from '@playwright/test';

test('health endpoint responds', async ({ request }) => {
  const response = await request.get('/api/v1/health');
  expect(response.ok()).toBeTruthy();
});
