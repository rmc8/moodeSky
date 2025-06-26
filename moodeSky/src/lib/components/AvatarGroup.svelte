<!--
  AvatarGroup.svelte
  複数アカウントのアバター表示を管理するコンポーネント
  
  1つ、2つ、3つ、4つ以上のアカウントに対応した適切なレイアウトを提供
  重なり合うスタイルで美しい表示を実現
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
    clickable?: boolean;
    onClick?: (event: MouseEvent) => void;
  }

  const { 
    accounts, 
    size = 'md', 
    maxDisplay = 4, 
    class: className = '',
    clickable = false,
    onClick
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

  // ===================================================================
  // イベントハンドラー
  // ===================================================================

  function handleClick(event: MouseEvent) {
    if (clickable && onClick) {
      event.stopPropagation();
      onClick(event);
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (clickable && onClick && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      event.stopPropagation();
      onClick(event as any);
    }
  }

  // ===================================================================
  // アバターコンテンツ生成
  // ===================================================================

  /**
   * アバターコンテンツの型定義
   */
  type AvatarContent = 
    | { type: 'empty'; content: null }
    | { type: 'single'; account: Account }
    | { type: 'dual'; accounts: Account[] }
    | { type: 'triple'; accounts: Account[] }
    | { type: 'grid'; accounts: Account[]; extraCount: number };

  /**
   * アバターコンテンツを生成（重複を避けるため）
   */
  function renderAvatarContent(): AvatarContent {
    if (displayMode === 'empty') {
      return {
        type: 'empty',
        content: null
      };
    } else if (displayMode === 'single') {
      return {
        type: 'single',
        account: displayAccounts[0]
      };
    } else if (displayMode === 'dual') {
      return {
        type: 'dual',
        accounts: displayAccounts.slice(0, 2)
      };
    } else if (displayMode === 'triple') {
      return {
        type: 'triple',
        accounts: displayAccounts.slice(0, 3)
      };
    } else {
      return {
        type: 'grid',
        accounts: displayAccounts.slice(0, 3),
        extraCount: accounts.length - 3
      };
    }
  }

  const avatarContent = $derived(renderAvatarContent());
</script>

{#if clickable}
<button 
  class="flex-shrink-0 relative {containerSize} {className} rounded-full transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50 focus:ring-offset-2"
  onclick={handleClick}
  onkeydown={handleKeydown}
  aria-label="アカウント切り替え"
  tabindex="0"
>
  {#if avatarContent.type === 'empty'}
    <!-- フォールバック：アカウントが見つからない場合 -->
    <div class="{containerSize} rounded-full bg-muted bg-opacity-20 flex items-center justify-center">
      <Icon icon={ICONS.PERSON} size="sm" color="secondary" />
    </div>
    
  {:else if avatarContent.type === 'single'}
    <!-- 単一アカウント -->
    <Avatar 
      src={avatarContent.account.profile.avatar} 
      displayName={avatarContent.account.profile.displayName}
      handle={avatarContent.account.profile.handle}
      {size}
    />
    
  {:else if avatarContent.type === 'dual'}
    <!-- 2アカウント：重なり表示 -->
    <div class="{containerSize} relative flex items-center justify-start">
      <Avatar 
        src={avatarContent.accounts[0].profile.avatar} 
        displayName={avatarContent.accounts[0].profile.displayName}
        handle={avatarContent.accounts[0].profile.handle}
        size={avatarSize}
        class="relative z-10 border-2 border-card"
      />
      <Avatar 
        src={avatarContent.accounts[1].profile.avatar} 
        displayName={avatarContent.accounts[1].profile.displayName}
        handle={avatarContent.accounts[1].profile.handle}
        size={avatarSize}
        class="relative z-0 -ml-3 border-2 border-card"
      />
    </div>
    
  {:else if avatarContent.type === 'triple'}
    <!-- 3アカウント：重なり表示 -->
    <div class="{containerSize} relative flex items-center justify-start">
      <Avatar 
        src={avatarContent.accounts[0].profile.avatar} 
        displayName={avatarContent.accounts[0].profile.displayName}
        handle={avatarContent.accounts[0].profile.handle}
        size={avatarSize}
        class="relative z-20 border-2 border-card"
      />
      <Avatar 
        src={avatarContent.accounts[1].profile.avatar} 
        displayName={avatarContent.accounts[1].profile.displayName}
        handle={avatarContent.accounts[1].profile.handle}
        size={avatarSize}
        class="relative z-10 -ml-3 border-2 border-card"
      />
      <Avatar 
        src={avatarContent.accounts[2].profile.avatar} 
        displayName={avatarContent.accounts[2].profile.displayName}
        handle={avatarContent.accounts[2].profile.handle}
        size={avatarSize}
        class="relative z-0 -ml-3 border-2 border-card"
      />
    </div>
    
  {:else}
    <!-- 4+アカウント：重なり表示 + 数値インジケーター -->
    <div class="{containerSize} relative flex items-center justify-start">
      <Avatar 
        src={avatarContent.accounts[0].profile.avatar} 
        displayName={avatarContent.accounts[0].profile.displayName}
        handle={avatarContent.accounts[0].profile.handle}
        size={avatarSize}
        class="relative z-30 border-2 border-card"
      />
      <Avatar 
        src={avatarContent.accounts[1].profile.avatar} 
        displayName={avatarContent.accounts[1].profile.displayName}
        handle={avatarContent.accounts[1].profile.handle}
        size={avatarSize}
        class="relative z-20 -ml-3 border-2 border-card"
      />
      <Avatar 
        src={avatarContent.accounts[2].profile.avatar} 
        displayName={avatarContent.accounts[2].profile.displayName}
        handle={avatarContent.accounts[2].profile.handle}
        size={avatarSize}
        class="relative z-10 -ml-3 border-2 border-card"
      />
      
      <!-- 数値インジケーター -->
      <div class="relative z-0 -ml-3 {avatarSize === 'sm' ? 'w-8 h-8' : avatarSize === 'md' ? 'w-10 h-10' : 'w-12 h-12'} bg-muted bg-opacity-80 rounded-full border-2 border-card flex items-center justify-center">
        <span class="text-xs font-bold text-themed">+{avatarContent.extraCount}</span>
      </div>
    </div>
  {/if}
</button>
{:else}
<div class="flex-shrink-0 relative {containerSize} {className}">
  {#if avatarContent.type === 'empty'}
    <!-- フォールバック：アカウントが見つからない場合 -->
    <div class="{containerSize} rounded-full bg-muted bg-opacity-20 flex items-center justify-center">
      <Icon icon={ICONS.PERSON} size="sm" color="secondary" />
    </div>
    
  {:else if avatarContent.type === 'single'}
    <!-- 単一アカウント -->
    <Avatar 
      src={avatarContent.account.profile.avatar} 
      displayName={avatarContent.account.profile.displayName}
      handle={avatarContent.account.profile.handle}
      {size}
    />
    
  {:else if avatarContent.type === 'dual'}
    <!-- 2アカウント：重なり表示 -->
    <div class="{containerSize} relative flex items-center justify-start">
      <Avatar 
        src={avatarContent.accounts[0].profile.avatar} 
        displayName={avatarContent.accounts[0].profile.displayName}
        handle={avatarContent.accounts[0].profile.handle}
        size={avatarSize}
        class="relative z-10 border-2 border-card"
      />
      <Avatar 
        src={avatarContent.accounts[1].profile.avatar} 
        displayName={avatarContent.accounts[1].profile.displayName}
        handle={avatarContent.accounts[1].profile.handle}
        size={avatarSize}
        class="relative z-0 -ml-3 border-2 border-card"
      />
    </div>
    
  {:else if avatarContent.type === 'triple'}
    <!-- 3アカウント：重なり表示 -->
    <div class="{containerSize} relative flex items-center justify-start">
      <Avatar 
        src={avatarContent.accounts[0].profile.avatar} 
        displayName={avatarContent.accounts[0].profile.displayName}
        handle={avatarContent.accounts[0].profile.handle}
        size={avatarSize}
        class="relative z-20 border-2 border-card"
      />
      <Avatar 
        src={avatarContent.accounts[1].profile.avatar} 
        displayName={avatarContent.accounts[1].profile.displayName}
        handle={avatarContent.accounts[1].profile.handle}
        size={avatarSize}
        class="relative z-10 -ml-3 border-2 border-card"
      />
      <Avatar 
        src={avatarContent.accounts[2].profile.avatar} 
        displayName={avatarContent.accounts[2].profile.displayName}
        handle={avatarContent.accounts[2].profile.handle}
        size={avatarSize}
        class="relative z-0 -ml-3 border-2 border-card"
      />
    </div>
    
  {:else}
    <!-- 4+アカウント：重なり表示 + 数値インジケーター -->
    <div class="{containerSize} relative flex items-center justify-start">
      <Avatar 
        src={avatarContent.accounts[0].profile.avatar} 
        displayName={avatarContent.accounts[0].profile.displayName}
        handle={avatarContent.accounts[0].profile.handle}
        size={avatarSize}
        class="relative z-30 border-2 border-card"
      />
      <Avatar 
        src={avatarContent.accounts[1].profile.avatar} 
        displayName={avatarContent.accounts[1].profile.displayName}
        handle={avatarContent.accounts[1].profile.handle}
        size={avatarSize}
        class="relative z-20 -ml-3 border-2 border-card"
      />
      <Avatar 
        src={avatarContent.accounts[2].profile.avatar} 
        displayName={avatarContent.accounts[2].profile.displayName}
        handle={avatarContent.accounts[2].profile.handle}
        size={avatarSize}
        class="relative z-10 -ml-3 border-2 border-card"
      />
      
      <!-- 数値インジケーター -->
      <div class="relative z-0 -ml-3 {avatarSize === 'sm' ? 'w-8 h-8' : avatarSize === 'md' ? 'w-10 h-10' : 'w-12 h-12'} bg-muted bg-opacity-80 rounded-full border-2 border-card flex items-center justify-center">
        <span class="text-xs font-bold text-themed">+{avatarContent.extraCount}</span>
      </div>
    </div>
  {/if}
</div>
{/if}