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
  import * as m from '../../../paraglide/messages.js';

  // ===================================================================
  // 状態管理
  // ===================================================================

  let isLoading = $state(false);
  let successMessage = $state('');
  let errorMessage = $state('');

  // テーマオプション定義（ThemeToggleと同じ構造）
  // $derivedを使用してリアクティブに言語切り替えに対応
  const themeOptions = $derived<Array<{
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
  }>>([
    {
      mode: 'system',
      label: m['settings.theme.systemTheme'](),
      icon: ICONS.COMPUTER,
      description: m['settings.theme.systemDescription'](),
      preview: {
        background: 'bg-gradient-themed',
        surface: 'bg-card border-themed',
        text: 'text-themed',
        accent: 'text-primary'
      }
    },
    {
      mode: 'light',
      label: m['settings.theme.lightTheme'](),
      icon: ICONS.LIGHT_MODE,
      description: m['settings.theme.lightDescription'](),
      preview: {
        background: 'bg-gradient-primary',
        surface: 'bg-card border-themed',
        text: 'text-themed',
        accent: 'text-primary'
      }
    },
    {
      mode: 'dark',
      label: m['settings.theme.darkTheme'](),
      icon: ICONS.DARK_MODE,
      description: m['settings.theme.darkDescription'](),
      preview: {
        background: 'bg-gradient-themed',
        surface: 'bg-card border-themed',
        text: 'text-themed',
        accent: 'text-primary'
      }
    },
    {
      mode: 'high-contrast',
      label: m['settings.theme.highContrastTheme'](),
      icon: ICONS.CONTRAST,
      description: m['settings.theme.highContrastDescription'](),
      preview: {
        background: 'bg-gradient-themed',
        surface: 'bg-card border-themed border-2',
        text: 'text-themed',
        accent: 'text-primary'
      }
    }
  ]);

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
      successMessage = m['settings.theme.changedTo']({ theme: themeOptions.find(opt => opt.mode === mode)?.label || mode });
      setTimeout(() => successMessage = '', 3000);
    } catch (error) {
      console.error('テーマ変更エラー:', error);
      errorMessage = m['settings.theme.changeError']();
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
      successMessage = m['settings.theme.animationToggled']({ state: themeStore.settings.animations ? m['settings.theme.enabled']() : m['settings.theme.disabled']() });
      setTimeout(() => successMessage = '', 3000);
    } catch (error) {
      console.error('アニメーション設定変更エラー:', error);
      errorMessage = m['settings.theme.animationError']();
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
      successMessage = m['settings.theme.scheduleToggled']({ state: themeStore.settings.autoSchedule.enabled ? m['settings.theme.enabled']() : m['settings.theme.disabled']() });
      setTimeout(() => successMessage = '', 3000);
    } catch (error) {
      console.error('自動スケジュール設定変更エラー:', error);
      errorMessage = m['settings.theme.scheduleError']();
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
      errorMessage = m['settings.theme.scheduleTimeError']();
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
<div class="max-w-4xl mx-auto pb-20 md:pb-8">
  <!-- セクションヘッダー -->
  <div class="mb-8">
    <h2 class="text-themed text-2xl font-bold mb-2 flex items-center gap-3">
      <span class="text-3xl">🎨</span>
      {m['settings.theme.title']()}
    </h2>
    <p class="text-themed opacity-70">
      {m['settings.theme.description']()}
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
        aria-label={m['settings.closeMessage']()}
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
        {m['settings.theme.mode']()}
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
                      <span class="text-xs text-primary font-medium">{m['settings.theme.selected']()}</span>
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
                    <span class="font-medium">{m['settings.theme.sampleText']()}</span>
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
        {m['settings.theme.animation']()}
      </h3>
      
      <div class="flex items-center justify-between">
        <div class="flex-1">
          <p class="text-themed mb-2">
            {m['settings.theme.animationDescription']()}
          </p>
          <p class="text-themed opacity-60 text-sm">
            {m['settings.theme.animationNote']()}
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
        {m['settings.theme.autoSchedule']()}
      </h3>
      
      <!-- 自動スケジュール有効/無効 -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex-1">
          <p class="text-themed mb-2">
            {m['settings.theme.autoScheduleDescription']()}
          </p>
          <p class="text-themed opacity-60 text-sm">
            {m['settings.theme.autoScheduleNote']()}
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
                <span class="text-themed font-medium text-sm">{m['settings.theme.lightStart']()}</span>
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
                <span class="text-themed font-medium text-sm">{m['settings.theme.darkStart']()}</span>
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
        {m['settings.theme.currentInfo']()}
      </h3>
      
      <div class="space-y-3 text-sm">
        <div class="flex justify-between items-center">
          <span class="text-themed opacity-70">{m['settings.theme.settingMode']()}:</span>
          <span class="text-themed font-medium">
            {themeOptions.find(opt => opt.mode === themeStore.settings.mode)?.label}
          </span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-themed opacity-70">{m['settings.theme.appliedTheme']()}:</span>
          <span class="text-themed font-medium">
            {themeStore.currentTheme === 'light' ? m['settings.theme.lightTheme']() : 
             themeStore.currentTheme === 'dark' ? m['settings.theme.darkTheme']() : 
             themeStore.currentTheme === 'high-contrast' ? m['settings.theme.highContrastTheme']() : themeStore.currentTheme}
          </span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-themed opacity-70">{m['settings.theme.animations']()}:</span>
          <span class="text-themed font-medium">
            {themeStore.settings.animations ? m['settings.theme.enabled']() : m['settings.theme.disabled']()}
          </span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-themed opacity-70">{m['settings.theme.autoSchedule']()}:</span>
          <span class="text-themed font-medium">
            {themeStore.settings.autoSchedule.enabled ? 
              `${m['settings.theme.enabled']()} (${themeStore.settings.autoSchedule.lightStart}:00-${themeStore.settings.autoSchedule.darkStart}:00)` : 
              m['settings.theme.disabled']()}
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
        <span class="text-themed">{m['settings.changingSettings']()}</span>
      </div>
    </div>
  {/if}
</div>