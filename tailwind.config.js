/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        inter: ['Inter', 'sans-serif'], // Define Inter font
      },
      aspectRatio: {
        '16/9': '16 / 9', // For responsive video embeds
      },
    },
  },
  plugins: [],
}
