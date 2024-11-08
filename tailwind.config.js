/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        mtn: {
          yellow: '#FFCB05',
          blue: '#004F9F',
          darkBlue: '#003B77', // darker shade for hover states
          lightYellow: '#FFD633', // lighter shade for hover states
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography')
  ],
}
