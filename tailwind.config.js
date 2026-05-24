/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.vue'],
  theme: {
    extend: {
      colors: {
        /** Warm brown ink — matches sketch icon strokes (#3d2f24). */
        ink: {
          400: '#a09385',
          500: '#857766',
          600: '#6b5d4d',
          700: '#524535',
          800: '#3d2f24',
          900: '#2a2018',
        },
        /** Aged parchment paper — matches icon fill tones. */
        parchment: {
          50: '#faf6eb',
          100: '#f3ecd8',
          200: '#ebe3cf',
          300: '#e0d4bc',
          400: '#d4c4a8',
          500: '#c4b090',
        },
        /** Soft greens from plant icon fills. */
        sage: {
          50: '#f2f7ef',
          100: '#e0edda',
          200: '#c5dbb8',
          300: '#a8c8a0',
          400: '#8aba7a',
          500: '#6a9a5a',
          600: '#5a8860',
          700: '#4a7050',
          800: '#3d5c42',
          900: '#2f4834',
        },
        /** Pink blossom accents from flower icons. */
        blossom: {
          50: '#fdf5f7',
          100: '#f8e8ec',
          200: '#e8b8c8',
          300: '#e098b0',
        },
        /** Muted lavender for info / section highlights. */
        lavender: {
          50: '#f5f3f8',
          100: '#e8e4f0',
          200: '#c8c0d8',
          300: '#a898c8',
          400: '#9488b0',
          500: '#7a6e98',
          600: '#625888',
          700: '#4e456e',
        },
      },
      boxShadow: {
        parchment: '0 1px 3px rgba(61, 47, 36, 0.08)',
        'parchment-lg': '0 4px 12px rgba(61, 47, 36, 0.12)',
      },
    },
  },
  plugins: [],
};
