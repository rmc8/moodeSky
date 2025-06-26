import type { 
  CachedAvatarInfo, 
  AccountProfileRequest, 
  AvatarCacheConfig, 
  CacheStats, 
  AvatarFetchResult,
  BatchFetchResult 
} from '$lib/types/avatarCache.js';
import { authService } from '$lib/services/authStore.js';
import { profileService } from '$lib/services/profileService.js';
import { LRUCache } from '$lib/utils/lruCache.js';
import { createOptimalConfig } from '$lib/config/avatarCache.js';
import { 
  AvatarCacheError, 
  AvatarCacheErrorFactory, 
  AvatarCacheErrorLogger 
} from '$lib/errors/avatarCacheError.js';

/**
 * グローバルアバターキャッシュストア (Svelte 5 runes)
 * 
 * マルチデッキ環境でのアバター取得を効率化
 * - DIDベースのキャッシュ管理
 * - バッチ取得による API 効率化
 * - TTL ベースの自動更新
 * - メモリ使用量制限
 */
class AvatarCacheStore {
  // ===================================================================
  // 設定
  // ===================================================================
  
  private readonly config: AvatarCacheConfig;

  // ===================================================================
  // 状態管理 (Svelte 5 runes)
  // ===================================================================
  
  /** メインキャッシュ（DID -> アバター情報）- LRU Cache使用 */
  private cache: LRUCache<string, CachedAvatarInfo>;
  
  /** 現在取得中のDIDセット */
  private fetchingDids = $state<Set<string>>(new Set());
  
  /** バッチ取得キュー */
  private batchQueue = $state<Set<string>>(new Set());
  
  /** 統計情報 */
  private stats = $state<CacheStats>({
    totalCached: 0,
    hitRate: 0,
    missCount: 0,
    errorCount: 0,
    lastCleanup: Date.now()
  });
  
  /** 初期化状態 */
  private isInitialized = $state(false);
  
  /** クリーンアップタスクのインターバルID（メモリリーク防止用） */
  private cleanupIntervalId: number | null = null;
  
  /** 現在実行中のフェッチPromiseマップ（レースコンディション防止用） */
  private fetchPromises = new Map<string, Promise<AvatarFetchResult>>();

  // ===================================================================
  // コンストラクタ
  // ===================================================================
  
  constructor(customConfig?: Partial<AvatarCacheConfig>) {
    // 環境に応じた最適設定を取得
    this.config = customConfig 
      ? { ...createOptimalConfig(), ...customConfig }
      : createOptimalConfig();
    
    // LRUキャッシュを設定に基づいて初期化
    this.cache = $state(new LRUCache<string, CachedAvatarInfo>(this.config.maxCacheSize));
  }

  // ===================================================================
  // 算出プロパティ
  // ===================================================================
  
  /** 現在のキャッシュサイズ */
  get cacheSize(): number {
    return this.cache.currentSize;
  }
  
  /** 統計情報（読み取り専用） */
  get statistics(): CacheStats {
    return { ...this.stats };
  }
  
  /** 初期化完了状態 */
  get initialized(): boolean {
    return this.isInitialized;
  }
  
  /** 現在の設定（読み取り専用） */
  get configuration(): AvatarCacheConfig {
    return { ...this.config };
  }

  // ===================================================================
  // 公開メソッド
  // ===================================================================
  
  /**
   * キャッシュストアを初期化
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      console.log('🎭 [AvatarCache] Initializing avatar cache system...');
      
      // 既存のアカウント情報からキャッシュを初期構築
      await this.initializeCacheFromAccounts();
      
      // 定期クリーンアップタスクを開始
      this.startCleanupTask();
      
      this.isInitialized = true;
      console.log(`🎭 [AvatarCache] Initialized with ${this.cacheSize} cached avatars`);
      
    } catch (error) {
      const cacheError = AvatarCacheErrorFactory.fromError(error, {
        operation: 'initialization'
      });
      AvatarCacheErrorLogger.log(cacheError);
      throw cacheError;
    }
  }

  /**
   * 単一アカウントのアバター情報を取得
   */
  async getAvatar(did: string): Promise<AvatarFetchResult> {
    // キャッシュから確認
    const cached = this.getCachedAvatar(did);
    if (cached && this.isCacheValid(cached)) {
      this.updateHitRate(true);
      return {
        success: true,
        data: cached,
        fromCache: true
      };
    }

    // ステイルなキャッシュがある場合は返しつつ、バックグラウンドで更新
    if (cached && this.isCacheStale(cached)) {
      this.scheduleBackgroundFetch(did);
      this.updateHitRate(true);
      return {
        success: true,
        data: cached,
        fromCache: true
      };
    }

    // キャッシュミス - 取得をスケジュール
    this.updateHitRate(false);
    return await this.fetchAvatar(did);
  }

