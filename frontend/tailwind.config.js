/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f7f2',
          100: '#dcefdc',
          500: '#1f8a4c',
          600: '#17743d',
          700: '#125c31',
          800: '#0e4a27',
          900: '#072a16',
        },
        accent: {
          100: '#fdf3dd',
          400: '#e0a02e',
          500: '#d18f1f',
        },
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out both',
        'fade-in-up': 'fade-in-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) both',
      },
      fontFamily: {
        sans: ['Nunito', 'Segoe UI', 'sans-serif'],
        display: ['Poppins', 'Nunito', 'sans-serif'],
        /** Faqat 'Iymon' brend yozuvi uchun */
        brand: ['"Cormorant Garamond"', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};
