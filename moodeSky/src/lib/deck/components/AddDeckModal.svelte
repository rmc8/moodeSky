<!--
  AddDeckModal.svelte
  Add Deck拡張機能 - 3ステップウィザードモーダル
  
  アカウント選択 → アルゴリズム選択 → 名前・設定
  スマートデフォルト: 最初のアカウント、reverse_chronological、"Home"名
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import Icon from '$lib/components/Icon.svelte';
  import { ICONS } from '$lib/types/icon.js';
  import { deckStore } from '../store.svelte.js';
  import { authService } from '$lib/services/authStore.js';
  import * as m from '../../../paraglide/messages.js';
  import type {
    AddDeckModalProps,
    AddDeckFormData,
    AddDeckStep,
    AccountOption,
    AlgorithmOption,
    ColumnAlgorithm
  } from '../types.js';
  import {
    ADD_DECK_DEFAULTS,
    ALGORITHM_NAMES,
    ALGORITHM_DESCRIPTIONS,
    COLUMN_ALGORITHM_ICONS
  } from '../types.js';
  import type { Account } from '$lib/types/auth.js';

  // ===================================================================
  // Props
  // ===================================================================

  const { isOpen, onClose, onSuccess }: AddDeckModalProps = $props();

  // ===================================================================
  // 状態管理
  // ===================================================================

  let currentStep = $state<AddDeckStep>('account');
  let isLoading = $state(false);
  let errorMessage = $state('');
  let availableAccounts = $state<Account[]>([]);

  // フォームデータ
  let formData = $state<AddDeckFormData>({
    selectedAccountId: '',
    selectedAlgorithm: ADD_DECK_DEFAULTS.algorithm,
    deckName: '', // 翻訳で設定
    settings: ADD_DECK_DEFAULTS.settings
  });

  // ===================================================================
  // アカウント・アルゴリズム選択肢
  // ===================================================================

  // アカウント選択肢
  const accountOptions = $derived<AccountOption[]>(
    availableAccounts.map((account, index) => ({
      id: account.id,
      handle: account.profile.handle,
      displayName: account.profile.displayName,
      avatar: account.profile.avatar,
      isSelected: index === 0 // 最初のアカウントを初期選択
    }))
  );

  // 翻訳ヘルパー関数
  function getAlgorithmName(algorithm: ColumnAlgorithm): string {
    // @ts-ignore - 動的キーアクセスのため型チェックをスキップ
    return m['deck']['addDeck']['algorithms'][algorithm]['name']();
  }

  function getAlgorithmDescription(algorithm: ColumnAlgorithm): string {
    // @ts-ignore - 動的キーアクセスのため型チェックをスキップ
    return m['deck']['addDeck']['algorithms'][algorithm]['description']();
  }

  // アルゴリズム選択肢（翻訳対応）
  const algorithmOptions = $derived<AlgorithmOption[]>([
    'reverse_chronological',
    'top_posts', 
    'most_friends',
    'best_of_follows',
    'quiet_posters',
    'loud_posters',
    'close_friends',
    'popular_in_network',
    'popular_with_friends'
  ].map((algorithm, index) => ({
    algorithm: algorithm as ColumnAlgorithm,
    name: getAlgorithmName(algorithm as ColumnAlgorithm),
    description: getAlgorithmDescription(algorithm as ColumnAlgorithm),
    icon: COLUMN_ALGORITHM_ICONS[algorithm as ColumnAlgorithm],
    isDefault: algorithm === ADD_DECK_DEFAULTS.algorithm
  })));

  // ===================================================================
  // ライフサイクル・初期化
  // ===================================================================

  onMount(async () => {
    if (isOpen) {
      await loadAccounts();
      resetFormData();
    }
  });

  // モーダルが開かれた時の処理
  $effect(() => {
    if (isOpen) {
      loadAccounts();
      resetFormData();
      currentStep = 'account';
      errorMessage = '';
    }
  });

  /**
   * アカウント一覧を読み込み
   */
  async function loadAccounts() {
    try {
      const result = await authService.getAllAccounts();
      if (result.success && result.data) {
        availableAccounts = result.data;
        setInitialAccount(); // アカウント読み込み後に初期選択を設定
        console.log('🔄 [AddDeckModal] アカウント読み込み完了:', result.data.length);
      } else {
        console.error('🔄 [AddDeckModal] アカウント読み込み失敗:', result.error);
        errorMessage = m['deck.addDeck.account.noAccounts']();
      }
    } catch (error) {
      console.error('🔄 [AddDeckModal] アカウント読み込みエラー:', error);
      errorMessage = m['deck.addDeck.account.noAccounts']();
    }
  }

  /**
   * フォームデータをリセット（スマートデフォルト設定）
   */
  function resetFormData() {
    formData = {
      selectedAccountId: '', // 初期は空にして、後でsetDefaultAccount()で設定
      selectedAlgorithm: ADD_DECK_DEFAULTS.algorithm,
      deckName: m['deck.addDeck.defaultName'](), // 翻訳されたデフォルト名
      settings: { ...ADD_DECK_DEFAULTS.settings }
    };
  }

  /**
   * 初期アカウントを設定
   */
  function setInitialAccount() {
    if (availableAccounts.length > 0 && !formData.selectedAccountId) {
      formData.selectedAccountId = availableAccounts[0].id;
      console.log('🔄 [AddDeckModal] 初期アカウント選択:', availableAccounts[0].profile.handle);
    }
  }

  // ===================================================================
  // ナビゲーション・ウィザード制御
  // ===================================================================

  /**
   * 次のステップへ進む
   */
  function nextStep() {
    if (currentStep === 'account') {
      if (!formData.selectedAccountId) {
        errorMessage = m['deck.addDeck.account.noAccounts']();
        return;
      }
      currentStep = 'algorithm';
    } else if (currentStep === 'algorithm') {
      currentStep = 'settings';
    }
    errorMessage = '';
  }

  /**
   * 前のステップに戻る
   */
  function previousStep() {
    if (currentStep === 'algorithm') {
      currentStep = 'account';
    } else if (currentStep === 'settings') {
      currentStep = 'algorithm';
    }
    errorMessage = '';
  }

  /**
   * デッキを作成
   */
  async function createDeck() {
    if (!formData.selectedAccountId || !formData.deckName.trim()) {
      errorMessage = m['deck.addDeck.error']();
      return;
    }

    isLoading = true;
    errorMessage = '';

    try {
      console.log('🎛️ [AddDeckModal] デッキ作成開始:', formData);

      // デッキ設定の構築
      const settings = {
        ...formData.settings,
        title: formData.deckName.trim(),
        icon: COLUMN_ALGORITHM_ICONS[formData.selectedAlgorithm]
      };

      // DeckStoreを使用してカラムを作成
      const column = await deckStore.addColumn(
        formData.selectedAccountId,
        formData.selectedAlgorithm,
        settings
      );

      console.log('🎛️ [AddDeckModal] デッキ作成成功:', column);
      
      // 成功コールバック呼び出し
      onSuccess(column);

      // モーダルを閉じる
      handleClose();
    } catch (error) {
      console.error('🎛️ [AddDeckModal] デッキ作成エラー:', error);
      errorMessage = m['deck.addDeck.error']();
    } finally {
      isLoading = false;
    }
  }

  /**
   * モーダルを閉じる
   */
  function handleClose() {
    currentStep = 'account';
    errorMessage = '';
    onClose();
  }

  // ===================================================================
  // ステップ判定ヘルパー
  // ===================================================================

  const isAccountStep = $derived(currentStep === 'account');
  const isAlgorithmStep = $derived(currentStep === 'algorithm');
  const isSettingsStep = $derived(currentStep === 'settings');
  const canProceed = $derived(
    (isAccountStep && !!formData.selectedAccountId) ||
    (isAlgorithmStep && !!formData.selectedAlgorithm) ||
    (isSettingsStep && !!formData.deckName.trim())
  );

  // ステップインジケーター用ヘルパー
  function isStepCompleted(step: string, index: number) {
    const steps = ['account', 'algorithm', 'settings'];
    const currentIndex = steps.indexOf(currentStep);
    return currentStep === step || index < currentIndex;
  }
