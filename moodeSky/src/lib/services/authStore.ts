import { Store } from '@tauri-apps/plugin-store';
import type { AtpSessionData } from '@atproto/api';
import type {
  Account,
  AuthStore,
  AuthResult,
  AuthError,
  LegacyAuthData,
  SessionEventHandler,
  STORE_KEYS
} from '../types/auth.js';

/**
 * Tauri Store Plugin AuthService
 * 認証情報のセキュアなストレージ管理を提供
 * tokimekiblueskyのパターンを参考にTauri用に最適化
 */
export class AuthService {
  private readonly STORE_NAME = 'auth.json';
  private sessionEventHandler?: SessionEventHandler;
  private store?: Store;

  constructor(sessionEventHandler?: SessionEventHandler) {
    this.sessionEventHandler = sessionEventHandler;
  }

  /**
   * Store インスタンスを取得・初期化
   */
  private async getStore(): Promise<Store> {
    if (!this.store) {
      this.store = await Store.load(this.STORE_NAME);
    }
    return this.store;
  }

  /**
   * Store Pluginからデータを読み込み
   */
  private async loadFromStore<T>(key: string): Promise<AuthResult<T | null>> {
    try {
      const store = await this.getStore();
      const value = await store.get<T>(key);
      return { success: true, data: value };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'STORE_LOAD_FAILED',
          message: `Failed to load ${key}: ${error}`,
        },
      };
    }
  }

  /**
   * Store Pluginにデータを保存
   */
  private async saveToStore<T>(key: string, value: T): Promise<AuthResult> {
    try {
      const store = await this.getStore();
      await store.set(key, value);
      await store.save();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'STORE_SAVE_FAILED',
          message: `Failed to save ${key}: ${error}`,
        },
      };
    }
  }

  /**
   * Store Pluginからキーを削除
   */
  private async deleteFromStore(key: string): Promise<AuthResult> {
    try {
      const store = await this.getStore();
      await store.delete(key);
      await store.save();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'STORE_SAVE_FAILED',
          message: `Failed to delete ${key}: ${error}`,
        },
      };
    }
  }

  /**
   * UUIDを生成
   */
  private generateId(): string {
    return crypto.randomUUID();
  }

  /**
   * 認証ストアデータを読み込み
   */
  async loadAuthStore(): Promise<AuthResult<AuthStore>> {
    const result = await this.loadFromStore<AuthStore>('auth_store');
    if (!result.success) {
      return result as AuthResult<AuthStore>;
    }

    const authStore = result.data || {
      accounts: [],
      lastLoginAt: new Date().toISOString(),
    };

    return { success: true, data: authStore };
  }

  /**
   * 認証ストアデータを保存
   */
  async saveAuthStore(authStore: AuthStore): Promise<AuthResult> {
    return await this.saveToStore('auth_store', authStore);
  }

  /**
   * アカウントを追加・更新
   */
  async saveAccount(
    service: string,
    session: AtpSessionData,
    profile: {
      did: string;
      handle: string;
      displayName?: string;
      avatar?: string;
    }
  ): Promise<AuthResult<Account>> {
    try {
      // 既存のストアデータを読み込み
      const storeResult = await this.loadAuthStore();
      if (!storeResult.success) {
        return {
          success: false,
          error: storeResult.error,
        } as AuthResult<Account>;
      }

      const authStore = storeResult.data!;
      
      // 既存アカウントを検索（DIDで一意性を判定）
      const existingAccountIndex = authStore.accounts.findIndex(
        (account) => account.profile.did === profile.did
      );

      const now = new Date().toISOString();
      let account: Account;

      if (existingAccountIndex >= 0) {
        // 既存アカウントを更新
        account = {
          ...authStore.accounts[existingAccountIndex],
          service,
          session,
          profile,
          lastAccessAt: now,
        };
        authStore.accounts[existingAccountIndex] = account;
      } else {
        // 新規アカウントを作成
        account = {
          id: this.generateId(),
          service,
          session,
          profile,
          createdAt: now,
          lastAccessAt: now,
        };
        authStore.accounts.push(account);
      }

      // アクティブアカウントとして設定
      authStore.activeAccountId = account.id;
      authStore.lastLoginAt = now;

      // ストアに保存
      const saveResult = await this.saveAuthStore(authStore);
      if (!saveResult.success) {
        return {
          success: false,
          error: saveResult.error,
        } as AuthResult<Account>;
      }

      // セッションイベントを発火
      if (this.sessionEventHandler) {
        await this.sessionEventHandler('create', session);
      }

      return { success: true, data: account };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'STORE_SAVE_FAILED',
          message: `Failed to save account: ${error}`,
        },
      };
    }
  }

  /**
   * アクティブアカウントを取得
   */
  async getActiveAccount(): Promise<AuthResult<Account | null>> {
    const storeResult = await this.loadAuthStore();
    if (!storeResult.success) {
      return {
        success: false,
        error: storeResult.error,
      } as AuthResult<Account | null>;
    }

    const authStore = storeResult.data!;
    if (!authStore.activeAccountId) {
      return { success: true, data: null };
    }

    const account = authStore.accounts.find(
      (acc) => acc.id === authStore.activeAccountId
    );

    if (!account) {
      return {
        success: false,
        error: {
          type: 'ACCOUNT_NOT_FOUND',
          message: 'Active account not found',
        },
      };
    }

    return { success: true, data: account };
  }

  /**
   * 全アカウントを取得
   */
  async getAllAccounts(): Promise<AuthResult<Account[]>> {
    const storeResult = await this.loadAuthStore();
    if (!storeResult.success) {
      return {
        success: false,
        error: storeResult.error,
      } as AuthResult<Account[]>;
    }

    return { success: true, data: storeResult.data!.accounts };
  }

  /**
   * アカウントを削除
   */
  async deleteAccount(accountId: string): Promise<AuthResult> {
    try {
      const storeResult = await this.loadAuthStore();
      if (!storeResult.success) {
        return {
          success: false,
          error: storeResult.error,
        };
      }

      const authStore = storeResult.data!;
      const accountIndex = authStore.accounts.findIndex(
        (account) => account.id === accountId
      );

      if (accountIndex < 0) {
        return {
          success: false,
          error: {
            type: 'ACCOUNT_NOT_FOUND',
            message: 'Account not found',
          },
        };
      }

      // アカウントを削除
      authStore.accounts.splice(accountIndex, 1);

      // アクティブアカウントだった場合はクリア
      if (authStore.activeAccountId === accountId) {
        authStore.activeAccountId = authStore.accounts.length > 0 
          ? authStore.accounts[0].id 
          : undefined;
      }

      return await this.saveAuthStore(authStore);
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'STORE_SAVE_FAILED',
          message: `Failed to delete account: ${error}`,
        },
      };
    }
  }

  /**
   * 全認証データをクリア
   */
  async clearAll(): Promise<AuthResult> {
    try {
      // セッションイベントを発火 (削除時はイベントのみ)
      // Note: AtpSessionEventの具体的な値は@atproto/apiのドキュメントを要確認
      // ここでは一旦コメントアウト
      // if (this.sessionEventHandler) {
      //   await this.sessionEventHandler('delete', undefined);
      // }

      return await this.deleteFromStore('auth_store');
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'STORE_SAVE_FAILED',
          message: `Failed to clear auth data: ${error}`,
        },
      };
    }
  }

  /**
   * localStorage からのデータ移行
   */
  async migrateFromLocalStorage(): Promise<AuthResult<Account | null>> {
    try {
      // localStorageからレガシーデータを取得
      const legacyData: LegacyAuthData = {
        authDid: localStorage.getItem('authDid') || undefined,
        authHandle: localStorage.getItem('authHandle') || undefined,
        authAccessJwt: localStorage.getItem('authAccessJwt') || undefined,
        authDisplayName: localStorage.getItem('authDisplayName') || undefined,
        authAvatar: localStorage.getItem('authAvatar') || undefined,
      };

      // 必要なデータが存在するかチェック
      if (!legacyData.authDid || !legacyData.authHandle || !legacyData.authAccessJwt) {
        return { success: true, data: null };
      }

      // AtpSessionData 形式に変換
      const session: AtpSessionData = {
        did: legacyData.authDid,
        handle: legacyData.authHandle,
        accessJwt: legacyData.authAccessJwt,
        refreshJwt: '', // refreshJwtは必須だが、レガシーデータにはないため空文字
        active: true,
      };

      const profile = {
        did: legacyData.authDid,
        handle: legacyData.authHandle,
        displayName: legacyData.authDisplayName,
        avatar: legacyData.authAvatar,
      };

      // Store Pluginに保存
      const saveResult = await this.saveAccount(
        'https://bsky.social', // デフォルトサービス
        session,
        profile
      );

      if (saveResult.success) {
        // 移行成功後、localStorageをクリア
        localStorage.removeItem('authDid');
        localStorage.removeItem('authHandle');
        localStorage.removeItem('authAccessJwt');
        localStorage.removeItem('authDisplayName');
        localStorage.removeItem('authAvatar');
      }

      return saveResult;
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'MIGRATION_FAILED',
          message: `Failed to migrate from localStorage: ${error}`,
        },
      };
    }
  }

  /**
   * Store Pluginストアファイルを手動で読み込み
   */
  async loadStore(): Promise<AuthResult> {
    try {
      await this.getStore(); // Store インスタンスを初期化
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'STORE_LOAD_FAILED',
          message: `Failed to load store: ${error}`,
        },
      };
    }
  }

  /**
   * Store Pluginストアファイルを手動で保存
   */
  async saveStore(): Promise<AuthResult> {
    try {
      const store = await this.getStore();
      await store.save();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'STORE_SAVE_FAILED',
          message: `Failed to save store: ${error}`,
        },
      };
    }
  }
}

// シングルトンインスタンス
export const authService = new AuthService();