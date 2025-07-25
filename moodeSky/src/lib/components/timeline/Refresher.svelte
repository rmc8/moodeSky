<!--
  Refresher.svelte
  Pull to Refresh コンポーネント
  
  機能:
  - タッチイベント検出（上方向スクロールでのリフレッシュ）
  - iOS/Android対応の視覚的フィードバック
  - プル距離による進行状況表示
  - スクロール位置チェック
  - 完了コールバック機能
  
  tokimekibluesky参考の最新実装
-->
<script lang="ts">
  import { onMount } from 'svelte';

  interface Props {
    refresherHeight?: number;
    pullMin?: number;
    pullMax?: number;
    snapbackDuration?: string;
    disabled?: boolean;
    forceIos?: boolean | null;
    showRefreshingSpinner?: boolean;
    children?: any;
    onrefresh: (event: { complete: () => Promise<void> }) => Promise<void> | void;
  }

  const {
    refresherHeight = 70,
    pullMin = 70,
    pullMax = 140,
    snapbackDuration = '0.3s',
    disabled = false,
    forceIos = null,
    showRefreshingSpinner = true,
    children,
    onrefresh,
  }: Props = $props();

  let hostElement: HTMLElement | undefined;
  let contentElement: HTMLElement | undefined;
  let refresherVisualElement: HTMLElement | undefined;

  let refreshState = $state<'pending' | 'pulling' | 'refreshing' | 'completing'>('pending');
  let startY = $state(0);
  let currentY = $state(0);
  let pullProgress = $state(0);
  let isTouching = $state(false);

  let _isIos = $derived(
    forceIos === null ?
      (typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent)) :
      forceIos
  );

  onMount(() => {
    if (hostElement) {
      hostElement.style.setProperty('--refresher-height-val', `${refresherHeight}px`);
    }

    if (refresherVisualElement) {
      refresherVisualElement.style.transform = `translate3d(0, ${-refresherHeight}px, 0)`;
      refresherVisualElement.style.opacity = '0';
    }
  });

  function canStartPull() {
    if (!hostElement || disabled) return false;

    const hostCanScroll = hostElement.scrollHeight > hostElement.clientHeight;
    if (hostCanScroll && hostElement.scrollTop > 1) {
      return false;
    }

    let parent = hostElement.parentElement;
    while (parent && parent !== document.body && parent !== document.documentElement) {
      const style = window.getComputedStyle(parent);
      const overflowY = style.getPropertyValue('overflow-y');

      if (overflowY === 'hidden' || overflowY === 'visible') {
        parent = parent.parentElement;
        continue;
      }

      const isPotentiallyScrollable = overflowY === 'auto' || overflowY === 'scroll';

      if (isPotentiallyScrollable && parent.scrollHeight > parent.clientHeight) {
        if (parent.scrollTop > 1) {
          return false;
        }
      }
      parent = parent.parentElement;
    }
    return true;
  }

  function onTouchStart(event: TouchEvent) {
    if (disabled || refreshState === 'refreshing' || refreshState === 'completing' || event.touches.length > 1 || !canStartPull()) {
      return;
    }

    if ((event.target as Element)?.closest('dialog')) {
      return;
    }

    isTouching = true;
    startY = event.touches[0].clientY;
    currentY = startY;
    refreshState = 'pending';

    if (contentElement) contentElement.style.transition = 'none';
    if (refresherVisualElement) {
      refresherVisualElement.style.transitionProperty = 'transform, opacity';
      refresherVisualElement.style.transitionDuration = '0s';
    }
  }

  function onTouchMove(event: TouchEvent) {
    if (!isTouching || disabled || refreshState === 'refreshing' || refreshState === 'completing' || startY === 0 || event.touches.length > 1) {
      return;
    }

    currentY = event.touches[0].clientY;
    let dy = currentY - startY;

    if (dy < 0) dy = 0;

    if (dy > 5 && refreshState === 'pending') {
      refreshState = 'pulling';
    }

    if (refreshState === 'pulling') {
      event.preventDefault();

      pullProgress = Math.min(1, dy / pullMin);

      let effectivePullDistanceForIOSContent;
      const pullBeyondMinForIOS = Math.max(0, dy - pullMin);
      const resistanceFactorForIOS = 0.4;

      if (dy <= pullMin) {
        effectivePullDistanceForIOSContent = dy;
      } else {
        effectivePullDistanceForIOSContent = pullMin + pullBeyondMinForIOS * resistanceFactorForIOS;
      }
      effectivePullDistanceForIOSContent = Math.min(effectivePullDistanceForIOSContent, pullMax);

      if (_isIos) {
        translateContent(effectivePullDistanceForIOSContent);
      }

      let visualTranslateY;
      let visualOpacity;

      if (!_isIos) {
        visualOpacity = Math.min(1, dy / pullMin);

        if (dy <= pullMin) {
          const revealProgress = dy / pullMin;
          visualTranslateY = -refresherHeight + (refresherHeight * revealProgress);
        } else if (dy <= pullMax) {
          visualTranslateY = 0;
          const pullInRange = dy - pullMin;
          const totalRangeForOverscroll = pullMax - pullMin;

          let progressInOverscrollRange = 0;
          if (totalRangeForOverscroll > 0) {
            progressInOverscrollRange = Math.min(1, pullInRange / totalRangeForOverscroll);
          } else if (pullInRange > 0) {
            progressInOverscrollRange = 1;
          }

          const maxOverscrollAmount = refresherHeight * 0.4;

          const easedProgress = progressInOverscrollRange * (2 - progressInOverscrollRange);
          visualTranslateY += maxOverscrollAmount * easedProgress;
        } else {
          visualTranslateY = 0;
          const maxOverscrollAmount = refresherHeight * 0.4;
          visualTranslateY += maxOverscrollAmount;
        }
      } else {
        const rawVisualRevealProgress = Math.min(1, dy / refresherHeight);
        visualTranslateY = -refresherHeight + (refresherHeight * rawVisualRevealProgress);
        visualOpacity = rawVisualRevealProgress;
      }

      visualTranslateY = Math.max(-refresherHeight, visualTranslateY);
      if (!_isIos) {
        visualTranslateY = Math.min(visualTranslateY, refresherHeight * 0.4);
      } else {
        visualTranslateY = Math.min(visualTranslateY, 0);
      }

      translateRefresherVisual(visualTranslateY);
      if (refresherVisualElement) refresherVisualElement.style.opacity = visualOpacity.toString();

      if (_isIos) {
        const iconRotation = pullProgress >= 1.0 ? 180 : 0;
        rotateRefresherIcon(iconRotation, '0.1s');
      } else {
        const androidArrow = refresherVisualElement?.querySelector('.refresher-icon-pull-md svg');
        if (androidArrow && dy <= pullMin) {
          const rotation = (dy / pullMin) * 270;
          (androidArrow as HTMLElement).style.transform = `rotate(${rotation}deg)`;
        }
      }
    }
  }

  async function onTouchEnd(event: TouchEvent) {
    if (!isTouching || disabled) {
      isTouching = false;
      return;
    }
    isTouching = false;

    const originalStartYForEnd = startY;
    startY = 0;

    if (refreshState !== 'pulling') {
      if (refreshState === 'pending' && currentY === originalStartYForEnd) {
        // nothing.
      } else if (refreshState !== 'refreshing' && refreshState !== 'completing') {
        await resetVisualsOnly(snapbackDuration);
      }
      return;
    }

    if (pullProgress >= 1.0) {
      refreshState = 'refreshing';

      if (_isIos) {
        translateContent(refresherHeight, snapbackDuration);
      }
      translateRefresherVisual(0, snapbackDuration);
      if (refresherVisualElement) refresherVisualElement.style.opacity = '1';

      onrefresh({
        complete: async () => {
          if (refreshState !== 'refreshing') return;
          refreshState = 'completing';
          await resetContentAndVisuals(snapbackDuration);
          refreshState = 'pending';
          pullProgress = 0;
        }
      });
    } else {
      refreshState = 'pending';
      await resetContentAndVisuals(snapbackDuration);
      pullProgress = 0;
    }
  }

  function translateContent(y: number, duration = '0s') {
    if (contentElement) {
      contentElement.style.transform = `translate3d(0, ${y}px, 0)`;
      contentElement.style.transition = `transform ${duration} ease-out`;
    }
  }

  function translateRefresherVisual(y: number, duration = '0s') {
    if (refresherVisualElement) {
      refresherVisualElement.style.transform = `translate3d(0, ${y}px, 0)`;
      refresherVisualElement.style.transitionProperty = 'transform, opacity';
      refresherVisualElement.style.transitionDuration = duration;
      refresherVisualElement.style.transitionTimingFunction = 'ease-out';
    }
  }

  function rotateRefresherIcon(degrees: number, duration = '0.2s') {
    if (_isIos && refresherVisualElement) {
      const icon = refresherVisualElement.querySelector('.refresher-icon-pull-ios');
      if (icon) {
        (icon as HTMLElement).style.transform = `rotate(${degrees}deg)`;
        (icon as HTMLElement).style.transition = `transform ${duration} ease-out`;
      }
    }
  }

  async function resetVisualsOnly(duration = snapbackDuration) {
    if (refresherVisualElement) {
      translateRefresherVisual(-refresherHeight, duration);
      refresherVisualElement.style.opacity = '0';
    }
    if (_isIos) rotateRefresherIcon(0, duration);
    const androidArrow = refresherVisualElement?.querySelector('.refresher-icon-pull-md svg');
    if (androidArrow) (androidArrow as HTMLElement).style.transform = 'none';

    return new Promise(resolve => setTimeout(resolve, parseFloat(duration.replace('s', '')) * 1000));
  }

  async function resetContentAndVisuals(duration = snapbackDuration) {
    if (_isIos) {
      translateContent(0, duration);
    }
    await resetVisualsOnly(duration);

    setTimeout(() => {
      if (contentElement && _isIos) {
        contentElement.style.transition = '';
      }
      if (refresherVisualElement) {
        refresherVisualElement.style.transitionProperty = 'transform, opacity';
        refresherVisualElement.style.transitionDuration = '0s';
      }
    }, parseFloat(duration.replace('s', '')) * 1000 + 50);
  }
