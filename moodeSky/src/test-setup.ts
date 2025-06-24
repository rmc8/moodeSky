/**
 * テストセットアップファイル
 * テスト実行前に読み込まれる共通設定
 */

import '@testing-library/jest-dom';
import { vi } from 'vitest';

// ブラウザ環境の強制設定
Object.defineProperty(globalThis, 'document', {
  value: global.document,
  configurable: true
});

Object.defineProperty(globalThis, 'window', {
  value: global.window,
  configurable: true
});

// import.meta.env のモック
Object.defineProperty(globalThis, 'import', {
  value: {
    meta: {
      env: {
        SSR: false,
        DEV: true,
        VITE_USER_NODE_ENV: 'test'
      }
    }
  },
  configurable: true
});

// Tauri APIのモック
global.window = global.window ?? Object.create(window);
global.window.__TAURI__ = {
  core: {
    invoke: vi.fn(),
  },
  os: {
    locale: vi.fn().mockResolvedValue('ja'),
  },
  store: {
    Store: vi.fn().mockImplementation(() => ({
      get: vi.fn(),
      set: vi.fn(),
      save: vi.fn(),
    })),
  },
};

// console.logのモック（テスト中の不要な出力を抑制）
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// ResizeObserverのモック
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// IntersectionObserverのモック  
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// matchMediaのモック
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Svelte 5 mount関数が使用するDOM APIを完全に模擬
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => 'test-uuid-' + Math.random().toString(36))
  },
  configurable: true
});

// requestAnimationFrame / cancelAnimationFrame のモック
global.requestAnimationFrame = vi.fn(cb => setTimeout(cb, 0));
global.cancelAnimationFrame = vi.fn(id => clearTimeout(id));