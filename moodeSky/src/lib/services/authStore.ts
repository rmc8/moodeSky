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
import { createComponentLogger } from '../utils/logger.js';

// コンポーネント専用ログ
const log = createComponentLogger('AuthService');

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

  // 競合制御用のロックマップ
  private sessionUpdateLocks = new Map<string, Promise<void>>();

  /**
   * persistSession用のハンドラー (Issue #89で大幅改善)
   * AT Protocol の自動セッション更新時に呼び出される
   * refreshToken rotation の確実な処理と原子性を保証
   */
  createPersistSessionHandler = (accountId?: string) => {
    return async (evt: AtpSessionEvent, sess?: AtpSessionData) => {
      // 入力検証
      if (!accountId) {
        log.warn('persistSessionHandler called without accountId', { event: evt });
        return;
      }

      try {
        log.info('SessionEvent received', { 
          event: evt, 
          accountId, 
          hasSession: !!sess,
          handle: sess?.handle 
        });

        switch (evt) {
          case 'update':
            if (sess) {
              await this.handleSessionUpdate(accountId, sess);
            }
            break;
            
          case 'create':
            if (sess) {
              await this.handleSessionCreate(accountId, sess);
            }
            break;
            
          case 'expired':
            await this.handleSessionExpired(accountId);
            break;
            
          default:
            log.debug('Unhandled session event', { event: evt, accountId });
        }

        // 外部ハンドラーがあれば実行
        if (this.sessionEventHandler) {
          await this.sessionEventHandler(evt, sess);
        }
      } catch (error) {
        log.error('persistSession handler critical error', { 
          error, 
          event: evt, 
          accountId,
          handle: sess?.handle 
        });
        
        // 重要: エラーを再スローしてBskyAgentに失敗を通知
        throw error;
      }
    };
  };

  /**
   * セッション更新処理 (refreshToken rotation対応)
   */
  private async handleSessionUpdate(accountId: string, session: AtpSessionData): Promise<void> {
    // 競合制御: 同じアカウントの同時更新を防止
    const lockKey = `session_update_${accountId}`;
    
    // 既存の更新処理があれば待機（タイムアウト付き）
    const existingLock = this.sessionUpdateLocks.get(lockKey);
    if (existingLock) {
      log.debug('Waiting for existing session update', { accountId });
      try {
        // 最大30秒待機してからタイムアウト
        await Promise.race([
          existingLock,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Session update lock timeout')), 30000)
          )
        ]);
      } catch (error) {
        log.warn('Previous session update timed out or failed', { accountId, error });
        // 既存ロックを強制削除
        this.sessionUpdateLocks.delete(lockKey);
      }
    }

    // 新しい更新処理を開始
    const updatePromise = this.performAtomicSessionUpdate(accountId, session);
    this.sessionUpdateLocks.set(lockKey, updatePromise);

    try {
      await updatePromise;
      log.info('Session update completed successfully', { 
        accountId, 
        handle: session.handle 
      });
    } catch (error) {
      log.error('Session update failed', { 
        accountId, 
        handle: session.handle, 
        error 
      });
      throw error;
    } finally {
      // ロックを解除
      this.sessionUpdateLocks.delete(lockKey);
    }
  }

  /**
   * 原子性のあるセッション更新処理
   */
  private async performAtomicSessionUpdate(accountId: string, newSession: AtpSessionData): Promise<void> {
    let backup: Account | null = null;
    
    try {
      // 1. セッションデータの検証
      await this.validateSessionData(newSession);
      
      // 2. 既存アカウント情報を取得（バックアップ用）
      const accountResult = await this.getAccountById(accountId);
      if (!accountResult.success || !accountResult.data) {
        throw new Error(`Account not found for session update: ${accountId}`);
      }
      
      backup = { ...accountResult.data };
      const oldSession = backup.session;
      
      // 3. refreshToken rotation の分析とログ
      await this.analyzeTokenRotation(accountId, oldSession, newSession);
      
      // 4. 原子的なセッション更新
      await this.atomicUpdateAccountSession(accountId, newSession);
      
      // 5. SessionManager・JWT Token Manager への通知
      await this.notifySessionUpdate(accountId, newSession);
      
      // 6. 整合性チェック
      await this.verifySessionIntegrity(accountId, newSession);
      
      log.info('Atomic session update successful', {
        accountId,
        handle: newSession.handle,
        accessTokenUpdated: oldSession?.accessJwt !== newSession.accessJwt,
        refreshTokenUpdated: oldSession?.refreshJwt !== newSession.refreshJwt
      });
      
    } catch (error) {
      log.error('Atomic session update failed', { 
        error, 
        accountId, 
        handle: newSession.handle 
      });
      
      // ロールバック処理
      if (backup) {
        try {
          await this.rollbackSession(accountId, backup);
          log.info('Session rollback completed', { accountId });
        } catch (rollbackError) {
          log.error('Session rollback failed', { 
            rollbackError, 
            originalError: error, 
            accountId 
          });
          
          // ロールバックも失敗した場合、セッション状態の不整合を防ぐため
          // アカウントを無効化マークして再認証を促す
          try {
            await this.markAccountForReAuthentication(accountId);
          } catch (markError) {
            log.error('Failed to mark account for re-authentication', { 
              markError, 
              accountId 
            });
          }
        }
      }
      
      throw error;
    }
  }

  /**
   * セッションデータの検証
   */
  private async validateSessionData(session: AtpSessionData): Promise<void> {
    // 必須フィールドの検証
    if (!session.did || !session.handle) {
      throw new Error('Invalid session data: missing did or handle');
    }
    
    if (!session.accessJwt || !session.refreshJwt) {
      throw new Error('Invalid session data: missing access or refresh JWT');
    }

    // refreshJwt空文字チェック（localStorage移行の不正データを検出）
    if (session.refreshJwt.trim() === '') {
      throw new Error('Invalid session data: refreshJwt is empty (likely from incomplete localStorage migration)');
    }
    
    // JWT形式の基本検証
    const { decodeJWT } = await import('../utils/jwt.js');
    
    const accessPayload = decodeJWT(session.accessJwt);
    const refreshPayload = decodeJWT(session.refreshJwt);
    
    if (!accessPayload || !refreshPayload) {
      throw new Error('Invalid session data: malformed JWT tokens');
    }
    
    // 期限検証
    const now = Date.now() / 1000;
    if (accessPayload.exp && accessPayload.exp < now) {
      log.warn('Access token already expired in new session', {
        exp: accessPayload.exp,
        now,
        diff: now - accessPayload.exp
      });
    }

    // refreshJwtの期限検証
    if (refreshPayload.exp && refreshPayload.exp < now) {
      throw new Error('Invalid session data: refresh token is already expired');
    }
  }

  /**
   * refreshToken rotation の分析
   */
  private async analyzeTokenRotation(
    accountId: string, 
    oldSession: AtpSessionData | undefined, 
    newSession: AtpSessionData
  ): Promise<void> {
    if (!oldSession) {
      log.info('No previous session for comparison', { accountId });
      return;
    }
    
    try {
      const { getTokenExpiration, getTokenIssuedAt } = await import('../utils/jwt.js');
      
      // 旧トークン情報
      const oldAccessExp = oldSession.accessJwt ? getTokenExpiration(oldSession.accessJwt) : null;
      const oldRefreshExp = oldSession.refreshJwt ? getTokenExpiration(oldSession.refreshJwt) : null;
      
      // 新トークン情報  
      const newAccessExp = getTokenExpiration(newSession.accessJwt);
      const newRefreshExp = getTokenExpiration(newSession.refreshJwt);
      
      // 更新状況の分析
      const accessTokenUpdated = oldSession.accessJwt !== newSession.accessJwt;
      const refreshTokenUpdated = oldSession.refreshJwt !== newSession.refreshJwt;
      
      log.info('Token rotation analysis', {
        accountId,
        handle: newSession.handle,
        accessTokenUpdated,
        refreshTokenUpdated,
        oldAccessExp: oldAccessExp?.toISOString(),
        newAccessExp: newAccessExp?.toISOString(),
        oldRefreshExp: oldRefreshExp?.toISOString(),
        newRefreshExp: newRefreshExp?.toISOString(),
        rotationType: refreshTokenUpdated ? 'FULL_ROTATION' : 'ACCESS_ONLY'
      });
      
      // refreshToken が更新されていない場合の警告
      if (accessTokenUpdated && !refreshTokenUpdated) {
        log.warn('AccessToken updated but RefreshToken unchanged - potential rotation issue', {
          accountId,
          handle: newSession.handle
        });
      }
      
    } catch (error) {
      log.warn('Token rotation analysis failed', { error, accountId });
    }
  }

  /**
   * 原子的なアカウントセッション更新
   */
  private async atomicUpdateAccountSession(accountId: string, session: AtpSessionData): Promise<void> {
    const store = await this.getStore();
    const authStoreResult = await this.loadFromStore<AuthStore>('auth');
    
    if (!authStoreResult.success || !authStoreResult.data) {
      throw new Error('Failed to load auth store for session update');
    }
    
    const authStore = authStoreResult.data;
    const accountIndex = authStore.accounts.findIndex(acc => acc.id === accountId);
    
    if (accountIndex < 0) {
      throw new Error(`Account not found in store: ${accountId}`);
    }
    
    // アカウント情報を更新
    const updatedAccount: Account = {
      ...authStore.accounts[accountIndex],
      session,
      lastAccessAt: new Date().toISOString(),
    };
    
    // 原子的更新
    authStore.accounts[accountIndex] = updatedAccount;
    
    // ストアに保存
    const saveResult = await this.saveToStore('auth', authStore);
    if (!saveResult.success) {
      throw new Error(`Failed to save updated session: ${saveResult.error?.message}`);
    }
  }

  /**
   * SessionManager・JWT Token Manager への通知
   */
  private async notifySessionUpdate(accountId: string, session: AtpSessionData): Promise<void> {
    try {
      // SessionManager への通知（動的インポートで循環依存回避）
      const { sessionManager } = await import('./sessionManager.js');
      
      // SessionManager が初期化されている場合のみ通知
      if (sessionManager && typeof sessionManager.updateSessionAfterRefresh === 'function') {
        // セッション更新後の処理を実行
        const accountResult = await this.getAccountById(accountId);
        if (accountResult.success && accountResult.data) {
          await sessionManager.updateSessionAfterRefresh(accountResult.data);
        }
      }
      
      log.debug('SessionManager notified of session update', { accountId });
    } catch (error) {
      // SessionManager への通知失敗は致命的でないためログのみ
      log.warn('Failed to notify SessionManager of session update', { 
        error, 
        accountId 
      });
    }
  }

  /**
   * セッション整合性の検証
   */
  private async verifySessionIntegrity(accountId: string, expectedSession: AtpSessionData): Promise<void> {
    const verificationResult = await this.getAccountById(accountId);
    
    if (!verificationResult.success || !verificationResult.data) {
      throw new Error('Session integrity check failed: account not found');
    }
    
    const actualSession = verificationResult.data.session;
    
    // セッション内容の比較
    if (actualSession?.accessJwt !== expectedSession.accessJwt) {
      throw new Error('Session integrity check failed: accessJwt mismatch');
    }
    
    if (actualSession?.refreshJwt !== expectedSession.refreshJwt) {
      throw new Error('Session integrity check failed: refreshJwt mismatch');
    }
    
    log.debug('Session integrity verified', { accountId });
  }

  /**
   * セッションのロールバック
   */
  private async rollbackSession(accountId: string, backupAccount: Account): Promise<void> {
    try {
      const store = await this.getStore();
      const authStoreResult = await this.loadFromStore<AuthStore>('auth');
      
      if (!authStoreResult.success || !authStoreResult.data) {
        throw new Error('Failed to load auth store for rollback');
      }
      
      const authStore = authStoreResult.data;
      const accountIndex = authStore.accounts.findIndex(acc => acc.id === accountId);
      
      if (accountIndex >= 0) {
        authStore.accounts[accountIndex] = backupAccount;
        await this.saveToStore('auth', authStore);
        
        log.info('Session rollback successful', { accountId });
      }
    } catch (error) {
      log.error('Session rollback failed', { error, accountId });
      throw error;
    }
  }

  /**
   * セッション作成処理
   */
  private async handleSessionCreate(accountId: string, session: AtpSessionData): Promise<void> {
    log.info('Session create event', { 
      accountId, 
      handle: session.handle 
    });
    
    // 作成イベントは通常のログイン時は別経路のため、
    // ここは自動更新での新規セッション作成として処理
    await this.handleSessionUpdate(accountId, session);
  }

  /**
   * セッション期限切れ処理
   */
  private async handleSessionExpired(accountId: string): Promise<void> {
    try {
      log.warn('Session expired event', { accountId });
      await this.markAccountSessionExpired(accountId);
      
      // SessionManager への通知
      try {
        const { sessionManager } = await import('./sessionManager.js');
        if (sessionManager && typeof sessionManager.notifySessionExpired === 'function') {
          await sessionManager.notifySessionExpired(accountId);
        }
      } catch (error) {
        log.warn('Failed to notify SessionManager of session expiration', { 
          error, 
          accountId 
        });
      }
    } catch (error) {
      log.error('Failed to handle session expiration', { error, accountId });
    }
  }


  /**
   * アカウントのセッションを期限切れとしてマーク
   */
  private async markAccountSessionExpired(accountId: string): Promise<void> {
    try {
      log.warn('Marking session as expired for account', { accountId });
      
      // 実装としては、セッションの有効性フラグを設定するか、
      // または期限切れを示すメタデータを追加することができます
      // 現在の実装では、セッション期限は JWT の exp から判定されるため、
      // 特別な処理は不要ですが、ログを出力して監視可能にします
      
      const accountResult = await this.getAccountById(accountId);
      if (accountResult.success && accountResult.data) {
        log.warn('Session expired for account', { handle: accountResult.data.profile.handle });
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
      log.info('deleteAccount 開始', { accountId });
      
      log.debug('ストア読み込み中');
      const storeResult = await this.loadAuthStore();
      if (!storeResult.success) {
        log.error('ストア読み込み失敗', { error: storeResult.error });
        return {
          success: false,
          error: storeResult.error,
        };
      }

      const authStore = storeResult.data!;
      log.debug('現在のアカウント数', { count: authStore.accounts.length });
      
      const accountIndex = authStore.accounts.findIndex(
        (account) => account.id === accountId
      );
      log.debug('削除対象アカウントのインデックス', { accountIndex });

      if (accountIndex < 0) {
        log.warn('アカウントが見つかりません', { accountId });
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
      log.debug('削除対象アカウント', { handle: deletingAccount.profile.handle });

      // アカウントを削除
      authStore.accounts.splice(accountIndex, 1);
      log.debug('アカウント削除後の配列サイズ', { size: authStore.accounts.length });

      log.debug('ストア保存中');
      const saveResult = await this.saveAuthStore(authStore);
      log.debug('ストア保存結果', { result: saveResult });
      
      return saveResult;
    } catch (error) {
      log.error('deleteAccount() 例外', { error });
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
      log.info('clearAll() 開始 - 全認証データクリア処理');
      
      // 現在のストア状態を確認
      try {
        const currentStore = await this.loadAuthStore();
        log.debug('現在のストア状態', {
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

      // refreshJwtが不足しているレガシーデータは移行不可
      // 再ログインが必要であることをユーザーに通知
      console.warn('Legacy data lacks refreshJwt - migration requires re-authentication');
      
      // 移行完了フラグを設定（再認証が必要）
      await this.saveToStore('migration_status', {
        completed: true,
        completedAt: new Date().toISOString(),
        reason: 're_authentication_required',
        migratedAccount: {
          did: legacyData.authDid,
          handle: legacyData.authHandle
        }
      });

      // localStorageをクリア（不完全なセッションデータを削除）
      localStorage.removeItem('authDid');
      localStorage.removeItem('authHandle');
      localStorage.removeItem('authAccessJwt');
      localStorage.removeItem('authDisplayName');
      localStorage.removeItem('authAvatar');

      // 再認証が必要であることを示すエラーを返す
      return {
        success: false,
        error: {
          type: 'RE_AUTHENTICATION_REQUIRED',
          message: 'Legacy session data is incomplete. Please log in again to restore access.'
        }
      };
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
   * 不正なセッション（refreshJwt空文字）を検出
   * 既存のlocalStorage移行アカウントの修復用
   */
  async detectInvalidSessions(): Promise<AuthResult<Array<{
    accountId: string;
    handle: string;
    did: string;
    hasInvalidRefreshJwt: boolean;
    needsReAuthentication: boolean;
  }>>> {
    try {
      const accountsResult = await this.getAllAccounts();
      if (!accountsResult.success) {
        return {
          success: false,
          error: accountsResult.error
        } as AuthResult<Array<{
          accountId: string;
          handle: string;
          did: string;
          hasInvalidRefreshJwt: boolean;
          needsReAuthentication: boolean;
        }>>;
      }

      const accounts = accountsResult.data || [];
      const invalidSessions = accounts.map(account => {
        const hasInvalidRefreshJwt = !account.session?.refreshJwt || 
                                     account.session.refreshJwt.trim() === '';
        
        return {
          accountId: account.id,
          handle: account.profile.handle,
          did: account.profile.did,
          hasInvalidRefreshJwt,
          needsReAuthentication: hasInvalidRefreshJwt
        };
      });

      const invalidCount = invalidSessions.filter(s => s.hasInvalidRefreshJwt).length;
      
      if (invalidCount > 0) {
        log.warn('Invalid sessions detected', {
          totalAccounts: accounts.length,
          invalidSessions: invalidCount,
          invalidHandles: invalidSessions
            .filter(s => s.hasInvalidRefreshJwt)
            .map(s => s.handle)
        });
      }

      return {
        success: true,
        data: invalidSessions
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'STORE_LOAD_FAILED',
          message: `Failed to detect invalid sessions: ${error}`
        }
      };
    }
  }

  /**
   * 不正なセッションを持つアカウントを修復（削除）
   * ユーザーに再ログインを促すため
   */
  async repairInvalidSessions(): Promise<AuthResult<{
    repairedAccounts: number;
    removedAccountHandles: string[];
  }>> {
    try {
      const detectionResult = await this.detectInvalidSessions();
      if (!detectionResult.success) {
        return {
          success: false,
          error: detectionResult.error
        } as AuthResult<{
          repairedAccounts: number;
          removedAccountHandles: string[];
        }>;
      }

      const invalidAccounts = detectionResult.data!.filter(s => s.needsReAuthentication);
      const removedHandles: string[] = [];

      for (const account of invalidAccounts) {
        try {
          const deleteResult = await this.deleteAccount(account.accountId);
          if (deleteResult.success) {
            removedHandles.push(account.handle);
            log.info('Removed invalid session account', {
              handle: account.handle,
              did: account.did
            });
          } else {
            log.error('Failed to remove invalid session account', {
              handle: account.handle,
              error: deleteResult.error
            });
          }
        } catch (error) {
          log.error('Error removing invalid session account', {
            handle: account.handle,
            error
          });
        }
      }

      return {
        success: true,
        data: {
          repairedAccounts: removedHandles.length,
          removedAccountHandles: removedHandles
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'STORE_SAVE_FAILED',
          message: `Failed to repair invalid sessions: ${error}`
        }
      };
    }
  }

  /**
   * アカウントを再認証要求状態にマーク
   * セッション更新の致命的エラー時に使用
   */
  private async markAccountForReAuthentication(accountId: string): Promise<void> {
    try {
      const store = await this.getStore();
      const authStoreResult = await this.loadFromStore<AuthStore>('auth');
      
      if (!authStoreResult.success || !authStoreResult.data) {
        throw new Error('Failed to load auth store for marking re-authentication');
      }
      
      const authStore = authStoreResult.data;
      const accountIndex = authStore.accounts.findIndex(acc => acc.id === accountId);
      
      if (accountIndex >= 0) {
        // セッション情報をクリアして再認証を促す
        const account = authStore.accounts[accountIndex];
        account.session = {
          ...account.session,
          accessJwt: '',
          refreshJwt: '',
          active: false
        };
        
        authStore.accounts[accountIndex] = account;
        
        const saveResult = await this.saveToStore('auth', authStore);
        if (saveResult.success) {
          log.info('Account marked for re-authentication', { accountId });
        } else {
          throw new Error('Failed to save account re-authentication mark');
        }
      }
    } catch (error) {
      log.error('Failed to mark account for re-authentication', { error, accountId });
      throw error;
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