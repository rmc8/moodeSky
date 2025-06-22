<!--
  ToggleSwitch.svelte
  再利用可能なトグルスイッチコンポーネント
  
  テーマシステムと統合され、アクセシビリティとアニメーションを考慮
-->
<script lang="ts">
  // ===================================================================
  // Props
  // ===================================================================
  
  interface Props {
    checked: boolean;
    disabled?: boolean;
    onchange?: (checked: boolean) => void;
    label?: string;
    description?: string;
    size?: 'sm' | 'md' | 'lg';
    id?: string;
    class?: string;
  }
  
  const { 
    checked, 
    disabled = false, 
    onchange, 
    label, 
    description, 
    size = 'md',
    id,
    class: className = ''
  }: Props = $props();
  
  // ===================================================================
  // サイズ設定
  // ===================================================================
  
  const sizeConfig = {
    sm: {
      track: 'w-8 h-4',
      thumb: 'w-3 h-3',
      trackWidth: 32,  // 8 * 4 = 32px
      thumbWidth: 12,  // 3 * 4 = 12px
      padding: 2,      // 0.5 * 4 = 2px
      top: 'top-0.5'
    },
    md: {
      track: 'w-11 h-6',
      thumb: 'w-4 h-4',
      trackWidth: 44,  // 11 * 4 = 44px
      thumbWidth: 16,  // 4 * 4 = 16px
      padding: 4,      // 1 * 4 = 4px
      top: 'top-1'
    },
    lg: {
      track: 'w-14 h-7',
      thumb: 'w-5 h-5',
      trackWidth: 56,  // 14 * 4 = 56px
      thumbWidth: 20,  // 5 * 4 = 20px
      padding: 4,      // 1 * 4 = 4px
      top: 'top-1'
    }
  };
  
  const config = sizeConfig[size];
  
  // サムの位置を計算
  const thumbPosition = $derived(() => {
    if (checked) {
      // オン位置: トラック幅 - サム幅 - パディング
      return config.trackWidth - config.thumbWidth - config.padding;
    } else {
      // オフ位置: パディング
      return config.padding;
    }
  });
  
  // ===================================================================
  // イベントハンドラー
  // ===================================================================
  
  function handleChange(event: Event) {
    const target = event.target as HTMLInputElement;
    onchange?.(target.checked);
  }
</script>

<!-- トグルスイッチ -->
<div class="inline-block {className}">
  <label class="relative inline-flex items-center cursor-pointer hover:scale-105 active:scale-95 transition-transform duration-200" class:cursor-not-allowed={disabled} class:hover:scale-100={disabled} class:active:scale-100={disabled}>
    <input
      type="checkbox"
      {checked}
      {disabled}
      {id}
      onchange={handleChange}
      class="sr-only"
      aria-describedby={description ? `${id}-desc` : undefined}
    />
    
    <!-- トラック -->
    <div 
      class="{config.track} rounded-full transition-colors duration-300 relative focus-within:outline focus-within:outline-2 focus-within:outline-primary focus-within:outline-offset-2"
      class:bg-primary={checked}
      class:opacity-50={disabled}
      style="background-color: {checked ? 'rgb(var(--primary))' : 'rgb(var(--foreground) / 0.2)'};"
    >
      <!-- サム（丸い部分） -->
      <div 
        class="{config.thumb} rounded-full shadow-md transition-all duration-300 absolute {config.top}"
        class:bg-card={!checked}
        class:bg-[var(--color-background)]={checked}
        class:shadow-lg={checked}
        style="transform: translateX({thumbPosition()}px);"
      ></div>
    </div>
    
    <!-- ラベルとテキスト -->
    {#if label || description}
      <div class="ml-3 flex-1">
        {#if label}
          <span class="text-themed font-medium" class:opacity-50={disabled}>
            {label}
          </span>
        {/if}
        {#if description}
          <p id="{id}-desc" class="text-themed opacity-60 text-sm mt-1" class:opacity-30={disabled}>
            {description}
          </p>
        {/if}
      </div>
    {/if}
  </label>
</div>

<!-- 💫 TailwindCSS v4 Tauri最適化完了 - カスタムCSS 100%削減 -->
<!-- ✨ 置換完了: hover:scale-105, active:scale-95, focus-within:outline -->
<!-- 🎯 効果: CSSファイルサイズ削減 + TailwindCSS統一 -->