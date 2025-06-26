/**
 * Toast Notification Store (Svelte 5 runes)
 * トースト通知の状態管理とキュー機能を提供
 */

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number; // in milliseconds
  timestamp: number;
}

class ToastStore {
  /**
   * アクティブなトースト一覧
   */
  items = $state<ToastItem[]>([]);

  /**
   * デフォルト設定
   */
  private readonly defaultDuration = 5000; // 5秒
  private readonly maxToasts = 5; // 最大同時表示数

  /**
   * トースト通知を追加
   */
  add(
    type: ToastType,
    message: string,
    options?: {
      title?: string;
      duration?: number;
    }
  ): string {
    const id = this.generateId();
    const duration = options?.duration ?? this.getDefaultDuration(type);
    
    const toast: ToastItem = {
      id,
      type,
      title: options?.title,
      message,
      duration,
      timestamp: Date.now(),
    };

    // 最大数を超える場合は古いものから削除
    if (this.items.length >= this.maxToasts) {
      this.items = this.items.slice(1);
    }

    this.items = [...this.items, toast];

    // 自動削除タイマー設定
    if (duration > 0) {
      setTimeout(() => {
        this.remove(id);
      }, duration);
    }

    return id;
  }

  /**
   * 特定のトースト通知を削除
   */
  remove(id: string): void {
    this.items = this.items.filter(item => item.id !== id);
  }

  /**
   * 全てのトースト通知をクリア
   */
  clear(): void {
    this.items = [];
  }

  /**
   * 成功通知
   */
  success(message: string, options?: { title?: string; duration?: number }): string {
    return this.add('success', message, options);
  }

  /**
   * エラー通知
   */
  error(message: string, options?: { title?: string; duration?: number }): string {
    return this.add('error', message, options);
  }

  /**
   * 警告通知
   */
  warning(message: string, options?: { title?: string; duration?: number }): string {
    return this.add('warning', message, options);
  }

  /**
   * 情報通知
   */
  info(message: string, options?: { title?: string; duration?: number }): string {
    return this.add('info', message, options);
  }

  /**
   * トースト数の取得
   */
  get count(): number {
    return this.items.length;
  }

  /**
   * 最新のトースト取得
   */
  get latest(): ToastItem | null {
    return this.items.length > 0 ? this.items[this.items.length - 1] : null;
  }

  /**
   * タイプ別デフォルト表示時間を取得
   */
  private getDefaultDuration(type: ToastType): number {
    switch (type) {
      case 'error':
        return 8000; // エラーは長めに表示
      case 'warning':
        return 6000;
      case 'success':
        return 4000;
      case 'info':
        return 5000;
      default:
        return this.defaultDuration;
    }
  }

  /**
   * ユニークIDを生成
   */
  private generateId(): string {
    return `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// シングルトンインスタンス
export const toastStore = new ToastStore();