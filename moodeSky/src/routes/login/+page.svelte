<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { AtpAgent } from '@atproto/api';
  import { authService } from '$lib/services/authStore.js';
  import { accountsStore } from '$lib/stores/accounts.svelte.js';
  import Icon from '$lib/components/Icon.svelte';
  import ThemeToggle from '$lib/components/ThemeToggle.svelte';
  import LanguageSelectorCompact from '$lib/components/LanguageSelectorCompact.svelte';
  import { ICONS } from '$lib/types/icon.js';
  import { useTranslation } from '$lib/utils/reactiveTranslation.svelte.js';
  import { createComponentLogger } from '$lib/utils/logger.js';

  // コンポーネント専用ログ
  const log = createComponentLogger('Login');

  // リアクティブ翻訳システム
  const { t, currentLanguage } = useTranslation();

  // URLパラメータでアカウント追加モードを検出
  const isAddMode = $derived($page.url.searchParams.get('mode') === 'add');
  const hasExistingAccounts = $derived(accountsStore.hasAccounts);
  const showBackButton = $derived(() => {
    // アカウント追加モードかつ既存アカウントが存在し、ストアが初期化済みの場合に表示
    const shouldShow = isAddMode && hasExistingAccounts && accountsStore.isInitialized;
    
    log.debug('showBackButton calculation', {
      isAddMode,
      hasExistingAccounts,
      accountCount: accountsStore.accountCount,
      isInitialized: accountsStore.isInitialized,
      shouldShow
    });
    
    return shouldShow;
  });

  let handle = $state('');
  let password = $state('');
  let host = $state('bsky.social');
  let showPassword = $state(false);
  let errorMessage = $state('');
  let isLoading = $state(false);

  async function handleLogin(event: Event) {
    event.preventDefault();
    
    // 簡単なバリデーション
    if (!handle || !password) {
      errorMessage = t('validation.requiredFields');
      return;
    }
    
    // ローディング開始
    isLoading = true;
    errorMessage = '';
    
    try {
      // AT Protocol AgentでBlueSkyにログイン（persistSession対応）
      const agent = new AtpAgent({
        service: `https://${host}`,
        persistSession: authService.createPersistSessionHandler()
      });
      
      // ハンドル形式の処理
      const identifier = handle.includes('.') ? handle : `${handle}.bsky.social`;
      
      // ログイン実行
      const response = await agent.login({
        identifier: identifier,
        password: password
      });
      
      // ログイン成功 - didとハンドル、プロフィール情報を保存
      log.info('ログイン成功', {
        handle: response.data.handle,
        did: response.data.did,
        service: host
      });
      
      // Store API に認証情報を保存（統計情報も自動取得・保存）
      const sessionData = {
        ...response.data,
        active: response.data.active ?? true  // activeがundefinedの場合はtrueを設定
      };
      
      // saveAccountが内部でプロフィール情報と統計情報を自動取得するため、
      // 基本情報のみ渡す（統計情報は自動取得される）
      const saveResult = await authService.saveAccount(
        `https://${host}`,
        sessionData,
        {
          did: response.data.did,
          handle: response.data.handle,
          // displayNameとavatarは自動取得される
        }
      );
      
      if (!saveResult.success) {
        log.error('認証情報の保存に失敗', { error: saveResult.error });
        errorMessage = t('validation.authSaveFailed');
        return;
      }
      
      log.info('認証情報を正常に保存', {
        handle: saveResult.data?.profile.handle,
        did: saveResult.data?.profile.did
      });
      log.debug('プロフィール統計情報取得', {
        followersCount: saveResult.data?.profile.followersCount,
        followingCount: saveResult.data?.profile.followingCount,
        postsCount: saveResult.data?.profile.postsCount
      });
      
      // アカウントストアにも追加（リアクティブ更新）
      if (saveResult.data) {
        await accountsStore.addAccount(saveResult.data);
        
        // ログイン成功時にアクティブアカウントとして設定
        await accountsStore.setActiveAccount(saveResult.data);
        log.info('アクティブアカウント設定完了', {
          handle: saveResult.data.profile.handle,
          did: saveResult.data.profile.did
        });
        
        // アクティブアカウントが確実に設定されたことを確認
        if (!accountsStore.activeAccount) {
          log.error('アクティブアカウント設定確認失敗');
          errorMessage = 'アクティブアカウントの設定に失敗しました';
          return;
        }
        
        log.info('遷移準備完了', {
          activeAccount: accountsStore.activeAccount.profile.handle,
          isAddMode,
          targetPath: isAddMode ? '/settings' : '/deck'
        });
      }
      
      // アカウント追加モードの場合は設定画面に戻る
      if (isAddMode) {
        await goto('/settings');
      } else {
        await goto('/deck');
      }
      
    } catch (error: any) {
      // AT Protocol固有のエラーハンドリング
      log.error('ログインエラー', {
        error,
        handle,
        host,
        errorStatus: error?.status,
        errorMessage: error?.message
      });
      
      if (error?.status === 401) {
        errorMessage = t('validation.authFailed');
      } else if (error?.status === 400) {
        errorMessage = t('validation.invalidFormat');
      } else if (error?.status === 429) {
        errorMessage = t('validation.rateLimited');
      } else if (error?.message?.includes('network') || error?.code === 'ENOTFOUND') {
        errorMessage = t('validation.networkError');
      } else if (error?.message?.includes('timeout') || error?.code === 'ETIMEDOUT') {
        errorMessage = t('validation.timeoutError');
      } else if (error?.message?.includes('invalid_grant')) {
        errorMessage = t('validation.invalidPassword');
      } else if (error?.message?.includes('account_not_found')) {
        errorMessage = t('validation.accountNotFound');
      } else {
        errorMessage = error?.message || t('validation.genericError');
      }
    } finally {
      isLoading = false;
    }
  }

  // 設定画面に戻る関数
  function goBackToSettings() {
    log.debug('設定画面に戻るボタンクリック');
    try {
      goto('/settings');
      log.debug('設定画面への遷移実行完了');
    } catch (error) {
      log.error('設定画面への遷移エラー', { error });
    }
  }

  // アカウントストアの初期化
  onMount(async () => {
    try {
      log.debug('アカウントストア初期化開始');
      await accountsStore.initialize();
      log.debug('アカウントストア初期化完了');
    } catch (error) {
      log.error('アカウントストア初期化エラー', { error });
    }
  });
