import '@testing-library/jest-dom';

// Tauriモックの設定
global.window = Object.assign(global.window || {}, {
  __TAURI_INTERNALS__: {
    metadata: {
      currentTarget: {
        label: 'main'
      }
    }
  }
});

// Tauri APIのモック
const mockInvoke = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({
  invoke: mockInvoke
}));

vi.mock('@tauri-apps/api/app', () => ({
  getName: vi.fn(),
  getVersion: vi.fn()
}));

// グローバルにmockInvokeを提供
global.mockInvoke = mockInvoke;

// 環境変数モック
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// console.warn等の抑制（必要に応じて）
const originalConsoleWarn = console.warn;
console.warn = (...args: any[]) => {
  // Svelte deprecation警告などを必要に応じてフィルタ
  if (args[0]?.includes?.('Using `<slot>`')) {
    return; // この警告を無視
  }
  originalConsoleWarn(...args);
};