  /**
   * 複数アカウントのアバター情報をバッチ取得
   */
  async getAvatars(dids: string[]): Promise<Map<string, AvatarFetchResult>> {
    const results = new Map<string, AvatarFetchResult>();
    const needsFetch: string[] = [];
    
    // キャッシュから取得可能なものを抽出
    for (const did of dids) {
      const cached = this.getCachedAvatar(did);
      if (cached && this.isCacheValid(cached)) {
        results.set(did, {
          success: true,
          data: cached,
          fromCache: true
        });
        this.updateHitRate(true);
      } else {
        needsFetch.push(did);
        this.updateHitRate(false);
      }
    }

    // 取得が必要なものをバッチ処理
    if (needsFetch.length > 0) {
      const batchResults = await this.batchFetchAvatars(needsFetch);
      
      for (const [did, avatarInfo] of batchResults.results) {
        results.set(did, {
          success: true,
          data: avatarInfo,
          fromCache: false
        });
      }
      
      // エラーが発生したものも結果に含める
      for (const { did, error } of batchResults.errors) {
        results.set(did, {
          success: false,
          error,
          fromCache: false
        });
      }
    }

    return results;
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    console.log('🎭 [AvatarCache] Clearing cache...');
    this.cache.clear();
    this.fetchingDids.clear();
    this.batchQueue.clear();
    this.stats.totalCached = 0;
    this.stats.lastCleanup = Date.now();
  }

  /**
   * 特定のアカウントのキャッシュを無効化
   */
  invalidateAvatar(did: string): void {
    console.log(`🎭 [AvatarCache] Invalidating cache for DID: ${did}`);
    this.cache.delete(did);
    this.fetchingDids.delete(did);
    this.batchQueue.delete(did);
  }

  /**
   * 手動でアバター情報を更新
   */
  async refreshAvatar(did: string): Promise<AvatarFetchResult> {
    this.invalidateAvatar(did);
    return await this.fetchAvatar(did);
  }

  // ===================================================================
  // プライベートメソッド
  // ===================================================================

  /**
   * キャッシュされたアバター情報を取得
   */
  private getCachedAvatar(did: string): CachedAvatarInfo | null {
    return this.cache.get(did) || null;
  }

  /**
   * キャッシュが有効かチェック
   */
  private isCacheValid(cached: CachedAvatarInfo): boolean {
    const now = Date.now();
    return (now - cached.cachedAt) < this.config.ttl && cached.status === 'success';
  }

  /**
   * キャッシュがステイル状態かチェック
   */
  private isCacheStale(cached: CachedAvatarInfo): boolean {
    const now = Date.now();
    return (now - cached.cachedAt) > this.config.ttl && 
           (now - cached.cachedAt) < this.config.staleTtl && 
           cached.status === 'success';
  }

  /**
   * 単一アバターを取得
   */
  private async fetchAvatar(did: string): Promise<AvatarFetchResult> {
    // 既に取得中の場合は同じPromiseを返す（レースコンディション防止）
    const existingPromise = this.fetchPromises.get(did);
    if (existingPromise) {
      return existingPromise;
    }

    // 新しいフェッチPromiseを作成してキャッシュに保存
    const fetchPromise = this.performSingleFetch(did);
    this.fetchPromises.set(did, fetchPromise);
    
    // Promise完了後にキャッシュから削除
    fetchPromise.finally(() => {
      this.fetchPromises.delete(did);
      this.fetchingDids.delete(did);
    });
    
    this.fetchingDids.add(did);
    return fetchPromise;
  }
  
