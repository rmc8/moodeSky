import type { Account } from '$lib/types/auth.js';
import { authService } from '$lib/services/authStore.js';
import { createComponentLogger } from '$lib/utils/logger.js';

// コンポーネント専用ログ
const log = createComponentLogger('AccountsStore');

/**
 * アカウント管理ストア (Svelte 5 runes)
 * ログイン・ログアウト・アカウント変更をリアクティブに管理
 */
class AccountsStore {
  /**
   * 全アカウント一覧
   */
  allAccounts = $state<Account[]>([]);

  /**
   * ローディング状態
   */
  isLoading = $state(false);

  /**
   * エラー状態
   */
  error = $state<string | null>(null);

  /**
   * 初期化状態
   */
  isInitialized = $state(false);

  /**
   * アカウント数（算出プロパティ）
   */
  get accountCount(): number {
    return this.allAccounts.length;
  }

  /**
   * アカウントが存在するか（算出プロパティ）
   */
  get hasAccounts(): boolean {
    return this.accountCount > 0;
  }

  /**
   * 最大アカウント数に達しているか
   */
  get isMaxAccountsReached(): boolean {
    return this.accountCount >= 100;
  }

  /**
   * アカウント一覧を読み込み
   */
  async loadAccounts(): Promise<void> {
    try {
      this.isLoading = true;
      this.error = null;

      const result = await authService.getAllAccounts();
      
      if (result.success) {
        this.allAccounts = result.data || [];
        log.info('アカウント一覧取得完了', {
          accountCount: this.allAccounts.length,
          accounts: this.allAccounts.map(acc => ({ handle: acc.profile.handle, did: acc.profile.did }))
        });
      } else {
        log.error('アカウント取得失敗', { error: result.error });
        this.error = 'アカウント情報の取得に失敗しました';
        this.allAccounts = [];
      }
    } catch (error) {
      log.error('アカウント取得エラー', { error });
      this.error = 'アカウント情報の取得に失敗しました';
      this.allAccounts = [];
    } finally {
      this.isLoading = false;
      this.isInitialized = true;
    }
  }

  /**
   * アカウントを追加（ログイン成功時）
   */
  async addAccount(account: Account): Promise<void> {
    try {
      // 既存アカウントの重複チェック (DID)
      const existingIndex = this.allAccounts.findIndex(
        (acc) => acc.profile.did === account.profile.did
      );

      if (existingIndex >= 0) {
        // 既存アカウントを更新
        this.allAccounts[existingIndex] = account;
        log.info('アカウント更新', {
          handle: account.profile.handle,
          did: account.profile.did,
          accountCount: this.allAccounts.length
        });
      } else {
        // 新規アカウントを追加
        this.allAccounts.push(account);
        log.info('アカウント追加', {
          handle: account.profile.handle,
          did: account.profile.did,
          accountCount: this.allAccounts.length
        });
      }
    } catch (error) {
      log.error('アカウント追加エラー', { error, handle: account.profile.handle });
      this.error = 'アカウントの追加に失敗しました';
    }
  }

  /**
   * アカウントを削除
   */
  async removeAccount(accountId: string): Promise<void> {
    try {
      log.info('アカウント削除開始', {
        accountId,
        currentAccountCount: this.allAccounts.length
      });
      this.isLoading = true;
      this.error = null;

      log.debug('authService.deleteAccount 呼び出し', { accountId });
      const result = await authService.deleteAccount(accountId);
      log.debug('authService.deleteAccount 結果', { result: result.success, error: result.error });
      
      if (result.success) {
        // 削除前のアカウント情報を取得
        const deletedAccount = this.allAccounts.find(acc => acc.id === accountId);
        log.debug('削除対象アカウント特定', {
          accountId,
          handle: deletedAccount?.profile.handle,
          did: deletedAccount?.profile.did
        });
        
        // ストアからアカウントを削除
        this.allAccounts = this.allAccounts.filter(
          (account) => account.id !== accountId
        );
        log.info('アカウント削除完了', {
          deletedHandle: deletedAccount?.profile.handle,
          remainingAccountCount: this.allAccounts.length
        });
      } else {
        log.error('アカウント削除失敗', { error: result.error, accountId });
        this.error = `アカウントの削除に失敗しました: ${result.error?.message || 'Unknown error'}`;
      }
    } catch (error) {
      log.error('アカウント削除エラー', { error, accountId });
      this.error = `アカウントの削除でエラーが発生しました: ${error}`;
    } finally {
      this.isLoading = false;
      log.debug('アカウント削除処理終了', { finalAccountCount: this.allAccounts.length });
    }
  }

  /**
   * 全アカウントをクリア
   */
  async clearAllAccounts(): Promise<void> {
    try {
      log.info('全アカウントクリア開始', { currentAccountCount: this.allAccounts.length });
      this.isLoading = true;
      this.error = null;

      log.debug('authService.clearAll() 呼び出し');
      const result = await authService.clearAll();
      log.debug('authService.clearAll() 完了', { success: result.success, error: result.error });
      
      if (result.success) {
        this.allAccounts = [];
        log.info('全アカウントクリア完了');
      } else {
        log.error('全アカウントクリア失敗', { error: result.error });
        this.error = `全アカウントのクリアに失敗しました: ${result.error?.message || 'Unknown error'}`;
      }
    } catch (error) {
      log.error('全アカウントクリアエラー', { error });
      this.error = `全アカウントのクリアでエラーが発生しました: ${error}`;
    } finally {
      this.isLoading = false;
      log.debug('全アカウントクリア処理終了', { finalAccountCount: this.allAccounts.length });
    }
  }

  /**
   * 現在のアクティブアカウント
   */
  activeAccount = $state<Account | null>(null);

  /**
   * アクティブアカウントを設定
   */
  async setActiveAccount(account: Account): Promise<void> {
    try {
      // 直接アクティブアカウントを設定（authServiceには設定メソッドが存在しないため）
      this.activeAccount = account;
      log.info('アクティブアカウント設定完了', {
        handle: account.profile.handle,
        did: account.profile.did
      });
      
      // 永続化（将来実装）
      // await this.saveActiveAccountPreference(account.id);
    } catch (error) {
      log.error('アクティブアカウント設定エラー', {
        error,
        handle: account.profile.handle
      });
      this.error = 'アクティブアカウントの設定に失敗しました';
    }
  }

  /**
   * アクティブアカウントIDでアカウントを取得
   */
  async loadActiveAccount(): Promise<void> {
    try {
      const result = await authService.getActiveAccount();
      
      if (result.success && result.data) {
        this.activeAccount = result.data;
        log.info('アクティブアカウント取得完了', {
          handle: result.data.profile.handle,
          did: result.data.profile.did
        });
      } else {
        log.warn('アクティブアカウントが見つかりません');
        this.activeAccount = null;
      }
    } catch (error) {
      log.error('アクティブアカウント取得エラー', { error });
      this.activeAccount = null;
    }
  }

  /**
   * エラーをクリア
   */
  clearError(): void {
    this.error = null;
  }

  /**
   * 強制リフレッシュ（手動でサーバーから再取得）
   */
  async refresh(): Promise<void> {
    await this.loadAccounts();
    await this.loadActiveAccount();
  }

  /**
   * 初期化（アプリ起動時）
   */
  async initialize(): Promise<void> {
    if (!this.isInitialized) {
      await this.loadAccounts();
      await this.loadActiveAccount();
    }
  }
}

// シングルトンインスタンス
export const accountsStore = new AccountsStore();