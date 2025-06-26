<!--
  AvatarGroup.svelte
  複数アカウントのアバター表示を管理するコンポーネント
  
  技術レポート推奨の純粋なSVGアプローチで実装
  - SVG patternによる画像定義
  - 数学的に正確なパス計算
  - 完全なカプセル化と高いパフォーマンス
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
    displayMode?: 'overlap' | 'split';
  }

  const { 
    accounts, 
    size = 'md', 
    maxDisplay = 4, 
    class: className = '',
    clickable = false,
    onClick,
    displayMode = 'overlap'
  }: Props = $props();

  // ===================================================================
  // 型安全な派生値
  // ===================================================================

  const displayAccounts = $derived.by((): Account[] => {
    try {
      return accounts.slice(0, maxDisplay);
    } catch (error) {
      console.error('AvatarGroup: Error processing accounts:', error);
      return [];
    }
  });

  const hasMoreAccounts = $derived.by((): boolean => {
    return accounts.length > maxDisplay;
  });

  const layoutPattern = $derived.by((): 'empty' | 'single' | 'dual' | 'triple' | 'grid' => {
    const count = displayAccounts.length;
    if (count === 0) return 'empty';
    if (count === 1) return 'single';
    if (count === 2) return 'dual';
    if (count === 3) return 'triple';
    return 'grid';
  });

  const containerSize = $derived.by((): string => {
    const sizeMap = {
      sm: 'w-8 h-8',
      md: 'w-10 h-10',
      lg: 'w-12 h-12'
    };
    return sizeMap[size];
  });

  const avatarSize = $derived.by((): 'sm' | 'md' | 'lg' | 'xl' => {
    if (layoutPattern === 'single') return size;
    return 'sm';
  });

  const indicatorSize = $derived.by((): string => {
    const sizeMap = {
      sm: 'w-2 h-2',
      md: 'w-3 h-3',
      lg: 'w-4 h-4'
    };
    return sizeMap[size];
  });

  // ===================================================================
  // SVG数学計算関数（技術レポート推奨）
  // ===================================================================

  function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    };
  }

  function getSlicePath(index: number, total: number, size: number): string {
    if (total <= 0) return '';
    
    const radius = size / 2;
    const center = radius;
    
    if (total === 1) {
      // 1つの場合は完全な円
      return `M ${center}, ${center} m -${radius}, 0 a ${radius},${radius} 0 1,0 ${radius * 2},0 a ${radius},${radius} 0 1,0 -${radius * 2},0`;
    }

    const angle = 360 / total;
    const startAngle = index * angle;
    const endAngle = startAngle + angle;
    
    const start = polarToCartesian(center, center, radius, endAngle);
    const end = polarToCartesian(center, center, radius, startAngle);

    const largeArcFlag = angle <= 180 ? '0' : '1';

    return [
      'M', start.x, start.y,
      'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y,
      'L', center, center,
      'Z',
    ].join(' ');
  }

  // ===================================================================
  // ユニークID生成とアクセシビリティ
  // ===================================================================

  const uniqueId = `avatar-group-${Math.random().toString(36).substr(2, 9)}`;
  const ariaLabel = $derived(`User avatars for: ${displayAccounts.map(a => a.profile.displayName || a.profile.handle).join(', ')}.`);

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
  // アバターコンテンツ生成（重なり表示用）
  // ===================================================================

  type AvatarContent = 
    | { type: 'empty'; content: null }
    | { type: 'single'; account: Account }
    | { type: 'dual'; accounts: Account[] }
    | { type: 'triple'; accounts: Account[] }
    | { type: 'grid'; accounts: Account[]; extraCount: number };

  function renderAvatarContent(): AvatarContent {
    if (layoutPattern === 'empty') {
      return { type: 'empty', content: null };
    } else if (layoutPattern === 'single') {
      return { type: 'single', account: displayAccounts[0] };
    } else if (layoutPattern === 'dual') {
      return { type: 'dual', accounts: displayAccounts.slice(0, 2) };
    } else if (layoutPattern === 'triple') {
      return { type: 'triple', accounts: displayAccounts.slice(0, 3) };
    } else {
      return { type: 'grid', accounts: displayAccounts.slice(0, 3), extraCount: accounts.length - 3 };
    }
  }

  const avatarContent = $derived(renderAvatarContent());

  // ===================================================================
  // SVGサイズの決定
  // ===================================================================

  const svgSize = $derived.by((): number => {
    const sizeMap = {
      sm: 32,
      md: 40,
      lg: 48
    };
    return sizeMap[size];
  });
</script>

