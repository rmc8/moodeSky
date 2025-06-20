<!--
  DeckTabBar.svelte
  デスクトップ・タブレット用デッキタブバー
  
  配置: SideNavigation内（投稿ボタンの下、ナビゲーション項目の上）
  特徴: クロスプラットフォーム統合スクロールバー、アイコン+テキスト表示
  機能: カラム切り替え、タブ追加・削除
-->
<script lang="ts">
  import { useTranslation } from '$lib/utils/reactiveTranslation.svelte.js';
  import { deckStore } from '$lib/deck/store.svelte.js';
  import { getColumnIcon } from '$lib/deck/types.js';
  import Icon from '$lib/components/Icon.svelte';
  import { ICONS } from '$lib/types/icon.js';
  
  // リアクティブ翻訳システム
  const { t } = useTranslation();
  
  // デッキストアから実際のカラムデータを取得（リアクティブ）
  const columns = $derived(deckStore.columns);
  const activeColumnId = $derived(deckStore.state.activeColumnId);
  
  // カラムを切り替える
  function switchColumn(columnId: string) {
    deckStore.state.activeColumnId = columnId;
    console.log('🎛️ [DeckTabBar] Switched to column:', columnId);
  }
  
  // カラムを追加（簡易版 - 後でモーダル/ドロップダウンに置き換え）
  async function addColumn() {
    // TODO: カラム追加UIの実装
    console.log('🎛️ [DeckTabBar] Add column clicked');
  }
</script>

<!-- デッキタブバー -->
<div class="bg-card border-t border-themed" style="height: calc(100vh - 320px); min-height: 200px;">
  <div class="h-full overflow-y-auto scrollbar-professional p-2 space-y-1">
    {#if columns.length > 0}
      <!-- 実際のカラムタブ表示 -->
      {#each columns as column}
        <button
          class="w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-200 {column.id === activeColumnId ? 'bg-primary/20 text-primary' : 'bg-muted/50 text-themed hover:bg-muted/70'}"
          role="tab"
          aria-selected={column.id === activeColumnId}
          aria-label={column.settings.title}
          onclick={() => switchColumn(column.id)}
        >
          <!-- アイコン -->
          <Icon 
            icon={getColumnIcon(column)}
            size="md"
            color={column.id === activeColumnId ? 'primary' : 'themed'}
            decorative={true}
          />
          
          <!-- タブ名 -->
          <span class="font-medium text-sm truncate">
            {column.settings.title}
          </span>
        </button>
      {/each}
    {:else}
      <!-- カラムがない場合のメッセージ -->
      <div class="p-4 text-center text-themed/60">
        <Icon 
          icon={ICONS.INBOX}
          size="xl"
          color="inactive"
          decorative={true}
          class="mx-auto mb-2"
        />
        <p class="text-sm">{t('deck.noColumns')}</p>
      </div>
    {/if}
    
    <!-- カラム追加ボタン -->
    <button
      class="w-full flex items-center gap-3 p-3 rounded-lg border-2 border-dashed border-themed/30 text-themed/50 hover:border-themed/50 hover:text-themed/70 transition-all duration-200"
      onclick={addColumn}
      aria-label={t('deck.tabs.addTab')}
    >
      <Icon 
        icon={ICONS.ADD_CIRCLE}
        size="md"
        color="inactive"
        decorative={true}
      />
      <span class="font-medium text-sm">
        {t('deck.tabs.addTab')}
      </span>
    </button>
  </div>
</div>