<!--
  DeckContainer.svelte
  メインデッキコンテナ
  
  tokimekiblueskyのDecks.svelteを参考にしつつ、
  moodeSky独自のTauri統合・多言語対応・テーマシステム連携
-->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import Icon from '$lib/components/Icon.svelte';
  import { ICONS } from '$lib/types/icon.js';
  import { deckStore } from '../store.svelte.js';
  import type { Column } from '../types.js';
  import DeckColumn from './DeckColumn.svelte';
  import AddDeckModal from './AddDeckModal.svelte';
  import DeckSettingsModal from './DeckSettingsModal.svelte';
  // import ColumnIndicators from './ColumnIndicators.svelte'; // 上部タブに統一のため削除
  import { SwipeDetector, CircularColumnNavigator, ColumnIntersectionObserver } from '../utils/swipeDetector.js';
  import { COLUMN_WIDTHS } from '../types.js';
  import { debugLog, debugError, debugWarn } from '$lib/utils/debugUtils.js';
  import { SWIPE_CONFIG, NAVIGATION_CONFIG } from '../config/swipeConfig.js';
  import * as m from '../../../paraglide/messages.js';
  import type { TabSyncEventDetail, DesktopScrollEventDetail } from '$lib/types/dragDrop.js';

  // ===================================================================
  // Props
  // ===================================================================

  interface Props {
    accountId: string;
    className?: string;
    showAddDeckModal?: boolean;
    onCloseAddDeckModal?: () => void;
  }

  const { accountId, className = '', showAddDeckModal: externalShowAddDeckModal = false, onCloseAddDeckModal }: Props = $props();

  // ===================================================================
  // 状態管理
  // ===================================================================

  let isInitializing = $state(true);
  
  // モーダル状態は外部プロップまたは内部状態を使用
  let internalShowAddDeckModal = $state(false);
  const showAddDeckModal = $derived(externalShowAddDeckModal || internalShowAddDeckModal);
  
  // デッキ設定モーダル状態
  let showDeckSettingsModal = $state(false);
  let currentSettingsColumn = $state<Column | null>(null);
  
  // レスポンシブ状態管理
  let isMobile = $state(false);
  
  // デスクトップ・モバイル要素参照を分離
  let desktopDeckElement = $state<HTMLElement>();
  let mobileDeckElement = $state<HTMLElement>();
  let activeColumnIndex = $state(0);
  let swipeDetector: SwipeDetector | undefined;
  let columnNavigator: CircularColumnNavigator | undefined;
  let intersectionObserver: ColumnIntersectionObserver | undefined;
  let stateMonitorInterval: number | undefined;
  // let debugState = $state({ canSwipe: true, isAnimating: false, timeSinceLastSwipe: 0 }); // 未使用のため削除
  let isSwipeInProgress = $state(false); // スワイプ中フラグ（IntersectionObserver制御用）
  
  // 競合状態防止用の状態管理
  let isSyncInProgress = $state(false);
  let lastSyncTime = 0;
  let pendingSyncDebounceTimeout: number | undefined;
  const SYNC_DEBOUNCE_MS = 75; // 同期処理のデバウンス間隔

  // ===================================================================
  // ライフサイクル・初期化
  // ===================================================================

  onMount(async () => {
    try {
      debugLog('🎛️ [DeckContainer] Initializing for account:', accountId);
      
      // レスポンシブ判定の初期化
      updateResponsiveState();
      
      // ウィンドウリサイズ監視
      window.addEventListener('resize', updateResponsiveState);
      
      // タブ/デッキ同期イベント監視
      window.addEventListener('columnOrderChanged', handleColumnOrderChanged as EventListener);
      
      await deckStore.initialize(accountId);
      debugLog('🎛️ [DeckContainer] Deck store initialized, columns:', deckStore.columns.length);
      
      // デッキ機能の初期化
      if (deckStore.columns.length > 0) {
        // DOM要素の準備を待つ
        setTimeout(() => {
          initializeDeckFeatures();
          
          // 自動監視システムの開始（モバイルのみ）
          if (isMobile) {
            startStateMonitoring();
          }
        }, 100);
      }
    } catch (error) {
      debugError('🎛️ [DeckContainer] Failed to initialize deck store:', error);
    } finally {
      isInitializing = false;
    }
  });
  
  onDestroy(() => {
    // クリーンアップ
    window.removeEventListener('resize', updateResponsiveState);
    window.removeEventListener('columnOrderChanged', handleColumnOrderChanged as EventListener);
    swipeDetector?.destroy();
    intersectionObserver?.destroy();
    
    // 状態監視の停止
    if (stateMonitorInterval) {
      clearInterval(stateMonitorInterval);
    }
    
    // ペンディング同期処理のクリーンアップ
    if (pendingSyncDebounceTimeout) {
      clearTimeout(pendingSyncDebounceTimeout);
    }
  });

  // ===================================================================
  // レスポンシブ状態管理
  // ===================================================================
  
  /**
   * レスポンシブ状態を更新（768px基準）
   */
  function updateResponsiveState() {
    const newIsMobile = window.innerWidth < 768;
    if (newIsMobile !== isMobile) {
      debugLog('🎛️ [DeckContainer] Responsive state changed:', { 
        from: isMobile ? 'mobile' : 'desktop', 
        to: newIsMobile ? 'mobile' : 'desktop',
        windowWidth: window.innerWidth 
      });
      isMobile = newIsMobile;
      
      // プラットフォーム変更時は既存の機能をクリーンアップして再初期化
      if (deckStore.columns.length > 0) {
        cleanupDeckFeatures();
        setTimeout(() => {
          initializeDeckFeatures();
        }, 100);
      }
    }
  }
  
  /**
   * デッキ機能のクリーンアップ
   */
  function cleanupDeckFeatures() {
    swipeDetector?.destroy();
    intersectionObserver?.destroy();
    swipeDetector = undefined;
    columnNavigator = undefined;
    intersectionObserver = undefined;
    debugLog('🎛️ [DeckContainer] Deck features cleaned up');
  }

  // ===================================================================
  // イベントハンドラー
  // ===================================================================

  /**
   * タブ/デッキ同期イベントハンドラー（デバウンス付き）
   * ドラッグ&ドロップでの高速連続操作への対応
   */
  function handleColumnOrderChanged(event: Event) {
    // 既存のペンディング処理をクリア
    if (pendingSyncDebounceTimeout) {
      clearTimeout(pendingSyncDebounceTimeout);
    }
    
    // デバウンス処理: 一定時間後に実際の同期処理を実行
    pendingSyncDebounceTimeout = window.setTimeout(() => {
      handleColumnOrderChangedImmediate(event);
      pendingSyncDebounceTimeout = undefined;
    }, SYNC_DEBOUNCE_MS);
  }

  /**
   * タブ/デッキ同期の即座実行
   * エッジケース対応: 無効インデックス・空状態・データ不整合・競合状態防止
   */
  function handleColumnOrderChangedImmediate(event: Event) {
    // 同期処理中の重複実行を防ぐ
    if (isSyncInProgress) {
      debugLog('⚠️ [DeckContainer] Sync already in progress, skipping duplicate event');
      return;
    }
    
    isSyncInProgress = true;
    const syncStartTime = Date.now();
    
    try {
      const customEvent = event as CustomEvent;
      const { 
        activeColumnIndex: newActiveIndex, 
        source, 
        activeColumnId,
        reason,
        deletedColumnId 
      } = customEvent.detail;
      
      debugLog('🔄 [DeckContainer] Column order changed event received:', {
        source,
        reason,
        oldActiveIndex: activeColumnIndex,
        newActiveIndex,
        activeColumnId,
        deletedColumnId,
        isMobile,
        totalColumns: deckStore.columns.length,
        timeSinceLastSync: syncStartTime - lastSyncTime
      });
    
    // エッジケース: 空のデッキ状態
    if (deckStore.columns.length === 0) {
      debugLog('⚠️ [DeckContainer] Empty deck state - resetting activeColumnIndex to 0');
      activeColumnIndex = 0;
      return;
    }
    
    // エッジケース: 無効なインデックス範囲
    const maxValidIndex = deckStore.columns.length - 1;
    const validatedIndex = Math.max(0, Math.min(newActiveIndex, maxValidIndex));
    
    if (validatedIndex !== newActiveIndex) {
      debugWarn('🔄 [DeckContainer] Invalid activeColumnIndex received, clamping:', {
        received: newActiveIndex,
        validated: validatedIndex,
        maxValid: maxValidIndex
      });
    }
    
    // activeColumnIndexを新しい位置に更新
    if (validatedIndex !== activeColumnIndex) {
      const oldIndex = activeColumnIndex;
      activeColumnIndex = validatedIndex;
      
      debugLog('✅ [DeckContainer] activeColumnIndex synchronized:', {
        oldIndex,
        newIndex: activeColumnIndex,
        activeColumnId,
        wasValidated: validatedIndex !== newActiveIndex
      });
      
      // モバイル機能が有効な場合は追加同期
      if (isMobile && deckStore.columns.length > 0) {
        // CircularColumnNavigatorとの同期（境界チェック付き）
        if (columnNavigator) {
          try {
            columnNavigator.updateCurrentIndex(validatedIndex);
            debugLog('🔄 [DeckContainer] CircularColumnNavigator synced to index:', validatedIndex);
          } catch (navError) {
            debugError('❌ [DeckContainer] CircularColumnNavigator sync failed:', navError);
            // フォールバック: ナビゲーターを再初期化
            if (deckStore.columns.length > 0) {
              setTimeout(() => {
                initializeMobileFeatures();
              }, 100);
            }
          }
        }
        
        // IntersectionObserverは自動で追従するため手動同期不要
        // SwipeDetectorは状態のみなので同期不要
        
        debugLog('📱 [DeckContainer] Mobile navigation components synchronized');
      }
    }
    
    // 特別なケース: アクティブカラム削除による同期
    if (reason === 'activeColumnDeleted') {
      debugLog('🗑️ [DeckContainer] Active column was deleted, ensuring full resync:', {
        deletedColumnId,
        newActiveColumnId: activeColumnId,
        newActiveIndex: validatedIndex
      });
      
      // 削除後の状態確認とフル再同期
      if (isMobile && deckStore.columns.length > 0) {
        setTimeout(() => {
          // モバイル機能の完全再初期化
          cleanupDeckFeatures();
          initializeMobileFeatures();
        }, 150);
      }
    }
    
    } finally {
      // 同期処理の完了をマーク（必ず実行）
      isSyncInProgress = false;
      lastSyncTime = Date.now();
      
      const syncDuration = lastSyncTime - syncStartTime;
      debugLog('✅ [DeckContainer] Column sync completed:', {
        duration: `${syncDuration}ms`,
        finalActiveIndex: activeColumnIndex,
        finalActiveId: deckStore.state.activeColumnId
      });
    }
  }

  /**
   * Add Deck モーダルを開く
   */
  function handleAddDeck() {
    internalShowAddDeckModal = true;
  }

  /**
   * デッキ設定モーダルを開く
   */
  function handleOpenSettings(column: Column) {
    console.log('🎛️ [DeckContainer] Opening deck settings modal for column:', column.id, column.settings.title);
    currentSettingsColumn = column;
    showDeckSettingsModal = true;
  }

  /**
   * デッキ設定モーダルを閉じる
   */
  function handleCloseSettings() {
    showDeckSettingsModal = false;
    currentSettingsColumn = null;
  }

  /**
   * Add Deck モーダルを閉じる
   */
  function handleCloseAddDeckModal() {
    if (onCloseAddDeckModal) {
      // 外部のコールバックが提供されている場合は使用
      onCloseAddDeckModal();
    } else {
      // 内部状態の場合は直接操作
      internalShowAddDeckModal = false;
    }
  }

  /**
   * Add Deck モーダルでデッキ作成成功時のコールバック
   */
  function handleDeckCreated(column: Column) {
    debugLog('🎛️ [DeckContainer] New deck created:', column);
    
    // デッキ機能を再初期化
    setTimeout(() => {
      if (deckStore.columns.length > 0) {
        initializeDeckFeatures();
        
        // モバイルデッキ機能の初期化
        if (isMobile) {
          startStateMonitoring();
        }
      }
    }, 100);
  }
  
  /**
   * デッキ機能の統合初期化（レスポンシブ対応）
   */
  function initializeDeckFeatures() {
    debugLog('🎛️ [DeckContainer] Initializing deck features, isMobile:', isMobile);
    debugLog('🎛️ [DeckContainer] Window size:', `${window.innerWidth}x${window.innerHeight}`);
    debugLog('🎛️ [DeckContainer] Available elements:', { 
      mobile: !!mobileDeckElement, 
      desktop: !!desktopDeckElement 
    });
    
    if (isMobile) {
      initializeMobileFeatures();
    } else {
      initializeDesktopFeatures();
    }
  }
  
  /**
   * デスクトップ機能の初期化
   */
  function initializeDesktopFeatures() {
    if (!desktopDeckElement) {
      debugWarn('🎛️ [DeckContainer] desktopDeckElement not available');
      return;
    }
    
    try {
      debugLog('🎛️ [DeckContainer] Starting desktop features initialization...');
      debugLog('🎛️ [DeckContainer] Columns available:', deckStore.columns.length);
      debugLog('🎛️ [DeckContainer] Current activeColumnId:', deckStore.state.activeColumnId);
      
      // 1. デスクトップでは activeColumnId の概念を削除
      // モバイルとは異なり、全カラムが同時に表示されるため不要
      debugLog('🎛️ [DeckContainer] Desktop mode: activeColumnId concept not needed');
      
      // 2. 水平スクロール制御
      if (desktopDeckElement) {
        // スクロール位置をリセット
        desktopDeckElement.scrollLeft = 0;
        
        // 要素の詳細な可視性チェック
        debugLog('🚨 [VISIBILITY DEBUG] Desktop element details:', {
          element: desktopDeckElement,
          className: desktopDeckElement.className,
          offsetWidth: desktopDeckElement.offsetWidth,
          offsetHeight: desktopDeckElement.offsetHeight,
          clientWidth: desktopDeckElement.clientWidth,
          clientHeight: desktopDeckElement.clientHeight,
          scrollWidth: desktopDeckElement.scrollWidth,
          scrollHeight: desktopDeckElement.scrollHeight
        });
        
        // 親要素の高さ確認
        const parentElement = desktopDeckElement.parentElement;
        if (parentElement) {
          debugLog('🚨 [HEIGHT DEBUG] Parent element:', {
            tagName: parentElement.tagName,
            className: parentElement.className,
            offsetHeight: parentElement.offsetHeight,
            clientHeight: parentElement.clientHeight,
            computedHeight: window.getComputedStyle(parentElement).height
          });
        }
        
        // Computed Styleの詳細確認
        const computedStyle = window.getComputedStyle(desktopDeckElement);
        debugLog('🚨 [VISIBILITY DEBUG] Computed styles:', {
          display: computedStyle.display,
          visibility: computedStyle.visibility,
          opacity: computedStyle.opacity,
          width: computedStyle.width,
          height: computedStyle.height,
          overflow: computedStyle.overflow,
          overflowX: computedStyle.overflowX,
          overflowY: computedStyle.overflowY,
          position: computedStyle.position,
          zIndex: computedStyle.zIndex,
          transform: computedStyle.transform,
          padding: computedStyle.padding,
          margin: computedStyle.margin,
          backgroundColor: computedStyle.backgroundColor,
          border: computedStyle.border
        });
        
        // 親要素の階層チェック
        let parent = desktopDeckElement.parentElement;
        let level = 1;
        while (parent && level <= 5) {
          const parentStyle = window.getComputedStyle(parent);
          debugLog(`🚨 [VISIBILITY DEBUG] Parent level ${level}:`, {
            tagName: parent.tagName,
            className: parent.className,
            display: parentStyle.display,
            visibility: parentStyle.visibility,
            opacity: parentStyle.opacity,
            width: parentStyle.width,
            height: parentStyle.height,
            overflow: parentStyle.overflow
          });
          parent = parent.parentElement;
          level++;
        }
        
        // 3. DOM要素の状態確認
        const columnElements = desktopDeckElement.querySelectorAll('.deck-column-wrapper');
        debugLog('🚨 [VISIBILITY DEBUG] Column elements found:', columnElements.length);
        
        columnElements.forEach((element, index) => {
          const rect = element.getBoundingClientRect();
          const computedColumnStyle = window.getComputedStyle(element);
          debugLog(`🚨 [VISIBILITY DEBUG] Column ${index} details:`, {
            element: element,
            boundingRect: {
              width: rect.width,
              height: rect.height,
              top: rect.top,
              left: rect.left,
              right: rect.right,
              bottom: rect.bottom,
              visible: rect.width > 0 && rect.height > 0
            },
            computedStyle: {
              display: computedColumnStyle.display,
              visibility: computedColumnStyle.visibility,
              opacity: computedColumnStyle.opacity,
              width: computedColumnStyle.width,
              height: computedColumnStyle.height,
              position: computedColumnStyle.position,
              transform: computedColumnStyle.transform
            },
            offsetDimensions: {
              offsetWidth: (element as HTMLElement).offsetWidth,
              offsetHeight: (element as HTMLElement).offsetHeight
            }
          });
          
          // 子要素（DeckColumn）の確認
          const deckColumnEl = element.querySelector('.deck-column');
          if (deckColumnEl) {
            const deckColumnStyle = window.getComputedStyle(deckColumnEl);
            debugLog(`🚨 [VISIBILITY DEBUG] DeckColumn ${index} child:`, {
              display: deckColumnStyle.display,
              visibility: deckColumnStyle.visibility,
              width: deckColumnStyle.width,
              height: deckColumnStyle.height
            });
          }
        });
        
        // 4. SideNavigationの状態確認（正しいセレクタを使用）
        const sideNav = document.querySelector('nav[aria-label]');
        if (sideNav) {
          const sideNavStyle = window.getComputedStyle(sideNav);
          debugLog('🚨 [VISIBILITY DEBUG] SideNavigation:', {
            element: sideNav,
            display: sideNavStyle.display,
            visibility: sideNavStyle.visibility,
            width: sideNavStyle.width,
            height: sideNavStyle.height,
            position: sideNavStyle.position,
            zIndex: sideNavStyle.zIndex
          });
        } else {
          debugWarn('🚨 [VISIBILITY DEBUG] SideNavigation not found!');
        }
        
        // 5. 高さ計算の詳細確認
        debugLog('🚨 [HEIGHT DEBUG] Page structure:', {
          viewportHeight: window.innerHeight,
          documentHeight: document.documentElement.clientHeight,
          bodyHeight: document.body.clientHeight,
          expectedDeckHeight: `${window.innerHeight - 128}px`,
          actualDeckHeight: computedStyle.height
        });
        
        // 6. hidden/flexクラスの動作確認
        debugLog('🚨 [CLASS DEBUG] Desktop deck element classes:', {
          classList: desktopDeckElement.classList.toString(),
          hasHidden: desktopDeckElement.classList.contains('hidden'),
          hasFlex: desktopDeckElement.classList.contains('flex'),
          hasMdFlex: desktopDeckElement.classList.contains('md:flex'),
          computedDisplay: computedStyle.display
        });
      }
      
      // 5. 初期化完了確認
      debugLog('🎛️ [DeckContainer] Desktop features initialization completed');
      debugLog('🎛️ [DeckContainer] Final diagnostic:', {
        columnsCount: deckStore.columns.length,
        desktopElementExists: !!desktopDeckElement,
        windowWidth: window.innerWidth,
        isDesktopSize: window.innerWidth >= 768,
        actualHeight: desktopDeckElement ? desktopDeckElement.offsetHeight : 'N/A',
        computedHeight: desktopDeckElement ? window.getComputedStyle(desktopDeckElement).height : 'N/A',
        parentHeight: desktopDeckElement?.parentElement ? desktopDeckElement.parentElement.offsetHeight : 'N/A'
      });
      
    } catch (error) {
      debugError('🚨 [DeckContainer] Desktop features initialization failed:', error);
      debugError('🚨 [DeckContainer] Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        elementExists: !!desktopDeckElement,
        columnsLength: deckStore.columns.length
      });
    }
  }
  
  /**
   * モバイル機能の初期化
   */
  function initializeMobileFeatures() {
    if (!isMobile) {
      debugLog('🎛️ [DeckContainer] Skipping mobile features on desktop');
      return;
    }
    
    if (!mobileDeckElement) {
      debugWarn('🎛️ [DeckContainer] mobileDeckElement not available, waiting...');
      // DOM要素の準備を再度待つ
      setTimeout(() => {
        if (mobileDeckElement) {
          initializeMobileFeatures();
        }
      }, 50);
      return;
    }
    
    // 既存のインスタンスを確実にクリーンアップ（重複登録防止）
    if (swipeDetector) {
      debugLog('🧹 [DeckContainer] Cleaning up existing SwipeDetector');
      swipeDetector.destroy();
      swipeDetector = undefined;
    }
    if (intersectionObserver) {
      debugLog('🧹 [DeckContainer] Cleaning up existing IntersectionObserver');
      intersectionObserver.destroy();
      intersectionObserver = undefined;
    }
    if (columnNavigator) {
      debugLog('🧹 [DeckContainer] Cleaning up existing ColumnNavigator');
      columnNavigator.forceReset();
      columnNavigator = undefined;
    }
    
    // モバイル用のスワイプ対象要素を取得
    const swipeTarget = mobileDeckElement.querySelector('.deck-columns-track') as HTMLElement;
    if (!swipeTarget) {
      debugError('🎛️ [DeckContainer] Mobile swipe target not found!', {
        mobileDeckElement,
        elementExists: !!mobileDeckElement,
        innerHTML: mobileDeckElement?.innerHTML?.substring(0, 100)
      });
      return;
    }
    
    debugLog('✅ [DeckContainer] Swipe target found successfully', {
      swipeTarget,
      tagName: swipeTarget.tagName,
      className: swipeTarget.className,
      style: swipeTarget.style.cssText,
      boundingRect: swipeTarget.getBoundingClientRect()
    });
    
    // スワイプ検出
    swipeDetector = new SwipeDetector(
      swipeTarget,
      {
        onSwipeLeft: () => {
          // 左スワイプ = 次のページへ（標準的なUI慣習）
          isSwipeInProgress = true;
          columnNavigator?.moveNext();
          // 循環移動のために長めの遅延
          setTimeout(() => {
            isSwipeInProgress = false;
            debugLog('🔄 [DeckContainer] Swipe progress flag cleared');
          }, NAVIGATION_CONFIG.TRANSITION_PROTECT_MS);
        },
        onSwipeRight: () => {
          // 右スワイプ = 前のページへ（標準的なUI慣習）
          isSwipeInProgress = true;
          columnNavigator?.movePrevious();
          // 循環移動のために長めの遅延
          setTimeout(() => {
            isSwipeInProgress = false;
            debugLog('🔄 [DeckContainer] Swipe progress flag cleared');
          }, NAVIGATION_CONFIG.TRANSITION_PROTECT_MS);
        }
      },
      {
        threshold: SWIPE_CONFIG.TOUCH_THRESHOLD_PX,
        velocity: SWIPE_CONFIG.MIN_VELOCITY,
        enableCircular: true
      }
    );
    
    // 循環ナビゲーション
    columnNavigator = new CircularColumnNavigator(
      swipeTarget,
      deckStore.columns.length,
      {
        onColumnChange: (index) => {
          debugLog('🔄 [DeckContainer] onColumnChange called', {
            oldIndex: activeColumnIndex,
            newIndex: index,
            totalColumns: deckStore.columns.length
          });
          
          // Svelte 5 runesでの確実なState更新
          const oldIndex = activeColumnIndex;
          activeColumnIndex = index;
          
          debugLog('✅ [DeckContainer] activeColumnIndex updated', {
            oldIndex,
            newIndex: activeColumnIndex,
            stateUpdated: activeColumnIndex === index,
            isCircular: (oldIndex === 2 && index === 0) || (oldIndex === 0 && index === 2),
            totalColumns: deckStore.columns.length
          });
          
          // DeckStoreのactiveColumnIdも同期更新
          if (deckStore.columns[index]) {
            deckStore.state.activeColumnId = deckStore.columns[index].id;
            debugLog('🔄 [DeckContainer] deckStore.activeColumnId synced', {
              columnId: deckStore.state.activeColumnId
            });
          }
        },
        onTransitionComplete: () => {
          // アニメーション完了をスワイプ検出器に通知
          swipeDetector?.notifyAnimationComplete();
          swipeDetector?.forceReset(); // 追加の安全策
          
          debugLog('✅ [DeckContainer] Transition complete, swipe re-enabled');
          
          // デバッグ状態更新（未使用のため削除）
          // updateDebugState();
        }
      }
    );
    
    // インターセクション監視（循環スワイプとの競合回避）
    intersectionObserver = new ColumnIntersectionObserver((index) => {
      debugLog('👁️ [IntersectionObserver] Column visibility changed', {
        oldIndex: activeColumnIndex,
        newIndex: index,
        totalColumns: deckStore.columns.length,
        isNavigatorTransitioning: columnNavigator?.isCurrentlyTransitioning(),
        isSwipeInProgress,
        wouldBeCircular: (activeColumnIndex === 2 && index === 0) || (activeColumnIndex === 0 && index === 2)
      });
      
      // CircularNavigator遷移中またはスワイプ中は干渉を避ける
      if (columnNavigator?.isCurrentlyTransitioning() || isSwipeInProgress) {
        debugLog('🚫 [IntersectionObserver] Skipping update during transition/swipe', {
          navigatorTransitioning: columnNavigator?.isCurrentlyTransitioning(),
          swipeInProgress: isSwipeInProgress
        });
        return;
      }
      
      // CircularColumnNavigatorと同期
      if (columnNavigator && columnNavigator.getCurrentIndex() !== index) {
        debugLog('🔄 [IntersectionObserver] Syncing NavigatorIndex', {
          navigatorIndex: columnNavigator.getCurrentIndex(),
          intersectionIndex: index
        });
        columnNavigator.updateCurrentIndex(index);
      }
      
      // DeckContainerのactiveColumnIndexも更新
      if (activeColumnIndex !== index) {
        debugLog('🔄 [IntersectionObserver] Updating activeColumnIndex', {
          oldIndex: activeColumnIndex,
          newIndex: index
        });
        activeColumnIndex = index;
        
        // DeckStoreとも同期
        if (deckStore.columns[index]) {
          deckStore.state.activeColumnId = deckStore.columns[index].id;
        }
      }
    });
    
    // モバイルカラム要素を監視
    const columnElements = swipeTarget.querySelectorAll('.deck-column-mobile-wrapper') as NodeListOf<HTMLElement>;
    intersectionObserver.observeColumns(Array.from(columnElements));
    
    debugLog('🎛️ [DeckContainer] Mobile features initialized for', `${deckStore.columns.length} columns`);
  }
  
  // /**
  //  * カラムインジケーターからの選択 - 未使用のため削除
  //  */
  // function handleColumnSelect(index: number) {
  //   columnNavigator?.scrollToColumn(index);
  // }

  // /**
  //  * デバッグ状態の更新 - 未使用のため削除
  //  */
  // function updateDebugState() {
  //   if (swipeDetector) {
  //     const state = swipeDetector.getDebugState() as any;
  //     debugState = {
  //       canSwipe: state.canSwipe,
  //       isAnimating: state.isAnimating,
  //       timeSinceLastSwipe: state.timeSinceLastSwipe
  //     };
  //   }
  // }

  // /**
  //  * 手動リセット機能 - 未使用のため削除
  //  */
  // function handleManualReset() {
  //   debugLog('🔧 [Manual Reset] Forcing swipe system reset');
  //   swipeDetector?.forceReset();
  //   columnNavigator?.forceReset();
  //   updateDebugState();
  // }

  /**
   * 自動監視システムの開始
   */
  function startStateMonitoring() {
    if (stateMonitorInterval) {
      clearInterval(stateMonitorInterval);
    }
    
    stateMonitorInterval = Number(setInterval(() => {
      if (swipeDetector && columnNavigator) {
        // updateDebugState(); // 未使用のため削除
        
        const swipeState = swipeDetector.getDebugState() as any;
        const navState = columnNavigator.isCurrentlyTransitioning();
        
        // 超積極的な異常状態の検出と自動回復
        if (swipeState.timeSinceLastSwipe > 400 && (swipeState.isAnimating || navState)) {
          debugWarn('🚨 [Auto-Recovery] Stuck state detected, forcing reset');
          debugWarn('🚨 [Auto-Recovery] State:', { 
            swipeAnimating: swipeState.isAnimating, 
            navTransitioning: navState,
            timeSinceLastSwipe: swipeState.timeSinceLastSwipe 
          });
          
          swipeDetector.forceReset();
          columnNavigator.forceReset();
          // updateDebugState(); // 未使用のため削除
        }
      }
    }, 250)); // 超高頻度での監視
    
    debugLog('🔍 [Monitor] State monitoring started');
  }
  
  /**
   * キーボードナビゲーション（デスクトップ用）
   */
  function handleKeyNavigation(event: KeyboardEvent) {
    if (window.innerWidth < 768) return; // モバイルでは無効
    
    if (!desktopDeckElement) return;
    
    if (event.key === 'ArrowLeft' && event.ctrlKey) {
      event.preventDefault();
      // 左にスクロール
      desktopDeckElement.scrollBy({ left: -320, behavior: 'smooth' });
    } else if (event.key === 'ArrowRight' && event.ctrlKey) {
      event.preventDefault();
      // 右にスクロール
      desktopDeckElement.scrollBy({ left: 320, behavior: 'smooth' });
    }
  }

  // ===================================================================
  // CSS変数の計算
  // ===================================================================

  $effect(() => {
    // デッキ設定に基づいてCSS変数を設定
    const settings = deckStore.deckSettings;
    const root = document.documentElement;
    
    root.style.setProperty('--deck-gap', `${settings.gap}px`);
    root.style.setProperty('--deck-padding', `${settings.padding}px`);
  });
  
  // カラム数変更とデッキ機能の監視
  $effect(() => {
    if (deckStore.columns.length > 0 && !isInitializing) {
      // DOM要素の存在確認（プラットフォーム別）
      const hasValidElement = isMobile ? mobileDeckElement : desktopDeckElement;
      
      if (hasValidElement) {
        // カラム数が変更された場合の再初期化
        setTimeout(() => {
          // デッキ機能の再初期化
          initializeDeckFeatures();
          
          // ナビゲーター更新（モバイルのみ）
          if (isMobile && columnNavigator) {
            columnNavigator.updateTotalColumns(deckStore.columns.length);
          }
        }, 150); // DOM更新を待つ
      }
    }
  });
  
  // キーボードナビゲーション
  $effect(() => {
    window.addEventListener('keydown', handleKeyNavigation);
    return () => window.removeEventListener('keydown', handleKeyNavigation);
  });
  
  // タブからの切り替えイベントを受信（モバイル用）
  $effect(() => {
    const handleTabSwitch = (event: CustomEvent<TabSyncEventDetail>) => {
      debugLog('🔄 [DeckContainer] Tab switch event received:', event.detail);
      
      const { columnId } = event.detail;
      const columnIndex = deckStore.columns.findIndex(col => col.id === columnId);
      
      debugLog('🔄 [DeckContainer] Column lookup:', { 
        columnId, 
        columnIndex, 
        totalColumns: deckStore.columns.length,
        currentActiveIndex: activeColumnIndex,
        columns: deckStore.columns.map(col => ({ id: col.id, title: col.settings.title }))
      });
      
      if (columnIndex !== -1 && columnIndex !== activeColumnIndex) {
        const oldIndex = activeColumnIndex;
        activeColumnIndex = columnIndex;
        
        debugLog('✅ [DeckContainer] activeColumnIndex updated:', { 
          from: oldIndex, 
          to: columnIndex,
          columnId: columnId
        });
        
        // スワイプ用のスムーズ移動を実行
        if (columnNavigator && window.innerWidth < 768) {
          columnNavigator.scrollToColumn(columnIndex);
          debugLog('🏃 [DeckContainer] Column navigator scroll triggered for index:', columnIndex);
        }
        
        debugLog('🎛️ [DeckContainer] Tab switch received, index:', columnIndex);
      } else {
        debugLog('⚠️ [DeckContainer] No sync needed:', { 
          columnIndex, 
          activeColumnIndex,
          reason: columnIndex === -1 ? 'Column not found' : 'Already active'
        });
      }
    };
    
    debugLog('🎧 [DeckContainer] Tab switch event listener registered');
    window.addEventListener('tabColumnSwitch', handleTabSwitch as EventListener);
    return () => {
      debugLog('🎧 [DeckContainer] Tab switch event listener removed');
      window.removeEventListener('tabColumnSwitch', handleTabSwitch as EventListener);
    };
  });
  
  // デスクトップ用スクロールイベントを受信
  $effect(() => {
    const handleDesktopScroll = (event: CustomEvent<DesktopScrollEventDetail>) => {
      const { columnIndex } = event.detail;
      
      if (!desktopDeckElement || window.innerWidth < 768) return;
      
      // カラム幅を取得（デフォルト320px + gap 16px）
      const columnWidth = 320 + 16;
      const scrollLeft = columnIndex * columnWidth;
      
      // スムーズスクロール
      desktopDeckElement.scrollTo({
        left: scrollLeft,
        behavior: 'smooth'
      });
      
      debugLog('🎛️ [DeckContainer] Desktop scroll to column:', { columnIndex, scrollLeft });
    };
    
    window.addEventListener('desktopScrollToColumn', handleDesktopScroll as EventListener);
    return () => window.removeEventListener('desktopScrollToColumn', handleDesktopScroll as EventListener);
  });
