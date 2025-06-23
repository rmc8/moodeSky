<!--
  FeedConfigModal.svelte
  フィード設定専用モーダル
  
  アカウント選択・詳細設定・デッキ名設定を統合
-->
<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import { ICONS } from '$lib/types/icon.js';
  import AccountSelector from './AccountSelector.svelte';
  import FeedSettings from './FeedSettings.svelte';
  import type { 
    FeedTypeConfig, 
    Column,
    ColumnAlgorithm 
  } from '../types.js';
  import {
    getFeedTypeConfig,
    getDefaultDeckName,
    getFeedTypeIcon
  } from '../types.js';
  import { deckStore } from '../store.svelte.js';
  import { authService } from '$lib/services/authStore.js';
  import type { Account } from '$lib/types/auth.js';

  // ===================================================================
  // Props
  // ===================================================================
  
  interface Props {
    isOpen: boolean;
    feedType: FeedTypeConfig | null;
    onClose: () => void;
    onSuccess: (column: Column) => void;
    onBack: () => void;
  }

  const { isOpen, feedType, onClose, onSuccess, onBack }: Props = $props();

  // ===================================================================
  // State
  // ===================================================================

  let availableAccounts = $state<Account[]>([]);
  let selectedAccountId = $state<string>('');
  let feedConfig = $state<any>({});
  let deckName = $state<string>('');
  let isLoading = $state(false);
  let errorMessage = $state('');

  // ===================================================================
  // Derived
  // ===================================================================

  // アカウント選択肢（全アカウント対応フィード用）
  const accountOptions = $derived(() => {
    if (!feedType) return [];
    
    const options = [...availableAccounts];
    
    // 全アカウント対応フィードの場合は「全アカウント」選択肢を追加
    if (feedType.supportsAllAccounts) {
      options.unshift({
        id: 'all',
        service: '',
        session: null as any,
        profile: {
          did: '',
          handle: '全アカウント',
          displayName: '全アカウント対応',
          avatar: ''
        },
        createdAt: '',
        lastAccessAt: ''
      });
    }
    
    return options;
  });

  // デッキ名の自動生成
  const suggestedDeckName = $derived(() => {
    if (!feedType) return '';
    return getDefaultDeckName(feedType.id, feedConfig);
  });

  // ===================================================================
  // 初期化
  // ===================================================================

  async function loadAccounts() {
    try {
      const result = await authService.getAllAccounts();
      if (result.success && result.data) {
        availableAccounts = result.data;
        
        // デフォルトアカウント選択
        if (feedType?.supportsAllAccounts) {
          selectedAccountId = 'all';
        } else if (result.data.length > 0) {
          selectedAccountId = result.data[0].id;
        }
        
        console.log('🔧 [FeedConfigModal] アカウント読み込み完了:', result.data.length);
      } else {
        console.error('🔧 [FeedConfigModal] アカウント読み込み失敗:', result.error);
        errorMessage = 'アカウントの読み込みに失敗しました';
      }
    } catch (error) {
      console.error('🔧 [FeedConfigModal] アカウント読み込みエラー:', error);
      errorMessage = 'アカウントの読み込み中にエラーが発生しました';
    }
  }

  // フィードタイプ変更時の初期化
  $effect(() => {
    if (isOpen && feedType) {
      loadAccounts();
      feedConfig = {};
      deckName = '';
      errorMessage = '';
    }
  });

  // 推奨デッキ名の自動設定
  $effect(() => {
    const suggested = suggestedDeckName();
    if (suggested && !deckName) {
      deckName = suggested;
    }
  });

  // ===================================================================
  // Event Handlers
  // ===================================================================

  function handleAccountSelect(accountId: string) {
    selectedAccountId = accountId;
  }

  function handleFeedConfigChange(config: any) {
    feedConfig = config;
  }

  async function handleCreate() {
    if (!feedType || !selectedAccountId) {
      errorMessage = '必要な情報が不足しています';
      return;
    }

    isLoading = true;
    errorMessage = '';

    try {
      console.log('🔧 [FeedConfigModal] デッキ作成開始:', {
        feedType: feedType.id,
        account: selectedAccountId,
        config: feedConfig,
        name: deckName
      });

      // 設定の構築
      const finalTitle = deckName || suggestedDeckName();
      const settings = {
        title: finalTitle,
        icon: getFeedTypeIcon(feedType.id),
        width: 'medium' as const,
        autoRefresh: false,
        refreshInterval: 5,
        showRetweets: true,
        showReplies: true,
        showMedia: true,
        isMinimized: false,
        isPinned: false,
        sortOrder: 'newest' as const,
        filterKeywords: [] as string[]
      };

      // アルゴリズム設定の構築
      const algorithmConfig: any = { ...feedConfig };

      // DeckStoreを使用してカラムを作成
      const column = await deckStore.addColumn(
        selectedAccountId,
        feedType.id,
        settings,
        algorithmConfig
      );

      console.log('🔧 [FeedConfigModal] デッキ作成成功:', column);
      
      // 成功コールバック呼び出し
      onSuccess(column);

    } catch (error) {
      console.error('🔧 [FeedConfigModal] デッキ作成エラー:', error);
      errorMessage = 'デッキの作成に失敗しました';
    } finally {
      isLoading = false;
    }
  }

  function handleClose() {
    onClose();
  }

  function handleBack() {
    onBack();
  }
