/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        felt: "#0b3d2e",
        feltDark: "#082a20",
        bar: "#5b3b1a",
        wood: "#3a2516",
      },
    },
  },
  plugins: [],
};
