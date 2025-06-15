// Tauri SQL プラグインの型定義
// Tauri v2 対応の簡易型定義

export interface QueryResult {
  lastInsertId: number;
  rowsAffected: number;
}

export class Database {
  /**
   * データベースを読み込み
   */
  static async load(path: string): Promise<Database> {
    // 実際の実装はTauriプラグインによって提供される
    return new Database();
  }

  /**
   * SQLクエリを実行（SELECT等）
   */
  async select<T = any[]>(query: string, params?: any[]): Promise<T> {
    // Tauriコマンドを通じてSQLクエリを実行
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke('plugin:sql|select', {
      db: 'sqlite:moodesky.db',
      query,
      values: params || []
    });
  }

  /**
   * SQLクエリを実行（INSERT/UPDATE/DELETE等）
   */
  async execute(query: string, params?: any[]): Promise<QueryResult> {
    // Tauriコマンドを通じてSQLクエリを実行
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke('plugin:sql|execute', {
      db: 'sqlite:moodesky.db',
      query,
      values: params || []
    });
  }

  /**
   * データベース接続を閉じる
   */
  async close(): Promise<void> {
    // Tauriプラグインでの実装
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke('plugin:sql|close', {
      db: 'sqlite:moodesky.db'
    });
  }
}

export default Database;