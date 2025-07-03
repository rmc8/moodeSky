<script lang="ts">
  import Icon from '../Icon.svelte';
  import { ICONS } from '$lib/types/icon.js';
  import type { RepostReason } from '$lib/types/post.js';
  import * as m from '../../../paraglide/messages.js';

  interface Props {
    /** リポスト情報（undefinedの場合は表示しない） */
    reason?: RepostReason;
    /** 追加CSSクラス */
    class?: string;
    /** ユーザークリック時の処理 */
    onClick?: (did: string, handle: string) => void;
  }

  const { 
    reason, 
    class: additionalClass = '',
    onClick
  }: Props = $props();

  // 表示名の決定（displayName → handle の優先順位）
  const displayName = $derived(() => {
    if (!reason?.by) return '';
    return reason.by.displayName && reason.by.displayName.trim() !== '' 
      ? reason.by.displayName 
      : reason.by.handle;
  });

  // ユーザークリックハンドラー
  function handleUserClick() {
    if (onClick && reason?.by) {
      onClick(reason.by.did, reason.by.handle);
    }
  }
</script>

{#if reason && reason.by}
  <div class="flex items-center gap-2 py-1 text-secondary text-sm {additionalClass}">
    <Icon 
      icon={ICONS.REPEAT} 
      size="sm" 
      color="secondary" 
      ariaLabel="リポスト"
      decorative={false}
    />
    
    <span class="flex items-center gap-1">
      {#if onClick}
        <button 
          class="font-medium hover:underline focus:outline-none focus:underline transition-all duration-150"
          onclick={handleUserClick}
          aria-label="プロフィールを表示: {displayName()}"
        >
          {displayName()}
        </button>
      {:else}
        <span class="font-medium">
          {displayName()}
        </span>
      {/if}
      
      <span>{m.reposted()}</span>
    </span>
  </div>
{/if}

<style>
  /* ホバー効果の微調整 */
  button:hover {
    text-decoration-thickness: 1px;
    text-underline-offset: 2px;
  }
  
  /* フォーカス状態の視覚化 */
  button:focus {
    text-decoration: underline;
    text-decoration-thickness: 1px;
    text-underline-offset: 2px;
  }
</style>