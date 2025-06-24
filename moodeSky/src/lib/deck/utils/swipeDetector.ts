/**
 * swipeDetector.ts
 * モバイル用スワイプ検出・循環ナビゲーション
 * 
 * CSS Scroll Snapと組み合わせて使用
 * 右端→左端、左端→右端の循環対応
 */

import { debugLog, debugWarn, debugError } from '$lib/utils/debugUtils.js';
import { SWIPE_CONFIG, NAVIGATION_CONFIG, INTERSECTION_CONFIG } from '../config/swipeConfig.js';
import { swipeErrorHandler, SwipeErrorType, CommonRecoveryStrategies } from './errorHandler.js';

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
  private cooldownPeriod = SWIPE_CONFIG.COOLDOWN_MS;
  
  private options: SwipeOptions = {
    threshold: SWIPE_CONFIG.TOUCH_THRESHOLD_PX,
    velocity: SWIPE_CONFIG.MIN_VELOCITY,
    enableCircular: true
  };
  
  private callbacks: SwipeCallbacks = {};
  private element: HTMLElement;

  // イベントハンドラーの参照を保存（確実な削除のため）
  private boundTouchStart: (e: TouchEvent) => void;
  private boundTouchMove: (e: TouchEvent) => void;
  private boundTouchEnd: (e: TouchEvent) => void;
  private boundMouseDown: (e: MouseEvent) => void;
  private boundMouseMove: (e: MouseEvent) => void;
  private boundMouseUp: (e: MouseEvent) => void;

  constructor(element: HTMLElement, callbacks: SwipeCallbacks, options?: Partial<SwipeOptions>) {
    this.element = element;
    this.callbacks = callbacks;
    this.options = { ...this.options, ...options };
    
    // bound参照を初期化
    this.boundTouchStart = this.handleTouchStart.bind(this);
    this.boundTouchMove = this.handleTouchMove.bind(this);
    this.boundTouchEnd = this.handleTouchEnd.bind(this);
    this.boundMouseDown = this.handleMouseDown.bind(this);
    this.boundMouseMove = this.handleMouseMove.bind(this);
    this.boundMouseUp = this.handleMouseUp.bind(this);
    
    this.attachListeners();
  }

  private attachListeners(): void {
    // タッチイベント（WebView環境での改善: passive: false で preventDefault可能にする）
    this.element.addEventListener('touchstart', this.boundTouchStart, { passive: false });
    this.element.addEventListener('touchmove', this.boundTouchMove, { passive: false });
    this.element.addEventListener('touchend', this.boundTouchEnd, { passive: false });
    
    // マウスイベント（デスクトップでのテスト用）
    this.element.addEventListener('mousedown', this.boundMouseDown);
    this.element.addEventListener('mousemove', this.boundMouseMove);
    this.element.addEventListener('mouseup', this.boundMouseUp);
    
    // console.log('🎯 [SwipeDetector] Event listeners attached to element:', {
    //   element: this.element,
    //   tagName: this.element.tagName,
    //   className: this.element.className,
    //   boundReferences: 'using bound references for reliable cleanup'
    // });
  }

  private handleTouchStart(e: TouchEvent): void {
    // console.log('👆 [TouchEvent] touchstart detected', {
    //   touchCount: e.touches.length,
    //   clientX: e.touches[0]?.clientX,
    //   clientY: e.touches[0]?.clientY,
    //   target: e.target?.constructor.name
    // });
    
    if (e.touches.length !== 1) {
      // console.log('❌ [TouchEvent] Multiple touches, ignoring');
      return;
    }
    
    this.startTracking(e.touches[0].clientX, e.touches[0].clientY);
  }

  private handleTouchMove(e: TouchEvent): void {
    if (!this.isTracking || e.touches.length !== 1) {
      // if (!this.isTracking) console.log('❌ [TouchEvent] touchmove: not tracking');
      // if (e.touches.length !== 1) console.log('❌ [TouchEvent] touchmove: multiple touches');
      return;
    }
    
    // 縦スクロールの場合は無視
    const deltaY = Math.abs(e.touches[0].clientY - this.startY);
    const deltaX = Math.abs(e.touches[0].clientX - this.startX);
    
    // console.log('🤏 [TouchEvent] touchmove', {
    //   deltaX: Math.round(deltaX),
    //   deltaY: Math.round(deltaY),
    //   ratio: deltaY > deltaX ? 'vertical' : 'horizontal'
    // });
    
    if (deltaY > deltaX) {
      // console.log('📱 [TouchEvent] Vertical scroll detected, stopping tracking');
      this.stopTracking();
    }
  }

  private handleTouchEnd(e: TouchEvent): void {
    // console.log('🏁 [TouchEvent] touchend detected', {
    //   isTracking: this.isTracking,
    //   changedTouchCount: e.changedTouches.length,
    //   clientX: e.changedTouches[0]?.clientX,
    //   clientY: e.changedTouches[0]?.clientY
    // });
    
    if (!this.isTracking || e.changedTouches.length !== 1) {
      // if (!this.isTracking) console.log('❌ [TouchEvent] touchend: not tracking');
      // if (e.changedTouches.length !== 1) console.log('❌ [TouchEvent] touchend: multiple touches');
      return;
    }
    
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
    
    // console.log(`🎯 [SwipeDetector] Attempting to start tracking`, {
    //   isAnimating: this.isAnimating,
    //   timeSinceLastSwipe,
    //   cooldownPeriod: this.cooldownPeriod,
    //   x: Math.round(x),
    //   y: Math.round(y)
    // });
    
    if (this.isAnimating || timeSinceLastSwipe < this.cooldownPeriod) {
      // 高速連続操作対応のしきい値以上経過している場合は強制的に開始
      if (timeSinceLastSwipe > SWIPE_CONFIG.FORCE_START_THRESHOLD_MS) {
        debugLog(`🚀 [SwipeDetector] Force start - ignoring animation state`);
        this.forceReset();
      } else {
        debugLog(`🚫 [SwipeDetector] Start tracking blocked`, {
          isAnimating: this.isAnimating,
          timeSinceLastSwipe,
          cooldownPeriod: this.cooldownPeriod,
          reason: this.isAnimating ? 'animation in progress' : 'cooldown period'
        });
        return;
      }
    }
    
    // console.log(`✅ [SwipeDetector] Start tracking SUCCESS at (${Math.round(x)}, ${Math.round(y)})`);
    
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
      // console.log(`🚀 [SwipeDetector] ${direction} swipe executed`, {
      //   deltaX: Math.round(deltaX),
      //   velocity: velocity.toFixed(2),
      //   threshold: this.options.threshold
      // });
      
      // スワイプ実行
      if (deltaX > 0) {
        this.callbacks.onSwipeRight?.(); // 右スワイプ（前へ）
      } else {
        this.callbacks.onSwipeLeft?.();  // 左スワイプ（次へ）
      }
      
      // 即座にリセット（設定時間後に自動解除）
      setTimeout(() => {
        if (this.isAnimating) {
          debugLog('🔄 [SwipeDetector] Auto-reset after swipe completion');
          this.isAnimating = false;
        }
      }, SWIPE_CONFIG.ANIMATION_RESET_MS);
      
    } else {
      // console.log(`❌ [SwipeDetector] Swipe rejected`, {
      //   deltaX: Math.round(deltaX),
      //   velocity: velocity.toFixed(2),
      //   threshold: this.options.threshold,
      //   reason: Math.abs(deltaX) <= this.options.threshold ? 'insufficient distance' : 'insufficient velocity'
      // });
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
    // console.log('✅ [SwipeDetector] Animation complete notified');
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
    // console.log('🔄 [SwipeDetector] Force reset completed');
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
    // console.log('🧹 [SwipeDetector] Destroying SwipeDetector and removing all event listeners');
    
    // 状態をリセット
    this.forceReset();
    
    // イベントリスナーを確実に削除（bind済みの参照を使用）
    this.element.removeEventListener('touchstart', this.boundTouchStart);
    this.element.removeEventListener('touchmove', this.boundTouchMove);
    this.element.removeEventListener('touchend', this.boundTouchEnd);
    this.element.removeEventListener('mousedown', this.boundMouseDown);
    this.element.removeEventListener('mousemove', this.boundMouseMove);
    this.element.removeEventListener('mouseup', this.boundMouseUp);
    
    // console.log('✅ [SwipeDetector] All event listeners removed successfully');
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
    // console.log(`🔄 [Swipe] Next: ${this.currentIndex} → ${nextIndex} (total: ${this.totalColumns})`);
    this.scrollToColumnSafe(nextIndex);
  }

  /**
   * 前のカラムへ移動（無限循環対応）
   */
  public movePrevious(): void {
    if (this.isTransitioning || this.totalColumns <= 1) return;
    
    // 確実な循環: 最初から最後へも滑らかに移動
    const prevIndex = (this.currentIndex - 1 + this.totalColumns) % this.totalColumns;
    // console.log(`🔄 [Swipe] Previous: ${this.currentIndex} → ${prevIndex} (total: ${this.totalColumns})`);
    this.scrollToColumnSafe(prevIndex);
  }

  /**
   * 安全な指定カラムへの移動（DeckContainer側CSS管理に対応）
   */
  private scrollToColumnSafe(index: number): void {
    // console.log(`🔍 [Navigator] scrollToColumnSafe called with index: ${index}`);
    
    // インデックスを正規化（循環対応）
    const normalizedIndex = ((index % this.totalColumns) + this.totalColumns) % this.totalColumns;
    // console.log(`🔍 [Navigator] Index normalized: ${index} → ${normalizedIndex} (total: ${this.totalColumns})`);
    
    if (this.isTransitioning) {
      // console.log(`🚫 [Navigator] Already transitioning, skipping move to ${normalizedIndex}`);
      return;
    }
    
    // 既存の遷移を強制終了
    this.forceCompleteAnyTransition();
    
    this.isTransitioning = true;
    // console.log(`🎯 [Navigator] Starting transition to index: ${normalizedIndex}`);
    
    try {
      // インデックス更新と通知（DeckContainer側でCSS管理）
      // console.log(`🔄 [Navigator] Updating current index: ${this.currentIndex} → ${normalizedIndex}`);
      this.currentIndex = normalizedIndex;
      
      // console.log(`📞 [Navigator] Calling onColumnChange callback with index: ${normalizedIndex}`);
      this.callbacks.onColumnChange?.(normalizedIndex);
      // console.log(`✅ [Navigator] onColumnChange callback executed`);
      
      // アニメーション完了後にクリーンアップ（循環移動対応）
      setTimeout(() => {
        if (this.isTransitioning) {
          debugLog('🔄 [Navigator] Standard cleanup after configured timeout');
          this.cleanupTransition();
        }
      }, NAVIGATION_CONFIG.CLEANUP_TIMEOUT_MS);
      
    } catch (error) {
      // 構造化エラーハンドリング
      swipeErrorHandler.handleError(
        error,
        {
          type: SwipeErrorType.NAVIGATION_FAILED,
          context: 'scrollToColumnSafe',
          data: {
            targetIndex: normalizedIndex,
            currentIndex: this.currentIndex,
            totalColumns: this.totalColumns
          },
          userAction: 'column_navigation'
        },
        CommonRecoveryStrategies.resetState(() => {
          debugLog(`📞 [Navigator] Executing fallback callback`);
          this.currentIndex = normalizedIndex;
          this.callbacks.onColumnChange?.(normalizedIndex);
          this.isTransitioning = false;
        })
      );
    }
  }

  /**
   * 遷移状態の強制クリーンアップ
   */
  private forceCompleteAnyTransition(): void {
    if (this.isTransitioning) {
      // console.warn('🔧 [Navigator] Force completing existing transition');
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
    // console.log('✅ [Navigator] Transition cleanup completed');
  }

  /**
   * 緊急時のクリーンアップ
   */
  private emergencyCleanup(type: string): void {
    if (this.isTransitioning) {
      // console.warn(`⚠️ [Navigator] Emergency cleanup (${type}) triggered`);
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
    // console.warn('🔧 [Navigator] Force reset called');
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
  private lastUpdateTime = 0;
  private debounceDelay = INTERSECTION_CONFIG.DEBOUNCE_DELAY_MS;

  constructor(onActiveColumnChange: (index: number) => void) {
    this.onActiveColumnChange = onActiveColumnChange;
    
    this.observer = new IntersectionObserver(
      this.handleIntersection.bind(this),
      {
        root: null,
        rootMargin: '0px',
        threshold: INTERSECTION_CONFIG.VISIBILITY_THRESHOLD
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
    const currentTime = Date.now();
    
    // デバウンス処理：短時間の連続更新を防ぐ
    if (currentTime - this.lastUpdateTime < this.debounceDelay) {
      // console.log('🚫 [IntersectionObserver] Skipping update due to debounce', {
      //   timeSinceLastUpdate: currentTime - this.lastUpdateTime,
      //   debounceDelay: this.debounceDelay
      // });
      return;
    }
    
    entries.forEach(entry => {
      if (entry.isIntersecting && entry.intersectionRatio >= INTERSECTION_CONFIG.VISIBILITY_THRESHOLD) {
        const index = this.columnElements.indexOf(entry.target as HTMLElement);
        if (index !== -1) {
          this.lastUpdateTime = currentTime;
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