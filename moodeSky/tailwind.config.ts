import type { Config } from 'tailwindcss';

const config: Config = {
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
          500: '#0085ff', // Bluesky brand color
          600: '#0066cc',
          700: '#0052a3',
          800: '#003d7a',
          900: '#002952',
          950: '#001429'
        }
      },
      
      // デッキビュー最小幅
      screens: {
        'deck': '1200px'
      },
      
      // カスタムアニメーション
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
  darkMode: 'class'
};

export default config;