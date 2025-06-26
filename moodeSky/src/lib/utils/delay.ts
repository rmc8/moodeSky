/**
 * delay.ts
 * シンプルな遅延ユーティリティ
 * 
 * Promise ベースの遅延関数とナビゲーション遅延ヘルパー
 */

import { goto } from '$app/navigation';
import { createComponentLogger } from './logger.js';

const log = createComponentLogger('DelayUtils');

/**
 * Promise ベースの遅延関数
 * @param ms 遅延時間（ミリ秒）
 * @returns Promise that resolves after the specified delay
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

/**
 * キャンセル可能な遅延関数
 * @param ms 遅延時間（ミリ秒）
 * @returns オブジェクト { promise, cancel }
 */
export function cancellableDelay(ms: number): {
  promise: Promise<void>;
  cancel: () => void;
} {
  let timeoutId: ReturnType<typeof setTimeout>;
  let cancelled = false;

  const promise = new Promise<void>((resolve, reject) => {
    timeoutId = setTimeout(() => {
      if (!cancelled) {
        resolve();
      }
    }, ms);
  });

  const cancel = () => {
    cancelled = true;
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  };

  return { promise, cancel };
}

/**
 * 安全な遅延ナビゲーション
 * エラーハンドリングとログ出力を含む
 * @param path 遷移先パス
 * @param delayMs 遅延時間（ミリ秒）
 * @param context コンテキスト情報（ログ用）
 */
export async function delayedGoto(
  path: string, 
  delayMs: number = 800, 
  context?: string
): Promise<void> {
  try {
    log.debug('遅延ナビゲーション開始', {
      path,
      delayMs,
      context
    });

    await delay(delayMs);

    log.debug('遅延ナビゲーション実行', { path });
    await goto(path);

    log.info('遅延ナビゲーション完了', { path, context });
  } catch (error) {
    log.error('遅延ナビゲーション失敗', {
      path,
      context,
      error
    });
    throw error;
  }
}

/**
 * キャンセル可能な遅延ナビゲーション
 * コンポーネントの unmount 時などにキャンセル可能
 * @param path 遷移先パス
 * @param delayMs 遅延時間（ミリ秒）
 * @param context コンテキスト情報（ログ用）
 */
export function cancellableDelayedGoto(
  path: string,
  delayMs: number = 800,
  context?: string
): {
  promise: Promise<void>;
  cancel: () => void;
} {
  let navigationCancelled = false;
  const { promise: delayPromise, cancel: cancelDelay } = cancellableDelay(delayMs);

  const navigationPromise = delayPromise.then(async () => {
    if (!navigationCancelled) {
      log.debug('キャンセル可能遅延ナビゲーション実行', { path, context });
      await goto(path);
      log.info('キャンセル可能遅延ナビゲーション完了', { path, context });
    }
  }).catch(error => {
    if (!navigationCancelled) {
      log.error('キャンセル可能遅延ナビゲーション失敗', {
        path,
        context,
        error
      });
      throw error;
    }
  });

  const cancel = () => {
    navigationCancelled = true;
    cancelDelay();
    log.debug('遅延ナビゲーションキャンセル', { path, context });
  };

  return {
    promise: navigationPromise,
    cancel
  };
}

/**
 * 複数の遅延操作を管理するクラス
 * コンポーネント内で複数の遅延処理を安全に管理
 */
export class DelayManager {
  private delays: Array<{ cancel: () => void }> = [];

  /**
   * 管理対象の遅延を追加
   */
  add(cancellableDelay: { cancel: () => void }): void {
    this.delays.push(cancellableDelay);
  }

  /**
   * すべての遅延をキャンセル
   */
  cancelAll(): void {
    this.delays.forEach(delay => delay.cancel());
    this.delays = [];
    log.debug('すべての遅延操作をキャンセル', { count: this.delays.length });
  }

  /**
   * 管理対象をクリア（キャンセルはしない）
   */
  clear(): void {
    this.delays = [];
  }
}