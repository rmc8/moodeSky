/**
 * 相対日時表示ユーティリティ
 * ソーシャルメディア風の簡潔な相対時間表示を提供
 */

/**
 * 相対時間を簡潔な形式で表示
 * @param date - 対象の日時（Date オブジェクトまたは ISO 文字列）
 * @param now - 現在時刻（省略時は現在時刻を使用）
 * @returns 相対時間の文字列 ("1分", "3時間", "2日前" など)
 */
export function formatRelativeTime(date: Date | string, now?: Date): string {
  try {
    const targetDate = typeof date === 'string' ? new Date(date) : date;
    const currentDate = now || new Date();
    
    // 不正な日時の場合
    if (isNaN(targetDate.getTime())) {
      return '日時不明';
    }
    
    const diffMs = currentDate.getTime() - targetDate.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    // 未来の日時の場合
    if (diffMs < 0) {
      const absDiffSeconds = Math.abs(diffSeconds);
      const absDiffMinutes = Math.abs(diffMinutes);
      const absDiffHours = Math.abs(diffHours);
      const absDiffDays = Math.abs(diffDays);
      
      if (absDiffDays >= 1) {
        return `${absDiffDays}日後`;
      } else if (absDiffHours >= 1) {
        return `${absDiffHours}時間後`;
      } else if (absDiffMinutes >= 1) {
        return `${absDiffMinutes}分後`;
      } else {
        return '数秒後';
      }
    }

    // 過去の日時の場合
    if (diffYears >= 1) {
      return `${diffYears}年前`;
    } else if (diffMonths >= 1) {
      return `${diffMonths}ヶ月前`;
    } else if (diffWeeks >= 1) {
      return `${diffWeeks}週間前`;
    } else if (diffDays >= 1) {
      return `${diffDays}日前`;
    } else if (diffHours >= 1) {
      return `${diffHours}時間前`;
    } else if (diffMinutes >= 1) {
      return `${diffMinutes}分前`;
    } else if (diffSeconds >= 30) {
      return `${diffSeconds}秒前`;
    } else {
      return 'たった今';
    }
  } catch (error) {
    console.error('Failed to format relative time:', error);
    return '日時不明';
  }
}

/**
 * より詳細な相対時間表示（ツールチップ等で使用）
 * @param date - 対象の日時
 * @param now - 現在時刻（省略時は現在時刻を使用）
 * @returns 詳細な相対時間の説明
 */
export function formatDetailedRelativeTime(date: Date | string, now?: Date): string {
  try {
    const targetDate = typeof date === 'string' ? new Date(date) : date;
    const currentDate = now || new Date();
    
    if (isNaN(targetDate.getTime())) {
      return '不正な日時です';
    }
    
    const diffMs = currentDate.getTime() - targetDate.getTime();
    const absDiffMs = Math.abs(diffMs);
    
    const seconds = Math.floor(absDiffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    const prefix = diffMs < 0 ? '' : '';
    const suffix = diffMs < 0 ? '後' : '前';
    
    if (days >= 1) {
      const remainingHours = hours % 24;
      if (remainingHours > 0) {
        return `${prefix}${days}日${remainingHours}時間${suffix}`;
      } else {
        return `${prefix}${days}日${suffix}`;
      }
    } else if (hours >= 1) {
      const remainingMinutes = minutes % 60;
      if (remainingMinutes > 0) {
        return `${prefix}${hours}時間${remainingMinutes}分${suffix}`;
      } else {
        return `${prefix}${hours}時間${suffix}`;
      }
    } else if (minutes >= 1) {
      const remainingSeconds = seconds % 60;
      if (remainingSeconds > 0) {
        return `${prefix}${minutes}分${remainingSeconds}秒${suffix}`;
      } else {
        return `${prefix}${minutes}分${suffix}`;
      }
    } else {
      return diffMs >= 0 ? (seconds <= 30 ? 'たった今' : `${seconds}秒前`) : `${seconds}秒後`;
    }
  } catch (error) {
    console.error('Failed to format detailed relative time:', error);
    return '日時の計算に失敗しました';
  }
}

/**
 * 絶対日時表示（ツールチップ等で使用）
 * @param date - 対象の日時
 * @returns フォーマットされた絶対日時
 */
export function formatAbsoluteTime(date: Date | string): string {
  try {
    const targetDate = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(targetDate.getTime())) {
      return '不正な日時';
    }
    
    return targetDate.toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch (error) {
    console.error('Failed to format absolute time:', error);
    return '日時の表示に失敗しました';
  }
}