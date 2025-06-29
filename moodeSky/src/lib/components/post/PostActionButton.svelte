<!--
  PostActionButton.svelte
  投稿用アクションボタンコンポーネント
  リプライ・リポスト・いいね・その他メニュー用の統一ボタン
-->
<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import { formatActionCount, formatFullCount } from '$lib/utils/formatNumber.js';
  import type { IconName } from '$lib/types/icon.js';

  interface Props {
    /** アイコン名 */
    icon: IconName;
    /** カウント数 */
    count?: number | null;
    /** ボタンのラベル（アクセシビリティ用） */
    label: string;
    /** アクティブ状態（いいね済み等） */
    isActive?: boolean;
    /** 無効状態 */
    disabled?: boolean;
    /** 数値表示を隠すかどうか */
    hideCount?: boolean;
    /** クリックハンドラー */
    onclick?: () => void;
    /** 追加CSSクラス */
    class?: string;
  }

  const { 
    icon, 
    count = 0, 
    label, 
    isActive = false, 
    disabled = false, 
    hideCount = false,
    onclick,
    class: additionalClass = ''
  }: Props = $props();

  // フォーマットされた数値表示
  const displayCount = $derived(() => formatActionCount(count));
  
  // ツールチップ用の詳細数値
  const fullCount = $derived(() => formatFullCount(count));
  
  // ボタンのスタイルクラス
  const buttonClass = $derived(() => {
    const baseClass = 'group flex items-center gap-1.5 p-2 rounded-lg transition-all duration-200 hover:bg-muted/10 disabled:opacity-50 disabled:cursor-not-allowed';
    const activeClass = isActive ? 'text-primary' : 'text-secondary hover:text-themed';
    return `${baseClass} ${activeClass} ${additionalClass}`.trim();
  });

  // aria-labelとtitleの内容
  const accessibilityText = $derived(() => {
    if (hideCount) {
      return label;
    }
    return `${label}: ${fullCount()}`;
  });

  // アイコンのcolor設定
  const iconColor = $derived(() => {
    if (disabled) return 'inactive';
    if (isActive) return 'primary';
    return 'secondary';
  });

  // ホバー時のアイコンスケール効果
  const iconClass = $derived(() => {
    return disabled ? '' : 'group-hover:scale-110 transition-transform duration-200';
  });
</script>

<!-- アクションボタン -->
<button
  class={buttonClass()}
  {disabled}
  onclick={onclick}
  aria-label={accessibilityText()}
  title={accessibilityText()}
>
  <!-- アイコン -->
  <Icon 
    {icon} 
    size="sm" 
    color={iconColor()}
    class={iconClass()}
  />
  
  <!-- カウント表示（hideCountがfalseの場合のみ） -->
  {#if !hideCount}
    <span class="text-sm font-medium min-w-0 tabular-nums">
      {displayCount()}
    </span>
  {/if}
</button>

<!--
使用例:

リプライボタン:
<PostActionButton 
  icon={ICONS.REPLY}
  count={post.replyCount}
  label="返信"
  onclick={() => handleReply()}
/>

リポストボタン（アクティブ状態）:
<PostActionButton 
  icon={ICONS.REPEAT}
  count={post.repostCount}
  label="リポスト" 
  isActive={true}
  onclick={() => handleRepost()}
/>

いいねボタン:
<PostActionButton 
  icon={ICONS.FAVORITE}
  count={post.likeCount}
  label="いいね"
  isActive={post.isLiked}
  onclick={() => handleLike()}
/>

その他メニュー:
<PostActionButton 
  icon={ICONS.MORE_HORIZ}
  label="その他のオプション"
  onclick={() => showMenu()}
/>
-->