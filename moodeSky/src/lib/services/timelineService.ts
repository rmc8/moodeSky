/**
 * Enhanced TimelineService - 高度なタイムライン管理サービス
 * 
 * 機能:
 * - Cursor ベースページネーション
 * - 新しいポスト取得（リフレッシュ）
 * - 古いポスト取得（無限スクロール） 
 * - 重複除去と並び替え
 * - キャッシュ管理
 * - エラーハンドリング
 * 
 * tokimekibluesky参考の最新実装
 */

import type { Agent } from './agent.js';
import type { Account } from '$lib/types/auth.js';
import { createComponentLogger } from '../utils/logger.js';
import { convertMcpTimelineToSimplePosts } from '../utils/mcpDataConverter.js';
import type { SimplePost } from '$lib/types/post.js';

const log = createComponentLogger('TimelineService');

/**
 * タイムライン取得エラーの種類
 */
export enum TimelineErrorType {
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  API_ERROR = 'API_ERROR',
  INITIALIZATION_ERROR = 'INITIALIZATION_ERROR',
  CURSOR_ERROR = 'CURSOR_ERROR'
}

/**
 * タイムライン取得エラー
 */
export class TimelineError extends Error {
  constructor(
    public readonly type: TimelineErrorType,
    message: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'TimelineError';
  }
}

/**
 * タイムライン取得オプション
 */
export interface TimelineOptions {
  cursor?: string;
  limit?: number;
  algorithm?: string;
  refreshMode?: boolean;  // リフレッシュ時はtrueにする
}

/**
 * タイムライン取得結果
 */
export interface TimelineResult {
  feed: any[];
  cursor?: string;
  hasMore: boolean;
  total: number;
  newPostsCount?: number; // リフレッシュ時の新しいポスト数
}

/**
 * タイムラインキャッシュエントリー
 */
interface TimelineCacheEntry {
  feed: any[];
  cursor?: string;
  lastUpdated: Date;
  hasMore: boolean;
}

/**
 * Enhanced Agent注入型タイムライン取得サービス
 */
export class TimelineService {
  private cache = new Map<string, TimelineCacheEntry>();
  private readonly CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5分
  private readonly DEFAULT_LIMIT = 25;
  private readonly MAX_LIMIT = 100;

  /**
   * ホームタイムラインを取得（基本版 - 後方互換性）
   */
  async getTimeline(account: Account, agent: Agent): Promise<any[]> {
    const result = await this.getTimelineWithCursor(account, agent, { limit: 50 });
    return result.feed;
  }

