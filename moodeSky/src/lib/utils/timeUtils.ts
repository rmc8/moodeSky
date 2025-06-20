/**
 * 時間計算ユーティリティ
 * トークン期限の表示用時間フォーマット機能
 */

/**
 * 時間単位の種類
 */
export type TimeUnit = 'days' | 'hours' | 'minutes' | 'expired';

/**
 * 残り時間情報
 */
export interface TimeRemaining {
  /** 時間単位 */
  unit: TimeUnit;
  /** 値 */
  value: number;
  /** 期限切れかどうか */
  isExpired: boolean;
  /** 警告レベル */
  warningLevel: 'normal' | 'warning' | 'critical' | 'expired';
}

/**
 * 秒数から残り時間情報を計算
 * 
 * @param seconds 残り秒数
 * @returns 残り時間情報
 */
export function calculateTimeRemaining(seconds: number): TimeRemaining {
  // 期限切れの場合
  if (seconds <= 0) {
    return {
      unit: 'expired',
      value: 0,
      isExpired: true,
      warningLevel: 'expired',
    };
  }

  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  // 表示単位と警告レベルの決定
  if (days > 0) {
    // 1日以上
    const warningLevel = days >= 7 ? 'normal' : days >= 1 ? 'warning' : 'critical';
    return {
      unit: 'days',
      value: days,
      isExpired: false,
      warningLevel,
    };
  } else if (hours > 0) {
    // 1時間以上24時間未満
    const warningLevel = hours >= 12 ? 'warning' : 'critical';
    return {
      unit: 'hours',
      value: hours,
      isExpired: false,
      warningLevel,
    };
  } else {
    // 1時間未満
    return {
      unit: 'minutes',
      value: Math.max(1, minutes), // 最低1分として表示
      isExpired: false,
      warningLevel: 'critical',
    };
  }
}

/**
 * Date オブジェクトから残り時間を計算
 * 
 * @param targetDate 目標日時
 * @param currentDate 現在日時（省略時は現在時刻）
 * @returns 残り時間情報
 */
export function calculateTimeRemainingFromDate(
  targetDate: Date,
  currentDate: Date = new Date()
): TimeRemaining {
  const diffMs = targetDate.getTime() - currentDate.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  
  return calculateTimeRemaining(diffSeconds);
}

/**
 * 警告レベルに対応するCSSクラス名を取得
 * 
 * @param warningLevel 警告レベル
 * @returns CSSクラス名
 */
export function getWarningLevelClass(warningLevel: TimeRemaining['warningLevel']): string {
  switch (warningLevel) {
    case 'normal':
      return 'text-success'; // 緑色
    case 'warning':
      return 'text-warning'; // 黄色
    case 'critical':
      return 'text-error'; // オレンジ
    case 'expired':
      return 'text-error'; // 赤色
    default:
      return 'text-themed';
  }
}

/**
 * 警告レベルに対応するアイコンを取得
 * 
 * @param warningLevel 警告レベル
 * @returns アイコン名
 */
export function getWarningLevelIcon(warningLevel: TimeRemaining['warningLevel']): string {
  switch (warningLevel) {
    case 'normal':
      return 'check_circle'; // 正常
    case 'warning':
      return 'schedule'; // 注意
    case 'critical':
      return 'warning'; // 警告
    case 'expired':
      return 'error'; // エラー
    default:
      return 'info';
  }
}

/**
 * 次の更新タイミングまでの秒数を計算
 * 期限表示の更新頻度を最適化するため
 * 
 * @param timeRemaining 残り時間情報
 * @returns 次の更新までの秒数
 */
export function getNextUpdateInterval(timeRemaining: TimeRemaining): number {
  if (timeRemaining.isExpired) {
    return 60; // 期限切れ時は1分間隔
  }

  switch (timeRemaining.unit) {
    case 'days':
      return 3600; // 1時間間隔
    case 'hours':
      return 300; // 5分間隔
    case 'minutes':
      return 60; // 1分間隔
    default:
      return 60;
  }
}

/**
 * 人間が読みやすい相対時間文字列を生成（デバッグ用）
 * 
 * @param seconds 秒数
 * @returns 相対時間文字列
 */
export function formatRelativeTime(seconds: number): string {
  if (seconds <= 0) {
    return 'expired';
  }

  const timeRemaining = calculateTimeRemaining(seconds);
  
  switch (timeRemaining.unit) {
    case 'days':
      return `${timeRemaining.value} day(s)`;
    case 'hours':
      return `${timeRemaining.value} hour(s)`;
    case 'minutes':
      return `${timeRemaining.value} minute(s)`;
    case 'expired':
      return 'expired';
    default:
      return `${seconds} second(s)`;
  }
}

/**
 * Unix timestamp から Date オブジェクトを安全に作成
 * 
 * @param timestamp Unix timestamp（秒）
 * @returns Date オブジェクトまたは null
 */
export function safeCreateDate(timestamp: number): Date | null {
  try {
    if (!Number.isFinite(timestamp) || timestamp <= 0) {
      return null;
    }
    
    const date = new Date(timestamp * 1000);
    
    // 無効な日付の検証
    if (isNaN(date.getTime())) {
      return null;
    }
    
    return date;
  } catch (error) {
    console.warn('Failed to create date from timestamp:', timestamp, error);
    return null;
  }
}