  /**
   * 実際のフェッチ処理を実行
   */
  private async performSingleFetch(did: string): Promise<AvatarFetchResult> {

    try {
      // AT Protocol APIを使用してプロフィール取得
      const profile = await this.fetchProfileFromApi(did);
      
      const avatarInfo: CachedAvatarInfo = {
        did,
        handle: profile.handle || did,
        displayName: profile.displayName,
        avatarUrl: profile.avatar,
        cachedAt: Date.now(),
        lastUpdated: Date.now(),
        status: 'success'
      };

      this.setCache(did, avatarInfo);
      
      return {
        success: true,
        data: avatarInfo,
        fromCache: false
      };

    } catch (error) {
      const cacheError = AvatarCacheErrorFactory.fromError(error, {
        did,
        operation: 'avatar_fetch'
      });
      AvatarCacheErrorLogger.log(cacheError);
      
      const errorInfo: CachedAvatarInfo = {
        did,
        handle: did,
        cachedAt: Date.now(),
        lastUpdated: Date.now(),
        status: 'error',
        error: cacheError.message
      };

      this.setCache(did, errorInfo);
      this.stats.errorCount++;

      return {
        success: false,
        error: cacheError.message,
        fromCache: false
      };

    }
  }

  /**
   * バッチでアバター情報を取得
   */
  private async batchFetchAvatars(dids: string[]): Promise<BatchFetchResult> {
    const batches = this.createBatches(dids, this.config.batchSize);
    const results = new Map<string, CachedAvatarInfo>();
    const errors: Array<{ did: string; error: string }> = [];
    
    for (const batch of batches) {
      try {
        const batchResults = await this.fetchProfilesBatch(batch);
        
        for (const result of batchResults) {
          if (result.success && result.data) {
            this.setCache(result.did, result.data);
            results.set(result.did, result.data);
          } else {
            errors.push({ did: result.did, error: result.error || 'Unknown error' });
            this.stats.errorCount++;
          }
        }
        
      } catch (error) {
        const cacheError = AvatarCacheErrorFactory.fromError(error, {
          operation: 'batch_fetch',
          context: { batchSize: batch.length }
        });
        AvatarCacheErrorLogger.log(cacheError);
        
        // バッチ全体が失敗した場合、個別エラーとして記録
        for (const did of batch) {
          errors.push({ 
            did, 
            error: cacheError.message
          });
        }
      }
      
      // バッチ間で少し待機（レート制限対策）
      if (batches.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return {
      successCount: results.size,
      errorCount: errors.length,
      results,
      errors
    };
  }

  /**
   * APIからプロフィール情報を取得
   */
  private async fetchProfileFromApi(did: string): Promise<any> {
    try {
      const result = await profileService.getProfile(did);
      
      if (!result.success || !result.data) {
        throw new Error(result.error?.message || 'Profile fetch failed');
      }

      return {
        handle: result.data.handle,
        displayName: result.data.displayName,
        avatar: result.data.avatar
      };
    } catch (error) {
      const cacheError = AvatarCacheErrorFactory.fromError(error, {
        did,
        operation: 'profile_service_fetch'
      });
      AvatarCacheErrorLogger.log(cacheError);
      throw cacheError;
    }
  }

  /**
   * バッチでプロフィール情報を取得
   */
  private async fetchProfilesBatch(dids: string[]): Promise<Array<{did: string; success: boolean; data?: CachedAvatarInfo; error?: string}>> {
    try {
      const batchResults = await profileService.getProfiles(dids);
      
      return batchResults.map(result => {
        if (result.success && result.data) {
          return {
            did: result.did,
            success: true,
            data: {
              did: result.data.did,
              handle: result.data.handle,
              displayName: result.data.displayName,
              avatarUrl: result.data.avatar,
              cachedAt: Date.now(),
              lastUpdated: Date.now(),
              status: 'success' as const
            }
          };
        } else {
          return {
            did: result.did,
            success: false,
            error: result.error || 'Profile fetch failed'
          };
        }
      });
    } catch (error) {
      console.error(`🎭 [AvatarCache] Batch profile fetch failed:`, error);
      
      // バッチ全体が失敗した場合は全てエラーとして返す
      return dids.map(did => ({
        did,
        success: false,
        error: error instanceof Error ? error.message : 'Batch fetch failed'
      }));
    }
  }

  /**
   * 配列を指定サイズのバッチに分割
   */
  private createBatches<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * キャッシュに保存
   */
  private setCache(did: string, avatarInfo: CachedAvatarInfo): void {
    // LRUキャッシュが自動的にサイズ制限を管理するため、
    // 明示的なサイズチェックは不要
    
    this.cache.set(did, avatarInfo);
    this.stats.totalCached = this.cache.currentSize;
  }

  /**
   * LRUキャッシュの統計情報をログ出力
   * (LRUCacheが自動的に最も使われていないアイテムを削除)
   */
  private logCacheStats(): void {
    const currentSize = this.cache.currentSize;
    const maxSize = this.config.maxCacheSize;
    console.log(`🎭 [AvatarCache] LRU Cache: ${currentSize}/${maxSize} entries`);
  }

  /**
   * ヒット率を更新
   */
  private updateHitRate(hit: boolean): void {
    const totalRequests = this.stats.missCount + (this.stats.hitRate * this.stats.totalCached || 0);
    if (!hit) {
      this.stats.missCount++;
    }
    const newTotalRequests = totalRequests + 1;
    const hits = newTotalRequests - this.stats.missCount;
    this.stats.hitRate = hits / newTotalRequests;
  }

  /**
   * バックグラウンドで取得をスケジュール
   */
  private scheduleBackgroundFetch(did: string): void {
    setTimeout(() => {
      this.fetchAvatar(did).catch(error => {
        const cacheError = AvatarCacheErrorFactory.fromError(error, {
          did,
          operation: 'background_fetch'
        });
        AvatarCacheErrorLogger.log(cacheError);
      });
    }, 100);
  }


  /**
   * 既存アカウントからキャッシュを初期構築
   */
  private async initializeCacheFromAccounts(): Promise<void> {
    try {
      const result = await authService.getAllAccounts();
      if (result.success && result.data) {
        for (const account of result.data) {
          const avatarInfo: CachedAvatarInfo = {
            did: account.profile.did,
            handle: account.profile.handle,
            displayName: account.profile.displayName,
            avatarUrl: account.profile.avatar,
            cachedAt: Date.now(),
            lastUpdated: Date.now(),
            status: 'success'
          };
          this.cache.set(account.profile.did, avatarInfo);
        }
        this.stats.totalCached = this.cache.currentSize;
        console.log(`🎭 [AvatarCache] Pre-cached ${this.cache.size} account avatars`);
      }
    } catch (error) {
      const cacheError = AvatarCacheErrorFactory.fromError(error, {
        operation: 'accounts_initialization'
      });
      AvatarCacheErrorLogger.log(cacheError);
    }
  }

  /**
   * 定期クリーンアップタスクを開始
   */
  private startCleanupTask(): void {
    // 既存のインターバルがあれば先にクリア
    this.stopCleanupTask();
    
    // 5分おきにクリーンアップを実行
    this.cleanupIntervalId = setInterval(() => {
      this.cleanupExpiredCache();
    }, 5 * 60 * 1000) as number;
  }
  
  /**
   * 定期クリーンアップタスクを停止
   */
  private stopCleanupTask(): void {
    if (this.cleanupIntervalId !== null) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
    }
  }
  
  /**
   * ストアを破棄してリソースをクリーンアップ
   * メモリリーク防止のため、アプリケーション終了時や不要になった時に呼び出す
   */
  public destroy(): void {
    this.stopCleanupTask();
    this.cache.clear();
    this.fetchingDids.clear();
    this.batchQueue.clear();
    this.fetchPromises.clear();
    this.isInitialized = false;
  }

  /**
   * 期限切れキャッシュをクリーンアップ
   */
  private cleanupExpiredCache(): void {
    const now = Date.now();
    let removedCount = 0;
    
    // LRUキャッシュのentriesメソッドを使用してイテレーション
    for (const [did, info] of this.cache.entries()) {
      if ((now - info.cachedAt) > this.config.staleTtl) {
        this.cache.delete(did);
        removedCount++;
      }
    }
    
    this.stats.totalCached = this.cache.currentSize;
    this.stats.lastCleanup = now;
    
    if (removedCount > 0) {
      console.log(`🎭 [AvatarCache] Cleaned up ${removedCount} expired cache entries`);
    }
  }
}

// シングルトンインスタンス
export const avatarCache = new AvatarCacheStore();