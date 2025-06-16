<script lang="ts">
  interface Props {
    src?: string;
    displayName?: string;
    handle?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    class?: string;
  }
  
  let { src, displayName, handle, size = 'md', class: className = '' }: Props = $props();
  
  // フォールバック文字を取得（displayName > handle > '?'）
  const fallbackText = $derived(displayName?.charAt(0)?.toUpperCase() || 
                               handle?.charAt(0)?.toUpperCase() || 
                               '?');
  
  // サイズクラスを動的に設定
  const sizeClass = $derived({
    sm: 'avatar-sm',
    md: 'avatar-md', 
    lg: 'avatar-lg',
    xl: 'avatar-xl'
  }[size]);
  
  let imageError = $state(false);
  
  function handleImageError() {
    imageError = true;
  }
</script>

<div class="avatar {sizeClass} {className}" class:has-image={src && !imageError}>
  {#if src && !imageError}
    <img 
      {src} 
      alt="{displayName || handle || 'アバター'}" 
      onerror={handleImageError}
    />
  {:else}
    <span class="fallback-text">{fallbackText}</span>
  {/if}
</div>

<style>
  .avatar {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    overflow: hidden;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    font-weight: 600;
    flex-shrink: 0;
    position: relative;
  }
  
  .avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  
  .fallback-text {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
  }
  
  /* サイズバリエーション */
  .avatar-sm {
    width: 2rem;
    height: 2rem;
    font-size: 0.75rem;
  }
  
  .avatar-md {
    width: 2.5rem;
    height: 2.5rem;
    font-size: 0.875rem;
  }
  
  .avatar-lg {
    width: 4rem;
    height: 4rem;
    font-size: 1.25rem;
  }
  
  .avatar-xl {
    width: 6rem;
    height: 6rem;
    font-size: 1.75rem;
  }
  
  /* ダークモード対応 */
  @media (prefers-color-scheme: dark) {
    .avatar {
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
    }
  }
</style>