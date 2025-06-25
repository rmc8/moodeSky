<!--
  AvatarGroup.svelte
  複数アカウントのアバター表示を管理するコンポーネント
  
  1つ、2つ、3つ、4つ以上のアカウントに対応した適切なレイアウトを提供
-->
<script lang="ts">
  import Avatar from './Avatar.svelte';
  import Icon from './Icon.svelte';
  import { ICONS } from '$lib/types/icon.js';
  import type { Account } from '$lib/types/auth.js';

  // ===================================================================
  // Props
  // ===================================================================

  interface Props {
    accounts: Account[];
    size?: 'sm' | 'md' | 'lg';
    maxDisplay?: number;
    class?: string;
  }

  const { 
    accounts, 
    size = 'md', 
    maxDisplay = 4, 
    class: className = '' 
  }: Props = $props();

  // ===================================================================
  // 型安全な派生値
  // ===================================================================

  /**
   * 表示するアカウント（最大数まで）
   */
  const displayAccounts = $derived.by((): Account[] => {
    try {
      return accounts.slice(0, maxDisplay);
    } catch (error) {
      console.error('AvatarGroup: Error processing accounts:', error);
      return [];
    }
  });

  /**
   * 超過アカウントがあるかどうか
   */
  const hasMoreAccounts = $derived.by((): boolean => {
    return accounts.length > maxDisplay;
  });

  /**
   * 表示パターンの決定
   */
  const displayMode = $derived.by((): 'empty' | 'single' | 'dual' | 'triple' | 'grid' => {
    const count = displayAccounts.length;
    if (count === 0) return 'empty';
    if (count === 1) return 'single';
    if (count === 2) return 'dual';
    if (count === 3) return 'triple';
    return 'grid';
  });

  /**
   * コンテナサイズの計算
   */
  const containerSize = $derived.by((): string => {
    const sizeMap = {
      sm: 'w-8 h-8',
      md: 'w-10 h-10',
      lg: 'w-12 h-12'
    };
    return sizeMap[size];
  });

  /**
   * 個別アバターサイズの計算
   */
  const avatarSize = $derived.by((): 'sm' | 'md' | 'lg' | 'xl' => {
    if (displayMode === 'single') return size;
    return 'sm'; // 複数表示時は常にsmサイズ
  });

  /**
   * 超過インジケーターサイズ
   */
  const indicatorSize = $derived.by((): string => {
    const sizeMap = {
      sm: 'w-2 h-2',
      md: 'w-3 h-3',
      lg: 'w-4 h-4'
    };
    return sizeMap[size];
  });
</script>

<div class="flex-shrink-0 relative {containerSize} {className}">
  {#if displayMode === 'empty'}
    <!-- フォールバック：アカウントが見つからない場合 -->
    <div class="{containerSize} rounded-full bg-muted/20 flex items-center justify-center">
      <Icon icon={ICONS.PERSON} size="sm" color="secondary" />
    </div>
    
  {:else if displayMode === 'single'}
    <!-- 単一アカウント -->
    <Avatar 
      src={displayAccounts[0].profile.avatar} 
      displayName={displayAccounts[0].profile.displayName}
      handle={displayAccounts[0].profile.handle}
      {size}
    />
    
  {:else if displayMode === 'dual'}
    <!-- 2アカウント：左右分割 -->
    <div class="{containerSize} flex">
      <Avatar 
        src={displayAccounts[0].profile.avatar} 
        displayName={displayAccounts[0].profile.displayName}
        handle={displayAccounts[0].profile.handle}
        size={avatarSize}
        class="flex-1 rounded-r-none"
      />
      <Avatar 
        src={displayAccounts[1].profile.avatar} 
        displayName={displayAccounts[1].profile.displayName}
        handle={displayAccounts[1].profile.handle}
        size={avatarSize}
        class="flex-1 rounded-l-none -ml-px"
      />
    </div>
    
  {:else if displayMode === 'triple'}
    <!-- 3アカウント：上1つ、下2つ -->
    <div class="{containerSize} flex flex-col">
      <Avatar 
        src={displayAccounts[0].profile.avatar} 
        displayName={displayAccounts[0].profile.displayName}
        handle={displayAccounts[0].profile.handle}
        size={avatarSize}
        class="w-full flex-1 rounded-b-none"
      />
      <div class="flex flex-1">
        <Avatar 
          src={displayAccounts[1].profile.avatar} 
          displayName={displayAccounts[1].profile.displayName}
          handle={displayAccounts[1].profile.handle}
          size={avatarSize}
          class="flex-1 rounded-t-none rounded-r-none"
        />
        <Avatar 
          src={displayAccounts[2].profile.avatar} 
          displayName={displayAccounts[2].profile.displayName}
          handle={displayAccounts[2].profile.handle}
          size={avatarSize}
          class="flex-1 rounded-t-none rounded-l-none -ml-px"
        />
      </div>
    </div>
    
  {:else}
    <!-- 4+アカウント：2x2グリッド -->
    <div class="{containerSize} grid grid-cols-2 grid-rows-2 gap-px">
      {#each displayAccounts as account, i}
        <Avatar 
          src={account.profile.avatar} 
          displayName={account.profile.displayName}
          handle={account.profile.handle}
          size={avatarSize}
          class="w-full h-full {i === 0 ? 'rounded-r-none rounded-b-none' : i === 1 ? 'rounded-l-none rounded-b-none' : i === 2 ? 'rounded-r-none rounded-t-none' : 'rounded-l-none rounded-t-none'}"
        />
      {/each}
    </div>
    
    {#if hasMoreAccounts}
      <!-- 4つ超過の場合の追加表示インジケーター -->
      <div class="absolute -bottom-1 -right-1 {indicatorSize} bg-primary rounded-full border border-card flex items-center justify-center">
        <span class="text-white text-xs font-bold leading-none">+</span>
      </div>
    {/if}
  {/if}
</div>