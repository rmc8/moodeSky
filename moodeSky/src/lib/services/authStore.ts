import { Store } from '@tauri-apps/plugin-store';
import type { AtpSessionData, AtpSessionEvent } from '@atproto/api';
import type {
  Account,
  AuthStore,
  AuthResult,
  AuthError,
  LegacyAuthData,
  SessionEventHandler,
  STORE_KEYS
} from '../types/auth.js';
import { profileService } from './profileService.js';

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
   * persistSession用のハンドラー
   * @atproto/api の自動セッション更新時に呼び出される
   */
  createPersistSessionHandler = (accountId?: string) => {
    return async (evt: AtpSessionEvent, sess?: AtpSessionData) => {
      try {
        console.log(`🔄 [AuthService] SessionEvent: ${evt}`, { accountId, session: sess });

        if (evt === 'update' && sess) {
          // 既存のアカウント情報を取得してrefreshJwtを比較
          let oldRefreshJwt: string | undefined;
          let oldRefreshJwtExpiration: Date | null = null;
          
          if (accountId) {
            const accountResult = await this.getAccountById(accountId);
            if (accountResult.success && accountResult.data) {
              oldRefreshJwt = accountResult.data.session?.refreshJwt;
              if (oldRefreshJwt) {
                const { getTokenExpiration, getTokenIssuedAt } = await import('../utils/jwt.js');
                oldRefreshJwtExpiration = getTokenExpiration(oldRefreshJwt);
                const oldIssuedAt = getTokenIssuedAt(oldRefreshJwt);
                console.log('📊 [AuthService] 旧RefreshJwt情報:', {
                  accountId,
                  handle: accountResult.data.profile.handle,
                  tokenLength: oldRefreshJwt.length,
                  issuedAt: oldIssuedAt?.toISOString(),
                  expiresAt: oldRefreshJwtExpiration?.toISOString(),
                  remainingDays: oldRefreshJwtExpiration ? Math.ceil((oldRefreshJwtExpiration.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 'N/A'
                });
              }
            }
          }

          // 新しいrefreshJwtの情報を分析
          if (sess.refreshJwt) {
            const { getTokenExpiration, getTokenIssuedAt } = await import('../utils/jwt.js');
            const newRefreshJwtExpiration = getTokenExpiration(sess.refreshJwt);
            const newIssuedAt = getTokenIssuedAt(sess.refreshJwt);
            
            console.log('🆕 [AuthService] 新RefreshJwt情報:', {
              accountId,
              handle: sess.handle,
              tokenLength: sess.refreshJwt.length,
              issuedAt: newIssuedAt?.toISOString(),
              expiresAt: newRefreshJwtExpiration?.toISOString(),
              remainingDays: newRefreshJwtExpiration ? Math.ceil((newRefreshJwtExpiration.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 'N/A'
            });

            // refreshJwtが実際に更新されたかチェック
            const isRefreshJwtUpdated = oldRefreshJwt !== sess.refreshJwt;
            const isExpirationUpdated = oldRefreshJwtExpiration?.getTime() !== newRefreshJwtExpiration?.getTime();
            
            console.log('🔄 [AuthService] RefreshJwt更新状況:', {
              accountId,
              isRefreshJwtUpdated,
              isExpirationUpdated,
              oldExpiration: oldRefreshJwtExpiration?.toISOString(),
              newExpiration: newRefreshJwtExpiration?.toISOString(),
              message: isRefreshJwtUpdated ? '✅ RefreshJwt が更新されました' : '⚠️ RefreshJwt は更新されませんでした（accessJwtのみ更新）'
            });
          }

          // セッション更新時の処理
          await this.updateAccountSession(accountId, sess);
        } else if (evt === 'create' && sess) {
          // セッション作成時の処理（通常のログイン時は別経路なので、ここは自動更新用）
          console.log('🆕 [AuthService] Session created via persistSession');
          
          if (sess.refreshJwt) {
            const { getTokenExpiration, getTokenIssuedAt } = await import('../utils/jwt.js');
            const refreshJwtExpiration = getTokenExpiration(sess.refreshJwt);
            const issuedAt = getTokenIssuedAt(sess.refreshJwt);
            
            console.log('🆕 [AuthService] 新規作成RefreshJwt情報:', {
              accountId,
              handle: sess.handle,
              tokenLength: sess.refreshJwt.length,
              issuedAt: issuedAt?.toISOString(),
              expiresAt: refreshJwtExpiration?.toISOString(),
              remainingDays: refreshJwtExpiration ? Math.ceil((refreshJwtExpiration.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 'N/A'
            });
          }
        } else if (evt === 'expired') {
          // セッション期限切れ時の処理
          console.warn('⚠️ [AuthService] Session expired:', accountId);
          if (accountId) {
            await this.markAccountSessionExpired(accountId);
          }
        }

        // 外部ハンドラーがあれば実行
        if (this.sessionEventHandler) {
          await this.sessionEventHandler(evt, sess);
        }
      } catch (error) {
        console.error('❌ [AuthService] persistSession handler error:', error);
      }
    };
  };

  /**
   * アカウントのセッション情報を更新
   */
  private async updateAccountSession(accountId: string | undefined, session: AtpSessionData): Promise<void> {
    try {
      if (!accountId) {
        // accountIdが指定されていない場合、セッションのDIDから検索
        const allAccountsResult = await this.getAllAccounts();
        if (!allAccountsResult.success || !allAccountsResult.data) {
          console.warn('⚠️ [AuthService] Failed to get accounts for session update');
          return;
        }

        const matchingAccount = allAccountsResult.data.find(
          account => account.profile.did === session.did
        );

        if (!matchingAccount) {
          console.warn('⚠️ [AuthService] No matching account found for session update:', session.did);
          return;
        }

        accountId = matchingAccount.id;
      }

      // アカウント情報を取得
      const accountResult = await this.getAccountById(accountId);
      if (!accountResult.success || !accountResult.data) {
        console.warn('⚠️ [AuthService] Account not found for session update:', accountId);
        return;
      }

      const account = accountResult.data;

      // セッション情報を更新
      const updatedAccount: Account = {
        ...account,
        session,
        lastAccessAt: new Date().toISOString(),
      };

      // ストアに保存
      const storeResult = await this.loadAuthStore();
      if (!storeResult.success || !storeResult.data) {
        console.error('❌ [AuthService] Failed to load store for session update');
        return;
      }

      const authStore = storeResult.data;
      const accountIndex = authStore.accounts.findIndex(acc => acc.id === accountId);
      
      if (accountIndex >= 0) {
        authStore.accounts[accountIndex] = updatedAccount;
        await this.saveAuthStore(authStore);
        console.log('✅ [AuthService] Session updated successfully for account:', account.profile.handle);
      }
    } catch (error) {
      console.error('❌ [AuthService] Failed to update account session:', error);
    }
  }

  /**
   * アカウントのセッションを期限切れとしてマーク
   */
  private async markAccountSessionExpired(accountId: string): Promise<void> {
    try {
      console.log('⚠️ [AuthService] Marking session as expired for account:', accountId);
      
      // 実装としては、セッションの有効性フラグを設定するか、
      // または期限切れを示すメタデータを追加することができます
      // 現在の実装では、セッション期限は JWT の exp から判定されるため、
      // 特別な処理は不要ですが、ログを出力して監視可能にします
      
      const accountResult = await this.getAccountById(accountId);
      if (accountResult.success && accountResult.data) {
        console.warn(`⚠️ [AuthService] Session expired for ${accountResult.data.profile.handle}`);
      }
    } catch (error) {
      console.error('❌ [AuthService] Failed to mark session as expired:', error);
    }
  }

  /**
   * アカウントのセッションが実際に有効かテスト
   * refreshToken を使用して実際にAPI呼び出しを試行
   */
  async validateAccountSession(accountId: string): Promise<AuthResult<boolean>> {
    try {
      const accountResult = await this.getAccountById(accountId);
      if (!accountResult.success || !accountResult.data) {
        return {
          success: false,
          error: {
            type: 'ACCOUNT_NOT_FOUND',
            message: 'Account not found for session validation'
          }
        };
      }

      const account = accountResult.data;
      const { BskyAgent } = await import('@atproto/api');

      // BskyAgentでセッション復元を試行
      const agent = new BskyAgent({ 
        service: account.service,
        persistSession: this.createPersistSessionHandler(account.id)
      });

      try {
        // resumeSessionを試行
        await agent.resumeSession(account.session);
        
        // 軽いAPI呼び出しでセッションの有効性を確認
        await agent.api.app.bsky.actor.getPreferences();
        
        console.log(`✅ [AuthService] Session validation successful for ${account.profile.handle}`);
        return { success: true, data: true };
      } catch (error: any) {
        console.warn(`⚠️ [AuthService] Session validation failed for ${account.profile.handle}:`, error);
        
        // セッション期限切れまたは無効
        if (error?.status === 401 || error?.error === 'ExpiredToken') {
          return { success: true, data: false };
        }
        
        // その他のエラー（ネットワークエラーなど）
        return {
          success: false,
          error: {
            type: 'NETWORK_ERROR',
            message: `Session validation error: ${error}`
          }
        };
      }
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'SESSION_EXPIRED',
          message: `Failed to validate session: ${error}`
        }
      };
    }
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
   * プロフィール統計情報も自動取得・保存
   */
  async saveAccount(
    service: string,
    session: AtpSessionData,
    profile: {
      did: string;
      handle: string;
      displayName?: string;
      avatar?: string;
      followersCount?: number;
      followingCount?: number;
      postsCount?: number;
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
      
      // 統計情報を自動取得（プロフィールに含まれていない場合）
      let enhancedProfile = { ...profile };
      if (!profile.followersCount && !profile.followingCount && !profile.postsCount) {
        console.log('📊 [AuthService] 統計情報が不足しています。自動取得を開始...');
        try {
          const statsResult = await profileService.getProfileStats(
            profile.did,
            session.accessJwt,
            service
          );
          
          if (statsResult.success && statsResult.data) {
            enhancedProfile = {
              ...profile,
              followersCount: statsResult.data.followersCount,
              followingCount: statsResult.data.followingCount,
              postsCount: statsResult.data.postsCount,
            };
            console.log('📊 [AuthService] 統計情報の自動取得に成功:', statsResult.data);
          } else {
            console.warn('📊 [AuthService] 統計情報の取得に失敗:', statsResult.error);
            // 統計情報の取得失敗はエラーとしない（基本プロフィールの保存は継続）
          }
        } catch (error) {
          console.warn('📊 [AuthService] 統計情報取得中にエラー:', error);
          // 統計情報の取得エラーは基本プロフィールの保存をブロックしない
        }
      }
      
      // 既存アカウントを検索（DIDで一意性を判定）
      const existingAccountIndex = authStore.accounts.findIndex(
        (account) => account.profile.did === enhancedProfile.did
      );

      const now = new Date().toISOString();
      let account: Account;

      if (existingAccountIndex >= 0) {
        // 既存アカウントを更新
        account = {
          ...authStore.accounts[existingAccountIndex],
          service,
          session,
          profile: enhancedProfile,
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
          profile: enhancedProfile,
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
      console.log('🔑 [AuthService] deleteAccount() 開始 - アカウントID:', accountId);
      
      console.log('🔑 [AuthService] ストア読み込み中...');
      const storeResult = await this.loadAuthStore();
      if (!storeResult.success) {
        console.error('🔑 [AuthService] ストア読み込み失敗:', storeResult.error);
        return {
          success: false,
          error: storeResult.error,
        };
      }

      const authStore = storeResult.data!;
      console.log(`🔑 [AuthService] 現在のアカウント数: ${authStore.accounts.length}`);
      
      const accountIndex = authStore.accounts.findIndex(
        (account) => account.id === accountId
      );
      console.log('🔑 [AuthService] 削除対象アカウントのインデックス:', accountIndex);

      if (accountIndex < 0) {
        console.warn('🔑 [AuthService] アカウントが見つかりません:', accountId);
        return {
          success: false,
          error: {
            type: 'ACCOUNT_NOT_FOUND',
            message: 'Account not found',
          },
        };
      }

      // 削除前のアカウント情報をログ出力
      const deletingAccount = authStore.accounts[accountIndex];
      console.log('🔑 [AuthService] 削除対象アカウント:', deletingAccount.profile.handle);

      // アカウントを削除
      authStore.accounts.splice(accountIndex, 1);
      console.log(`🔑 [AuthService] アカウント削除後の配列サイズ: ${authStore.accounts.length}`);

      console.log('🔑 [AuthService] ストア保存中...');
      const saveResult = await this.saveAuthStore(authStore);
      console.log('🔑 [AuthService] ストア保存結果:', saveResult);
      
      return saveResult;
    } catch (error) {
      console.error('🔑 [AuthService] deleteAccount() 例外:', error);
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
      console.log('🔑 [AuthService] clearAll() 開始 - 全認証データクリア処理');
      
      // 現在のストア状態を確認
      try {
        const currentStore = await this.loadAuthStore();
        console.log('🔑 [AuthService] 現在のストア状態:', {
          success: currentStore.success,
          accountCount: currentStore.success ? currentStore.data?.accounts?.length || 0 : 'N/A',
          error: currentStore.error
        });
      } catch (checkError) {
        console.warn('🔑 [AuthService] ストア状態確認時エラー:', checkError);
      }

      // セッションイベントを発火 (削除時はイベントのみ)
      // Note: AtpSessionEventの具体的な値は@atproto/apiのドキュメントを要確認
      // ここでは一旦コメントアウト
      // if (this.sessionEventHandler) {
      //   await this.sessionEventHandler('delete', undefined);
      // }

      console.log('🔑 [AuthService] deleteFromStore("auth_store") 実行中...');
      const result = await this.deleteFromStore('auth_store');
      console.log('🔑 [AuthService] deleteFromStore 結果:', result);
      
      return result;
    } catch (error) {
      console.error('🔑 [AuthService] clearAll() 例外:', error);
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
   * 強制的にrefreshJwt更新をテスト
   * デバッグ用：実際にrefreshJwtが更新されるかを検証
   */
  async testRefreshJwtUpdate(accountId: string): Promise<AuthResult<{ 
    beforeRefreshJwt: string; 
    afterRefreshJwt: string; 
    isUpdated: boolean; 
    beforeExpiration: Date | null;
    afterExpiration: Date | null;
  }>> {
    try {
      const accountResult = await this.getAccountById(accountId);
      if (!accountResult.success || !accountResult.data) {
        return {
          success: false,
          error: {
            type: 'ACCOUNT_NOT_FOUND',
            message: 'Account not found for refresh test'
          }
        };
      }

      const account = accountResult.data;
      const { BskyAgent } = await import('@atproto/api');
      const { getTokenExpiration } = await import('../utils/jwt.js');

      // 更新前のrefreshJwt情報を記録
      const beforeRefreshJwt = account.session.refreshJwt;
      const beforeExpiration = getTokenExpiration(beforeRefreshJwt);

      console.log('🧪 [AuthService] RefreshJwt更新テスト開始:', {
        accountId,
        handle: account.profile.handle,
        beforeTokenLength: beforeRefreshJwt.length,
        beforeExpiration: beforeExpiration?.toISOString()
      });

      // BskyAgentでセッション復元を試行
      const agent = new BskyAgent({ 
        service: account.service,
        persistSession: this.createPersistSessionHandler(account.id)
      });

      await agent.resumeSession(account.session);

      // 軽いAPI呼び出しでセッション更新をトリガー
      await agent.api.app.bsky.actor.getPreferences();

      // 更新後の状態を確認
      const updatedAccountResult = await this.getAccountById(accountId);
      if (!updatedAccountResult.success || !updatedAccountResult.data) {
        return {
          success: false,
          error: {
            type: 'ACCOUNT_NOT_FOUND',
            message: 'Failed to get updated account'
          }
        };
      }

      const afterRefreshJwt = updatedAccountResult.data.session.refreshJwt;
      const afterExpiration = getTokenExpiration(afterRefreshJwt);
      const isUpdated = beforeRefreshJwt !== afterRefreshJwt;

      console.log('🧪 [AuthService] RefreshJwt更新テスト結果:', {
        accountId,
        handle: account.profile.handle,
        beforeTokenLength: beforeRefreshJwt.length,
        afterTokenLength: afterRefreshJwt.length,
        isUpdated,
        beforeExpiration: beforeExpiration?.toISOString(),
        afterExpiration: afterExpiration?.toISOString(),
        conclusion: isUpdated ? '✅ RefreshJwtが更新されました' : '⚠️ RefreshJwtは更新されませんでした'
      });

      return {
        success: true,
        data: {
          beforeRefreshJwt,
          afterRefreshJwt,
          isUpdated,
          beforeExpiration,
          afterExpiration
        }
      };
    } catch (error) {
      console.error('❌ [AuthService] RefreshJwt更新テストエラー:', error);
      return {
        success: false,
        error: {
          type: 'SESSION_EXPIRED',
          message: `Failed to test refresh JWT update: ${error}`
        }
      };
    }
  }

  /**
   * セッション復元・更新
   * 既存セッションを検証し、統計情報も更新
   */
  async refreshSession(accountId?: string): Promise<AuthResult<Account | Account[]>> {
    try {
      // 特定のアカウントまたは全アカウントを対象とする
      const accountsResult = accountId 
        ? await this.getAccountById(accountId)
        : await this.getAllAccounts();
      
      if (!accountsResult.success) {
        return {
          success: false,
          error: accountsResult.error,
        } as AuthResult<Account | Account[]>;
      }

      const accounts = Array.isArray(accountsResult.data) 
        ? accountsResult.data 
        : accountsResult.data ? [accountsResult.data] : [];

      if (accounts.length === 0) {
        return {
          success: true,
          data: accountId ? null : [],
        } as AuthResult<Account | Account[]>;
      }

      const { BskyAgent } = await import('@atproto/api');
      const refreshedAccounts: Account[] = [];

      for (const account of accounts) {
        try {
          console.log(`🔄 [AuthService] セッション復元中: ${account.profile.handle}`);
          
          // BskyAgentでセッション復元（persistSession対応）
          const agent = new BskyAgent({ 
            service: account.service,
            persistSession: this.createPersistSessionHandler(account.id)
          });
          
          // resumeSessionを使用してセッション復元
          await agent.resumeSession(account.session);
          
          // プロフィール情報と統計情報を最新取得
          const profileResult = await agent.getProfile({
            actor: account.profile.did,
          });

          let updatedProfile = account.profile;
          if (profileResult.success) {
            updatedProfile = {
              ...account.profile,
              displayName: profileResult.data.displayName || account.profile.displayName,
              avatar: profileResult.data.avatar || account.profile.avatar,
              followersCount: profileResult.data.followersCount,
              followingCount: profileResult.data.followsCount,
              postsCount: profileResult.data.postsCount,
            };
            console.log(`📊 [AuthService] 統計情報更新: ${account.profile.handle}`, {
              followers: profileResult.data.followersCount,
              following: profileResult.data.followsCount,
              posts: profileResult.data.postsCount,
            });
          }

          // アカウント情報を更新保存（統計情報の自動取得はスキップ）
          const saveResult = await this.saveAccount(
            account.service,
            agent.session!,
            updatedProfile
          );

          if (saveResult.success && saveResult.data) {
            refreshedAccounts.push(saveResult.data);
          }
        } catch (error) {
          console.warn(`⚠️ [AuthService] セッション復元に失敗: ${account.profile.handle}`, error);
          // 個別アカウントの復元失敗は全体を停止しない
          refreshedAccounts.push(account);
        }
      }

      const result = accountId ? refreshedAccounts[0] || null : refreshedAccounts;
      return { success: true, data: result } as AuthResult<Account | Account[]>;
    } catch (error) {
      console.error('🔄 [AuthService] セッション復元処理中にエラー:', error);
      return {
        success: false,
        error: {
          type: 'SESSION_EXPIRED',
          message: `Failed to refresh session: ${error}`,
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

      // 新しいAgentを作成して認証（persistSession対応）
      const agent = new BskyAgent({
        service: existingAccount.service,
        persistSession: this.createPersistSessionHandler(accountId)
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
          // プロフィール取得時に統計情報も含める
          followersCount: profileResult.data.followersCount,
          followingCount: profileResult.data.followsCount,
          postsCount: profileResult.data.postsCount,
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

// シングルトンインスタンス（persistSession対応）
export const authService = new AuthService();