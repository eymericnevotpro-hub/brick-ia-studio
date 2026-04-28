import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
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
          "border": "#3D1A00",
          "border-glow": "#FF7A0044",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      animation: {
        "glow-pulse": "glowPulse 2s ease-in-out infinite",
        "float": "float 6s ease-in-out infinite",
        "shimmer": "shimmer 3s linear infinite",
        "fade-up": "fadeUp 0.6s ease-out forwards",
        "scale-in": "scaleIn 0.4s ease-out forwards",
        "spin-slow": "spin 8s linear infinite",
      },
      keyframes: {
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 20px #FF7A0033, 0 0 40px #FF7A0011" },
          "50%": { boxShadow: "0 0 40px #FF7A0066, 0 0 80px #FF7A0033" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-12px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% center" },
          "100%": { backgroundPosition: "200% center" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.9)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      backgroundImage: {
        "radial-orange": "radial-gradient(ellipse at center, #FF7A0015 0%, transparent 70%)",
        "grid-pattern": "linear-gradient(rgba(255,122,0,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,122,0,0.03) 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
};

export default config;
