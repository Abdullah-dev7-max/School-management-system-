/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        canvas: '#F4F7F5',
        ink: '#18313A',
        night: {
          950: '#071A20',
          900: '#0C252D',
          800: '#12343D',
          700: '#1C4650',
        },
        lilac: {
          50: '#F1F8F6',
          100: '#E1F0EB',
          200: '#C4E3D9',
          300: '#9BCFBE',
          400: '#68B49D',
          500: '#348F78',
          600: '#24735F',
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
        glow: '0 8px 24px -6px rgba(52,143,120,0.58), inset 0 0 0 1px rgba(255,255,255,0.18)',
        glass: '0 10px 40px -14px rgba(24,70,80,0.18)',
      },
    },
  },
  plugins: [],
}
