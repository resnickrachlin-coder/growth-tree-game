/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        moss: {
          50: '#F0F7E5',
          100: '#DDEBD0',
          200: '#BFD9B0',
          300: '#9CC28E',
          400: '#7CB342',
          500: '#5A7B56',
          600: '#3D5F3A',
          700: '#2D4A2C',
        },
        tender: {
          50: '#F4FAE3',
          100: '#E8F6CB',
          200: '#D4EEA8',
          300: '#B6E286',
          400: '#9CCC65',
          500: '#7CB342',
          600: '#689F38',
        },
        cream: {
          50: '#FBFDF7',
          100: '#F4F8EC',
        },
        stone: {
          100: '#EEF2E6',
          200: '#E1E7D8',
          400: '#A8B09E',
          500: '#A8B09E',
          600: '#7A8272',
          700: '#44403C',
        },
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', 'serif'],
        numeral: ['"Cormorant Garamond"', 'serif'],
      },
      boxShadow: {
        soft: '0 4px 20px rgba(93, 135, 88, 0.12)',
        'soft-lg': '0 8px 32px rgba(93, 135, 88, 0.15)',
        glow: '0 0 24px rgba(124, 179, 66, 0.35)',
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #7cb342, #9ccc65, #7cb342)',
        'leaf-pattern': 'radial-gradient(circle at 20% 30%, rgba(124,179,66,0.08) 0, transparent 40%), radial-gradient(circle at 80% 70%, rgba(156,194,142,0.1) 0, transparent 45%)',
      },
      animation: {
        'scale-in': 'scale-in 0.4s ease-out both',
        shimmer: 'shimmer 2.5s linear infinite',
      },
      keyframes: {
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.94)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}
