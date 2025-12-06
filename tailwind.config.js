/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Using default Tailwind colors for the design system:
        // Primary: green-600, green-700, green-50
        // Surfaces: slate-50, slate-100, slate-200, slate-600, slate-700, slate-800, slate-900
        // Status colors: amber, blue, emerald, rose, violet
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

