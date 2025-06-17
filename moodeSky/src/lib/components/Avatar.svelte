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
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm', 
    lg: 'w-16 h-16 text-xl',
    xl: 'w-24 h-24 text-3xl'
  }[size]);
  
  let imageError = $state(false);
  
  function handleImageError() {
    imageError = true;
  }
</script>

<div class="inline-flex items-center justify-center rounded-full overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold flex-shrink-0 relative {sizeClass} {className}">
  {#if src && !imageError}
    <img 
      {src} 
      alt="{displayName || handle || 'アバター'}" 
      class="w-full h-full object-cover block"
      onerror={handleImageError}
    />
  {:else}
    <span class="flex items-center justify-center w-full h-full">{fallbackText}</span>
  {/if}
</div>