</script>

<!-- モーダルオーバーレイ -->
{#if isOpen}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-card rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
      <!-- ヘッダー -->
      <div class="bg-primary/10 px-6 py-4 border-b border-themed/20">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-themed text-xl font-bold">{m['deck.addDeck.title']()}</h2>
            <p class="text-themed opacity-70 text-sm">{m['deck.addDeck.subtitle']()}</p>
          </div>
          <button 
            class="text-themed hover:text-primary transition-colors"
            onclick={handleClose}
            aria-label={m['common.close']()}
          >
            <Icon icon={ICONS.CLOSE} size="lg" />
          </button>
        </div>

        <!-- ステップインジケーター -->
        <div class="flex items-center mt-4 space-x-4">
          {#each ['account', 'algorithm', 'settings'] as step, index}
            <div class="flex items-center">
              <div 
                class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors {isStepCompleted(step, index) ? 'bg-primary text-white' : 'bg-muted text-themed'}"
              >
                {index + 1}
              </div>
              {#if index < 2}
                <div class="w-12 h-0.5 bg-themed/20 mx-2"></div>
              {/if}
            </div>
          {/each}
        </div>
      </div>

      <!-- コンテンツエリア -->
      <div class="p-6 overflow-y-auto max-h-[50vh]">
        <!-- エラーメッセージ -->
        {#if errorMessage}
          <div class="mb-4 p-3 bg-error/10 border border-error/20 rounded-lg flex items-center gap-2">
            <Icon icon={ICONS.ERROR} size="sm" color="error" />
            <span class="text-error text-sm">{errorMessage}</span>
          </div>
        {/if}

        <!-- Step 1: アカウント選択 -->
        {#if isAccountStep}
          <div class="space-y-4">
            <div>
              <h3 class="text-themed text-lg font-semibold mb-2">{m['deck.addDeck.account.title']()}</h3>
              <p class="text-themed opacity-70 text-sm">{m['deck.addDeck.account.description']()}</p>
            </div>

            <div class="space-y-3">
              {#each accountOptions as account}
                <label class="block">
                  <input 
                    type="radio" 
                    name="account" 
                    value={account.id}
                    bind:group={formData.selectedAccountId}
                    class="sr-only"
                  />
                  <div 
                    class="p-4 rounded-lg border-2 cursor-pointer transition-all hover:bg-primary/5 {formData.selectedAccountId === account.id ? 'border-primary bg-primary text-white' : 'border-themed bg-muted text-themed'}"
                  >
                    <div class="flex items-center gap-3">
                      {#if account.avatar}
                        <img src={account.avatar} alt={account.handle} class="w-10 h-10 rounded-full" />
                      {:else}
                        <div class="w-10 h-10 rounded-full flex items-center justify-center {formData.selectedAccountId === account.id ? 'bg-white/20' : 'bg-primary/20'}">
                          <Icon icon={ICONS.PERSON} size="md" color={formData.selectedAccountId === account.id ? 'white' : 'primary'} />
                        </div>
                      {/if}
                      <div class="flex-1">
                        <div class="font-medium {formData.selectedAccountId === account.id ? 'text-white' : 'text-themed'}">{account.displayName || account.handle}</div>
                        <div class="text-sm {formData.selectedAccountId === account.id ? 'text-white opacity-80' : 'text-themed opacity-60'}">@{account.handle}</div>
                      </div>
                    </div>
                  </div>
                </label>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Step 2: アルゴリズム選択 -->
        {#if isAlgorithmStep}
          <div class="space-y-4">
            <div>
              <h3 class="text-themed text-lg font-semibold mb-2">{m['deck.addDeck.algorithm.title']()}</h3>
              <p class="text-themed opacity-70 text-sm">{m['deck.addDeck.algorithm.description']()}</p>
            </div>

            <div class="grid grid-cols-1 gap-3">
              {#each algorithmOptions as algorithm}
                <label class="block">
                  <input 
                    type="radio" 
                    name="algorithm" 
                    value={algorithm.algorithm}
                    bind:group={formData.selectedAlgorithm}
                    class="sr-only"
                  />
                  <div 
                    class="p-4 rounded-lg border-2 cursor-pointer transition-all hover:bg-primary/5 {formData.selectedAlgorithm === algorithm.algorithm ? 'border-primary bg-primary text-white' : 'border-themed bg-muted text-themed'}"
                  >
                    <div class="flex items-start gap-3">
                      <Icon icon={algorithm.icon} size="lg" color={formData.selectedAlgorithm === algorithm.algorithm ? 'white' : 'primary'} />
                      <div class="flex-1">
                        <div class="font-medium flex items-center gap-2 {formData.selectedAlgorithm === algorithm.algorithm ? 'text-white' : 'text-themed'}">
                          {algorithm.name}
                          {#if algorithm.isDefault}
                            <span class="text-xs px-2 py-1 rounded {formData.selectedAlgorithm === algorithm.algorithm ? 'bg-white/20 text-white' : 'bg-primary/20 text-primary'}">推奨</span>
                          {/if}
                        </div>
                        <div class="text-sm mt-1 {formData.selectedAlgorithm === algorithm.algorithm ? 'text-white opacity-80' : 'text-themed opacity-60'}">{algorithm.description}</div>
                      </div>
                    </div>
                  </div>
                </label>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Step 3: 設定 -->
        {#if isSettingsStep}
          <div class="space-y-4">
            <div>
              <h3 class="text-themed text-lg font-semibold mb-2">{m['deck.addDeck.settings.title']()}</h3>
              <p class="text-themed opacity-70 text-sm">{m['deck.addDeck.settings.description']()}</p>
            </div>

            <div class="space-y-4">
              <div>
                <label for="deck-name" class="block text-themed font-medium mb-2">
                  {m['deck.addDeck.settings.nameLabel']()}
                </label>
                <input 
                  id="deck-name"
                  type="text"
                  bind:value={formData.deckName}
                  placeholder={m['deck.addDeck.settings.namePlaceholder']()}
                  class="w-full p-3 bg-themed border border-themed rounded-lg text-themed focus:border-primary focus:outline-none"
                />
              </div>

              <!-- 選択済み設定の確認 -->
              <div class="bg-muted/20 rounded-lg p-4">
                <h4 class="text-themed font-medium mb-3">設定確認</h4>
                <div class="space-y-2 text-sm">
                  <div class="flex justify-between">
                    <span class="text-themed opacity-70">アカウント:</span>
                    <span class="text-themed">
                      {accountOptions.find(a => a.id === formData.selectedAccountId)?.handle}
                    </span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-themed opacity-70">フィード:</span>
                    <span class="text-themed">
                      {algorithmOptions.find(a => a.algorithm === formData.selectedAlgorithm)?.name}
                    </span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-themed opacity-70">アイコン:</span>
                    <Icon icon={COLUMN_ALGORITHM_ICONS[formData.selectedAlgorithm]} size="sm" color="primary" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        {/if}
      </div>

      <!-- フッター・アクションボタン -->
      <div class="bg-muted/10 px-6 py-4 border-t border-themed/20">
        <div class="flex justify-between">
          <!-- 戻るボタン -->
          <button 
            class="px-4 py-2 text-themed hover:text-primary transition-colors disabled:opacity-50"
            onclick={previousStep}
            disabled={isAccountStep || isLoading}
          >
            {m['deck.addDeck.buttons.previous']()}
          </button>

          <!-- 次へ・作成ボタン -->
          <div class="flex gap-3">
            <button 
              class="px-4 py-2 text-themed hover:text-primary transition-colors"
              onclick={handleClose}
              disabled={isLoading}
            >
              {m['deck.addDeck.buttons.cancel']()}
            </button>

            {#if isSettingsStep}
              <button 
                class="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                onclick={createDeck}
                disabled={!canProceed || isLoading}
              >
                {#if isLoading}
                  <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                {/if}
                {m['deck.addDeck.buttons.create']()}
              </button>
            {:else}
              <button 
                class="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                onclick={nextStep}
                disabled={!canProceed}
              >
                {m['deck.addDeck.buttons.next']()}
              </button>
            {/if}
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}