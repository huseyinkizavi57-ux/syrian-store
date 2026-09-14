/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#0f766e", // teal — deliberately distinct from Trendyol's orange identity
          dark: "#0b5750",
          light: "#14b8a6",
        },
      },
      fontFamily: {
        sans: ["Tajawal", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
