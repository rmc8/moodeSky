/**
 * JWT (JSON Web Token) ユーティリティ
 * リフレッシュトークンの期限管理とセッション状態判定
 */

/**
 * JWT Payload の標準クレーム
 */
export interface JWTPayload {
  /** 有効期限 (Unix timestamp) */
  exp?: number;
  /** 発行時刻 (Unix timestamp) */
  iat?: number;
  /** サブジェクト (通常はユーザーID) */
  sub?: string;
  /** 発行者 */
  iss?: string;
  /** オーディエンス */
  aud?: string | string[];
  /** その他のカスタムクレーム */
  [key: string]: any;
}

/**
 * JWT デコードエラー
 */
export class JWTDecodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'JWTDecodeError';
  }
}

/**
 * Base64 URL セーフデコード
 * JWT で使用される Base64URL エンコーディングに対応
 */
function base64UrlDecode(str: string): string {
  try {
    // Base64URL → Base64 変換
    const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    // パディング追加
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    
    // Base64 デコード
    const decoded = atob(padded);
    
    // UTF-8 デコード
    return decodeURIComponent(
      decoded
        .split('')
        .map(char => '%' + ('00' + char.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
  } catch (error) {
    throw new JWTDecodeError(`Failed to decode Base64URL: ${error}`);
  }
}

/**
 * JWT をデコードして payload を取得
 * 
 * @param token JWT トークン文字列
 * @returns デコードされた payload または null（無効な場合）
 */
export function decodeJWT(token: string): JWTPayload | null {
  try {
    if (!token || typeof token !== 'string') {
      return null;
    }

    // JWT の形式確認 (header.payload.signature)
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new JWTDecodeError('Invalid JWT format: must have 3 parts');
    }

    const [header, payload, signature] = parts;

    // payload部分をデコード
    const decodedPayload = base64UrlDecode(payload);
    const parsedPayload = JSON.parse(decodedPayload) as JWTPayload;

    return parsedPayload;
  } catch (error) {
    console.warn('JWT decode failed:', error);
    return null;
  }
}

/**
 * JWT の有効期限を取得
 * 
 * @param token JWT トークン文字列
 * @returns 有効期限の Date オブジェクトまたは null
 */
export function getTokenExpiration(token: string): Date | null {
  try {
    const payload = decodeJWT(token);
    
    if (!payload || typeof payload.exp !== 'number') {
      return null;
    }

    // Unix timestamp (秒) を Date に変換
    return new Date(payload.exp * 1000);
  } catch (error) {
    console.warn('Failed to get token expiration:', error);
    return null;
  }
}

/**
 * JWT が期限切れかどうかを判定
 * 
 * @param token JWT トークン文字列
 * @param bufferSeconds 期限切れ判定のバッファ時間（秒）デフォルト: 60秒
 * @returns 期限切れの場合 true
 */
export function isTokenExpired(token: string, bufferSeconds: number = 60): boolean {
  try {
    const expiration = getTokenExpiration(token);
    
    if (!expiration) {
      // 有効期限が取得できない場合は期限切れとみなす
      return true;
    }

    const now = new Date();
    const buffer = bufferSeconds * 1000; // ミリ秒に変換
    
    // バッファ時間を考慮して期限切れを判定
    return now.getTime() > (expiration.getTime() - buffer);
  } catch (error) {
    console.warn('Failed to check token expiration:', error);
    return true; // エラー時は期限切れとみなす
  }
}

/**
 * JWT の残り有効時間を秒で取得
 * 
 * @param token JWT トークン文字列
 * @returns 残り秒数（期限切れまたは無効な場合は 0）
 */
export function getTokenRemainingSeconds(token: string): number {
  try {
    const expiration = getTokenExpiration(token);
    
    if (!expiration) {
      return 0;
    }

    const now = new Date();
    const remainingMs = expiration.getTime() - now.getTime();
    
    // 負の値（期限切れ）の場合は 0 を返す
    return Math.max(0, Math.floor(remainingMs / 1000));
  } catch (error) {
    console.warn('Failed to get token remaining seconds:', error);
    return 0;
  }
}

/**
 * JWT の発行時刻を取得
 * 
 * @param token JWT トークン文字列
 * @returns 発行時刻の Date オブジェクトまたは null
 */
export function getTokenIssuedAt(token: string): Date | null {
  try {
    const payload = decodeJWT(token);
    
    if (!payload || typeof payload.iat !== 'number') {
      return null;
    }

    return new Date(payload.iat * 1000);
  } catch (error) {
    console.warn('Failed to get token issued at:', error);
    return null;
  }
}

/**
 * JWT の基本情報を取得
 * 
 * @param token JWT トークン文字列
 * @returns JWT の基本情報
 */
export function getTokenInfo(token: string): {
  isValid: boolean;
  isExpired: boolean;
  expiresAt: Date | null;
  issuedAt: Date | null;
  remainingSeconds: number;
  payload: JWTPayload | null;
} {
  const payload = decodeJWT(token);
  const isValid = payload !== null;
  const isExpired = isTokenExpired(token);
  const expiresAt = getTokenExpiration(token);
  const issuedAt = getTokenIssuedAt(token);
  const remainingSeconds = getTokenRemainingSeconds(token);

  return {
    isValid,
    isExpired,
    expiresAt,
    issuedAt,
    remainingSeconds,
    payload,
  };
}