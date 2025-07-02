/**
 * 基本アプリケーションテスト
 * E2Eテストでの基本的な動作確認
 */

import { test, expect } from '@playwright/test';

test.describe('Basic Application Tests', () => {
  test('should load the home page', async ({ page }) => {
    await page.goto('/');
    
    // ページが正常にロードされることを確認
    await expect(page).toHaveTitle(/moodeSky/);
  });

  test('should navigate to login page', async ({ page }) => {
    await page.goto('/');
    
    // ログインページへのナビゲーションを確認
    await page.goto('/login');
    await expect(page.url()).toContain('/login');
  });
});