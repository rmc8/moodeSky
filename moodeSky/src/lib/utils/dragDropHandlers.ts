/**
 * dragDropHandlers.ts
 * ドラッグ&ドロップハンドラーの共通ロジック
 * 
 * MobileDeckTabs.svelteとDeckTabBar.svelteの重複コードを統一
 * DRY原則の実現とテスト可能性の向上
 */

import type { ColumnDndEvent, DragDropResult } from '$lib/types/dragDrop.js';
import type { Column } from '$lib/deck/types.js';
import { isDraggedEntered } from '$lib/types/dragDrop.js';
import { debugLog, debugError, debugPerformance } from '$lib/utils/debugUtils.js';
import { nanoid } from 'nanoid';

/**
 * 強化されたグローバルドラッグ状態管理
 * 複数のdndzoneが同時にドラッグ操作を行うことを防ぎ、異常状態からの自動回復を提供
 */
class GlobalDragManager {
  private currentDraggingZone: string | null = null;
  private dragLockTimeout: number | null = null;
  private dragStartTime: number | null = null;
  private emergencyCleanupTimeout: number | null = null;
  private readonly MAX_DRAG_DURATION = 30000; // 30秒でタイムアウト
  private readonly FORCE_CLEANUP_DELAY = 5000; // 5秒後に強制クリーンアップ
  
  /**
   * ドラッグ開始を試行
   * @param zoneId ゾーンID
   * @returns ドラッグ開始が許可されたかどうか
   */
  tryStartDrag(zoneId: string): boolean {
    // 既存のドラッグ状態をチェック
    if (this.currentDraggingZone && this.currentDraggingZone !== zoneId) {
      // 異常に長時間続いているドラッグをチェック
      if (this.dragStartTime && Date.now() - this.dragStartTime > this.MAX_DRAG_DURATION) {
        debugError(`🚨 [GlobalDragManager] Stale drag detected, forcing cleanup - ${this.currentDraggingZone}`);
        this.forceEndDrag();
      } else {
        debugLog(`🚫 [GlobalDragManager] Drag blocked - ${zoneId} (${this.currentDraggingZone} is already dragging)`);
        return false;
      }
    }
    
    // ドラッグ開始
    this.currentDraggingZone = zoneId;
    this.dragStartTime = Date.now();
    this.clearAllTimeouts();
    this.setEmergencyCleanup();
    
    debugLog(`✅ [GlobalDragManager] Drag started - ${zoneId}`);
    return true;
  }
  
  /**
   * ドラッグ終了
   * @param zoneId ゾーンID
   */
  endDrag(zoneId: string): void {
    if (this.currentDraggingZone === zoneId) {
      this.currentDraggingZone = null;
      this.dragStartTime = null;
      this.clearAllTimeouts();
      
      debugLog(`🏁 [GlobalDragManager] Drag ended - ${zoneId}`);
      
      // 安全性のため、遅延クリーンアップを設定
      this.setDelayedCleanup();
    } else if (this.currentDraggingZone) {
      debugLog(`⚠️ [GlobalDragManager] End drag called for wrong zone - expected: ${this.currentDraggingZone}, got: ${zoneId}`);
    }
  }
  
  /**
   * 強制的にドラッグ状態をクリア
   */
  forceEndDrag(): void {
    const prevZone = this.currentDraggingZone;
    this.currentDraggingZone = null;
    this.dragStartTime = null;
    this.clearAllTimeouts();
    
    if (prevZone) {
      debugLog(`🔧 [GlobalDragManager] Force ended drag - ${prevZone}`);
    }
    
    // DOM要素の残存プレースホルダーをクリーンアップ
    this.cleanupDOMPlaceholders();
  }
  
  /**
   * 現在ドラッグ中かどうか
   */
  isDragging(): boolean {
    return this.currentDraggingZone !== null;
  }
  
  /**
   * 指定ゾーンがドラッグ中かどうか
   */
  isZoneDragging(zoneId: string): boolean {
    return this.currentDraggingZone === zoneId;
  }
  
  /**
   * ドラッグマネージャーの状態を取得（デバッグ用）
   */
  getStatus(): { zone: string | null; duration: number | null; isActive: boolean } {
    return {
      zone: this.currentDraggingZone,
      duration: this.dragStartTime ? Date.now() - this.dragStartTime : null,
      isActive: this.isDragging()
    };
  }
  
  /**
   * 緊急クリーンアップのセットアップ
   */
  private setEmergencyCleanup(): void {
    this.emergencyCleanupTimeout = window.setTimeout(() => {
      debugError('🚨 [GlobalDragManager] Emergency cleanup triggered - drag exceeded maximum duration');
      this.forceEndDrag();
    }, this.MAX_DRAG_DURATION);
  }
  
