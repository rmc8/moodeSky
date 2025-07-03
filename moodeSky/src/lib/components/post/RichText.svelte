<!--
  RichText.svelte
  BlueskyポストのRichText表示コンポーネント
  facets（メンション、リンク、ハッシュタグ）の適切な表示とスタイリング
-->
<script lang="ts">
  import { getTextSegments, isUriLocal, isLinkSegment, isMentionSegment, isTagSegment } from '$lib/utils/richtext.js';
  import type { AppBskyRichtextFacet } from '@atproto/api';

  interface Props {
    text: string;
    facets?: AppBskyRichtextFacet.Main[];
    class?: string;
  }

  const { text, facets, class: className = '' }: Props = $props();

  // テキストセグメントを生成（リアクティブ）
  const textSegments = $derived(() => {
    // デバッグ用ログ（開発モードのみ）
    if (import.meta.env?.DEV) {
      console.log('[RichText] Processing text with facets:', {
        text,
        facetsCount: facets?.length || 0
      });
    }
    return getTextSegments(text, facets);
  });

  /**
   * リンククリックハンドラー
   * 外部リンクは新しいタブで開き、内部リンクは同一タブで遷移
   */
  function handleLinkClick(event: MouseEvent, segment: any) {
    if (!isLinkSegment(segment) || !segment.link?.uri) return;

    const uri = segment.link.uri;
    
    if (isUriLocal(uri)) {
      // ローカル（bsky.app）リンクの場合は同一タブで遷移
      try {
        const url = new URL(uri);
        // TODO: 適切なルーティング実装
        console.log('Navigate to local path:', url.pathname);
        event.preventDefault();
      } catch (error) {
        console.warn('Local URL parsing failed:', error);
      }
    } else {
      // 外部リンクの場合は新しいタブで開く
      event.preventDefault();
      window.open(uri, '_blank', 'noopener,noreferrer');
    }
  }

  /**
   * メンションクリックハンドラー
   */
  function handleMentionClick(event: MouseEvent, segment: any) {
    if (!isMentionSegment(segment)) return;
    
    // @ を除いたハンドル名を取得
    const handle = segment.text ? segment.text.slice(1) : segment.mention?.did;
    if (handle) {
      // TODO: プロフィールページへのナビゲーション実装
      console.log('Navigate to profile:', handle);
      event.preventDefault();
    }
  }

  /**
   * ハッシュタグクリックハンドラー
   */
  function handleTagClick(event: MouseEvent, segment: any) {
    if (!isTagSegment(segment) || !segment.tag?.tag) return;
    
    const tag = segment.tag.tag;
    // TODO: ハッシュタグ検索ページへのナビゲーション実装
    console.log('Search for tag:', tag);
    event.preventDefault();
  }
</script>

<div class="rich-text {className}">
  {#each textSegments() as segment}
    {#if isLinkSegment(segment) && segment.isLink() && segment.link}
      <a 
        href={segment.link.uri}
        class="text-primary hover:opacity-80 transition-opacity"
        target={isUriLocal(segment.link.uri) ? '_self' : '_blank'}
        rel={isUriLocal(segment.link.uri) ? '' : 'noopener noreferrer'}
        onclick={(e) => handleLinkClick(e, segment)}
      >
        {segment.text}
      </a>
    {:else if isMentionSegment(segment) && segment.isMention() && segment.mention}
      <button
        type="button"
        class="text-primary hover:opacity-80 transition-opacity cursor-pointer inline"
        onclick={(e) => handleMentionClick(e, segment)}
      >
        {segment.text}
      </button>
    {:else if isTagSegment(segment) && segment.isTag() && segment.tag}
      <button
        type="button"
        class="text-primary hover:opacity-80 transition-opacity cursor-pointer inline"
        onclick={(e) => handleTagClick(e, segment)}
      >
        {segment.text}
      </button>
    {:else}
      <!-- 通常のテキスト -->
      <span>{segment.text}</span>
    {/if}
  {/each}
</div>

<style>
  .rich-text {
    /* セグメント間の適切な表示を確保 */
    white-space: pre-wrap;
    word-break: break-word;
  }
  
  .rich-text button {
    /* ボタンのデフォルトスタイルをリセット */
    background: none;
    border: none;
    padding: 0;
    font: inherit;
    text-align: inherit;
  }
</style>