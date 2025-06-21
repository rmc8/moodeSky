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
  // import ColumnIndicators from './ColumnIndicators.svelte'; // 上部タブに統一のため削除
  import { SwipeDetector, CircularColumnNavigator, ColumnIntersectionObserver } from '../utils/swipeDetector.js';
  import { COLUMN_WIDTHS } from '../types.js';
  import * as m from '../../../paraglide/messages.js';

  // ===================================================================
  // Props
  // ===================================================================

  interface Props {
    accountId: string;
    className?: string;
  }

  const { accountId, className = '' }: Props = $props();

  // ===================================================================
  // 状態管理
  // ===================================================================

  let isInitializing = $state(true);
  let showAddColumnModal = $state(false);
  
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
  let debugState = $state({ canSwipe: true, isAnimating: false, timeSinceLastSwipe: 0 });

  // ===================================================================
  // ライフサイクル・初期化
  // ===================================================================

  onMount(async () => {
    try {
      console.log('🎛️ [DeckContainer] Initializing for account:', accountId);
      
      // レスポンシブ判定の初期化
      updateResponsiveState();
      
      // ウィンドウリサイズ監視
      window.addEventListener('resize', updateResponsiveState);
      
      await deckStore.initialize(accountId);
      console.log('🎛️ [DeckContainer] Deck store initialized, columns:', deckStore.columns.length);
      
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
      console.error('🎛️ [DeckContainer] Failed to initialize deck store:', error);
    } finally {
      isInitializing = false;
    }
  });
  
  onDestroy(() => {
    // クリーンアップ
    window.removeEventListener('resize', updateResponsiveState);
    swipeDetector?.destroy();
    intersectionObserver?.destroy();
    
    // 状態監視の停止
    if (stateMonitorInterval) {
      clearInterval(stateMonitorInterval);
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
      console.log('🎛️ [DeckContainer] Responsive state changed:', { 
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
    console.log('🎛️ [DeckContainer] Deck features cleaned up');
  }

  // ===================================================================
  // イベントハンドラー
  // ===================================================================

  /**
   * カラム追加モーダルを開く
   */
  function handleAddColumn() {
    showAddColumnModal = true;
  }

  /**
   * カラム追加モーダルを閉じる
   */
  function handleCloseAddModal() {
    showAddColumnModal = false;
  }

  /**
   * デモ用のホームタイムラインカラムを追加
   */
  async function handleAddHomeColumn() {
    try {
      if (!accountId) {
        console.warn('🎛️ [DeckContainer] accountId not provided, cannot add column');
        return;
      }
      
      await deckStore.addColumn(accountId, 'reverse_chronological', {
        title: 'ホームタイムライン',
        subtitle: 'フォロー中のユーザーの投稿'
      });
      showAddColumnModal = false;
      console.log('🎛️ [DeckContainer] Home column added');
      
      // デッキ機能を再初期化
      setTimeout(() => {
        if (deckStore.columns.length > 0) {
          initializeDeckFeatures();
        }
      }, 100);
    } catch (error) {
      console.error('🎛️ [DeckContainer] Failed to add home column:', error);
    }
  }
  
  /**
   * デッキ機能の統合初期化（レスポンシブ対応）
   */
  function initializeDeckFeatures() {
    console.log('🎛️ [DeckContainer] Initializing deck features, isMobile:', isMobile);
    console.log('🎛️ [DeckContainer] Window size:', window.innerWidth, 'x', window.innerHeight);
    console.log('🎛️ [DeckContainer] Available elements:', { 
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
      console.warn('🎛️ [DeckContainer] desktopDeckElement not available');
      return;
    }
    
    try {
      console.log('🎛️ [DeckContainer] Starting desktop features initialization...');
      console.log('🎛️ [DeckContainer] Columns available:', deckStore.columns.length);
      console.log('🎛️ [DeckContainer] Current activeColumnId:', deckStore.state.activeColumnId);
      
      // 1. デスクトップでは activeColumnId の概念を削除
      // モバイルとは異なり、全カラムが同時に表示されるため不要
      console.log('🎛️ [DeckContainer] Desktop mode: activeColumnId concept not needed');
      
      // 2. 水平スクロール制御
      if (desktopDeckElement) {
        // スクロール位置をリセット
        desktopDeckElement.scrollLeft = 0;
        
        // 要素の詳細な可視性チェック
        console.log('🚨 [VISIBILITY DEBUG] Desktop element details:', {
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
          console.log('🚨 [HEIGHT DEBUG] Parent element:', {
            tagName: parentElement.tagName,
            className: parentElement.className,
            offsetHeight: parentElement.offsetHeight,
            clientHeight: parentElement.clientHeight,
            computedHeight: window.getComputedStyle(parentElement).height
          });
        }
        
        // Computed Styleの詳細確認
        const computedStyle = window.getComputedStyle(desktopDeckElement);
        console.log('🚨 [VISIBILITY DEBUG] Computed styles:', {
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
          console.log(`🚨 [VISIBILITY DEBUG] Parent level ${level}:`, {
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
        console.log('🚨 [VISIBILITY DEBUG] Column elements found:', columnElements.length);
        
        columnElements.forEach((element, index) => {
          const rect = element.getBoundingClientRect();
          const computedColumnStyle = window.getComputedStyle(element);
          console.log(`🚨 [VISIBILITY DEBUG] Column ${index} details:`, {
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
            console.log(`🚨 [VISIBILITY DEBUG] DeckColumn ${index} child:`, {
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
          console.log('🚨 [VISIBILITY DEBUG] SideNavigation:', {
            element: sideNav,
            display: sideNavStyle.display,
            visibility: sideNavStyle.visibility,
            width: sideNavStyle.width,
            height: sideNavStyle.height,
            position: sideNavStyle.position,
            zIndex: sideNavStyle.zIndex
          });
        } else {
          console.warn('🚨 [VISIBILITY DEBUG] SideNavigation not found!');
        }
        
        // 5. 高さ計算の詳細確認
        console.log('🚨 [HEIGHT DEBUG] Page structure:', {
          viewportHeight: window.innerHeight,
          documentHeight: document.documentElement.clientHeight,
          bodyHeight: document.body.clientHeight,
          expectedDeckHeight: `${window.innerHeight - 128}px`,
          actualDeckHeight: computedStyle.height
        });
        
        // 6. hidden/flexクラスの動作確認
        console.log('🚨 [CLASS DEBUG] Desktop deck element classes:', {
          classList: desktopDeckElement.classList.toString(),
          hasHidden: desktopDeckElement.classList.contains('hidden'),
          hasFlex: desktopDeckElement.classList.contains('flex'),
          hasMdFlex: desktopDeckElement.classList.contains('md:flex'),
          computedDisplay: computedStyle.display
        });
      }
      
      // 5. 初期化完了確認
      console.log('🎛️ [DeckContainer] Desktop features initialization completed');
      console.log('🎛️ [DeckContainer] Final diagnostic:', {
        columnsCount: deckStore.columns.length,
        desktopElementExists: !!desktopDeckElement,
        windowWidth: window.innerWidth,
        isDesktopSize: window.innerWidth >= 768,
        actualHeight: desktopDeckElement ? desktopDeckElement.offsetHeight : 'N/A',
        computedHeight: desktopDeckElement ? window.getComputedStyle(desktopDeckElement).height : 'N/A',
        parentHeight: desktopDeckElement?.parentElement ? desktopDeckElement.parentElement.offsetHeight : 'N/A'
      });
      
    } catch (error) {
      console.error('🚨 [DeckContainer] Desktop features initialization failed:', error);
      console.error('🚨 [DeckContainer] Error details:', {
        message: error.message,
        stack: error.stack,
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
      console.log('🎛️ [DeckContainer] Skipping mobile features on desktop');
      return;
    }
    
    if (!mobileDeckElement) {
      console.warn('🎛️ [DeckContainer] mobileDeckElement not available, waiting...');
      // DOM要素の準備を再度待つ
      setTimeout(() => {
        if (mobileDeckElement) {
          initializeMobileFeatures();
        }
      }, 50);
      return;
    }
    
    // 既存のインスタンスをクリーンアップ
    swipeDetector?.destroy();
    intersectionObserver?.destroy();
    
    // モバイル用のスワイプ対象要素を取得
    const swipeTarget = mobileDeckElement.querySelector('.deck-columns-track') as HTMLElement;
    if (!swipeTarget) {
      console.warn('🎛️ [DeckContainer] Mobile swipe target not found');
      return;
    }
    
    // スワイプ検出
    swipeDetector = new SwipeDetector(
      swipeTarget,
      {
        onSwipeLeft: () => {
          // CircularColumnNavigator を使用して確実に1つ隣に移動
          columnNavigator?.moveNext();
        },
        onSwipeRight: () => {
          // CircularColumnNavigator を使用して確実に1つ隣に移動
          columnNavigator?.movePrevious();
        }
      },
      {
        threshold: 30,  // 超高感度 - 軽いタッチで即反応
        velocity: 0.2,  // より軽いスワイプでも検出
        enableCircular: true
      }
    );
    
    // 循環ナビゲーション
    columnNavigator = new CircularColumnNavigator(
      swipeTarget,
      deckStore.columns.length,
      {
        onColumnChange: (index) => {
          activeColumnIndex = index;
        },
        onTransitionComplete: () => {
          // アニメーション完了をスワイプ検出器に通知
          swipeDetector?.notifyAnimationComplete();
          swipeDetector?.forceReset(); // 追加の安全策
          
          console.log('✅ [DeckContainer] Transition complete, swipe re-enabled');
          
          // デバッグ状態更新
          updateDebugState();
        }
      }
    );
    
    // インターセクション監視
    intersectionObserver = new ColumnIntersectionObserver((index) => {
      activeColumnIndex = index;
      columnNavigator?.updateCurrentIndex(index);
    });
    
    // モバイルカラム要素を監視
    const columnElements = swipeTarget.querySelectorAll('.deck-column-mobile-wrapper') as NodeListOf<HTMLElement>;
    intersectionObserver.observeColumns(Array.from(columnElements));
    
    console.log('🎛️ [DeckContainer] Mobile features initialized for', deckStore.columns.length, 'columns');
  }
  
  /**
   * カラムインジケーターからの選択
   */
  function handleColumnSelect(index: number) {
    columnNavigator?.scrollToColumn(index);
  }

  /**
   * デバッグ状態の更新
   */
  function updateDebugState() {
    if (swipeDetector) {
      const state = swipeDetector.getDebugState() as any;
      debugState = {
        canSwipe: state.canSwipe,
        isAnimating: state.isAnimating,
        timeSinceLastSwipe: state.timeSinceLastSwipe
      };
    }
  }

  /**
   * 手動リセット機能
   */
  function handleManualReset() {
    console.log('🔧 [Manual Reset] Forcing swipe system reset');
    swipeDetector?.forceReset();
    columnNavigator?.forceReset();
    updateDebugState();
  }

  /**
   * 自動監視システムの開始
   */
  function startStateMonitoring() {
    if (stateMonitorInterval) {
      clearInterval(stateMonitorInterval);
    }
    
    stateMonitorInterval = setInterval(() => {
      if (swipeDetector && columnNavigator) {
        updateDebugState();
        
        const swipeState = swipeDetector.getDebugState() as any;
        const navState = columnNavigator.isCurrentlyTransitioning();
        
        // 超積極的な異常状態の検出と自動回復
        if (swipeState.timeSinceLastSwipe > 400 && (swipeState.isAnimating || navState)) {
          console.warn('🚨 [Auto-Recovery] Stuck state detected, forcing reset');
          console.warn('🚨 [Auto-Recovery] State:', { 
            swipeAnimating: swipeState.isAnimating, 
            navTransitioning: navState,
            timeSinceLastSwipe: swipeState.timeSinceLastSwipe 
          });
          
          swipeDetector.forceReset();
          columnNavigator.forceReset();
          updateDebugState();
        }
      }
    }, 250); // 超高頻度での監視
    
    console.log('🔍 [Monitor] State monitoring started');
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
    const handleTabSwitch = (event: CustomEvent) => {
      const { columnId } = event.detail;
      const columnIndex = deckStore.columns.findIndex(col => col.id === columnId);
      if (columnIndex !== -1 && columnIndex !== activeColumnIndex) {
        activeColumnIndex = columnIndex;
        
        // スワイプ用のスムーズ移動を実行
        if (columnNavigator && window.innerWidth < 768) {
          columnNavigator.scrollToColumn(columnIndex);
        }
        
        console.log('🎛️ [DeckContainer] Tab switch received, index:', columnIndex);
      }
    };
    
    window.addEventListener('tabColumnSwitch', handleTabSwitch as EventListener);
    return () => window.removeEventListener('tabColumnSwitch', handleTabSwitch as EventListener);
  });
  
  // デスクトップ用スクロールイベントを受信
  $effect(() => {
    const handleDesktopScroll = (event: CustomEvent) => {
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
      
      console.log('🎛️ [DeckContainer] Desktop scroll to column:', columnIndex, 'scrollLeft:', scrollLeft);
    };
    
    window.addEventListener('desktopScrollToColumn', handleDesktopScroll as EventListener);
    return () => window.removeEventListener('desktopScrollToColumn', handleDesktopScroll as EventListener);
  });
</script>

<!-- デッキコンテナ -->
<div class="deck-container {className}" class:deck-container--loading={isInitializing}>
  
  {#if isInitializing}
    <!-- 初期化中 -->
    <div class="deck-loading">
      <div class="deck-loading__spinner">
        <Icon icon={ICONS.LOADER} size="lg" color="primary" />
      </div>
      <p class="deck-loading__text text-themed opacity-70">
        {m['deck.loading']()}
      </p>
    </div>
    
  {:else if deckStore.isEmpty}
    <!-- 空デッキ状態 -->
    <div class="deck-empty">
      <div class="deck-empty__content">
        <div class="deck-empty__icon">
          <Icon icon={ICONS.COLUMNS} size="xl" color="themed" />
        </div>
        
        <h2 class="deck-empty__title text-themed">
          {m['deck.empty.title']()}
        </h2>
        
        <p class="deck-empty__description text-themed opacity-70">
          {m['deck.empty.description']()}
        </p>
        
        <button 
          class="deck-empty__button button-primary"
          onclick={handleAddColumn}
        >
          <Icon icon={ICONS.ADD} size="sm" color="themed" />
          {m['deck.empty.addFirstColumn']()}
        </button>
      </div>
    </div>
    
  {:else}
    <!-- デッキカラム表示 -->
    {console.log('🚨 [RENDER DEBUG] Rendering deck columns section')}
    {console.log('🚨 [RENDER DEBUG] isMobile:', isMobile)}
    {console.log('🚨 [RENDER DEBUG] deckStore.columns:', deckStore.columns)}
    {console.log('🚨 [RENDER DEBUG] deckStore.isEmpty:', deckStore.isEmpty)}
    {console.log('🚨 [RENDER DEBUG] isInitializing:', isInitializing)}
    
    {#if isMobile}
      <!-- モバイル版: 100%幅スワイプ切り替え -->
      {console.log('🚨 [RENDER DEBUG] Rendering MOBILE deck')}
      
      <!-- デバッグ用インデックス表示 -->
      <div class="debug-index">
        {activeColumnIndex + 1} / {deckStore.columns.length}
      </div>

      <!-- デバッグコントロール -->
      <div class="debug-controls">
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
      </div>
      
      <div class="deck-mobile-container" bind:this={mobileDeckElement}>
        <div 
          class="deck-columns-track"
          style="width: {deckStore.columns.length * 100}%; transform: translateX(-{activeColumnIndex * 100 / deckStore.columns.length}%)"
        >
          {#each deckStore.columns as column, index (column.id)}
            {console.log('🚨 [RENDER DEBUG] Rendering MOBILE column:', column.id, column.settings.title)}
            <div class="deck-column-mobile-wrapper">
              <DeckColumn
                {column}
                {index}
                {accountId}
              />
            </div>
          {/each}
        </div>
      </div>
    {:else}
      <!-- デスクトップ版: 横並び固定幅 -->
      {console.log('🚨 [RENDER DEBUG] Rendering DESKTOP deck')}
      <div class="deck-desktop-container scrollbar-professional" bind:this={desktopDeckElement}>
        {#each deckStore.columns as column, index (column.id)}
          {console.log('🚨 [RENDER DEBUG] Rendering DESKTOP column:', column.id, column.settings.title)}
          <div 
            class="flex-shrink-0 deck-column-wrapper" 
            style="width: {column.settings.width ? COLUMN_WIDTHS[column.settings.width].width : COLUMN_WIDTHS.medium.width}px"
          >
            <DeckColumn
              {column}
              {index}
              {accountId}
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

<!-- カラム追加モーダル（仮実装） -->
{#if showAddColumnModal}
  <button
    class="modal-overlay" 
    onclick={handleCloseAddModal}
    onkeydown={(e) => e.key === 'Escape' && handleCloseAddModal()}
    role="dialog" 
    aria-modal="true"
    aria-label={m['common.close']()}
    tabindex="0"
  >
    <div 
      class="modal-content" 
      onclick={(e) => e.stopPropagation()}
      role="document"
    >
      <div class="modal-header">
        <h3 class="text-themed text-lg font-semibold">
          {m['deck.addColumn']()}
        </h3>
        <div 
          class="modal-close"
          onclick={handleCloseAddModal}
          onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && handleCloseAddModal()}
          role="button"
          tabindex="0"
          aria-label={m['common.close']()}
        >
          <Icon icon={ICONS.CLOSE} size="md" color="themed" />
        </div>
      </div>
      
      <div class="modal-body">
        <p class="text-themed opacity-70 mb-4">
          {m['deck.selectColumnType']()}
        </p>
        
        <!-- デモ用ホームタイムラインボタン -->
        <div 
          class="column-type-button"
          onclick={handleAddHomeColumn}
          onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && handleAddHomeColumn()}
          role="button"
          tabindex="0"
        >
          <Icon icon={ICONS.HOME} size="md" color="primary" />
          <div class="column-type-info">
            <h4 class="text-themed font-medium">ホームタイムライン</h4>
            <p class="text-themed opacity-60 text-sm">フォロー中のユーザーの投稿</p>
          </div>
        </div>
      </div>
    </div>
  </button>
{/if}

<style>
  .deck-container {
    width: 100%;
    height: 100%;
    position: relative;
    /* Flexboxで親の高さを完全に活用 */
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    /* 確実な高さ制御とボックスサイジング */
    box-sizing: border-box;
    overflow: hidden; /* 子要素のスクロール制御 */
  }
  
  .deck-container--loading {
    overflow: hidden;
  }
  
  /* 初期化中 */
  .deck-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: 1rem;
  }
  
  .deck-loading__spinner {
    animation: spin 1s linear infinite;
  }
  
  /* 空デッキ状態 */
  .deck-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 2rem;
  }
  
  .deck-empty__content {
    text-align: center;
    max-width: 28rem;
  }
  
  .deck-empty__icon {
    margin-bottom: 1.5rem;
    opacity: 0.4;
  }
  
  .deck-empty__title {
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: 1rem;
  }
  
  .deck-empty__description {
    font-size: 1rem;
    margin-bottom: 2rem;
    line-height: 1.625;
  }
  
  .deck-empty__button {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  /* デスクトップデッキコンテナ */
  .deck-desktop-container {
    /* 確実に親の高さを100%使用 */
    height: 100%;
    width: 100%;
    flex: 1;
    overflow-x: auto;
    overflow-y: hidden;
    padding: 8px !important; /* 全方向8px均等（上右下左） - デスクトップ最適化（CSS変数より優先） */
    gap: var(--deck-gap, 16px);
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
  }
  
  .deck-column-mobile-wrapper {
    /* スワイプ機能のための幅設定: 画面幅に対する相対値 */
    width: 100vw; /* ビューポート幅100% */
    height: 100%;
    flex-shrink: 0;
    scroll-snap-align: start;
    /* 確実な幅制御 */
    min-width: 100vw;
    max-width: 100vw;
    box-sizing: border-box; /* パディング・ボーダーを幅に含める */
    overflow: hidden; /* 横スクロールを防止 */
  }
  
  /* カラム追加ボタン */
  .deck-add-column {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 80px;
  }
  
  .deck-add-column__button {
    width: 4rem;
    height: 4rem;
    border-radius: 9999px;
    background-color: var(--color-card);
    border: 2px dashed rgb(var(--primary) / 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 200ms;
  }
  
  .deck-add-column__button:hover {
    border-color: rgb(var(--primary) / 0.6);
    background-color: rgb(var(--primary) / 0.05);
  }
  
  /* エラー表示 */
  .deck-error {
    position: fixed;
    bottom: 1rem;
    right: 1rem;
    background-color: rgb(var(--error) / 0.1);
    border: 1px solid rgb(var(--error) / 0.2);
    border-radius: 0.5rem;
    padding: 1rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    max-width: 24rem;
  }
  
  /* モーダル */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgb(var(--foreground) / 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 50;
    border: none;
    padding: 0;
    margin: 0;
    cursor: pointer;
  }
  
  .modal-content {
    background-color: var(--color-card);
    border-radius: 0.75rem;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    max-width: 28rem;
    width: 100%;
    margin-left: 1rem;
    margin-right: 1rem;
    border: 1px solid var(--color-border);
  }
  
  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.5rem;
    border-bottom: 1px solid rgb(var(--border) / 0.2);
  }
  
  .modal-close {
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 0.25rem;
    cursor: pointer;
    transition: background-color 200ms;
  }
  
  .modal-close:hover {
    background-color: rgb(var(--muted) / 0.2);
  }
  
  .modal-body {
    padding: 1.5rem;
  }
  
  /* カラムタイプボタン */
  .column-type-button {
    width: 100%;
    padding: 1rem;
    border: 1px solid rgb(var(--border) / 0.2);
    border-radius: 0.5rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    text-align: left;
    transition: all 200ms;
    cursor: pointer;
  }
  
  .column-type-button:hover {
    border-color: rgb(var(--primary) / 0.4);
    background-color: rgb(var(--primary) / 0.05);
  }
  
  .column-type-info {
    flex: 1;
  }
  
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
  
  /* デスクトップでは非表示 */
  @media (min-width: 768px) {
    .debug-index,
    .debug-controls {
      display: none;
    }
  }
</style>