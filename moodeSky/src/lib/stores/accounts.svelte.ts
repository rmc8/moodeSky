import type { Account } from '$lib/types/auth.js';
import { authService } from '$lib/services/authStore.js';

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
        console.log(`🏪 [AccountsStore] ${this.allAccounts.length}個のアカウントを取得:`, this.allAccounts);
      } else {
        console.error('🏪 [AccountsStore] アカウント取得失敗:', result.error);
        this.error = 'アカウント情報の取得に失敗しました';
        this.allAccounts = [];
      }
    } catch (error) {
      console.error('🏪 [AccountsStore] アカウント取得エラー:', error);
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
        console.log('🏪 [AccountsStore] アカウント更新:', account.profile.handle);
      } else {
        // 新規アカウントを追加
        this.allAccounts.push(account);
        console.log('🏪 [AccountsStore] アカウント追加:', account.profile.handle);
      }
    } catch (error) {
      console.error('🏪 [AccountsStore] アカウント追加エラー:', error);
      this.error = 'アカウントの追加に失敗しました';
    }
  }

  /**
   * アカウントを削除
   */
  async removeAccount(accountId: string): Promise<void> {
    try {
      this.isLoading = true;
      this.error = null;

      const result = await authService.deleteAccount(accountId);
      
      if (result.success) {
        // ストアからアカウントを削除
        this.allAccounts = this.allAccounts.filter(
          (account) => account.id !== accountId
        );
        console.log('🏪 [AccountsStore] アカウント削除完了:', accountId);
      } else {
        console.error('🏪 [AccountsStore] アカウント削除失敗:', result.error);
        this.error = 'アカウントの削除に失敗しました';
      }
    } catch (error) {
      console.error('🏪 [AccountsStore] アカウント削除エラー:', error);
      this.error = 'アカウントの削除に失敗しました';
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * 全アカウントをクリア
   */
  async clearAllAccounts(): Promise<void> {
    try {
      this.isLoading = true;
      this.error = null;

      const result = await authService.clearAll();
      
      if (result.success) {
        this.allAccounts = [];
        console.log('🏪 [AccountsStore] 全アカウントクリア完了');
      } else {
        console.error('🏪 [AccountsStore] 全アカウントクリア失敗:', result.error);
        this.error = '全アカウントのクリアに失敗しました';
      }
    } catch (error) {
      console.error('🏪 [AccountsStore] 全アカウントクリアエラー:', error);
      this.error = '全アカウントのクリアに失敗しました';
    } finally {
      this.isLoading = false;
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
      console.log('🏪 [AccountsStore] アクティブアカウント設定完了:', account.profile.handle);
      
      // 永続化（将来実装）
      // await this.saveActiveAccountPreference(account.id);
    } catch (error) {
      console.error('🏪 [AccountsStore] アクティブアカウント設定エラー:', error);
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
        console.log('🏪 [AccountsStore] アクティブアカウント取得完了:', result.data.profile.handle);
      } else {
        console.warn('🏪 [AccountsStore] アクティブアカウントが見つかりません');
        this.activeAccount = null;
      }
    } catch (error) {
      console.error('🏪 [AccountsStore] アクティブアカウント取得エラー:', error);
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