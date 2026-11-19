/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#090C15', vault: '#0F131E', slab: '#161B29', line: '#252B3D',
        gold: { DEFAULT: '#C8A55B', dim: '#8F7840' }, violet: { DEFAULT: '#8274DB', dim: '#51478F' },
        steel: '#6C8BB8', parchment: '#E9E4D6', mute: '#9A9DB0',
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['"Instrument Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