</script>

<div
  bind:this={hostElement}
  class="refresher-host"
  class:mode-ios={_isIos}
  class:mode-md={!_isIos}
  ontouchstart={onTouchStart}
  ontouchmove={onTouchMove}
  ontouchend={onTouchEnd}
  ontouchcancel={onTouchEnd}
  style="--refresher-height-val: {refresherHeight}px;"
>
  <div class="refresher-indicator-area">
    <div bind:this={refresherVisualElement} class="refresher-visual-container">
      {#if refreshState === 'refreshing'}
        {#if showRefreshingSpinner}
          <div class="spinner">
            {#if _isIos}
              <svg viewBox="0 0 32 32" class="spinner-ios">
                <line stroke-linecap="round" x1="16" y1="4" x2="16" y2="10" transform="rotate(0, 16, 16)" />
                <line stroke-linecap="round" x1="16" y1="4" x2="16" y2="10" transform="rotate(45, 16, 16)" />
                <line stroke-linecap="round" x1="16" y1="4" x2="16" y2="10" transform="rotate(90, 16, 16)" />
                <line stroke-linecap="round" x1="16" y1="4" x2="16" y2="10" transform="rotate(135, 16, 16)" />
                <line stroke-linecap="round" x1="16" y1="4" x2="16" y2="10" transform="rotate(180, 16, 16)" />
                <line stroke-linecap="round" x1="16" y1="4" x2="16" y2="10" transform="rotate(225, 16, 16)" />
                <line stroke-linecap="round" x1="16" y1="4" x2="16" y2="10" transform="rotate(270, 16, 16)" />
                <line stroke-linecap="round" x1="16" y1="4" x2="16" y2="10" transform="rotate(315, 16, 16)" />
              </svg>
            {:else}
              <svg class="spinner-md" viewBox="25 25 50 50">
                <circle class="path" cx="50" cy="50" r="20" fill="none" stroke-miterlimit="10"/>
              </svg>
            {/if}
          </div>
        {/if}
      {:else if refreshState === 'pulling' || refreshState === 'pending'}
        {#if _isIos}
          <div class="refresher-icon-pull-ios">
            <svg viewBox="0 0 512 512" width="24" height="24" fill="currentColor">
              <path fill-rule="evenodd" d="M256 96a16 16 0 0116 16v208.09l60.12-60.12a16 16 0 0122.63 22.63l-88 88a16 16 0 01-22.63 0l-88-88a16 16 0 1122.63-22.63L240 320.09V112a16 16 0 0116-16z"/>
            </svg>
          </div>
        {:else}
          <div class="refresher-icon-pull-md">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
              <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
            </svg>
          </div>
        {/if}
      {:else}
        {#if !_isIos}
          <svg class="spinner-md" viewBox="25 25 50 50">
            <circle class="path" cx="50" cy="50" r="20" fill="none" stroke-miterlimit="10"/>
          </svg>
        {/if}
      {/if}
    </div>
  </div>

  <div bind:this={contentElement} class="refresher-content">
    {@render children?.()}
  </div>
</div>

<style>
  .refresher-host {
    position: relative;
    -webkit-overflow-scrolling: touch;
  }

  .refresher-indicator-area {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: var(--refresher-height-val);
    z-index: 10;
    pointer-events: none;
  }

  .refresher-visual-container {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    will-change: transform, opacity;
  }

  .refresher-content {
    position: relative;
    z-index: 1;
    background-color: inherit;
    min-height: 100%;
    will-change: transform;
  }

  .refresher-icon-pull-ios {
    transition: transform 0.1s ease-out;
    display: flex; 
    align-items: center; 
    justify-content: center;
  }

  .refresher-icon-pull-md svg {
    transition: transform 0.1s ease-out;
    display: flex; 
    align-items: center; 
    justify-content: center;
  }

  .mode-ios .refresher-visual-container {
    color: #8e8e93;
  }

  .mode-ios .spinner-ios {
    width: 32px;
    height: 32px;
    stroke: currentColor;
    animation: refresher-ios-spinner-rotate 1.5s linear infinite;
  }

  .mode-ios .spinner-ios line {
    stroke-width: 2.5px;
    animation: refresher-ios-spinner-fade 1.5s linear infinite;
  }

  .mode-ios .spinner-ios line:nth-child(1) { animation-delay: -0.875s; }
  .mode-ios .spinner-ios line:nth-child(2) { animation-delay: -0.75s; }
  .mode-ios .spinner-ios line:nth-child(3) { animation-delay: -0.625s; }
  .mode-ios .spinner-ios line:nth-child(4) { animation-delay: -0.5s; }
  .mode-ios .spinner-ios line:nth-child(5) { animation-delay: -0.375s; }
  .mode-ios .spinner-ios line:nth-child(6) { animation-delay: -0.25s; }
  .mode-ios .spinner-ios line:nth-child(7) { animation-delay: -0.125s; }
  .mode-ios .spinner-ios line:nth-child(8) { animation-delay: 0s; }

  .mode-md .refresher-visual-container {
    color: rgb(59 130 246); /* primary color */
  }

  .mode-md .refresher-icon-pull-md {
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
    border-radius: 50%;
    padding: 8px;
    background-color: white;
  }

  .mode-md .spinner {
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
    border-radius: 50%;
    padding: 8px;
    background-color: white;
  }

  .mode-md .spinner-md {
    animation: refresher-md-spinner-rotate 1.4s linear infinite;
    height: 28px;
    width: 28px;
    position: relative;
  }

  .mode-md .spinner-md .path {
    stroke-width: 5px;
    animation: refresher-md-spinner-dash 1.4s ease-in-out infinite;
    stroke-linecap: round;
    stroke: currentColor;
  }

  @keyframes refresher-ios-spinner-rotate {
    100% { transform: rotate(360deg); }
  }

  @keyframes refresher-ios-spinner-fade {
    0%, 100% { opacity: 0.2; }
    50% { opacity: 1; }
  }

  @keyframes refresher-md-spinner-rotate {
    100% { transform: rotate(360deg); }
  }

  @keyframes refresher-md-spinner-dash {
    0% {
      stroke-dasharray: 1px, 200px;
      stroke-dashoffset: 0;
    }
    50% {
      stroke-dasharray: 100px, 200px;
      stroke-dashoffset: -15px;
    }
    100% {
      stroke-dasharray: 100px, 200px;
      stroke-dashoffset: -125px;
    }
  }
</style>