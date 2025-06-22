/**
 * profileService.ts
 * AT Protocol プロフィール統計情報取得サービス
 * 
 * app.bsky.actor.getProfile API を使用してプロフィール統計を取得
 * キャッシュ機能・エラーハンドリング・レート制限対応
 */

import { BskyAgent } from '@atproto/api';

/**
 * プロフィール統計情報
 */
export interface ProfileStats {
  /** フォロワー数 */
  followersCount: number;
  /** フォロー数 */
  followingCount: number;
  /** ポスト数 */
  postsCount: number;
  /** 最終更新日時 */
  lastUpdated: Date;
}

/**
 * キャッシュエントリ
 */
interface CacheEntry {
  stats: ProfileStats;
  expiredAt: number;
}

/**
 * プロフィールサービスエラー種別
 */
export type ProfileServiceError = 
  | 'NETWORK_ERROR'
  | 'RATE_LIMITED' 
  | 'PROFILE_NOT_FOUND'
  | 'AUTH_REQUIRED'
  | 'INVALID_DID'
  | 'API_ERROR';

/**
 * プロフィールサービス結果
 */
export interface ProfileServiceResult<T = ProfileStats> {
  success: boolean;
  data?: T;
  error?: {
    type: ProfileServiceError;
    message: string;
  };
}

/**
 * AT Protocol プロフィール統計サービス
 */
export class ProfileService {
  private cache = new Map<string, CacheEntry>();
  private cacheExpiry = 5 * 60 * 1000; // 5分間キャッシュ
  
  /**
   * プロフィール統計を取得
   * @param did アカウントDID
   * @param accessJwt アクセストークン
   * @param service AT Protocol サービスURL
   */
  async getProfileStats(
    did: string, 
    accessJwt: string,
    service: string = 'https://bsky.social'
  ): Promise<ProfileServiceResult> {
    try {
      // DIDバリデーション
      if (!did || !did.startsWith('did:')) {
        return {
          success: false,
          error: {
            type: 'INVALID_DID',
            message: 'Invalid DID format'
          }
        };
      }

      // キャッシュチェック
      const cached = this.getCachedStats(did);
      if (cached) {
        console.log(`📊 [ProfileService] Cache hit for ${did}`);
        return {
          success: true,
          data: cached
        };
      }

      // BskyAgent インスタンス作成
      const agent = new BskyAgent({ service });
      
      // 認証（アクセストークンが必要）
      if (!accessJwt) {
        return {
          success: false,
          error: {
            type: 'AUTH_REQUIRED',
            message: 'Access token required'
          }
        };
      }

      // セッション復元（resumeSession を使用）
      await agent.resumeSession({
        accessJwt,
        refreshJwt: '', // 統計取得には不要
        handle: '',
        did: did,
        active: true
      });

      console.log(`📊 [ProfileService] Fetching profile stats for ${did}`);

      // app.bsky.actor.getProfile API 呼び出し
      const response = await agent.getProfile({ actor: did });
      
      if (!response.success) {
        return {
          success: false,
          error: {
            type: 'API_ERROR',
            message: 'Failed to fetch profile'
          }
        };
      }

      const profile = response.data;
      
      // 統計情報の抽出（undefinedの場合は0として扱う）
      const stats: ProfileStats = {
        followersCount: profile.followersCount ?? 0,
        followingCount: profile.followsCount ?? 0,
        postsCount: profile.postsCount ?? 0,
        lastUpdated: new Date()
      };

      // キャッシュに保存
      this.setCachedStats(did, stats);

      console.log(`📊 [ProfileService] Profile stats fetched:`, stats);

      return {
        success: true,
        data: stats
      };

    } catch (error: any) {
      console.error('📊 [ProfileService] Error fetching profile stats:', error);

      // エラー種別の判定
      let errorType: ProfileServiceError = 'API_ERROR';
      let errorMessage = 'Unknown error occurred';

      if (error.message?.includes('rate limit')) {
        errorType = 'RATE_LIMITED';
        errorMessage = 'Rate limit exceeded. Please try again later.';
      } else if (error.message?.includes('network') || error.code === 'NETWORK_ERROR') {
        errorType = 'NETWORK_ERROR';
        errorMessage = 'Network error occurred. Please check your connection.';
      } else if (error.status === 404 || error.message?.includes('not found')) {
        errorType = 'PROFILE_NOT_FOUND';
        errorMessage = 'Profile not found';
      } else if (error.status === 401 || error.message?.includes('unauthorized')) {
        errorType = 'AUTH_REQUIRED';
        errorMessage = 'Authentication required';
      }

      return {
        success: false,
        error: {
          type: errorType,
          message: errorMessage
        }
      };
    }
  }

  /**
   * キャッシュから統計情報を取得
   */
  private getCachedStats(did: string): ProfileStats | null {
    const entry = this.cache.get(did);
    if (!entry) return null;

    // 期限切れチェック
    if (Date.now() > entry.expiredAt) {
      this.cache.delete(did);
      return null;
    }

    return entry.stats;
  }

  /**
   * 統計情報をキャッシュに保存
   */
  private setCachedStats(did: string, stats: ProfileStats): void {
    const entry: CacheEntry = {
      stats,
      expiredAt: Date.now() + this.cacheExpiry
    };
    this.cache.set(did, entry);
  }

  /**
   * キャッシュをクリア
   * @param did 特定のDIDをクリア（未指定時は全てクリア）
   */
  public clearCache(did?: string): void {
    if (did) {
      this.cache.delete(did);
      console.log(`📊 [ProfileService] Cache cleared for ${did}`);
    } else {
      this.cache.clear();
      console.log(`📊 [ProfileService] All cache cleared`);
    }
  }

  /**
   * キャッシュサイズを取得（デバッグ用）
   */
  public getCacheSize(): number {
    return this.cache.size;
  }

  /**
   * キャッシュの状態を取得（デバッグ用）
   */
  public getCacheInfo(): Array<{ did: string; lastUpdated: Date; expiresIn: number }> {
    const now = Date.now();
    return Array.from(this.cache.entries()).map(([did, entry]) => ({
      did,
      lastUpdated: entry.stats.lastUpdated,
      expiresIn: Math.max(0, entry.expiredAt - now)
    }));
  }
}

/**
 * プロフィールサービスインスタンス（シングルトン）
 */
export const profileService = new ProfileService();