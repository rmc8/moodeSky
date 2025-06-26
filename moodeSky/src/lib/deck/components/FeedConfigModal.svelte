<!--
  FeedConfigModal.svelte
  統一UIコンポーネントシステム移行版
  
  Modal.svelte + Button.svelte + Input.svelte による実装
-->
<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import { ICONS } from '$lib/types/icon.js';
  import { Modal, Button, Input } from '$lib/components/ui';
  import * as m from '../../../paraglide/messages.js';
  import AccountSelector from './AccountSelector.svelte';
  import FeedSettings from './FeedSettings.svelte';
  import type { 
    FeedTypeConfig, 
    Column
  } from '../types.js';
  import {
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
          handle: m['deck.addDeck.feedConfig.allAccounts'](),
          displayName: m['deck.addDeck.feedConfig.allAccountsDescription'](),
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

  // 推奨デッキ名の自動設定を無効化
  // ユーザビリティ向上のため、自動入力を停止し、プレースホルダーのみ表示
  // $effect(() => {
  //   const suggested = suggestedDeckName();
  //   if (suggested && !deckName) {
  //     deckName = suggested;
  //   }
  // });

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
      errorMessage = m['deck.addDeck.feedConfig.validation.missingInfo']();
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

      // 設定の構築 - 空の場合のみデフォルト名を生成
      const finalTitle = deckName.trim() || suggestedDeckName();
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

      // 全アカウント選択時の対象アカウント配列を準備
      let targetAccounts: Account[] | undefined;
      if (selectedAccountId === 'all') {
        targetAccounts = availableAccounts; // 実際の全アカウント情報を保存
        console.log('🔧 [FeedConfigModal] Setting targetAccounts for all:', targetAccounts.length);
      }

      // DeckStoreを使用してカラムを作成
      const column = await deckStore.addColumn(
        selectedAccountId,
        feedType.id,
        settings,
        algorithmConfig,
        targetAccounts
      );

      console.log('🔧 [FeedConfigModal] デッキ作成成功:', column);
      
      // 成功コールバック呼び出し
      onSuccess(column);

    } catch (error) {
      console.error('🔧 [FeedConfigModal] デッキ作成エラー:', error);
      errorMessage = m['deck.addDeck.feedConfig.validation.createFailed']();
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

<!-- 統一UIコンポーネントシステム -->
<Modal 
  isOpen={isOpen && !!feedType}
  title={m['deck.addDeck.feedConfig.title']({ feedType: feedType?.name ?? 'Unknown' })}
  onClose={handleClose}
  showFooter={true}
  size="lg"
  header={headerSnippet}
  footer={footerSnippet}
>

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
      {m['deck.addDeck.feedConfig.accountSelection']()}
    </h3>
    <AccountSelector 
      accounts={accountOptions()}
      selectedAccountId={selectedAccountId}
      onSelect={handleAccountSelect}
      supportsAllAccounts={feedType?.supportsAllAccounts || false}
    />
  </div>

  <!-- フィード詳細設定 -->
  {#if feedType?.requiresAdditionalInput}
    <div class="mb-8">
      <h3 class="text-lg font-semibold text-themed mb-4 flex items-center gap-2">
        <Icon icon={ICONS.SETTINGS} size="sm" color="themed" />
        {m['deck.addDeck.feedConfig.advancedSettings']()}
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
      {m['deck.addDeck.settings.nameLabel']()}
    </h3>
    <Input 
      type="text"
      bind:value={deckName}
      placeholder={suggestedDeckName()}
      helpText={m['deck.addDeck.feedConfig.helpText']({ suggestedName: suggestedDeckName() })}
    />
  </div>

</Modal>

{#snippet headerSnippet()}
  {#if feedType}
    <p class="text-secondary text-lg leading-relaxed">
      {feedType.description}
    </p>
  {/if}
{/snippet}

{#snippet footerSnippet()}
  <!-- モバイル: 縦並び、タブレット以上: 横並び -->
  <div class="flex flex-col md:flex-row md:justify-between gap-3 flex-wrap">
    <!-- 戻るボタン -->
    <div class="flex justify-center md:justify-start">
      <Button 
        variant="secondary" 
        onclick={handleBack}
        leftIcon={ICONS.ARROW_BACK}
        size="md"
        class="w-full md:w-auto md:min-w-[120px]"
      >
        {m['deck.addDeck.buttons.previous']()}
      </Button>
    </div>
    
    <!-- キャンセル・作成ボタン -->
    <div class="flex flex-col md:flex-row gap-3">
      <Button 
        variant="secondary" 
        onclick={handleClose}
        size="md"
        class="w-full md:w-auto md:min-w-[120px]"
      >
        {m['deck.addDeck.buttons.cancel']()}
      </Button>
      <Button 
        variant="primary" 
        onclick={handleCreate}
        disabled={isLoading || !selectedAccountId}
        loading={isLoading}
        leftIcon={isLoading ? undefined : ICONS.ADD}
        size="md"
        class="w-full md:w-auto md:min-w-[120px]"
      >
        {m['deck.addDeck.buttons.create']()}
      </Button>
    </div>
  </div>
{/snippet}