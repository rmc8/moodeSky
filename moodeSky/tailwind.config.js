/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{html,js,svelte,ts}',
    './src/**/*.svelte'
  ],
  theme: {
    extend: {
      // moodeSky専用のカスタムカラー
      colors: {
        'bluesky': {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554'
        },
        'deck': {
          bg: '#f8fafc',
          'bg-dark': '#0f172a',
          border: '#e2e8f0',
          'border-dark': '#334155'
        }
      },
      
      // デッキ型レイアウト用のスペーシング
      spacing: {
        'deck-gutter': '16px',
        'deck-column': '320px'
      },
      
      // モバイル・デスクトップ対応ブレークポイント
      screens: {
        'xs': '475px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
        'deck': '1200px' // デッキビュー最小幅
      },
      
      // アニメーション（リアルタイム更新用）
      animation: {
        'pulse-soft': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in': 'slideIn 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-in-out'
      },
      
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' }
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        }
      }
    }
  },
  plugins: [
    require('@tailwindcss/typography')
  ],
  
  // ダークモード設定
  darkMode: 'class'
}