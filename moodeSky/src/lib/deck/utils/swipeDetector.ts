/**
 * swipeDetector.ts
 * モバイル用スワイプ検出・循環ナビゲーション
 * 
 * CSS Scroll Snapと組み合わせて使用
 * 右端→左端、左端→右端の循環対応
 */

export interface SwipeOptions {
  threshold: number;      // スワイプ感度（px）
  velocity: number;       // スワイプ速度しきい値
  enableCircular: boolean; // 循環ナビゲーション有効
}

export interface SwipeCallbacks {
  onSwipeLeft?: () => void;   // 左スワイプ（次へ）
  onSwipeRight?: () => void;  // 右スワイプ（前へ）
  onSwipeStart?: (x: number) => void;
  onSwipeEnd?: () => void;
}

export class SwipeDetector {
  private startX = 0;
  private startY = 0;
  private startTime = 0;
  private isTracking = false;
  
  private options: SwipeOptions = {
    threshold: 50,
    velocity: 0.3,
    enableCircular: true
  };
  
  private callbacks: SwipeCallbacks = {};
  private element: HTMLElement;

  constructor(element: HTMLElement, callbacks: SwipeCallbacks, options?: Partial<SwipeOptions>) {
    this.element = element;
    this.callbacks = callbacks;
    this.options = { ...this.options, ...options };
    
    this.attachListeners();
  }

  private attachListeners(): void {
    // タッチイベント
    this.element.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
    this.element.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: true });
    this.element.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });
    
    // マウスイベント（デスクトップでのテスト用）
    this.element.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.element.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.element.addEventListener('mouseup', this.handleMouseUp.bind(this));
  }

  private handleTouchStart(e: TouchEvent): void {
    if (e.touches.length !== 1) return;
    
    this.startTracking(e.touches[0].clientX, e.touches[0].clientY);
  }

  private handleTouchMove(e: TouchEvent): void {
    if (!this.isTracking || e.touches.length !== 1) return;
    
    // 縦スクロールの場合は無視
    const deltaY = Math.abs(e.touches[0].clientY - this.startY);
    const deltaX = Math.abs(e.touches[0].clientX - this.startX);
    
    if (deltaY > deltaX) {
      this.stopTracking();
    }
  }

  private handleTouchEnd(e: TouchEvent): void {
    if (!this.isTracking || e.changedTouches.length !== 1) return;
    
    this.endTracking(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
  }

  private handleMouseDown(e: MouseEvent): void {
    // タッチデバイスでは無視
    if ('ontouchstart' in window) return;
    
    this.startTracking(e.clientX, e.clientY);
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.isTracking) return;
    
    // マウスがボタンを離した場合
    if (e.buttons === 0) {
      this.stopTracking();
    }
  }

  private handleMouseUp(e: MouseEvent): void {
    if (!this.isTracking) return;
    
    this.endTracking(e.clientX, e.clientY);
  }

  private startTracking(x: number, y: number): void {
    this.startX = x;
    this.startY = y;
    this.startTime = Date.now();
    this.isTracking = true;
    
    this.callbacks.onSwipeStart?.(x);
  }

  private endTracking(x: number, y: number): void {
    if (!this.isTracking) return;
    
    const deltaX = x - this.startX;
    const deltaY = y - this.startY;
    const deltaTime = Date.now() - this.startTime;
    const velocity = Math.abs(deltaX) / deltaTime;
    
    // 縦スクロールの場合は無視
    if (Math.abs(deltaY) > Math.abs(deltaX)) {
      this.stopTracking();
      return;
    }
    
    // スワイプ判定
    const isValidSwipe = Math.abs(deltaX) > this.options.threshold || velocity > this.options.velocity;
    
    if (isValidSwipe) {
      if (deltaX > 0) {
        this.callbacks.onSwipeRight?.(); // 右スワイプ（前へ）
      } else {
        this.callbacks.onSwipeLeft?.();  // 左スワイプ（次へ）
      }
    }
    
    this.stopTracking();
  }

  private stopTracking(): void {
    if (!this.isTracking) return;
    
    this.isTracking = false;
    this.callbacks.onSwipeEnd?.();
  }

  public destroy(): void {
    // イベントリスナーを削除
    this.element.removeEventListener('touchstart', this.handleTouchStart.bind(this));
    this.element.removeEventListener('touchmove', this.handleTouchMove.bind(this));
    this.element.removeEventListener('touchend', this.handleTouchEnd.bind(this));
    this.element.removeEventListener('mousedown', this.handleMouseDown.bind(this));
    this.element.removeEventListener('mousemove', this.handleMouseMove.bind(this));
    this.element.removeEventListener('mouseup', this.handleMouseUp.bind(this));
  }
}

