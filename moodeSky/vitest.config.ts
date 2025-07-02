import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    environment: 'jsdom',
    globals: true,
    css: false, // CSS処理を無効化してテスト高速化
    // モジュール解決設定
    alias: {
      '$lib': './src/lib'
    },
    coverage: {
      provider: 'v8',
      include: [
        'src/lib/**/*.{ts,svelte}',
        '!src/lib/**/*.test.{ts,svelte}',
        '!src/lib/**/*.spec.{ts,svelte}'
      ],
      exclude: [
        'src/lib/types/**',
        'src/paraglide/**',
        'src/lib/**/*.d.ts',
        'src/lib/components/**/*.stories.{ts,svelte}'
      ],
      thresholds: {
        global: {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90
        },
        // セッション管理コンポーネント専用の高い閾値
        'src/lib/services/sessionManager.ts': {
          branches: 95,
          functions: 95,
          lines: 95,
          statements: 95
        },
        'src/lib/services/agentManager.ts': {
          branches: 95,
          functions: 95,
          lines: 95,
          statements: 95
        },
        'src/lib/services/authStore.ts': {
          branches: 95,
          functions: 95,
          lines: 95,
          statements: 95
        },
        'src/lib/services/backgroundSessionMonitor.ts': {
          branches: 95,
          functions: 95,
          lines: 95,
          statements: 95
        },
        'src/lib/services/jwtTokenManager.ts': {
          branches: 95,
          functions: 95,
          lines: 95,
          statements: 95
        }
      },
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage'
    }
  },
  // SvelteKit用の環境変数設定
  define: {
    // ブラウザ環境であることを明示
    'import.meta.env.SSR': false,
    'import.meta.env.DEV': true
  },
  // Svelte 5対応の追加設定
  resolve: {
    conditions: ['browser']
  }
});