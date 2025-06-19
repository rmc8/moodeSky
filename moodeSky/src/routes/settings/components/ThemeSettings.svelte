<!--
  ThemeSettings.svelte
  テーマ・外観設定コンポーネント
  
  既存のテーマシステム (theme.svelte.ts) との完全統合
  ThemeToggleコンポーネントの高度機能を設定画面で提供
-->
<script lang="ts">
  import { themeStore } from '$lib/stores/theme.svelte.js';
  import Icon from '$lib/components/Icon.svelte';
  import { ICONS } from '$lib/types/icon.js';
  import type { ThemeMode } from '$lib/types/theme.js';
  import { theme, common } from '$lib/i18n/paraglide/messages.js';

  // ===================================================================
  // 状態管理
  // ===================================================================

  let isLoading = $state(false);
  let successMessage = $state('');
  let errorMessage = $state('');

  // テーマオプション定義（ThemeToggleと同じ構造）
  const themeOptions: Array<{
    mode: ThemeMode;
    label: string;
    icon: string;
    description: string;
    preview: {
      background: string;
      surface: string;
      text: string;
      accent: string;
    };
  }> = [
    {
      mode: 'system',
      label: theme.system(),
      icon: ICONS.COMPUTER,
      description: 'システム設定に従って自動的にテーマを切り替えます',
      preview: {
        background: 'from-slate-50 to-slate-900',
        surface: 'bg-white/80 dark:bg-slate-800/80',
        text: 'text-slate-900 dark:text-slate-100',
        accent: 'text-blue-600 dark:text-orange-400'
      }
    },
    {
      mode: 'light',
      label: theme.light(),
      icon: ICONS.LIGHT_MODE,
      description: '明るい背景の軽やかなテーマです',
      preview: {
        background: 'from-white to-blue-50',
        surface: 'bg-white border-blue-200',
        text: 'text-slate-900',
        accent: 'text-blue-600'
      }
    },
    {
      mode: 'dark',
      label: theme.dark(),
      icon: ICONS.DARK_MODE,
      description: '暗い背景で目に優しいテーマです',
      preview: {
        background: 'from-slate-900 to-orange-950',
        surface: 'bg-slate-800 border-orange-700',
        text: 'text-slate-100',
        accent: 'text-orange-400'
      }
    },
    {
      mode: 'high-contrast',
      label: theme.highContrast(),
      icon: ICONS.CONTRAST,
      description: 'アクセシビリティを重視した高コントラストテーマです',
      preview: {
        background: 'from-black to-white',
        surface: 'bg-white border-black border-2',
        text: 'text-black',
        accent: 'text-yellow-600'
      }
    }
  ];

  // ===================================================================
  // イベントハンドラー
  // ===================================================================

  /**
   * テーマモード変更
   */
  async function handleThemeChange(mode: ThemeMode) {
    if (mode === themeStore.settings.mode) return;

    isLoading = true;
    errorMessage = '';
    successMessage = '';

    try {
      await themeStore.setThemeMode(mode);
      successMessage = `テーマを「${themeOptions.find(opt => opt.mode === mode)?.label}」に変更しました`;
      setTimeout(() => successMessage = '', 3000);
    } catch (error) {
      console.error('テーマ変更エラー:', error);
      errorMessage = 'テーマの変更に失敗しました';
    } finally {
      isLoading = false;
    }
  }

  /**
   * アニメーション設定切り替え
   */
  async function handleAnimationToggle() {
    isLoading = true;
    errorMessage = '';

    try {
      await themeStore.toggleAnimations();
      successMessage = `アニメーション効果を${themeStore.settings.animations ? '有効' : '無効'}にしました`;
      setTimeout(() => successMessage = '', 3000);
    } catch (error) {
      console.error('アニメーション設定変更エラー:', error);
      errorMessage = 'アニメーション設定の変更に失敗しました';
    } finally {
      isLoading = false;
    }
  }

  /**
   * 自動スケジュール有効/無効切り替え
   */
  async function handleScheduleToggle() {
    isLoading = true;
    errorMessage = '';

    try {
      await themeStore.updateAutoSchedule({
        enabled: !themeStore.settings.autoSchedule.enabled
      });
      successMessage = `自動スケジュールを${themeStore.settings.autoSchedule.enabled ? '有効' : '無効'}にしました`;
      setTimeout(() => successMessage = '', 3000);
    } catch (error) {
      console.error('自動スケジュール設定変更エラー:', error);
      errorMessage = '自動スケジュール設定の変更に失敗しました';
    } finally {
      isLoading = false;
    }
  }

  /**
   * スケジュール時刻変更
   */
  async function handleScheduleTimeChange(type: 'lightStart' | 'darkStart', value: number) {
    isLoading = true;
    errorMessage = '';

    try {
      await themeStore.updateAutoSchedule({
        [type]: value
      });
    } catch (error) {
      console.error('スケジュール時刻変更エラー:', error);
      errorMessage = 'スケジュール時刻の変更に失敗しました';
    } finally {
      isLoading = false;
    }
  }

  /**
   * メッセージをクリア
   */
  function clearMessages() {
    successMessage = '';
    errorMessage = '';
  }

  // 自動的にメッセージをクリア
  let clearTimer: ReturnType<typeof setTimeout>;
  $effect(() => {
    if (successMessage || errorMessage) {
      clearTimer = setTimeout(clearMessages, 5000);
    }
    return () => clearTimeout(clearTimer);
  });
