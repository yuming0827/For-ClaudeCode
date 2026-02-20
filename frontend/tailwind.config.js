/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Dark trading terminal palette
        surface: {
          DEFAULT: '#0d1117',
          50: '#161b22',
          100: '#1c2128',
          200: '#21262d',
          300: '#30363d',
          400: '#484f58',
        },
        accent: {
          green: '#3fb950',
          red: '#f85149',
          blue: '#58a6ff',
          yellow: '#e3b341',
          purple: '#bc8cff',
          cyan: '#39d3f2',
        },
        border: {
          DEFAULT: '#30363d',
          subtle: '#21262d',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'monospace'],
      },
      animation: {
        'pulse-green': 'pulseGreen 2s ease-in-out infinite',
        'pulse-red': 'pulseRed 2s ease-in-out infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        pulseGreen: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(63, 185, 80, 0)' },
          '50%': { boxShadow: '0 0 8px 3px rgba(63, 185, 80, 0.4)' },
        },
        pulseRed: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(248, 81, 73, 0)' },
          '50%': { boxShadow: '0 0 8px 3px rgba(248, 81, 73, 0.4)' },
        },
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { transform: 'translateY(8px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
      },
    },
  },
  plugins: [],
}
