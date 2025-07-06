/**
 * profileService.ts
 * AT Protocol プロフィール統計情報取得サービス
 * 
 * app.bsky.actor.getProfile API を使用してプロフィール統計を取得
 * キャッシュ機能・エラーハンドリング・レート制限対応
 */

import { AtpAgent } from '@atproto/api';
import { authService } from './authStore.js';

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
 * 基本プロフィール情報（アバターキャッシュ用）
 */
export interface ProfileInfo {
  /** アカウントDID */
  did: string;
  /** ハンドル名 */
  handle: string;
  /** 表示名 */
  displayName?: string;
  /** アバター画像URL */
  avatar?: string;
  /** プロフィール説明 */
  description?: string;
  /** 最終更新日時 */
  lastUpdated: Date;
}

/**
 * キャッシュエントリ（統計情報用）
 */
interface StatsCacheEntry {
  stats: ProfileStats;
  expiredAt: number;
}

/**
 * キャッシュエントリ（プロフィール情報用）
 */
interface ProfileCacheEntry {
  profile: ProfileInfo;
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
  private statsCache = new Map<string, StatsCacheEntry>();
  private profileCache = new Map<string, ProfileCacheEntry>();
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

      // AtpAgent インスタンス作成
      const agent = new AtpAgent({ service });
      
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
    const entry = this.statsCache.get(did);
    if (!entry) return null;

    // 期限切れチェック
    if (Date.now() > entry.expiredAt) {
      this.statsCache.delete(did);
      return null;
    }

