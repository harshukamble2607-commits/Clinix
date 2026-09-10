/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#effaf7",
          100: "#d7f2ea",
          200: "#b2e4d7",
          300: "#80cfbe",
          400: "#4db3a0",
          500: "#2e9786",
          600: "#227a6d",
          700: "#1d6259",
          800: "#1a4f48",
          900: "#18423d",
        },
        clinical: {
          50: "#f0f7ff",
          100: "#e0eefd",
          200: "#b9dcfb",
          300: "#7cc1f7",
          400: "#3aa2f0",
          500: "#1087e0",
          600: "#0469bf",
          700: "#05539a",
          800: "#084880",
          900: "#0b3d6b",
        },
      },
    },
  },
  plugins: [],
};