/**
 * 循環ナビゲーション制御
 */
export class CircularColumnNavigator {
  private currentIndex = 0;
  private totalColumns = 0;
  private containerElement: HTMLElement;
  private callbacks: {
    onColumnChange?: (index: number) => void;
  } = {};

  constructor(
    containerElement: HTMLElement, 
    totalColumns: number,
    callbacks?: { onColumnChange?: (index: number) => void }
  ) {
    this.containerElement = containerElement;
    this.totalColumns = totalColumns;
    this.callbacks = callbacks || {};
  }

  /**
   * 次のカラムへ移動
   */
  public moveNext(): void {
    const nextIndex = this.currentIndex >= this.totalColumns - 1 ? 0 : this.currentIndex + 1;
    this.scrollToColumn(nextIndex);
  }

  /**
   * 前のカラムへ移動
   */
  public movePrevious(): void {
    const prevIndex = this.currentIndex <= 0 ? this.totalColumns - 1 : this.currentIndex - 1;
    this.scrollToColumn(prevIndex);
  }

  /**
   * 指定カラムへ移動
   */
  public scrollToColumn(index: number): void {
    if (index < 0 || index >= this.totalColumns) return;
    
    const targetX = index * window.innerWidth;
    
    this.containerElement.scrollTo({
      left: targetX,
      behavior: 'smooth'
    });
    
    this.currentIndex = index;
    this.callbacks.onColumnChange?.(index);
  }

  /**
   * 現在のカラムインデックスを更新
   */
  public updateCurrentIndex(index: number): void {
    this.currentIndex = Math.max(0, Math.min(index, this.totalColumns - 1));
  }

  /**
   * 総カラム数を更新
   */
  public updateTotalColumns(total: number): void {
    this.totalColumns = total;
    
    // 現在のインデックスが範囲外の場合は調整
    if (this.currentIndex >= total) {
      this.currentIndex = Math.max(0, total - 1);
    }
  }

  /**
   * 現在のカラムインデックスを取得
   */
  public getCurrentIndex(): number {
    return this.currentIndex;
  }
}

/**
 * インターセクション監視によるアクティブカラム検出
 */
export class ColumnIntersectionObserver {
  private observer: IntersectionObserver;
  private columnElements: HTMLElement[] = [];
  private onActiveColumnChange: (index: number) => void;

  constructor(onActiveColumnChange: (index: number) => void) {
    this.onActiveColumnChange = onActiveColumnChange;
    
    this.observer = new IntersectionObserver(
      this.handleIntersection.bind(this),
      {
        root: null,
        rootMargin: '0px',
        threshold: 0.5 // 50%以上表示されているカラムをアクティブとする
      }
    );
  }

  /**
   * カラム要素を監視対象に追加
   */
  public observeColumns(columnElements: HTMLElement[]): void {
    // 既存の監視を停止
    this.columnElements.forEach(el => this.observer.unobserve(el));
    
    // 新しい要素を監視
    this.columnElements = columnElements;
    columnElements.forEach(el => this.observer.observe(el));
  }

  private handleIntersection(entries: IntersectionObserverEntry[]): void {
    entries.forEach(entry => {
      if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
        const index = this.columnElements.indexOf(entry.target as HTMLElement);
        if (index !== -1) {
          this.onActiveColumnChange(index);
        }
      }
    });
  }

  /**
   * 監視を停止してリソースを解放
   */
  public destroy(): void {
    this.observer.disconnect();
  }
}