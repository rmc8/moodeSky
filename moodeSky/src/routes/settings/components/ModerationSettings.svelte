<!--
  ModerationSettings.svelte
  モデレーション設定コンポーネント
  キーワードミュート、ラベルフィルタリング、アダルトコンテンツ制御
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import Icon from '$lib/components/Icon.svelte';
  import { ICONS } from '$lib/types/icon.js';
  import { moderationStore } from '$lib/stores/moderation.svelte.js';
  import type { 
    ContentLabel, 
    ModerationAction, 
    MutedKeyword, 
    MuteTarget, 
    MuteType 
  } from '$lib/types/moderation.js';
  import { LABEL_DISPLAY_NAMES, ACTION_DESCRIPTIONS } from '$lib/types/moderation.js';

  // 内部状態
  let isLoading = $state(false);
  let activeTab = $state<'keywords' | 'labels' | 'adult' | 'stats'>('keywords');

  // キーワード追加フォーム
  let newKeyword = $state('');
  let newKeywordType = $state<MuteType>('partial');
  let newKeywordTargets = $state<MuteTarget[]>(['content']);
  let newKeywordCaseSensitive = $state(false);
  let showAddKeywordForm = $state(false);

  // ラベル設定用の状態
  let labelSettings = $derived(() => moderationStore.settings.labelModeration);

  // 統計情報
  let stats = $derived(() => moderationStore.stats);

  // 初期化
  onMount(async () => {
    if (!moderationStore.isInitialized) {
      await moderationStore.initialize();
    }
    await moderationStore.refreshStats();
  });

  // キーワード追加
  async function addMutedKeyword() {
    if (!newKeyword.trim()) return;

    isLoading = true;
    try {
      const success = await moderationStore.addMutedKeyword({
        keyword: newKeyword.trim(),
        type: newKeywordType,
        targets: newKeywordTargets,
        enabled: true,
        caseSensitive: newKeywordCaseSensitive,
      });

      if (success) {
        // フォームをリセット
        newKeyword = '';
        newKeywordType = 'partial';
        newKeywordTargets = ['content'];
        newKeywordCaseSensitive = false;
        showAddKeywordForm = false;
      }
    } finally {
      isLoading = false;
    }
  }

  // キーワード削除
  async function removeMutedKeyword(id: string) {
    isLoading = true;
    try {
      await moderationStore.removeMutedKeyword(id);
    } finally {
      isLoading = false;
    }
  }

  // キーワード有効/無効切り替え
  async function toggleMutedKeyword(id: string) {
    isLoading = true;
    try {
      await moderationStore.toggleMutedKeyword(id);
    } finally {
      isLoading = false;
    }
  }

  // ラベル設定更新
  async function updateLabelModeration(label: ContentLabel, action: ModerationAction, enabled: boolean) {
    isLoading = true;
    try {
      await moderationStore.updateLabelModeration(label, action, enabled);
    } finally {
      isLoading = false;
    }
  }

  // アダルトコンテンツ設定切り替え
  async function toggleAdultContent() {
    isLoading = true;
    try {
      await moderationStore.toggleAdultContent();
    } finally {
      isLoading = false;
    }
  }

  // 政治コンテンツレベル変更
  async function setPoliticalLevel(level: 'hide' | 'warn' | 'show') {
    isLoading = true;
    try {
      await moderationStore.setPoliticalContentLevel(level);
    } finally {
      isLoading = false;
    }
  }

  // 対象チェックボックスの処理
  function handleTargetChange(target: MuteTarget, checked: boolean) {
    if (checked) {
      if (!newKeywordTargets.includes(target)) {
        newKeywordTargets = [...newKeywordTargets, target];
      }
    } else {
      newKeywordTargets = newKeywordTargets.filter(t => t !== target);
    }
  }
</script>