    return entry.stats;
  }

  /**
   * 統計情報をキャッシュに保存
   */
  private setCachedStats(did: string, stats: ProfileStats): void {
    const entry: StatsCacheEntry = {
      stats,
      expiredAt: Date.now() + this.cacheExpiry
    };
    this.statsCache.set(did, entry);
  }

  /**
   * キャッシュからプロフィール情報を取得
   */
  private getCachedProfile(did: string): ProfileInfo | null {
    const entry = this.profileCache.get(did);
    if (!entry) return null;

    // 期限切れチェック
    if (Date.now() > entry.expiredAt) {
      this.profileCache.delete(did);
      return null;
    }

    return entry.profile;
  }

  /**
   * プロフィール情報をキャッシュに保存
   */
  private setCachedProfile(did: string, profile: ProfileInfo): void {
    const entry: ProfileCacheEntry = {
      profile,
      expiredAt: Date.now() + this.cacheExpiry
    };
    this.profileCache.set(did, entry);
  }

  /**
   * 基本プロフィール情報を取得（アバターキャッシュ用）
   * @param did アカウントDID
   */
  async getProfile(did: string): Promise<ProfileServiceResult<ProfileInfo>> {
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
      const cached = this.getCachedProfile(did);
      if (cached) {
        console.log(`🎭 [ProfileService] Profile cache hit for ${did}`);
        return {
          success: true,
          data: cached
        };
      }

      // アクティブアカウントのセッション情報を取得
      const accountResult = await authService.getActiveAccount();
      if (!accountResult.success || !accountResult.data?.session) {
        return {
          success: false,
          error: {
            type: 'AUTH_REQUIRED',
            message: 'Active account session not found'
          }
        };
      }

      const { session, service } = accountResult.data;
      const agent = new AtpAgent({ service: service || 'https://bsky.social' });
      
      // セッション復元
      await agent.resumeSession(session);

      console.log(`🎭 [ProfileService] Fetching profile for ${did}`);

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
      
      // プロフィール情報の抽出
      const profileInfo: ProfileInfo = {
        did: profile.did,
        handle: profile.handle,
        displayName: profile.displayName,
        avatar: profile.avatar,
        description: profile.description,
        lastUpdated: new Date()
      };

      // キャッシュに保存
      this.setCachedProfile(did, profileInfo);

      console.log(`🎭 [ProfileService] Profile fetched for ${did}:`, {
        handle: profileInfo.handle,
        displayName: profileInfo.displayName,
        hasAvatar: !!profileInfo.avatar
      });

      return {
        success: true,
        data: profileInfo
      };

    } catch (error: any) {
      console.error(`🎭 [ProfileService] Error fetching profile for ${did}:`, error);

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
   * 複数プロフィール情報をバッチ取得（アバターキャッシュ用）
   * @param dids アカウントDIDの配列
   */
  async getProfiles(dids: string[]): Promise<Array<{did: string; success: boolean; data?: ProfileInfo; error?: string}>> {
    try {
      // アクティブアカウントのセッション情報を取得
      const accountResult = await authService.getActiveAccount();
      if (!accountResult.success || !accountResult.data?.session) {
        // 認証エラーの場合、全てのDIDに対してエラーを返す
        return dids.map(did => ({
          did,
          success: false,
          error: 'Active account session not found'
        }));
      }

      const { session, service } = accountResult.data;
      const agent = new AtpAgent({ service: service || 'https://bsky.social' });
      
      // セッション復元
      await agent.resumeSession(session);

      console.log(`🎭 [ProfileService] Batch fetching profiles for ${dids.length} DIDs`);

      // キャッシュから取得できるものを分離
      const results: Array<{did: string; success: boolean; data?: ProfileInfo; error?: string}> = [];
      const needsFetch: string[] = [];

      for (const did of dids) {
        const cached = this.getCachedProfile(did);
        if (cached) {
          results.push({
            did,
            success: true,
            data: cached
          });
        } else {
          needsFetch.push(did);
        }
      }

      // APIから取得が必要なDIDがある場合
      if (needsFetch.length > 0) {
        try {
          // app.bsky.actor.getProfiles API 呼び出し（バッチ取得）
          const response = await agent.getProfiles({ actors: needsFetch });
          
          if (response.success) {
            // 成功したプロフィールを処理
            for (const profile of response.data.profiles) {
              const profileInfo: ProfileInfo = {
                did: profile.did,
                handle: profile.handle,
                displayName: profile.displayName,
                avatar: profile.avatar,
                description: profile.description,
                lastUpdated: new Date()
              };

              // キャッシュに保存
              this.setCachedProfile(profile.did, profileInfo);

              results.push({
                did: profile.did,
                success: true,
                data: profileInfo
              });
            }

            // 取得できなかったDIDがある場合はエラーとして追加
            const fetchedDids = new Set(response.data.profiles.map(p => p.did));
            for (const did of needsFetch) {
              if (!fetchedDids.has(did)) {
                results.push({
                  did,
                  success: false,
                  error: 'Profile not found in batch response'
                });
              }
            }
          } else {
            // バッチ取得が失敗した場合、個別取得にフォールバック
            console.warn('🎭 [ProfileService] Batch fetch failed, falling back to individual requests');
            
            for (const did of needsFetch) {
              try {
                const individualResult = await this.getProfile(did);
                if (individualResult.success && individualResult.data) {
                  results.push({
                    did,
                    success: true,
                    data: individualResult.data
                  });
                } else {
                  results.push({
                    did,
                    success: false,
                    error: individualResult.error?.message || 'Individual fetch failed'
                  });
                }
              } catch (error) {
                results.push({
                  did,
                  success: false,
                  error: error instanceof Error ? error.message : 'Individual fetch error'
                });
              }
            }
          }
        } catch (error) {
          console.error('🎭 [ProfileService] Batch fetch error:', error);
          
          // バッチ取得エラーの場合、全ての未取得DIDにエラーを設定
          for (const did of needsFetch) {
            results.push({
              did,
              success: false,
              error: error instanceof Error ? error.message : 'Batch fetch failed'
            });
          }
        }
      }

      console.log(`🎭 [ProfileService] Batch fetch complete: ${results.filter(r => r.success).length}/${dids.length} successful`);

      return results;

    } catch (error: any) {
      console.error('🎭 [ProfileService] Batch profile fetch error:', error);
      
      // 全体的なエラーの場合、全てのDIDに対してエラーを返す
      return dids.map(did => ({
        did,
        success: false,
        error: error instanceof Error ? error.message : 'Batch fetch failed'
      }));
    }
  }

  /**
   * キャッシュをクリア
   * @param did 特定のDIDをクリア（未指定時は全てクリア）
   */
  public clearCache(did?: string): void {
    if (did) {
      this.statsCache.delete(did);
      this.profileCache.delete(did);
      console.log(`📊 [ProfileService] Cache cleared for ${did}`);
    } else {
      this.statsCache.clear();
      this.profileCache.clear();
      console.log(`📊 [ProfileService] All cache cleared`);
    }
  }

  /**
   * キャッシュサイズを取得（デバッグ用）
   */
  public getCacheSize(): { stats: number; profiles: number; total: number } {
    return {
      stats: this.statsCache.size,
      profiles: this.profileCache.size,
      total: this.statsCache.size + this.profileCache.size
    };
  }

  /**
   * 統計キャッシュの状態を取得（デバッグ用）
   */
  public getStatsCacheInfo(): Array<{ did: string; lastUpdated: Date; expiresIn: number }> {
    const now = Date.now();
    return Array.from(this.statsCache.entries()).map(([did, entry]) => ({
      did,
      lastUpdated: entry.stats.lastUpdated,
      expiresIn: Math.max(0, entry.expiredAt - now)
    }));
  }

  /**
   * プロフィールキャッシュの状態を取得（デバッグ用）
   */
  public getProfileCacheInfo(): Array<{ did: string; lastUpdated: Date; expiresIn: number }> {
    const now = Date.now();
    return Array.from(this.profileCache.entries()).map(([did, entry]) => ({
      did,
      lastUpdated: entry.profile.lastUpdated,
      expiresIn: Math.max(0, entry.expiredAt - now)
    }));
  }
}

/**
 * プロフィールサービスインスタンス（シングルトン）
 */
export const profileService = new ProfileService();