</script>

<main class="min-h-screen flex items-center justify-center bg-themed p-4">
  <div class="relative bg-card rounded-2xl shadow-xl p-8 w-full max-w-md">
    <!-- 設定パネル（右上） -->
    <div class="absolute top-4 right-4 flex flex-col gap-2">
      <ThemeToggle variant="compact" size="sm" showLabel={false} />
    </div>
    
    <!-- 言語セレクター（左上） -->
    <div class="absolute top-4 left-4 flex flex-col gap-2">
      <LanguageSelectorCompact />
      
      <!-- アカウント追加モード時の戻るボタン -->
      {#if showBackButton()}
        <button
          class="flex items-center gap-2 px-3 py-2 text-sm bg-muted/20 hover:bg-muted/40 text-themed rounded-lg transition-colors border border-themed/20 w-max"
          onclick={goBackToSettings}
          title="設定画面に戻る"
        >
          <Icon icon={ICONS.ARROW_BACK} size="sm" color="themed" />
          <span class="text-xs">戻る</span>
        </button>
      {/if}
    </div>
    
    <div class="text-center mb-8">
      <h1 class="text-3xl font-bold text-themed mb-2">moodeSky</h1>
      <p class="text-label text-sm">{t('login.title')}</p>
    </div>

    {#if errorMessage}
      <div class="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-lg mb-6 flex items-center gap-2 text-sm animate-in fade-in duration-300">
        <Icon 
          icon={ICONS.WARNING}
          size="lg"
          color="error"
          ariaLabel={t('common.error')}
          class="flex-shrink-0"
        />
        {errorMessage}
      </div>
    {/if}

    <form class="flex flex-col gap-6" onsubmit={handleLogin}>
      <div class="flex flex-col gap-2">
        <label for="handle" class="text-sm font-semibold text-label uppercase tracking-wide">{t('login.handleLabel')}</label>
        <input
          id="handle"
          type="text"
          placeholder={t('login.handlePlaceholder')}
          bind:value={handle}
          autocapitalize="off"
          autocorrect="off"
          spellcheck="false"
          data-gramm="false"
          data-gramm_editor="false"
          data-enable-grammarly="false"
          disabled={isLoading}
          required
          class="input-themed"
        />
      </div>

      <div class="flex flex-col gap-2">
        <label for="password" class="text-sm font-semibold text-label uppercase tracking-wide">{t('login.passwordLabel')}</label>
        <div class="relative flex items-center">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder={t('login.passwordPlaceholder')}
            bind:value={password}
            disabled={isLoading}
            required
            class="input-themed pr-12"
          />
          <button
            type="button"
            onclick={() => showPassword = !showPassword}
            class="group absolute right-3 p-2 rounded-md border-2 border-transparent bg-muted/20 hover:bg-primary hover:text-white focus:bg-primary focus:text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 high-contrast:border-themed high-contrast:bg-background high-contrast:hover:bg-foreground high-contrast:focus:bg-foreground high-contrast:hover:text-black high-contrast:focus:text-black"
            aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
            title={showPassword ? t('login.hidePassword') : t('login.showPassword')}
          >
            <Icon 
              icon={showPassword ? ICONS.VISIBILITY_OFF : ICONS.VISIBILITY}
              size="lg"
              color="themed"
              ariaLabel={showPassword ? t('login.hidePassword') : t('login.showPassword')}
              class="high-contrast:group-hover:![color:rgb(0_0_0)] high-contrast:group-focus:![color:rgb(0_0_0)]"
            />
          </button>
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <label for="host" class="text-sm font-semibold text-label uppercase tracking-wide">{t('login.hostLabel')}</label>
        <input
          id="host"
          type="text"
          placeholder="bsky.social"
          bind:value={host}
          disabled={isLoading}
          required
          class="input-themed"
        />
      </div>

      <button type="submit" disabled={isLoading} class="button-primary w-full py-3 px-4 font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg disabled:hover:translate-y-0 disabled:hover:shadow-none disabled:cursor-not-allowed disabled:opacity-60">
        {#if isLoading}
          <div class="flex items-center justify-center gap-2">
            <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            {t('app.loading')}
          </div>
        {:else}
          {t('auth.login')}
        {/if}
      </button>
    </form>

    <div class="mt-6 text-center">
      <p>
        <a href="https://bsky.app/settings/app-passwords" target="_blank" class="text-primary hover:underline text-sm">
          {t('login.appPasswordGuide')}
        </a>
      </p>
    </div>
  </div>
</main>