</script>

<!-- デッキコンテナ -->
<div class="w-full h-full relative flex flex-col flex-1 min-h-0 box-border overflow-hidden {className}" class:loading-overflow-hidden={isInitializing}>
  
  {#if isInitializing}
    <!-- 初期化中 -->
    <div class="flex flex-col items-center justify-center h-full gap-4">
      <div class="animate-spin">
        <Icon icon={ICONS.LOADER} size="lg" color="primary" />
      </div>
      <p class="text-themed opacity-70">
        {m['deck.loading']()}
      </p>
    </div>
    
  {:else if deckStore.isEmpty}
    <!-- 空デッキ状態 -->
    <div class="flex items-center justify-center h-full p-8">
      <div class="text-center max-w-md">
        <div class="mb-6 opacity-40">
          <Icon icon={ICONS.COLUMNS} size="xl" color="themed" />
        </div>
        
        <h2 class="text-themed text-2xl font-bold mb-4">
          {m['deck.empty.title']()}
        </h2>
        
        <p class="text-themed opacity-70 mb-8 leading-relaxed">
          {m['deck.empty.description']()}
        </p>
        
        <button 
          class="button-primary inline-flex items-center gap-2"
          onclick={handleAddDeck}
        >
          <Icon icon={ICONS.ADD} size="sm" color="themed" />
          {m['deck.empty.addFirstColumn']()}
        </button>
      </div>
    </div>
    
  {:else}

    <!-- デッキカラム表示 -->
    {debugLog('🚨 [RENDER DEBUG] Rendering deck columns section')}
    {debugLog('🚨 [RENDER DEBUG] isMobile:', isMobile)}
    {debugLog('🚨 [RENDER DEBUG] deckStore.columns:', deckStore.columns)}
    {debugLog('🚨 [RENDER DEBUG] deckStore.isEmpty:', deckStore.isEmpty)}
    {debugLog('🚨 [RENDER DEBUG] isInitializing:', isInitializing)}
    
    {#if isMobile}
      <!-- モバイル版: 100%幅スワイプ切り替え -->
      {debugLog('🚨 [RENDER DEBUG] Rendering MOBILE deck')}
      {debugLog('🎯 [TRANSFORM DEBUG] activeColumnIndex:', activeColumnIndex)}
      {debugLog('🎯 [TRANSFORM DEBUG] transform value:', `translateX(-${activeColumnIndex * 100}%)`)}
      
      <!-- デバッグ用インデックス表示 -->
      <!-- <div class="debug-index">
        {activeColumnIndex + 1} / {deckStore.columns.length}
      </div> -->

      <!-- デバッグコントロール -->
      <!-- <div class="debug-controls">
        <button 
          class="debug-reset-button"
          onclick={handleManualReset}
        >
          Reset
        </button>
        
        <div class="debug-state">
          {debugState.canSwipe ? '✅' : '🚫'} 
          {debugState.isAnimating ? 'ANIM' : 'READY'}
        </div>
      </div> -->
      
      <div class="w-full flex-1 overflow-hidden relative min-h-0 box-border p-0 m-0 max-w-full" bind:this={mobileDeckElement}>
        <div 
          class="deck-columns-track flex h-full transition-transform duration-150 ease-out will-change-transform"
          style="width: 100%; transform: translateX(-{activeColumnIndex * 100}%); transform-style: preserve-3d;"
        >
          {#each deckStore.columns as column, index (column.id)}
            {debugLog('🚨 [RENDER DEBUG] Rendering MOBILE column:', { id: column.id, title: column.settings.title })}
            <div class="deck-column-mobile-wrapper w-full h-full flex-shrink-0 snap-start min-w-full max-w-full box-border overflow-hidden">
              <DeckColumn
                {column}
                {index}
                {accountId}
                onOpenDeckSettings={() => handleOpenSettings(column)}
              />
            </div>
          {/each}
        </div>
      </div>
    {:else}
      <!-- デスクトップ版: 横並び固定幅 -->
      {debugLog('🚨 [RENDER DEBUG] Rendering DESKTOP deck')}
      <div class="h-full w-full flex-1 overflow-x-auto overflow-y-hidden p-2 scroll-smooth flex items-stretch min-h-0 box-border scrollbar-professional" bind:this={desktopDeckElement}>
        {#each deckStore.columns as column, index (column.id)}
          {debugLog('🚨 [RENDER DEBUG] Rendering DESKTOP column:', { id: column.id, title: column.settings.title })}
          <div 
            class="flex-shrink-0 h-full flex flex-col ml-0 mr-2" 
            style="width: {column.settings.width ? COLUMN_WIDTHS[column.settings.width].width : COLUMN_WIDTHS.medium.width}px"
          >
            <DeckColumn
              {column}
              {index}
              {accountId}
              onOpenDeckSettings={() => handleOpenSettings(column)}
            />
          </div>
        {/each}
      </div>
    {/if}
  {/if}

  <!-- エラー表示 -->
  {#if deckStore.error}
    <div class="deck-error">
      <Icon icon={ICONS.ERROR} size="md" color="error" />
      <span class="text-error">{deckStore.error}</span>
    </div>
  {/if}
</div>

<!-- カラム追加モーダル -->
<AddDeckModal 
  isOpen={showAddDeckModal}
  onClose={handleCloseAddDeckModal}
  onSuccess={handleDeckCreated}
/>

<!-- デッキ設定モーダル -->
<DeckSettingsModal 
  isOpen={showDeckSettingsModal}
  onClose={handleCloseSettings}
  deckId={currentSettingsColumn?.id}
  deckTitle={currentSettingsColumn?.settings.title}
  zIndex={9999}
/>

<style>
  /* deck-container - TailwindCSS移行完了: w-full h-full relative flex flex-col flex-1 min-h-0 box-border overflow-hidden */
  
  .loading-overflow-hidden {
    overflow: hidden;
  }
  
  /* 初期化中 - TailwindCSS移行完了: flex flex-col items-center justify-center h-full gap-4, animate-spin */
  
  /* 空デッキ状態 - TailwindCSS移行完了: flex items-center justify-center h-full p-8, text-center max-w-md, mb-6 opacity-40, text-2xl font-bold mb-4, mb-8 leading-relaxed, inline-flex items-center gap-2 */
  
  /* デスクトップデッキコンテナ */
  .deck-desktop-container {
    /* 確実に親の高さを100%使用 */
    height: 100%;
    width: 100%;
    flex: 1;
    overflow-x: auto;
    overflow-y: hidden;
    padding: 8px !important; /* 全方向8px均等（上右下左） - デスクトップ最適化（CSS変数より優先） */
    scroll-behavior: smooth;
    display: flex;
    align-items: stretch; /* 子要素の高さを確実に揃える */
    min-height: 0; /* flexboxの高さ制御 */
    /* スクロールバーが不要な場合の余白を防止 */
    box-sizing: border-box;
  }
  
  /* モバイルデッキコンテナ */
  .deck-mobile-container {
    width: 100vw; /* ビューポート幅100%で確実に画面幅に合わせる */
    /* Flexboxで親の高さを活用 */
    flex: 1;
    overflow: hidden;
    position: relative;
    min-height: 0; /* flexboxの高さ制御 */
    box-sizing: border-box; /* パディング・ボーダーを幅に含める */
    padding: 0; /* 余計なパディングを削除 */
    /* スワイプ機能のための設定 */
    margin: 0;
    max-width: 100vw; /* 画面からはみ出さないように */
    /* パフォーマンス最適化 */
    contain: layout style paint; /* CSS containment */
  }
  
  .deck-columns-track {
    display: flex;
    height: 100%;
    /* 超高速アニメーション */
    transition: transform 0.15s ease-out;
    will-change: transform; /* GPU加速の明示 */
    transform-style: preserve-3d; /* 3D変換の最適化 */
  }
  
  /* モバイル版でのdeck-columns-track幅制御を削除 */
  /* スワイプ機能のためにwidth: カラム数×100%を保持する必要があるため */
  /* 代わりに、個別カラムの幅をより厳密に制御 */
  
  /* カラムラッパー */
  .deck-column-wrapper {
    height: 100%; /* 親コンテナの高さに合わせる */
    display: flex;
    flex-direction: column;
    margin-left: 0; /* 全カラムで左マージンなし - タイトなレイアウト */
    margin-right: 8px; /* 全カラムで右余白8px */
  }
  
  .deck-column-mobile-wrapper {
    /* スワイプ機能のための幅設定: 画面幅100%で統一 */
    width: 100% !important; /* 親コンテナの100%を確実に取得 */
    height: 100%;
    flex-shrink: 0;
    scroll-snap-align: start;
    /* 確実な幅制御と溢れ防止 */
    min-width: 100%;
    max-width: 100%;
    box-sizing: border-box; /* パディング・ボーダーを幅に含める */
    overflow: hidden; /* 横スクロールを防止 */
    padding: 0; /* 余計なパディングを削除 */
    margin: 0; /* 余計なマージンを削除 */
  }
  
  /* カラム追加ボタン - TailwindCSS移行完了: flex-shrink-0 flex items-center justify-center min-w-20, w-16 h-16 rounded-full bg-card border-2 border-dashed border-primary/30 flex items-center justify-center transition-all duration-200 hover:border-primary/60 hover:bg-primary/5 */
  
  /* エラー表示 - TailwindCSS移行完了: fixed bottom-4 right-4 bg-error/10 border border-error/20 rounded-lg p-4 flex items-center gap-3 max-w-sm */
  
  /* モーダル - TailwindCSS移行完了: fixed inset-0 bg-foreground/50 flex items-center justify-center z-50 border-none p-0 m-0 cursor-pointer, bg-card rounded-xl shadow-2xl max-w-md w-full mx-4 border border-themed, flex items-center justify-between p-6 border-b border-themed/20, w-8 h-8 flex items-center justify-center rounded hover:bg-muted/20 transition-colors cursor-pointer, p-6 */
  
  /* カラムタイプボタン - TailwindCSS移行完了: w-full p-4 border border-themed/20 rounded-lg flex items-center gap-3 text-left transition-all duration-200 cursor-pointer hover:border-primary/40 hover:bg-primary/5, flex-1 */
  
  /* デバッグ用インデックス表示 */
  .debug-index {
    position: fixed;
    top: 1rem;
    right: 1rem;
    background-color: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 1rem;
    font-size: 0.875rem;
    font-weight: 600;
    z-index: 1000;
    user-select: none;
    pointer-events: none;
  }

  /* デバッグコントロール */
  .debug-controls {
    position: fixed;
    top: 4rem;
    right: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    z-index: 1000;
  }

  .debug-reset-button {
    background-color: rgba(255, 0, 0, 0.8);
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    user-select: none;
  }

  .debug-reset-button:hover {
    background-color: rgba(255, 0, 0, 1);
  }

  .debug-state {
    background-color: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 0.25rem 0.5rem;
    border-radius: 0.5rem;
    font-size: 0.75rem;
    font-weight: 600;
    text-align: center;
    user-select: none;
    pointer-events: none;
  }
  
  /* デバッグ表示を復活（スワイプ動作確認のため） */
  .debug-index,
  .debug-controls {
    display: block;
  }

  /* デスクトップでは非表示 */
  @media (min-width: 768px) {
    .debug-index,
    .debug-controls {
      display: none;
    }
  }
</style>