<!-- 分割表示モード（純粋なSVGアプローチ） -->
{#if displayMode === 'split'}
  {console.log('🎨 [AvatarGroup] Pure SVG mode activated, accounts:', displayAccounts.length)}
  
  {#if clickable}
  <button 
    class="flex-shrink-0 relative {containerSize} {className} rounded-full transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50 focus:ring-offset-2 overflow-hidden"
    onclick={handleClick}
    onkeydown={handleKeydown}
    aria-label="アカウント切り替え"
    tabindex="0"
  >
    <svg
      width={svgSize}
      height={svgSize}
      viewBox="0 0 {svgSize} {svgSize}"
      role="img"
      aria-label={ariaLabel}
      class="w-full h-full"
    >
      <defs>
        {#each displayAccounts as account, i (account.profile.did)}
          <pattern
            id="pattern-{uniqueId}-{account.profile.did}-{i}"
            patternUnits="userSpaceOnUse"
            width={svgSize}
            height={svgSize}
          >
            <image
              href={account.profile.avatar}
              x="0"
              y="0"
              width={svgSize}
              height={svgSize}
              preserveAspectRatio="xMidYMid slice"
            />
          </pattern>
        {/each}
      </defs>

      {#each displayAccounts as account, i (account.profile.did)}
        <path
          d={getSlicePath(i, displayAccounts.length, svgSize)}
          fill="url(#pattern-{uniqueId}-{account.profile.did}-{i})"
          class="slice-path transition-transform duration-200 hover:scale-105"
          style="transform-origin: center;"
        />
      {/each}
    </svg>
  </button>
  {:else}
  <div class="flex-shrink-0 relative {containerSize} {className} rounded-full overflow-hidden">
    <svg
      width={svgSize}
      height={svgSize}
      viewBox="0 0 {svgSize} {svgSize}"
      role="img"
      aria-label={ariaLabel}
      class="w-full h-full"
    >
      <defs>
        {#each displayAccounts as account, i (account.profile.did)}
          <pattern
            id="pattern-static-{uniqueId}-{account.profile.did}-{i}"
            patternUnits="userSpaceOnUse"
            width={svgSize}
            height={svgSize}
          >
            <image
              href={account.profile.avatar}
              x="0"
              y="0"
              width={svgSize}
              height={svgSize}
              preserveAspectRatio="xMidYMid slice"
            />
          </pattern>
        {/each}
      </defs>

      {#each displayAccounts as account, i (account.profile.did)}
        <path
          d={getSlicePath(i, displayAccounts.length, svgSize)}
          fill="url(#pattern-static-{uniqueId}-{account.profile.did}-{i})"
          class="slice-path"
        />
      {/each}
    </svg>
  </div>
  {/if}

<!-- 重なり表示モード（既存） -->
{:else if clickable}
<button 
  class="flex-shrink-0 relative {containerSize} {className} rounded-full transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50 focus:ring-offset-2"
  onclick={handleClick}
  onkeydown={handleKeydown}
  aria-label="アカウント切り替え"
  tabindex="0"
>
  {#if avatarContent.type === 'empty'}
    <div class="{containerSize} rounded-full bg-muted bg-opacity-20 flex items-center justify-center">
      <Icon icon={ICONS.PERSON} size="sm" color="secondary" />
    </div>
    
  {:else if avatarContent.type === 'single'}
    <Avatar 
      src={avatarContent.account.profile.avatar} 
      displayName={avatarContent.account.profile.displayName}
      handle={avatarContent.account.profile.handle}
      {size}
    />
    
  {:else if avatarContent.type === 'dual'}
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
      
      <div class="relative z-0 -ml-3 {avatarSize === 'sm' ? 'w-8 h-8' : avatarSize === 'md' ? 'w-10 h-10' : 'w-12 h-12'} bg-muted bg-opacity-80 rounded-full border-2 border-card flex items-center justify-center">
        <span class="text-xs font-bold text-themed">+{avatarContent.extraCount}</span>
      </div>
    </div>
  {/if}
</button>
{:else}
<div class="flex-shrink-0 relative {containerSize} {className}">
  {#if avatarContent.type === 'empty'}
    <div class="{containerSize} rounded-full bg-muted bg-opacity-20 flex items-center justify-center">
      <Icon icon={ICONS.PERSON} size="sm" color="secondary" />
    </div>
    
  {:else if avatarContent.type === 'single'}
    <Avatar 
      src={avatarContent.account.profile.avatar} 
      displayName={avatarContent.account.profile.displayName}
      handle={avatarContent.account.profile.handle}
      {size}
    />
    
  {:else if avatarContent.type === 'dual'}
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
      
      <div class="relative z-0 -ml-3 {avatarSize === 'sm' ? 'w-8 h-8' : avatarSize === 'md' ? 'w-10 h-10' : 'w-12 h-12'} bg-muted bg-opacity-80 rounded-full border-2 border-card flex items-center justify-center">
        <span class="text-xs font-bold text-themed">+{avatarContent.extraCount}</span>
      </div>
    </div>
  {/if}
</div>
{/if}