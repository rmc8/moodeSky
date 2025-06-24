/**
 * errorHandler.ts
 * 構造化エラーハンドリング
 * 
 * スワイプ・ナビゲーション機能の確実なエラー処理と復旧
 */

import { debugError, debugWarn, debugLog } from '$lib/utils/debugUtils.js';

/**
 * エラー分類
 */
export enum SwipeErrorType {
  NAVIGATION_FAILED = 'navigation_failed',
  ELEMENT_NOT_FOUND = 'element_not_found',
  STATE_CORRUPTION = 'state_corruption',
  ANIMATION_TIMEOUT = 'animation_timeout',
  INTERSECTION_ERROR = 'intersection_error'
}

/**
 * エラー情報構造
 */
export interface SwipeErrorInfo {
  type: SwipeErrorType;
  context: string;
  timestamp: number;
  data?: Record<string, any>;
  userAction?: string;
}

/**
 * エラー復旧戦略
 */
export interface RecoveryStrategy {
  canRecover: boolean;
  action: () => void;
  description: string;
}

/**
 * 構造化エラーハンドラー
 */
export class SwipeErrorHandler {
  private errorHistory: SwipeErrorInfo[] = [];
  private maxHistorySize = 10;

  /**
   * エラー処理とログ記録
   */
  handleError(
    error: Error | unknown, 
    errorInfo: Partial<SwipeErrorInfo>,
    recovery?: RecoveryStrategy
  ): void {
    const structuredError: SwipeErrorInfo = {
      type: errorInfo.type || SwipeErrorType.NAVIGATION_FAILED,
      context: errorInfo.context || 'unknown',
      timestamp: Date.now(),
      data: errorInfo.data,
      userAction: errorInfo.userAction
    };

    // エラー履歴に追加
    this.addToHistory(structuredError);

    // エラーログ出力
    debugError(`🚨 [SwipeError] ${structuredError.type} in ${structuredError.context}`, {
      error: error instanceof Error ? error.message : String(error),
      errorInfo: structuredError,
      stack: error instanceof Error ? error.stack : undefined
    });

    // 復旧戦略の実行
    if (recovery?.canRecover) {
      debugLog(`🔧 [Recovery] Attempting recovery: ${recovery.description}`);
      try {
        recovery.action();
        debugLog(`✅ [Recovery] Successfully recovered from ${structuredError.type}`);
      } catch (recoveryError) {
        debugError(`💥 [Recovery] Recovery failed:`, recoveryError);
        this.handleCriticalError(structuredError);
      }
    } else {
      this.handleCriticalError(structuredError);
    }
  }

  /**
   * 重大エラーの処理
   */
  private handleCriticalError(errorInfo: SwipeErrorInfo): void {
    debugWarn(`🚨 [Critical] Unrecoverable error in ${errorInfo.context}`);
    
    // フォールバック: 安全な状態への復帰
    this.fallbackToSafeState();
  }

  /**
   * 安全な状態への復帰
   */
  private fallbackToSafeState(): void {
    debugLog('🛡️ [Fallback] Attempting fallback to safe state');
    
    // カスタムイベントで親コンポーネントに通知
    const event = new CustomEvent('swipeSystemError', {
      detail: {
        timestamp: Date.now(),
        action: 'fallback_initiated',
        errorHistory: this.getRecentErrors()
      }
    });
    
    window.dispatchEvent(event);
  }

  /**
   * エラー履歴管理
   */
  private addToHistory(errorInfo: SwipeErrorInfo): void {
    this.errorHistory.unshift(errorInfo);
    
    // 履歴サイズ制限
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(0, this.maxHistorySize);
    }
  }

  /**
   * 最近のエラー取得
   */
  getRecentErrors(count: number = 5): SwipeErrorInfo[] {
    return this.errorHistory.slice(0, count);
  }

  /**
   * エラー統計
   */
  getErrorStats(): Record<SwipeErrorType, number> {
    const stats: Record<SwipeErrorType, number> = {
      [SwipeErrorType.NAVIGATION_FAILED]: 0,
      [SwipeErrorType.ELEMENT_NOT_FOUND]: 0,
      [SwipeErrorType.STATE_CORRUPTION]: 0,
      [SwipeErrorType.ANIMATION_TIMEOUT]: 0,
      [SwipeErrorType.INTERSECTION_ERROR]: 0
    };

    this.errorHistory.forEach(error => {
      stats[error.type]++;
    });

    return stats;
  }

  /**
   * エラー履歴クリア
   */
  clearHistory(): void {
    this.errorHistory = [];
    debugLog('🧹 [ErrorHandler] Error history cleared');
  }
}

/**
 * グローバルエラーハンドラーインスタンス
 */
export const swipeErrorHandler = new SwipeErrorHandler();

/**
 * よく使用される復旧戦略
 */
export const CommonRecoveryStrategies = {
  /**
   * 状態リセット復旧
   */
  resetState: (resetFn: () => void): RecoveryStrategy => ({
    canRecover: true,
    action: resetFn,
    description: 'Reset component state'
  }),

  /**
   * 要素再取得復旧
   */
  refetchElement: (refetchFn: () => boolean): RecoveryStrategy => ({
    canRecover: true,
    action: () => {
      if (!refetchFn()) {
        throw new Error('Element refetch failed');
      }
    },
    description: 'Refetch DOM element'
  }),

  /**
   * アニメーション強制終了復旧
   */
  forceAnimationEnd: (endFn: () => void): RecoveryStrategy => ({
    canRecover: true,
    action: endFn,
    description: 'Force end animation'
  }),

  /**
   * 復旧不可能
   */
  unrecoverable: (): RecoveryStrategy => ({
    canRecover: false,
    action: () => {},
    description: 'Unrecoverable error'
  })
};