  /**
   * 遅延クリーンアップのセットアップ
   */
  private setDelayedCleanup(): void {
    this.dragLockTimeout = window.setTimeout(() => {
      this.cleanupDOMPlaceholders();
    }, this.FORCE_CLEANUP_DELAY);
  }
  
  /**
   * 全てのタイムアウトをクリア
   */
  private clearAllTimeouts(): void {
    if (this.dragLockTimeout) {
      clearTimeout(this.dragLockTimeout);
      this.dragLockTimeout = null;
    }
    
    if (this.emergencyCleanupTimeout) {
      clearTimeout(this.emergencyCleanupTimeout);
      this.emergencyCleanupTimeout = null;
    }
  }
  
  /**
   * DOM内の残存プレースホルダーをクリーンアップ
   */
  private cleanupDOMPlaceholders(): void {
    try {
      // svelte-dnd-actionの既知のプレースホルダー要素を探してクリーンアップ
      const placeholders = document.querySelectorAll('[data-is-dnd-shadow-item-hint="true"]');
      let cleanedCount = 0;
      
      placeholders.forEach(element => {
        if (element.parentElement) {
          element.remove();
          cleanedCount++;
        }
      });
      
      if (cleanedCount > 0) {
        debugLog(`🧹 [GlobalDragManager] Cleaned up ${cleanedCount} DOM placeholders`);
      }
    } catch (error) {
      debugError('❌ [GlobalDragManager] Error during DOM cleanup:', error);
    }
  }
}

// グローバルドラッグマネージャーのシングルトンインスタンス
export const globalDragManager = new GlobalDragManager();

/**
 * デバイス種別判定（デバッグ出力強化）
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  // 画面幅による判定
  const isMobileWidth = window.innerWidth < 768;
  
  // ユーザーエージェントによる判定
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // タッチデバイスかどうか
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  const result = isMobileWidth || (isMobileUA && isTouchDevice);
  
  // 詳細デバッグ出力
  console.log('🔍 [Device Detection]', {
    screenWidth: window.innerWidth,
    isMobileWidth,
    userAgent: navigator.userAgent,
    isMobileUA,
    isTouchDevice,
    maxTouchPoints: navigator.maxTouchPoints,
    finalResult: result
  });
  
  return result;
}

/**
 * ドラッグゾーン使用可否判定（デバッグ出力強化）
 * @param zoneType ゾーンの種類 ('mobile' | 'desktop')
 * @returns そのゾーンが使用可能かどうか
 */
export function isDragZoneAllowed(zoneType: 'mobile' | 'desktop'): boolean {
  const isMobile = isMobileDevice();
  const allowed = isMobile ? (zoneType === 'mobile') : (zoneType === 'desktop');
  
  console.log(`🚦 [Zone Control] ${zoneType} zone - Device: ${isMobile ? 'Mobile' : 'Desktop'} - Allowed: ${allowed}`);
  
  return allowed;
}

/**
 * パフォーマンス最適化用ユーティリティ
 */

/**
 * カラム配列の順序を比較（パフォーマンス最適化用）
 * IDの順序のみ比較し、不要な更新を防ぐ
 */