</script>

<!-- モーダルオーバーレイ -->
{#if isOpen && feedType}
  <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-0 transition-all duration-300" style="isolation: isolate;">
    <div class="bg-card rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden transform transition-all duration-300 scale-100">
      <!-- ヘッダー -->
      <div class="bg-gradient-to-r from-primary/5 to-primary/10 px-8 py-6">
        <div class="flex items-center justify-between">
          <div class="flex-1">
            <h2 class="text-themed text-3xl font-bold mb-2 tracking-tight">{feedType.name}の設定</h2>
            <p class="text-secondary text-lg leading-relaxed">
              {feedType.description}
            </p>
          </div>
          <button 
            class="text-themed hover:text-primary transition-all duration-200 p-3 rounded-xl bg-muted/10 border border-solid hover:bg-primary/15 active:bg-primary/20"
            style="border-color: rgb(var(--foreground) / 0.3) !important;"
            onmouseenter={function() { this.style.borderColor = 'rgb(var(--primary) / 0.4) !important'; }}
            onmouseleave={function() { this.style.borderColor = 'rgb(var(--foreground) / 0.3) !important'; }}
            onclick={handleClose}
            aria-label="閉じる"
          >
            <Icon icon={ICONS.CLOSE} size="lg" />
          </button>
        </div>
      </div>

      <!-- コンテンツエリア -->
      <div class="p-8 overflow-y-auto flex-1 custom-scrollbar">
        <!-- エラーメッセージ -->
        {#if errorMessage}
          <div class="mb-6 p-3 bg-error/10 border border-error/20 rounded-lg flex items-center gap-2">
            <Icon icon={ICONS.ERROR} size="sm" color="error" />
            <span class="text-error text-sm">{errorMessage}</span>
          </div>
        {/if}

        <!-- アカウント選択 -->
        <div class="mb-8">
          <h3 class="text-lg font-semibold text-themed mb-4 flex items-center gap-2">
            <Icon icon={ICONS.PERSON} size="sm" color="themed" />
            アカウント選択
          </h3>
          <AccountSelector 
            accounts={accountOptions()}
            selectedAccountId={selectedAccountId}
            onSelect={handleAccountSelect}
            supportsAllAccounts={feedType.supportsAllAccounts}
          />
        </div>

        <!-- フィード詳細設定 -->
        {#if feedType.requiresAdditionalInput}
          <div class="mb-8">
            <h3 class="text-lg font-semibold text-themed mb-4 flex items-center gap-2">
              <Icon icon={ICONS.SETTINGS} size="sm" color="themed" />
              詳細設定
            </h3>
            <FeedSettings 
              feedType={feedType}
              config={feedConfig}
              onChange={handleFeedConfigChange}
            />
          </div>
        {/if}

        <!-- デッキ名設定 -->
        <div class="mb-6">
          <h3 class="text-lg font-semibold text-themed mb-4 flex items-center gap-2">
            <Icon icon={ICONS.EDIT} size="sm" color="themed" />
            デッキ名
          </h3>
          <input 
            type="text"
            class="input-themed"
            bind:value={deckName}
            placeholder={suggestedDeckName()}
          />
          <p class="text-secondary text-sm mt-2">
            空欄の場合は「{suggestedDeckName()}」が使用されます
          </p>
        </div>
      </div>

      <!-- フッター -->
      <div class="bg-gradient-to-r from-muted/5 to-muted/10 px-8 py-6">
        <div class="flex justify-between">
          <button 
            class="px-6 py-3 text-themed hover:text-primary transition-all duration-200 rounded-xl bg-muted/10 border border-solid hover:bg-primary/15 font-semibold tracking-wide active:bg-primary/20 flex items-center gap-2"
            style="border-color: rgb(var(--foreground) / 0.3) !important;"
            onmouseenter={function() { this.style.borderColor = 'rgb(var(--primary) / 0.4) !important'; }}
            onmouseleave={function() { this.style.borderColor = 'rgb(var(--foreground) / 0.3) !important'; }}
            onclick={handleBack}
          >
            <Icon icon={ICONS.ARROW_LEFT} size="sm" />
            戻る
          </button>
          
          <div class="flex gap-3">
            <button 
              class="px-6 py-3 text-themed hover:text-primary transition-all duration-200 rounded-xl bg-muted/10 border border-solid hover:bg-primary/15 font-semibold tracking-wide active:bg-primary/20"
              style="border-color: rgb(var(--foreground) / 0.3) !important;"
              onmouseenter={function() { this.style.borderColor = 'rgb(var(--primary) / 0.4) !important'; }}
              onmouseleave={function() { this.style.borderColor = 'rgb(var(--foreground) / 0.3) !important'; }}
              onclick={handleClose}
            >
              キャンセル
            </button>
            <button 
              class="button-primary px-8 py-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2"
              onclick={handleCreate}
              disabled={isLoading || !selectedAccountId}
            >
              {#if isLoading}
                <Icon icon={ICONS.REFRESH} size="sm" class="animate-spin" color="white" />
              {:else}
                <Icon icon={ICONS.ADD} size="sm" color="white" />
              {/if}
              作成
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}