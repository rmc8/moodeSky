/**
 * TimelineService - シンプルなタイムライン取得サービス
 * 段階的実装: まずは基本的なAPI接続のみ
 */

import { BskyAgent } from '@atproto/api';
import type { Account } from '$lib/types/auth.js';
import { authService } from './authStore.js';

/**
 * シンプルなタイムライン取得サービス
 */
export class TimelineService {
  private agent: BskyAgent | null = null;

  /**
   * BskyAgentを初期化
   */
  private async initializeAgent(account: Account): Promise<boolean> {
    try {
      this.agent = new BskyAgent({
        service: 'https://bsky.social'
      });

      // セッションの復元を試行
      const accountResult = await authService.getAccountById(account.id);
      if (accountResult.success && accountResult.data?.session) {
        await this.agent.resumeSession(accountResult.data.session);
        return true;
      }

      console.error('No valid session found for account:', account.id);
      return false;
    } catch (error) {
      console.error('Failed to initialize agent:', error);
      return false;
    }
  }

  /**
   * ホームタイムラインを取得
   */
  async getTimeline(account: Account): Promise<any[]> {
    try {
      // エージェント初期化
      const initialized = await this.initializeAgent(account);
      if (!initialized || !this.agent) {
        throw new Error('Failed to initialize agent');
      }

      // タイムライン取得
      const response = await this.agent.getTimeline({
        limit: 50
      });

      if (response.success && response.data.feed) {
        console.log('Timeline loaded:', response.data.feed.length, 'posts');
        return response.data.feed;
      }

      throw new Error('Failed to fetch timeline');
    } catch (error) {
      console.error('Timeline fetch error:', error);
      throw error;
    }
  }
}

// シングルトンインスタンス
export const timelineService = new TimelineService();