</script>

<!-- テーマ設定セクション -->
<div class="max-w-4xl mx-auto">
  <!-- セクションヘッダー -->
  <div class="mb-8">
    <h2 class="text-themed text-2xl font-bold mb-2 flex items-center gap-3">
      <span class="text-3xl">🎨</span>
      テーマ・外観設定
    </h2>
    <p class="text-themed opacity-70">
      アプリケーションの外観とテーマを設定します
    </p>
  </div>

  <!-- メッセージ表示 -->
  {#if successMessage}
    <div class="mb-6 p-4 bg-success/10 border border-success/20 rounded-lg flex items-center gap-3">
      <Icon icon={ICONS.CHECK} size="md" color="success" />
      <span class="text-success font-medium">{successMessage}</span>
    </div>
  {/if}

  {#if errorMessage}
    <div class="mb-6 p-4 bg-error/10 border border-error/20 rounded-lg flex items-center gap-3">
      <Icon icon={ICONS.ERROR} size="md" color="error" />
      <span class="text-error font-medium">{errorMessage}</span>
      <button 
        class="ml-auto text-error hover:text-error/80 transition-colors"
        onclick={clearMessages}
        aria-label="エラーメッセージを閉じる"
      >
        <Icon icon={ICONS.CLOSE} size="sm" />
      </button>
    </div>
  {/if}

  <!-- 設定項目 -->
  <div class="space-y-8">
    <!-- テーマモード選択 -->
    <div class="bg-card rounded-xl p-6 border border-themed">
      <h3 class="text-themed text-lg font-semibold mb-4 flex items-center gap-2">
        <Icon icon={ICONS.PALETTE} size="md" color="primary" />
        テーマモード
      </h3>
      
      <!-- テーマ選択グリッド -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {#each themeOptions as option}
          <button
            class="group p-4 rounded-lg border-2 transition-all duration-200 text-left hover:scale-[1.02] focus:scale-[1.02] overflow-hidden relative"
            class:border-primary={option.mode === themeStore.settings.mode}
            class:bg-primary={option.mode === themeStore.settings.mode}
            class:border-themed={option.mode !== themeStore.settings.mode}
            class:hover:border-primary={option.mode !== themeStore.settings.mode}
            style={option.mode === themeStore.settings.mode ? 'background: rgb(var(--primary) / 0.1);' : ''}
            disabled={isLoading}
            onclick={() => handleThemeChange(option.mode)}
          >
            <!-- プレビュー背景 -->
            <div class="absolute inset-0 bg-gradient-to-br opacity-10 {option.preview.background}"></div>
            
            <!-- コンテンツ -->
            <div class="relative z-10">
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-3">
                  <Icon 
                    icon={option.icon}
                    size="lg"
                    color={option.mode === themeStore.settings.mode ? 'primary' : 'themed'}
                  />
                  <div>
                    <h4 class="font-semibold text-themed">{option.label}</h4>
                    {#if option.mode === themeStore.settings.mode}
                      <span class="text-xs text-primary font-medium">選択中</span>
                    {/if}
                  </div>
                </div>
                {#if option.mode === themeStore.settings.mode}
                  <Icon icon={ICONS.CHECK} size="md" color="primary" />
                {/if}
              </div>
              
              <!-- プレビューカード -->
              <div class="rounded border p-2 {option.preview.surface}">
                <div class="text-xs {option.preview.text}">
                  <div class="flex items-center gap-2 mb-1">
                    <div class="w-2 h-2 rounded-full {option.preview.accent}"></div>
                    <span class="font-medium">サンプルテキスト</span>
                  </div>
                  <div class="opacity-70">{option.description}</div>
                </div>
              </div>
            </div>
          </button>
        {/each}
      </div>
    </div>

    <!-- アニメーション設定 -->
    <div class="bg-card rounded-xl p-6 border border-themed">
      <h3 class="text-themed text-lg font-semibold mb-4 flex items-center gap-2">
        <Icon icon={ICONS.ANIMATION} size="md" color="primary" />
        アニメーション効果
      </h3>
      
      <div class="flex items-center justify-between">
        <div class="flex-1">
          <p class="text-themed mb-2">
            テーマ切り替えやUI要素のアニメーション効果
          </p>
          <p class="text-themed opacity-60 text-sm">
            アニメーションを無効にするとパフォーマンスが向上します
          </p>
        </div>
        
        <label class="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={themeStore.settings.animations}
            disabled={isLoading}
            onchange={handleAnimationToggle}
            class="sr-only"
          />
          <div 
            class="w-12 h-6 bg-muted rounded-full transition-colors duration-200"
            class:bg-primary={themeStore.settings.animations}
          >
            <div 
              class="w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200"
              class:translate-x-6={themeStore.settings.animations}
              class:translate-x-0.5={!themeStore.settings.animations}
            ></div>
          </div>
        </label>
      </div>
    </div>

    <!-- 自動スケジュール設定 -->
    <div class="bg-card rounded-xl p-6 border border-themed">
      <h3 class="text-themed text-lg font-semibold mb-4 flex items-center gap-2">
        <Icon icon={ICONS.SCHEDULE} size="md" color="primary" />
        自動スケジュール
      </h3>
      
      <!-- 自動スケジュール有効/無効 -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex-1">
          <p class="text-themed mb-2">
            時間帯に応じた自動テーマ切り替え
          </p>
          <p class="text-themed opacity-60 text-sm">
            指定した時刻に自動的にライト/ダークテーマを切り替えます
          </p>
        </div>
        
        <label class="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={themeStore.settings.autoSchedule.enabled}
            disabled={isLoading}
            onchange={handleScheduleToggle}
            class="sr-only"
          />
          <div 
            class="w-12 h-6 bg-muted rounded-full transition-colors duration-200"
            class:bg-primary={themeStore.settings.autoSchedule.enabled}
          >
            <div 
              class="w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200"
              class:translate-x-6={themeStore.settings.autoSchedule.enabled}
              class:translate-x-0.5={!themeStore.settings.autoSchedule.enabled}
            ></div>
          </div>
        </label>
      </div>

      <!-- スケジュール時刻設定 -->
      {#if themeStore.settings.autoSchedule.enabled}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- ライトテーマ開始時刻 -->
          <div class="bg-muted/20 rounded-lg p-4 border border-themed/10">
            <label class="block">
              <div class="flex items-center gap-2 mb-2">
                <Icon icon={ICONS.LIGHT_MODE} size="sm" color="themed" />
                <span class="text-themed font-medium text-sm">ライトテーマ開始</span>
              </div>
              <select
                class="w-full p-2 bg-themed border border-themed rounded text-themed focus:border-primary focus:outline-none text-sm"
                disabled={isLoading}
                value={themeStore.settings.autoSchedule.lightStart}
                onchange={(e) => handleScheduleTimeChange('lightStart', parseInt((e.target as HTMLSelectElement).value))}
              >
                {#each Array(24).fill(0).map((_, i) => i) as hour}
                  <option value={hour}>{hour.toString().padStart(2, '0')}:00</option>
                {/each}
              </select>
            </label>
          </div>

          <!-- ダークテーマ開始時刻 -->
          <div class="bg-muted/20 rounded-lg p-4 border border-themed/10">
            <label class="block">
              <div class="flex items-center gap-2 mb-2">
                <Icon icon={ICONS.DARK_MODE} size="sm" color="themed" />
                <span class="text-themed font-medium text-sm">ダークテーマ開始</span>
              </div>
              <select
                class="w-full p-2 bg-themed border border-themed rounded text-themed focus:border-primary focus:outline-none text-sm"
                disabled={isLoading}
                value={themeStore.settings.autoSchedule.darkStart}
                onchange={(e) => handleScheduleTimeChange('darkStart', parseInt((e.target as HTMLSelectElement).value))}
              >
                {#each Array(24).fill(0).map((_, i) => i) as hour}
                  <option value={hour}>{hour.toString().padStart(2, '0')}:00</option>
                {/each}
              </select>
            </label>
          </div>
        </div>
      {/if}
    </div>

    <!-- 現在のテーマ情報 -->
    <div class="bg-muted/20 rounded-xl p-6 border border-themed/20">
      <h3 class="text-themed text-lg font-semibold mb-4 flex items-center gap-2">
        <Icon icon={ICONS.INFO} size="md" color="themed" />
        現在のテーマ情報
      </h3>
      
      <div class="space-y-3 text-sm">
        <div class="flex justify-between items-center">
          <span class="text-themed opacity-70">設定中のモード:</span>
          <span class="text-themed font-medium">
            {themeOptions.find(opt => opt.mode === themeStore.settings.mode)?.label}
          </span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-themed opacity-70">適用中のテーマ:</span>
          <span class="text-themed font-medium">
            {themeStore.currentTheme === 'light' ? 'ライト' : 
             themeStore.currentTheme === 'dark' ? 'ダーク' : 
             themeStore.currentTheme === 'high-contrast' ? 'ハイコントラスト' : themeStore.currentTheme}
          </span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-themed opacity-70">アニメーション:</span>
          <span class="text-themed font-medium">
            {themeStore.settings.animations ? '有効' : '無効'}
          </span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-themed opacity-70">自動スケジュール:</span>
          <span class="text-themed font-medium">
            {themeStore.settings.autoSchedule.enabled ? 
              `有効 (${themeStore.settings.autoSchedule.lightStart}:00-${themeStore.settings.autoSchedule.darkStart}:00)` : 
              '無効'}
          </span>
        </div>
      </div>
    </div>
  </div>

  <!-- ローディング状態 -->
  {#if isLoading}
    <div class="fixed inset-0 bg-themed/50 flex items-center justify-center z-50">
      <div class="bg-card rounded-lg p-6 shadow-xl flex items-center gap-3">
        <div class="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
        <span class="text-themed">設定を変更中...</span>
      </div>
    </div>
  {/if}
</div>