  /**
   * Cursor対応タイムライン取得（メイン実装）
   */
  async getTimelineWithCursor(
    account: Account, 
    agent: Agent, 
    options: TimelineOptions = {}
  ): Promise<TimelineResult> {
    const { 
      cursor, 
      limit = this.DEFAULT_LIMIT, 
      algorithm = 'home',
      refreshMode = false 
    } = options;

    try {
      log.info('Getting timeline with cursor', {
        account: account.profile.handle,
        cursor: cursor ? `${cursor.slice(0, 10)}...` : 'none',
        limit,
        algorithm,
        refreshMode
      });

      // 制限値チェック
      const safeLimit = Math.min(Math.max(1, limit), this.MAX_LIMIT);
      
      // キャッシュキー生成
      const cacheKey = `${account.profile.did}_${algorithm}`;
      
      // リフレッシュモードでない場合はキャッシュをチェック
      if (!refreshMode && !cursor) {
        const cached = this.getCachedTimeline(cacheKey);
        if (cached) {
          log.debug('Returning cached timeline', { 
            account: account.profile.handle,
            cachedPostsCount: cached.feed.length 
          });
          return {
            feed: cached.feed,
            cursor: cached.cursor,
            hasMore: cached.hasMore,
            total: cached.feed.length
          };
        }
      }

      // AT Protocol API呼び出し
      const apiParams: any = {
        algorithm,
        limit: safeLimit
      };
      
      if (cursor) {
        apiParams.cursor = cursor;
      }
      
      log.debug('Calling AT Protocol getTimeline', { apiParams });
      const response = await agent.agent.getTimeline(apiParams);

      if (!response.success || !response.data.feed) {
        throw new TimelineError(
          TimelineErrorType.API_ERROR,
          'タイムラインの取得に失敗しました',
          new Error(`API response was not successful: ${response.data}`)
        );
      }

      const { feed, cursor: nextCursor } = response.data;
      const hasMore = !!nextCursor;
      
      log.info('Timeline API response', {
        postsCount: feed.length,
        hasNextCursor: !!nextCursor,
        hasMore,
        account: account.profile.handle
      });

      // 重複除去処理
      const deduplicatedFeed = this.deduplicateAndSort(feed);
      
      const result: TimelineResult = {
        feed: deduplicatedFeed,
        cursor: nextCursor,
        hasMore,
        total: deduplicatedFeed.length
      };

      // リフレッシュモードの場合、新しいポスト数を計算
      if (refreshMode) {
        const cached = this.cache.get(cacheKey);
        if (cached) {
          result.newPostsCount = this.calculateNewPostsCount(deduplicatedFeed, cached.feed);
          log.info('Refresh completed', { 
            newPostsCount: result.newPostsCount,
            account: account.profile.handle 
          });
        }
      }

      // キャッシュを更新（cursor がない場合のみ）
      if (!cursor) {
        this.updateCache(cacheKey, {
          feed: deduplicatedFeed,
          cursor: nextCursor,
          lastUpdated: new Date(),
          hasMore
        });
      }

      return result;
    } catch (error) {
      log.error('Timeline fetch error', { error, account: account.profile.handle });
      
      // エラーメッセージから種類を判定
      const errorMessage = error instanceof Error ? error.message.toLowerCase() : '';
      
      if (errorMessage.includes('cursor')) {
        throw new TimelineError(
          TimelineErrorType.CURSOR_ERROR,
          'タイムラインの続きを取得できませんでした。再読み込みをお試しください。',
          error instanceof Error ? error : new Error(String(error))
        );
      }
      
      if (errorMessage.includes('expired') || errorMessage.includes('invalid') || errorMessage.includes('token')) {
        throw new TimelineError(
          TimelineErrorType.SESSION_EXPIRED,
          'このアカウントのセッションが期限切れです。アカウント管理で確認してください。',
          error instanceof Error ? error : new Error(String(error))
        );
      }
      
      if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        throw new TimelineError(
          TimelineErrorType.NETWORK_ERROR,
          'ネットワークエラーが発生しました。接続を確認してください。',
          error instanceof Error ? error : new Error(String(error))
        );
      }

      throw new TimelineError(
        TimelineErrorType.API_ERROR,
        'タイムラインの取得中に予期しないエラーが発生しました',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * 新しいポストを取得（リフレッシュ）
   */
  async refreshTimeline(
    account: Account, 
    agent: Agent, 
    algorithm: string = 'home'
  ): Promise<TimelineResult> {
    log.info('Refreshing timeline', { account: account.profile.handle, algorithm });
    
    // キャッシュをクリア
    const cacheKey = `${account.profile.did}_${algorithm}`;
    this.clearCache(cacheKey);
    
    return this.getTimelineWithCursor(account, agent, {
      algorithm,
      refreshMode: true,
      limit: this.DEFAULT_LIMIT
    });
  }

  /**
   * 古いポストを取得（無限スクロール）
   */
  async loadMorePosts(
    account: Account, 
    agent: Agent, 
    cursor: string,
    algorithm: string = 'home'
  ): Promise<TimelineResult> {
    log.info('Loading more posts', { 
      account: account.profile.handle, 
      cursor: cursor.slice(0, 10) + '...', 
      algorithm 
    });
    
    return this.getTimelineWithCursor(account, agent, {
      cursor,
      algorithm,
      limit: this.DEFAULT_LIMIT
    });
  }

  /**
   * 重複除去と並び替え
   */
  private deduplicateAndSort(feed: any[]): any[] {
    const deduplicationMap = new Map<string, any>();
    
    for (const item of feed) {
      const post = item.post || item;
      const uri = post.uri;
      
      if (uri && !deduplicationMap.has(uri)) {
        deduplicationMap.set(uri, item);
      }
    }
    
    // 時系列順でソート（新しい順）
    const deduplicatedFeed = Array.from(deduplicationMap.values());
    deduplicatedFeed.sort((a, b) => {
      const timeA = a.post?.indexedAt || a.indexedAt || a.post?.record?.createdAt;
      const timeB = b.post?.indexedAt || b.indexedAt || b.post?.record?.createdAt;
      return new Date(timeB).getTime() - new Date(timeA).getTime();
    });
    
    return deduplicatedFeed;
  }

  /**
   * キャッシュされたタイムラインを取得
   */
  private getCachedTimeline(cacheKey: string): TimelineCacheEntry | null {
    const cached = this.cache.get(cacheKey);
    if (!cached) return null;
    
    // 期限切れチェック
    const now = new Date();
    const elapsed = now.getTime() - cached.lastUpdated.getTime();
    
    if (elapsed > this.CACHE_EXPIRY_MS) {
      this.cache.delete(cacheKey);
      return null;
    }
    
    return cached;
  }

  /**
   * キャッシュを更新
   */
  private updateCache(cacheKey: string, entry: TimelineCacheEntry): void {
    this.cache.set(cacheKey, entry);
    
    // メモリ制限: 最大50エントリー
    if (this.cache.size > 50) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
  }

  /**
   * 特定のキャッシュをクリア
   */
  private clearCache(cacheKey: string): void {
    this.cache.delete(cacheKey);
    log.debug('Cache cleared', { cacheKey });
  }

  /**
   * 新しいポスト数を計算
   */
  private calculateNewPostsCount(newFeed: any[], oldFeed: any[]): number {
    const oldUris = new Set(oldFeed.map(item => {
      const post = item.post || item;
      return post.uri;
    }));
    
    let newPostsCount = 0;
    for (const item of newFeed) {
      const post = item.post || item;
      if (!oldUris.has(post.uri)) {
        newPostsCount++;
      }
    }
    
    return newPostsCount;
  }

  /**
   * MCPから取得したタイムラインデータを処理
   * @param mcpTimelineData - MCPのタイムラインレスポンス
   * @returns SimplePost配列
   */
  processMcpTimeline(mcpTimelineData: any): SimplePost[] {
    try {
      log.info('Processing MCP timeline data', {
        hasData: !!mcpTimelineData?.data,
        feedLength: mcpTimelineData?.data?.feed?.length || 0
      });

      const posts = convertMcpTimelineToSimplePosts(mcpTimelineData);
      
      log.info('MCP timeline processed', {
        originalCount: mcpTimelineData?.data?.feed?.length || 0,
        convertedCount: posts.length,
        postsWithFacets: posts.filter(p => p.facets && p.facets.length > 0).length
      });

      return posts;
    } catch (error) {
      log.error('Failed to process MCP timeline data', { error });
      return [];
    }
  }

  /**
   * 全キャッシュをクリア
   */
  clearAllCache(): void {
    this.cache.clear();
    log.info('All timeline cache cleared');
  }

  /**
   * キャッシュ統計を取得
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * デバッグ用: タイムライン統計を表示
   */
  debugTimelineStats(feed: any[]): void {
    const stats = {
      totalPosts: feed.length,
      postsWithEmbeds: feed.filter(item => {
        const post = item.post || item;
        return post.embed || (post.embeds && post.embeds.length > 0);
      }).length,
      reposts: feed.filter(item => item.reason?.$type === 'app.bsky.feed.defs#reasonRepost').length,
      replies: feed.filter(item => {
        const post = item.post || item;
        return post.record?.reply;
      }).length
    };
    
    log.debug('Timeline statistics', stats);
  }
}

// シングルトンインスタンス
export const timelineService = new TimelineService();