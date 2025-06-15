import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// ダークモードストア
export const darkMode = writable(false);

/**
 * テーマクラスの更新
 */
function updateThemeClass(isDark: boolean) {
  if (!browser) return;
  
  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

/**
 * ダークモードトグル
 */
export function toggleDarkMode() {
  darkMode.update(current => {
    const newValue = !current;
    if (browser) {
      localStorage.setItem('theme', newValue ? 'dark' : 'light');
      updateThemeClass(newValue);
    }
    return newValue;
  });
}

/**
 * テーマの初期化
 */
export function initializeTheme() {
  if (!browser) return;

  // システム設定とローカルストレージからダークモード初期値を取得
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initialDarkMode = savedTheme === 'dark' || (!savedTheme && prefersDark);
  
  darkMode.set(initialDarkMode);
  updateThemeClass(initialDarkMode);
  
  // システムテーマ変更の監視
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handleThemeChange = (e: MediaQueryListEvent) => {
    if (!localStorage.getItem('theme')) {
      darkMode.set(e.matches);
      updateThemeClass(e.matches);
    }
  };
  
  mediaQuery.addEventListener('change', handleThemeChange);
  
  return () => {
    mediaQuery.removeEventListener('change', handleThemeChange);
  };
}