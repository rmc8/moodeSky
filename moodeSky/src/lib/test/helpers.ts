import { render, type RenderResult } from '@testing-library/svelte';
import { vi } from 'vitest';
import type { ComponentProps, SvelteComponent } from 'svelte';

/**
 * Svelteコンポーネントのテスト用レンダーヘルパー
 */
export function renderComponent<T extends SvelteComponent>(
  component: new (...args: any[]) => T,
  props?: ComponentProps<T>
): RenderResult<T> {
  return render(component, { props });
}

/**
 * Tauriコマンドのモック作成ヘルパー
 */
export function mockTauriCommand(commandName: string, returnValue: any) {
  const mockInvoke = (global as any).mockInvoke;
  if (mockInvoke) {
    mockInvoke.mockImplementation((cmd: string, args?: any) => {
      if (cmd === commandName) {
        return Promise.resolve(returnValue);
      }
      return Promise.reject(new Error(`Unmocked command: ${cmd}`));
    });
  }
}

/**
 * 複数のTauriコマンドを一括でモック
 */
export function mockMultipleTauriCommands(commands: Record<string, any>) {
  const mockInvoke = (global as any).mockInvoke;
  if (mockInvoke) {
    mockInvoke.mockImplementation((cmd: string, args?: any) => {
      if (cmd in commands) {
        return Promise.resolve(commands[cmd]);
      }
      return Promise.reject(new Error(`Unmocked command: ${cmd}`));
    });
  }
}

/**
 * データベース操作のモック（成功レスポンス）
 */
export function mockDatabaseCommands() {
  mockMultipleTauriCommands({
    'upsert_account': { success: true, account_id: 1 },
    'get_account_by_handle': mockUserData.account,
    'validate_pds_url': { valid: true, url: 'https://bsky.social' },
    'add_pds_to_history': { success: true },
    'set_default_pds_url': { success: true },
    'login_with_app_password': mockUserData,
    'logout': { success: true },
    'get_current_user': mockUserData.account,
  });
}

/**
 * Tauriコマンドのエラーモック作成ヘルパー
 */
export function mockTauriCommandError(commandName: string, error: string) {
  const mockInvoke = (global as any).mockInvoke;
  if (mockInvoke) {
    mockInvoke.mockImplementation((cmd: string, args?: any) => {
      if (cmd === commandName) {
        return Promise.reject(new Error(error));
      }
      return Promise.reject(new Error(`Unmocked command: ${cmd}`));
    });
  }
}

/**
 * ローカルストレージのモック
 */
export function mockLocalStorage() {
  const store: Record<string, string> = {};
  
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    }),
    length: 0,
    key: vi.fn()
  };
}

/**
 * 時間経過のシミュレーション
 */
export async function waitFor(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * デバッグ用: コンポーネントのHTMLを出力
 */
export function debugComponent(component: RenderResult<any>) {
  console.log(component.container.innerHTML);
}

/**
 * テスト用のダミーユーザーデータ
 */
export const mockUserData = {
  account: {
    id: 1,
    handle: 'test.bsky.social',
    did: 'did:plc:test123456789',
    service_url: 'https://bsky.social',
    auth_type: 'app_password',
    display_name: 'Test User',
    avatar_url: 'https://example.com/avatar.jpg',
    is_active: true,
    account_id: 1,
    created_at: '2025-06-16T00:00:00Z',
    updated_at: '2025-06-16T00:00:00Z'
  },
  session_token: 'mock_session_token_12345'
};

/**
 * テスト用のダミーPDS設定
 */
export const mockPdsSettings = {
  default_pds_url: 'https://bsky.social',
  remember_pds: true,
  pds_history: [
    'https://bsky.social',
    'https://staging.bsky.dev',
    'https://custom.pds.example.com'
  ],
  trusted_pds_list: [
    'https://bsky.social',
    'https://staging.bsky.dev'
  ]
};