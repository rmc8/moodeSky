/**
 * グローバルアバターキャッシュシステムの型定義
 * 
 * 複数デッキでのアバター取得を効率化するためのキャッシュシステム
 * 各アカウントのプロフィール情報をDIDベースでキャッシュ
 */

/**
 * キャッシュされたアバター情報
 */
export interface CachedAvatarInfo {
  /** アカウントDID（キー） */
  did: string;
  /** ハンドル名 */
  handle: string;
  /** 表示名 */
  displayName?: string;
  /** アバター画像URL */
  avatarUrl?: string;
  /** キャッシュ作成日時 */
  cachedAt: number;
  /** 最終更新日時 */
  lastUpdated: number;
  /** 取得状態 */
  status: 'loading' | 'success' | 'error' | 'stale';
  /** エラーメッセージ（エラー時） */
  error?: string;
}

/**
 * バッチ取得用のアカウント情報
 */
export interface AccountProfileRequest {
  /** アカウントDID */
  did: string;
  /** ハンドル名（取得済みの場合） */
  handle?: string;
}

/**
 * アバターキャッシュの設定
 */
export interface AvatarCacheConfig {
  /** キャッシュ有効期限（ミリ秒）デフォルト: 30分 */
  ttl: number;
  /** ステイル許容期間（ミリ秒）デフォルト: 2時間 */
  staleTtl: number;
  /** 最大キャッシュサイズ デフォルト: 1000 */
  maxCacheSize: number;
  /** バッチ取得のサイズ デフォルト: 25 */
  batchSize: number;
  /** 取得リトライ回数 デフォルト: 3 */
  maxRetries: number;
  /** リトライ間隔（ミリ秒）デフォルト: 1000 */
  retryDelay: number;
}

/**
 * キャッシュ統計情報
 */
export interface CacheStats {
  /** 総キャッシュ数 */
  totalCached: number;
  /** ヒット率 */
  hitRate: number;
  /** ミス数 */
  missCount: number;
  /** エラー数 */
  errorCount: number;
  /** 最終更新日時 */
  lastCleanup: number;
}

/**
 * アバター取得結果
 */
export interface AvatarFetchResult {
  success: boolean;
  data?: CachedAvatarInfo;
  error?: string;
  fromCache: boolean;
}

/**
 * バッチ取得結果
 */
export interface BatchFetchResult {
  /** 成功した取得数 */
  successCount: number;
  /** 失敗した取得数 */
  errorCount: number;
  /** 取得結果の詳細 */
  results: Map<string, CachedAvatarInfo>;
  /** 発生したエラー */
  errors: Array<{ did: string; error: string }>;
}