<div class="moderation-settings">
  <!-- ヘッダー -->
  <div class="mb-6">
    <h2 class="text-themed text-xl font-semibold mb-2">コンテンツモデレーション</h2>
    <p class="text-secondary text-sm">
      不適切なコンテンツや望まないコンテンツをフィルタリングする設定です。
    </p>
    
    <!-- フィルタリング状態の表示 -->
    <div class="mt-3 flex items-center gap-2">
      <div class="flex items-center gap-1">
        <div class="w-2 h-2 rounded-full {moderationStore.isFilteringActive ? 'bg-green-500' : 'bg-gray-400'}"></div>
        <span class="text-xs text-secondary">
          フィルタリング: {moderationStore.isFilteringActive ? '有効' : '無効'}
        </span>
      </div>
      <span class="text-xs text-inactive">|</span>
      <span class="text-xs text-secondary">
        アクティブフィルタ: {moderationStore.activeKeywordCount + moderationStore.activeLabelCount}個
      </span>
    </div>
  </div>

  <!-- タブナビゲーション -->
  <div class="tab-navigation mb-6">
    <div class="flex flex-wrap gap-2 p-2 bg-card rounded-lg border border-themed">
      <button
        class="px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
        class:bg-primary={activeTab === 'keywords'}
        class:text-[var(--color-background)]={activeTab === 'keywords'}
        class:text-themed={activeTab !== 'keywords'}
        class:hover:bg-muted={activeTab !== 'keywords'}
        onclick={() => activeTab = 'keywords'}
      >
        <Icon icon={ICONS.SEARCH} size="sm" class={activeTab === 'keywords' ? '!text-[var(--color-background)]' : 'text-themed'} />
        キーワードミュート
      </button>
      <button
        class="px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
        class:bg-primary={activeTab === 'labels'}
        class:text-[var(--color-background)]={activeTab === 'labels'}
        class:text-themed={activeTab !== 'labels'}
        class:hover:bg-muted={activeTab !== 'labels'}
        onclick={() => activeTab = 'labels'}
      >
        <Icon icon={ICONS.SHIELD} size="sm" class={activeTab === 'labels' ? '!text-[var(--color-background)]' : 'text-themed'} />
        ラベルフィルタ
      </button>
      <button
        class="px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
        class:bg-primary={activeTab === 'adult'}
        class:text-[var(--color-background)]={activeTab === 'adult'}
        class:text-themed={activeTab !== 'adult'}
        class:hover:bg-muted={activeTab !== 'adult'}
        onclick={() => activeTab = 'adult'}
      >
        <Icon icon={ICONS.WARNING} size="sm" class={activeTab === 'adult' ? '!text-[var(--color-background)]' : 'text-themed'} />
        センシティブ
      </button>
      <button
        class="px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
        class:bg-primary={activeTab === 'stats'}
        class:text-[var(--color-background)]={activeTab === 'stats'}
        class:text-themed={activeTab !== 'stats'}
        class:hover:bg-muted={activeTab !== 'stats'}
        onclick={() => activeTab = 'stats'}
      >
        <Icon icon={ICONS.BAR_CHART} size="sm" class={activeTab === 'stats' ? '!text-[var(--color-background)]' : 'text-themed'} />
        統計
      </button>
    </div>
  </div>

  <!-- キーワードミュートタブ -->
  {#if activeTab === 'keywords'}
    <div class="keywords-tab">
      <!-- 追加ボタン -->
      <div class="mb-4">
        <button
          class="button-primary text-sm px-4 py-2"
          onclick={() => showAddKeywordForm = !showAddKeywordForm}
          disabled={isLoading}
        >
          <Icon icon={ICONS.PLUS} size="sm" />
          キーワードを追加
        </button>
      </div>

      <!-- キーワード追加フォーム -->
      {#if showAddKeywordForm}
        <div class="keyword-form bg-muted/5 border border-subtle rounded-lg p-4 mb-4">
          <h3 class="text-themed font-medium mb-3">新しいキーワードミュート</h3>
          
          <!-- キーワード入力 -->
          <div class="mb-3">
            <label for="new-keyword" class="block text-sm font-medium text-themed mb-1">キーワード</label>
            <input
              id="new-keyword"
              type="text"
              bind:value={newKeyword}
              placeholder="ミュートしたいキーワードを入力"
              class="input-themed w-full"
              disabled={isLoading}
            />
          </div>

          <!-- マッチング種類 -->
          <div class="mb-3">
            <label for="new-keyword-type" class="block text-sm font-medium text-themed mb-1">マッチング方法</label>
            <div class="custom-select">
              <select id="new-keyword-type" bind:value={newKeywordType} disabled={isLoading}>
                <option value="partial">部分一致</option>
                <option value="exact">完全一致</option>
                <option value="regex">正規表現</option>
                <option value="wildcard">ワイルドカード</option>
              </select>
            </div>
          </div>

          <!-- 対象範囲 -->
          <fieldset class="mb-3">
            <legend class="block text-sm font-medium text-themed mb-2">対象範囲</legend>
            <div class="grid grid-cols-2 gap-2">
              {#each [
                ['content', '投稿本文'],
                ['hashtags', 'ハッシュタグ'],
                ['mentions', 'メンション'],
                ['alt-text', '画像説明']
              ] as [target, label]}
                <label class="custom-checkbox {isLoading ? 'disabled' : ''}">
                  <input
                    type="checkbox"
                    checked={newKeywordTargets.includes(target as MuteTarget)}
                    onchange={(e) => handleTargetChange(target as MuteTarget, e.currentTarget.checked)}
                    disabled={isLoading}
                  />
                  <div class="checkbox-indicator"></div>
                  <span class="text-sm text-themed">{label}</span>
                </label>
              {/each}
            </div>
          </fieldset>

          <!-- オプション -->
          <div class="mb-4">
            <label class="custom-checkbox {isLoading ? 'disabled' : ''}">
              <input
                type="checkbox"
                bind:checked={newKeywordCaseSensitive}
                disabled={isLoading}
              />
              <div class="checkbox-indicator"></div>
              <span class="text-sm text-themed">大文字小文字を区別する</span>
            </label>
          </div>

          <!-- ボタン -->
          <div class="flex gap-2">
            <button
              class="button-primary text-sm px-4 py-2"
              onclick={addMutedKeyword}
              disabled={isLoading || !newKeyword.trim() || newKeywordTargets.length === 0}
            >
              {#if isLoading}
                <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1"></div>
              {:else}
                <Icon icon={ICONS.PLUS} size="sm" />
              {/if}
              追加
            </button>
            <button
              class="text-secondary text-sm px-4 py-2 hover:bg-muted/10 rounded transition-colors"
              onclick={() => showAddKeywordForm = false}
              disabled={isLoading}
            >
              キャンセル
            </button>
          </div>
        </div>
      {/if}

      <!-- キーワード一覧 -->
      <div class="keywords-list">
        {#if moderationStore.settings.mutedKeywords.length === 0}
          <div class="empty-state text-center py-8">
            <Icon icon={ICONS.SEARCH} size="lg" color="inactive" class="mx-auto mb-2" />
            <p class="text-secondary">キーワードミュートが設定されていません</p>
          </div>
        {:else}
          <div class="space-y-2">
            {#each moderationStore.settings.mutedKeywords as keyword (keyword.id)}
              <div class="keyword-item bg-card border border-subtle rounded-lg p-3">
                <div class="flex items-center justify-between">
                  <div class="flex-1">
                    <div class="flex items-center gap-2">
                      <span class="font-mono text-sm text-themed">{keyword.keyword}</span>
                      <span class="text-xs text-secondary bg-muted/20 px-2 py-0.5 rounded">
                        {keyword.type === 'partial' ? '部分一致' :
                         keyword.type === 'exact' ? '完全一致' :
                         keyword.type === 'regex' ? '正規表現' : 'ワイルドカード'}
                      </span>
                      {#if !keyword.enabled}
                        <span class="text-xs text-inactive bg-muted/20 px-2 py-0.5 rounded">無効</span>
                      {/if}
                    </div>
                    <div class="text-xs text-secondary mt-1">
                      対象: {keyword.targets.map(t => ({
                        content: '投稿本文',
                        hashtags: 'ハッシュタグ',
                        mentions: 'メンション',
                        'alt-text': '画像説明',
                        'display-name': '表示名',
                        'bio': 'プロフィール文'
                      })[t]).join(', ')}
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <button
                      class="text-secondary hover:text-themed transition-colors p-1"
                      onclick={() => toggleMutedKeyword(keyword.id)}
                      disabled={isLoading}
                      title={keyword.enabled ? '無効にする' : '有効にする'}
                    >
                      <Icon icon={keyword.enabled ? ICONS.EYE_OFF : ICONS.EYE} size="sm" />
                    </button>
                    <button
                      class="text-error hover:text-error/80 transition-colors p-1"
                      onclick={() => removeMutedKeyword(keyword.id)}
                      disabled={isLoading}
                      title="削除"
                    >
                      <Icon icon={ICONS.TRASH} size="sm" />
                    </button>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>

  <!-- ラベルフィルタタブ -->
  {:else if activeTab === 'labels'}
    <div class="labels-tab">
      <div class="space-y-3">
        {#each labelSettings() as labelSetting (labelSetting.label)}
          <div class="label-item bg-card border border-subtle rounded-lg p-4">
            <div class="flex items-center justify-between">
              <div>
                <h4 class="text-themed font-medium">{LABEL_DISPLAY_NAMES[labelSetting.label]}</h4>
                <p class="text-secondary text-sm mt-1">
                  現在のアクション: {ACTION_DESCRIPTIONS[labelSetting.action]}
                </p>
              </div>
              <div class="inline-form-group">
                <div class="custom-select">
                  <select
                    value={labelSetting.action}
                    onchange={(e) => updateLabelModeration(labelSetting.label, e.currentTarget.value as ModerationAction, labelSetting.enabled)}
                    disabled={isLoading}
                  >
                    <option value="show">表示</option>
                    <option value="warn">警告</option>
                    <option value="blur">ぼかし</option>
                    <option value="hide">非表示</option>
                    <option value="filter">完全フィルタ</option>
                  </select>
                </div>
                <label class="custom-checkbox {isLoading ? 'disabled' : ''}">
                  <input
                    type="checkbox"
                    checked={labelSetting.enabled}
                    onchange={(e) => updateLabelModeration(labelSetting.label, labelSetting.action, e.currentTarget.checked)}
                    disabled={isLoading}
                  />
                  <div class="checkbox-indicator"></div>
                  <span class="text-sm text-themed">有効</span>
                </label>
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>

  <!-- センシティブコンテンツタブ -->
  {:else if activeTab === 'adult'}
    <div class="adult-tab space-y-4">
      <!-- アダルトコンテンツ設定 -->
      <div class="setting-item bg-card border border-subtle rounded-lg p-4">
        <div class="flex items-center justify-between">
          <div>
            <h4 class="text-themed font-medium">アダルトコンテンツ</h4>
            <p class="text-secondary text-sm mt-1">
              18歳以上向けのコンテンツの表示を制御します
            </p>
          </div>
          <label class="custom-checkbox {isLoading ? 'disabled' : ''}">
            <input
              type="checkbox"
              checked={moderationStore.settings.adultContentEnabled}
              onchange={toggleAdultContent}
              disabled={isLoading}
            />
            <div class="checkbox-indicator"></div>
            <span class="text-sm text-themed">表示を許可</span>
          </label>
        </div>
      </div>

      <!-- 政治コンテンツ設定 -->
      <div class="setting-item bg-card border border-subtle rounded-lg p-4">
        <div class="flex items-center justify-between">
          <div>
            <h4 class="text-themed font-medium">政治的コンテンツ</h4>
            <p class="text-secondary text-sm mt-1">
              政治関連の投稿の表示レベルを設定します
            </p>
          </div>
          <div class="custom-select">
            <select
              value={moderationStore.settings.politicalContentLevel}
              onchange={(e) => setPoliticalLevel(e.currentTarget.value as any)}
              disabled={isLoading}
            >
              <option value="show">通常表示</option>
              <option value="warn">警告付き表示</option>
              <option value="hide">非表示</option>
            </select>
          </div>
        </div>
      </div>
    </div>

  <!-- 統計タブ -->
  {:else if activeTab === 'stats'}
    <div class="stats-tab">
      {#if stats()}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- 総フィルタ数 -->
          <div class="stat-card bg-card border border-subtle rounded-lg p-4">
            <div class="flex items-center gap-3">
              <div class="p-2 bg-primary/10 rounded-lg">
                <Icon icon={ICONS.SHIELD} size="md" color="primary" />
              </div>
              <div>
                <p class="text-2xl font-bold text-themed">{stats()?.totalFiltered || 0}</p>
                <p class="text-sm text-secondary">総フィルタ数</p>
              </div>
            </div>
          </div>

          <!-- 今日のフィルタ数 -->
          <div class="stat-card bg-card border border-subtle rounded-lg p-4">
            <div class="flex items-center gap-3">
              <div class="p-2 bg-secondary/10 rounded-lg">
                <Icon icon={ICONS.CALENDAR} size="md" color="secondary" />
              </div>
              <div>
                <p class="text-2xl font-bold text-themed">{moderationStore.todayFilteredCount}</p>
                <p class="text-sm text-secondary">今日のフィルタ数</p>
              </div>
            </div>
          </div>
        </div>

        <!-- 詳細統計 -->
        <div class="mt-6">
          <h3 class="text-themed font-medium mb-3">詳細統計</h3>
          <div class="bg-card border border-subtle rounded-lg p-4">
            <p class="text-sm text-secondary mb-2">最終更新: {new Date(stats()?.lastUpdated || '').toLocaleString()}</p>
            <!-- 将来的にグラフやチャートを追加 -->
            <p class="text-sm text-inactive">詳細な統計情報は今後のアップデートで追加予定です。</p>
          </div>
        </div>
      {:else}
        <div class="empty-state text-center py-8">
          <Icon icon={ICONS.BAR_CHART} size="lg" color="inactive" class="mx-auto mb-2" />
          <p class="text-secondary">統計データがありません</p>
        </div>
      {/if}
    </div>
  {/if}

  <!-- エラー表示 -->
  {#if moderationStore.error}
    <div class="error-message bg-error/5 border border-error/20 rounded-lg p-4 mt-4">
      <div class="flex items-center gap-2">
        <Icon icon={ICONS.ERROR} size="sm" color="error" />
        <span class="text-error text-sm">{moderationStore.error}</span>
        <button
          class="ml-auto text-error hover:text-error/80 transition-colors"
          onclick={() => moderationStore.clearError()}
        >
          <Icon icon={ICONS.X} size="sm" />
        </button>
      </div>
    </div>
  {/if}
</div>

<style>

  /* カスタムチェックボックス */
  .custom-checkbox {
    position: relative;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    white-space: nowrap;
    cursor: pointer;
    user-select: none;
  }

  .custom-checkbox input[type="checkbox"] {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
  }

  .custom-checkbox .checkbox-indicator {
    width: 1.25rem;
    height: 1.25rem;
    border: 2px solid var(--color-text-secondary);
    border-radius: 0.375rem;
    background: var(--color-card);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    flex-shrink: 0;
  }

  .custom-checkbox input[type="checkbox"]:checked + .checkbox-indicator {
    background: var(--color-primary);
    border-color: var(--color-primary);
  }

  .custom-checkbox input[type="checkbox"]:checked + .checkbox-indicator::after {
    content: '';
    width: 0.5rem;
    height: 0.75rem;
    border: 2px solid var(--color-background);
    border-top: none;
    border-left: none;
    transform: rotate(45deg);
    margin-top: -0.125rem;
  }

  .custom-checkbox:hover .checkbox-indicator {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px var(--color-primary) / 0.1;
  }

  .custom-checkbox input[type="checkbox"]:focus + .checkbox-indicator {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  .custom-checkbox input[type="checkbox"]:disabled + .checkbox-indicator {
    background: var(--color-muted);
    border-color: var(--color-text-inactive);
    cursor: not-allowed;
  }

  .custom-checkbox.disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  /* カスタムセレクトボックス */
  .custom-select {
    position: relative;
    display: inline-block;
    width: 100%;
  }

  .custom-select select {
    appearance: none;
    -webkit-appearance: none;
    -moz-appearance: none;
    width: 100%;
    padding: 0.5rem 2.5rem 0.5rem 0.75rem;
    border: 1px solid var(--color-text-secondary);
    border-radius: 0.5rem;
    background: var(--color-card);
    color: var(--color-foreground);
    font-size: 0.875rem;
    line-height: 1.5;
    transition: all 0.2s ease;
    cursor: pointer;
  }

  .custom-select select:hover {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px var(--color-primary) / 0.1;
  }

  .custom-select select:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px var(--color-primary) / 0.2;
  }

  .custom-select select:disabled {
    background: var(--color-muted);
    color: var(--color-text-inactive);
    cursor: not-allowed;
  }

  .custom-select::after {
    content: '';
    position: absolute;
    top: 50%;
    right: 0.75rem;
    transform: translateY(-50%);
    width: 0;
    height: 0;
    border-left: 0.25rem solid transparent;
    border-right: 0.25rem solid transparent;
    border-top: 0.375rem solid var(--color-text-secondary);
    pointer-events: none;
    transition: transform 0.2s ease;
  }

  .custom-select:hover::after {
    border-top-color: var(--color-primary);
  }

  /* インラインフォーム要素 */
  .inline-form-group {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: nowrap;
  }

  .inline-form-group .custom-select {
    min-width: 8rem;
    flex-shrink: 0;
  }

  .animate-spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  /* フォーカス状態 */
  button:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  /* レスポンシブ対応 */
  @media (max-width: 640px) {
    .grid-cols-2 {
      grid-template-columns: 1fr;
    }
    
    .inline-form-group {
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    
    .custom-checkbox {
      gap: 0.5rem;
    }
    
    .custom-checkbox .checkbox-indicator {
      width: 1.125rem;
      height: 1.125rem;
    }
    
    .custom-select select {
      padding: 0.5rem 2rem 0.5rem 0.5rem;
      font-size: 0.8rem;
    }
  }
</style>