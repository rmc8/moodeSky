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
 * 次の更新タイミングまでの秒数を計算（最適化版）
 * リアルタイム更新頻度を改善
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
      if (timeRemaining.value >= 30) {
        return 86400; // 30日以上: 1日間隔
      } else if (timeRemaining.value >= 7) {
        return 3600; // 7-29日: 1時間間隔
      } else {
        return 1800; // 1-6日: 30分間隔
      }
    case 'hours':
      if (timeRemaining.value >= 12) {
        return 1800; // 12時間以上: 30分間隔
      } else {
        return 300; // 12時間未満: 5分間隔
      }
    case 'minutes':
      return 60; // 1分間隔
    default:
      return 60;
  }
}

/**
 * より適切な更新間隔を計算（リアルタイム重視）
 * 
 * @param timeRemaining 残り時間情報
 * @returns 次の更新までの秒数
 */
export function getOptimalUpdateInterval(timeRemaining: TimeRemaining): number {
  if (timeRemaining.isExpired) {
    return 60; // 期限切れ時は1分間隔
  }

  switch (timeRemaining.unit) {
    case 'days':
      return timeRemaining.value >= 7 ? 3600 : 1800; // 7日以上: 1時間, 未満: 30分
    case 'hours':
      return timeRemaining.value >= 6 ? 300 : 120; // 6時間以上: 5分, 未満: 2分
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

/**
 * 絶対日時を言語に応じてフォーマット
 * 
 * @param date 日付オブジェクト
 * @param language 言語コード (ja, en, pt-BR, de, ko)
 * @param includeTime 時刻を含めるかどうか
 * @returns フォーマットされた日付文字列
 */
export function formatAbsoluteDate(
  date: Date, 
  language: string = 'ja', 
  includeTime: boolean = false
): string {
  try {
    const options: Intl.DateTimeFormatOptions = includeTime 
      ? { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric', 
          hour: '2-digit', 
          minute: '2-digit' 
        }
      : { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        };

    // 言語コードの正規化
    const normalizedLanguage = language.toLowerCase();
    let locale: string;

    switch (normalizedLanguage) {
      case 'ja':
        locale = 'ja-JP';
        break;
      case 'en':
        locale = 'en-US';
        break;
      case 'pt-br':
      case 'pt':
        locale = 'pt-BR';
        break;
      case 'de':
        locale = 'de-DE';
        break;
      case 'ko':
        locale = 'ko-KR';
        break;
      default:
        locale = 'en-US';
    }

    return new Intl.DateTimeFormat(locale, options).format(date);
  } catch (error) {
    console.warn('Failed to format date:', error);
    // フォールバック: ISO形式
    return includeTime 
      ? date.toLocaleString()
      : date.toLocaleDateString();
  }
}

/**
 * 詳細な期限表示テキストを生成
 * 
 * @param timeRemaining 残り時間情報
 * @param expirationDate 期限日時
 * @param language 言語コード
 * @param includeAbsoluteDate 絶対日時を含めるかどうか
 * @returns 詳細な期限表示テキスト用のデータ
 */
export function getDetailedExpirationInfo(
  timeRemaining: TimeRemaining,
  expirationDate: Date | null,
  language: string = 'ja',
  includeAbsoluteDate: boolean = true
): {
  relativeText: string;
  absoluteDate: string | null;
  aboutPrefix: string;
  untilSuffix: string;
} {
  // 相対時間のテキスト（プレフィックスなし）
  const relativeText = `${timeRemaining.value}${getUnitText(timeRemaining.unit, language)}`;
  
  // 絶対日時のフォーマット
  const absoluteDate = includeAbsoluteDate && expirationDate 
    ? formatAbsoluteDate(expirationDate, language, false)
    : null;

  // 言語別のプレフィックス・サフィックス
  const aboutPrefix = getAboutPrefix(language);
  const untilSuffix = getUntilSuffix(language);

  return {
    relativeText,
    absoluteDate,
    aboutPrefix,
    untilSuffix,
  };
}

/**
 * 時間単位のテキストを言語別に取得
 */
function getUnitText(unit: TimeUnit, language: string): string {
  const unitTexts: Record<string, Record<TimeUnit, string>> = {
    ja: { days: '日', hours: '時間', minutes: '分', expired: '' },
    en: { days: ' days', hours: ' hours', minutes: ' minutes', expired: '' },
    'pt-br': { days: ' dias', hours: ' horas', minutes: ' minutos', expired: '' },
    de: { days: ' Tage', hours: ' Stunden', minutes: ' Minuten', expired: '' },
    ko: { days: '일', hours: '시간', minutes: '분', expired: '' },
  };

  const normalizedLang = language.toLowerCase();
  return unitTexts[normalizedLang]?.[unit] || unitTexts['en'][unit];
}

/**
 * 「約」のプレフィックスを言語別に取得
 */
function getAboutPrefix(language: string): string {
  const prefixes: Record<string, string> = {
    ja: '約',
    en: '~',
    'pt-br': '~',
    de: '~',
    ko: '약',
  };

  return prefixes[language.toLowerCase()] || prefixes['en'];
}

/**
 * 「まで」のサフィックスを言語別に取得
 */
function getUntilSuffix(language: string): string {
  const suffixes: Record<string, string> = {
    ja: 'まで',
    en: 'until',
    'pt-br': 'até',
    de: 'bis',
    ko: '까지',
  };

  return suffixes[language.toLowerCase()] || suffixes['en'];
}