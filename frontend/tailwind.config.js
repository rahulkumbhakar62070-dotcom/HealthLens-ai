/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#F7F7F2',
        surface: '#FFFFFF',
        primary: {
          DEFAULT: '#245C4F',
          hover: '#1A443A',
          light: '#2E7363',
        },
        charcoal: {
          DEFAULT: '#202923',
          muted: '#69746D',
        },
        accent: {
          soft: '#DCE9D8',
          warning: '#B7791F',
          warningLight: '#FEF3C7',
          danger: '#9B2C2C',
          dangerLight: '#FED7D7',
        },
        border: {
          DEFAULT: '#E2E6E2',
          subtle: '#EEF2EE',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Manrope', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'soft-sm': '0 1px 3px rgba(32, 41, 35, 0.04), 0 1px 2px rgba(32, 41, 35, 0.02)',
        'soft': '0 4px 12px rgba(32, 41, 35, 0.05), 0 1px 3px rgba(32, 41, 35, 0.02)',
        'soft-lg': '0 10px 25px rgba(32, 41, 35, 0.08), 0 4px 10px rgba(32, 41, 35, 0.03)',
      },
    },
  },
  plugins: [],
};
