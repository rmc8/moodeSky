<!--
  テーマプロバイダーコンポーネント
  テーマストア統合によるリアクティブなテーマ管理
  Tauri Store Plugin永続化対応
-->

<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { themeStore } from '../stores/theme.svelte.js';
  
  interface Props {
    children?: import('svelte').Snippet;
  }
  
  let { children }: Props = $props();

  // テーマストアの初期化フラグ
  let initializationPromise: Promise<void> | null = null;

  /**
   * コンポーネント初期化時の処理
   */
  onMount(async () => {
    try {
      // テーマストアを初期化（重複実行防止）
      if (!initializationPromise) {
        initializationPromise = themeStore.initialize();
      }
      await initializationPromise;
      
      console.log('ThemeProvider initialized successfully');
    } catch (error) {
      console.error('ThemeProvider initialization failed:', error);
    }
  });

  /**
   * コンポーネントクリーンアップ
   */
  onDestroy(() => {
    themeStore.destroy();
  });

  // リアクティブな現在テーマの監視
  $effect(() => {
    // 現在のテーマが変更されたときにログ出力（開発用）
    if (themeStore.isInitialized) {
      console.log('Theme changed to:', themeStore.currentTheme);
    }
  });

  // エラー状態の監視と自動クリア
  $effect(() => {
    if (themeStore.error) {
      console.error('Theme store error:', themeStore.error);
      
      // 5秒後に自動でエラーをクリア
      const timeoutId = setTimeout(() => {
        themeStore.clearError();
      }, 5000);
      
      return () => clearTimeout(timeoutId);
    }
  });
</script>

<!-- テーマプロバイダー -->
<!-- 初期化完了後にコンテンツを表示 -->
{#if themeStore.isInitialized}
  {@render children?.()}
{:else if themeStore.isLoading}
  <!-- ローディング状態 -->
  <div class="min-h-screen w-full flex items-center justify-center bg-themed">
    <div class="text-center">
      <div class="animate-spin inline-block w-8 h-8 border-4 border-current border-t-transparent text-primary rounded-full mb-4" role="status" aria-label="テーマ読み込み中">
        <span class="sr-only">テーマ読み込み中...</span>
      </div>
      <p class="text-sm text-themed opacity-70">テーマを読み込んでいます...</p>
    </div>
  </div>
{:else if themeStore.error}
  <!-- エラー状態 -->
  <div class="min-h-screen w-full flex items-center justify-center bg-themed">
    <div class="text-center max-w-md mx-auto p-6">
      <div class="bg-error/10 border border-error/20 text-error p-4 rounded-lg mb-4">
        <h2 class="font-semibold mb-2">テーマ読み込みエラー</h2>
        <p class="text-sm">{themeStore.error}</p>
      </div>
      <button 
        onclick={() => {
          themeStore.clearError();
          themeStore.initialize();
        }}
        class="button-primary"
      >
        再試行
      </button>
    </div>
  </div>
{:else}
  <!-- フォールバック: 初期化前のデフォルト表示 -->
  <div class="min-h-screen w-full bg-themed">
    {@render children?.()}
  </div>
{/if}

<style>
  /* ハイコントラストテーマの設定は app.css で管理し、ThemeProviderからは削除 */
  /* このスタイルブロックは将来のコンポーネント固有スタイル用に保持 */
</style>