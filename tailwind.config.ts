import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          900: '#09090b', // Deepest background (almost black)
          800: '#18181b', // Sidebar backgrounds
          700: '#27272a', // Subtle borders/dividers
          600: '#3f3f46',
          500: '#52525b',
        },
        accent: {
          DEFAULT: '#818cf8', // Indigo-400 for a softer, more modern accent
          hover:   '#6366f1', // Indigo-500
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config;
