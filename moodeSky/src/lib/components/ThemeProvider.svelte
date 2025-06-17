<!--
  テーマプロバイダーコンポーネント
  data-theme属性によるグローバルテーマ管理
  システムテーマ検出とTauri Store Plugin統合
-->

<script lang="ts">
  import { onMount } from 'svelte';
  
  interface Props {
    children: any;
  }
  
  let { children }: Props = $props();
  
  // テーマ状態管理
  let currentTheme = $state<'sky' | 'sunset' | 'high-contrast'>('sky');
  let systemTheme = $state<'light' | 'dark'>('light');
  
  // システムテーマの検出
  function detectSystemTheme(): 'light' | 'dark' {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  }
  
  // テーマ適用
  function applyTheme(theme: 'sky' | 'sunset' | 'high-contrast') {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }
  
  // システムテーマ変更の監視
  function watchSystemTheme() {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      const handler = (e: MediaQueryListEvent) => {
        systemTheme = e.matches ? 'dark' : 'light';
        // 将来的にシステム連動テーマが実装された場合の処理
      };
      
      mediaQuery.addEventListener('change', handler);
      
      return () => mediaQuery.removeEventListener('change', handler);
    }
    
    return () => {};
  }
  
  // 初期化処理
  onMount(() => {
    // システムテーマの初期検出
    systemTheme = detectSystemTheme();
    
    // デフォルトテーマの適用（将来的にはStore Pluginから読み込み）
    const defaultTheme = systemTheme === 'dark' ? 'sunset' : 'sky';
    currentTheme = defaultTheme;
    applyTheme(currentTheme);
    
    // システムテーマ変更の監視開始
    const cleanup = watchSystemTheme();
    
    return cleanup;
  });
  
  // テーマ切り替え関数（将来のThemeToggleコンポーネント用）
  export function switchTheme(theme: 'sky' | 'sunset' | 'high-contrast') {
    currentTheme = theme;
    applyTheme(theme);
    
    // 将来的にはStore Pluginに保存
    // await themeService.saveTheme(theme);
  }
</script>

<!-- 
  テーマプロバイダーでアプリ全体をラップ
  data-theme属性が<html>に適用される
-->
{@render children()}

<!--
  使用方法:
  
  レイアウトファイルで:
  <ThemeProvider>
    {#snippet children()}
      <slot />
    {/snippet}
  </ThemeProvider>
  
  任意のコンポーネントで:
  <!-- data-theme属性により自動的にテーマが適用される -->
  <div class="bg-themed text-themed">
    コンテンツ
  </div>
  
  将来のテーマ切り替え:
  <button onclick={() => switchTheme('sunset')}>
    ダークテーマに切り替え
  </button>
-->