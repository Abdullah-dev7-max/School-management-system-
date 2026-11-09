/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        canvas: '#F4F1FD',
        ink: '#1B1633',
        night: {
          950: '#0A0716',
          900: '#100C22',
          800: '#171230',
          700: '#221B42',
        },
        lilac: {
          50: '#F6F3FF',
          100: '#EDE7FF',
          200: '#DDD2FF',
          300: '#C7B5FF',
          400: '#AB8DFF',
          500: '#8F68F5',
          600: '#7648E0',
        },
      },
      keyframes: {
        marquee: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        marquee: 'marquee 50s linear infinite',
      },
      boxShadow: {
        glow: '0 8px 24px -6px rgba(143,104,245,0.75), inset 0 0 0 1px rgba(255,255,255,0.14)',
        glass: '0 10px 40px -14px rgba(76,45,160,0.22)',
      },
    },
  },
  plugins: [],
}
