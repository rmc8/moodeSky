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
   * アカウントを追加・更新（最大100アカウント制限）
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
        // 最大アカウント数チェック（100アカウント制限）
        if (authStore.accounts.length >= 100) {
          return {
            success: false,
            error: {
              type: 'STORE_SAVE_FAILED',
              message: 'Maximum number of accounts (100) reached',
            },
          };
        }

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
   * 指定IDのアカウントを取得
   */
  async getAccountById(accountId: string): Promise<AuthResult<Account | null>> {
    const storeResult = await this.loadAuthStore();
    if (!storeResult.success) {
      return {
        success: false,
        error: storeResult.error,
      } as AuthResult<Account | null>;
    }

    const authStore = storeResult.data!;
    const account = authStore.accounts.find(
      (acc) => acc.id === accountId
    );

    return { success: true, data: account || null };
  }

  /**
   * 最初のアカウントを取得（後方互換性用）
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
    const firstAccount = authStore.accounts.length > 0 ? authStore.accounts[0] : null;

    return { success: true, data: firstAccount };
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
   * localStorage からのデータ移行（最適化版）
   * 移行回数制限・完了フラグ管理・データ検証機能付き
   */
  async migrateFromLocalStorage(): Promise<AuthResult<Account | null>> {
    try {
      // 移行完了フラグをチェック
      const migrationStatusResult = await this.loadFromStore<{ completed: boolean; completedAt: string }>('migration_status');
      
      if (migrationStatusResult.success && migrationStatusResult.data?.completed) {
        // 既に移行完了済み
        return { success: true, data: null };
      }

      // 移行試行回数をチェック
      const migrationAttemptsResult = await this.loadFromStore<{ count: number; lastAttempt: string }>('migration_attempts');
      const currentAttempts = migrationAttemptsResult.data?.count || 0;
      const MAX_MIGRATION_ATTEMPTS = 3;

      if (currentAttempts >= MAX_MIGRATION_ATTEMPTS) {
        console.warn(`Migration attempts exceeded maximum (${MAX_MIGRATION_ATTEMPTS}). Skipping migration.`);
        return { success: true, data: null };
      }

      // 移行試行回数を記録
      await this.saveToStore('migration_attempts', {
        count: currentAttempts + 1,
        lastAttempt: new Date().toISOString()
      });

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
        // データが存在しない場合も移行完了とマークして重複処理を防ぐ
        await this.saveToStore('migration_status', {
          completed: true,
          completedAt: new Date().toISOString(),
          reason: 'no_legacy_data'
        });
        return { success: true, data: null };
      }

      // レガシーデータの検証
      const validationResult = this.validateLegacyData(legacyData);
      if (!validationResult.isValid) {
        console.warn('Legacy data validation failed:', validationResult.errors);
        
        // 検証失敗でも移行完了とマークして無限ループを防ぐ
        await this.saveToStore('migration_status', {
          completed: true,
          completedAt: new Date().toISOString(),
          reason: 'validation_failed',
          errors: validationResult.errors
        });
        
        return {
          success: false,
          error: {
            type: 'MIGRATION_FAILED',
            message: `Legacy data validation failed: ${validationResult.errors.join(', ')}`
          }
        };
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

        // 移行完了フラグを設定
        await this.saveToStore('migration_status', {
          completed: true,
          completedAt: new Date().toISOString(),
          reason: 'success',
          migratedAccount: {
            did: legacyData.authDid,
            handle: legacyData.authHandle
          }
        });

        console.log('localStorage migration completed successfully:', {
          did: legacyData.authDid,
          handle: legacyData.authHandle
        });
      }

      return saveResult;
    } catch (error) {
      console.error('Migration error:', error);
      
      // エラー時も移行完了フラグを設定して無限ループを防ぐ
      try {
        await this.saveToStore('migration_status', {
          completed: true,
          completedAt: new Date().toISOString(),
          reason: 'error',
          error: String(error)
        });
      } catch (flagError) {
        console.error('Failed to set migration completion flag:', flagError);
      }

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
   * レガシーデータの検証
   */
  private validateLegacyData(data: LegacyAuthData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // DID検証
    if (data.authDid && !data.authDid.startsWith('did:')) {
      errors.push('Invalid DID format');
    }

    // ハンドル検証
    if (data.authHandle && (!data.authHandle.includes('.') || data.authHandle.length < 3)) {
      errors.push('Invalid handle format');
    }

    // アクセストークン検証（基本的な長さチェック）
    if (data.authAccessJwt && data.authAccessJwt.length < 10) {
      errors.push('Invalid access token format');
    }

    // 文字列の安全性チェック（XSSやインジェクション対策）
    const dangerousPatterns = ['<script', 'javascript:', 'data:text/html'];
    const allValues = Object.values(data).filter(v => v) as string[];
    
    for (const value of allValues) {
      for (const pattern of dangerousPatterns) {
        if (value.toLowerCase().includes(pattern)) {
          errors.push('Potentially malicious content detected');
          break;
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 移行状態を確認
   */
  async getMigrationStatus(): Promise<AuthResult<{
    completed: boolean;
    completedAt?: string;
    reason?: string;
    attempts?: number;
    lastAttempt?: string;
    migratedAccount?: { did: string; handle: string };
    errors?: string[];
  }>> {
    try {
      const statusResult = await this.loadFromStore<any>('migration_status');
      const attemptsResult = await this.loadFromStore<any>('migration_attempts');

      return {
        success: true,
        data: {
          completed: statusResult.data?.completed || false,
          completedAt: statusResult.data?.completedAt,
          reason: statusResult.data?.reason,
          attempts: attemptsResult.data?.count || 0,
          lastAttempt: attemptsResult.data?.lastAttempt,
          migratedAccount: statusResult.data?.migratedAccount,
          errors: statusResult.data?.errors
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'STORE_LOAD_FAILED',
          message: `Failed to get migration status: ${error}`,
        },
      };
    }
  }

  /**
   * 移行状態をリセット（開発・テスト用）
   */
  async resetMigrationStatus(): Promise<AuthResult> {
    try {
      await this.deleteFromStore('migration_status');
      await this.deleteFromStore('migration_attempts');
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'STORE_SAVE_FAILED',
          message: `Failed to reset migration status: ${error}`,
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

  /**
   * アカウント再認証
   * 既存のhandleを使用してパスワードのみで認証を更新
   */
  async reauthenticateAccount(accountId: string, password: string): Promise<AuthResult<Account>> {
    try {
      // 既存アカウントを取得
      const accountResult = await this.getAccountById(accountId);
      if (!accountResult.success || !accountResult.data) {
        return {
          success: false,
          error: {
            type: 'ACCOUNT_NOT_FOUND',
            message: 'Account not found for reauthentication',
          },
        };
      }

      const existingAccount = accountResult.data;
      const { BskyAgent } = await import('@atproto/api');

      // 新しいAgentを作成して認証
      const agent = new BskyAgent({
        service: existingAccount.service,
      });

      // ハンドルとパスワードで認証
      await agent.login({
        identifier: existingAccount.profile.handle,
        password: password,
      });

      // セッションデータを取得
      const session = agent.session;
      if (!session) {
        return {
          success: false,
          error: {
            type: 'AUTH_FAILED',
            message: 'Failed to create new session',
          },
        };
      }

      // プロフィール情報を更新取得
      const profileResult = await agent.getProfile({
        actor: existingAccount.profile.handle,
      });

      let updatedProfile = existingAccount.profile;
      if (profileResult.success) {
        updatedProfile = {
          did: session.did,
          handle: session.handle,
          displayName: profileResult.data.displayName || undefined,
          avatar: profileResult.data.avatar || undefined,
        };
      }

      // 新しいセッションで既存アカウントを更新
      const saveResult = await this.saveAccount(
        existingAccount.service,
        session,
        updatedProfile
      );

      if (!saveResult.success) {
        return {
          success: false,
          error: saveResult.error,
        } as AuthResult<Account>;
      }

      return { success: true, data: saveResult.data };
    } catch (error: any) {
      // @atproto/api のエラーを詳細に解析
      let errorType: AuthError = 'AUTH_FAILED';
      let errorMessage = 'Reauthentication failed';

      if (error?.error) {
        switch (error.error) {
          case 'AuthRequiredError':
            errorType = 'AUTH_FAILED';
            errorMessage = 'Invalid credentials provided';
            break;
          case 'NetworkError':
            errorType = 'NETWORK_ERROR';
            errorMessage = 'Network connection failed';
            break;
          case 'RateLimitError':
            errorType = 'RATE_LIMITED';
            errorMessage = 'Too many authentication attempts';
            break;
          default:
            errorMessage = error.message || 'Reauthentication failed';
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: {
          type: errorType,
          message: errorMessage,
        },
      };
    }
  }
}

// シングルトンインスタンス
export const authService = new AuthService();