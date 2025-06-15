import Database from '../types/tauri-sql';

// データベース型定義
interface DbAccount {
  id?: number;
  handle: string;
  did: string;
  service_url: string;
  auth_type: 'oauth' | 'app_password';
  display_name?: string;
  avatar_url?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface DbOAuthSession {
  id?: number;
  account_id: number;
  access_token_hash: string;
  refresh_token_hash?: string;
  expires_at?: string;
  scope?: string;
  created_at?: string;
  updated_at?: string;
}

interface DbUserPreferences {
  account_id: number;
  theme: 'light' | 'dark' | 'system';
  language: 'ja' | 'en' | 'pt-BR' | 'ko' | 'de';
  notifications_enabled: boolean;
  auto_refresh_interval: number;
  preferences_json?: string;
  created_at?: string;
  updated_at?: string;
}

// データベース操作結果型
interface DatabaseResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class DatabaseStore {
  private db: Database | null = null;

  /**
   * データベース接続を初期化
   */
  async initialize(): Promise<DatabaseResult<boolean>> {
    try {
      this.db = await Database.load('sqlite:moodesky.db');
      return { success: true, data: true };
    } catch (error) {
      console.error('Database initialization error:', error);
      return { success: false, error: `データベース初期化エラー: ${error}` };
    }
  }

  /**
   * データベース接続を取得（初期化されていない場合は初期化）
   */
  private async getDb(): Promise<Database> {
    if (!this.db) {
      const result = await this.initialize();
      if (!result.success) {
        throw new Error(result.error || 'データベース初期化に失敗しました');
      }
    }
    return this.db!;
  }

  // === アカウント操作 ===

