import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#3B3B8F",
          dark: "#26265C",
        },
        success: "#2E9E6B",
        warning: "#E08A2E",
        danger: "#C4453B",
        surface: "#F7F7FB",
        ink: "#33334D",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      fontFeatureSettings: {
        tabular: '"tnum"',
      },
    },
  },
  plugins: [],
};

export default config;
