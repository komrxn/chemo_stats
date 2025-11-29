import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Charcoal base
        surface: {
          DEFAULT: 'hsl(220 16% 8%)',
          raised: 'hsl(220 14% 11%)',
          overlay: 'hsl(220 14% 14%)',
        },
        // Mint accent
        accent: {
          DEFAULT: 'hsl(168 80% 55%)',
          muted: 'hsl(168 50% 25%)',
          glow: 'hsl(168 90% 65%)',
        },
        // Text
        text: {
          primary: 'hsl(210 20% 95%)',
          secondary: 'hsl(215 15% 60%)',
          muted: 'hsl(215 10% 40%)',
        },
        // Semantic
        success: 'hsl(142 70% 50%)',
        warning: 'hsl(38 95% 55%)',
        error: 'hsl(0 75% 55%)',
        // Border
        border: {
          DEFAULT: 'hsl(220 15% 18%)',
          subtle: 'hsl(220 15% 14%)',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.65rem', { lineHeight: '1rem' }],
      },
      borderRadius: {
        DEFAULT: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-up': 'slide-up 0.4s ease-out',
        'slide-right': 'slide-right 0.3s ease-out',
        'pulse-subtle': 'pulse-subtle 2s ease-in-out infinite',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-right': {
          '0%': { opacity: '0', transform: 'translateX(-10px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'pulse-subtle': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config

