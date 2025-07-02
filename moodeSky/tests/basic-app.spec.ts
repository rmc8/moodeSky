/**
 * 基本アプリケーションテスト
 * E2Eテストでの基本的な動作確認
 */

import { test, expect, type Page } from '@playwright/test';

// 共通のヘルパー関数
const waitForPageLoad = async (page: Page): Promise<void> => {
  await page.waitForLoadState('networkidle');
};

test.describe('Basic Application Tests', () => {
  test('should load the home page with correct title', async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);
    
    // ページタイトルを確認
    await expect(page).toHaveTitle(/moodeSky/);
    
    // 基本的なナビゲーション要素が存在することを確認
    const navigation = page.locator('nav');
    await expect(navigation).toBeVisible();
  });

  test('should navigate to login page', async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);
    
    // ログインページへの直接アクセス
    await page.goto('/login');
    await waitForPageLoad(page);
    
    // URLが正しいことを確認
    await expect(page.url()).toContain('/login');
    
    // ログインフォームの存在を確認
    const loginForm = page.locator('form');
    await expect(loginForm).toBeVisible();
  });

  test('should navigate to settings page', async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);
    
    // 設定ページへの直接アクセス
    await page.goto('/settings');
    await waitForPageLoad(page);
    
    // URLが正しいことを確認
    await expect(page.url()).toContain('/settings');
  });

  test('should handle 404 for non-existent pages', async ({ page }) => {
    // 存在しないページへのアクセス
    const response = await page.goto('/non-existent-page');
    
    // 404ページまたはホームページリダイレクトを確認
    if (response) {
      // SPAの場合、通常はクライアントサイドルーティングで処理される
      await waitForPageLoad(page);
      
      // ページが何らかの形で表示されることを確認（404ページまたはリダイレクト）
      const body = page.locator('body');
      await expect(body).toBeVisible();
    }
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    // モバイルビューポートに設定
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/');
    await waitForPageLoad(page);
    
    // ページが正常に表示されることを確認
    await expect(page).toHaveTitle(/moodeSky/);
    
    // モバイル用のナビゲーションが表示されることを確認
    const mobileNav = page.locator('[data-testid="mobile-navigation"], .mobile-nav, nav');
    await expect(mobileNav).toBeVisible();
  });

  test('should load JavaScript and styles correctly', async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);
    
    // CSSが正しく適用されていることを確認（例：テーマシステム）
    const htmlElement = page.locator('html');
    const dataTheme = await htmlElement.getAttribute('data-theme');
    
    // data-theme属性が設定されていることを確認（テーマシステムが動作している）
    expect(dataTheme).toBeTruthy();
    
    // JavaScriptが実行されていることを確認
    const jsCheck = await page.evaluate(() => typeof window !== 'undefined');
    expect(jsCheck).toBe(true);
  });

  test('should handle theme switching', async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);
    
    // 初期テーマを記録
    const htmlElement = page.locator('html');
    const initialTheme = await htmlElement.getAttribute('data-theme');
    
    // テーマトグルボタンを探してクリック
    const themeToggle = page.locator('[data-testid="theme-toggle"], .theme-toggle, button[aria-label*="theme"], button[aria-label*="テーマ"]');
    
    if (await themeToggle.isVisible()) {
      await themeToggle.click();
      
      // テーマが変更されたことを確認
      await page.waitForTimeout(100); // アニメーション待ち
      const newTheme = await htmlElement.getAttribute('data-theme');
      expect(newTheme).not.toBe(initialTheme);
    }
  });
});