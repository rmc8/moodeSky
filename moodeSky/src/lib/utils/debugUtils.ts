/**
 * debugUtils.ts
 * 開発・本番環境分離用デバッグユーティリティ
 * 
 * 本番環境でのパフォーマンス影響とセキュリティリスクを防止
 */

/**
 * 開発環境判定
 */
export const isDevelopment = import.meta.env.DEV;

/**
 * 開発環境限定デバッグログ
 * 本番環境では完全に除去されるため、パフォーマンス影響なし
 */
export const debugLog = (message: string, data?: any): void => {
  if (isDevelopment) {
    console.log(message, data);
  }
};

/**
 * 開発環境限定警告ログ
 */
export const debugWarn = (message: string, data?: any): void => {
  if (isDevelopment) {
    console.warn(message, data);
  }
};

/**
 * 開発環境限定エラーログ
 * 本番環境でもエラーは表示（重要度が高いため）
 */
export const debugError = (message: string, error?: any): void => {
  if (isDevelopment) {
    console.error(message, error);
  } else {
    // 本番環境では最小限のエラー情報のみ
    console.error('Application error occurred');
  }
};

/**
 * 開発環境限定実行関数
 * 本番環境では実行されないため、開発専用処理に使用
 */
export const debugOnly = (fn: () => void): void => {
  if (isDevelopment) {
    fn();
  }
};

/**
 * パフォーマンス測定（開発環境限定）
 */
export const debugPerformance = {
  start: (label: string): void => {
    if (isDevelopment && performance.mark) {
      performance.mark(`${label}-start`);
    }
  },
  
  end: (label: string): void => {
    if (isDevelopment && performance.mark && performance.measure) {
      performance.mark(`${label}-end`);
      performance.measure(label, `${label}-start`, `${label}-end`);
      
      const measure = performance.getEntriesByName(label, 'measure')[0];
      if (measure) {
        console.log(`⏱️ [Performance] ${label}: ${measure.duration.toFixed(2)}ms`);
      }
    }
  }
};