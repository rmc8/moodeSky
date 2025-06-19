<!--
  統一アイコンコンポーネント
  Material Symbols (Google Material Icons) ベースの統一アイコンシステム
  TailwindCSS v4 + data-theme統合、完全アクセシビリティ対応
-->

<script lang="ts">
  import Icon from '@iconify/svelte';
  import type { IconProps, IconSize, IconColor } from '$lib/types/icon.js';
  
  // Propsの型定義 (interface extending)
  interface Props extends IconProps {}
  
  // Props with defaults
  let {
    icon,
    size = 'md',
    color = 'themed', 
    class: additionalClass = '',
    ariaLabel,
    ariaDescribedBy,
    decorative = false
  }: Props = $props();
  
  // サイズクラスの動的生成
  const sizeClass = $derived(() => {
    switch (size) {
      case 'sm': return 'w-4 h-4'; // 16px
      case 'md': return 'w-5 h-5'; // 20px  
      case 'lg': return 'w-6 h-6'; // 24px
      case 'xl': return 'w-8 h-8'; // 32px
      default: return 'w-5 h-5';
    }
  });
  
  // カラークラスの動的生成 (TailwindCSSユーティリティのみ)
  // 🚫 注意: 'muted' は型定義から削除済み（視認性問題のため使用禁止）
  const colorClass = $derived(() => {
    switch (color) {
      case 'themed': return 'text-themed';
      case 'primary': return 'text-primary';  
      case 'secondary': return 'text-secondary';   // ✅ セカンダリテキスト用（推奨）
      case 'inactive': return 'text-inactive';     // ✅ 非アクティブ状態用（推奨）
      case 'error': return 'text-error';
      case 'success': return 'text-success';
      case 'warning': return 'text-warning';
      default: return 'text-themed';
    }
  });
  
  // 最終的なクラス文字列の生成
  const finalClass = $derived(() => 
    `${sizeClass()} ${colorClass()} ${additionalClass}`.trim()
  );
  
  // アクセシビリティ属性の動的生成
  const ariaAttributes = $derived(() => {
    const attrs: Record<string, string | boolean> = {};
    
    if (decorative) {
      attrs['aria-hidden'] = true;
      attrs['role'] = 'img';
    } else {
      if (ariaLabel) {
        attrs['aria-label'] = ariaLabel;
      }
      if (ariaDescribedBy) {
        attrs['aria-describedby'] = ariaDescribedBy;
      }
      attrs['role'] = 'img';
    }
    
    return attrs;
  });
</script>

<!-- 
  Iconifyコンポーネントでレンダリング
  Material Symbols使用、自動Tree-shaking対応
-->
<Icon 
  {icon}
  class={finalClass()}
  {...ariaAttributes()}
/>

<!--
  使用例:

  基本的な使用方法:
  <Icon icon={ICONS.VISIBILITY} size="md" color="themed" />
  
  パスワード表示切り替え:
  <Icon 
    icon={showPassword ? ICONS.VISIBILITY_OFF : ICONS.VISIBILITY}
    size="lg"
    color="secondary" 
    ariaLabel={showPassword ? 'パスワードを非表示' : 'パスワードを表示'}
  />
  
  エラーアイコン:
  <Icon 
    icon={ICONS.WARNING}
    size="lg"
    color="error"
    ariaLabel="エラー"
  />
  
  装飾的アイコン:
  <Icon 
    icon={ICONS.CHECK_CIRCLE}
    size="xl"
    color="success"
    decorative={true}
  />
  
  追加クラス:
  <Icon 
    icon={ICONS.SETTINGS}
    size="md"
    color="themed"
    class="hover:rotate-90 transition-transform duration-200"
    ariaLabel="設定"
  />
-->