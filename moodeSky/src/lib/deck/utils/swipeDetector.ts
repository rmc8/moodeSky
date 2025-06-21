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
  private isAnimating = false; // アニメーション中フラグ
  private lastSwipeTime = 0;   // 最後のスワイプ時刻
  private cooldownPeriod = 100; // クールダウン期間(ms) - 超高速応答
  
  private options: SwipeOptions = {
    threshold: 30,      // 超高感度 - 軽いタッチで即反応
    velocity: 0.2,      // より軽いスワイプでも検出
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
    // クールダウン期間中またはアニメーション中は無視
    const currentTime = Date.now();
    const timeSinceLastSwipe = currentTime - this.lastSwipeTime;
    
    if (this.isAnimating || timeSinceLastSwipe < this.cooldownPeriod) {
      // 80ms以上経過している場合は強制的に開始（高速連続操作対応）
      if (timeSinceLastSwipe > 80) {
        console.log(`🚀 [SwipeDetector] Force start - ignoring animation state`);
        this.forceReset();
      } else {
        console.log(`🚫 [SwipeDetector] Start tracking blocked`, {
          isAnimating: this.isAnimating,
          timeSinceLastSwipe,
          cooldownPeriod: this.cooldownPeriod,
          reason: this.isAnimating ? 'animation in progress' : 'cooldown period'
        });
        return;
      }
    }
    
    console.log(`👆 [SwipeDetector] Start tracking at (${Math.round(x)}, ${Math.round(y)})`);
    
    this.startX = x;
    this.startY = y;
    this.startTime = currentTime;
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
      // スワイプ実行時刻を記録
      this.lastSwipeTime = Date.now();
      this.isAnimating = true; // アニメーション開始フラグ
      
      const direction = deltaX > 0 ? 'RIGHT' : 'LEFT';
      console.log(`🚀 [SwipeDetector] ${direction} swipe executed`, {
        deltaX: Math.round(deltaX),
        velocity: velocity.toFixed(2),
        threshold: this.options.threshold
      });
      
      if (deltaX > 0) {
        this.callbacks.onSwipeRight?.(); // 右スワイプ（前へ）
      } else {
        this.callbacks.onSwipeLeft?.();  // 左スワイプ（次へ）
      }
    } else {
      console.log(`❌ [SwipeDetector] Swipe rejected`, {
        deltaX: Math.round(deltaX),
        velocity: velocity.toFixed(2),
        threshold: this.options.threshold,
        reason: Math.abs(deltaX) <= this.options.threshold ? 'insufficient distance' : 'insufficient velocity'
      });
    }
    
    this.stopTracking();
  }

  private stopTracking(): void {
    if (!this.isTracking) return;
    
    this.isTracking = false;
    this.callbacks.onSwipeEnd?.();
  }

  /**
   * アニメーション完了を通知（外部から呼び出し）
   */
  public notifyAnimationComplete(): void {
    this.isAnimating = false;
    console.log('✅ [SwipeDetector] Animation complete notified');
  }
  
  /**
   * 現在アニメーション中かどうかを取得
   */
  public isCurrentlyAnimating(): boolean {
    return this.isAnimating;
  }

  /**
   * 強制リセット機能（確実な状態復旧）
   */
  public forceReset(): void {
    this.isAnimating = false;
    this.isTracking = false;
    this.lastSwipeTime = 0;
    console.log('🔄 [SwipeDetector] Force reset completed');
  }
  
  /**
   * デバッグ用状態確認
   */
  public getDebugState(): object {
    const timeSinceLastSwipe = Date.now() - this.lastSwipeTime;
    return {
      isAnimating: this.isAnimating,
      isTracking: this.isTracking,
      timeSinceLastSwipe,
      cooldownRemaining: Math.max(0, this.cooldownPeriod - timeSinceLastSwipe),
      canSwipe: !this.isAnimating && timeSinceLastSwipe >= this.cooldownPeriod
    };
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
  private isTransitioning = false; // 遷移中フラグ
  private currentTransitionHandler: (() => void) | null = null; // 現在のtransitionハンドラー
  private emergencyTimeouts: number[] = []; // 緊急タイムアウトの管理
  private callbacks: {
    onColumnChange?: (index: number) => void;
    onTransitionComplete?: () => void; // 遷移完了コールバック
  } = {};

  constructor(
    containerElement: HTMLElement, 
    totalColumns: number,
    callbacks?: { 
      onColumnChange?: (index: number) => void;
      onTransitionComplete?: () => void;
    }
  ) {
    this.containerElement = containerElement;
    this.totalColumns = totalColumns;
    this.callbacks = callbacks || {};
  }

  /**
   * 次のカラムへ移動（無限循環対応）
   */
  public moveNext(): void {
    if (this.isTransitioning || this.totalColumns <= 1) return;
    
    // 確実な循環: 最後から最初へも滑らかに移動
    const nextIndex = (this.currentIndex + 1) % this.totalColumns;
    console.log(`🔄 [Swipe] Next: ${this.currentIndex} → ${nextIndex} (total: ${this.totalColumns})`);
    this.scrollToColumnSafe(nextIndex);
  }

  /**
   * 前のカラムへ移動（無限循環対応）
   */
  public movePrevious(): void {
    if (this.isTransitioning || this.totalColumns <= 1) return;
    
    // 確実な循環: 最初から最後へも滑らかに移動
    const prevIndex = (this.currentIndex - 1 + this.totalColumns) % this.totalColumns;
    console.log(`🔄 [Swipe] Previous: ${this.currentIndex} → ${prevIndex} (total: ${this.totalColumns})`);
    this.scrollToColumnSafe(prevIndex);
  }

  /**
   * 安全な指定カラムへの移動（排他制御付き）
   */
  private scrollToColumnSafe(index: number): void {
    // インデックスを正規化（循環対応）
    const normalizedIndex = ((index % this.totalColumns) + this.totalColumns) % this.totalColumns;
    
    if (this.isTransitioning) {
      console.log(`🚫 [Navigator] Already transitioning, skipping move to ${normalizedIndex}`);
      return;
    }
    
    // 既存の遷移を強制終了
    this.forceCompleteAnyTransition();
    
    this.isTransitioning = true;
    console.log(`🎯 [Navigator] Starting transition to index: ${normalizedIndex}`);
    
    // CSS transform を使用してより確実な移動を実行
    const track = this.containerElement.querySelector('.deck-columns-track') as HTMLElement;
    if (track) {
      // 循環を考慮したtransform計算
      const transformValue = -((normalizedIndex * 100) / this.totalColumns);
      
      // 既存のイベントリスナーを削除
      if (this.currentTransitionHandler) {
        track.removeEventListener('transitionend', this.currentTransitionHandler);
      }
      
      // 新しいハンドラーを設定
      this.currentTransitionHandler = () => {
        this.cleanupTransition();
      };
      
      track.addEventListener('transitionend', this.currentTransitionHandler, { once: true });
      
      // Transform実行
      track.style.transform = `translateX(${transformValue}%)`;
      console.log(`🎯 [Transform] Applied: ${transformValue}%`);
      
      // 超高速アニメーション完了検出
      setTimeout(() => {
        if (this.isTransitioning) {
          console.log('🔄 [Navigator] Proactive cleanup after 170ms');
          this.cleanupTransition();
        }
      }, 170); // CSS transition(150ms) + 20ms余裕
      
      // 超高速フォールバック
      this.emergencyTimeouts.push(
        setTimeout(() => this.emergencyCleanup('early'), 180),     // CSS transition完了直後
        setTimeout(() => this.emergencyCleanup('final'), 250)      // 最終フォールバック
      );
    }
    
    this.currentIndex = normalizedIndex;
    this.callbacks.onColumnChange?.(normalizedIndex);
  }

  /**
   * 遷移状態の強制クリーンアップ
   */
  private forceCompleteAnyTransition(): void {
    if (this.isTransitioning) {
      console.warn('🔧 [Navigator] Force completing existing transition');
      this.cleanupTransition();
    }
  }

  /**
   * 遷移の確実なクリーンアップ
   */
  private cleanupTransition(): void {
    if (!this.isTransitioning) return;
    
    this.isTransitioning = false;
    
    // イベントリスナーのクリーンアップ
    if (this.currentTransitionHandler) {
      const track = this.containerElement.querySelector('.deck-columns-track') as HTMLElement;
      if (track) {
        track.removeEventListener('transitionend', this.currentTransitionHandler);
      }
      this.currentTransitionHandler = null;
    }
    
    // タイムアウトのクリーンアップ
    this.emergencyTimeouts.forEach(timeout => clearTimeout(timeout));
    this.emergencyTimeouts = [];
    
    // 完了コールバック
    this.callbacks.onTransitionComplete?.();
    console.log('✅ [Navigator] Transition cleanup completed');
  }

  /**
   * 緊急時のクリーンアップ
   */
  private emergencyCleanup(type: string): void {
    if (this.isTransitioning) {
      console.warn(`⚠️ [Navigator] Emergency cleanup (${type}) triggered`);
      this.cleanupTransition();
    }
  }

  /**
   * 指定カラムへ移動（互換性のため残す）
   */
  public scrollToColumn(index: number): void {
    this.scrollToColumnSafe(index);
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

  /**
   * 現在遷移中かどうかを取得
   */
  public isCurrentlyTransitioning(): boolean {
    return this.isTransitioning;
  }

  /**
   * 強制リセット機能（デバッグ・緊急時用）
   */
  public forceReset(): void {
    console.warn('🔧 [Navigator] Force reset called');
    this.forceCompleteAnyTransition();
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