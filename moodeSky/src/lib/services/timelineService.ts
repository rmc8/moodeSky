/**
 * TimelineService - Agentを受け取るタイムライン取得サービス
 * グローバルAgent管理との統合により自動セッション管理を実現
 */

import type { Agent } from './agent.js';
import type { Account } from '$lib/types/auth.js';

/**
 * タイムライン取得エラーの種類
 */
export enum TimelineErrorType {
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  API_ERROR = 'API_ERROR',
  INITIALIZATION_ERROR = 'INITIALIZATION_ERROR'
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
 * Agent注入型タイムライン取得サービス
 */
export class TimelineService {
  /**
   * ホームタイムラインを取得（Agent注入版）
   */
  async getTimeline(account: Account, agent: Agent): Promise<any[]> {
    try {
      console.log('🎛️ [TimelineService] Getting timeline with injected agent:', account.profile.handle);
      
      // 注入されたAgentを使用してタイムライン取得
      const response = await agent.agent.getTimeline({
        limit: 50
      });

      if (response.success && response.data.feed) {
        console.log('✅ [TimelineService] Timeline loaded:', response.data.feed.length, 'posts');
        return response.data.feed;
      }

      throw new TimelineError(
        TimelineErrorType.API_ERROR,
        'タイムラインの取得に失敗しました',
        new Error('API response was not successful')
      );
    } catch (error) {
      console.error('🎛️ [TimelineService] Timeline fetch error:', error);
      
      // エラーメッセージから期限切れを判定
      const errorMessage = error instanceof Error ? error.message.toLowerCase() : '';
      
      if (errorMessage.includes('expired') || errorMessage.includes('invalid') || errorMessage.includes('token')) {
        throw new TimelineError(
          TimelineErrorType.SESSION_EXPIRED,
          'セッションの有効期限が切れています。再ログインしてください。',
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

}

// シングルトンインスタンス
export const timelineService = new TimelineService();