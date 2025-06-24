/**
 * swipeConfig.ts
 * スワイプ機能関連の設定定数
 * 
 * マジックナンバーを排除し、調整可能な設定として集約
 */

/**
 * スワイプ検出設定
 */
export const SWIPE_CONFIG = {
  /**
   * 最小スワイプ距離（ピクセル）
   * 15px = 軽いタッチでも確実に反応する高感度設定
   */
  TOUCH_THRESHOLD_PX: 15,
  
  /**
   * 最小スワイプ速度
   * 0.1 = 非常にゆっくりなスワイプでも検出
   */
  MIN_VELOCITY: 0.1,
  
  /**
   * スワイプクールダウン期間（ミリ秒）
   * 100ms = 超高速連続操作への対応
   */
  COOLDOWN_MS: 100,
  
  /**
   * スワイプアニメーション自動リセット時間（ミリ秒）
   * 100ms = アニメーション完了後の確実なリセット
   */
  ANIMATION_RESET_MS: 100,
  
  /**
   * 強制開始しきい値（ミリ秒）
   * 80ms = 高速連続操作時の強制開始判定
   */
  FORCE_START_THRESHOLD_MS: 80
} as const;

/**
 * 循環ナビゲーション設定
 */
export const NAVIGATION_CONFIG = {
  /**
   * 遷移保護期間（ミリ秒）
   * 500ms = 循環移動の確実な完了を保証
   */
  TRANSITION_PROTECT_MS: 500,
  
  /**
   * 遷移クリーンアップ時間（ミリ秒）
   * 300ms = 循環移動対応のための延長タイムアウト
   */
  CLEANUP_TIMEOUT_MS: 300,
  
  /**
   * CSS遷移時間（ミリ秒）
   * 150ms = 視覚的に滑らかな遷移時間
   */
  CSS_TRANSITION_MS: 150
} as const;

/**
 * IntersectionObserver設定
 */
export const INTERSECTION_CONFIG = {
  /**
   * 可視性判定しきい値
   * 0.8 = 80%以上表示されている場合にアクティブと判定
   * 誤検出防止のための高めの設定
   */
  VISIBILITY_THRESHOLD: 0.8,
  
  /**
   * デバウンス遅延（ミリ秒）
   * 300ms = 短時間の連続更新を防ぐ
   */
  DEBOUNCE_DELAY_MS: 300
} as const;

/**
 * パフォーマンス監視設定
 */
export const PERFORMANCE_CONFIG = {
  /**
   * スワイプレイテンシの警告しきい値（ミリ秒）
   * 16ms = 60FPS維持のための理想的なフレーム時間
   */
  SWIPE_LATENCY_WARNING_MS: 16,
  
  /**
   * アニメーション遅延の警告しきい値（ミリ秒）
   * 100ms = ユーザーが遅延を感じ始める時間
   */
  ANIMATION_DELAY_WARNING_MS: 100
} as const;

/**
 * 設定値の型安全性チェック
 */
export type SwipeConfigKeys = keyof typeof SWIPE_CONFIG;
export type NavigationConfigKeys = keyof typeof NAVIGATION_CONFIG;
export type IntersectionConfigKeys = keyof typeof INTERSECTION_CONFIG;

/**
 * 実行時設定検証（開発環境のみ）
 */
export const validateConfig = (): boolean => {
  const validations = [
    SWIPE_CONFIG.TOUCH_THRESHOLD_PX > 0,
    SWIPE_CONFIG.MIN_VELOCITY > 0,
    NAVIGATION_CONFIG.TRANSITION_PROTECT_MS > NAVIGATION_CONFIG.CSS_TRANSITION_MS,
    INTERSECTION_CONFIG.VISIBILITY_THRESHOLD > 0 && INTERSECTION_CONFIG.VISIBILITY_THRESHOLD <= 1
  ];
  
  return validations.every(Boolean);
};