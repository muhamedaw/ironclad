/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Barlow Condensed"', 'sans-serif'],
        serif: ['Fraunces', 'serif'],
        mono: ['"DM Mono"', 'monospace'],
        sans: ['"Barlow Condensed"', 'sans-serif'],
      },
      colors: {
        cream: {
          50: '#FDFCF8',
          100: '#F8F5ED',
          200: '#EDE8D8',
          300: '#DDD6C0',
        },
        charcoal: {
          800: '#1C1C1E',
          900: '#111110',
          950: '#0A0A09',
        },
        amber: {
          400: '#FFBA08',
          500: '#F48C06',
          600: '#DC6C02',
        },
        rust: {
          400: '#E05C2A',
          500: '#C94C1A',
          600: '#A33A12',
        },
        steel: {
          200: '#C8C8C4',
          400: '#8A8A84',
          600: '#52524E',
          700: '#3A3A36',
          800: '#282824',
        },
      },
      animation: {
        'fade-up': 'fadeUp 0.5s ease forwards',
        'fade-in': 'fadeIn 0.4s ease forwards',
        'shimmer': 'shimmer 1.8s infinite',
        'slide-in-right': 'slideInRight 0.35s ease forwards',
        'bounce-sm': 'bounceSm 0.3s ease',
        'scale-in': 'scaleIn 0.25s ease forwards',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: 0, transform: 'translateY(24px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
        slideInRight: {
          '0%': { opacity: 0, transform: 'translateX(20px)' },
          '100%': { opacity: 1, transform: 'translateX(0)' },
        },
        bounceSm: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.08)' },
        },
        scaleIn: {
          '0%': { opacity: 0, transform: 'scale(0.95)' },
          '100%': { opacity: 1, transform: 'scale(1)' },
        },
      },
      backgroundImage: {
        'grain': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.4'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
};
