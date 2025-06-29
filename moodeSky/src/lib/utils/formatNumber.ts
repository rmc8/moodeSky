/**
 * 数値フォーマットユーティリティ
 * ソーシャルメディアでよく使用される K, M 表記のフォーマット
 */

/**
 * 数値を省略形式でフォーマット
 * 0-999: そのまま表示
 * 1,000-999,999: K表記（例: 1.2K）
 * 1,000,000+: M表記（例: 1.2M）
 * 
 * @param count 数値
 * @returns フォーマットされた文字列
 */
export function formatCount(count: number | undefined | null): string {
  // null/undefined チェック
  if (count === null || count === undefined) {
    return '0';
  }

  // 負の数は0として扱う
  if (count < 0) {
    return '0';
  }

  // 1000未満はそのまま表示
  if (count < 1000) {
    return count.toString();
  }

  // 1000以上999999以下はK表記
  if (count < 1000000) {
    const thousands = count / 1000;
    // 小数点以下1桁、末尾0は省略
    const formatted = thousands.toFixed(1);
    return formatted.endsWith('.0') ? 
      Math.floor(thousands).toString() + 'K' : 
      formatted + 'K';
  }

  // 1000000以上はM表記
  const millions = count / 1000000;
  const formatted = millions.toFixed(1);
  return formatted.endsWith('.0') ? 
    Math.floor(millions).toString() + 'M' : 
    formatted + 'M';
}

/**
 * 数値をフルフォーマット（カンマ区切り）で表示
 * ツールチップ等での詳細表示用
 * 
 * @param count 数値
 * @returns カンマ区切りの文字列
 */
export function formatFullCount(count: number | undefined | null): string {
  if (count === null || count === undefined) {
    return '0';
  }

  if (count < 0) {
    return '0';
  }

  return count.toLocaleString('ja-JP');
}

/**
 * アクションボタン用の数値表示
 * 0でも表示する仕様に対応
 * 
 * @param count 数値
 * @returns フォーマットされた文字列（0も含む）
 */
export function formatActionCount(count: number | undefined | null): string {
  // null/undefined の場合は0を表示
  if (count === null || count === undefined) {
    return '0';
  }

  // 負の数は0として扱う
  if (count < 0) {
    return '0';
  }

  return formatCount(count);
}

/**
 * テスト用の型チェック関数
 */
export function isValidCount(count: unknown): count is number {
  return typeof count === 'number' && !isNaN(count) && isFinite(count);
}