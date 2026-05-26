import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          orange: "#FF7A00",
          "orange-light": "#FF9A3C",
          "orange-dark": "#CC5500",
          gold: "#FFB347",
          "gold-light": "#FFD080",
          bg: "#080401",
          "bg-card": "#120700",
          "bg-card2": "#1A0B00",
          border: "#3D1A00",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
