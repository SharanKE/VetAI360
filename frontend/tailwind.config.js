/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        pasture: {
          50: "#eef5f0",
          100: "#d3e6da",
          200: "#a7cdb5",
          300: "#79b28f",
          400: "#4c9770",
          500: "#2f7d57",
          600: "#206345",
          700: "#184d37",
          800: "#123a29",
          900: "#0c2a1e",
        },
        amber: {
          50: "#fdf5e9",
          100: "#f9e4bf",
          200: "#f3cd8c",
          300: "#edb45a",
          400: "#e29c39",
          500: "#c67f22",
          600: "#a1651a",
          700: "#7d4e15",
        },
        ink: "#122019",
        alertred: "#b3452f",
      },
      fontFamily: {
        display: ["Space Grotesk", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
