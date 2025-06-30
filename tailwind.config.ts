/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          light: '#3F49CC',
          DEFAULT: '#1D29C2',
          dark: '#121B95',
        },
      },
    },
  },
  plugins: [],
} 