<!--
  MobileDeckTabs.svelte
  モバイル用デッキタブバー
  
  配置: 画面最上部（固定位置）
  特徴: 横スクロール対応、アイコンのみ表示
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
    console.log('🎛️ [MobileDeckTabs] Switched to column:', columnId);
  }
  
  // カラムを追加（簡易版 - 後でモーダル/ドロップダウンに置き換え）
  async function addColumn() {
    // TODO: カラム追加UIの実装
    console.log('🎛️ [MobileDeckTabs] Add column clicked');
  }
</script>

<!-- モバイルデッキタブバー -->
<div 
  class="fixed top-0 left-0 right-0 z-40 bg-card border-b-2 border-themed shadow-sm"
  role="tablist"
  aria-label={t('deck.tabs.tabArea')}
>
  <div class="flex overflow-x-auto scrollbar-hide px-2 py-2">
    {#if columns.length > 0}
      <!-- 実際のカラムタブ表示 -->
      {#each columns as column}
        <button
          class="flex-shrink-0 flex items-center justify-center w-12 h-12 mx-1 rounded-lg transition-all duration-200 active:scale-95 {column.id === activeColumnId ? 'bg-primary/20' : 'bg-muted/50 hover:bg-muted/70'}"
          role="tab"
          aria-selected={column.id === activeColumnId}
          aria-label={column.settings.title}
          title={column.settings.title}
          onclick={() => switchColumn(column.id)}
        >
          <!-- アイコンのみ表示 -->
          <Icon 
            icon={getColumnIcon(column)}
            size="lg"
            color={column.id === activeColumnId ? 'primary' : 'themed'}
            decorative={true}
          />
        </button>
      {/each}
    {:else}
      <!-- カラムがない場合のプレースホルダー -->
      <div class="flex-shrink-0 flex items-center justify-center w-12 h-12 mx-1 rounded-lg bg-muted/50">
        <Icon 
          icon={ICONS.INBOX}
          size="lg"
          color="inactive"
          decorative={true}
        />
      </div>
    {/if}
    
    <!-- タブ追加ボタン -->
    <button
      class="flex-shrink-0 flex items-center justify-center w-12 h-12 mx-1 rounded-lg border-2 border-dashed border-themed/30 text-themed/50 hover:border-themed/50 hover:text-themed/70 transition-all duration-200"
      aria-label={t('deck.tabs.addTab')}
      title={t('deck.tabs.addTabDescription')}
      onclick={addColumn}
    >
      <Icon 
        icon={ICONS.ADD}
        size="lg"
        color="inactive"
        decorative={true}
      />
    </button>
  </div>
</div>

<!-- モバイルタブバー分のスペース確保 -->
<div class="h-16 w-full"></div>