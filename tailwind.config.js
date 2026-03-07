/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        brand: {
          50:  '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
        },
      },
      boxShadow: {
        'xs':        '0 1px 2px 0 rgb(0 0 0 / 0.04)',
        'card':      '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        'card-md':   '0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.04)',
        'glow':      '0 0 0 3px rgba(124, 58, 237, 0.15)',
        'glow-green':'0 0 0 3px rgba(16, 185, 129, 0.15)',
        'glow-amber':'0 0 0 3px rgba(245, 158, 11, 0.2)',
      },
      animation: {
        'fade-in':    'fade-in 0.35s ease both',
        'slide-up':   'slide-up 0.4s ease both',
        'shimmer':    'shimmer 1.6s ease-in-out infinite',
        'float':      'float 3s ease-in-out infinite',
        'pulse-slow': 'pulse 2.5s cubic-bezier(0.4,0,0.6,1) infinite',
        'spin-slow':  'spin 3s linear infinite',
      },
      keyframes: {
        'fade-in': {
          '0%':   { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          '0%':   { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-6px)' },
        },
      },
      backgroundImage: {
        'gradient-brand':  'linear-gradient(135deg, #7c3aed 0%, #4f46e5 60%, #2563eb 100%)',
        'gradient-subtle': 'linear-gradient(135deg, #f5f3ff 0%, #f8fafc 50%, #f0fdf4 100%)',
        'gradient-dark':   'linear-gradient(135deg, #18181b 0%, #09090b 100%)',
      },
    },
  },
  plugins: [],
};
