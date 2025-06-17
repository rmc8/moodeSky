<!--
  言語切り替えセレクター
  Tauri OS Plugin + Paraglide-JS統合デモ
-->
<script lang="ts">
  import { i18nStore, type SupportedLanguage } from '../stores/i18n.svelte.js';
  import { SUPPORTED_LANGUAGES } from '../services/i18nService.js';
  import * as m from '../i18n/paraglide/messages.js';

  // 言語選択の処理
  async function handleLanguageChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const newLanguage = target.value as SupportedLanguage;
    
    if (newLanguage && newLanguage !== i18nStore.currentLanguage) {
      await i18nStore.setLanguage(newLanguage);
    }
  }

  // システム言語に戻す
  async function resetToSystemLanguage() {
    await i18nStore.resetToSystemLanguage();
  }
</script>

<div class="language-selector">
  <div class="selector-header">
    <h3 class="text-label">{m['language.current']()}</h3>
    {#if i18nStore.detectionResult}
      <p class="text-muted text-sm">
        {m['language.detectedFrom']({ source: m['language.sources.os']() })}
        {#if i18nStore.detectionResult.originalLocale}
          ({i18nStore.detectionResult.originalLocale})
        {/if}
      </p>
    {/if}
  </div>

  <div class="selector-controls">
    <select 
      value={i18nStore.currentLanguage}
      on:change={handleLanguageChange}
      disabled={i18nStore.isLoading}
    >
      {#each Object.entries(SUPPORTED_LANGUAGES) as [code, info]}
        <option value={code}>{info.nativeName} ({info.englishName})</option>
      {/each}
    </select>

    <button 
      on:click={resetToSystemLanguage}
      disabled={i18nStore.isLoading || i18nStore.currentLanguage === i18nStore.systemLanguage}
    >
      {m['language.system']()}
    </button>
  </div>

  {#if i18nStore.error}
    <div class="error-message">
      <p>{i18nStore.error}</p>
    </div>
  {/if}

  {#if i18nStore.isLoading}
    <div class="loading-indicator">
      <p>{m['app.loading']()}</p>
    </div>
  {/if}

  <!-- デバッグ情報（開発時のみ表示） -->
  {#if import.meta.env.DEV}
    <details class="debug-info">
      <summary>Debug Info</summary>
      <pre>
{JSON.stringify(i18nStore.getDebugInfo(), null, 2)}
      </pre>
    </details>
  {/if}
</div>

<style>
  .language-selector {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    background-color: var(--color-card);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    padding: 1.5rem;
    box-shadow: 0 1px 3px 0 var(--color-border-200), 0 1px 2px 0 var(--color-border-100);
  }

  .selector-header {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .selector-controls {
    display: flex;
    gap: 0.75rem;
    align-items: center;
  }

  .selector-controls select {
    flex: 1;
    background-color: var(--color-background);
    border: 2px solid var(--color-input);
    color: var(--color-foreground);
    border-radius: 0.5rem;
    padding: 0.75rem;
    font-size: 1rem;
    transition: border-color 0.2s ease;
  }

  .selector-controls select:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px rgba(var(--primary) / 0.1);
  }

  .selector-controls button {
    background-color: var(--color-primary);
    color: var(--color-background);
    border: 1px solid var(--color-primary);
    border-radius: 0.5rem;
    padding: 0.5rem 1rem;
    font-weight: 600;
    font-size: 0.875rem;
    transition: all 0.2s ease;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    white-space: nowrap;
  }

  .selector-controls button:hover:not(:disabled) {
    background-color: var(--color-secondary);
    border-color: var(--color-secondary);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(var(--primary) / 0.3);
  }

  .selector-controls button:focus {
    outline: none;
    box-shadow: 0 0 0 2px var(--color-ring);
  }

  .selector-controls button:disabled {
    background-color: var(--color-muted);
    border-color: var(--color-muted);
    color: rgb(var(--foreground) / 0.5);
    cursor: not-allowed;
    opacity: 0.6;
    transform: none;
    box-shadow: none;
  }

  .error-message {
    padding: 0.5rem;
    background-color: rgb(var(--error) / 0.1);
    border: 1px solid rgb(var(--error) / 0.3);
    border-radius: 0.5rem;
  }

  .error-message p {
    color: var(--color-error);
    font-size: 0.875rem;
    margin: 0;
  }

  .loading-indicator {
    padding: 0.5rem;
    background-color: rgb(var(--primary) / 0.1);
    border: 1px solid rgb(var(--primary) / 0.3);
    border-radius: 0.5rem;
  }

  .loading-indicator p {
    color: var(--color-muted);
    font-size: 0.875rem;
    margin: 0;
  }

  .debug-info {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--color-border);
  }

  .debug-info summary {
    color: var(--color-muted);
    font-size: 0.75rem;
    cursor: pointer;
  }

  .debug-info pre {
    font-size: 0.75rem;
    color: var(--color-muted);
    background-color: var(--color-muted);
    padding: 0.5rem;
    border-radius: 0.25rem;
    margin-top: 0.5rem;
    overflow: auto;
    margin: 0.5rem 0 0 0;
  }

  /* Text utility replacements */
  .text-label {
    color: var(--color-foreground);
    opacity: 0.85;
  }

  .text-muted {
    color: var(--color-muted);
  }

  .text-error {
    color: var(--color-error);
  }

  .text-sm {
    font-size: 0.875rem;
  }

  .text-xs {
    font-size: 0.75rem;
  }
</style>