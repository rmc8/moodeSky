import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    globals: true,
    css: false, // CSS処理を無効化してテスト高速化
    coverage: {
      provider: 'v8',
      include: ['src/lib/**/*.{ts,svelte}'],
      exclude: [
        'src/lib/**/*.test.{ts,svelte}',
        'src/lib/**/*.spec.{ts,svelte}',
        'src/lib/types/**',
        'src/paraglide/**'
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70
        }
      }
    }
  },
  // SvelteKit用の環境変数設定
  define: {
    // ブラウザ環境であることを明示
    'import.meta.env.SSR': false,
    'import.meta.env.DEV': true
  }
});