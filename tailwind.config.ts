import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          900: '#0f1117',
          800: '#161b27',
          700: '#1e2433',
          600: '#252d3d',
          500: '#2e3847',
        },
        accent: {
          DEFAULT: '#6366f1',
          hover:   '#4f46e5',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config;
