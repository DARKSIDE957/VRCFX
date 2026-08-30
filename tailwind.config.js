/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#09090b',
        surface: '#0e0e12',
        'surface-elevated': '#16161d',
        'surface-card': '#121217',
        'surface-border': 'rgba(255, 255, 255, 0.08)',
        crimson: {
          50: '#fff1f2',
          100: '#ffe4e6',
          200: '#fecdd3',
          300: '#fda4af',
          400: '#fb7185',
          500: '#f43f5e',
          600: '#e11d48',
          700: '#be123c',
          800: '#9f1239',
          900: '#881337',
          950: '#4c0519',
        },
        accent: {
          DEFAULT: '#e11d48',
          hover: '#f43f5e',
          subtle: 'rgba(225, 29, 72, 0.12)',
          border: 'rgba(225, 29, 72, 0.3)',
          glow: 'rgba(225, 29, 72, 0.45)',
          cyan: '#00f2fe',
          blue: '#4facfe',
          purple: '#c084fc',
          pink: '#f43f5e',
          green: '#10b981',
          red: '#e11d48',
          yellow: '#f59e0b'
        },
        vrchat: {
          green: '#10b981',
          blue: '#0ea5e9',
          orange: '#f97316',
          red: '#e11d48',
          dark: '#09090b'
        }
      },
      boxShadow: {
        'crimson-glow': '0 0 25px -4px rgba(225, 29, 72, 0.45)',
        'crimson-glow-sm': '0 0 12px -2px rgba(225, 29, 72, 0.35)',
        'gothic-card': '0 12px 32px -8px rgba(0, 0, 0, 0.8), 0 0 1px 1px rgba(255, 255, 255, 0.05)',
        'gothic-card-hover': '0 16px 40px -10px rgba(0, 0, 0, 0.9), 0 0 2px 1px rgba(225, 29, 72, 0.25)',
        'glass-inset': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.1)',
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace']
      }
    },
  },
  plugins: [],
}