export function compareColumnOrder(a: Column[], b: Column[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((col, index) => col.id === b[index]?.id);
}

/**
 * アクティブカラムの変更をチェック
 */
export function hasActiveColumnChanged(
  currentActiveId: string | undefined,
  newActiveId: string | undefined
): boolean {
  return currentActiveId !== newActiveId;
}

/**
 * エラーハンドリングとロールバック用ユーティリティ
 */

/**
 * カラム配列の深いコピーを作成（ロールバック用）
 */
export function cloneColumns(columns: Column[]): Column[] {
  return columns.map(col => ({ ...col }));
}

/**
 * DeckStore状態のロールバックを実行
 */
export function rollbackDeckState(
  deckStore: DeckStoreInterface,
  previousState: {
    columns: Column[];
    activeColumnId?: string;
  },
  componentName: string
): DragDropResult {
  try {
    deckStore.state.layout.columns = previousState.columns;
    if (previousState.activeColumnId !== undefined) {
      deckStore.state.activeColumnId = previousState.activeColumnId;
    }
    
    debugLog(`🔄 [${componentName}] State rolled back successfully`);
    return { success: true };
  } catch (error) {
    debugError(`❌ [${componentName}] Rollback failed:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown rollback error'
    };
  }
}

/**
 * ユーザーへのエラーフィードバック（非侵入的）
 */
export function showErrorFeedback(message: string, componentName: string): void {
  // 開発環境では詳細ログ、本番環境では最小限の通知
  debugError(`🚨 [${componentName}] User feedback:`, message);
  
  // 非侵入的な視覚的フィードバック（将来の拡張ポイント）
  // 例: toast通知、一時的なステータス表示など
  // ここでは console.warn を避けて debugError のみ使用
}

/**
 * DeckStore型の最小限インターフェース
 * （実際のdeckStoreから必要な部分のみ）
 */
export interface DeckStoreInterface {
  state: {
    activeColumnId?: string;
    layout: {
      columns: Column[];
    };
  };
  save(): Promise<void>;
}

/**
 * ドラッグ&ドロップハンドラーのオプション
 */
export interface DragDropHandlerOptions {
  /** consider完了時の追加処理 */
  onConsiderExtra?: (newColumns: Column[], info: any) => void;
  /** finalize完了時の追加処理 */
  onFinalizeExtra?: (newColumns: Column[], info: any) => void;
  /** エラー発生時のコールバック */
  onError?: (error: Error, operation: 'consider' | 'finalize', rollbackResult?: DragDropResult) => void;
  /** 保存失敗時の自動ロールバック有効化 */
  enableAutoRollback?: boolean;
}

/**
 * 強化されたDOM要素安全性チェック
 * ドラッグ&ドロップ操作中のDOM要素の有効性を包括的に検証
 */
function safeDOMCheck(element: any, operation: string): boolean {
  try {
    // null/undefined チェック
    if (!element) {
      debugLog(`⚠️ [DOM Safety] Element is null/undefined for ${operation}`);
      return false;
    }
    
    // DOM要素かどうかの型チェック
    if (!(element instanceof Element) && !(element instanceof HTMLElement)) {
      debugLog(`⚠️ [DOM Safety] Element is not a valid DOM element for ${operation}`);
      return false;
    }
    
    // DOM接続性チェック
    if (!element.isConnected) {
      debugLog(`⚠️ [DOM Safety] Element is not connected to DOM for ${operation}`);
      return false;
    }
    
    // 必須メソッドの存在チェック
    if (typeof element.getBoundingClientRect !== 'function') {
      debugLog(`⚠️ [DOM Safety] Element missing getBoundingClientRect for ${operation}`);
      return false;
    }
    
    // getBoundingClientRect の実行テスト
    try {
      const rect = element.getBoundingClientRect();
      if (!rect || typeof rect.width !== 'number' || typeof rect.height !== 'number') {
        debugLog(`⚠️ [DOM Safety] getBoundingClientRect returned invalid data for ${operation}`);
        return false;
      }
    } catch (rectError) {
      debugLog(`⚠️ [DOM Safety] getBoundingClientRect execution failed for ${operation}:`, rectError);
      return false;
    }
    
    // 親要素チェック（必要な場合）
    if (operation.includes('parent') && !element.parentElement) {
      debugLog(`⚠️ [DOM Safety] Element missing parentElement for ${operation}`);
      return false;
    }
    
    // 可視性チェック（基本的）
    const computedStyle = window.getComputedStyle(element);
    if (computedStyle.display === 'none') {
      debugLog(`⚠️ [DOM Safety] Element is hidden (display: none) for ${operation}`);
      return false;
    }
    
    // すべてのチェックに合格
    return true;
  } catch (error) {
    debugError(`❌ [DOM Safety] Unexpected error checking element for ${operation}:`, error);
    return false;
  }
}

/**
 * シンプルなドラッグ&ドロップハンドラーを作成
 * Svelteリアクティビティ原則に従い、純粋な再代入のみ実行
 */
export function createDragDropHandlers(
  deckStore: DeckStoreInterface,
  componentName: string,
  options: DragDropHandlerOptions = {}
) {
  // ゾーンIDの生成
  const zoneId = DRAG_DROP_CONFIG.generateZoneId(componentName.toLowerCase());
  
  // ゾーン種別の判定
  const zoneType: 'mobile' | 'desktop' = componentName.toLowerCase().includes('mobile') ? 'mobile' : 'desktop';
  
  /**
   * ドラッグ中のハンドラ（onconsider用）
   * Svelteリアクティビティ原則: シンプルな再代入のみ
   */
  const handleConsider = (e: CustomEvent<ColumnDndEvent>) => {
    // ゾーン使用可否チェック
    if (!isDragZoneAllowed(zoneType)) {
      return;
    }
    
    debugPerformance.start(`${componentName}-consider`);
    
    // ★★★ 最重要：Svelteリアクティビティ原則に従った純粋な再代入 ★★★
    deckStore.state.layout.columns = e.detail.items;
    
    // 追加処理があれば実行（エラーハンドリング付き）
    try {
      options.onConsiderExtra?.(e.detail.items, e.detail.info);
    } catch (extraError) {
      debugError(`🔧 [${componentName}] Extra consider processing failed:`, extraError);
    }
    
    debugPerformance.end(`${componentName}-consider`);
  };

  /**
   * ドラッグ完了時のハンドラ（onfinalize用）
   * Svelteリアクティビティ原則: シンプルな再代入 + 保存処理のみ
   */
  const handleFinalize = async (e: CustomEvent<ColumnDndEvent>) => {
    // ゾーン使用可否チェック
    if (!isDragZoneAllowed(zoneType)) {
      return;
    }
    
    debugPerformance.start(`${componentName}-finalize`);
    
    // ★★★ 最重要：Svelteリアクティビティ原則に従った純粋な再代入 ★★★
    deckStore.state.layout.columns = e.detail.items;
    
    // 保存処理（非同期で実行）
    try {
      await deckStore.save();
      debugLog(`💾 [${componentName}] Column order saved successfully`);
    } catch (saveError) {
      debugError(`🎛️ [${componentName}] Failed to save column order:`, saveError);
    }
    
    // 追加処理があれば実行（エラーハンドリング付き）
    try {
      options.onFinalizeExtra?.(e.detail.items, e.detail.info);
    } catch (extraError) {
      debugError(`🔧 [${componentName}] Extra finalize processing failed:`, extraError);
    }
    
    debugPerformance.end(`${componentName}-finalize`);
  };

  return {
    handleConsider,
    handleFinalize,
    zoneId,
    zoneType,
    isAllowed: () => isDragZoneAllowed(zoneType)
  };
}

/**
 * 共通のドラッグ&ドロップ設定
 */
export const DRAG_DROP_CONFIG = {
  /** アニメーション時間（ミリ秒） */
  flipDurationMs: 200,

  /** パフォーマンス最適化設定 */
  performance: {
    /** 配列比較による不要更新の防止 */
    enableOrderComparison: true,
    /** パフォーマンス測定の有効化 */
    enablePerfMeasurement: true,
    /** 条件付きログ出力 */
    enableConditionalLogging: true
  },

  /**
   * dndzone設定オプションを作成
   * 重複キーエラーを防ぐため、各ゾーンに一意なtypeを設定
   * ゾーン種別による条件付き無効化を含む
   */
  createDndZoneOptions: (columns: Column[], zoneId?: string, forceDisabled = false) => {
    // 重複カラムを除去（同じIDが複数ある場合に一意にする）
    const uniqueColumns = DRAG_DROP_CONFIG.deduplicateColumns(columns);
    const isDisabled = forceDisabled || uniqueColumns.length <= 1;
    
    // デバイス種別を考慮した一意なtypeを生成
    const devicePrefix = typeof window !== 'undefined' && window.innerWidth < 768 ? 'mobile' : 'desktop';
    const uniqueType = zoneId ? `${devicePrefix}-${zoneId}` : `${devicePrefix}-${nanoid(12)}`;
    
    console.log(`🔧 [DND Config] Creating zone options - Type: ${uniqueType}, Disabled: ${isDisabled}, Original: ${columns.length}, Unique: ${uniqueColumns.length}`);
    
    // 重複がある場合は警告
    if (columns.length !== uniqueColumns.length) {
      console.warn(`⚠️ [DND Config] Duplicate columns detected and removed: ${columns.length} → ${uniqueColumns.length}`);
    }
    
    return {
      items: uniqueColumns,
      flipDurationMs: DRAG_DROP_CONFIG.flipDurationMs,
      dropTargetStyle: {},
      dragDisabled: isDisabled,
      zoneTabIndex: -1,
      morphDisabled: false,
      transformDraggedElement: () => {},
      // デバイス種別+ゾーンIDによる一意なtype
      type: uniqueType
    };
  },

  /**
   * カラム配列の重複を除去
   */
  deduplicateColumns: (columns: Column[]): Column[] => {
    const seen = new Set<string>();
    const unique: Column[] = [];
    
    for (const column of columns) {
      if (!seen.has(column.id)) {
        seen.add(column.id);
        unique.push(column);
      }
    }
    
    return unique;
  },

  /**
   * 一意なゾーンIDを生成
   */
  generateZoneId: (prefix = 'zone') => `${prefix}-${nanoid(8)}`
} as const;

/**
 * カラム切り替え用の共通ロジック
 */
export function createColumnSwitcher(
  deckStore: DeckStoreInterface,
  componentName: string
) {
  return (columnId: string) => {
    deckStore.state.activeColumnId = columnId;
    
    // カスタムイベントを発行してDeckContainerに通知
    const event = new CustomEvent('tabColumnSwitch', {
      detail: { columnId },
      bubbles: true
    });
    window.dispatchEvent(event);
    
    debugLog(`🎛️ [${componentName}] Switched to column:`, columnId);
  };
}