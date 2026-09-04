/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          400: '#a78bfa',
          500: '#7c3aed',
          600: '#6366f1',
          700: '#5824c9',
          800: '#4338ca',
        },
        canvas: '#f4f5fc',
        coral: '#ff6b6b',
        amberAccent: '#f59e0b',
        emeraldAccent: '#10b981'
      },
      boxShadow: {
        'soft-card': '0 8px 30px rgba(0, 0, 0, 0.04)',
        'hover-card': '0 14px 40px rgba(99, 102, 241, 0.12)',
        'glow-purple': '0 10px 25px -3px rgba(91, 77, 251, 0.35)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries'),
  ],
}
