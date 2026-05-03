import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17201b",
        moss: "#3f5f46",
        linen: "#f7f4ed",
        paper: "#fffdf8",
        line: "#e3ded2",
        signal: "#0f766e"
      },
      boxShadow: {
        soft: "0 18px 55px rgba(23,32,27,0.10)"
      }
    },
  },
  plugins: [],
};

export default config;