  /**
   * アカウントを作成または更新
   */
  async upsertAccount(account: Omit<DbAccount, 'id' | 'created_at' | 'updated_at'>): Promise<DatabaseResult<DbAccount>> {
    try {
      const db = await this.getDb();
      
      // 既存アカウントをチェック
      const existing = await db.select<DbAccount[]>(
        'SELECT * FROM accounts WHERE handle = $1 OR did = $2 LIMIT 1',
        [account.handle, account.did]
      );

      let result: DbAccount;

      if (existing.length > 0) {
        // 既存アカウントを更新
        await db.execute(
          `UPDATE accounts SET 
            handle = $1, did = $2, service_url = $3, auth_type = $4,
            display_name = $5, avatar_url = $6, is_active = $7
          WHERE id = $8`,
          [
            account.handle, account.did, account.service_url, account.auth_type,
            account.display_name, account.avatar_url, account.is_active, existing[0].id
          ]
        );
        
        // 更新されたアカウントを取得
        const updated = await db.select<DbAccount[]>(
          'SELECT * FROM accounts WHERE id = $1',
          [existing[0].id]
        );
        result = updated[0];
      } else {
        // 新規アカウントを作成
        const insertResult = await db.execute(
          `INSERT INTO accounts (handle, did, service_url, auth_type, display_name, avatar_url, is_active)
          VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            account.handle, account.did, account.service_url, account.auth_type,
            account.display_name, account.avatar_url, account.is_active
          ]
        );
        
        // 作成されたアカウントを取得
        const created = await db.select<DbAccount[]>(
          'SELECT * FROM accounts WHERE id = $1',
          [insertResult.lastInsertId]
        );
        result = created[0];
      }

      return { success: true, data: result };
    } catch (error) {
      console.error('Account upsert error:', error);
      return { success: false, error: `アカウント保存エラー: ${error}` };
    }
  }

  /**
   * アクティブなアカウント一覧を取得
   */
  async getActiveAccounts(): Promise<DatabaseResult<DbAccount[]>> {
    try {
      const db = await this.getDb();
      const accounts = await db.select<DbAccount[]>(
        'SELECT * FROM accounts WHERE is_active = 1 ORDER BY updated_at DESC'
      );
      return { success: true, data: accounts };
    } catch (error) {
      console.error('Get active accounts error:', error);
      return { success: false, error: `アクティブアカウント取得エラー: ${error}` };
    }
  }

  /**
   * ハンドルでアカウントを取得
   */
  async getAccountByHandle(handle: string): Promise<DatabaseResult<DbAccount | null>> {
    try {
      const db = await this.getDb();
      const accounts = await db.select<DbAccount[]>(
        'SELECT * FROM accounts WHERE handle = $1 LIMIT 1',
        [handle]
      );
      return { success: true, data: accounts.length > 0 ? accounts[0] : null };
    } catch (error) {
      console.error('Get account by handle error:', error);
      return { success: false, error: `アカウント取得エラー: ${error}` };
    }
  }

  /**
   * アカウントを非アクティブ化
   */
  async deactivateAccount(handle: string): Promise<DatabaseResult<boolean>> {
    try {
      const db = await this.getDb();
      await db.execute(
        'UPDATE accounts SET is_active = 0 WHERE handle = $1',
        [handle]
      );
      return { success: true, data: true };
    } catch (error) {
      console.error('Deactivate account error:', error);
      return { success: false, error: `アカウント非アクティブ化エラー: ${error}` };
    }
  }

  // === OAuthセッション操作 ===

  /**
   * OAuthセッションを保存
   */
  async saveOAuthSession(session: Omit<DbOAuthSession, 'id' | 'created_at' | 'updated_at'>): Promise<DatabaseResult<DbOAuthSession>> {
    try {
      const db = await this.getDb();
      
      // 既存セッションを削除（1アカウント1セッション）
      await db.execute(
        'DELETE FROM oauth_sessions WHERE account_id = $1',
        [session.account_id]
      );

      // 新しいセッションを作成
      const insertResult = await db.execute(
        `INSERT INTO oauth_sessions (account_id, access_token_hash, refresh_token_hash, expires_at, scope)
        VALUES ($1, $2, $3, $4, $5)`,
        [session.account_id, session.access_token_hash, session.refresh_token_hash, session.expires_at, session.scope]
      );

      // 作成されたセッションを取得
      const created = await db.select<DbOAuthSession[]>(
        'SELECT * FROM oauth_sessions WHERE id = $1',
        [insertResult.lastInsertId]
      );

      return { success: true, data: created[0] };
    } catch (error) {
      console.error('Save OAuth session error:', error);
      return { success: false, error: `セッション保存エラー: ${error}` };
    }
  }

  /**
   * アカウントIDでOAuthセッションを取得
   */
  async getOAuthSession(accountId: number): Promise<DatabaseResult<DbOAuthSession | null>> {
    try {
      const db = await this.getDb();
      const sessions = await db.select<DbOAuthSession[]>(
        'SELECT * FROM oauth_sessions WHERE account_id = $1 LIMIT 1',
        [accountId]
      );
      return { success: true, data: sessions.length > 0 ? sessions[0] : null };
    } catch (error) {
      console.error('Get OAuth session error:', error);
      return { success: false, error: `セッション取得エラー: ${error}` };
    }
  }

  /**
   * OAuthセッションを削除
   */
  async deleteOAuthSession(accountId: number): Promise<DatabaseResult<boolean>> {
    try {
      const db = await this.getDb();
      await db.execute(
        'DELETE FROM oauth_sessions WHERE account_id = $1',
        [accountId]
      );
      return { success: true, data: true };
    } catch (error) {
      console.error('Delete OAuth session error:', error);
      return { success: false, error: `セッション削除エラー: ${error}` };
    }
  }

  // === ユーザー設定操作 ===

  /**
   * ユーザー設定を保存または更新
   */
  async upsertUserPreferences(preferences: Omit<DbUserPreferences, 'created_at' | 'updated_at'>): Promise<DatabaseResult<DbUserPreferences>> {
    try {
      const db = await this.getDb();
      
      // 既存設定をチェック
      const existing = await db.select<DbUserPreferences[]>(
        'SELECT * FROM user_preferences WHERE account_id = $1 LIMIT 1',
        [preferences.account_id]
      );

      let result: DbUserPreferences;

      if (existing.length > 0) {
        // 既存設定を更新
        await db.execute(
          `UPDATE user_preferences SET 
            theme = $1, language = $2, notifications_enabled = $3,
            auto_refresh_interval = $4, preferences_json = $5
          WHERE account_id = $6`,
          [
            preferences.theme, preferences.language, preferences.notifications_enabled,
            preferences.auto_refresh_interval, preferences.preferences_json, preferences.account_id
          ]
        );
        
        // 更新された設定を取得
        const updated = await db.select<DbUserPreferences[]>(
          'SELECT * FROM user_preferences WHERE account_id = $1',
          [preferences.account_id]
        );
        result = updated[0];
      } else {
        // 新規設定を作成
        await db.execute(
          `INSERT INTO user_preferences (account_id, theme, language, notifications_enabled, auto_refresh_interval, preferences_json)
          VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            preferences.account_id, preferences.theme, preferences.language,
            preferences.notifications_enabled, preferences.auto_refresh_interval, preferences.preferences_json
          ]
        );
        
        // 作成された設定を取得
        const created = await db.select<DbUserPreferences[]>(
          'SELECT * FROM user_preferences WHERE account_id = $1',
          [preferences.account_id]
        );
        result = created[0];
      }

      return { success: true, data: result };
    } catch (error) {
      console.error('Upsert user preferences error:', error);
      return { success: false, error: `ユーザー設定保存エラー: ${error}` };
    }
  }

  /**
   * ユーザー設定を取得
   */
  async getUserPreferences(accountId: number): Promise<DatabaseResult<DbUserPreferences | null>> {
    try {
      const db = await this.getDb();
      const preferences = await db.select<DbUserPreferences[]>(
        'SELECT * FROM user_preferences WHERE account_id = $1 LIMIT 1',
        [accountId]
      );
      return { success: true, data: preferences.length > 0 ? preferences[0] : null };
    } catch (error) {
      console.error('Get user preferences error:', error);
      return { success: false, error: `ユーザー設定取得エラー: ${error}` };
    }
  }

  // === データベース管理 ===

  /**
   * データベース接続を閉じる
   */
  async close(): Promise<DatabaseResult<boolean>> {
    try {
      if (this.db) {
        await this.db.close();
        this.db = null;
      }
      return { success: true, data: true };
    } catch (error) {
      console.error('Database close error:', error);
      return { success: false, error: `データベース終了エラー: ${error}` };
    }
  }

  /**
   * データベースの状態を確認
   */
  async checkHealth(): Promise<DatabaseResult<boolean>> {
    try {
      const db = await this.getDb();
      // シンプルなクエリでデータベースの状態を確認
      await db.select('SELECT 1 as health_check');
      return { success: true, data: true };
    } catch (error) {
      console.error('Database health check error:', error);
      return { success: false, error: `データベース状態確認エラー: ${error}` };
    }
  }
}

// シングルトンインスタンス
export const databaseStore = new DatabaseStore();

// 型定義のエクスポート
export type { DbAccount, DbOAuthSession, DbUserPreferences, DatabaseResult };