/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        iski: {
          blue: '#1e3a5f',
          light: '#2d5a87',
          accent: '#667eea',
          danger: '#f5576c',
          success: '#4facfe',
          warning: '#f093fb'
        }
      }
    },
  },
  plugins: [],
}
