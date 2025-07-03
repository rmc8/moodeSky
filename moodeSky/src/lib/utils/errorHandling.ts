/**
 * 型安全なエラーハンドリングユーティリティ
 * unknown型のエラーを安全に処理するヘルパー関数群
 */

/**
 * カスタムエラー型の定義
 */
export interface AppError {
  message: string;
  code?: string;
  cause?: unknown;
}

/**
 * エラーの型を判定する型ガード
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * AppErrorの型を判定する型ガード
 */
export function isAppError(error: unknown): error is AppError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as any).message === 'string'
  );
}

/**
 * unknown型のエラーから安全にメッセージを取得
 */
export function getErrorMessage(error: unknown): string {
  if (isError(error)) {
    return error.message;
  }
  
  if (isAppError(error)) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return 'Unknown error occurred';
}

/**
 * unknown型のエラーをError型に変換
 */
export function toError(error: unknown): Error {
  if (isError(error)) {
    return error;
  }
  
  return new Error(getErrorMessage(error));
}

/**
 * エラーの詳細情報を安全に取得
 */
export function getErrorDetails(error: unknown): {
  message: string;
  name: string;
  stack?: string;
  code?: string;
} {
  if (isError(error)) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack,
      code: (error as any).code
    };
  }
  
  if (isAppError(error)) {
    return {
      message: error.message,
      name: 'AppError',
      code: error.code
    };
  }
  
  return {
    message: getErrorMessage(error),
    name: 'UnknownError'
  };
}

/**
 * エラーが特定の条件を満たすかチェック
 */
export function errorMatches(error: unknown, pattern: string | RegExp): boolean {
  const message = getErrorMessage(error);
  
  if (typeof pattern === 'string') {
    return message.includes(pattern);
  }
  
  return pattern.test(message);
}

/**
 * エラーを安全にログ出力
 */
export function logError(error: unknown, context?: string): void {
  const details = getErrorDetails(error);
  const contextStr = context ? `[${context}] ` : '';
  
  console.error(`${contextStr}${details.name}: ${details.message}`);
  
  if (details.stack) {
    console.error(details.stack);
  }
  
  if (details.code) {
    console.error(`Error code: ${details.code}`);
  }
}

/**
 * 非同期操作のエラーハンドリング用ラッパー
 */
export async function safeAsync<T>(
  operation: () => Promise<T>,
  fallback?: T
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: getErrorMessage(error) };
  }
}

/**
 * 同期操作のエラーハンドリング用ラッパー
 */
export function safeSync<T>(
  operation: () => T,
  fallback?: T
): { success: true; data: T } | { success: false; error: string } {
  try {
    const data = operation();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: getErrorMessage(error) };
  }
}

/**
 * 複数のエラーを集約
 */
export class AggregateError extends Error {
  public readonly errors: unknown[];
  
  constructor(errors: unknown[], message = 'Multiple errors occurred') {
    super(message);
    this.name = 'AggregateError';
    this.errors = errors;
  }
  
  getErrorMessages(): string[] {
    return this.errors.map(getErrorMessage);
  }
}